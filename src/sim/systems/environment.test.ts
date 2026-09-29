import { describe, expect, it } from 'vitest';
import { dateToWeek } from '../../core/calendar';
import type { Project } from '../../content/types';
import { createPipeline, createTwins, stepTwins } from '../engine/engine';
import {
  addEffect,
  project,
  regionOf,
  run,
  setStatus,
  societyContent,
} from '../testing/society.fixture';
import { createWorld, type World } from '../world/world';
import {
  COAL_PM25_HOST_PER_MT,
  COAL_PM25_NATIONAL_PER_MT,
  createEnvironmentSystem,
  TRAFFIC_PM25_PER_KTEU,
} from './environment';
import { createLabourSystem } from './labour';

const setup = (projects: readonly Project[] = []) => {
  const content = societyContent(projects);
  return {
    world: createWorld(content, { seed: 1, bri: true }),
    systems: [createEnvironmentSystem(content)],
  };
};

const builders = (construction: number, localShare = 1) => ({
  jobs: { construction, operation: 0, localShare },
});

describe('environment system', () => {
  it('takes land and displaces people once, when a project breaks ground', () => {
    const { world, systems } = setup([
      project('dam', 'AAA-ONE', { landHa: 500, displacedPeople: 4000 }),
    ]);
    setStatus(world, 'planned', 'dam');
    run(world, systems, 1);
    expect(regionOf(world, 'AAA-ONE')).toMatchObject({ landTakenHa: 0, displaced: 0 });
    setStatus(world, 'construction', 'dam');
    run(world, systems, 1);
    expect(regionOf(world, 'AAA-ONE')).toMatchObject({ landTakenHa: 500, displaced: 4000 });
    expect(world.stats['environment.applied.dam']).toBe(1);
    setStatus(world, 'operating', 'dam');
    run(world, systems, 2);
    expect(regionOf(world, 'AAA-ONE')).toMatchObject({ landTakenHa: 500, displaced: 4000 });
  });

  it('adds PM2.5 from coal plants, most in the host region, and from traffic', () => {
    const projects = [
      project('coal', 'AAA-ONE', { kind: 'power-coal', co2KtPerYear: 10_000 }),
      project('port', 'BBB-REST', { kind: 'port', bri: false, co2KtPerYear: 50 }),
    ];
    const { world, systems } = setup(projects);
    const control = setup(projects).world;
    setStatus(world, 'operating', 'coal', 'port');
    regionOf(world, 'BBB-REST').throughput = 200_000;
    run(world, systems, 30);
    run(control, systems, 30);
    const extra = (id: string) => regionOf(world, id).pollution - regionOf(control, id).pollution;
    expect(extra('AAA-ONE')).toBeCloseTo(10 * COAL_PM25_HOST_PER_MT, 2);
    expect(extra('AAA-REST')).toBeCloseTo(10 * COAL_PM25_NATIONAL_PER_MT, 2);
    expect(extra('BBB-REST')).toBeCloseTo(200 * TRAFFIC_PM25_PER_KTEU, 2);
    expect(world.stats['environment.co2.AAA-ONE']).toBe(10_000);
    expect(world.stats['environment.co2.BBB-REST']).toBe(50);
    expect(control.stats['environment.co2.AAA-ONE']).toBe(0);
  });

  it('cuts Chinese PM2.5 by 35–40% by 2020 under the 2013 action plan, elsewhere slowly', () => {
    const { world, systems } = setup();
    const start = (id: string) => regionOf(world, id).pollution;
    const [china, other] = [start('CHN-EAST'), start('AAA-REST')];
    run(world, systems, dateToWeek({ year: 2020, month: 1, day: 1 }));
    const chinaRatio = regionOf(world, 'CHN-EAST').pollution / china;
    const otherRatio = regionOf(world, 'AAA-REST').pollution / other;
    expect(chinaRatio).toBeGreaterThan(0.6);
    expect(chinaRatio).toBeLessThan(0.65);
    expect(otherRatio).toBeGreaterThan(0.95);
    expect(otherRatio).toBeLessThan(1);
  });

  it('lowers security after an attack, recovering slowly; attacks near BRI sites sour views of China', () => {
    const site = project('site', 'AAA-ONE', builders(1000));
    const { world, systems } = setup([site]);
    const control = setup([site]).world;
    setStatus(world, 'construction', 'site');
    setStatus(control, 'construction', 'site');
    const attack = (region: string, severity: number) =>
      ({ kind: 'security-attack', region, target: 'chinese-workers', severity }) as const;
    addEffect(world, 'raid', attack('AAA-ONE', 1));
    addEffect(world, 'riot', attack('AAA-REST', 0.5));
    addEffect(world, 'news', { kind: 'announcement', topic: 'x' });
    run(world, systems, 1);
    run(control, systems, 1);
    const one = regionOf(world, 'AAA-ONE');
    const rest = regionOf(world, 'AAA-REST');
    expect(one.security).toBeCloseTo(0.5, 9);
    expect(rest.security).toBeCloseTo(0.65, 9);
    expect(one.sentiment.china).toBeLessThan(regionOf(control, 'AAA-ONE').sentiment.china);
    expect(rest.sentiment.china).toBe(0);
    run(world, systems, 1);
    expect(one.security).toBeCloseTo(0.5 + 0.3 * 0.02, 9);
    run(world, systems, 100);
    expect(one.security).toBeGreaterThan(0.7);
  });

  it('warms toward China with local BRI jobs, cools with foreign workers, displacement and coal smoke', () => {
    const chinaAfter = (p: Project) => {
      const { world, systems } = setup([p]);
      setStatus(world, p.kind === 'power-coal' ? 'operating' : 'construction', p.id);
      run(world, systems, 20);
      return regionOf(world, 'AAA-ONE').sentiment.china;
    };
    const local = project('local', 'AAA-ONE', builders(20_000));
    expect(chinaAfter(local)).toBeGreaterThan(0.1);
    expect(chinaAfter({ ...local, ...builders(20_000, 0.25) })).toBeLessThan(0);
    expect(chinaAfter({ ...local, displacedPeople: 20_000 })).toBeLessThan(0);
    const coal = project('coal', 'AAA-ONE', { kind: 'power-coal', co2KtPerYear: 20_000 });
    expect(chinaAfter(coal)).toBeLessThan(0);
    expect(chinaAfter({ ...local, bri: false })).toBe(0);
  });

  it('warms toward the government with income growth, cools with unemployment and displacement', () => {
    const governmentAfter = (change: (world: World) => void, projects: Project[] = []) => {
      const { world, systems } = setup(projects);
      run(world, systems, 1);
      change(world);
      run(world, systems, 10);
      return regionOf(world, 'AAA-REST').sentiment.government;
    };
    expect(governmentAfter(() => undefined)).toBe(0);
    expect(
      governmentAfter((world) => {
        regionOf(world, 'AAA-REST').income *= 1.1;
      }),
    ).toBeGreaterThan(0);
    expect(
      governmentAfter((world) => {
        regionOf(world, 'AAA-REST').unemployment = 0.2;
      }),
    ).toBeLessThan(0);
    const dam = project('dam', 'AAA-REST', { bri: false, displacedPeople: 10_000 });
    expect(
      governmentAfter(
        (world) => {
          setStatus(world, 'construction', 'dam');
        },
        [dam],
      ),
    ).toBeLessThan(0);
  });

  it('ignores regions missing from the world', () => {
    const { world, systems } = setup([project('lost', 'AAA-ONE', { landHa: 10 })]);
    setStatus(world, 'construction', 'lost');
    delete world.regions['AAA-ONE'];
    run(world, systems, 1);
    expect(world.stats['environment.applied.lost']).toBe(1);
    expect(world.stats['environment.co2.AAA-ONE']).toBeUndefined();
  });
});

