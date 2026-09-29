import type { CivilDate } from '../../core/calendar';
import type { Festival } from '../../content/types';
import type { Role } from './types';
export type Activity =
  | 'sleeping'
  | 'commuting'
  | 'working'
  | 'eating'
  | 'praying'
  | 'family'
  | 'market'
  | 'school'
  | 'resting'
  | 'celebrating';
const todo = (): never => {
  throw new Error('not implemented');
};
export const festivalOn = (_date: CivilDate, _festivals: readonly Festival[]): Festival | null =>
  todo();
export const activityAt = (
  _role: Role,
  _hourOfWeek: number,
  _prays: boolean,
  _festival: Festival | null,
): Activity => todo();
