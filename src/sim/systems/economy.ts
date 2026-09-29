import type { CivilDate } from '../../core/calendar';
import type { Content } from '../../content/types';
import type { System } from '../engine/engine';

export const PRODUCTIVITY_RETURN = 0.15;
export const PRODUCTIVITY_CAP = 0.03;
export const MAX_BRI_SHARE = 0.08;

export interface EconomyModel {
  gdpAnchor(country: string, date: CivilDate): number | undefined;
  population(country: string, date: CivilDate): number | undefined;
  briContribution(country: string, date: CivilDate): number;
}

export function nominalGdpBn(_country: string, _gdp: number): number {
  throw new Error('not implemented');
}

export function createEconomyModel(_content: Content): EconomyModel {
  throw new Error('not implemented');
}

export function createEconomySystem(_content: Content): System {
  throw new Error('not implemented');
}
