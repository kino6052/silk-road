import type { Demography } from './types';

/**
 * Estimated 2013 values (World Bank WDI, UN World Population Prospects and national
 * household surveys, rounded). Homemaker shares are rough labour-force-survey readings.
 */
export const DEMOGRAPHY_SOURCE =
  'https://population.un.org/wpp/ ; https://data.worldbank.org/indicator/SP.DYN.LE00.IN ; https://www.un.org/development/desa/pd/data/household-size-and-composition';

const row = (
  householdSize: number,
  homemakerShare: number,
  retirementAge: number,
  education: number,
  fertility: number,
  lifeExpectancy: number,
): Demography => ({
  householdSize,
  homemakerShare,
  retirementAge,
  education,
  fertility,
  lifeExpectancy,
});

export const DEMOGRAPHY: Readonly<Record<string, Demography>> = {
  CHN: row(3, 0.1, 60, 0.6, 1.6, 75.5),
  KAZ: row(3.5, 0.2, 63, 0.7, 2.6, 70.5),
  UZB: row(5, 0.4, 60, 0.65, 2.5, 70.5),
  RUS: row(2.6, 0.1, 60, 0.8, 1.7, 71),
  BLR: row(2.5, 0.1, 60, 0.8, 1.6, 72.5),
  POL: row(2.8, 0.15, 65, 0.8, 1.3, 77),
  DEU: row(2, 0.15, 65, 0.85, 1.4, 81),
  AZE: row(4.5, 0.4, 63, 0.65, 2, 71.5),
  TUR: row(3.7, 0.55, 60, 0.6, 2.1, 75.5),
  IRN: row(3.5, 0.6, 60, 0.6, 1.8, 75),
  PAK: row(6.5, 0.75, 60, 0.35, 3.7, 66),
  EGY: row(4, 0.7, 60, 0.5, 3.4, 71),
  GRC: row(2.6, 0.25, 67, 0.75, 1.3, 81),
};
