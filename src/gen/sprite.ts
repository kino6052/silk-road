import type { Person } from '../sim/people/types';
export interface Sprite {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}
export const spriteOf = (_person: Person, _age: number, _religion: string): Sprite => {
  throw new Error('not implemented');
};
