/* eslint-disable no-restricted-properties -- Math.* is the reference oracle in these tests */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { exp, log, logistic, pow } from './fixed-math';

const closeTo = (actual: number, expected: number, relative = 1e-13) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    relative * Math.max(1, Math.abs(expected)),
  );
};

const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe('exp', () => {
  it('matches Math.exp across the finite range', () => {
    fc.assert(
      fc.property(finite(-700, 700), (x) => {
        closeTo(exp(x), Math.exp(x));
      }),
      {
        numRuns: 300,
      },
    );
    expect(exp(0)).toBe(1);
  });

  it('handles NaN, overflow and underflow', () => {
    expect(exp(Number.NaN)).toBeNaN();
    expect(exp(710)).toBe(Number.POSITIVE_INFINITY);
    expect(exp(-746)).toBe(0);
  });
});

describe('log', () => {
  it('matches Math.log across magnitudes', () => {
    const magnitudes = fc.tuple(finite(1, 10), fc.integer({ min: -300, max: 300 }));
    fc.assert(
      fc.property(magnitudes, ([mantissa, exponent]) => {
        const x = mantissa * Math.pow(10, exponent);
        closeTo(log(x), Math.log(x));
      }),
      { numRuns: 300 },
    );
    expect(log(1)).toBe(0);
    closeTo(log(5e-324), Math.log(5e-324));
  });

  it('handles the edges of its domain', () => {
    expect(log(-1)).toBeNaN();
    expect(log(Number.NaN)).toBeNaN();
    expect(log(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(log(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('pow', () => {
  it('computes integer powers exactly, including negative bases and exponents', () => {
    expect(pow(2, 10)).toBe(1024);
    expect(pow(-3, 3)).toBe(-27);
    expect(pow(2, -2)).toBe(0.25);
    expect(pow(0, 0)).toBe(1);
    expect(pow(0, -1)).toBe(Number.POSITIVE_INFINITY);
  });

  it('matches Math.pow for fractional exponents', () => {
    fc.assert(
      fc.property(finite(1e-3, 1e3), finite(-5, 5), (x, y) => {
        closeTo(pow(x, y), Math.pow(x, y), 1e-12);
      }),
      { numRuns: 300 },
    );
  });

  it('handles zero and negative bases with fractional exponents', () => {
    expect(pow(0, 0.5)).toBe(0);
    expect(pow(0, -0.5)).toBe(Number.POSITIVE_INFINITY);
    expect(pow(-8, 1 / 3)).toBeNaN();
  });
});

describe('logistic', () => {
  it('is the standard sigmoid', () => {
    expect(logistic(0)).toBe(0.5);
    closeTo(logistic(2), 1 / (1 + Math.exp(-2)));
    expect(logistic(-800)).toBe(0);
    expect(logistic(800)).toBe(1);
  });
});
