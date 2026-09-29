import { describe, expect, it } from 'vitest';
import type { MapGrid } from '../gen/map';
import { fixtureContent } from '../sim/testing/content.fixture';
import { createWorld } from '../sim/world/world';
import { createCore, protagonist } from './core';

const content = fixtureContent();
const grid: MapGrid = {
  west: 60,
  north: 50,
  step: 1,
  width: 20,
  height: 20,
  codes: [''],
  cells: new Uint8Array(400),
};
const frameOf = (reply: ReturnType<ReturnType<typeof createCore>['handle']>) => {
  if (reply.type !== 'frame') throw new Error(reply.type);
  return reply.frame;
};

describe('worker core', () => {
  it('cold-opens on one person in micro time, in September 2013', () => {
    const core = createCore(content, grid, 1, 40);
    const frame = frameOf(core.handle({ type: 'tick', elapsedMs: 0 }));
    expect(frame.date).toEqual({ year: 2013, month: 9, day: 2 });
    expect(frame.state.mode).toBe('micro');
    expect(frame.mind.id).toBe(frame.state.person);
    expect(frame.state.country).toBe('AAA');
  });

  it('dates frames to the day within the week, not just its Monday', () => {
    const core = createCore(content, grid, 1, 40);
    // Micro time runs a sim day per real minute: 75 s is 30 hours, into Tuesday.
    const frame = frameOf(core.handle({ type: 'tick', elapsedMs: 75_000 }));
    expect(frame.hour).toBe(30);
    expect(frame.date).toEqual({ year: 2013, month: 9, day: 3 });
  });

  it('advances time with the clock and applies commands', () => {
    const core = createCore(content, grid, 1, 40);
    core.handle({ type: 'mode', mode: 'macro' });
    const frame = frameOf(core.handle({ type: 'tick', elapsedMs: 3000 }));
    expect(frame.week).toBe(3);
    expect(frameOf(core.handle({ type: 'overlay', overlay: 'income' })).state.overlay).toBe(
      'income',
    );
    expect(
      frameOf(core.handle({ type: 'world', world: 'shadow' })).map.people.length,
    ).toBeGreaterThan(0);
  });

  it('forwards nudges and reports unknown ones', () => {
    const core = createCore(content, grid, 1, 40);
    expect(core.handle({ type: 'nudge', turningPoint: 'missing', option: 'x' })).toEqual({
      type: 'error',
      message: 'nudge.unavailable',
    });
  });

  it('saves and restores the whole game', () => {
    const core = createCore(content, grid, 1, 40);
    core.handle({ type: 'mode', mode: 'macro' });
    core.handle({ type: 'tick', elapsedMs: 2000 });
    const saved = core.handle({ type: 'save' });
    if (saved.type !== 'saved') throw new Error('no save');
    const other = createCore(content, grid, 9, 40);
    const restored = frameOf(other.handle({ type: 'load', text: saved.text }));
    expect(restored.week).toBe(2);
    expect(restored.state.mode).toBe('macro');
    expect(other.handle({ type: 'load', text: '{"format":0}' })).toEqual({
      type: 'error',
      message: 'save.invalid',
    });
    expect(other.handle({ type: 'load', text: '{broken' })).toEqual({
      type: 'error',
      message: 'save.invalid',
    });
  });

  it('prefers a trucker near Khorgos for the cold open', () => {
    const world = createWorld(content, { seed: 1, bri: true, people: 40 });
    const trucker = world.people.find((p) => p.role !== 'child' && p.id > 5);
    if (!trucker) throw new Error('fixture');
    Object.assign(trucker, { region: 'KAZ-ALA', role: 'truck-driver' });
    expect(protagonist(world)).toBe(trucker.id);
  });

  it('accepts nudges on open turning points and uses the default sample size', () => {
    const core = createCore(content, grid, 1);
    expect(core.twins.bri.people.length).toBeGreaterThanOrEqual(2000);
    const person = core.twins.bri.people.find((p) => p.role !== 'child');
    if (!person) throw new Error('fixture');
    core.twins.bri.turningPoints.push({
      id: 'open',
      person: person.id,
      kind: 'emigrate',
      week: 0,
      options: ['leave', 'stay'],
      nudge: null,
      chosen: null,
      decidedWeek: null,
      reasons: [],
    });
    expect(core.handle({ type: 'nudge', turningPoint: 'open', option: 'stay' }).type).toBe('frame');
    expect(core.twins.shadow.pendingNudges).toHaveLength(1);
  });
});
