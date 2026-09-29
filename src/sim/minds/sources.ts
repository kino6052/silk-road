import type { Person, SourceKind } from '../people/types';
import type { TopicKind } from './topics';

export interface Audience {
  readonly age: number;
  readonly pressFreedom: number;
  readonly urban: number;
  readonly worksOnProject: boolean;
}

export function exposure(_person: Person, _audience: Audience): Record<SourceKind, number> {
  throw new Error('not implemented');
}

/** Can this source say anything about the topic? */
export function covers(_source: SourceKind, _topic: TopicKind): boolean {
  throw new Error('not implemented');
}

/** What the source reports, given the truth (0–1), before random noise. */
export function spin(
  _source: SourceKind,
  _topic: TopicKind,
  _truth: number,
  _pressFreedom: number,
): number {
  throw new Error('not implemented');
}
