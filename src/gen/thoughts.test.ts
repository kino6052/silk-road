import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../sim/testing/content.fixture';
import { createWorld } from '../sim/world/world';
import { thoughtsOf } from './thoughts';

const content = fixtureContent();

describe('thoughts', () => {
  const world = createWorld(content, { seed: 3, bri: true, people: 40 });
  const person = world.people.find((p) => p.role !== 'child' && p.role !== 'student');
  if (!person) throw new Error('fixture');

  it('voices at most three things on their mind, starting with the most pressing', () => {
    person.beliefs['pollution:' + person.region] = {
      value: 0.9,
      confidence: 0.8,
      source: 'own-eyes',
      since: 0,
    };
    person.log.push({ week: 0, kind: 'displaced', detail: person.region });
    const thoughts = thoughtsOf(person, world, content);
    expect(thoughts.length).toBeLessThanOrEqual(3);
    expect(thoughts[0]?.key).toBe('thought.displaced');
    expect(thoughts.map((t) => t.key)).toContain('thought.pollution.bad');
  });

  it('wonders about an open decision, and has a quiet thought when nothing stands out', () => {
    world.turningPoints.push({
      id: 'x',
      person: person.id,
      kind: 'job-offer',
      week: 0,
      options: ['accept', 'decline'],
      nudge: null,
      chosen: null,
      decidedWeek: null,
      reasons: [],
    });
    expect(thoughtsOf(person, world, content)[0]).toEqual({
      key: 'thought.decide.job-offer',
      params: {},
    });
    const calm = { ...person, log: [], beliefs: {}, id: person.id + 1000 };
    expect(thoughtsOf(calm, world, content).map((t) => t.key)).toEqual([
      'thought.ordinary.' + calm.role,
    ]);
  });

  it('reacts to the economy, debt, jobs and life events', () => {
    const busy = {
      ...person,
      id: person.id + 2000,
      log: [
        { week: 0, kind: 'job' as const, detail: 'construction-worker' },
        { week: 1, kind: 'child-born' as const, detail: '5' },
      ],
      beliefs: {
        ['debt:' + (world.regions[person.region]?.country ?? '')]: {
          value: 0.9,
          confidence: 0.9,
          source: 'social-media' as const,
          since: 0,
        },
        ['jobs:' + person.region]: {
          value: 0.8,
          confidence: 0.9,
          source: 'word-of-mouth' as const,
          since: 0,
        },
      },
    };
    const keys = thoughtsOf(busy, world, content).map((t) => t.key);
    expect(keys).toEqual(['thought.child-born', 'thought.job', 'thought.debt.worried']);
    const jobs = { value: 0.8, confidence: 0.9, source: 'word-of-mouth' as const, since: 0 };
    const hopeful = { ...busy, log: [], beliefs: { ['jobs:' + person.region]: jobs } };
    expect(thoughtsOf(hopeful, world, content)[0]?.key).toBe('thought.jobs.appearing');
  });

  it('has a thought for each strong belief, and ignores weak beliefs and old or minor events', () => {
    const country = world.regions[person.region]?.country ?? '';
    const single = (topic: string, value: number) =>
      thoughtsOf(
        {
          ...person,
          id: -1,
          log: [],
          beliefs: { [topic]: { value, confidence: 1, source: 'own-eyes', since: 0 } },
        },
        world,
        content,
      )[0]?.key;
    expect(single('land:' + person.region, 0.9)).toBe('thought.land.taken');
    expect(single('danger:' + person.region, 0.9)).toBe('thought.danger');
    expect(single('china:' + person.region, 0.9)).toBe('thought.china.hopeful');
    expect(single('china:' + person.region, 0.1)).toBe('thought.china.wary');
    expect(single('economy:' + country, 0.1)).toBe('thought.economy.bad');
    expect(single('sanctions:' + country, 0.9)).toBe('thought.sanctions');
    expect(single('pollution:' + person.region, 0.5)).toBe('thought.ordinary.' + person.role);
    const quiet = {
      ...person,
      id: -1,
      region: 'NOWHERE',
      beliefs: {},
      log: [
        { week: -500, kind: 'married' as const, detail: '1' },
        { week: 0, kind: 'decided' as const, detail: 'x' },
      ],
    };
    expect(thoughtsOf(quiet, world, content)[0]?.key).toBe('thought.ordinary.' + person.role);
  });
});
