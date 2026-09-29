import { required } from '../../core/required';
import type { Rng } from '../../core/rng';
import type { Content } from '../../content/types';
import type { System } from '../engine/engine';
import { ageAt, bestRegionFor, isDue, record, relocate } from '../people/lifecycle';
import type { Person } from '../people/types';
import type { World } from '../world/world';
import { believed, topicId } from './topics';

export type TurningPointKind =
  'job-offer' | 'relocation' | 'protest' | 'emigrate' | 'bribe' | 'speak-out';

export interface TurningPoint {
  readonly id: string;
  readonly person: number;
  readonly kind: TurningPointKind;
  readonly week: number;
  /** Option ids; the first is the "act" option, the second the "don't" option. */
  readonly options: readonly string[];
  /** Option the player whispered, if any. */
  nudge: string | null;
  chosen: string | null;
  decidedWeek: number | null;
  /** i18n reason keys, most important first, e.g. 'reason.needs-money'. */
  reasons: string[];
}

export interface PendingNudge {
  readonly person: number;
  readonly kind: TurningPointKind;
  readonly option: string;
  readonly untilWeek: number;
}

/** Weeks a turning point stays open before the person decides. */
export const DECISION_WEEKS = 2;
/** How much a whispered nudge adds to an option's appeal. */
export const NUDGE_WEIGHT = 0.35;
/** How long a mirrored nudge waits for a matching turning point. */
export const MIRROR_WEEKS = 26;
const MAX_TURNING_POINTS = 400;
const RECENT_DISPLACEMENT_WEEKS = 8;

export const OPTIONS: Readonly<Record<TurningPointKind, readonly [string, string]>> = {
  'job-offer': ['accept', 'decline'],
  relocation: ['accept', 'resist'],
  protest: ['join', 'stay-home'],
  emigrate: ['leave', 'stay'],
  bribe: ['accept', 'refuse'],
  'speak-out': ['speak', 'stay-silent'],
};

type Factor = readonly [reason: string, weight: number];

interface Situation {
  readonly world: World;
  readonly person: Person;
  readonly pressFreedom: number;
  readonly corruption: number;
}

/** Why a person would act (first) or not act (second), as weighted reasons. */
function weigh(
  kind: TurningPointKind,
  { world, person, pressFreedom, corruption }: Situation,
): readonly [Factor[], Factor[]] {
  const { traits, wellbeing, beliefs, region } = person;
  const belief = (kind: Parameters<typeof topicId>[0]) => believed(beliefs, topicId(kind, region));
  const grievance = Math.max(belief('pollution'), belief('land'));
  switch (kind) {
    case 'job-offer':
      return [
        [
          ['reason.needs-money', 0.5 * (1 - wellbeing.income)],
          ['reason.trusts-projects', 0.3 * belief('china')],
          ['reason.ambitious', 0.2 * traits.ambition],
        ],
        [
          ['reason.fears-pollution', 0.3 * belief('pollution')],
          ['reason.cautious', 0.25 * (1 - traits.risk)],
        ],
      ];
    case 'relocation':
      return [
        [
          ['reason.defers-to-authority', 0.4 * traits.conformity],
          ['reason.needs-money', 0.3 * (1 - wellbeing.income)],
        ],
        [
          ['reason.rooted-here', 0.4 * wellbeing.belonging],
          ['reason.bold', 0.3 * traits.risk],
        ],
      ];
    case 'protest':
      return [
        [
          ['reason.angry-about-harm', 0.4 * grievance],
          ['reason.bold', 0.3 * traits.risk],
          ['reason.distrusts-authority', 0.2 * (1 - traits.conformity)],
        ],
        [
          ['reason.fears-repression', 0.4 * (1 - pressFreedom)],
          ['reason.defers-to-authority', 0.3 * traits.conformity],
        ],
      ];
    case 'emigrate':
      return [
        [
          ['reason.no-future-here', 0.4 * (1 - wellbeing.outlook)],
          ['reason.curious', 0.3 * traits.openness],
          ['reason.needs-money', person.role === 'unemployed' ? 0.2 : 0],
        ],
        [
          ['reason.rooted-here', 0.4 * wellbeing.belonging],
          ['reason.cautious', 0.2 * (1 - traits.risk)],
        ],
      ];
    case 'bribe':
      return [
        [
          ['reason.everyone-does-it', 0.3 * corruption],
          ['reason.needs-money', 0.2 * (1 - wellbeing.income)],
          ['reason.flexible-morals', 0.5 * (1 - traits.honesty)],
        ],
        [
          ['reason.honest', 0.5 * traits.honesty],
          ['reason.fears-exposure', 0.2 * pressFreedom],
        ],
      ];
    case 'speak-out':
      return [
        [
          ['reason.angry-about-harm', 0.4 * grievance],
          ['reason.distrusts-authority', 0.3 * (1 - traits.conformity)],
          ['reason.free-press', 0.2 * pressFreedom],
        ],
        [
          ['reason.fears-repression', 0.4 * (1 - pressFreedom)],
          ['reason.defers-to-authority', 0.3 * traits.conformity],
        ],
      ];
  }
}

