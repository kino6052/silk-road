import { describe, expect, it } from 'vitest';
import type { BriEnvelope } from '../../content/types';
import { BRI_SPENDING_PROFILE, capitalBn, reliability, spendingBn } from './bri';

const envelope: BriEnvelope = {
  country: 'AAA',
  totalBn: 100,
  loanShare: 0.5,
  rate: 0.03,
  tradeGain: 0.03,
  provenance: 'estimated',
  source: 'test',
};

describe('BRI spending model', () => {
  it('spreads the 2013–2023 envelope over the historical profile, then continues at a lower pace', () => {
    const years = Object.keys(BRI_SPENDING_PROFILE).map(Number);
    expect(Math.min(...years)).toBe(2013);
    expect(Math.max(...years)).toBe(2023);
    const total = years.reduce((sum, year) => sum + spendingBn(envelope, year), 0);
    expect(total).toBeCloseTo(100, 9);
    expect(spendingBn(envelope, 2017)).toBeGreaterThan(spendingBn(envelope, 2013));
    expect(spendingBn(envelope, 2012)).toBe(0);
    expect(spendingBn(envelope, 2030)).toBeGreaterThan(0);
    expect(spendingBn(envelope, 2030)).toBeLessThan(spendingBn(envelope, 2017));
  });

  it('builds up a depreciating capital stock', () => {
    expect(capitalBn(envelope, 2013)).toBe(0);
    expect(capitalBn(envelope, 2016.5)).toBeGreaterThan(capitalBn(envelope, 2016));
    expect(capitalBn(envelope, 2024)).toBeGreaterThan(70);
    expect(capitalBn(envelope, 2024)).toBeLessThan(100);
    expect(capitalBn(envelope, 2040)).toBeGreaterThan(capitalBn(envelope, 2024) * 0.8);
  });

  it('makes the corridors more reliable over time: low in 2014, half by 2020, near full in the 2030s', () => {
    expect(reliability(2014)).toBeLessThan(0.2);
    expect(reliability(2020)).toBeCloseTo(0.5, 9);
    expect(reliability(2035)).toBeGreaterThan(0.95);
    for (let year = 2013; year < 2040; year++) {
      expect(reliability(year + 1)).toBeGreaterThan(reliability(year));
    }
  });
});
