import { civilFromDays, daysFromCivil, type CivilDate } from '../../core/calendar';
import { pow } from '../../core/fixed-math';
import { required } from '../../core/required';
import type { BriEnvelope, Content, IndicatorYear, Project } from '../../content/types';
import { capitalBn, reliability, spendingBn } from './bri';
import type { System } from '../engine/engine';
import type { CountryState } from '../world/state';
import type { World } from '../world/world';

// GDP is anchored to the historical series (which already contains the real BRI). The BRI
// world follows the anchor; the shadow world follows the anchor minus an estimate of the real
// BRI's contribution. Both then drift by an endogenous deviation driven by world state.

/** A sim year is 52 weeks, so compounding weekly for a year gives exactly (1 + g). */
const WEEKS_PER_YEAR = 52;
const DAYS_PER_YEAR = WEEKS_PER_YEAR * 7;

/**
 * Nominal USD per international-$ (2011 prices) of GDP: World Bank nominal GDP in 2013 divided
 * by the Maddison/OWID value for 2013 (estimated). It puts project costs and debt service, which
 * are in nominal USD, on the same scale as GDP.
 */
const NOMINAL_PER_INTL_DOLLAR: Readonly<Record<string, number>> = {
  CHN: 0.6,
  KAZ: 0.59,
  UZB: 0.25,
  RUS: 0.65,
  BLR: 0.42,
  POL: 0.61,
  DEU: 1.07,
  AZE: 0.47,
  TUR: 0.62,
  IRN: 0.38,
  PAK: 0.25,
  EGY: 0.29,
  GRC: 0.99,
  USA: 1.04,
  IND: 0.29,
  JPN: 1.13,
  SAU: 0.51,
  ARE: 0.64,
  GBR: 1.21,
};
const DEFAULT_NOMINAL_PER_INTL_DOLLAR = 0.5;

/** GDP gained per USD of BRI construction spending, in the year it is spent. */
export const CONSTRUCTION_MULTIPLIER = 1;
/** Output gained per year per USD of operating BRI infrastructure (return on capital). */
export const PRODUCTIVITY_RETURN = 0.15;
/** Most of GDP that operating BRI infrastructure can add. */
export const PRODUCTIVITY_CAP = 0.03;
/** Most of GDP the BRI can add in all. */
export const MAX_BRI_SHARE = 0.08;
/** Share of BRI construction spending that stays in the host economy (the rest is imports). */
export const LOCAL_SPENDING_SHARE = 0.5;
/** Share of BRI construction abroad carried out by Chinese contractors... */
export const CHINESE_CONTRACTOR_SHARE = 0.5;
/** ...and the share of that turnover that is Chinese value added. */
export const CHINESE_VALUE_ADDED = 0.4;
/** Output lost per USD of interest paid abroad on BRI loans. */
export const DEBT_SERVICE_COST = 0.5;
/** Build time assumed for projects with no historical opening date. */
export const DEFAULT_BUILD_YEARS = 4;

/** Growth lost per year at full sanctions (severity 1). */
export const SANCTIONS_DRAG = 0.03;
/** Growth lost per year per unit of lost stability. */
export const INSTABILITY_DRAG = 0.05;
/** Growth lost per year per unit of trade cut by active trade shocks. */
export const TRADE_SHOCK_DRAG = 0.1;
/** Growth lost per year per unit of debt distress above the floor. */
export const DISTRESS_DRAG = 0.03;
export const DISTRESS_DRAG_FLOOR = 0.3;
/** Share of the deviation from the anchor that closes per year. */
export const ANCHOR_PULL = 0.2;

interface Point {
  readonly year: number;
  readonly day: number;
  readonly value: number;
}

interface Series {
  readonly points: readonly Point[];
  /** Growth per year used after the last observation. */
  readonly growth: number;
}

interface BuildWindow {
  readonly start: number;
  readonly end: number;
  readonly opened: number;
  readonly costBn: number;
  readonly spendPerYear: number;
}

interface CountryModel {
  readonly id: string;
  readonly gdp: Series;
  readonly population: Series;
  /** Flagship BRI projects in the country. */
  readonly bri: readonly BuildWindow[];
  /** The rest of the BRI in the country (none for countries it doesn't reach). */
  readonly envelope: BriEnvelope | undefined;
  /** For China: every BRI project and envelope abroad, whose contracts it carries out. */
  readonly abroad: {
    readonly projects: readonly BuildWindow[];
    readonly envelopes: readonly BriEnvelope[];
  };
}

