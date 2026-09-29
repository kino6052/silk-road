import { dateToWeek } from '../../core/calendar';
import { log } from '../../core/fixed-math';
import { required } from '../../core/required';
import type { Content } from '../../content/types';
import type { System } from '../engine/engine';
import type { World } from '../world/world';
import { ageAt, isDue } from './lifecycle';
import type { Person, Wellbeing } from './types';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const RECENT_WEEKS = 104;
const INCOME_FLOOR = log(1000);
const INCOME_SPAN = log(80000) - INCOME_FLOOR;

/** Targeted repression of groups in a region, which weighs on their freedom. */
export interface RepressionRule {
  readonly region: string;
  readonly cultures: readonly string[];
  readonly fromWeek: number;
  /** Multiplier on freedom while it applies. */
  readonly factor: number;
}

/**
 * Mass surveillance and detention in Xinjiang from 2017 weigh on the freedom of its Muslim
 * minorities (a modelling rule; sources in the almanac).
 */
export const REPRESSION: readonly RepressionRule[] = [
  {
    region: 'CHN-XJ',
    cultures: ['uyghur', 'kazakh', 'hui'],
    fromWeek: dateToWeek({ year: 2017, month: 1, day: 2 }),
    factor: 0.4,
  },
];

const DIMENSIONS: readonly (keyof Wellbeing)[] = [
  'income',
  'health',
  'security',
  'freedom',
  'belonging',
  'outlook',
];

const recently = (person: Person, week: number, kind: string) =>
  person.log.some((event) => event.kind === kind && week - event.week < RECENT_WEEKS);

/** Scores each person's life on six dimensions from their situation, monthly. */
export function createWellbeingSystem(
  content: Content,
  repression: readonly RepressionRule[] = REPRESSION,
): System {
  const pressFreedom = new Map(content.countries.map((c) => [c.id, c.pressFreedom]));

  const score = (world: World, person: Person): Wellbeing => {
    const region = required(world.regions[person.region], 'region state');
    const country = required(world.countries[region.country], 'country state');
    const household = required(world.households[person.household], 'household');
    const members = household.members.map((id) => required(world.people[id], 'person'));
    const perMember =
      members.reduce((sum, member) => sum + member.income, 0) / Math.max(1, members.length);
    const resources = Math.max(300, perMember + household.wealth * 0.02);
    const income = clamp01((log(resources) - INCOME_FLOOR) / INCOME_SPAN);
    const age = ageAt(person, world.week);
    const disaster = world.effects.some(
      ({ effect }) => effect.kind === 'disaster' && effect.region === person.region,
    );
    const displaced = recently(person, world.week, 'displaced');
    const moved = recently(person, world.week, 'moved');
    const spouse = person.spouse === null ? undefined : world.people[person.spouse];
    const children = world.people.filter(
      (other) =>
        other.deathWeek === null && (other.mother === person.id || other.father === person.id),
    ).length;
    const repressed = repression.find(
      (rule) =>
        rule.region === person.region &&
        rule.cultures.includes(person.culture) &&
        world.week >= rule.fromWeek,
    );
    return {
      income,
      health: clamp01(
        1 - (0.5 * region.pollution) / 120 - Math.max(0, age - 50) / 80 - (disaster ? 0.15 : 0),
      ),
      security: clamp01(
        region.security *
          (person.role === 'unemployed' ? 0.8 : 1) *
          (displaced ? 0.7 : 1) *
          (0.5 + 0.5 * country.stability),
      ),
      freedom: clamp01(
        (0.3 + 0.7 * required(pressFreedom.get(country.id), 'press freedom')) *
          (displaced ? 0.8 : 1) *
          (repressed?.factor ?? 1),
      ),
      belonging: clamp01(
        0.45 +
          (spouse && spouse.deathWeek === null ? 0.2 : 0) +
          (0.1 * Math.min(children, 3)) / 3 +
          (person.region === person.birthRegion ? 0.1 : -0.05) -
          (displaced ? 0.3 : 0) -
          (moved ? 0.1 : 0),
      ),
      outlook: clamp01(
        0.7 * person.wellbeing.outlook + 0.3 * (0.5 + 4 * (income - person.wellbeing.income)),
      ),
    };
  };

  return {
    id: 'wellbeing',
    step: (world) => {
      const totals = new Map<string, { count: number; sums: Record<keyof Wellbeing, number> }>();
      for (const person of world.people) {
        if (person.deathWeek !== null) continue;
        if (isDue(person, world.week)) person.wellbeing = score(world, person);
        const country = required(world.regions[person.region], 'region state').country;
        const total = totals.get(country) ?? {
          count: 0,
          sums: { income: 0, health: 0, security: 0, freedom: 0, belonging: 0, outlook: 0 },
        };
        total.count++;
        for (const dimension of DIMENSIONS) total.sums[dimension] += person.wellbeing[dimension];
        totals.set(country, total);
      }
      for (const [country, { count, sums }] of totals) {
        for (const dimension of DIMENSIONS) {
          world.stats[`wellbeing.${dimension}.${country}`] = sums[dimension] / count;
        }
      }
    },
  };
}
