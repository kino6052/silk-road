export interface RngKey {
  readonly seed: number;
  readonly stream: string;
  readonly entity: number;
  readonly tick: number;
}

export interface Rng {
  next(): number;
}

export function createRng(_key: RngKey): Rng {
  throw new Error('not implemented');
}
