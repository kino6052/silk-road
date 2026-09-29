import { dateToWeek, EPOCH, type CivilDate } from '../../core/calendar';
import type { Content, Country, Project } from '../../content/types';
import type { System } from '../engine/engine';
import type { CountryState, LoanState } from '../world/state';
import { spendingBn } from './bri';
import { createEconomyModel, nominalGdpBn } from './economy';

const WEEKS_PER_YEAR = 52;

export const CHINESE_LENDERS: ReadonlySet<string> = new Set([
  'china-exim',
  'cdb',
  'icbc',
  'boc',
  'ccb',
  'silk-road-fund',
  'sinosure',
  'chinese-banks',
]);

/** Interest only for five years, then equal principal instalments over fifteen. */
export const GRACE_WEEKS = 5 * WEEKS_PER_YEAR;
export const AMORTISATION_WEEKS = 15 * WEEKS_PER_YEAR;

/**
 * Annual service (interest plus maturing principal) per USD of external debt outside the loan
 * book. That debt is assumed to roll over and grow with the economy, so its service stays a
 * constant share of GDP.
 */
export const BASE_SERVICE_RATE = 0.08;

/**
 * Estimated debt distress in 2013, read off sovereign ratings and reserve cover at the time
 * (Moody's/S&P 2013; IMF Article IV reports). Each country's tolerance for debt service is
 * calibrated so its 2013 burden gives exactly this level.
 */
const BASELINE_DISTRESS: Readonly<Record<string, number>> = {
  CHN: 0.05,
  KAZ: 0.15,
  UZB: 0.2,
  RUS: 0.15,
  BLR: 0.45,
  POL: 0.05,
  DEU: 0.02,
  AZE: 0.15,
  TUR: 0.2,
  IRN: 0.3,
  PAK: 0.6,
  EGY: 0.6,
  GRC: 0.7,
  USA: 0.02,
  IND: 0.1,
  JPN: 0.03,
  SAU: 0.05,
  ARE: 0.05,
  GBR: 0.03,
};
export const DEFAULT_BASELINE_DISTRESS = 0.2;
/** Floor on the tolerance, as a share of GDP, for countries with no 2013 debt. */
const MIN_TOLERANCE = 0.005;
/** Floor on nominal GDP (USD bn) so countries without GDP data never divide by zero. */
const MIN_NOMINAL_BN = 1;

/** Distress added at full sanctions and at total instability. */
export const SANCTIONS_DISTRESS = 0.3;
export const INSTABILITY_DISTRESS = 0.3;
/** Distress an IMF programme removes from the target. */
export const IMF_RELIEF = 0.1;
/** Share of the gap to the target distress that closes each week. */
export const DISTRESS_ADJUST = 1 / WEEKS_PER_YEAR;

/** From this date the future is simulated, and renegotiations are drawn at random. */
export const HISTORY_ENDS: CivilDate = { year: 2026, month: 1, day: 1 };
export const RENEGOTIATION_THRESHOLD = 0.8;
/** Weekly chance that a borrower at or above the threshold renegotiates. */
export const RENEGOTIATION_CHANCE = 0.05;
export const RENEGOTIATION_RATE_CUT = 0.5;
/** Distress relieved at once by a renegotiation. */
export const RENEGOTIATION_RELIEF = 0.15;

interface Profile {
  readonly id: string;
  readonly index: number;
  /** Debt service outside the loan book, as a share of GDP. */
  readonly baseShare: number;
  /** Burden at which the structural distress is 0.5. */
  readonly tolerance: number;
}

const isChinese = (lenders: readonly string[]) => lenders.some((l) => CHINESE_LENDERS.has(l));

function profile(country: Country, index: number, gdp2013: number): Profile {
  const nominal = Math.max(MIN_NOMINAL_BN, nominalGdpBn(country.id, gdp2013));
  const baseShare = (BASE_SERVICE_RATE * country.externalDebtBn) / nominal;
  const baseline = BASELINE_DISTRESS[country.id] ?? DEFAULT_BASELINE_DISTRESS;
  const tolerance = Math.max(MIN_TOLERANCE, (baseShare * (1 - baseline)) / baseline);
  return { id: country.id, index, baseShare, tolerance };
}

const loanId = (project: Project) => `loan:${project.id}`;

function openLoan(project: Project, week: number): LoanState {
  return {
    id: loanId(project),
    project: project.id,
    borrower: project.country,
    lenders: [...project.lenders],
    principal: project.loanBn,
    rate: project.interestRate,
    startWeek: week,
    outstanding: project.loanBn,
  };
}

