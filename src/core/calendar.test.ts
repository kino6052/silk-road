import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { civilFromDays, dateToWeek, daysFromCivil, EPOCH, weekToDate } from './calendar';

const MS_PER_DAY = 86_400_000;

// The JS Date object is banned from core/ code but is a fine oracle in tests.
const oracleDate = (days: number) => {
  // eslint-disable-next-line no-restricted-globals -- test oracle
  const date = new Date(days * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

// Roughly years 330 to 4160, avoiding Date's special handling of years 0–99.
const daysArb = fc.integer({ min: -600_000, max: 800_000 });

describe('civil dates ↔ days since 1970-01-01', () => {
  it('matches known dates', () => {
    expect(daysFromCivil({ year: 1970, month: 1, day: 1 })).toBe(0);
    expect(daysFromCivil({ year: 2000, month: 2, day: 29 })).toBe(11_016);
    expect(daysFromCivil(EPOCH)).toBe(15_950);
    expect(daysFromCivil({ year: 1969, month: 12, day: 31 })).toBe(-1);
  });

  it('agrees with the Date oracle and round-trips', () => {
    fc.assert(
      fc.property(daysArb, (days) => {
        const date = civilFromDays(days);
        expect(date).toEqual(oracleDate(days));
        expect(daysFromCivil(date)).toBe(days);
      }),
      { numRuns: 300 },
    );
  });
});

describe('sim weeks ↔ dates (week 0 starts Monday 2013-09-02)', () => {
  it('maps weeks to their Monday', () => {
    expect(weekToDate(0)).toEqual(EPOCH);
    expect(weekToDate(1)).toEqual({ year: 2013, month: 9, day: 9 });
    expect(weekToDate(17)).toEqual({ year: 2013, month: 12, day: 30 });
    expect(weekToDate(-1)).toEqual({ year: 2013, month: 8, day: 26 });
  });

  it('maps any day of a week to that week', () => {
    expect(dateToWeek(EPOCH)).toBe(0);
    expect(dateToWeek({ year: 2013, month: 9, day: 8 })).toBe(0);
    expect(dateToWeek({ year: 2013, month: 9, day: 9 })).toBe(1);
    expect(dateToWeek({ year: 2013, month: 9, day: 1 })).toBe(-1);
    fc.assert(
      fc.property(fc.integer({ min: -5_000, max: 20_000 }), (week) => {
        expect(dateToWeek(weekToDate(week))).toBe(week);
      }),
      { numRuns: 200 },
    );
  });
});
