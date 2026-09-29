import type { Content } from '../../content/types';
import type { Household, Person } from './types';

export const PEOPLE_PER_WORLD = 2000;
export interface Population {
  people: Person[];
  households: Household[];
}
export function generatePopulation(_content: Content, _seed: number, _target: number): Population {
  throw new Error('not implemented');
}
