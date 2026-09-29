import { describe, expect, it } from 'vitest';
import { dateToWeek } from '../../core/calendar';
import type { EventEffect, HistoricalEvent } from '../../content/types';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createTimelineSystem } from './timeline';

const event = (id: string, week: number, effects: EventEffect[], bri = false): HistoricalEvent => {
  const monday = { year: 2013, month: 9, day: 2 + 7 * week };
  return {
    id,
    date: monday,
    bri,
    actors: ['AAA'],
    effects,
    provenance: 'historical',
    source: 'test',
  };
};

const content = {
  ...fixtureContent(),
  events: [
    event('speech', 0, [{ kind: 'announcement', topic: 'belt' }], true),
    event('sanction', 0, [{ kind: 'sanctions', target: 'BBB', by: ['ZZZ'], severity: 0.6 }]),
    event('shock', 1, [{ kind: 'trade-shock', scope: 'world', factor: 0.8, weeks: 2 }]),
    event('war', 1, [{ kind: 'conflict', country: 'AAA', severity: 0.5, weeks: 4 }]),
    event('ease', 2, [{ kind: 'sanctions-eased', target: 'BBB', by: ['ZZZ'] }]),
    event('blocs', 2, [
      { kind: 'bloc-join', country: 'BBB', bloc: 'SCO' },
      { kind: 'bloc-leave', country: 'AAA', bloc: 'SCO' },
    ]),
    event('imf', 2, [
      { kind: 'imf-program', country: 'BBB', amountBn: 3 },
      { kind: 'debt-distress', country: 'BBB', severity: 0.7 },
      { kind: 'policy', actor: 'ZZZ', policy: 'pgii' },
      { kind: 'policy', actor: 'aiib-board', policy: 'aiib' },
    ]),
    event('flood', 2, [
      { kind: 'disaster', region: 'BBB-REST', hazard: 'flood', severity: 0.5 },
      { kind: 'security-attack', region: 'AAA-ONE', target: 'chinese-workers', severity: 0.4 },
      { kind: 'route-disruption', node: 'b', factor: 0, weeks: 3 },
      { kind: 'pandemic', severity: 0.9, weeks: 10 },
      { kind: 'tariff', by: 'ZZZ', on: 'AAA', rate: 0.25 },
      { kind: 'bri-membership', country: 'BBB', joined: true },
    ]),
  ],
};
const pipeline = createPipeline([createTimelineSystem(content)]);

const run = (weeks: number, bri = true): World => {
  const world = createWorld(content, { seed: 1, bri, people: 12 });
  for (let i = 0; i < weeks; i++) stepWorld(world, pipeline);
  return world;
};

describe('timeline system', () => {
  it('fires each event once, in its week, skipping BRI events in the shadow world', () => {
    expect(run(1).firedEvents).toEqual(['speech', 'sanction']);
    expect(run(1, false).firedEvents).toEqual(['sanction']);
    expect(run(5).firedEvents).toHaveLength(content.events.length);
    expect(run(1).stats['timeline.fired']).toBe(2);
  });

  it('applies sanctions, easing, blocs, IMF programmes, distress and policies', () => {
    expect(run(1).countries.BBB?.sanctions).toBe(0.6);
    const world = run(3);
    expect(world.countries.BBB?.sanctions).toBe(0.3);
    expect(world.countries.BBB?.blocs).toEqual(['SCO']);
    expect(world.countries.AAA?.blocs).toEqual([]);
    expect(world.countries.BBB).toMatchObject({
      imfProgram: true,
      externalDebt: 13,
      debtDistress: 0.7,
    });
    expect(world.countries.ZZZ?.policies).toEqual(['pgii']);
    expect(world.stats['timeline.policy.aiib']).toBe(1);
    expect(world.stats['timeline.briMember.BBB']).toBe(1);
  });

  it('keeps time-limited effects active until they expire', () => {
    const kinds = (world: World) => world.effects.map((active) => active.effect.kind);
    expect(kinds(run(2))).toEqual(['trade-shock', 'conflict']);
    expect(kinds(run(3))).toEqual([
      'trade-shock',
      'conflict',
      'disaster',
      'security-attack',
      'route-disruption',
      'pandemic',
      'tariff',
    ]);
    expect(kinds(run(9))).toEqual(['disaster', 'security-attack', 'pandemic', 'tariff']);
    expect(kinds(run(21))).toEqual(['security-attack', 'tariff']);
  });

  it('lowers stability in conflict and lets it recover afterwards', () => {
    expect(run(2).countries.AAA?.stability).toBe(0.5);
    const recovering = run(20).countries.AAA?.stability ?? 0;
    expect(recovering).toBeGreaterThan(0.5);
    expect(recovering).toBeLessThan(1);
    expect(run(400).countries.AAA?.stability).toBe(1);
  });
});
