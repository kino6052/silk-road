import type { Content, Mode } from '../content/types';
import { hashWords } from '../core/hash';
import { required } from '../core/required';
import { project, type MapGrid } from '../gen/map';
import { ROLE_GROUP } from '../sim/people/roles';
import type { RoleGroup } from '../sim/people/types';
import type { World } from '../sim/world/world';

export type Overlay =
  'none' | 'income' | 'pollution' | 'unemployment' | 'china' | 'wellbeing' | 'debt';

export interface LinkVm {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** Freight flow relative to a busy corridor, 0–1. */
  readonly load: number;
  readonly open: boolean;
  readonly mode: Mode;
}

export interface PersonDot {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly group: RoleGroup;
}

export interface MapVm {
  /** Overlay value per content region (same order), 0–1. */
  readonly overlay: readonly number[];
  readonly links: readonly LinkVm[];
  readonly people: readonly PersonDot[];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const BUSY_LINK_TEU = 20_000;
const INCOME_LOW = Math.log(1000);
const INCOME_SPAN = Math.log(60_000) - INCOME_LOW;
/** People are scattered up to ±3 cells around their region's centre. */
const SCATTER = 6;

function overlayValue(world: World, region: string, country: string, overlay: Overlay): number {
  const state = world.regions[region];
  if (!state || overlay === 'none') return 0;
  switch (overlay) {
    case 'income':
      return clamp01((Math.log(Math.max(1, state.income)) - INCOME_LOW) / INCOME_SPAN);
    case 'pollution':
      return clamp01(state.pollution / 100);
    case 'unemployment':
      return clamp01(state.unemployment / 0.3);
    case 'china':
      return clamp01((state.sentiment.china + 1) / 2);
    case 'debt':
      return clamp01(required(world.countries[country], 'country state').debtDistress);
    case 'wellbeing': {
      const residents = world.people.filter((p) => p.deathWeek === null && p.region === region);
      if (residents.length === 0) return 0.5;
      const total = residents.reduce(
        (sum, p) => sum + Object.values(p.wellbeing).reduce((a, b) => a + b, 0) / 6,
        0,
      );
      return clamp01(total / residents.length);
    }
  }
}

/** What the macro map shows this frame: overlay by region, freight on links, people. */
export function mapVm(world: World, content: Content, grid: MapGrid, overlay: Overlay): MapVm {
  const nodes = new Map(content.nodes.map((node) => [node.id, project(grid, node.lon, node.lat)]));
  const centres = new Map(content.regions.map((r) => [r.id, project(grid, r.lon, r.lat)]));
  return {
    overlay: content.regions.map((region) =>
      overlayValue(world, region.id, region.country, overlay),
    ),
    links: content.links.flatMap((link) => {
      const from = required(nodes.get(link.from), `node ${link.from}`);
      const to = required(nodes.get(link.to), `node ${link.to}`);
      const state = required(world.links[link.id], `link ${link.id}`);
      return [
        {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          load: clamp01(state.flow / BUSY_LINK_TEU),
          open: state.open,
          mode: link.mode,
        },
      ];
    }),
    people: world.people.flatMap((person) => {
      const centre = centres.get(person.region);
      if (person.deathWeek !== null || !centre) return [];
      const jitter = hashWords([person.id]);
      return [
        {
          id: person.id,
          x: centre.x + ((jitter & 255) / 255 - 0.5) * SCATTER,
          y: centre.y + (((jitter >>> 8) & 255) / 255 - 0.5) * SCATTER,
          group: ROLE_GROUP[person.role],
        },
      ];
    }),
  };
}
