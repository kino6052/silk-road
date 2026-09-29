import type { Content } from '../content/types';
import type { Person } from '../sim/people/types';
import type { World } from '../sim/world/world';
export interface Thought {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}
export const thoughtsOf = (_person: Person, _world: World, _content: Content): Thought[] => {
  throw new Error('not implemented');
};
