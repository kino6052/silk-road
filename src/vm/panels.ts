import type { Content } from '../content/types';
import type { Twins } from '../sim/engine/engine';
import type { World } from '../sim/world/world';
import type { Thought } from '../gen/thoughts';
import type { Sprite } from '../gen/sprite';
import type { Scene } from '../gen/scene';
export interface Row {
  readonly key: string;
  readonly bri: number;
  readonly shadow: number;
  readonly unit: 'bn' | 'intl$' | 'share' | 'index';
}
export interface CountryVm {
  readonly id: string;
  readonly rows: readonly Row[];
}
export interface FeedItem {
  readonly week: number;
  readonly person: number;
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly tone: 'up' | 'down' | 'neutral';
}
export interface BeliefVm {
  readonly topic: string;
  readonly kind: string;
  readonly believed: number;
  readonly truth: number;
  readonly source: string;
  readonly confidence: number;
}
export interface MindVm {
  readonly id: number;
  readonly name: string;
  readonly age: number;
  readonly role: string;
  readonly culture: string;
  readonly region: string;
  readonly country: string;
  readonly alive: boolean;
  readonly wellbeing: readonly {
    readonly dimension: string;
    readonly bri: number;
    readonly shadow: number | null;
  }[];
  readonly beliefs: readonly BeliefVm[];
  readonly thoughts: readonly Thought[];
  readonly decision: {
    readonly id: string;
    readonly kind: string;
    readonly options: readonly string[];
    readonly nudge: string | null;
  } | null;
  readonly recent: readonly {
    readonly week: number;
    readonly kind: string;
    readonly detail: string;
  }[];
  readonly household: readonly { readonly id: number; readonly name: string }[];
  readonly activity: string;
  readonly festival: string | null;
  readonly sprite: Sprite;
  readonly scene: Scene;
}
const todo = (): never => {
  throw new Error('not implemented');
};
export const countryVm = (_twins: Twins, _content: Content, _country: string): CountryVm => todo();
export const feedVm = (_world: World, _content: Content, _limit: number): FeedItem[] => todo();
export const mindVm = (
  _twins: Twins,
  _content: Content,
  _person: number,
  _hourOfWeek: number,
): MindVm => todo();
export const nameOf = (
  _content: Content,
  _person: { given: string; family: string; culture: string },
): string => todo();
