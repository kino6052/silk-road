export interface World {
  readonly seed: number;
  readonly bri: boolean;
  week: number;
}

export interface WorldOptions {
  readonly seed: number;
  readonly bri: boolean;
}

const todo = (): never => {
  throw new Error('not implemented');
};
export const createWorld = (_options: WorldOptions): World => todo();
export const cloneWorld = (_world: World): World => todo();
export const serializeWorld = (_world: World): string => todo();
export const deserializeWorld = (_text: string): World => todo();
export const stateHash = (_world: World): number => todo();
