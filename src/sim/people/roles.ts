import type { Rng } from '../../core/rng';
import type { Region } from '../../content/types';
import type { Role, RoleGroup } from './types';

export const ROLE_GROUP: Readonly<Record<Role, RoleGroup>> = {
  child: 'locals',
  student: 'locals',
  homemaker: 'locals',
  retiree: 'locals',
  unemployed: 'locals',
  farmer: 'locals',
  herder: 'locals',
  fisher: 'locals',
  'factory-worker': 'locals',
  miner: 'locals',
  'market-trader': 'locals',
  shopkeeper: 'locals',
  teacher: 'locals',
  nurse: 'locals',
  'truck-driver': 'transport',
  'rail-worker': 'transport',
  dockworker: 'transport',
  sailor: 'transport',
  'construction-worker': 'builders',
  engineer: 'builders',
  'office-worker': 'builders',
  entrepreneur: 'builders',
  'customs-officer': 'officials',
  'local-official': 'officials',
  'bank-analyst': 'officials',
  'port-manager': 'officials',
};

/** Income relative to the regional average income per person (modelling assumption). */
export const ROLE_INCOME: Readonly<Record<Role, number>> = {
  child: 0,
  student: 0,
  homemaker: 0,
  retiree: 0.4,
  unemployed: 0.1,
  farmer: 0.5,
  herder: 0.45,
  fisher: 0.55,
  'factory-worker': 0.9,
  miner: 1.2,
  'construction-worker': 0.9,
  engineer: 2.2,
  'truck-driver': 1,
  'rail-worker': 1,
  dockworker: 1,
  sailor: 1.2,
  'market-trader': 0.8,
  shopkeeper: 1.1,
  teacher: 1,
  nurse: 0.9,
  'office-worker': 1.3,
  entrepreneur: 2.5,
  'customs-officer': 1.4,
  'local-official': 1.6,
  'bank-analyst': 2.4,
  'port-manager': 3,
};

/** Roles that don't earn a wage from work. */
export const NON_WORKING: ReadonlySet<Role> = new Set([
  'child',
  'student',
  'homemaker',
  'retiree',
  'unemployed',
]);

/** Where a region's economy makes certain jobs possible. */
export interface RegionFeatures {
  readonly port: boolean;
  readonly border: boolean;
  readonly project: boolean;
  readonly mining: boolean;
  readonly pastoral: boolean;
}

type Requirement = keyof RegionFeatures | null;

const SECTOR_ROLES: Readonly<
  Record<keyof Region['employment'], readonly (readonly [Role, number, Requirement])[]>
> = {
  agriculture: [
    ['farmer', 0.8, null],
    ['herder', 0.15, 'pastoral'],
    ['fisher', 0.05, 'port'],
  ],
  industry: [
    ['factory-worker', 0.55, null],
    ['construction-worker', 0.2, null],
    ['miner', 0.1, 'mining'],
    ['engineer', 0.1, null],
    ['truck-driver', 0.05, null],
  ],
  services: [
    ['market-trader', 0.2, null],
    ['shopkeeper', 0.12, null],
    ['teacher', 0.1, null],
    ['nurse', 0.07, null],
    ['office-worker', 0.2, null],
    ['truck-driver', 0.08, null],
    ['rail-worker', 0.04, null],
    ['dockworker', 0.04, 'port'],
    ['sailor', 0.02, 'port'],
    ['port-manager', 0.005, 'port'],
    ['local-official', 0.04, null],
    ['customs-officer', 0.02, 'border'],
    ['bank-analyst', 0.03, null],
    ['entrepreneur', 0.04, null],
  ],
};

/** Picks an option with probability proportional to its weight. */
export const pickWeighted = <T>(rng: Rng, options: readonly (readonly [T, number])[]): T => {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.float() * total;
  const last = options.length - 1;
  for (let i = 0; i < last; i++) {
    const [option, weight] = options[i] as readonly [T, number];
    roll -= weight;
    if (roll < 0) return option;
  }
  return (options[last] as readonly [T, number])[0];
};

/** A working role drawn from the region's sector mix and the jobs its economy allows. */
export function sampleWorkRole(rng: Rng, region: Region, features: RegionFeatures): Role {
  const sector = pickWeighted(
    rng,
    Object.entries(region.employment) as [keyof Region['employment'], number][],
  );
  const roles = SECTOR_ROLES[sector].filter(([, , needs]) => needs === null || features[needs]);
  return pickWeighted(
    rng,
    roles.map(([role, weight]) => [role, weight] as const),
  );
}

/** Roles each region should have at least one of, so every kind of story can be found. */
export function storyRoles(features: RegionFeatures): Role[] {
  return [
    ...(features.port ? (['dockworker'] as const) : []),
    ...(features.border ? (['customs-officer', 'truck-driver'] as const) : []),
    ...(features.project ? (['construction-worker', 'local-official'] as const) : []),
  ];
}

/** Stable per-person income factor in [0.7, 1.3] derived from their genes. */
export const personalFactor = (genes: number): number => 0.7 + (0.6 * ((genes >>> 8) & 255)) / 255;
