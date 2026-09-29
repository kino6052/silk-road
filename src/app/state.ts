import type { Speed } from '../sim/engine/clock';
import type { Overlay } from '../vm/map';

export type Tab = 'country' | 'feed' | 'person';

/** What the player is looking at and how fast time runs. */
export interface AppState {
  readonly mode: 'micro' | 'macro';
  readonly speed: Speed;
  readonly overlay: Overlay;
  /** Which twin the map shows. */
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

/** The cold open: inside one life, in micro time. */
export function initialState(person: number, country: string): AppState {
  return {
    mode: 'micro',
    speed: 'micro',
    overlay: 'none',
    world: 'bri',
    country,
    person,
    tab: 'person',
  };
}

export function reduce(state: AppState, command: Command): AppState {
  switch (command.type) {
    case 'speed':
      return { ...state, speed: command.speed };
    case 'overlay':
      return { ...state, overlay: command.overlay };
    case 'world':
      return { ...state, world: command.world };
    case 'country':
      return { ...state, country: command.country, tab: 'country' };
    case 'person':
      return { ...state, person: command.person, tab: 'person' };
    case 'tab':
      return { ...state, tab: command.tab };
    case 'mode':
      return command.mode === 'micro'
        ? { ...state, mode: 'micro', speed: 'micro' }
        : { ...state, mode: 'macro', speed: state.speed === 'micro' ? 'week' : state.speed };
  }
}
