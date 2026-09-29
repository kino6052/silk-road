import type { Content } from '../../content/types';
import type { World } from '../world/world';
import type { Person } from './types';

export interface Pay {
  /** Records each region's first freight volume, the baseline for logistics pay. */
  track(world: World): void;
  /** Is the Belt and Road building or running something in this region this year? */
  briWorks(world: World, region: string): boolean;
  /** Multiplier on a person's base pay from who they work for and what their region trades. */
  factor(world: World, person: Person): number;
}

export function createPay(_content: Content): Pay {
  throw new Error('not implemented');
}
