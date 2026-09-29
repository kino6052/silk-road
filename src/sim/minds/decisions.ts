import type { Content } from '../../content/types';
import type { System } from '../engine/engine';
import type { World } from '../world/world';

export type TurningPointKind =
  'job-offer' | 'relocation' | 'protest' | 'emigrate' | 'bribe' | 'speak-out';

export interface TurningPoint {
  readonly id: string;
  readonly person: number;
  readonly kind: TurningPointKind;
  readonly week: number;
  /** Option ids; the first is the "act" option, the second the "don't" option. */
  readonly options: readonly string[];
  /** Option the player whispered, if any. */
  nudge: string | null;
  chosen: string | null;
  decidedWeek: number | null;
  /** i18n reason keys, most important first, e.g. 'reason.needs-money'. */
  reasons: string[];
}

export interface PendingNudge {
  readonly person: number;
  readonly kind: TurningPointKind;
  readonly option: string;
  readonly untilWeek: number;
}

/** Weeks a turning point stays open before the person decides. */
export const DECISION_WEEKS = 2;

export function createDecisionsSystem(_content: Content): System {
  throw new Error('not implemented');
}

export function nudge(_world: World, _turningPoint: string, _option: string): PendingNudge | null {
  throw new Error('not implemented');
}
