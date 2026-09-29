import { describe, expect, it } from 'vitest';
import { civilFromDays, daysFromCivil, weekToDate, type CivilDate } from '../../core/calendar';
import { pow } from '../../core/fixed-math';
import type { Content, Country, IndicatorYear, Project } from '../../content/types';
import { createPipeline, createTwins, stepTwins, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import type { ActiveEffect, CountryState } from '../world/state';
import { createWorld, stateHash, type World } from '../world/world';
import {
  createEconomyModel,
  createEconomySystem,
  MAX_BRI_SHARE,
  nominalGdpBn,
  PRODUCTIVITY_CAP,
  PRODUCTIVITY_RETURN,
} from './economy';

const base = fixtureContent();
const [railAb, portB] = base.projects as [Project, Project];
const year = (gdp: number | null, population: number | null): IndicatorYear => ({
  population,
  gdp,
  co2: null,
  co2PerCapita: null,
  coalCo2: null,
});
const d = (y: number, month: number, day: number): CivilDate => ({ year: y, month, day });
const plusDays = (date: CivilDate, days: number) => civilFromDays(daysFromCivil(date) + days);

// A BRI zone in AAA that never opened: it spends over the default four-year build window.
const zone: Project = {
  ...portB,
  id: 'zone-a',
  country: 'AAA',
  region: 'AAA-REST',
  bri: true,
  costBn: 4,
  constructionStart: d(2016, 1, 4),
};

const content: Content = {
  ...base,
  countries: [...base.countries, { ...(base.countries[1] as Country), id: 'YYY' }],
  projects: [...base.projects, zone],
  indicators: {
    AAA: { 2013: year(50e9, 5e6), 2014: year(60e9, 5.1e6), 2015: year(null, 5.2e6) },
    BBB: { 2013: year(10e9, 2e6) },
    ZZZ: {},
  },
};
const model = createEconomyModel(content);
const anchor = (date: CivilDate) => model.gdpAnchor('AAA', date) as number;
const close = (actual: number | undefined, expected: number) => {
  expect((actual as number) / expected).toBeCloseTo(1, 10);
};

describe('createEconomyModel', () => {
  it('interpolates GDP linearly between mid-year observations', () => {
    expect(anchor(d(2013, 1, 1))).toBe(50e9);
    expect(anchor(d(2013, 7, 2))).toBe(50e9);
    expect(anchor(d(2014, 7, 2))).toBe(60e9);
    const from = daysFromCivil(d(2013, 7, 2));
    const share = (daysFromCivil(d(2014, 1, 1)) - from) / (daysFromCivil(d(2014, 7, 2)) - from);
    close(anchor(d(2014, 1, 1)), 50e9 + 10e9 * share);
  });

  it('grows GDP by the country trend, compounded weekly, after the data ends', () => {
    close(anchor(plusDays(d(2014, 7, 2), 7)), 60e9 * pow(1.03, 1 / 52));
    close(anchor(plusDays(d(2014, 7, 2), 364)), 60e9 * 1.03);
  });

  it('interpolates population and extends it at the last observed rate', () => {
    close(model.population('AAA', d(2014, 1, 1)), 5e6 + 0.1e6 * (183 / 365));
    expect(model.population('AAA', d(2015, 7, 2))).toBe(5.2e6);
    close(model.population('AAA', plusDays(d(2015, 7, 2), 364)), (5.2e6 * 5.2) / 5.1);
    expect(model.population('BBB', d(2030, 1, 1))).toBe(2e6);
  });

  it('has no anchor for countries without data', () => {
    expect(model.gdpAnchor('ZZZ', d(2015, 1, 1))).toBeUndefined();
    expect(model.population('YYY', d(2015, 1, 1))).toBeUndefined();
    expect(model.gdpAnchor('NOPE', d(2015, 1, 1))).toBeUndefined();
    expect(model.briContribution('ZZZ', d(2015, 1, 1))).toBe(0);
  });

  it('converts international-$ GDP to nominal USD billions with a per-country ratio', () => {
    expect(nominalGdpBn('AAA', 50e9)).toBe(25);
    expect(nominalGdpBn('PAK', 100e9)).toBeLessThan(nominalGdpBn('DEU', 100e9));
  });

  it('estimates the real BRI contribution from construction spending and operating capital', () => {
    const nominal = (date: CivilDate) => nominalGdpBn('AAA', anchor(date));
    const share = (date: CivilDate) => model.briContribution('AAA', date);
    expect(share(d(2013, 12, 30))).toBe(0);
    // rail-ab: 2 bn built over one sim year, 2014-01-06 to 2015-01-05.
    expect(share(d(2014, 6, 2))).toBeCloseTo(2 / nominal(d(2014, 6, 2)), 12);
    const operating = (date: CivilDate) => (PRODUCTIVITY_RETURN * 2) / nominal(date);
    expect(share(d(2015, 6, 1))).toBeCloseTo(operating(d(2015, 6, 1)), 12);
    // zone-a: 4 bn over four years from 2016-01-04.
    expect(share(d(2017, 1, 2))).toBeCloseTo(
      1 / nominal(d(2017, 1, 2)) + operating(d(2017, 1, 2)),
      12,
    );
    expect(share(d(2020, 6, 1))).toBeCloseTo(operating(d(2020, 6, 1)), 12);
    expect(model.briContribution('BBB', d(2014, 6, 2))).toBe(0);
  });

  it('caps the contribution', () => {
    const huge = createEconomyModel({ ...content, projects: [{ ...railAb, costBn: 1e4 }] });
    expect(huge.briContribution('AAA', d(2014, 6, 2))).toBe(MAX_BRI_SHARE);
    expect(huge.briContribution('AAA', d(2016, 6, 1))).toBe(PRODUCTIVITY_CAP);
  });
});

describe('economy system', () => {
  const pipeline = createPipeline([createEconomySystem(content)]);
  const newWorld = (bri = true) => createWorld(content, { seed: 1, bri });
  const run = (world: World, weeks: number) => {
    for (let i = 0; i < weeks; i++) stepWorld(world, pipeline);
    return world;
  };
  const aaa = (world: World) => world.countries.AAA as CountryState;

  it('tracks the historical anchor in the BRI world and publishes annualised growth', () => {
    const world = run(newWorld(), 60);
    const date = weekToDate(59);
    close(aaa(world).gdp, anchor(date));
    close(aaa(world).population, model.population('AAA', date) as number);
    const growth = pow(anchor(date) / anchor(weekToDate(58)), 52) - 1;
    expect(world.stats['economy.gdpGrowth.AAA']).toBeCloseTo(growth, 9);
    expect(world.countries.ZZZ).toMatchObject({ gdp: 0, population: 0 });
    expect(world.countries.YYY).toMatchObject({ gdp: 0, population: 0 });
    expect(world.stats['economy.gdpGrowth.ZZZ']).toBeUndefined();
  });

  it('removes the estimated BRI contribution from shadow-world GDP', () => {
    const twins = createTwins(1, (options) => createWorld(content, options));
    for (let i = 0; i < 100; i++) stepTwins(twins, pipeline);
    const date = weekToDate(99);
    const share = model.briContribution('AAA', date);
    expect(share).toBeGreaterThan(0);
    close(aaa(twins.shadow).gdp, anchor(date) * (1 - share));
    expect(aaa(twins.shadow).gdp).toBeLessThan(aaa(twins.bri).gdp);
    expect(twins.shadow.stats['economy.briContribution.AAA']).toBeCloseTo(share, 12);
    expect(twins.bri.stats['economy.briContribution.AAA']).toBeCloseTo(share, 12);
  });

  it('slows growth under sanctions, instability, trade shocks and debt distress', () => {
    const growthWith = (setup: (world: World) => void) => {
      const world = newWorld();
      setup(world);
      return run(world, 30).stats['economy.gdpGrowth.AAA'] as number;
    };
    const shock = (scope: string, untilWeek = 1000): ActiveEffect => ({
      source: 'test',
      effect: { kind: 'trade-shock', scope, factor: 0.8, weeks: 10 },
      untilWeek,
    });
    const clean = growthWith(() => undefined);
    expect(growthWith((w) => (aaa(w).sanctions = 1))).toBeLessThan(clean - 0.01);
    expect(growthWith((w) => (aaa(w).stability = 0.5))).toBeLessThan(clean);
    expect(growthWith((w) => (aaa(w).debtDistress = 0.9))).toBeLessThan(clean);
    expect(growthWith((w) => (aaa(w).debtDistress = 0.2))).toBe(clean);
    expect(growthWith((w) => (w.effects = [shock('world')]))).toBeLessThan(clean);
    expect(growthWith((w) => (w.effects = [shock('AAA')]))).toBeLessThan(clean);
    const pandemic: ActiveEffect = {
      source: 'test',
      effect: { kind: 'pandemic', severity: 1, weeks: 10 },
      untilWeek: 1000,
    };
    expect(growthWith((w) => (w.effects = [shock('BBB'), shock('AAA', 0), pandemic]))).toBe(clean);
  });

  it('is deterministic', () => {
    const hashes = () => {
      const twins = createTwins(9, (options) => createWorld(content, options));
      for (let i = 0; i < 40; i++) stepTwins(twins, pipeline);
      return [stateHash(twins.bri), stateHash(twins.shadow)];
    };
    expect(hashes()).toEqual(hashes());
  });
});
