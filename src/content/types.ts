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
