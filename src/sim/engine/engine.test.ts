import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld as createFromContent, stateHash, type World } from '../world/world';
import { createPipeline, createTwins, stepTwins, stepWorld, type System } from './engine';

const content = fixtureContent();
const createWorld = (options: { seed: number; bri: boolean }): World =>
  createFromContent(content, { ...options, people: 12 });

const recorder = (id: string, log: string[]): System => ({
  id,
  step: (world, ctx) => log.push(`${id}@${String(ctx.week)}:${String(world.week)}`),
});

/** Test system that keeps its draws outside the world. */
const sampler = (id: string, draws: number[]): System => ({
  id,
  step: (_world, ctx) => draws.push(ctx.rng(0).next(), ctx.rng(1, 'other').next()),
});

describe('pipeline', () => {
  it('rejects duplicate system ids', () => {
    expect(() => createPipeline([recorder('a', []), recorder('a', [])])).toThrow(/duplicate/);
  });

  it('runs systems in order, then advances the week', () => {
    const log: string[] = [];
    const world = createWorld({ seed: 1, bri: true });
    const pipeline = createPipeline([recorder('first', log), recorder('second', log)]);
    stepWorld(world, pipeline);
    stepWorld(world, pipeline);
    expect(log).toEqual(['first@0:0', 'second@0:0', 'first@1:1', 'second@1:1']);
    expect(world.week).toBe(2);
  });

  it('gives systems the calendar date of the current week', () => {
    const dates: string[] = [];
    const world = createWorld({ seed: 1, bri: true });
    world.week = 17;
    stepWorld(world, [{ id: 'clock', step: (_w, ctx) => dates.push(JSON.stringify(ctx.date)) }]);
    expect(dates).toEqual(['{"year":2013,"month":12,"day":30}']);
  });

  it('gives each system its own reproducible random streams', () => {
    const run = (seed: number, id: string) => {
      const draws: number[] = [];
      const world = createWorld({ seed, bri: true });
      const pipeline = createPipeline([sampler(id, draws)]);
      for (let i = 0; i < 3; i++) stepWorld(world, pipeline);
      return draws;
    };
    expect(run(5, 'trade')).toEqual(run(5, 'trade'));
    expect(run(5, 'trade')).not.toEqual(run(5, 'finance'));
    expect(run(5, 'trade')).not.toEqual(run(6, 'trade'));
    expect(new Set(run(5, 'trade')).size).toBe(6);
  });
});

describe('twins', () => {
  it('pairs a BRI world with a shadow world on the same seed', () => {
    const twins = createTwins(9, createWorld);
    expect([twins.bri.seed, twins.bri.bri, twins.bri.week]).toEqual([9, true, 0]);
    expect([twins.shadow.seed, twins.shadow.bri, twins.shadow.week]).toEqual([9, false, 0]);
  });

  it('builds both worlds with a custom factory', () => {
    const seen: boolean[] = [];
    const factory = (options: { seed: number; bri: boolean }): World => {
      seen.push(options.bri);
      return createWorld(options);
    };
    createTwins(9, factory);
    expect(seen).toEqual([true, false]);
  });

  it('steps both worlds in lockstep with aligned random draws', () => {
    const briDraws: number[] = [];
    const shadowDraws: number[] = [];
    const twins = createTwins(4, createWorld);
    const system: System = {
      id: 'noise',
      step: (world, ctx) => (world.bri ? briDraws : shadowDraws).push(ctx.rng(3).next()),
    };
    for (let i = 0; i < 5; i++) stepTwins(twins, [system]);
    expect(twins.bri.week).toBe(5);
    expect(twins.shadow.week).toBe(5);
    expect(shadowDraws).toEqual(briDraws);
    expect(stateHash(twins.bri)).not.toBe(stateHash(twins.shadow));
  });
});
