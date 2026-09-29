import { describe, expect, it } from 'vitest';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createLifecycleSystem, LOG_LIMIT, record } from './lifecycle';
import type { Person } from './types';

const content = fixtureContent();
const pipeline = createPipeline([createLifecycleSystem(content)]);

const run = (weeks: number, setup: (world: World) => void = () => undefined): World => {
  const world = createWorld(content, { seed: 5, bri: true, people: 300 });
  setup(world);
  for (let i = 0; i < weeks; i++) stepWorld(world, pipeline);
  return world;
};

const tenYears = run(520);
const logged = (world: World, kind: string) =>
  world.people.flatMap((p) => p.log.filter((event) => event.kind === kind));

describe('lifecycle system', () => {
  it('ages the population with births, deaths and marriages over a decade', () => {
    expect(logged(tenYears, 'child-born').length).toBeGreaterThan(10);
    expect(logged(tenYears, 'died').length).toBeGreaterThan(5);
    expect(logged(tenYears, 'married').length).toBeGreaterThan(3);
    expect(tenYears.people.length).toBeGreaterThan(300);
    expect(tenYears.stats['people.alive']).toBe(
      tenYears.people.filter((p) => p.deathWeek === null).length,
    );
  });

  it('keeps households, spouses and newborns consistent', () => {
    for (const household of tenYears.households) {
      for (const id of household.members) {
        const member = tenYears.people[id];
        expect(member?.deathWeek).toBeNull();
        expect(member?.household).toBe(household.id);
      }
    }
    const newborns = tenYears.people.filter((p) => p.birthWeek >= 0);
    expect(newborns.length).toBeGreaterThan(10);
    for (const baby of newborns) {
      const mother = tenYears.people[baby.mother ?? -1];
      expect(mother?.sex).toBe('f');
      expect(baby.culture).toBe(mother?.culture);
    }
    for (const person of tenYears.people.filter((p) => p.deathWeek === null && p.spouse !== null)) {
      expect(tenYears.people[person.spouse ?? -1]?.spouse).toBe(person.id);
    }
  });

  it('moves people through school, work and retirement', () => {
    expect(logged(tenYears, 'retired').length).toBeGreaterThan(3);
    expect(logged(tenYears, 'job').length).toBeGreaterThan(5);
    const living = tenYears.people.filter((p) => p.deathWeek === null);
    for (const person of living) {
      const age = (tenYears.week - person.birthWeek) / 52;
      if (age < 6) expect(person.role).toBe('child');
    }
  });

  it('hires the unemployed into construction when a region is building', () => {
    const world = run(104, (w) => {
      const region = w.regions['AAA-ONE'];
      if (region) region.jobs.construction = 400_000;
      for (const person of w.people)
        if (person.region === 'AAA-ONE' && person.role === 'office-worker')
          person.role = 'unemployed';
    });
    expect(
      world.people.some((p) => p.region === 'AAA-ONE' && p.role === 'construction-worker'),
    ).toBe(true);
  });

  it('displaces land-holding households when a region loses land to a project', () => {
    const world = run(8, (w) => {
      const region = w.regions['AAA-REST'];
      if (region) region.displaced = 400_000;
    });
    expect(logged(world, 'displaced').length).toBeGreaterThan(0);
    const displaced = world.people.filter((p) => p.log.some((e) => e.kind === 'displaced'));
    for (const person of displaced) expect(world.households[person.household]?.landHa).toBe(0);
  });

  it('lets people migrate away from regions without work', () => {
    const world = run(260, (w) => {
      const region = w.regions['AAA-REST'];
      if (region) region.unemployment = 0.5;
      for (const person of w.people)
        if (person.region === 'AAA-REST' && person.role !== 'child') person.role = 'unemployed';
    });
    expect(logged(world, 'moved').length).toBeGreaterThan(0);
    expect(world.people.some((p) => p.birthRegion === 'AAA-REST' && p.region === 'AAA-ONE')).toBe(
      true,
    );
  });

  it('lays people off faster during a pandemic', () => {
    const pandemic = run(260, (w) => {
      w.effects.push({
        source: 'test',
        effect: { kind: 'pandemic', severity: 1, weeks: 999 },
        untilWeek: 1e9,
      });
    });
    expect(logged(pandemic, 'job-lost').length).toBeGreaterThan(
      logged(run(260), 'job-lost').length,
    );
  });

  it('keeps only the most recent life events', () => {
    const person = tenYears.people[0];
    if (!person) throw new Error('no people');
    const copy: Person = { ...person, log: [] };
    for (let week = 0; week < LOG_LIMIT + 3; week++) record(copy, week, 'moved', 'x');
    expect(copy.log).toHaveLength(LOG_LIMIT);
    expect(copy.log[0]?.week).toBe(3);
  });

  it('is deterministic', () => {
    expect(run(52).people).toEqual(run(52).people);
  });
});
