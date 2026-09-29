import { logistic } from '../../core/fixed-math';
import type { BriEnvelope } from '../../content/types';

/**
 * Share of each country's 2013–2023 Belt and Road envelope spent in each year: a ramp to a
 * 2016–2018 peak, a COVID dip and the 2021 turn to "small and beautiful" projects (shape of
 * the AEI China Global Investment Tracker's construction and investment series).
 */
export const BRI_SPENDING_PROFILE: Readonly<Record<number, number>> = {
  2013: 0.03,
  2014: 0.07,
  2015: 0.1,
  2016: 0.13,
  2017: 0.14,
  2018: 0.13,
  2019: 0.12,
  2020: 0.08,
  2021: 0.07,
  2022: 0.06,
  2023: 0.07,
};

/** Yearly spending after 2023, as a share of the 2013–2023 envelope (baseline future). */
export const ONGOING_SHARE = 0.05;
/** Yearly depreciation of BRI infrastructure. */
export const DEPRECIATION = 0.03;
/** The corridors are half as reliable as they will become in this year... */
export const RELIABILITY_MIDPOINT = 2020;
/** ...and reliability rises along a logistic curve with this width in years. */
export const RELIABILITY_WIDTH = 2.5;

const FIRST_YEAR = 2013;

/** USD billions spent on the Belt and Road in the envelope's country in `year`. */
export function spendingBn(envelope: BriEnvelope, year: number): number {
  if (year < FIRST_YEAR) return 0;
  return envelope.totalBn * (BRI_SPENDING_PROFILE[year] ?? ONGOING_SHARE);
}

/** Depreciated BRI capital stock (USD bn) at fractional year `time`. */
export function capitalBn(envelope: BriEnvelope, time: number): number {
  const year = Math.floor(time);
  let capital = 0;
  for (let y = FIRST_YEAR; y < year; y++)
    capital = capital * (1 - DEPRECIATION) + spendingBn(envelope, y);
  return capital + spendingBn(envelope, year) * (time - year);
}

/**
 * How reliable the corridors are at fractional year `time`, 0–1: services, schedules,
 * customs and links mature, so the trade-cost gains arrive gradually.
 */
export function reliability(time: number): number {
  return logistic((time - RELIABILITY_MIDPOINT) / RELIABILITY_WIDTH);
}
