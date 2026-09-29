import { describe, expect, it } from 'vitest';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createWellbeingSystem, type RepressionRule } from './wellbeing';

const content = fixtureContent();
const rules: RepressionRule[] = [
  { region: 'AAA-ONE', cultures: ['han'], fromWeek: 0, factor: 0.4 },
];
const pipeline = createPipeline([createWellbeingSystem(content)]);
const repressive = createPipeline([createWellbeingSystem(content, rules)]);

const month = (setup: (world: World) => void = () => undefined, systems = pipeline): World => {
  const world = createWorld(content, { seed: 9, bri: true, people: 120 });
  setup(world);
  for (let i = 0; i < 4; i++) stepWorld(world, systems);
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

  it('hurts health in disasters and freedom under targeted repression', () => {
    const flooded = month((w) => {
      w.effects.push({
        source: 'test',
        effect: { kind: 'disaster', region: 'AAA-ONE', hazard: 'flood', severity: 1 },
        untilWeek: 1e9,
      });
    });
    expect(mean(flooded, (p) => p.wellbeing.health, 'AAA-ONE')).toBeLessThan(
      mean(base, (p) => p.wellbeing.health, 'AAA-ONE'),
    );
    const watched = month(() => undefined, repressive);
    expect(mean(watched, (p) => p.wellbeing.freedom, 'AAA-ONE')).toBeLessThan(
      mean(base, (p) => p.wellbeing.freedom, 'AAA-ONE'),
    );
  });

  it('lowers belonging away from home and ignores the dead', () => {
    const uprooted = month((w) => {
      for (const person of w.people) {
        person.region = 'AAA-TWO';
        person.log.push({ week: 0, kind: 'moved', detail: 'AAA-TWO' });
      }
      const first = w.people[0];
      if (first) first.deathWeek = 0;
    });
    expect(mean(uprooted, (p) => p.wellbeing.belonging)).toBeLessThan(
      mean(base, (p) => p.wellbeing.belonging),
    );
    expect(uprooted.people[0]?.wellbeing).toEqual(
      base.people[0] && { ...uprooted.people[0]?.wellbeing },
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
