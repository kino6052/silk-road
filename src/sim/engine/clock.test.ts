import { describe, expect, it } from 'vitest';
import { advanceClock, createClock, setSpeed } from './clock';

describe('clock', () => {
  it('starts paused at the beginning of a week', () => {
    expect(createClock()).toEqual({ speed: 'paused', hourOfWeek: 0 });
    expect(advanceClock(createClock(), 10_000)).toEqual({ clock: createClock(), weeks: 0 });
  });

  it('runs one week per second at week speed', () => {
    const clock = createClock('week');
    expect(advanceClock(clock, 1000).weeks).toBe(1);
    const half = advanceClock(clock, 500);
    expect(half).toEqual({ clock: { speed: 'week', hourOfWeek: 84 }, weeks: 0 });
    expect(advanceClock(half.clock, 500).weeks).toBe(1);
  });

  it('runs about a month per second and a year per second at the faster speeds', () => {
    expect(advanceClock(createClock('month'), 1000, 100).weeks).toBe(4);
    expect(advanceClock(createClock('year'), 1000, 100).weeks).toBe(52);
  });

  it('runs a sim day per real minute in micro mode', () => {
    const advance = advanceClock(createClock('micro'), 60_000);
    expect(advance.weeks).toBe(0);
    expect(advance.clock.hourOfWeek).toBeCloseTo(24, 9);
  });

  it('caps the weeks per advance and drops the backlog so the UI stays responsive', () => {
    expect(advanceClock(createClock('year'), 1000)).toEqual({
      clock: { speed: 'year', hourOfWeek: 0 },
      weeks: 4,
    });
  });

  it('ignores negative elapsed time', () => {
    expect(advanceClock(createClock('week'), -500).weeks).toBe(0);
  });

  it('changes speed without losing accumulated hours', () => {
    const clock = advanceClock(createClock('week'), 250).clock;
    expect(setSpeed(clock, 'micro')).toEqual({ speed: 'micro', hourOfWeek: 42 });
  });
});
