import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../testing/content.fixture';
import {
  cloneWorld,
  createWorld,
  deserializeWorld,
  serializeWorld,
  stateHash,
  type World,
} from './world';

const content = fixtureContent();
const make = (seed: number, bri: boolean) => createWorld(content, { seed, bri });

const worldArb: fc.Arbitrary<World> = fc
  .record({ seed: fc.nat(), bri: fc.boolean(), week: fc.nat({ max: 5000 }) })
  .map(({ seed, bri, week }) => Object.assign(make(seed, bri), { week }));

describe('createWorld', () => {
  it('starts at week 0 with the given seed and BRI flag', () => {
    const world = make(7, false);
    expect([world.seed, world.bri, world.week]).toEqual([7, false, 0]);
  });

  it('builds country states from content and 2013 indicators', () => {
    const { countries } = make(1, true);
    expect(countries.AAA).toMatchObject({
      population: 5e6,
      gdp: 50e9,
      externalDebt: 10,
      chinaDebt: 0,
      debtDistress: 0,
      imfProgram: false,
      sanctions: 0,
      stability: 1,
      blocs: ['SCO'],
      policies: [],
    });
    expect(countries.ZZZ).toMatchObject({ population: 0, gdp: 0 });
  });

  it('builds regions with labour markets, income and pollution from content', () => {
    const region = make(1, true).regions['AAA-ONE'];
    expect(region?.population).toBe(2e6);
    // 45% participation, 6% unemployment, split by the employment shares.
    expect(region?.jobs.services).toBeCloseTo(2e6 * 0.45 * 0.94 * 0.5, 6);
    expect(region?.jobs.construction).toBe(0);
    expect(region?.unemployment).toBe(0.06);
    // National GDP per person (10,000) times the regional income index (2).
    expect(region?.income).toBe(20_000);
    // Country PM2.5 (20) scaled up for a fully urban region.
    expect(region?.pollution).toBeCloseTo(20 * 1.3, 9);
    expect(region?.sentiment).toEqual({ china: 0, government: 0 });
  });

  it('includes BRI projects only in the BRI world, and all links in both', () => {
    expect(Object.keys(make(1, true).projects)).toEqual(['rail-ab', 'port-b']);
    expect(Object.keys(make(1, false).projects)).toEqual(['port-b']);
    expect(make(1, false).links['a~b~rail']).toEqual({
      id: 'a~b~rail',
      open: false,
      capacityFactor: 1,
      flow: 0,
    });
    expect(make(1, true).projects['port-b']?.status).toBe('hidden');
  });
});

describe('world persistence', () => {
  it('clones deeply', () => {
    const world = make(1, true);
    const copy = cloneWorld(world);
    copy.week = 10;
    if (copy.regions['AAA-ONE']) copy.regions['AAA-ONE'].population = 1;
    expect(world.week).toBe(0);
    expect(world.regions['AAA-ONE']?.population).toBe(2e6);
  });

  it('round-trips through save text losslessly', () => {
    fc.assert(
      fc.property(worldArb, (world) => {
        expect(deserializeWorld(serializeWorld(world))).toEqual(world);
      }),
      { numRuns: 20 },
    );
  });

  it('rejects saves in an unknown format', () => {
    expect(() => deserializeWorld('{"format":999,"world":{}}')).toThrow(/save format/);
  });

  it('hashes equal states equally and different states differently', () => {
    const world = make(3, true);
    expect(stateHash(cloneWorld(world))).toBe(stateHash(world));
    const later = cloneWorld(world);
    later.week += 1;
    expect(stateHash(later)).not.toBe(stateHash(world));
  });
});
