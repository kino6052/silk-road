import type { Content, Mode } from '../content/types';
import type { MapGrid } from '../gen/map';
import type { RoleGroup } from '../sim/people/types';
import type { World } from '../sim/world/world';
export type Overlay =
  'none' | 'income' | 'pollution' | 'unemployment' | 'china' | 'wellbeing' | 'debt';
export interface MapVm {
  readonly overlay: readonly number[];
  readonly links: readonly {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly load: number;
    readonly open: boolean;
    readonly mode: Mode;
  }[];
  readonly people: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly group: RoleGroup;
  }[];
}
export const mapVm = (
  _world: World,
  _content: Content,
  _grid: MapGrid,
  _overlay: Overlay,
): MapVm => {
  throw new Error('not implemented');
};