describe('the no-BRI shadow world', () => {
  it('never sees BRI jobs, foreign workers, land take, displacement or coal smoke', () => {
    const content = societyContent([
      project('bri-coal', 'AAA-ONE', {
        kind: 'power-coal',
        co2KtPerYear: 5000,
        landHa: 200,
        displacedPeople: 3000,
        jobs: { construction: 4000, operation: 400, localShare: 0.5 },
      }),
      project('local-port', 'BBB-REST', {
        kind: 'port',
        bri: false,
        landHa: 50,
        ...builders(1000),
      }),
    ]);
    const systems = createPipeline([createLabourSystem(content), createEnvironmentSystem(content)]);
    const twins = createTwins(1, (options) => createWorld(content, options));
    const { bri, shadow } = twins;
    for (const world of [bri, shadow]) setStatus(world, 'construction', 'bri-coal', 'local-port');
    stepTwins(twins, systems);
    expect(regionOf(bri, 'AAA-ONE')).toMatchObject({ landTakenHa: 200, displaced: 3000 });
    expect(regionOf(shadow, 'AAA-ONE')).toMatchObject({ landTakenHa: 0, displaced: 0 });
    expect(regionOf(bri, 'AAA-ONE').jobs.construction).toBe(2000);
    expect(regionOf(shadow, 'AAA-ONE').jobs.construction).toBe(0);
    expect(bri.stats['labour.foreignWorkers.AAA-ONE']).toBe(2000);
    expect(shadow.stats['labour.foreignWorkers.AAA-ONE']).toBe(0);
    // Projects outside the Belt and Road exist in both worlds.
    for (const world of [bri, shadow]) {
      expect(regionOf(world, 'BBB-REST')).toMatchObject({ landTakenHa: 50 });
      expect(regionOf(world, 'BBB-REST').jobs.construction).toBe(1000);
    }
    for (const world of [bri, shadow]) setStatus(world, 'operating', 'bri-coal', 'local-port');
    for (let week = 0; week < 10; week++) stepTwins(twins, systems);
    expect(regionOf(bri, 'AAA-ONE').pollution).toBeGreaterThan(
      regionOf(shadow, 'AAA-ONE').pollution + 0.5,
    );
    expect(bri.stats['environment.co2.AAA-ONE']).toBe(5000);
    expect(shadow.stats['environment.co2.AAA-ONE']).toBe(0);
  });
});
