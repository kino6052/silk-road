import type { Speed } from '../sim/engine/clock';
import type { Overlay } from '../vm/map';
export type Tab = 'country' | 'feed' | 'person';
export interface AppState {
  readonly mode: 'micro' | 'macro';
  readonly speed: Speed;
  readonly overlay: Overlay;
  readonly world: 'bri' | 'shadow';
  readonly country: string;
  readonly person: number;
  readonly tab: Tab;
}
export type Command =
  | { readonly type: 'speed'; readonly speed: Speed }
  | { readonly type: 'overlay'; readonly overlay: Overlay }
  | { readonly type: 'world'; readonly world: 'bri' | 'shadow' }
  | { readonly type: 'country'; readonly country: string }
  | { readonly type: 'person'; readonly person: number }
  | { readonly type: 'mode'; readonly mode: 'micro' | 'macro' }
  | { readonly type: 'tab'; readonly tab: Tab };
const todo = (): never => {
  throw new Error('not implemented');
};
export const initialState = (_person: number, _country: string): AppState => todo();
export const reduce = (_state: AppState, _command: Command): AppState => todo();
