import { describe, expect, it } from 'vitest';
import type { Tab } from '../../app/state';
import type { Festival, Mode } from '../../content/types';
import type { Speed } from '../../sim/engine/clock';
import { OPTIONS, type TurningPointKind } from '../../sim/minds/decisions';
import { SOURCES } from '../../sim/minds/sources';
import { NATIONAL_TOPICS, REGIONAL_TOPICS } from '../../sim/minds/topics';
import { ROLE_GROUP } from '../../sim/people/roles';
import type { Activity } from '../../sim/people/routine';
import type { LifeEventKind, Role, RoleGroup, Wellbeing } from '../../sim/people/types';
import type { Overlay } from '../../vm/map';
import { en } from './index';
import ui from './ui.json';

/** Lists the members of a string union; the compiler checks the list is complete. */
const all = <K extends string>(members: Record<K, true>): K[] => Object.keys(members) as K[];

const ROLES = Object.keys(ROLE_GROUP) as Role[];
const GROUPS = [...new Set(Object.values(ROLE_GROUP))] satisfies RoleGroup[];
const TOPICS = [...REGIONAL_TOPICS, ...NATIONAL_TOPICS];
const KINDS = Object.keys(OPTIONS) as TurningPointKind[];
const DIMENSIONS = all<keyof Wellbeing>({
  income: true,
  health: true,
  security: true,
  freedom: true,
  belonging: true,
  outlook: true,
});
const LIFE_EVENTS = all<LifeEventKind>({
  married: true,
  'child-born': true,
  job: true,
  'job-lost': true,
  retired: true,
  moved: true,
  displaced: true,
  widowed: true,
  decided: true,
  died: true,
});
/** Life events the thought generator turns into thoughts (EVENT_WEIGHT in gen/thoughts). */
const THOUGHT_EVENTS: LifeEventKind[] = [
  'displaced',
  'widowed',
  'child-born',
  'job-lost',
  'job',
  'married',
  'moved',
  'retired',
];
/** BELIEF_THOUGHTS in gen/thoughts. */
const BELIEF_THOUGHTS = [
  'pollution.bad',
  'land.taken',
  'danger',
  'debt.worried',
  'jobs.appearing',
  'china.hopeful',
  'china.wary',
  'economy.bad',
  'sanctions',
];
/** Every reason key weigh() and decide() in sim/minds/decisions can give. */
const REASONS = [
  'needs-money',
  'trusts-projects',
  'ambitious',
  'fears-pollution',
  'cautious',
  'defers-to-authority',
  'rooted-here',
  'bold',
  'angry-about-harm',
  'distrusts-authority',
  'fears-repression',
  'no-future-here',
  'curious',
  'everyone-does-it',
  'flexible-morals',
  'honest',
  'fears-exposure',
  'free-press',
  'nudged',
  'refused-nudge',
  'died',
];
const ACTIVITIES = all<Activity>({
  sleeping: true,
  commuting: true,
  working: true,
  eating: true,
  praying: true,
  family: true,
  market: true,
  school: true,
  resting: true,
  celebrating: true,
});
const FESTIVALS = all<Festival>({
  'spring-festival': true,
  nowruz: true,
  ramadan: true,
  'eid-al-fitr': true,
  'eid-al-adha': true,
  'orthodox-easter': true,
  'orthodox-christmas': true,
  easter: true,
  christmas: true,
  'coptic-christmas': true,
  losar: true,
  ashura: true,
});
const OVERLAYS = all<Overlay>({
  none: true,
  income: true,
  pollution: true,
  unemployment: true,
  china: true,
  wellbeing: true,
  debt: true,
});
const SPEEDS = all<Speed>({ paused: true, micro: true, week: true, month: true, year: true });
const TABS = all<Tab>({ country: true, feed: true, person: true });
const TRANSPORT = all<Mode>({ rail: true, road: true, sea: true, pipeline: true });
const UI = [
  'title',
  'date',
  'save',
  'load',
  'export',
  'import',
  'country',
  'feed',
  'person',
  'beliefs',
  'believes',
  'truth',
  'wellbeing',
  'bri',
  'shadow',
  'household',
  'recent',
  'thoughts',
  'decision',
  'whisper',
  'age',
  'provenance.historical',
  'provenance.estimated',
  'provenance.simulated',
  'legend',
  'intro',
];

const keys = (prefix: string, ids: readonly string[], suffix = '') =>
  ids.map((id) => `${prefix}${id}${suffix}`);
const choices = (prefix: string) =>
  KINDS.flatMap((kind) => OPTIONS[kind].map((option) => `${prefix}${kind}.${option}`));
const FEED = [
  ...choices('feed.decided.'),
  ...keys('feed.', ['displaced', 'job', 'job-lost', 'moved']),
];

const GROUPS_OF_KEYS: Readonly<Record<string, readonly string[]>> = {
  people: [
    ...keys('role.', ROLES),
    ...keys('group.', GROUPS),
    ...keys('topic.', TOPICS, '.question'),
    ...keys('topic.', TOPICS, '.label'),
    ...keys('source.', SOURCES),
    ...keys('wellbeing.', DIMENSIONS),
    ...keys('life.', LIFE_EVENTS),
  ],
  decisions: [
    ...keys('decision.', KINDS, '.title'),
    ...choices('decision.'),
    ...keys('reason.', REASONS),
    ...FEED,
  ],
  thoughts: [
    ...keys('thought.', THOUGHT_EVENTS),
    ...keys('thought.decide.', KINDS),
    ...keys('thought.', BELIEF_THOUGHTS),
    ...keys('thought.ordinary.', ROLES),
  ],
  interface: [
    ...keys('metric.', [
      'gdp',
      'gdpPerPerson',
      'growth',
      'debtDistress',
      'chinaDebt',
      'sanctions',
      'stability',
    ]),
    ...keys('metric.wellbeing.', DIMENSIONS),
    ...keys('activity.', ACTIVITIES),
    ...keys('festival.', FESTIVALS),
    ...keys('overlay.', OVERLAYS),
    ...keys('speed.', SPEEDS),
    ...keys('tab.', TABS),
    ...keys('mode.', ['micro', 'macro', 'zoom-out', ...TRANSPORT]),
    ...keys('world.', ['bri', 'shadow']),
    ...keys('ui.', UI),
    'nudge.unavailable',
    'save.invalid',
  ],
};

const PLACEHOLDERS = new Set(['name', 'region', 'detail', 'age', 'date']);

describe('English UI catalog', () => {
  it.each(Object.entries(GROUPS_OF_KEYS))('writes every %s key', (_group, expected) => {
    expect(expected.filter((key) => !(key in en))).toEqual([]);
  });

  it('writes non-empty, trimmed text with only known placeholders', () => {
    const catalog: Record<string, string> = ui;
    const texts = Object.entries(catalog);
    expect(texts.length).toBeGreaterThanOrEqual(Object.values(GROUPS_OF_KEYS).flat().length);
    for (const [key, text] of texts) {
      expect(text.trim() === text && text !== '', key).toBe(true);
      const unknown = [...text.matchAll(/\{(\w+)\}/g)].filter(
        ([, name]) => !PLACEHOLDERS.has(name ?? ''),
      );
      expect(unknown, key).toEqual([]);
    }
  });

  it('names the person in every story line', () => {
    expect(FEED.filter((key) => !en[key]?.includes('{name}'))).toEqual([]);
  });
});
