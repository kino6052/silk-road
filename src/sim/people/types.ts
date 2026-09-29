export type Role =
  | 'child'
  | 'student'
  | 'homemaker'
  | 'retiree'
  | 'unemployed'
  | 'farmer'
  | 'herder'
  | 'fisher'
  | 'factory-worker'
  | 'miner'
  | 'construction-worker'
  | 'engineer'
  | 'truck-driver'
  | 'rail-worker'
  | 'dockworker'
  | 'sailor'
  | 'market-trader'
  | 'shopkeeper'
  | 'teacher'
  | 'nurse'
  | 'office-worker'
  | 'entrepreneur'
  | 'customs-officer'
  | 'local-official'
  | 'bank-analyst'
  | 'port-manager';

/** The four kinds of people the player can follow. */
export type RoleGroup = 'transport' | 'locals' | 'builders' | 'officials';

/** Personality, each 0–1. */
export interface Traits {
  readonly openness: number;
  readonly risk: number;
  /** Deference to authority. */
  readonly conformity: number;
  readonly honesty: number;
  readonly ambition: number;
}

/** Six dimensions of a life, each 0–1. */
export interface Wellbeing {
  income: number;
  health: number;
  security: number;
  freedom: number;
  belonging: number;
  outlook: number;
}

export type LifeEventKind =
  | 'married'
  | 'child-born'
  | 'job'
  | 'job-lost'
  | 'retired'
  | 'moved'
  | 'displaced'
  | 'widowed'
  | 'decided'
  | 'died';

export interface LifeEvent {
  readonly week: number;
  readonly kind: LifeEventKind;
  /** Related person id, role or region, depending on the kind. */
  readonly detail: string;
}

export interface Person {
  readonly id: number;
  household: number;
  region: string;
  readonly birthRegion: string;
  readonly culture: string;
  readonly sex: 'f' | 'm';
  readonly birthWeek: number;
  deathWeek: number | null;
  readonly given: string;
  family: string;
  role: Role;
  /** Personal income per year, international-$. */
  income: number;
  readonly education: number;
  /** Seed for procedural appearance, shared look within families comes from parents. */
  readonly genes: number;
  readonly traits: Traits;
  wellbeing: Wellbeing;
  spouse: number | null;
  readonly mother: number | null;
  readonly father: number | null;
  /** Most recent life events, newest last, capped in length. */
  log: LifeEvent[];
  /** What this person believes, by topic id (see sim/minds/topics). */
  beliefs: Record<string, Belief>;
}

export type SourceKind =
  'state-media' | 'independent-media' | 'social-media' | 'word-of-mouth' | 'employer' | 'own-eyes';

export interface Belief {
  /** 0–1, meaning depends on the topic (e.g. 'the air is bad'). */
  value: number;
  /** 0–1. */
  confidence: number;
  /** Where they last heard about it. */
  source: SourceKind;
  /** Week of the last update. */
  since: number;
}

export interface Household {
  readonly id: number;
  region: string;
  /** Living members. */
  members: number[];
  /** Savings, international-$. */
  wealth: number;
  landHa: number;
}
