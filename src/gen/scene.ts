import type { Climate } from '../content/types';
import type { Role } from '../sim/people/types';
export interface SceneInput {
  readonly climate: Climate;
  readonly urban: number;
  readonly pollution: number;
  readonly hour: number;
  readonly role: Role;
  readonly seed: number;
}
export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}
export const sceneOf = (_input: SceneInput): Scene => {
  throw new Error('not implemented');
};