const sum = (factors: readonly Factor[]) =>
  factors.reduce((total, [, weight]) => total + weight, 0);
const top = (factors: readonly Factor[]) =>
  [...factors].sort((a, b) => b[1] - a[1]).map(([reason]) => reason);

/** Decides a turning point from the person's beliefs, character and any nudge. */
function decide(situation: Situation, tp: TurningPoint, rng: Rng): void {
  const [act, dont] = weigh(tp.kind, situation);
  const [actOption, dontOption] = tp.options as readonly [string, string];
  const withNudge = (option: string, factors: Factor[]): Factor[] =>
    tp.nudge === option ? [...factors, ['reason.nudged', NUDGE_WEIGHT]] : factors;
  const actFactors = withNudge(actOption, act);
  const dontFactors = withNudge(dontOption, dont);
  const actScore = sum(actFactors) + (rng.float() - 0.5) * 0.2;
  const dontScore = sum(dontFactors) + (rng.float() - 0.5) * 0.2;
  const acts = actScore >= dontScore;
  tp.chosen = acts ? actOption : dontOption;
  const reasons = top(acts ? actFactors : dontFactors).slice(0, 2);
  tp.reasons =
    tp.nudge !== null && tp.nudge !== tp.chosen ? ['reason.refused-nudge', ...reasons] : reasons;
  tp.decidedWeek = situation.world.week;
}

function consequences(world: World, content: Content, tp: TurningPoint, person: Person): void {
  const region = required(world.regions[person.region], 'region state');
  const household = required(world.households[person.household], 'household');
  record(person, world.week, 'decided', `${tp.kind}:${String(tp.chosen)}`);
  switch (`${tp.kind}:${String(tp.chosen)}`) {
    case 'job-offer:accept':
      person.role = 'construction-worker';
      record(person, world.week, 'job', person.role);
      return;
    case 'relocation:accept':
    case 'emigrate:leave': {
      const target = bestRegionFor(world, content, person.region);
      if (target) relocate(world, person, target);
      return;
    }
    case 'relocation:resist':
    case 'protest:join':
    case 'speak-out:speak':
      region.sentiment.government = Math.max(-1, region.sentiment.government - 0.01);
      return;
    case 'bribe:accept':
      household.wealth += person.income * 0.2;
      return;
    default:
      return;
  }
}

/** Which turning point, if any, a person's situation raises this month. */
function trigger(
  world: World,
  content: Content,
  person: Person,
  rng: Rng,
): TurningPointKind | null {
  const age = ageAt(person, world.week);
  if (age < 18) return null;
  const displaced = person.log.some(
    (event) => event.kind === 'displaced' && world.week - event.week < RECENT_DISPLACEMENT_WEEKS,
  );
  if (displaced && rng.chance(0.5)) return 'relocation';
  const building = content.projects.some(
    (project) =>
      project.region === person.region && world.projects[project.id]?.status === 'construction',
  );
  const struggling = person.role === 'unemployed' || person.wellbeing.income < 0.35;
  if (building && struggling && age <= 55 && rng.chance(0.15)) return 'job-offer';
  if ((person.role === 'customs-officer' || person.role === 'local-official') && rng.chance(0.05)) {
    return 'bribe';
  }
  const pollution = person.beliefs[topicId('pollution', person.region)];
  const land = person.beliefs[topicId('land', person.region)];
  const grievance = Math.max(pollution?.value ?? 0, land?.value ?? 0);
  if (grievance > 0.7 && age <= 60 && rng.chance(0.05)) return 'protest';
  const sure = Math.max(pollution?.confidence ?? 0, land?.confidence ?? 0) > 0.6;
  if (grievance > 0.75 && sure && rng.chance(0.03)) return 'speak-out';
  const stuck = person.role === 'unemployed' || person.wellbeing.outlook < 0.3;
  if (stuck && age >= 20 && age <= 45 && rng.chance(0.03)) return 'emigrate';
  return null;
}