export interface EconomyModel {
  /** Historical GDP (int-$) at a date; undefined without data. */
  gdpAnchor(country: string, date: CivilDate): number | undefined;
  /** Historical population at a date; undefined without data. */
  population(country: string, date: CivilDate): number | undefined;
  /** Estimated share of historical GDP due to the real BRI (0–1). */
  briContribution(country: string, date: CivilDate): number;
}

export function nominalGdpBn(country: string, gdp: number): number {
  return (gdp * (NOMINAL_PER_INTL_DOLLAR[country] ?? DEFAULT_NOMINAL_PER_INTL_DOLLAR)) / 1e9;
}

/** Annual values stand for the middle of their year. */
const midYear = (year: number): number => daysFromCivil({ year, month: 7, day: 2 });

function observations(
  years: Readonly<Record<string, IndicatorYear>>,
  field: 'gdp' | 'population',
): Point[] {
  // Integer-like keys enumerate in ascending order, so the points come out sorted by year.
  return Object.entries(years).flatMap(([key, values]) => {
    const value = values[field];
    const year = Number(key);
    return value === null ? [] : [{ year, day: midYear(year), value }];
  });
}

/** Growth per year between the last two observations; 0 with fewer than two. */
function lastRate(points: readonly Point[]): number {
  const [prev, last] = points.slice(-2);
  return prev && last ? pow(last.value / prev.value, 1 / (last.year - prev.year)) - 1 : 0;
}

function valueAt({ points, growth }: Series, day: number): number | undefined {
  const first = points[0];
  if (first === undefined) return undefined;
  if (day <= first.day) return first.value;
  let prev = first;
  for (const point of points) {
    if (day <= point.day) {
      return prev.value + ((point.value - prev.value) * (day - prev.day)) / (point.day - prev.day);
    }
    prev = point;
  }
  return prev.value * pow(1 + growth, (day - prev.day) / DAYS_PER_YEAR);
}

function buildWindow(project: Project): BuildWindow {
  const start = daysFromCivil(project.constructionStart);
  const opened = project.opened ? daysFromCivil(project.opened) : undefined;
  const end = opened ?? start + DEFAULT_BUILD_YEARS * DAYS_PER_YEAR;
  const years = Math.max(end - start, 7) / DAYS_PER_YEAR;
  return {
    start,
    end,
    opened: opened ?? Number.POSITIVE_INFINITY,
    costBn: project.costBn,
    spendPerYear: project.costBn / years,
  };
}

/** Fractional calendar year of a day number. */
function yearOf(day: number): number {
  const { year } = civilFromDays(day);
  const start = daysFromCivil({ year, month: 1, day: 1 });
  return year + (day - start) / (daysFromCivil({ year: year + 1, month: 1, day: 1 }) - start);
}

/** Yearly spending of flagship projects under construction on `day`. */
const flagshipSpending = (projects: readonly BuildWindow[], day: number) =>
  projects.reduce((sum, p) => sum + (day >= p.start && day < p.end ? p.spendPerYear : 0), 0);

/**
 * Share of GDP due to the Belt and Road on `day`: construction spending and operating
 * capital of flagship projects and the wider envelope, the trade-cost gain as corridors
 * become reliable, minus interest paid on BRI loans. For China: value added by its
 * contractors abroad plus its own trade gain.
 */
function briShare(model: CountryModel, day: number, anchor: number): number {
  const time = yearOf(day);
  const year = Math.floor(time);
  const { envelope, abroad } = model;
  let spending = flagshipSpending(model.bri, day);
  let capital = 0;
  for (const project of model.bri) if (day >= project.opened) capital += project.costBn;
  let trade = 0;
  let interest = 0;
  if (envelope) {
    spending += spendingBn(envelope, year) * LOCAL_SPENDING_SHARE;
    const built = capitalBn(envelope, time);
    capital += built;
    trade = envelope.tradeGain * reliability(time);
    interest = envelope.rate * envelope.loanShare * built;
  }
  const contracts =
    flagshipSpending(abroad.projects, day) +
    abroad.envelopes.reduce((sum, e) => sum + spendingBn(e, year), 0);
  const contractors = contracts * CHINESE_CONTRACTOR_SHARE * CHINESE_VALUE_ADDED;
  const nominal = nominalGdpBn(model.id, anchor);
  const productivity = Math.min(PRODUCTIVITY_CAP, (PRODUCTIVITY_RETURN * capital) / nominal);
  const share =
    (CONSTRUCTION_MULTIPLIER * spending + contractors - DEBT_SERVICE_COST * interest) / nominal +
    productivity +
    trade;
  return Math.max(-MAX_BRI_SHARE, Math.min(MAX_BRI_SHARE, share));
}

