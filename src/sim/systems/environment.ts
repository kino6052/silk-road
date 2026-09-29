import type { Content } from '../../content/types';
import type { System } from '../engine/engine';

export const COAL_PM25_HOST_PER_MT = 0.15;
export const COAL_PM25_NATIONAL_PER_MT = 0.03;
export const TRAFFIC_PM25_PER_KTEU = 0.005;

export function createEnvironmentSystem(content: Content): System {
  throw new Error(`not implemented: ${String(content.regions.length)}`);
}
