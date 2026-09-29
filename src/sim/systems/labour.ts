// Labour markets and migration: jobs by sector, unemployment, wages, and people moving
// between the regions of a country. Project jobs come only from projects present in the
// world, so the no-BRI shadow world never sees Belt and Road construction or operating jobs.
//
// State kept between weeks lives in `world.stats` (the same system instance steps both twins):
//   labour.population.<country>, labour.gdp.<country>  last week's national values
//   labour.demand.<country>        labour-demand index (1 = trend), moved by GDP growth
//   labour.baseJobs.<region>       jobs outside projects, construction and logistics
//   labour.disasterShock.<region>  0–1, decays after a disaster
//   labour.disaster.<event>.<region> = 1 once a disaster has been applied
// Published: labour.foreignWorkers.<region> (weekly), labour.migration.<region> (monthly net).
import type { Content, Project, ProjectKind, Region } from '../../content/types';
import { pow } from '../../core/fixed-math';
import type { System } from '../engine/engine';
import type { Jobs, ProjectStatus, RegionState } from '../world/state';
import { INITIAL_UNEMPLOYMENT, LABOUR_PARTICIPATION, type World } from '../world/world';

/** 365.2425 days / 7. */
export const WEEKS_PER_YEAR = 52.1775;

/**
 * Direct and indirect logistics jobs (terminal staff, trucking, warehousing, forwarding) per
 * TEU a week of regional throughput: about 4 jobs per 1,000 TEU a year (estimated: container
 * terminals employ roughly 1 person per 1,000 TEU a year, and the wider chain about 3 more).
 */
export const LOGISTICS_JOBS_PER_WEEKLY_TEU = 0.2;
/** Okun's law: employment moves ~0.5% for each point of GDP growth above or below trend. */
const OKUN_COEFFICIENT = 0.5;
/** Share of the labour-demand gap that closes each week (about a one-year time constant). */
const DEMAND_GAP_CLOSING = 1 / 52;
/** Wage curve (Blanchflower & Oswald 1994): pay falls ~0.1% for each 1% more unemployment. */
const WAGE_CURVE_ELASTICITY = 0.1;
export const MIN_UNEMPLOYMENT = 0.01;
export const MAX_UNEMPLOYMENT = 0.6;

/** Migration runs every 4 weeks. */
export const MIGRATION_WEEKS = 4;
/** Monthly outflow, as a share of the population, per unit gap in expected real income. */
const MIGRATION_RATE = 0.01;
/** At most 0.2% of a region's population leaves in a month. */
export const MAX_MIGRATION_RATE = 0.002;
/**
 * Regional price levels rise with the income index (Balassa–Samuelson), so only part of a
 * nominal income gap draws migrants: real income ∝ index^(1 − 0.8).
 */
const PRICE_LEVEL_ELASTICITY = 0.8;

/** Share of non-project jobs lost at disaster shock 1 (a catastrophic flood or earthquake). */
const DISASTER_JOB_LOSS = 0.2;
/** Share of income lost at disaster shock 1. */
const DISASTER_INCOME_LOSS = 0.15;
/** Share of the population displaced by a severity-1 disaster (Pakistan 2022: ~8M of 230M). */
export const DISASTER_DISPLACED_SHARE = 0.03;
/** Weekly persistence of the disaster shock (half-life about 11 weeks). */
const DISASTER_PERSISTENCE = 0.94;

/** Sector that a project's operating jobs belong to. */
const OPERATING_SECTOR: Readonly<Record<ProjectKind, keyof Jobs>> = {
  rail: 'logistics',
  road: 'logistics',
  port: 'logistics',
  'dry-port': 'logistics',
  'power-coal': 'industry',
  'power-hydro': 'industry',
  'power-solar': 'industry',
  'power-wind': 'industry',
  'power-nuclear': 'industry',
  pipeline: 'industry',
  lng: 'industry',
  'industrial-zone': 'industry',
  urban: 'services',
  metro: 'services',
};

/** Sums keyed by string; absent keys read as 0. */
export class Tally {
  readonly #sums = new Map<string, number>();

  add(key: string, amount: number): void {
    this.#sums.set(key, this.get(key) + amount);
  }

