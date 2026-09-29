import { describe, expect, it } from 'vitest';
import { dateToWeek, EPOCH, weekToDate } from '../../core/calendar';
import { pow } from '../../core/fixed-math';
import { createRng, type Rng } from '../../core/rng';
import type { Content, Country, Project } from '../../content/types';
import {
  createPipeline,
  createTwins,
  stepTwins,
  stepWorld,
  type System,
  type SystemContext,
} from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import type { CountryState, ProjectState } from '../world/state';
import { createWorld, stateHash, type World } from '../world/world';
import { createEconomyModel, createEconomySystem, nominalGdpBn } from './economy';
import {
  AMORTISATION_WEEKS,
  BASE_SERVICE_RATE,
  createFinanceSystem,
  DEFAULT_BASELINE_DISTRESS,
  DISTRESS_ADJUST,
  GRACE_WEEKS,
  HISTORY_ENDS,
  IMF_RELIEF,
  RENEGOTIATION_RATE_CUT,
} from './finance';

const base = fixtureContent();
const [railAb, portB] = base.projects as [Project, Project];
const roadA: Project = {
  ...railAb,
  id: 'road-a',
  bri: false,
  sponsor: 'world-bank',
  lenders: ['world-bank'],
  loanBn: 1,
  interestRate: 0.01,
};
const damB: Project = { ...railAb, id: 'dam-b', country: 'BBB', region: 'BBB-REST', loanBn: 2 };
const content: Content = {
  ...base,
  bri: [],
  countries: [
    ...base.countries,
    { ...(base.countries[1] as Country), id: 'PAK', externalDebtBn: 60 },
  ],
  projects: [railAb, portB, roadA, damB],
  indicators: {
    ...base.indicators,
    PAK: { 2013: { population: 180e6, gdp: 918e9, co2: null, co2PerCapita: null, coalCo2: null } },
  },
};

const finance = createFinanceSystem(content);
const newWorld = (bri = true) => createWorld(content, { seed: 1, bri, people: 0 });
const country = (world: World, id: string) => world.countries[id] as CountryState;
const build = (world: World, ...ids: string[]) => {
  for (const id of ids) (world.projects[id] as ProjectState).status = 'construction';
};
const forcedChance = (result: boolean) => (): Rng => ({
  ...createRng({ seed: 0, stream: 'test', entity: 0, tick: 0 }),
  chance: () => result,
});
const contextAt = (world: World, week: number, rng?: () => Rng): SystemContext => ({
  week,
  date: weekToDate(week),
  rng:
    rng ??
    ((entity, purpose) =>
      createRng({ seed: world.seed, stream: `finance:${String(purpose)}`, entity, tick: week })),
});
const step = (system: System, world: World, week: number, rng?: () => Rng) => {
  world.week = week;
  system.step(world, contextAt(world, week, rng));
  world.week = week + 1;
};
const run = (world: World, from: number, to: number) => {
  for (let week = from; week < to; week++) step(finance, world, week);
};

