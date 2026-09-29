import type { CivilDate } from '../core/calendar';

/** Where a value comes from. Shown to players as a badge. */
export type Provenance = 'historical' | 'estimated' | 'simulated';

export interface Sourced {
  readonly provenance: Provenance;
  /** URL(s) or a data/raw file reference. */
  readonly source: string;
}

export type Regime =
  'one-party' | 'authoritarian' | 'theocracy' | 'hybrid' | 'democracy' | 'monarchy' | 'bloc';

export type Bloc = 'EAEU' | 'SCO' | 'EU' | 'NATO' | 'GCC' | 'G7' | 'QUAD';

export interface Country extends Sourced {
  /** ISO 3166-1 alpha-3, or 'EU' for the European Union as a policy bloc. */
  readonly id: string;
  readonly role: 'corridor' | 'external';
  readonly regime: Regime;
  /** 0 = no press freedom, 1 = fully free (2013). */
  readonly pressFreedom: number;
  /** 0 = clean, 1 = very corrupt (2013). */
  readonly corruption: number;
  /** Bloc memberships in September 2013; later changes arrive as events. */
  readonly blocs: readonly Bloc[];
  /** Population-weighted PM2.5 in µg/m³, 2013. */
  readonly pm25: number;
  /** Gross external debt in USD billions, 2013. */
  readonly externalDebtBn: number;
  /** Long-run real GDP growth per year used once historical data ends. */
  readonly growthTrend: number;
  /** Sanctions already in force in September 2013, 0–1 (e.g. Iran). */
  readonly sanctions: number;
}

export type Religion =
  | 'folk-none'
  | 'sunni'
  | 'shia'
  | 'orthodox'
  | 'catholic'
  | 'protestant-secular'
  | 'coptic'
  | 'buddhist';

export type Festival =
  | 'spring-festival'
  | 'nowruz'
  | 'ramadan'
  | 'eid-al-fitr'
  | 'eid-al-adha'
  | 'orthodox-easter'
  | 'orthodox-christmas'
  | 'easter'
  | 'christmas'
  | 'coptic-christmas'
  | 'losar'
  | 'ashura';

export interface Culture {
  readonly id: string;
  /** BCP 47 language code of the main language. */
  readonly language: string;
  readonly religion: Religion;
  readonly festivals: readonly Festival[];
  readonly nameOrder: 'family-first' | 'given-first';
  readonly givenNames: { readonly female: readonly string[]; readonly male: readonly string[] };
  readonly familyNames: readonly string[];
}

export type Climate =
  'arid' | 'continental' | 'temperate' | 'subtropical' | 'mediterranean' | 'highland';

export interface Region extends Sourced {
  /** `<country>-<code>`; every corridor country has a `<country>-REST` region. */
  readonly id: string;
  readonly country: string;
  readonly lat: number;
  readonly lon: number;
  /** Millions of people, 2013. */
  readonly population: number;
  /** Urban share of the population, 0–1. */
  readonly urban: number;
  /** GDP per person relative to the national average (1 = average). */
  readonly income: number;
  readonly climate: Climate;
  /** Cultural groups by culture id; shares sum to 1. */
  readonly groups: Readonly<Record<string, number>>;
  /** Employment by sector; shares sum to 1. */
  readonly employment: {
    readonly agriculture: number;
    readonly industry: number;
    readonly services: number;
  };
}

// ── Route network ────────────────────────────────────────────────────────────

export type NodeKind = 'city' | 'port' | 'dry-port' | 'border' | 'chokepoint';

export interface RouteNode extends Sourced {
  readonly id: string;
  readonly kind: NodeKind;
  /** ISO3. May be a transit country outside the 13 + 7 (e.g. GEO, TKM, SGP). */
  readonly country: string;
  /** Content region id for nodes in corridor countries, otherwise null. */
  readonly region: string | null;
  readonly lat: number;
  readonly lon: number;
}

export type Mode = 'rail' | 'road' | 'sea' | 'pipeline';

