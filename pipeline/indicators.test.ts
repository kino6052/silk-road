import { describe, expect, it } from 'vitest';
import { buildIndicators } from './indicators.ts';

const row = (country: string, iso: string, year: string, population = '', gdp = '') => ({
  country,
  iso_code: iso,
  year,
  population,
  gdp,
  co2: '10.5',
  co2_per_capita: '',
  coal_co2: '2',
});

describe('buildIndicators', () => {
  it('groups by country id and year, with blanks as null', () => {
    expect(buildIndicators([row('Kazakhstan', 'KAZ', '2013', '17000000', '4.1e11')])).toEqual({
      KAZ: {
        2013: { population: 17e6, gdp: 4.1e11, co2: 10.5, co2PerCapita: null, coalCo2: 2 },
      },
    });
  });

  it('maps the EU aggregate to the EU id', () => {
    expect(Object.keys(buildIndicators([row('European Union (27)', '', '2020')]))).toEqual(['EU']);
  });

  it('rejects rows without a country id and malformed numbers', () => {
    expect(() => buildIndicators([row('World', '', '2020')])).toThrow(/no country id/);
    expect(() => buildIndicators([row('Iran', 'IRN', '2020', 'lots')])).toThrow(/not a number/);
  });
});
