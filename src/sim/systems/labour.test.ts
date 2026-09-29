import { describe, expect, it } from 'vitest';
import type { Project } from '../../content/types';
import {
  addEffect,
  must,
  project,
  regionOf,
  run,
  setStatus,
  societyContent,
} from '../testing/society.fixture';
import { createWorld } from '../world/world';
import {
  createLabourSystem,
  DISASTER_DISPLACED_SHARE,
  LOGISTICS_JOBS_PER_WEEKLY_TEU,
  MAX_MIGRATION_RATE,
  MAX_UNEMPLOYMENT,
  MIN_UNEMPLOYMENT,
  projectWorkforce,
} from './labour';

const setup = (projects: readonly Project[] = []) => {
  const content = societyContent(projects);
  return {
    world: createWorld(content, { seed: 1, bri: true, people: 0 }),
    systems: [createLabourSystem(content)],
  };
};

const builders = (construction: number, localShare = 1) => ({
  jobs: { construction, operation: 0, localShare },
});

describe('projectWorkforce', () => {
  it('splits workers into local and foreign by phase, with operators in the kind’s sector', () => {
    const port = project('p', 'AAA-ONE', {
      kind: 'port',
      jobs: { construction: 1000, operation: 100, localShare: 0.75 },
    });
    expect(projectWorkforce(port, 'construction')).toEqual({
      sector: 'construction',
      local: 750,
      foreign: 250,
    });
    expect(projectWorkforce(port, 'operating')).toEqual({
      sector: 'logistics',
      local: 75,
      foreign: 25,
    });
    expect(projectWorkforce(port, 'stalled')).toMatchObject({ local: 0, foreign: 0 });
  });
});