describe('finance system: loan book', () => {
  it('opens one loan per project when construction starts and books Chinese debt', () => {
    const world = newWorld();
    (world.projects['dam-b'] as ProjectState).status = 'planned';
    run(world, 0, 4);
    expect(world.loans).toEqual([]);
    build(world, 'rail-ab', 'port-b', 'road-a');
    run(world, 4, 6);
    expect(world.loans.map((loan) => loan.id)).toEqual(['loan:rail-ab', 'loan:road-a']);
    expect(world.loans[0]).toEqual({
      id: 'loan:rail-ab',
      project: 'rail-ab',
      borrower: 'AAA',
      lenders: ['china-exim'],
      principal: 1.5,
      rate: 0.02,
      startWeek: 4,
      outstanding: 1.5,
    });
    expect(country(world, 'AAA').externalDebt).toBeCloseTo(12.5, 12);
    expect(country(world, 'AAA').chinaDebt).toBe(1.5);
    expect(world.stats['finance.chinaDebt.AAA']).toBe(1.5);
    expect(world.stats['finance.loanService.AAA']).toBeCloseTo(1.5 * 0.02 + 1 * 0.01, 12);
  });

  it('only finances projects that exist in the shadow world', () => {
    const world = newWorld(false);
    build(world, 'road-a');
    run(world, 0, 2);
    expect(world.loans.map((loan) => loan.id)).toEqual(['loan:road-a']);
    expect(country(world, 'AAA')).toMatchObject({ externalDebt: 11, chinaDebt: 0 });
  });

  it('charges interest only for five years, then amortises in equal parts over fifteen', () => {
    const world = newWorld();
    build(world, 'rail-ab');
    run(world, 0, GRACE_WEEKS);
    const [loan] = world.loans;
    expect(loan?.outstanding).toBe(1.5);
    expect(world.stats['finance.loanService.AAA']).toBeCloseTo(0.03, 12);

    run(world, GRACE_WEEKS, GRACE_WEEKS + 1);
    const instalment = 1.5 / AMORTISATION_WEEKS;
    expect(loan?.outstanding).toBeCloseTo(1.5 - instalment, 12);
    expect(world.stats['finance.loanService.AAA']).toBeCloseTo(0.03 + instalment * 52, 12);
    expect(country(world, 'AAA').externalDebt).toBeCloseTo(11.5 - instalment, 12);
    expect(country(world, 'AAA').chinaDebt).toBeCloseTo(1.5 - instalment, 12);

    run(world, GRACE_WEEKS + 1, GRACE_WEEKS + AMORTISATION_WEEKS + 2);
    expect(loan?.outstanding).toBeCloseTo(0, 9);
    expect(country(world, 'AAA').externalDebt).toBeCloseTo(10, 9);
    expect(country(world, 'AAA').chinaDebt).toBeCloseTo(0, 9);
    expect(world.stats['finance.loanService.AAA']).toBeCloseTo(0, 9);
  });

  it('publishes total debt service including debt outside the loan book', () => {
    const world = newWorld();
    build(world, 'rail-ab');
    run(world, 0, 1);
    const epoch = createEconomyModel(content).gdpAnchor('AAA', EPOCH) as number;
    const baseline = (BASE_SERVICE_RATE * 10 * 25) / nominalGdpBn('AAA', epoch);
    expect(world.stats['finance.debtService.AAA']).toBeCloseTo(baseline + 0.03, 12);
  });
});

describe('finance system: debt distress', () => {
  const distressAfter = (weeks: number, setup: (world: World) => void, source = content) => {
    const system = createFinanceSystem(source);
    const world = createWorld(source, { seed: 1, bri: true, people: 0 });
    step(system, world, 0);
    setup(world);
    for (let week = 1; week <= weeks; week++) step(system, world, week);
    return country(world, 'AAA').debtDistress;
  };

  it('starts at the estimated 2013 level', () => {
    const world = newWorld();
    country(world, 'BBB').debtDistress = 0.9;
    run(world, 0, 1);
    expect(country(world, 'AAA').debtDistress).toBeCloseTo(DEFAULT_BASELINE_DISTRESS, 12);
    expect(country(world, 'PAK').debtDistress).toBeGreaterThan(0.5);
    expect(country(world, 'BBB').debtDistress).toBe(0.9);
    expect(country(world, 'ZZZ').debtDistress).toBeCloseTo(DEFAULT_BASELINE_DISTRESS, 12);
  });

  it('rises with the debt-service burden', () => {
    const heavy = { ...content, projects: [{ ...railAb, loanBn: 20, interestRate: 0.05 }] };
    const idle = distressAfter(104, () => undefined, heavy);
    const burdened = distressAfter(
      104,
      (world) => {
        build(world, 'rail-ab');
      },
      heavy,
    );
    expect(idle).toBeCloseTo(DEFAULT_BASELINE_DISTRESS, 12);
    expect(burdened).toBeGreaterThan(0.3);
  });

  it('rises under sanctions and instability', () => {
    expect(distressAfter(52, (world) => (country(world, 'AAA').sanctions = 1))).toBeGreaterThan(
      0.3,
    );
    expect(distressAfter(52, (world) => (country(world, 'AAA').stability = 0.2))).toBeGreaterThan(
      0.3,
    );
  });

  it('falls slowly under an IMF programme', () => {
    const start = (imf: boolean) => (world: World) => {
      Object.assign(country(world, 'AAA'), { debtDistress: 0.6, imfProgram: imf });
    };
    const decay = pow(1 - DISTRESS_ADJUST, 52);
    const target = DEFAULT_BASELINE_DISTRESS - IMF_RELIEF;
    expect(distressAfter(52, start(true))).toBeCloseTo(target + (0.6 - target) * decay, 9);
    expect(distressAfter(52, start(true))).toBeLessThan(distressAfter(52, start(false)));
  });
});

