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

  it('gives an independent sequence when any single key field changes', () => {
    const variants: ((key: RngKey) => RngKey)[] = [
      (key) => ({ ...key, seed: (key.seed + 1) % UINT32_LIMIT }),
      (key) => ({ ...key, stream: `${key.stream}x` }),
      (key) => ({ ...key, entity: key.entity + 1 }),
      (key) => ({ ...key, tick: key.tick + 1 }),
    ];
    fc.assert(
      fc.property(keyArb, (key) => {
        for (const vary of variants) expect(draw(vary(key), 4)).not.toEqual(draw(key, 4));
      }),
    );
  });

  it('draws floats in [0, 1)', () => {
    fc.assert(
      fc.property(keyArb, (key) => {
        const rng = createRng(key);
        for (let i = 0; i < 16; i++) {
          const value = rng.float();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThan(1);
        }
      }),
    );
  });

  it('draws floats with a uniform mean', () => {
    const rng = createRng({ seed: 42, stream: 'uniformity', entity: 0, tick: 0 });
    let sum = 0;
    const draws = 20_000;
    for (let i = 0; i < draws; i++) sum += rng.float();
    expect(sum / draws).toBeCloseTo(0.5, 2);
  });
});
