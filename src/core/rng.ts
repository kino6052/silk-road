import { hashString, hashWords } from './hash';

export interface RngKey {
  readonly seed: number;
  readonly stream: string;
  readonly entity: number;
  readonly tick: number;
}

export interface Rng {
  next(): number;
  float(): number;
  int(min: number, maxExclusive: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

/** 2^32: turns a uint32 into a float in [0, 1). */
const UINT32_RANGE = 4294967296;

/**
 * Counter-based RNG: draw i is hash(seed, stream, entity, tick, i). Nothing is shared
 * between keys, so removing an entity (e.g. in the no-BRI shadow world) never shifts
 * anyone else's draws.
 */
export function createRng(key: RngKey): Rng {
  const base = [key.seed, hashString(key.stream), key.entity, key.tick];
  let counter = 0;
  const next = (): number => hashWords([...base, counter++]);
  const float = (): number => next() / UINT32_RANGE;
  const int = (min: number, maxExclusive: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(maxExclusive) || maxExclusive <= min) {
      throw new RangeError(`invalid integer range [${String(min)}, ${String(maxExclusive)})`);
    }
    return min + Math.floor(float() * (maxExclusive - min));
  };
  return {
    next,
    float,
    int,
    chance: (probability) => float() < probability,
    // int() throws on an empty list and otherwise returns a valid index.
    pick: <T>(items: readonly T[]): T => items[int(0, items.length)] as T,
  };
}
