import { describe, expect, it } from 'vitest';
import { activityAt, festivalOn } from './routine';

const MONDAY = 0;
const SATURDAY = 5 * 24;
const hour = (day: number, h: number) => day + h;

describe('daily routine', () => {
  it('sleeps at night, commutes, works office hours and eats', () => {
    expect(activityAt('factory-worker', hour(MONDAY, 3), false, null)).toBe('sleeping');
    expect(activityAt('factory-worker', hour(MONDAY, 7), false, null)).toBe('commuting');
    expect(activityAt('factory-worker', hour(MONDAY, 10), false, null)).toBe('working');
    expect(activityAt('factory-worker', hour(MONDAY, 12), false, null)).toBe('eating');
    expect(activityAt('factory-worker', hour(MONDAY, 20), false, null)).toBe('family');
  });

  it('goes to school or rests by role, shops on Saturday, prays and celebrates', () => {
    expect(activityAt('student', hour(MONDAY, 10), false, null)).toBe('school');
    expect(activityAt('retiree', hour(MONDAY, 10), false, null)).toBe('resting');
    expect(activityAt('child', hour(MONDAY, 10), false, null)).toBe('resting');
    expect(activityAt('farmer', hour(SATURDAY, 10), false, null)).toBe('market');
    expect(activityAt('farmer', hour(MONDAY, 13), true, null)).toBe('praying');
    expect(activityAt('farmer', hour(MONDAY, 13), false, null)).toBe('working');
    expect(activityAt('farmer', hour(MONDAY, 15), false, 'nowruz')).toBe('celebrating');
    expect(activityAt('farmer', hour(MONDAY, 2), false, 'nowruz')).toBe('sleeping');
  });

  it('knows fixed and lunar festivals', () => {
    expect(festivalOn({ year: 2014, month: 3, day: 21 }, ['nowruz'])).toBe('nowruz');
    expect(festivalOn({ year: 2014, month: 3, day: 21 }, ['christmas'])).toBeNull();
    expect(festivalOn({ year: 2020, month: 12, day: 25 }, ['christmas'])).toBe('christmas');
    expect(festivalOn({ year: 2019, month: 1, day: 7 }, ['orthodox-christmas'])).toBe(
      'orthodox-christmas',
    );
    expect(festivalOn({ year: 2019, month: 1, day: 7 }, ['coptic-christmas'])).toBe(
      'coptic-christmas',
    );
    // Eid al-Fitr moves ~11 days earlier each year: 2013-08-08, 2020-05-24.
    expect(festivalOn({ year: 2013, month: 8, day: 8 }, ['eid-al-fitr'])).toBe('eid-al-fitr');
    expect(festivalOn({ year: 2020, month: 5, day: 24 }, ['eid-al-fitr'])).toBe('eid-al-fitr');
    expect(festivalOn({ year: 2020, month: 5, day: 5 }, ['ramadan'])).toBe('ramadan');
    expect(festivalOn({ year: 2020, month: 7, day: 31 }, ['eid-al-adha'])).toBe('eid-al-adha');
    expect(festivalOn({ year: 2020, month: 8, day: 29 }, ['ashura'])).toBe('ashura');
    expect(festivalOn({ year: 2020, month: 1, day: 25 }, ['spring-festival'])).toBe(
      'spring-festival',
    );
    expect(festivalOn({ year: 2020, month: 2, day: 24 }, ['losar'])).toBe('losar');
    expect(festivalOn({ year: 2020, month: 4, day: 12 }, ['easter'])).toBe('easter');
    expect(festivalOn({ year: 2020, month: 4, day: 19 }, ['orthodox-easter'])).toBe(
      'orthodox-easter',
    );
  });
});
