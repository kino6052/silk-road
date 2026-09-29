import type { Content } from '../content/types';
import { believed, topicId, type TopicKind } from '../sim/minds/topics';
import type { LifeEventKind, Person } from '../sim/people/types';
import type { World } from '../sim/world/world';

export interface Thought {
  /** i18n key, e.g. 'thought.pollution.bad'. */
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

const RECENT_WEEKS = 26;
const MAX_THOUGHTS = 3;

/** How much each recent life event weighs on the mind. */
const EVENT_WEIGHT: Partial<Record<LifeEventKind, number>> = {
  displaced: 90,
  widowed: 85,
  'child-born': 80,
  'job-lost': 75,
  job: 70,
  married: 65,
  moved: 60,
  retired: 50,
};

/** Beliefs strong enough to think about: topic, test and key. */
const BELIEF_THOUGHTS: readonly (readonly [TopicKind, (value: number) => boolean, string])[] = [
  ['pollution', (v) => v > 0.7, 'thought.pollution.bad'],
  ['land', (v) => v > 0.6, 'thought.land.taken'],
  ['danger', (v) => v > 0.6, 'thought.danger'],
  ['debt', (v) => v > 0.7, 'thought.debt.worried'],
  ['jobs', (v) => v > 0.6, 'thought.jobs.appearing'],
  ['china', (v) => v > 0.7, 'thought.china.hopeful'],
  ['china', (v) => v < 0.3, 'thought.china.wary'],
  ['economy', (v) => v < 0.3, 'thought.economy.bad'],
  ['sanctions', (v) => v > 0.5, 'thought.sanctions'],
];

const NATIONAL: ReadonlySet<TopicKind> = new Set(['debt', 'economy', 'sanctions']);

/** What is on a person's mind right now, most pressing first (i18n keys). */
export function thoughtsOf(person: Person, world: World, _content: Content): Thought[] {
  const candidates: { weight: number; thought: Thought }[] = [];
  const open = world.turningPoints.find((tp) => tp.person === person.id && tp.chosen === null);
  if (open)
    candidates.push({ weight: 100, thought: { key: `thought.decide.${open.kind}`, params: {} } });
  for (const event of person.log) {
    const weight = EVENT_WEIGHT[event.kind];
    if (weight === undefined || world.week - event.week >= RECENT_WEEKS) continue;
    candidates.push({
      weight,
      thought: { key: `thought.${event.kind}`, params: { detail: event.detail } },
    });
  }
  const country = world.regions[person.region]?.country ?? '';
  for (const [kind, test, key] of BELIEF_THOUGHTS) {
    const topic = topicId(kind, NATIONAL.has(kind) ? country : person.region);
    if (!(topic in person.beliefs)) continue;
    const value = believed(person.beliefs, topic);
    if (test(value)) candidates.push({ weight: 40 + value * 10, thought: { key, params: {} } });
  }
  if (candidates.length === 0) return [{ key: `thought.ordinary.${person.role}`, params: {} }];
  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_THOUGHTS)
    .map(({ thought }) => thought);
}
