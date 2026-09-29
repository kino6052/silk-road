import { weekToDate, daysFromCivil, civilFromDays } from '../core/calendar';
import { required } from '../core/required';
import type { Content } from '../content/types';
import { sceneOf, type Scene } from '../gen/scene';
import { spriteOf, type Sprite } from '../gen/sprite';
import { thoughtsOf, type Thought } from '../gen/thoughts';
import type { Twins } from '../sim/engine/engine';
import { topicKind, truthOf, truths } from '../sim/minds/topics';
import { activityAt, festivalOn } from '../sim/people/routine';
import type { Person, Wellbeing } from '../sim/people/types';
import type { World } from '../sim/world/world';

export interface Row {
  /** i18n key of the measure. */
  readonly key: string;
  readonly bri: number;
  readonly shadow: number;
  readonly unit: 'bn' | 'intl$' | 'share' | 'index';
}

export interface CountryVm {
  readonly id: string;
  readonly rows: readonly Row[];
}

export interface FeedItem {
  readonly week: number;
  readonly person: number;
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly tone: 'up' | 'down' | 'neutral';
}

export interface BeliefVm {
  readonly topic: string;
  readonly kind: string;
  readonly believed: number;
  readonly truth: number;
  readonly source: string;
  readonly confidence: number;
}

export interface MindVm {
  readonly id: number;
  readonly name: string;
  readonly age: number;
  readonly role: string;
  readonly culture: string;
  readonly region: string;
  readonly country: string;
  readonly alive: boolean;
  readonly wellbeing: readonly {
    readonly dimension: string;
    readonly bri: number;
    readonly shadow: number | null;
  }[];
  readonly beliefs: readonly BeliefVm[];
  readonly thoughts: readonly Thought[];
  readonly decision: {
    readonly id: string;
    readonly kind: string;
    readonly options: readonly string[];
    readonly nudge: string | null;
  } | null;
  readonly recent: readonly {
    readonly week: number;
    readonly kind: string;
    readonly detail: string;
  }[];
  readonly household: readonly { readonly id: number; readonly name: string }[];
  readonly activity: string;
  readonly festival: string | null;
  readonly sprite: Sprite;
  readonly scene: Scene;
}

const DIMENSIONS: readonly (keyof Wellbeing)[] = [
  'income',
  'health',
  'security',
  'freedom',
  'belonging',
  'outlook',
];

/** A person's name in their culture's order. */
export function nameOf(
  content: Content,
  person: { readonly given: string; readonly family: string; readonly culture: string },
): string {
  const culture = content.cultures.find((c) => c.id === person.culture);
  return culture?.nameOrder === 'family-first'
    ? `${person.family} ${person.given}`
    : `${person.given} ${person.family}`;
}

/** One country, measure by measure, in the BRI world and the shadow world. */
export function countryVm(twins: Twins, _content: Content, country: string): CountryVm {
  const measure = (world: World, pick: (world: World) => number | undefined) => pick(world) ?? 0;
  const row = (
    key: string,
    unit: Row['unit'],
    pick: (world: World) => number | undefined,
  ): Row => ({
    key,
    unit,
    bri: measure(twins.bri, pick),
    shadow: measure(twins.shadow, pick),
  });
  const state = (world: World) => world.countries[country];
  return {
    id: country,
    rows: [
      row('metric.gdp', 'bn', (w) => (state(w)?.gdp ?? 0) / 1e9),
      row('metric.gdpPerPerson', 'intl$', (w) => {
        const s = state(w);
        return s && s.population > 0 ? s.gdp / s.population : 0;
      }),
      row('metric.growth', 'share', (w) => w.stats[`economy.gdpGrowth.${country}`]),
      row('metric.debtDistress', 'index', (w) => state(w)?.debtDistress),
      row('metric.chinaDebt', 'bn', (w) => state(w)?.chinaDebt),
      row('metric.sanctions', 'index', (w) => state(w)?.sanctions),
      row('metric.stability', 'index', (w) => state(w)?.stability),
      ...DIMENSIONS.map((dimension) =>
        row(
          `metric.wellbeing.${dimension}`,
          'index',
          (w) => w.stats[`wellbeing.${dimension}.${country}`],
        ),
      ),
    ],
  };
}

