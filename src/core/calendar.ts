export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export const EPOCH: CivilDate = { year: 2013, month: 9, day: 2 };

export function daysFromCivil(_date: CivilDate): number {
  throw new Error('not implemented');
}

export function civilFromDays(_days: number): CivilDate {
  throw new Error('not implemented');
}

export function weekToDate(_week: number): CivilDate {
  throw new Error('not implemented');
}

export function dateToWeek(_date: CivilDate): number {
  throw new Error('not implemented');
}
