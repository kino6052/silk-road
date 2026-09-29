import type { Country } from './types';

// Press freedom approximates the RSF 2013 index; corruption is (100 - CPI 2013) / 100;
// PM2.5 approximates State of Global Air 2013; external debt approximates World Bank IDS
// and national sources for 2013; growth trends are modelling assumptions.
const SOURCE =
  'https://www.transparency.org/en/cpi/2013 ; https://rsf.org/en/index?year=2013 ; https://en.wikipedia.org/wiki/Shanghai_Cooperation_Organisation ; https://www.stateofglobalair.org/data ; https://datatopics.worldbank.org/debt/ids/';

// Iran was under UN, US and EU sanctions in 2013; the EU had targeted sanctions on Belarus.
const INITIAL_SANCTIONS: Readonly<Record<string, number>> = { IRN: 0.6, BLR: 0.1 };

const country = (
  id: string,
  role: Country['role'],
  regime: Country['regime'],
  pressFreedom: number,
  corruption: number,
  blocs: Country['blocs'],
  [pm25, externalDebtBn, growthTrend]: readonly [number, number, number],
): Country => ({
  id,
  role,
  regime,
  pressFreedom,
  corruption,
  blocs,
  pm25,
  externalDebtBn,
  growthTrend,
  sanctions: INITIAL_SANCTIONS[id] ?? 0,
  provenance: 'estimated',
  source: SOURCE,
});

export const COUNTRIES: readonly Country[] = [
  country('CHN', 'corridor', 'one-party', 0.1, 0.6, ['SCO'], [58, 863, 0.045]),
  country('KAZ', 'corridor', 'authoritarian', 0.2, 0.74, ['EAEU', 'SCO'], [16, 150, 0.04]),
  country('UZB', 'corridor', 'authoritarian', 0.05, 0.83, ['SCO'], [35, 9, 0.055]),
  country('RUS', 'corridor', 'authoritarian', 0.25, 0.72, ['EAEU', 'SCO'], [14, 729, 0.012]),
  country('BLR', 'corridor', 'authoritarian', 0.15, 0.71, ['EAEU'], [18, 40, 0.015]),
  country('POL', 'corridor', 'democracy', 0.8, 0.4, ['EU', 'NATO'], [24, 380, 0.03]),
  country('DEU', 'corridor', 'democracy', 0.9, 0.22, ['EU', 'NATO', 'G7'], [13, 5800, 0.01]),
  country('AZE', 'corridor', 'authoritarian', 0.1, 0.72, [], [24, 12, 0.025]),
  country('TUR', 'corridor', 'hybrid', 0.3, 0.5, ['NATO'], [32, 390, 0.035]),
  country('IRN', 'corridor', 'theocracy', 0.05, 0.75, [], [38, 8, 0.02]),
  country('PAK', 'corridor', 'hybrid', 0.3, 0.72, [], [65, 60, 0.035]),
  country('EGY', 'corridor', 'authoritarian', 0.2, 0.68, [], [85, 46, 0.04]),
  country('GRC', 'corridor', 'democracy', 0.6, 0.6, ['EU', 'NATO'], [16, 560, 0.015]),
  country('USA', 'external', 'democracy', 0.8, 0.27, ['NATO', 'G7'], [8, 16000, 0.02]),
  country('EU', 'external', 'bloc', 0.85, 0.3, [], [14, 0, 0.013]),
  country('IND', 'external', 'democracy', 0.5, 0.64, [], [74, 427, 0.06]),
  country('JPN', 'external', 'democracy', 0.75, 0.26, ['G7'], [13, 3000, 0.007]),
  country('SAU', 'external', 'monarchy', 0.1, 0.54, ['GCC'], [88, 150, 0.03]),
  country('ARE', 'external', 'monarchy', 0.3, 0.31, ['GCC'], [42, 180, 0.035]),
  country('GBR', 'external', 'democracy', 0.8, 0.24, ['EU', 'NATO', 'G7'], [11, 9500, 0.014]),
];
