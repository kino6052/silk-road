// Pure integer calendar (proleptic Gregorian), no JS Date, so it is deterministic everywhere.
// Algorithms: Howard Hinnant, "chrono-Compatible Low-Level Date Algorithms".

export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Monday of sim week 0: the week of the 2013 Astana speech. */
export const EPOCH: CivilDate = { year: 2013, month: 9, day: 2 };

const DAYS_PER_ERA = 146_097;
const UNIX_EPOCH_SHIFT = 719_468; // days from 0000-03-01 to 1970-01-01

/** Days since 1970-01-01 (negative before). */
export function daysFromCivil({ year, month, day }: CivilDate): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * DAYS_PER_ERA + dayOfEra - UNIX_EPOCH_SHIFT;
}

export function civilFromDays(days: number): CivilDate {
  const z = days + UNIX_EPOCH_SHIFT;
  const era = Math.floor(z / DAYS_PER_ERA);
  const dayOfEra = z - era * DAYS_PER_ERA;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

const EPOCH_DAYS = daysFromCivil(EPOCH);

export function weekToDate(week: number): CivilDate {
  return civilFromDays(EPOCH_DAYS + week * 7);
}

export function dateToWeek(date: CivilDate): number {
  return Math.floor((daysFromCivil(date) - EPOCH_DAYS) / 7);
}
