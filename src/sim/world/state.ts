import type { Bloc, EventEffect, Policy } from '../../content/types';

export type ProjectStatus =
  'hidden' | 'planned' | 'construction' | 'operating' | 'stalled' | 'cancelled';

export interface CountryState {
  readonly id: string;
  /** People. */
  population: number;
  /** Annual GDP, international-$ (2011 prices). */
  gdp: number;
  /** Gross external debt, USD billions. */
  externalDebt: number;
  /** Part of externalDebt owed to Chinese lenders, USD billions. */
  chinaDebt: number;
  /** 0 = comfortable, 1 = default. */
  debtDistress: number;
  imfProgram: boolean;
  /** 0–1: share of normal trade and finance cut off by sanctions. */
  sanctions: number;
  /** 0 = collapse, 1 = fully stable. */
  stability: number;
  blocs: Bloc[];
  /** Policies this actor currently pursues. */
  policies: Policy[];
}

export interface Jobs {
  agriculture: number;
  industry: number;
  services: number;
  construction: number;
  logistics: number;
}

export interface RegionState {
  readonly id: string;
  readonly country: string;
  /** People. */
  population: number;
  /** People employed, by sector. */
  jobs: Jobs;
  /** 0–1 of the labour force. */
  unemployment: number;
  /** Income per person per year, international-$. */
  income: number;
  /** PM2.5, µg/m³. */
  pollution: number;
  landTakenHa: number;
  displaced: number;
  /** 0 = violent, 1 = safe. */
  security: number;
  /** −1 to 1. */
  sentiment: { china: number; government: number };
  /** Containers (TEU) per week through the region's nodes. */
  throughput: number;
}

export interface ProjectState {
  readonly id: string;
  status: ProjectStatus;
}

export interface LinkState {
  readonly id: string;
  open: boolean;
  /** Multiplier on the link's content capacity (disruptions lower it). */
  capacityFactor: number;
  /** TEU per week assigned by the trade system. */
  flow: number;
}

export interface LoanState {
  readonly id: string;
  readonly project: string;
  readonly borrower: string;
  readonly lenders: readonly string[];
  readonly principal: number;
  readonly rate: number;
  readonly startWeek: number;
  outstanding: number;
}

export interface ActiveEffect {
  readonly source: string;
  readonly effect: EventEffect;
  readonly untilWeek: number;
}
