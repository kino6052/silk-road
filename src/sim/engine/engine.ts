import type { CivilDate } from '../../core/calendar';
import type { Rng } from '../../core/rng';
import type { World, WorldOptions } from '../world/world';

export interface SystemContext {
  readonly week: number;
  readonly date: CivilDate;
  rng(entity: number, purpose?: string): Rng;
}

export interface System {
  readonly id: string;
  step(world: World, ctx: SystemContext): void;
}

export interface Twins {
  readonly bri: World;
  readonly shadow: World;
}

const todo = (): never => {
  throw new Error('not implemented');
};
export const createPipeline = (_systems: readonly System[]): readonly System[] => todo();
export const stepWorld = (_world: World, _pipeline: readonly System[]): void => todo();
export const createTwins = (_seed: number, _create?: (options: WorldOptions) => World): Twins =>
  todo();
export const stepTwins = (_twins: Twins, _pipeline: readonly System[]): void => todo();
