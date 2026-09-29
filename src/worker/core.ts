import type { CivilDate } from '../core/calendar';
import type { Content } from '../content/types';
import type { AppState, Command } from '../app/state';
import type { MapGrid } from '../gen/map';
import type { MapVm } from '../vm/map';
import type { CountryVm, FeedItem, MindVm } from '../vm/panels';
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
}
export const createCore = (
  _content: Content,
  _grid: MapGrid,
  _seed: number,
  _people?: number,
): Core => {
  throw new Error('not implemented');
};