export interface RouteLink extends Sourced {
  /** `${from}~${to}~${mode}` */
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly mode: Mode;
  readonly km: number;
  /** Operating in September 2013. Links built later by projects start closed. */
  readonly open: boolean;
  /** Relative capacity; 1 = a typical double-track mainline or a major shipping lane. */
  readonly capacity: number;
  /** Extra handling time in hours (border checks, gauge change, transshipment). */
  readonly handlingHours: number;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export type ProjectKind =
  | 'rail'
  | 'road'
  | 'port'
  | 'dry-port'
  | 'power-coal'
  | 'power-hydro'
  | 'power-solar'
  | 'power-wind'
  | 'power-nuclear'
  | 'pipeline'
  | 'lng'
  | 'industrial-zone'
  | 'urban'
  | 'metro';

export interface Project extends Sourced {
  readonly id: string;
  readonly kind: ProjectKind;
  readonly country: string;
  readonly region: string;
  /** Belt and Road project: removed from the no-BRI shadow world. */
  readonly bri: boolean;
  /** Main backer: a country id (e.g. 'CHN', 'JPN', 'EU') or an organisation id. */
  readonly sponsor: string;
  /** Organisation ids, e.g. 'china-exim', 'cdb', 'aiib', 'silk-road-fund', 'world-bank'. */
  readonly lenders: readonly string[];
  /** USD billions. */
  readonly costBn: number;
  readonly loanBn: number;
  /** Annual interest rate on the loan, e.g. 0.02 for 2%. */
  readonly interestRate: number;
  readonly announced: CivilDate;
  readonly constructionStart: CivilDate;
  /** Historical opening date; absent when not operating by the data cutoff. */
  readonly opened?: CivilDate;
  readonly jobs: {
    readonly construction: number;
    readonly operation: number;
    /** Share of jobs held by local (non-Chinese) workers, 0–1. */
    readonly localShare: number;
  };
  readonly co2KtPerYear: number;
  readonly landHa: number;
  readonly displacedPeople: number;
  /** Route link ids this project opens when it starts operating. */
  readonly opensLinks: readonly string[];
}

// ── Historical events ────────────────────────────────────────────────────────

export type Hazard = 'flood' | 'drought' | 'heatwave' | 'earthquake';

export type Policy =
  | 'silk-road-fund'
  | 'aiib'
  | 'green-bri'
  | 'no-new-coal-abroad'
  | 'small-and-beautiful'
  | 'uflpa-import-ban'
  | 'export-controls'
  | 'b3w'
  | 'pgii'
  | 'global-gateway'
  | 'imec'
  | 'quality-infrastructure'
  | 'debt-renegotiation'
  | 'capital-controls';

export type EventEffect =
  | { readonly kind: 'announcement'; readonly topic: string }
  | {
      readonly kind: 'sanctions';
      readonly target: string;
      readonly by: readonly string[];
      /** 0–1: share of normal trade and finance cut off. */
      readonly severity: number;
    }
  | { readonly kind: 'sanctions-eased'; readonly target: string; readonly by: readonly string[] }
  | {
      readonly kind: 'trade-shock';
      /** 'world' or a country id. */
      readonly scope: string;
      /** Multiplier on trade volume while active, e.g. 0.8. */
      readonly factor: number;
      readonly weeks: number;
    }
  | {
      readonly kind: 'route-disruption';
      /** A route node id (usually a chokepoint or border). */
      readonly node: string;
      /** Multiplier on capacity while active; 0 = closed. */
      readonly factor: number;
      readonly weeks: number;
    }
  | { readonly kind: 'tariff'; readonly by: string; readonly on: string; readonly rate: number }
  | { readonly kind: 'bloc-join' | 'bloc-leave'; readonly country: string; readonly bloc: Bloc }
  | { readonly kind: 'bri-membership'; readonly country: string; readonly joined: boolean }
  | { readonly kind: 'imf-program'; readonly country: string; readonly amountBn: number }
  | { readonly kind: 'debt-distress'; readonly country: string; readonly severity: number }
  | { readonly kind: 'policy'; readonly actor: string; readonly policy: Policy }
  | {
      readonly kind: 'disaster';
      readonly region: string;
      readonly hazard: Hazard;
      readonly severity: number;
    }
  | {
      readonly kind: 'conflict';
      readonly country: string;
      readonly severity: number;
      readonly weeks: number;
    }
  | {
      readonly kind: 'security-attack';
      readonly region: string;
      /** What was attacked, e.g. 'chinese-workers', 'port', 'convoy'. */
      readonly target: string;
      readonly severity: number;
    }
  | { readonly kind: 'pandemic'; readonly severity: number; readonly weeks: number };

export interface HistoricalEvent extends Sourced {
  readonly id: string;
  readonly date: CivilDate;
  /** Belt and Road specific: removed from the no-BRI shadow world. */
  readonly bri: boolean;
  /** Country or organisation ids involved. */
  readonly actors: readonly string[];
  readonly effects: readonly EventEffect[];
}

// ── Derived data (generated by the pipeline) ─────────────────────────────────

export interface IndicatorYear {
  readonly population: number | null;
  /** GDP in international-$ at 2011 prices (Maddison, via OWID). */
  readonly gdp: number | null;
  /** Million tonnes CO2. */
  readonly co2: number | null;
  readonly co2PerCapita: number | null;
  readonly coalCo2: number | null;
}

/** Country id → year → values. */
export type Indicators = Readonly<Record<string, Readonly<Record<string, IndicatorYear>>>>;

/** Everything static the simulation is built from. */
export interface Content {
  readonly countries: readonly Country[];
  readonly regions: readonly Region[];
  readonly cultures: readonly Culture[];
  readonly nodes: readonly RouteNode[];
  readonly links: readonly RouteLink[];
  readonly projects: readonly Project[];
  readonly events: readonly HistoricalEvent[];
  readonly indicators: Indicators;
}
