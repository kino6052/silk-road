import { canonicalJson } from '../../core/canonical-json';
import { hashString } from '../../core/hash';
import type { Content, Country, Region } from '../../content/types';
import type {
  ActiveEffect,
  CountryState,
  LinkState,
  LoanState,
  ProjectState,
  RegionState,
} from './state';

/**
 * The whole simulation state. It is plain JSON-safe data so it can be cloned, hashed,
 * snapshotted and saved without custom code. Static content is referenced by id only.
 */
export interface World {
  readonly seed: number;
  /** false in the no-BRI shadow world. */
  readonly bri: boolean;
  week: number;
  countries: Record<string, CountryState>;
  regions: Record<string, RegionState>;
  projects: Record<string, ProjectState>;
  links: Record<string, LinkState>;
  loans: LoanState[];
  effects: ActiveEffect[];
  /** Ids of historical events already applied. */
  firedEvents: string[];
  /**
   * This week's published metrics, keyed `<system>.<metric>[.<id>]`, e.g.
   * 'trade.rail.teu' or 'labour.foreignWorkers.PAK-BAL'. Systems overwrite their own keys.
   */
  stats: Record<string, number>;
}

export interface WorldOptions {
  readonly seed: number;
  readonly bri: boolean;
}

/** Bump when the save structure changes incompatibly. */
const SAVE_FORMAT = 1;
const START_YEAR = '2013';
/** Share of the population in the labour force (modelling assumption). */
export const LABOUR_PARTICIPATION = 0.45;
export const INITIAL_UNEMPLOYMENT = 0.06;

const byId = <T extends { readonly id: string }>(items: readonly T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

function countryState(country: Country, content: Content): CountryState {
  const start = content.indicators[country.id]?.[START_YEAR];
  return {
    id: country.id,
    population: start?.population ?? 0,
    gdp: start?.gdp ?? 0,
    externalDebt: country.externalDebtBn,
    chinaDebt: 0,
    debtDistress: 0,
    imfProgram: false,
    sanctions: 0,
    stability: 1,
    blocs: [...country.blocs],
    policies: [],
  };
}

function regionState(
  region: Region,
  countries: Record<string, CountryState>,
  pm25: number,
): RegionState {
  const country = countries[region.country];
  const gdpPerPerson = country && country.population > 0 ? country.gdp / country.population : 0;
  const population = region.population * 1e6;
  const employed = population * LABOUR_PARTICIPATION * (1 - INITIAL_UNEMPLOYMENT);
  return {
    id: region.id,
    country: region.country,
    population,
    jobs: {
      agriculture: employed * region.employment.agriculture,
      industry: employed * region.employment.industry,
      services: employed * region.employment.services,
      construction: 0,
      logistics: 0,
    },
    unemployment: INITIAL_UNEMPLOYMENT,
    income: gdpPerPerson * region.income,
    pollution: pm25 * (0.7 + 0.6 * region.urban),
    landTakenHa: 0,
    displaced: 0,
    security: 0.8,
    sentiment: { china: 0, government: 0 },
    throughput: 0,
  };
}

export function createWorld(content: Content, { seed, bri }: WorldOptions): World {
  const countries = byId(content.countries.map((country) => countryState(country, content)));
  const pm25 = Object.fromEntries(content.countries.map((c) => [c.id, c.pm25]));
  return {
    seed,
    bri,
    week: 0,
    countries,
    regions: byId(content.regions.map((r) => regionState(r, countries, pm25[r.country] ?? 0))),
    projects: byId(
      content.projects
        .filter((project) => bri || !project.bri)
        .map((project) => ({ id: project.id, status: 'hidden' as const })),
    ),
    links: byId(
      content.links.map((link) => ({ id: link.id, open: link.open, capacityFactor: 1, flow: 0 })),
    ),
    loans: [],
    effects: [],
    firedEvents: [],
    stats: {},
  };
}

export function cloneWorld(world: World): World {
  return structuredClone(world);
}

export function serializeWorld(world: World): string {
  return JSON.stringify({ format: SAVE_FORMAT, world });
}

export function deserializeWorld(text: string): World {
  const save = JSON.parse(text) as { format: unknown; world: World };
  if (save.format !== SAVE_FORMAT) {
    throw new Error(`unsupported save format: ${String(save.format)}`);
  }
  return save.world;
}

export function stateHash(world: World): number {
  return hashString(canonicalJson(world));
}
