import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { COUNTRIES } from './countries';
import { CULTURES } from './cultures';
import { REGIONS } from './regions';

const catalog: Record<string, string> = en;
const ids = <T extends { id: string }>(items: readonly T[]) => items.map((item) => item.id);
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const unit = (value: number) => value >= 0 && value <= 1;

describe('countries', () => {
  it('are the 13 corridor countries and 7 external powers', () => {
    const byRole = (role: string) =>
      COUNTRIES.filter((c) => c.role === role)
        .map((c) => c.id)
        .sort();
    expect(byRole('corridor')).toEqual([
      'AZE',
      'BLR',
      'CHN',
      'DEU',
      'EGY',
      'GRC',
      'IRN',
      'KAZ',
      'PAK',
      'POL',
      'RUS',
      'TUR',
      'UZB',
    ]);
    expect(byRole('external')).toEqual(['ARE', 'EU', 'GBR', 'IND', 'JPN', 'SAU', 'USA']);
  });

  it('have indices in [0, 1], sources and names', () => {
    for (const country of COUNTRIES) {
      expect(unit(country.pressFreedom) && unit(country.corruption), country.id).toBe(true);
      expect(country.source, country.id).not.toBe('');
      expect(catalog[`country.${country.id}`], country.id).toBeTruthy();
    }
  });
});

describe('cultures', () => {
  it('have unique ids, names to draw from and a display name', () => {
    expect(new Set(ids(CULTURES)).size).toBe(CULTURES.length);
    for (const culture of CULTURES) {
      expect(culture.givenNames.female.length, culture.id).toBeGreaterThanOrEqual(5);
      expect(culture.givenNames.male.length, culture.id).toBeGreaterThanOrEqual(5);
      expect(culture.familyNames.length, culture.id).toBeGreaterThanOrEqual(5);
      expect(catalog[`culture.${culture.id}`], culture.id).toBeTruthy();
    }
  });
});

describe('regions', () => {
  const cultureIds = new Set(ids(CULTURES));
  const corridor = COUNTRIES.filter((c) => c.role === 'corridor').map((c) => c.id);

  it('have unique ids and belong to corridor countries, each with a REST region', () => {
    expect(new Set(ids(REGIONS)).size).toBe(REGIONS.length);
    for (const region of REGIONS) expect(corridor, region.id).toContain(region.country);
    for (const country of corridor) {
      expect(ids(REGIONS), country).toContain(`${country}-REST`);
      expect(REGIONS.filter((r) => r.country === country).length, country).toBeGreaterThanOrEqual(
        2,
      );
    }
  });

  it('have consistent shares, plausible coordinates, sources and names', () => {
    for (const region of REGIONS) {
      const groups = Object.entries(region.groups);
      expect(sum(groups.map(([, share]) => share)), region.id).toBeCloseTo(1, 9);
      for (const [culture] of groups) expect(cultureIds, region.id).toContain(culture);
      expect(sum(Object.values(region.employment)), region.id).toBeCloseTo(1, 9);
      expect(unit(region.urban) && region.population > 0 && region.income > 0, region.id).toBe(
        true,
      );
      expect(
        region.lat > 20 && region.lat < 60 && region.lon > 0 && region.lon < 125,
        region.id,
      ).toBe(true);
      expect(region.source, region.id).not.toBe('');
      expect(catalog[`region.${region.id}`], region.id).toBeTruthy();
    }
  });

  it('add up to plausible national populations (millions, 2013)', () => {
    const population = (country: string) =>
      sum(REGIONS.filter((r) => r.country === country).map((r) => r.population));
    expect(population('CHN')).toBeCloseTo(1360.7, 0);
    expect(population('PAK')).toBeCloseTo(182, 0);
    expect(population('DEU')).toBeCloseTo(80.6, 0);
  });
});
