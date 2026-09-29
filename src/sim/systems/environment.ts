// Environment and local politics: land take and displacement when projects break ground,
// PM2.5 from coal plants, traffic and clean-air policy, security after attacks, and each
// region's sentiment toward China and toward its government. Only projects present in the
// world count, so BRI land take, displacement and smoke never reach the no-BRI shadow world.
//
// State kept between weeks lives in `world.stats`:
//   environment.applied.<project> = 1 once its land take and displacement are applied
//   environment.basePm25.<region>, environment.baseSecurity.<region>  starting values
//   environment.attack.<event>.<region> = 1 once an attack has been applied
//   environment.attacks.<region>   decaying memory of attacks where BRI projects are active
//   environment.incomeRef.<region> slow moving average of income (for income growth)
// Published: environment.co2.<region> (kt CO2 a year from operating projects).
import { dateToWeek, type CivilDate } from '../../core/calendar';
import type { Content, Project, Region } from '../../content/types';
import type { System } from '../engine/engine';
import type { ProjectStatus, RegionState } from '../world/state';
import { INITIAL_UNEMPLOYMENT, LABOUR_PARTICIPATION, type World } from '../world/world';
import { clamp, projectWorkforce, Tally, WEEKS_PER_YEAR } from './labour';

/**
 * PM2.5 (µg/m³) added to the host region's mean per Mt CO2 a year of operating coal power
 * (estimated: a 1.3 GW plant emits ~7.5 Mt a year and adds ~1 µg/m³ region-wide).
 */
export const COAL_PM25_HOST_PER_MT = 0.15;
/** The same for every other region of the country (secondary sulphate and nitrate travel far). */
export const COAL_PM25_NATIONAL_PER_MT = 0.03;
/**
 * PM2.5 (µg/m³) per 1,000 TEU a week through the region (trucks, locomotives, ships at berth;
 * estimated so that the largest ports add a few µg/m³, 5–10% of their city's PM2.5).
 */
export const TRAFFIC_PM25_PER_KTEU = 0.005;
/** Share of the gap to the target PM2.5 closed each week. */
const POLLUTION_ADJUSTMENT = 0.25;

interface AirTrend {
  readonly start: CivilDate;
  /** Share of the starting background PM2.5 removed per year. */
  readonly cutPerYear: number;
  readonly floor: number;
}

/**
 * National clean-air plans. China's September 2013 Air Pollution Prevention and Control Action
 * Plan cut population-weighted PM2.5 by roughly 35–40% by 2020 (Zhang et al. 2019, PNAS;
 * MEE bulletins); calibrated to ~38% by January 2020, levelling off at 40%.
 */
const CLEAN_AIR_PLANS: ReadonlyMap<string, AirTrend> = new Map([
  ['CHN', { start: { year: 2014, month: 1, day: 1 }, cutPerYear: 0.065, floor: 0.6 }],
]);
/** Elsewhere a slow improvement (0.5% a year, estimated from WHO/GBD PM2.5 trends). */
const BACKGROUND_AIR_TREND: AirTrend = {
  start: { year: 2014, month: 1, day: 1 },
  cutPerYear: 0.005,
  floor: 0.85,
};

/** Security lost per unit of attack severity. */
const ATTACK_SECURITY_LOSS = 0.3;
/** Share of the gap to normal security recovered each week (half-life ~8 months). */
const SECURITY_RECOVERY = 0.02;
/** Weekly persistence of the memory of attacks tied to BRI projects. */
const ATTACK_MEMORY = 0.98;

// Sentiment targets (−1..1), estimated. Sentiment moves 5% of the way to its target each week.
/** Toward China, per share of the labour force in local jobs on BRI projects. */
const LOCAL_JOBS_WEIGHT = 30;
/** Toward China, per share of the labour force made up of foreign BRI workers. */
const FOREIGN_WORKERS_WEIGHT = 40;
/** Per share of the population displaced (BRI projects for China; all for the government). */
const DISPLACEMENT_WEIGHT = 100;
/** Toward China, per µg/m³ of PM2.5 from BRI coal plants. */
const COAL_SMOKE_WEIGHT = 0.1;
/** Toward China, per unit of remembered attack severity where BRI projects are active. */
const ATTACK_WEIGHT = 0.3;
/** Toward the government, per unit of income growth against the past year's average. */
const INCOME_GROWTH_WEIGHT = 3;
/** Toward the government, per point of unemployment above the 2013 level. */
const UNEMPLOYMENT_WEIGHT = 5;
const SENTIMENT_ADJUSTMENT = 0.05;
const INCOME_MEMORY_WEEKS = 52;

const BROKEN_GROUND: ReadonlySet<ProjectStatus> = new Set(['construction', 'operating', 'stalled']);

function airTrend(country: string, week: number): number {
  const { start, cutPerYear, floor } = CLEAN_AIR_PLANS.get(country) ?? BACKGROUND_AIR_TREND;
  const years = Math.max(0, week - dateToWeek(start)) / WEEKS_PER_YEAR;
  return Math.max(floor, 1 - cutPerYear * years);
}

/** Reads a stored value, storing `initial` the first time. */
function remember(stats: Record<string, number>, key: string, initial: number): number {
  const value = stats[key] ?? initial;
  stats[key] = value;
  return value;
}

function addCoal(tally: Tally, kind: string, project: Project, mt: number): void {
  tally.add(`${kind}.${project.region}`, mt);
  tally.add(`${kind}.${project.country}`, mt);
}

