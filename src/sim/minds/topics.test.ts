import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld } from '../world/world';
import { topicsFor, truths } from './topics';

const content = fixtureContent();

describe('topics', () => {
  it('lists regional and national topics for a person', () => {
    expect(topicsFor('AAA-ONE', 'AAA')).toEqual([
      'jobs:AAA-ONE',
      'pollution:AAA-ONE',
      'land:AAA-ONE',
      'danger:AAA-ONE',
      'china:AAA-ONE',
      'debt:AAA',
      'economy:AAA',
      'sanctions:AAA',
    ]);
  });

  it('reads the actual state of the world into 0–1 truths', () => {
    const world = createWorld(content, { seed: 1, bri: true, people: 12 });
    const one = world.regions['AAA-ONE'];
    const country = world.countries.AAA;
    if (!one || !country) throw new Error('fixture');
    Object.assign(one, { pollution: 80, security: 0.3, displaced: 10_000 });
    one.jobs.construction = 45_000;
    Object.assign(country, { debtDistress: 0.7, sanctions: 0.2 });
    world.stats['economy.gdpGrowth.AAA'] = 0.05;
    const truth = truths(world, content);
    expect(truth.get('pollution:AAA-ONE')).toBeCloseTo(0.8, 9);
    expect(truth.get('danger:AAA-ONE')).toBeCloseTo(0.7, 9);
    expect(truth.get('land:AAA-ONE')).toBeCloseTo(1, 9);
    expect(truth.get('jobs:AAA-ONE')).toBeCloseTo(1, 9);
    expect(truth.get('debt:AAA')).toBe(0.7);
    expect(truth.get('sanctions:AAA')).toBe(0.2);
    expect(truth.get('economy:AAA')).toBeCloseTo(1, 9);
    expect(truth.get('economy:BBB')).toBeCloseTo(0.5, 9);
    // Chinese projects help when they bring jobs, hurt when they take land or foul the air.
    expect(truth.get('china:AAA-ONE')).toBeGreaterThanOrEqual(0);
    expect(truth.get('china:AAA-REST')).toBeCloseTo(0.5, 9);
    for (const value of truth.values()) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
