import type { Content } from '../content/types';
import type { System, Twins } from './engine/engine';

export interface SimulationOptions {
  readonly seed: number;
  readonly people?: number;
}

export interface Simulation {
  readonly twins: Twins;
  /** Advances both worlds by one week. */
  step(): void;
  /** Whispers to a person in the BRI world and mirrors it to their shadow twin. */
  nudge(turningPoint: string, option: string): boolean;
}

export function macroSystems(_content: Content): System[] {
  throw new Error('not implemented');
}
export function peopleSystems(_content: Content): System[] {
  throw new Error('not implemented');
}
export function createSimulation(_content: Content, _options: SimulationOptions): Simulation {
  throw new Error('not implemented');
}