describe('labour system', () => {
  it('employs local builders in the host region and publishes foreign workers', () => {
    const { world, systems } = setup([project('dam', 'AAA-ONE', builders(8000, 0.75))]);
    setStatus(world, 'construction', 'dam');
    run(world, systems, 1);
    expect(regionOf(world, 'AAA-ONE').jobs.construction).toBe(6000);
    expect(world.stats['labour.foreignWorkers.AAA-ONE']).toBe(2000);
    expect(regionOf(world, 'AAA-REST').jobs.construction).toBe(0);
    expect(world.stats['labour.foreignWorkers.AAA-REST']).toBe(0);
  });

  it('adds operating jobs to logistics, industry or services by kind, plus trade logistics', () => {
    const operators = { jobs: { construction: 0, operation: 1000, localShare: 1 } };
    const projects = [
      project('port', 'AAA-ONE', { kind: 'port', ...operators }),
      project('coal', 'AAA-ONE', { kind: 'power-coal', ...operators }),
      project('metro', 'AAA-ONE', { kind: 'metro', ...operators }),
      project('zone', 'AAA-ONE', { kind: 'industrial-zone', ...operators }),
    ];
    const { world, systems } = setup(projects);
    const control = setup(projects).world;
    setStatus(world, 'operating', 'port', 'coal', 'metro');
    setStatus(world, 'planned', 'zone');
    regionOf(world, 'AAA-ONE').throughput = 5000;
    regionOf(control, 'AAA-ONE').throughput = 5000;
    run(world, systems, 1);
    run(control, systems, 1);
    const jobs = regionOf(world, 'AAA-ONE').jobs;
    const base = regionOf(control, 'AAA-ONE').jobs;
    expect(base.logistics).toBe(5000 * LOGISTICS_JOBS_PER_WEEKLY_TEU);
    expect(jobs.logistics).toBe(5000 * LOGISTICS_JOBS_PER_WEEKLY_TEU + 1000);
    expect(jobs.industry - base.industry).toBeCloseTo(1000, 6);
    expect(jobs.services - base.services).toBeCloseTo(1000, 6);
    expect(jobs.agriculture).toBe(base.agriculture);
  });

  it('lowers unemployment and raises wages as projects hire, within 1%–60%', () => {
    const { world, systems } = setup([project('mega', 'AAA-ONE', builders(900_000))]);
    setStatus(world, 'construction', 'mega');
    regionOf(world, 'BBB-REST').population *= 10;
    run(world, systems, 1);
    // National GDP per person is 10,000; AAA-ONE's income index is 2, AAA-REST's is 1.
    expect(regionOf(world, 'AAA-REST').unemployment).toBeCloseTo(0.06, 3);
    expect(regionOf(world, 'AAA-REST').income).toBeCloseTo(10_000, -2);
    expect(regionOf(world, 'AAA-ONE').unemployment).toBe(MIN_UNEMPLOYMENT);
    expect(regionOf(world, 'AAA-ONE').income).toBeGreaterThan(23_000);
    expect(regionOf(world, 'BBB-REST').unemployment).toBe(MAX_UNEMPLOYMENT);
  });

  it('grows jobs with the population, and with GDP growth above or below trend', () => {
    const after = (change: (country: { population: number; gdp: number }) => void) => {
      const { world, systems } = setup();
      run(world, systems, 1);
      change(must(world.countries.BBB));
      run(world, systems, 1);
      return regionOf(world, 'BBB-REST');
    };
    const steady = after(() => undefined);
    const grown = after((country) => {
      country.population *= 1.01;
    });
    expect(grown.population).toBeCloseTo(2e6 * 1.01, 3);
    expect(grown.jobs.services / steady.jobs.services).toBeCloseTo(1.01, 6);
    const boom = after((country) => {
      country.gdp *= 1.05;
    });
    const slump = after((country) => {
      country.gdp *= 0.9;
    });
    expect(boom.unemployment).toBeLessThan(steady.unemployment - 0.02);
    expect(slump.unemployment).toBeGreaterThan(steady.unemployment + 0.04);
    expect(boom.income).toBeGreaterThan(steady.income * 1.05);
  });

  it('moves people monthly toward better regions of the same country, keeping the total', () => {
    const { world, systems } = setup();
    run(world, systems, 1);
    const one = must(world.stats['labour.migration.AAA-ONE']);
    const rest = must(world.stats['labour.migration.AAA-REST']);
    const two = must(world.stats['labour.migration.AAA-TWO']);
    // AAA-ONE earns the most; after living costs its pull is modest. Totals are conserved.
    expect(one).toBeCloseTo(-(rest + two), 6);
    expect(-rest / 2e6).toBeGreaterThan(0.0003);
    expect(-rest / 2e6).toBeLessThan(MAX_MIGRATION_RATE);
    expect(
      regionOf(world, 'AAA-ONE').population +
        regionOf(world, 'AAA-REST').population +
        regionOf(world, 'AAA-TWO').population,
    ).toBeCloseTo(4.5e6, 3);
    expect(world.stats['labour.migration.BBB-REST']).toBeCloseTo(0, 6);
    const settled = regionOf(world, 'AAA-ONE').population;
    run(world, systems, 3);
    expect(regionOf(world, 'AAA-ONE').population).toBe(settled);
    run(world, systems, 1);
    expect(regionOf(world, 'AAA-ONE').population).toBeGreaterThan(settled);
  });

  it('caps the outflow at 0.2% a month when the gap is large', () => {
    const { world, systems } = setup();
    addEffect(world, 'flood', {
      kind: 'disaster',
      region: 'AAA-REST',
      hazard: 'flood',
      severity: 1,
    });
    run(world, systems, 1);
    expect(world.stats['labour.migration.AAA-REST']).toBeCloseTo(-MAX_MIGRATION_RATE * 2e6, 3);
  });

  it('cuts jobs and income after a disaster, displaces people once, then recovers', () => {
    const { world, systems } = setup();
    const control = setup().world;
    addEffect(world, 'quake', {
      kind: 'disaster',
      region: 'AAA-REST',
      hazard: 'earthquake',
      severity: 0.5,
    });
    addEffect(world, 'flu', { kind: 'pandemic', severity: 0.1, weeks: 4 });
    run(world, systems, 1);
    run(control, systems, 1);
    const hit = regionOf(world, 'AAA-REST');
    const calm = regionOf(control, 'AAA-REST');
    expect(hit.displaced).toBeCloseTo(2e6 * DISASTER_DISPLACED_SHARE * 0.5, 6);
    expect(hit.unemployment).toBeGreaterThan(calm.unemployment + 0.05);
    expect(hit.income).toBeLessThan(calm.income * 0.95);
    expect(regionOf(world, 'AAA-ONE').displaced).toBe(0);
    const displaced = hit.displaced;
    run(world, systems, 60);
    run(control, systems, 60);
    expect(hit.displaced).toBe(displaced);
    expect(Math.abs(hit.unemployment - calm.unemployment)).toBeLessThan(0.015);
  });

  it('skips countries and regions missing from the world', () => {
    const { world, systems } = setup([project('x', 'BBB-REST', builders(100))]);
    delete world.countries.AAA;
    delete world.regions['BBB-REST'];
    const before = structuredClone(regionOf(world, 'AAA-ONE'));
    run(world, systems, 1);
    expect(regionOf(world, 'AAA-ONE')).toEqual(before);
    expect(world.stats['labour.foreignWorkers.CHN-EAST']).toBe(0);
  });
});