const EVENT_TONE: Readonly<Record<string, FeedItem['tone']>> = {
  displaced: 'down',
  'job-lost': 'down',
  job: 'up',
  moved: 'neutral',
};

const DECISION_TONE: Readonly<Record<string, FeedItem['tone']>> = {
  'job-offer:accept': 'up',
  'relocation:resist': 'down',
  'bribe:accept': 'down',
  'protest:join': 'down',
};

/** Recent stories from people's lives, newest first, mixing good and bad news. */
export function feedVm(world: World, content: Content, limit: number): FeedItem[] {
  const items: FeedItem[] = [];
  const paramsOf = (person: Person, detail: string) => ({
    name: nameOf(content, person),
    region: person.region,
    detail,
  });
  for (const tp of world.turningPoints) {
    if (tp.chosen === null) continue;
    const person = required(world.people[tp.person], 'person');
    items.push({
      week: tp.week,
      person: tp.person,
      key: `feed.decided.${tp.kind}.${tp.chosen}`,
      params: paramsOf(person, tp.chosen),
      tone: DECISION_TONE[`${tp.kind}:${tp.chosen}`] ?? 'neutral',
    });
  }
  for (const person of world.people) {
    for (const event of person.log) {
      const tone = EVENT_TONE[event.kind];
      if (!tone) continue;
      items.push({
        week: event.week,
        person: person.id,
        key: `feed.${event.kind}`,
        params: paramsOf(person, event.detail),
        tone,
      });
    }
  }
  const newest = (tone: FeedItem['tone']) =>
    items.filter((item) => item.tone === tone).sort((a, b) => b.week - a.week);
  const queues = [newest('down'), newest('up'), newest('neutral')];
  const picked: FeedItem[] = [];
  while (picked.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < limit) picked.push(next);
    }
  }
  return picked.sort((a, b) => b.week - a.week);
}

/** Everything the mind view shows about one person this hour. */
export function mindVm(twins: Twins, content: Content, id: number, hourOfWeek: number): MindVm {
  const world = twins.bri;
  const person = required(world.people[id], `person ${String(id)}`);
  const twin = twins.shadow.people[id];
  const region = required(
    content.regions.find((r) => r.id === person.region),
    'region',
  );
  const culture = required(
    content.cultures.find((c) => c.id === person.culture),
    'culture',
  );
  const regionState = required(world.regions[person.region], 'region state');
  const truth = truths(world, content);
  const day = daysFromCivil(weekToDate(world.week)) + Math.floor(hourOfWeek / 24);
  const festival = festivalOn(civilFromDays(day), culture.festivals);
  const prays = culture.religion === 'sunni' || culture.religion === 'shia';
  const age = Math.floor((world.week - person.birthWeek) / 52);
  const open = world.turningPoints.find((tp) => tp.person === id && tp.chosen === null);
  return {
    id,
    name: nameOf(content, person),
    age,
    role: person.role,
    culture: person.culture,
    region: person.region,
    country: region.country,
    alive: person.deathWeek === null,
    wellbeing: DIMENSIONS.map((dimension) => ({
      dimension,
      bri: person.wellbeing[dimension],
      shadow: twin && twin.deathWeek === null ? twin.wellbeing[dimension] : null,
    })),
    beliefs: Object.entries(person.beliefs)
      .map(([topic, belief]) => ({
        topic,
        kind: topicKind(topic),
        believed: belief.value,
        truth: truthOf(truth, topic),
        source: belief.source,
        confidence: belief.confidence,
      }))
      .sort((a, b) => Math.abs(b.believed - b.truth) - Math.abs(a.believed - a.truth)),
    thoughts: thoughtsOf(person, world, content),
    decision: open
      ? { id: open.id, kind: open.kind, options: open.options, nudge: open.nudge }
      : null,
    recent: [...person.log].reverse().slice(0, 6),
    household: required(world.households[person.household], 'household').members.map((member) => ({
      id: member,
      name: nameOf(content, required(world.people[member], 'person')),
    })),
    activity: activityAt(person.role, hourOfWeek, prays, festival),
    festival,
    sprite: spriteOf(person, age, culture.religion),
    scene: sceneOf({
      climate: region.climate,
      urban: region.urban,
      pollution: regionState.pollution,
      hour: hourOfWeek % 24,
      role: person.role,
      seed: person.household,
    }),
  };
}