/** PM2.5 from coal: the host region's own plants plus the rest of the country's. */
function coalPm25(tally: Tally, kind: string, { id, country }: Region): number {
  const host = tally.get(`${kind}.${id}`);
  const national = tally.get(`${kind}.${country}`) - host;
  return COAL_PM25_HOST_PER_MT * host + COAL_PM25_NATIONAL_PER_MT * national;
}

function tallyProjects(world: World, content: Content): Tally {
  const tally = new Tally();
  for (const project of content.projects) {
    const state = world.projects[project.id];
    if (!state) continue;
    const { region } = project;
    const applied = `environment.applied.${project.id}`;
    if (BROKEN_GROUND.has(state.status) && world.stats[applied] === undefined) {
      world.stats[applied] = 1;
      tally.add(`land.${region}`, project.landHa);
      tally.add(`displaced.${region}`, project.displacedPeople);
    }
    const co2 = state.status === 'operating' ? project.co2KtPerYear : 0;
    const coalMt = project.kind === 'power-coal' ? co2 / 1000 : 0;
    tally.add(`co2.${region}`, co2);
    addCoal(tally, 'coal', project, coalMt);
    if (!project.bri) continue;
    addCoal(tally, 'briCoal', project, coalMt);
    const { local, foreign } = projectWorkforce(project, state.status);
    tally.add(`briLocal.${region}`, local);
    tally.add(`briForeign.${region}`, foreign);
    const displaced = world.stats[applied] === undefined ? 0 : project.displacedPeople;
    tally.add(`briDisplaced.${region}`, displaced);
  }
  return tally;
}

/** Recovers security, applies new attacks once, and returns the attack memory. */
function updateSecurity(world: World, region: RegionState, hostsBri: boolean): number {
  const { stats } = world;
  const normal = remember(stats, `environment.baseSecurity.${region.id}`, region.security);
  const memoryKey = `environment.attacks.${region.id}`;
  let memory = (stats[memoryKey] ?? 0) * ATTACK_MEMORY;
  region.security += (normal - region.security) * SECURITY_RECOVERY;
  for (const { source, effect } of world.effects) {
    if (effect.kind !== 'security-attack' || effect.region !== region.id) continue;
    const applied = `environment.attack.${source}.${region.id}`;
    if (stats[applied] !== undefined) continue;
    stats[applied] = 1;
    region.security = Math.max(0, region.security - ATTACK_SECURITY_LOSS * effect.severity);
    memory += hostsBri ? effect.severity : 0;
  }
  stats[memoryKey] = memory;
  return memory;
}

function updateSentiment(
  world: World,
  info: Region,
  region: RegionState,
  tally: Tally,
  attacks: number,
): void {
  const { id } = region;
  const labourForce = Math.max(region.population * LABOUR_PARTICIPATION, 1);
  const people = Math.max(region.population, 1);
  const towardChina =
    (LOCAL_JOBS_WEIGHT * tally.get(`briLocal.${id}`) -
      FOREIGN_WORKERS_WEIGHT * tally.get(`briForeign.${id}`)) /
      labourForce -
    (DISPLACEMENT_WEIGHT * tally.get(`briDisplaced.${id}`)) / people -
    COAL_SMOKE_WEIGHT * coalPm25(tally, 'briCoal', info) -
    ATTACK_WEIGHT * attacks;
  const referenceKey = `environment.incomeRef.${id}`;
  const reference = world.stats[referenceKey] ?? region.income;
  world.stats[referenceKey] = reference + (region.income - reference) / INCOME_MEMORY_WEEKS;
  const towardGovernment =
    (INCOME_GROWTH_WEIGHT * (region.income - reference)) / Math.max(reference, 1) -
    UNEMPLOYMENT_WEIGHT * (region.unemployment - INITIAL_UNEMPLOYMENT) -
    (DISPLACEMENT_WEIGHT * region.displaced) / people;
  const { sentiment } = region;
  sentiment.china += (clamp(towardChina, -1, 1) - sentiment.china) * SENTIMENT_ADJUSTMENT;
  sentiment.government +=
    (clamp(towardGovernment, -1, 1) - sentiment.government) * SENTIMENT_ADJUSTMENT;
}

function updateRegion(
  world: World,
  info: Region,
  region: RegionState,
  tally: Tally,
  week: number,
): void {
  const { id } = region;
  region.landTakenHa += tally.get(`land.${id}`);
  region.displaced += tally.get(`displaced.${id}`);
  const background = remember(world.stats, `environment.basePm25.${id}`, region.pollution);
  const target =
    background * airTrend(info.country, week) +
    coalPm25(tally, 'coal', info) +
    (region.throughput / 1000) * TRAFFIC_PM25_PER_KTEU;
  region.pollution += (target - region.pollution) * POLLUTION_ADJUSTMENT;
  world.stats[`environment.co2.${id}`] = tally.get(`co2.${id}`);
  const briWorkers = tally.get(`briLocal.${id}`) + tally.get(`briForeign.${id}`);
  const attacks = updateSecurity(world, region, briWorkers > 0);
  updateSentiment(world, info, region, tally, attacks);
}

export function createEnvironmentSystem(content: Content): System {
  return {
    id: 'environment',
    step(world, ctx) {
      const tally = tallyProjects(world, content);
      for (const info of content.regions) {
        const region = world.regions[info.id];
        if (region) updateRegion(world, info, region, tally, ctx.week);
      }
    },
  };
}