describe('finance system: renegotiation', () => {
  const distressed = () => {
    const world = newWorld();
    build(world, 'rail-ab', 'road-a', 'dam-b');
    run(world, 0, 1);
    country(world, 'AAA').debtDistress = 0.95;
    return world;
  };
  const after = dateToWeek(HISTORY_ENDS) + 1;

  it('restructures a distressed borrower’s loans after the historical period', () => {
    const world = distressed();
    step(finance, world, after, forcedChance(true));
    const [rail, road, dam] = world.loans;
    expect(rail).toMatchObject({
      rate: 0.02 * RENEGOTIATION_RATE_CUT,
      startWeek: after - GRACE_WEEKS,
    });
    expect(rail?.principal).toBe(rail?.outstanding);
    expect(road).toMatchObject({ rate: 0.01 * RENEGOTIATION_RATE_CUT });
    expect(dam).toMatchObject({ rate: 0.02, startWeek: 0, principal: 2 });
    expect(world.stats['finance.renegotiation.AAA']).toBe(1);
    expect(world.stats['finance.renegotiation.BBB']).toBe(0);
    expect(country(world, 'AAA').debtDistress).toBeLessThan(0.8);
  });

  it('leaves loans alone when the dice say no or history is still running', () => {
    for (const [week, chance] of [
      [after, false],
      [after - 2, true],
    ] as const) {
      const world = distressed();
      const loans = structuredClone(world.loans);
      step(finance, world, week, forcedChance(chance));
      expect(world.loans.map(({ rate, startWeek }) => [rate, startWeek])).toEqual(
        loans.map(({ rate, startWeek }) => [rate, startWeek]),
      );
      expect(world.stats['finance.renegotiation.AAA']).toBe(0);
    }
  });
});

describe('economy and finance together', () => {
  it('are deterministic across both worlds', () => {
    const pipeline = createPipeline([createEconomySystem(content), createFinanceSystem(content)]);
    const hashes = () => {
      const twins = createTwins(3, (options) => createWorld(content, { ...options, people: 0 }));
      build(twins.bri, 'rail-ab', 'road-a', 'dam-b');
      build(twins.shadow, 'road-a');
      for (let i = 0; i < 60; i++) stepTwins(twins, pipeline);
      return [stateHash(twins.bri), stateHash(twins.shadow)];
    };
    expect(hashes()).toEqual(hashes());
  });

  it('books yearly Belt and Road loans from China in the BRI world only', () => {
    const withBri = fixtureContent();
    const pipeline = createPipeline([createEconomySystem(withBri), createFinanceSystem(withBri)]);
    const run = (bri: boolean) => {
      const world = createWorld(withBri, { seed: 1, bri, people: 0 });
      for (let i = 0; i < 260; i++) stepWorld(world, pipeline);
      return world;
    };
    const bri = run(true);
    const envelopeLoans = bri.loans.filter((loan) => loan.id.startsWith('bri:AAA:'));
    expect(envelopeLoans.map((loan) => loan.id)).toEqual([
      'bri:AAA:2013',
      'bri:AAA:2014',
      'bri:AAA:2015',
      'bri:AAA:2016',
      'bri:AAA:2017',
      'bri:AAA:2018',
    ]);
    expect(bri.countries.AAA?.chinaDebt).toBeGreaterThan(2);
    expect(run(false).loans.some((loan) => loan.id.startsWith('bri:'))).toBe(false);
  });
});
