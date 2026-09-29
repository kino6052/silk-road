import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRng, type RngKey } from './rng';

const UINT32_LIMIT = 4294967296;

const keyArb: fc.Arbitrary<RngKey> = fc.record({
  seed: fc.nat({ max: UINT32_LIMIT - 1 }),
  stream: fc.string(),
  entity: fc.nat({ max: 0x7fffffff }),
  tick: fc.integer({ min: -100_000, max: 100_000 }),
});

const draw = (key: RngKey, count: number): number[] => {
  const rng = createRng(key);
  return Array.from({ length: count }, () => rng.next());
};

describe('createRng', () => {
  it('replays the same uint32 sequence for the same key', () => {
    fc.assert(
      fc.property(keyArb, (key) => {
        const first = draw(key, 8);
        expect(draw({ ...key }, 8)).toEqual(first);
        for (const value of first) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(UINT32_LIMIT);
        }
      }),
    );
  });
});
