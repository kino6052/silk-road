import { weekToDate, type CivilDate } from '../core/calendar';
import { required } from '../core/required';
import type { Content } from '../content/types';
import { initialState, reduce, type AppState, type Command } from '../app/state';
import type { MapGrid } from '../gen/map';
import { advanceClock, createClock, setSpeed, type Clock } from '../sim/engine/clock';
import type { Twins } from '../sim/engine/engine';
import { createSimulation, resumeSimulation, type Simulation } from '../sim/simulation';
import type { World } from '../sim/world/world';
import { mapVm, type MapVm } from '../vm/map';
import {
  countryVm,
  feedVm,
  mindVm,
  type CountryVm,
  type FeedItem,
  type MindVm,
} from '../vm/panels';

export interface Frame {
  readonly date: CivilDate;
  readonly week: number;
  readonly hour: number;
  readonly state: AppState;
  readonly map: MapVm;
  readonly country: CountryVm;
  readonly feed: readonly FeedItem[];
  readonly mind: MindVm;
}

export type Message =
  | Command
  | { readonly type: 'tick'; readonly elapsedMs: number }
  | { readonly type: 'nudge'; readonly turningPoint: string; readonly option: string }
  | { readonly type: 'save' }
  | { readonly type: 'load'; readonly text: string };

export type Reply =
  | { readonly type: 'frame'; readonly frame: Frame }
  | { readonly type: 'saved'; readonly text: string }
  | { readonly type: 'error'; readonly message: string };

export interface Core {
  handle(message: Message): Reply;
  /** The current twins, for inspection (tests, debugging); treat as read-only. */
  readonly twins: Twins;
}

interface Save {
  readonly format: number;
  readonly twins: Twins;
  readonly state: AppState;
  readonly clock: Clock;
}

const SAVE_FORMAT = 1;
const FEED_LENGTH = 30;

/** A save of the current format, or null for anything else (including malformed JSON). */
function parseSave(text: string): Save | null {
  try {
    const save = JSON.parse(text) as Save;
    return save.format === SAVE_FORMAT ? save : null;
  } catch {
    return null;
  }
}

/** The cold-open protagonist: a trucker near Khorgos if there is one, else the first adult. */
export function protagonist(world: World): number {
  const living = world.people.filter((p) => p.deathWeek === null && p.role !== 'child');
  const trucker = living.find((p) => p.region === 'KAZ-ALA' && p.role === 'truck-driver');
  return required(trucker ?? living[0], 'protagonist').id;
}

/** Owns the simulation, clock and app state; turns messages into frames of view-models. */
export function createCore(content: Content, grid: MapGrid, seed: number, people?: number): Core {
  let simulation: Simulation = createSimulation(content, {
    seed,
    ...(people === undefined ? {} : { people }),
  });
  const first = protagonist(simulation.twins.bri);
  const home = required(simulation.twins.bri.people[first], 'protagonist').region;
  let state = initialState(first, required(simulation.twins.bri.regions[home], 'region').country);
  let clock = createClock(state.speed);

  const frame = (): Reply => {
    const { twins } = simulation;
    const world = state.world === 'bri' ? twins.bri : twins.shadow;
    const hour = Math.floor(clock.hourOfWeek);
    return {
      type: 'frame',
      frame: {
        date: weekToDate(twins.bri.week),
        week: twins.bri.week,
        hour,
        state,
        map: mapVm(world, content, grid, state.overlay),
        country: countryVm(twins, content, state.country),
        feed: feedVm(world, content, FEED_LENGTH),
        mind: mindVm(twins, content, state.person, hour),
      },
    };
  };

  return {
    get twins() {
      return simulation.twins;
    },
    handle: (message) => {
      switch (message.type) {
        case 'tick': {
          const advance = advanceClock(clock, message.elapsedMs);
          clock = advance.clock;
          for (let i = 0; i < advance.weeks; i++) simulation.step();
          return frame();
        }
        case 'nudge':
          return simulation.nudge(message.turningPoint, message.option)
            ? frame()
            : { type: 'error', message: 'nudge.unavailable' };
        case 'save': {
          const save: Save = { format: SAVE_FORMAT, twins: simulation.twins, state, clock };
          return { type: 'saved', text: JSON.stringify(save) };
        }
        case 'load': {
          const save = parseSave(message.text);
          if (!save) return { type: 'error', message: 'save.invalid' };
          simulation = resumeSimulation(content, save.twins);
          ({ state, clock } = save);
          return frame();
        }
        default:
          state = reduce(state, message);
          clock = setSpeed(clock, state.speed);
          return frame();
      }
    },
  };
}