/** Lower the rate and spread what is left over a fresh amortisation period. */
function restructure(loan: LoanState, week: number): LoanState {
  return {
    ...loan,
    principal: loan.outstanding,
    rate: loan.rate * RENEGOTIATION_RATE_CUT,
    startWeek: Math.max(loan.startWeek, week - GRACE_WEEKS),
  };
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Loan book, debt service and debt distress. Runs after the economy system. Publishes, per
 * country, 'finance.debtService' and 'finance.loanService' (USD bn/yr), 'finance.burden'
 * (share of nominal GDP), 'finance.chinaDebt' (USD bn) and 'finance.renegotiation' (1 in a
 * week with a renegotiation, else 0).
 */
export function createFinanceSystem(content: Content): System {
  const economy = createEconomyModel(content);
  const profiles = content.countries.map((country, index) =>
    profile(country, index, economy.gdpAnchor(country.id, EPOCH) ?? 0),
  );
  const borrowing = content.projects.filter((project) => project.loanBn > 0);
  const envelopes = content.bri.filter(
    (envelope) => envelope.loanShare > 0 && envelope.totalBn > 0,
  );
  const historyEndWeek = dateToWeek(HISTORY_ENDS);

  return {
    id: 'finance',
    step(world, ctx) {
      const booked = new Set(world.loans.map((loan) => loan.id));
      for (const project of borrowing) {
        const status = world.projects[project.id]?.status;
        if (status !== 'construction' || booked.has(loanId(project))) continue;
        const loan = openLoan(project, ctx.week);
        world.loans.push(loan);
        const borrower = world.countries[project.country] as CountryState;
        borrower.externalDebt += loan.principal;
        if (isChinese(loan.lenders)) borrower.chinaDebt += loan.principal;
      }

      // The wider Belt and Road lends yearly, in the BRI world only.
      for (const envelope of world.bri ? envelopes : []) {
        const id = `bri:${envelope.country}:${String(ctx.date.year)}`;
        if (booked.has(id)) continue;
        const principal = spendingBn(envelope, ctx.date.year) * envelope.loanShare;
        world.loans.push({
          id,
          project: 'bri-envelope',
          borrower: envelope.country,
          lenders: ['china-exim', 'cdb'],
          principal,
          rate: envelope.rate,
          startWeek: ctx.week,
          outstanding: principal,
        });
        const borrower = world.countries[envelope.country] as CountryState;
        borrower.externalDebt += principal;
        borrower.chinaDebt += principal;
      }

      const loanService: Record<string, number> = {};
      for (const loan of world.loans) {
        const interest = (loan.outstanding * loan.rate) / WEEKS_PER_YEAR;
        const repaid =
          ctx.week - loan.startWeek >= GRACE_WEEKS
            ? Math.min(loan.outstanding, loan.principal / AMORTISATION_WEEKS)
            : 0;
        loan.outstanding -= repaid;
        const borrower = world.countries[loan.borrower] as CountryState;
        borrower.externalDebt -= repaid;
        if (isChinese(loan.lenders)) borrower.chinaDebt -= repaid;
        loanService[loan.borrower] =
          (loanService[loan.borrower] ?? 0) + (interest + repaid) * WEEKS_PER_YEAR;
      }

      for (const { id, index, baseShare, tolerance } of profiles) {
        const state = world.countries[id] as CountryState;
        const service = loanService[id] ?? 0;
        const nominal = Math.max(MIN_NOMINAL_BN, nominalGdpBn(id, state.gdp));
        const burden = baseShare + service / nominal;
        const target = clamp01(
          burden / (burden + tolerance) +
            SANCTIONS_DISTRESS * state.sanctions +
            INSTABILITY_DISTRESS * (1 - state.stability) -
            (state.imfProgram ? IMF_RELIEF : 0),
        );
        state.debtDistress =
          ctx.week === 0
            ? Math.max(target, state.debtDistress)
            : state.debtDistress + (target - state.debtDistress) * DISTRESS_ADJUST;

        const renegotiate =
          ctx.week >= historyEndWeek &&
          state.debtDistress >= RENEGOTIATION_THRESHOLD &&
          ctx.rng(index, 'renegotiate').chance(RENEGOTIATION_CHANCE);
        if (renegotiate) {
          world.loans = world.loans.map((loan) =>
            loan.borrower === id ? restructure(loan, ctx.week) : loan,
          );
          state.debtDistress -= RENEGOTIATION_RELIEF;
        }

        world.stats[`finance.debtService.${id}`] = baseShare * nominal + service;
        world.stats[`finance.loanService.${id}`] = service;
        world.stats[`finance.burden.${id}`] = burden;
        world.stats[`finance.chinaDebt.${id}`] = state.chinaDebt;
        world.stats[`finance.renegotiation.${id}`] = renegotiate ? 1 : 0;
      }
    },
  };
}
