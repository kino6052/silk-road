// Trade and logistics: weekly container demand, rail/sea mode split and route assignment.
import type { Content } from '../../content/types';
import type { System } from '../engine/engine';

export function createTradeSystem(content: Content): System {
  throw new Error(`not implemented: trade system (${String(content.links.length)} links)`);
}

export function railSubsidyUsd(bri: boolean, year: number): number {
  throw new Error(`not implemented: rail subsidy (${String(bri)}, ${String(year)})`);
}

export function serviceGap(bri: boolean, year: number): number {
  throw new Error(`not implemented: service gap (${String(bri)}, ${String(year)})`);
}
