import type { CivilDate } from '../../core/calendar';
import type { Content } from '../../content/types';
import type { System } from '../engine/engine';

export const GRACE_WEEKS = 5 * 52;
export const AMORTISATION_WEEKS = 15 * 52;
export const BASE_SERVICE_RATE = 0.08;
export const DEFAULT_BASELINE_DISTRESS = 0.2;
export const IMF_RELIEF = 0.1;
export const DISTRESS_ADJUST = 1 / 52;
export const HISTORY_ENDS: CivilDate = { year: 2026, month: 1, day: 1 };
export const RENEGOTIATION_RATE_CUT = 0.5;

export function createFinanceSystem(_content: Content): System {
  throw new Error('not implemented');
}
