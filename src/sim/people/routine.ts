import { civilFromDays, daysFromCivil, type CivilDate } from '../../core/calendar';
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

/** Chinese New Year, which moves with the lunisolar calendar (Metonic 19-year repeat after). */
const CHINESE_NEW_YEAR: Readonly<Record<number, readonly [number, number]>> = {
  2013: [2, 10],
  2014: [1, 31],
  2015: [2, 19],
  2016: [2, 8],
  2017: [1, 28],
  2018: [2, 16],
  2019: [2, 5],
  2020: [1, 25],
  2021: [2, 12],
  2022: [2, 1],
  2023: [1, 22],
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
};

const LUNAR_YEAR_DAYS = 354.367;
/** 2013 dates of Islamic holidays, which move ~11 days earlier every solar year. */
const EID_AL_FITR_2013 = daysFromCivil({ year: 2013, month: 8, day: 8 });
const EID_AL_ADHA_2013 = daysFromCivil({ year: 2013, month: 10, day: 15 });
const ASHURA_2013 = daysFromCivil({ year: 2013, month: 11, day: 13 });

const within = (day: number, start: number, from: number, to: number) =>
  day - start >= from && day - start <= to;

/** Is `day` within [from, to] days of a lunar-year repetition of `anchor`? */
const lunar = (day: number, anchor: number, from: number, to: number) => {
  const k = Math.round((day - anchor) / LUNAR_YEAR_DAYS);
  return [k - 1, k, k + 1].some((n) =>
    within(day, anchor + Math.round(n * LUNAR_YEAR_DAYS), from, to),
  );
};

const newYear = (year: number): number => {
  // Fold any year into the tabulated 19-year cycle (the Metonic cycle repeats closely).
  const known = 2013 + ((((year - 2013) % 19) + 19) % 19);
  const [month, day] = CHINESE_NEW_YEAR[known] as readonly [number, number];
  return daysFromCivil({ year, month, day });
};

/** Western Easter Sunday (anonymous Gregorian computus). */
function easter(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return daysFromCivil({ year, month, day });
}

/** Orthodox Easter Sunday (Julian computus, +13 days for 1900–2099). */
function orthodoxEaster(year: number): number {
  const d = (19 * (year % 19) + 15) % 30;
  const e = (2 * (year % 4) + 4 * (year % 7) - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return daysFromCivil({ year, month, day }) + 13;
}

function isFestival(festival: Festival, date: CivilDate, day: number): boolean {
  const on = (month: number, first: number, last: number) =>
    date.month === month && date.day >= first && date.day <= last;
  switch (festival) {
    case 'christmas':
      return on(12, 24, 26);
    case 'orthodox-christmas':
    case 'coptic-christmas':
      return on(1, 6, 8);
    case 'nowruz':
      return on(3, 20, 23);
    case 'spring-festival':
      return within(day, newYear(date.year), 0, 6);
    case 'losar':
      return within(day, newYear(date.year) + 30, 0, 3);
    case 'easter':
      return within(day, easter(date.year), -2, 1);
    case 'orthodox-easter':
      return within(day, orthodoxEaster(date.year), -2, 1);
    case 'eid-al-fitr':
      return lunar(day, EID_AL_FITR_2013, 0, 2);
    case 'ramadan':
      return lunar(day, EID_AL_FITR_2013, -30, -1);
    case 'eid-al-adha':
      return lunar(day, EID_AL_ADHA_2013, 0, 3);
    case 'ashura':
      return lunar(day, ASHURA_2013, 0, 1);
  }
}

/** The first of `festivals` that falls on `date`, if any. */
export function festivalOn(date: CivilDate, festivals: readonly Festival[]): Festival | null {
  const day = daysFromCivil(date);
  return festivals.find((festival) => isFestival(festival, civilFromDays(day), day)) ?? null;
}

const WORKDAY_ROLES_EXCLUDED = new Set<Role>([
  'child',
  'student',
  'retiree',
  'homemaker',
  'unemployed',
]);

/** What someone in `role` is doing at an hour of the week (0 = Monday 00:00). */
export function activityAt(
  role: Role,
  hourOfWeek: number,
  prays: boolean,
  festival: Festival | null,
): Activity {
  const hour = hourOfWeek % 24;
  const day = Math.floor(hourOfWeek / 24) % 7;
  if (hour < 6 || hour >= 23) return 'sleeping';
  if (festival && hour >= 9 && hour < 21) return 'celebrating';
  if (prays && (hour === 13 || hour === 16 || hour === 19)) return 'praying';
  if (hour === 12 || hour === 19) return 'eating';
  if (hour >= 18) return 'family';
  if (day === 5 && hour >= 9 && hour <= 12) return 'market';
  const weekday = day < 5;
  if (role === 'student') return weekday && hour >= 8 && hour < 15 ? 'school' : 'family';
  if (WORKDAY_ROLES_EXCLUDED.has(role)) return role === 'homemaker' ? 'family' : 'resting';
  if (!weekday) return 'family';
  if (hour === 7) return 'commuting';
  return hour >= 8 ? 'working' : 'family';
}
