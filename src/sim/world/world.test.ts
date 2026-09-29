import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cloneWorld,
  createWorld,
  deserializeWorld,
  serializeWorld,
  stateHash,
  type World,
} from './world';

const worldArb: fc.Arbitrary<World> = fc
  .record({ seed: fc.nat(), bri: fc.boolean(), week: fc.nat({ max: 5000 }) })
  .map(({ seed, bri, week }) => Object.assign(createWorld({ seed, bri }), { week }));

describe('world', () => {
  it('starts at week 0 with the given seed and BRI flag', () => {
    expect(createWorld({ seed: 7, bri: false })).toEqual({ seed: 7, bri: false, week: 0 });
  });

  it('clones deeply', () => {
    const world = createWorld({ seed: 1, bri: true });
    const copy = cloneWorld(world);
    copy.week = 10;
    expect(world.week).toBe(0);
    expect(copy).toEqual({ ...world, week: 10 });
  });

  it('round-trips through save text losslessly', () => {
    fc.assert(
      fc.property(worldArb, (world) => {
        expect(deserializeWorld(serializeWorld(world))).toEqual(world);
      }),
      { numRuns: 50 },
    );
  });

  it('rejects saves in an unknown format', () => {
    expect(() => deserializeWorld('{"format":999,"world":{}}')).toThrow(/save format/);
  });

  it('hashes equal states equally and different states differently', () => {
    const world = createWorld({ seed: 3, bri: true });
    expect(stateHash(cloneWorld(world))).toBe(stateHash(world));
    const later = cloneWorld(world);
    later.week += 1;
    expect(stateHash(later)).not.toBe(stateHash(world));
  });
});
