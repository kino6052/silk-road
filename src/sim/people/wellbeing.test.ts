import { describe, expect, it } from 'vitest';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createWellbeingSystem } from './wellbeing';

const content = fixtureContent();
const pipeline = createPipeline([createWellbeingSystem(content)]);

const month = (setup: (world: World) => void = () => undefined): World => {
  const world = createWorld(content, { seed: 9, bri: true, people: 120 });
  setup(world);
  for (let i = 0; i < 4; i++) stepWorld(world, pipeline);
  return world;
};

const mean = (world: World, pick: (p: World['people'][number]) => number, region?: string) => {
  const group = world.people.filter(
    (p) => p.deathWeek === null && (!region || p.region === region),
  );
  return group.reduce((sum, p) => sum + pick(p), 0) / group.length;
};

describe('wellbeing system', () => {
  const base = month();

  it('scores every living person on six dimensions in [0, 1] within a month', () => {
    for (const person of base.people) {
      for (const value of Object.values(person.wellbeing)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    expect(base.stats['wellbeing.income.AAA']).toBeGreaterThan(0);
  });

  it('rewards richer regions and punishes pollution and insecurity', () => {
    expect(mean(base, (p) => p.wellbeing.income, 'AAA-ONE')).toBeGreaterThan(
      mean(base, (p) => p.wellbeing.income, 'BBB-REST'),
    );
    const polluted = month((w) => {
      const region = w.regions['AAA-ONE'];
      if (region) Object.assign(region, { pollution: 150, security: 0.2 });
    });
    expect(mean(polluted, (p) => p.wellbeing.health, 'AAA-ONE')).toBeLessThan(
      mean(base, (p) => p.wellbeing.health, 'AAA-ONE'),
    );
    expect(mean(polluted, (p) => p.wellbeing.security, 'AAA-ONE')).toBeLessThan(
      mean(base, (p) => p.wellbeing.security, 'AAA-ONE'),
    );
  });

  it('lowers freedom with press restrictions and belonging after displacement', () => {
    const repressive = month((w) => {
      for (const person of w.people) {
        person.log.push({ week: 0, kind: 'displaced', detail: person.region });
      }
    });
    expect(mean(repressive, (p) => p.wellbeing.belonging)).toBeLessThan(
      mean(base, (p) => p.wellbeing.belonging),
    );
    expect(mean(repressive, (p) => p.wellbeing.freedom)).toBeLessThan(
      mean(base, (p) => p.wellbeing.freedom),
    );
  });

  it('raises outlook when incomes rise', () => {
    const rising = month((w) => {
      for (const person of w.people) person.income *= 3;
    });
    expect(mean(rising, (p) => p.wellbeing.outlook)).toBeGreaterThan(
      mean(base, (p) => p.wellbeing.outlook),
    );
  });
});