  get(key: string): number {
    return this.#sums.get(key) ?? 0;
  }
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export interface Workforce {
  readonly sector: keyof Jobs;
  readonly local: number;
  readonly foreign: number;
}

/** Workers a project employs in its current phase: builders, then operators. */
export function projectWorkforce(project: Project, status: ProjectStatus): Workforce {
  const building = status === 'construction';
  const { construction, operation, localShare } = project.jobs;
  const workers = building ? construction : status === 'operating' ? operation : 0;
  return {
    sector: building ? 'construction' : OPERATING_SECTOR[project.kind],
    local: workers * localShare,
    foreign: workers * (1 - localShare),
  };
}

interface Economy {
  /** This week's national population ratio (natural growth). */
  readonly growth: number;
  readonly demand: number;
  readonly gdpPerPerson: number;
}

function updateEconomies(world: World, content: Content): Map<string, Economy> {
  const { stats } = world;
  const economies = new Map<string, Economy>();
  for (const { id, growthTrend } of content.countries) {
    const country = world.countries[id];
    if (!country) continue;
    const lastPopulation = stats[`labour.population.${id}`] ?? country.population;
    const lastGdp = stats[`labour.gdp.${id}`] ?? country.gdp;
    const growth = lastPopulation > 0 ? country.population / lastPopulation : 1;
    const gdpGrowth = lastGdp > 0 ? country.gdp / lastGdp - 1 : 0;
    const pushed =
      (stats[`labour.demand.${id}`] ?? 1) *
      (1 + OKUN_COEFFICIENT * (gdpGrowth - growthTrend / WEEKS_PER_YEAR));
    const demand = pushed + (1 - pushed) * DEMAND_GAP_CLOSING;
    stats[`labour.population.${id}`] = country.population;
    stats[`labour.gdp.${id}`] = country.gdp;
    stats[`labour.demand.${id}`] = demand;
    const gdpPerPerson = country.gdp / Math.max(country.population, 1);
    economies.set(id, { growth, demand, gdpPerPerson });
  }
  return economies;
}

/** Local workers by `<region>.<sector>` and foreign workers by `<region>.foreign`. */
function projectJobs(world: World, content: Content): Tally {
  const tally = new Tally();
  for (const project of content.projects) {
    const state = world.projects[project.id];
    if (!state) continue;
    const { sector, local, foreign } = projectWorkforce(project, state.status);
    tally.add(`${project.region}.${sector}`, local);
    tally.add(`${project.region}.foreign`, foreign);
  }
  return tally;
}

/** Applies new disasters once (displacing people) and returns the decaying 0–1 shock. */
function disasterShock(world: World, region: RegionState): number {
  const { stats } = world;
  const key = `labour.disasterShock.${region.id}`;
  let shock = (stats[key] ?? 0) * DISASTER_PERSISTENCE;
  for (const { source, effect } of world.effects) {
    if (effect.kind !== 'disaster' || effect.region !== region.id) continue;
    const applied = `labour.disaster.${source}.${region.id}`;
    if (stats[applied] !== undefined) continue;
    stats[applied] = 1;
    shock = Math.min(1, shock + effect.severity);
    region.displaced += region.population * DISASTER_DISPLACED_SHARE * effect.severity;
  }
  stats[key] = shock;
  return shock;
}

interface Mover {
  readonly region: RegionState;
  /** Expected real income: wage × real income index × chance of a job. */
  readonly appeal: number;
}

function updateRegion(
  world: World,
  info: Region,
  region: RegionState,
  economy: Economy,
  projects: Tally,
): Mover {
  const { id, jobs } = region;
  const baseKey = `labour.baseJobs.${id}`;
  const base =
    (world.stats[baseKey] ?? jobs.agriculture + jobs.industry + jobs.services) * economy.growth;
  world.stats[baseKey] = base;
  region.population *= economy.growth;
  const shock = disasterShock(world, region);
  const scale = base * economy.demand * (1 - DISASTER_JOB_LOSS * shock);
  const { agriculture, industry, services } = info.employment;
  const next: Jobs = {
    agriculture: scale * agriculture,
    industry: scale * industry + projects.get(`${id}.industry`),
    services: scale * services + projects.get(`${id}.services`),
    construction: projects.get(`${id}.construction`),
    logistics: region.throughput * LOGISTICS_JOBS_PER_WEEKLY_TEU + projects.get(`${id}.logistics`),
  };
  region.jobs = next;
  const employed =
    next.agriculture + next.industry + next.services + next.construction + next.logistics;
  const labourForce = Math.max(region.population * LABOUR_PARTICIPATION, 1);
  region.unemployment = clamp(1 - employed / labourForce, MIN_UNEMPLOYMENT, MAX_UNEMPLOYMENT);
  const wage =
    pow(region.unemployment / INITIAL_UNEMPLOYMENT, -WAGE_CURVE_ELASTICITY) *
    (1 - DISASTER_INCOME_LOSS * shock);
  region.income = economy.gdpPerPerson * info.income * wage;
  world.stats[`labour.foreignWorkers.${id}`] = projects.get(`${id}.foreign`);
  const realIndex = pow(info.income, 1 - PRICE_LEVEL_ELASTICITY);
  return { region, appeal: wage * realIndex * (1 - region.unemployment) };
}

/** Moves people from below-average to above-average regions; the national total is kept. */
function migrate(movers: readonly Mover[], stats: Record<string, number>): void {
  let people = 0;
  let weighted = 0;
  for (const { region, appeal } of movers) {
    people += region.population;
    weighted += region.population * appeal;
  }
  const mean = weighted / Math.max(people, 1);
  const flows = movers.map(({ region, appeal }) => ({
    region,
    leaving:
      region.population * Math.min(MAX_MIGRATION_RATE, MIGRATION_RATE * Math.max(0, mean - appeal)),
    pull: region.population * Math.max(0, appeal - mean),
  }));
  let leaving = 0;
  let pull = 0;
  for (const flow of flows) {
    leaving += flow.leaving;
    pull += flow.pull;
  }
  for (const flow of flows) {
    const net = (leaving * flow.pull) / Math.max(pull, Number.MIN_VALUE) - flow.leaving;
    flow.region.population += net;
    stats[`labour.migration.${flow.region.id}`] = net;
  }
}

export function createLabourSystem(content: Content): System {
  return {
    id: 'labour',
    step(world, ctx) {
      const economies = updateEconomies(world, content);
      const projects = projectJobs(world, content);
      const movers = new Map<string, Mover[]>();
      for (const info of content.regions) {
        const region = world.regions[info.id];
        const economy = economies.get(info.country);
        if (!region || !economy) continue;
        const mover = updateRegion(world, info, region, economy, projects);
        movers.set(info.country, [...(movers.get(info.country) ?? []), mover]);
      }
      if (ctx.week % MIGRATION_WEEKS !== 0) return;
      for (const group of movers.values()) migrate(group, world.stats);
    },
  };
}
