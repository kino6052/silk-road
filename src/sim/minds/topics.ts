import type { Content } from '../../content/types';
import type { World } from '../world/world';

export type TopicKind =
  'jobs' | 'pollution' | 'land' | 'danger' | 'debt' | 'economy' | 'sanctions' | 'china';

/** Topics about a person's region, the rest are about their country. */
export const REGIONAL_TOPICS: readonly TopicKind[] = [
  'jobs',
  'pollution',
  'land',
  'danger',
  'china',
];
export const NATIONAL_TOPICS: readonly TopicKind[] = ['debt', 'economy', 'sanctions'];

export const topicId = (kind: TopicKind, scope: string): string => `${kind}:${scope}`;

export function topicsFor(_region: string, _country: string): string[] {
  throw new Error('not implemented');
}

/** The actual state of every topic in this world, each 0–1. */
export function truths(_world: World, _content: Content): Map<string, number> {
  throw new Error('not implemented');
}
