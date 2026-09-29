export type Speed = 'paused' | 'micro' | 'week' | 'month' | 'year';

export interface Clock {
  readonly speed: Speed;
  /** Sim hours accumulated towards the next weekly tick, in [0, 168). */
  readonly hourOfWeek: number;
}

export interface ClockAdvance {
  readonly clock: Clock;
  readonly weeks: number;
}

const todo = (): never => {
  throw new Error('not implemented');
};
export const createClock = (_speed?: Speed): Clock => todo();
export const setSpeed = (_clock: Clock, _speed: Speed): Clock => todo();
export const advanceClock = (_clock: Clock, _elapsedMs: number, _maxWeeks?: number): ClockAdvance =>
  todo();
