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
}

export function createRng(key: RngKey): Rng {
  const base = [key.seed, hashString(key.stream), key.entity, key.tick];
  let counter = 0;
  return {
    next: () => hashWords([...base, counter++]),
    float: () => hashWords([...base, counter++]) / 4294967296,
  };
}
