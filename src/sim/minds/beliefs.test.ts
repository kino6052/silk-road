import { describe, expect, it } from 'vitest';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createBeliefsSystem } from './beliefs';

const content = fixtureContent();
const pipeline = createPipeline([createBeliefsSystem(content)]);

const months = (count: number, setup: (world: World) => void = () => undefined): World => {
  const world = createWorld(content, { seed: 3, bri: true, people: 150 });
  setup(world);
  for (let i = 0; i < count * 4; i++) stepWorld(world, pipeline);
  return world;
};

const adults = (world: World, region: string) =>
  world.people.filter((p) => p.region === region && p.role !== 'child' && p.deathWeek === null);

describe('beliefs system', () => {
  it('gives every living person over 12 beliefs on their topics within a month', () => {
    const world = months(1);
    const person = adults(world, 'AAA-ONE')[0];
    expect(Object.keys(person?.beliefs ?? {})).toContain('pollution:AAA-ONE');
    expect(Object.keys(person?.beliefs ?? {})).toContain('debt:AAA');
    for (const belief of Object.values(person?.beliefs ?? {})) {
      expect(belief.value).toBeGreaterThanOrEqual(0);
      expect(belief.value).toBeLessThanOrEqual(1);
      expect(belief.since).toBeLessThan(world.week);
    }
    expect(
      world.people
        .filter((p) => p.role === 'child')
        .every((p) => Object.keys(p.beliefs).length === 0),
    ).toBe(true);
  });

  it('pulls beliefs toward what people can see, over time', () => {
    const world = months(18, (w) => {
      const region = w.regions['AAA-ONE'];
      if (region) region.pollution = 95;
    });
    const beliefs = adults(world, 'AAA-ONE').map((p) => p.beliefs['pollution:AAA-ONE']?.value ?? 0);
    const mean = beliefs.reduce((a, b) => a + b, 0) / beliefs.length;
    expect(mean).toBeGreaterThan(0.6);
  });

  it('leaves people in unfree countries less aware of harm than the truth', () => {
    const world = months(18, (w) => {
      const region = w.regions['AAA-ONE'];
      if (region) region.displaced = 200_000;
    });
    const truth = 1;
    const values = adults(world, 'AAA-ONE').map((p) => p.beliefs['land:AAA-ONE']?.value ?? 0);
    expect(Math.min(...values)).toBeLessThan(truth);
    expect(Math.max(...values)).toBeGreaterThan(0.5);
  });

  it('is deterministic', () => {
    expect(months(2).people).toEqual(months(2).people);
  });
});
