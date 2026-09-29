// Maps real elapsed time to sim time. One clock, two zooms: macro speeds step whole weeks,
// micro speed crawls through hours of the current week (one sim day per real minute).

export type Speed = 'paused' | 'micro' | 'week' | 'month' | 'year';

export interface Clock {
  readonly speed: Speed;
  /** Sim hours accumulated towards the next weekly tick, in [0, 168). */
  readonly hourOfWeek: number;
}

export interface ClockAdvance {
  readonly clock: Clock;
  /** Whole weeks the simulation should step now. */
  readonly weeks: number;
}

export const HOURS_PER_WEEK = 168;
const HOURS_PER_YEAR = 8766; // 365.25 days

export const SIM_HOURS_PER_REAL_SECOND: Readonly<Record<Speed, number>> = {
  paused: 0,
  micro: 24 / 60,
  week: HOURS_PER_WEEK,
  month: HOURS_PER_YEAR / 12,
  year: HOURS_PER_YEAR,
};

/** Default cap on weeks per advance; if the sim can't keep up, it runs slower, not choppier. */
const MAX_WEEKS_PER_ADVANCE = 4;

export function createClock(speed: Speed = 'paused'): Clock {
  return { speed, hourOfWeek: 0 };
}

export function setSpeed(clock: Clock, speed: Speed): Clock {
  return { ...clock, speed };
}

export function advanceClock(
  clock: Clock,
  elapsedMs: number,
  maxWeeks = MAX_WEEKS_PER_ADVANCE,
): ClockAdvance {
  const hours =
    clock.hourOfWeek + (SIM_HOURS_PER_REAL_SECOND[clock.speed] * Math.max(0, elapsedMs)) / 1000;
  const due = Math.floor(hours / HOURS_PER_WEEK);
  const weeks = Math.min(due, maxWeeks);
  const hourOfWeek = weeks < due ? 0 : hours - due * HOURS_PER_WEEK;
  return { clock: { speed: clock.speed, hourOfWeek }, weeks };
}