/** Raises turning points in people's lives and resolves them after a short window. */
export function createDecisionsSystem(content: Content): System {
  const countries = new Map(content.countries.map((c) => [c.id, c]));
  const situationOf = (world: World, person: Person): Situation => {
    const country = required(
      countries.get(required(world.regions[person.region], 'region state').country),
      'country',
    );
    return { world, person, pressFreedom: country.pressFreedom, corruption: country.corruption };
  };
  return {
    id: 'decisions',
    step: (world, ctx) => {
      const expired = world.pendingNudges.filter((pending) => pending.untilWeek <= world.week);
      if (expired.length > 0) {
        world.stats['decisions.unmirrored'] =
          (world.stats['decisions.unmirrored'] ?? 0) + expired.length;
        world.pendingNudges = world.pendingNudges.filter(
          (pending) => pending.untilWeek > world.week,
        );
      }
      for (const tp of world.turningPoints) {
        if (tp.chosen !== null || world.week - tp.week < DECISION_WEEKS) continue;
        const person = required(world.people[tp.person], 'person');
        if (person.deathWeek !== null) {
          tp.chosen = tp.options[1] as string;
          tp.decidedWeek = world.week;
          tp.reasons = ['reason.died'];
          continue;
        }
        decide(situationOf(world, person), tp, ctx.rng(person.id, 'decide'));
        const key = `decisions.decided.${tp.kind}`;
        world.stats[key] = (world.stats[key] ?? 0) + 1;
        consequences(world, content, tp, person);
      }
      const open = new Set(
        world.turningPoints.filter((tp) => tp.chosen === null).map((tp) => tp.person),
      );
      for (const person of world.people) {
        if (person.deathWeek !== null || open.has(person.id) || !isDue(person, world.week))
          continue;
        const kind = trigger(world, content, person, ctx.rng(person.id, 'trigger'));
        if (!kind) continue;
        const raised = `decisions.raised.${kind}`;
        world.stats[raised] = (world.stats[raised] ?? 0) + 1;
        const mirrored = world.pendingNudges.find((p) => p.person === person.id && p.kind === kind);
        if (mirrored) world.pendingNudges = world.pendingNudges.filter((p) => p !== mirrored);
        world.turningPoints.push({
          id: `${String(world.week)}:${String(person.id)}:${kind}`,
          person: person.id,
          kind,
          week: world.week,
          options: OPTIONS[kind],
          nudge: mirrored?.option ?? null,
          chosen: null,
          decidedWeek: null,
          reasons: [],
        });
      }
      if (world.turningPoints.length > MAX_TURNING_POINTS) {
        const pending = world.turningPoints.filter((tp) => tp.chosen === null);
        const decided = world.turningPoints.filter((tp) => tp.chosen !== null);
        world.turningPoints = [
          ...decided.slice(decided.length - (MAX_TURNING_POINTS - pending.length)),
          ...pending,
        ];
      }
    },
  };
}

/**
 * Whispers `option` to the person facing an open turning point. Returns the nudge to mirror
 * into the twin world, or null if the turning point is unknown or already decided.
 */
export function nudge(world: World, turningPoint: string, option: string): PendingNudge | null {
  const tp = world.turningPoints.find((candidate) => candidate.id === turningPoint);
  if (!tp || tp.chosen !== null) return null;
  if (!tp.options.includes(option)) throw new Error(`invalid option ${option} for ${tp.kind}`);
  tp.nudge = option;
  return { person: tp.person, kind: tp.kind, option, untilWeek: world.week + MIRROR_WEEKS };
}
