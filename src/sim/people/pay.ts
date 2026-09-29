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
/** Monthly chance a project contract ends while the works go on (about two and a half years). */
export const CONTRACT_END = 1 / 30;
/** Monthly chance once the employer has stopped building in the region. */
export const WIND_DOWN_END = 0.25;
/** Projects hire at most this share of a region's labour force (modelling assumption). */
export const BRI_WORKFORCE_CAP = 0.1;

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
const OUTSIDE_LABOUR_FORCE: ReadonlySet<Role> = new Set(['child', 'student', 'retiree']);

export interface Payroll {
  /** People on a project payroll, or with a job offer pending. */
  staff: number;
  labour: number;
}

export interface Pay {
  /** Records each region's first freight volume, the baseline for logistics pay. */
  track(world: World): void;
  /** Is the Belt and Road building or running something in this region this year? */
  briWorks(world: World, region: string): boolean;
  /** Multiplier on a person's base pay from who they work for and what their region trades. */
  factor(world: World, person: Person): number;
  /** Monthly chance that a person's project contract ends. */
  contractEnd(world: World, person: Person): number;
  /** Labour force and project payrolls per region. */
  payrolls(world: World): Map<string, Payroll>;
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
    contractEnd: (world, person) => {
      if (person.employer === null) return 0;
      const building = person.employer.startsWith('bri:')
        ? briWorks(world, person.region)
        : world.projects[person.employer]?.status === 'construction';
      return building ? CONTRACT_END : WIND_DOWN_END;
    },
    payrolls: (world) => {
      const offered = new Set(
        world.turningPoints
          .filter((tp) => tp.kind === 'job-offer' && tp.chosen === null)
          .map((tp) => tp.person),
      );
      const payrolls = new Map<string, Payroll>(
        Object.keys(world.regions).map((region) => [region, { staff: 0, labour: 0 }]),
      );
      for (const person of world.people) {
        if (person.deathWeek !== null || OUTSIDE_LABOUR_FORCE.has(person.role)) continue;
        const payroll = required(payrolls.get(person.region), 'payroll');
        payroll.labour++;
        if (person.employer !== null || offered.has(person.id)) payroll.staff++;
      }
      return payrolls;
    },
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