const EMPTY_MODEL: CountryModel = {
  id: '',
  gdp: { points: [], growth: 0 },
  population: { points: [], growth: 0 },
  bri: [],
  envelope: undefined,
  abroad: { projects: [], envelopes: [] },
};

function countryModels(content: Content): Record<string, CountryModel> {
  return Object.fromEntries(
    content.countries.map((country) => {
      const years = content.indicators[country.id] ?? {};
      const population = observations(years, 'population');
      const model: CountryModel = {
        id: country.id,
        gdp: { points: observations(years, 'gdp'), growth: country.growthTrend },
        population: { points: population, growth: lastRate(population) },
        bri: content.projects
          .filter((project) => project.bri && project.country === country.id)
          .map(buildWindow),
        envelope: content.bri.find((envelope) => envelope.country === country.id),
        abroad:
          country.id === 'CHN'
            ? {
                projects: content.projects
                  .filter((project) => project.bri && project.country !== 'CHN')
                  .map(buildWindow),
                envelopes: content.bri.filter((envelope) => envelope.country !== 'CHN'),
              }
            : { projects: [], envelopes: [] },
      };
      return [country.id, model];
    }),
  );
}

export function createEconomyModel(content: Content): EconomyModel {
  const models = countryModels(content);
  const modelFor = (country: string) => models[country] ?? EMPTY_MODEL;
  return {
    gdpAnchor: (country, date) => valueAt(modelFor(country).gdp, daysFromCivil(date)),
    population: (country, date) => valueAt(modelFor(country).population, daysFromCivil(date)),
    briContribution: (country, date) => {
      const model = modelFor(country);
      const day = daysFromCivil(date);
      const anchor = valueAt(model.gdp, day);
      return anchor === undefined ? 0 : briShare(model, day, anchor);
    },
  };
}

/** Annual growth lost to sanctions, instability, trade shocks and debt distress (≤ 0). */
function growthDrag(state: CountryState, world: World, week: number): number {
  let tradeLost = 0;
  for (const { effect, untilWeek } of world.effects) {
    if (
      effect.kind === 'trade-shock' &&
      week < untilWeek &&
      (effect.scope === 'world' || effect.scope === state.id)
    ) {
      tradeLost += 1 - effect.factor;
    }
  }
  return -(
    SANCTIONS_DRAG * state.sanctions +
    INSTABILITY_DRAG * (1 - state.stability) +
    TRADE_SHOCK_DRAG * tradeLost +
    DISTRESS_DRAG * Math.max(0, state.debtDistress - DISTRESS_DRAG_FLOOR)
  );
}

/**
 * Weekly GDP and population. Runs before finance, which reads GDP. Publishes
 * 'economy.gdpGrowth.<country>' (annualised) and 'economy.briContribution.<country>'.
 */
export function createEconomySystem(content: Content): System {
  const models = countryModels(content);
  return {
    id: 'economy',
    step(world, ctx) {
      const today = daysFromCivil(ctx.date);
      const lastWeek = today - 7;
      for (const country of content.countries) {
        const model = models[country.id] as CountryModel;
        const state = world.countries[country.id] as CountryState;
        const population = valueAt(model.population, today);
        if (population !== undefined) state.population = population;
        const anchor = valueAt(model.gdp, today);
        if (anchor === undefined) continue;
        const share = briShare(model, today, anchor);
        const previousAnchor = valueAt(model.gdp, lastWeek) as number;
        // The shadow world has none of the real BRI's contribution.
        const baseline = (value: number, bri: number) => (world.bri ? value : value * (1 - bri));
        const previous = baseline(previousAnchor, briShare(model, lastWeek, previousAnchor));
        // The deviation is recovered from last week's GDP, so it needs no extra state.
        const deviation = ctx.week === 0 ? 0 : state.gdp / previous - 1;
        // History already contains sanctions, shocks and debt crises: drags apply after it.
        const historyEnds = required(model.gdp.points.at(-1), 'GDP history').day;
        const drag = today > historyEnds ? growthDrag(state, world, ctx.week) : 0;
        const next =
          deviation + ((1 + deviation) * drag - ANCHOR_PULL * deviation) / WEEKS_PER_YEAR;
        state.gdp = baseline(anchor, share) * (1 + next);
        const weekly = state.gdp / (previous * (1 + deviation));
        world.stats[`economy.gdpGrowth.${country.id}`] = pow(weekly, WEEKS_PER_YEAR) - 1;
        world.stats[`economy.briContribution.${country.id}`] = share;
      }
    },
  };
}
