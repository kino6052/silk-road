import { weekToDate } from '../../core/calendar';
import { required } from '../../core/required';
import type { Content } from '../../content/types';
import { spendingBn } from '../systems/bri';
import type { World } from '../world/world';
import type { Person, Role } from './types';

/** Chinese-backed employers and sites pay above local rates (modelling assumption). */
export const BRI_WAGE_PREMIUM = 1.5;
/** Other large projects pay a little above local rates too. */
export const OTHER_PROJECT_PREMIUM = 1.1;
/** Logistics pay rises by this share for each doubling-equivalent of regional freight... */
export const LOGISTICS_ELASTICITY = 0.3;
/** ...up to this much above the base. */
export const LOGISTICS_CAP = 0.6;
/** Local traders earn this much more where the Belt and Road is at work. */
export const TRADE_SPILLOVER = 0.15;

const LOGISTICS: ReadonlySet<Role> = new Set([
  'truck-driver',
  'rail-worker',
  'dockworker',
  'sailor',
  'port-manager',
  'customs-officer',
]);
const TRADERS: ReadonlySet<Role> = new Set(['market-trader', 'shopkeeper', 'entrepreneur']);
const ACTIVE = new Set(['construction', 'operating']);

export interface Pay {
  /** Records each region's first freight volume, the baseline for logistics pay. */
  track(world: World): void;
  /** Is the Belt and Road building or running something in this region this year? */
  briWorks(world: World, region: string): boolean;
  /** Multiplier on a person's base pay from who they work for and what their region trades. */
  factor(world: World, person: Person): number;
}

const baseKey = (region: string) => `pay.throughputBase.${region}`;

export function createPay(content: Content): Pay {
  const projects = new Map(content.projects.map((project) => [project.id, project]));
  const envelopes = new Map(content.bri.map((envelope) => [envelope.country, envelope]));
  const corridor = new Set<string | null>([
    ...content.nodes.map((node) => node.region),
    ...content.projects.map((project) => project.region),
  ]);

  const briWorks = (world: World, region: string): boolean => {
    if (!world.bri) return false;
    const flagship = content.projects.some(
      (p) =>
        p.bri &&
        p.region === region &&
        ACTIVE.has(required(world.projects[p.id], 'project state').status),
    );
    if (flagship) return true;
    const envelope = envelopes.get(required(world.regions[region], 'region state').country);
    const year = weekToDate(world.week).year;
    return corridor.has(region) && envelope !== undefined && spendingBn(envelope, year) > 0;
  };

  return {
    track: (world) => {
      for (const region of Object.values(world.regions)) {
        if (world.stats[baseKey(region.id)] === undefined && region.throughput > 0) {
          world.stats[baseKey(region.id)] = region.throughput;
        }
      }
    },
    briWorks,
    factor: (world, person) => {
      if (person.employer !== null) {
        const bri =
          person.employer.startsWith('bri:') || projects.get(person.employer)?.bri === true;
        return bri ? BRI_WAGE_PREMIUM : OTHER_PROJECT_PREMIUM;
      }
      if (LOGISTICS.has(person.role)) {
        const base = world.stats[baseKey(person.region)];
        const now = required(world.regions[person.region], 'region state').throughput;
        if (base === undefined) return 1;
        return 1 + Math.min(LOGISTICS_CAP, LOGISTICS_ELASTICITY * Math.max(0, now / base - 1));
      }
      return TRADERS.has(person.role) && briWorks(world, person.region) ? 1 + TRADE_SPILLOVER : 1;
    },
  };
}
