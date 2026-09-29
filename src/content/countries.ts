import type { Country } from './types';

// Press freedom approximates the RSF 2013 index; corruption is (100 - CPI 2013) / 100.
const SOURCE =
  'https://www.transparency.org/en/cpi/2013 ; https://rsf.org/en/index?year=2013 ; https://en.wikipedia.org/wiki/Shanghai_Cooperation_Organisation';

const country = (
  id: string,
  role: Country['role'],
  regime: Country['regime'],
  pressFreedom: number,
  corruption: number,
  blocs: Country['blocs'],
): Country => ({
  id,
  role,
  regime,
  pressFreedom,
  corruption,
  blocs,
  provenance: 'estimated',
  source: SOURCE,
});

export const COUNTRIES: readonly Country[] = [
  country('CHN', 'corridor', 'one-party', 0.1, 0.6, ['SCO']),
  country('KAZ', 'corridor', 'authoritarian', 0.2, 0.74, ['EAEU', 'SCO']),
  country('UZB', 'corridor', 'authoritarian', 0.05, 0.83, ['SCO']),
  country('RUS', 'corridor', 'authoritarian', 0.25, 0.72, ['EAEU', 'SCO']),
  country('BLR', 'corridor', 'authoritarian', 0.15, 0.71, ['EAEU']),
  country('POL', 'corridor', 'democracy', 0.8, 0.4, ['EU', 'NATO']),
  country('DEU', 'corridor', 'democracy', 0.9, 0.22, ['EU', 'NATO', 'G7']),
  country('AZE', 'corridor', 'authoritarian', 0.1, 0.72, []),
  country('TUR', 'corridor', 'hybrid', 0.3, 0.5, ['NATO']),
  country('IRN', 'corridor', 'theocracy', 0.05, 0.75, []),
  country('PAK', 'corridor', 'hybrid', 0.3, 0.72, []),
  country('EGY', 'corridor', 'authoritarian', 0.2, 0.68, []),
  country('GRC', 'corridor', 'democracy', 0.6, 0.6, ['EU', 'NATO']),
  country('USA', 'external', 'democracy', 0.8, 0.27, ['NATO', 'G7']),
  country('EU', 'external', 'bloc', 0.85, 0.3, []),
  country('IND', 'external', 'democracy', 0.5, 0.64, []),
  country('JPN', 'external', 'democracy', 0.75, 0.26, ['G7']),
  country('SAU', 'external', 'monarchy', 0.1, 0.54, ['GCC']),
  country('ARE', 'external', 'monarchy', 0.3, 0.31, ['GCC']),
  country('GBR', 'external', 'democracy', 0.8, 0.24, ['NATO', 'G7']),
];
