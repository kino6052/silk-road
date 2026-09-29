// The route graph in flat arrays, and a layered Dijkstra over it. Every node appears in four
// layers, so one search from an origin finds the cheapest route of each mode:
//   LAND: the land mode (rail, road, Caspian ferry) all the way;
//   PRE:  sea mode, pre-carriage by land inside the origin country to a port;
//   SEA:  sea mode, at sea (ocean links only);
//   POST: sea mode, on-carriage by land after landing at a port outside the origin country.
// A sea route cannot land and sail again, or use a domestic coastal hop to feed a long rail
// haul, so short feeder links never pass off a rail route as a sea route.
import type { Content, RouteLink } from '../../../content/types';
import {
  CAPE_NODE,
  CASPIAN_PORTS,
  LINK_COST,
  MIDDLE_CORRIDOR_NODE,
  NORTHERN_COUNTRY,
  SUEZ_NODE,
  TRADE_PARAMS,
  type LinkKind,
} from './model';

/** Route flags, set on nodes and OR-ed along a path. */
export const VIA_NORTHERN = 1;
export const VIA_MIDDLE = 2;
export const VIA_SUEZ = 4;
export const VIA_CAPE = 8;

export const LAND = 0;
export const PRE = 1;
export const SEA = 2;
export const POST = 3;
export const LAYERS = 4;
/** Next layer for [layer * 2 + (ocean link ? 1 : 0)]; -1 = not allowed. */
const NEXT_LAYER = Int8Array.of(LAND, -1, PRE, SEA, POST, SEA, POST, -1);

export interface NetLink {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly kind: LinkKind;
  readonly km: number;
  readonly capacity: number;
  /** Uncongested generalised cost: freight rate + value of time × (transit + handling). */
  readonly baseUsd: number;
  readonly crossesBorder: boolean;
}

export interface Network {
  readonly nodeIndex: ReadonlyMap<string, number>;
  readonly nodeCountry: readonly string[];
  /** Small integer per distinct country, for fast comparisons. */
  readonly nodeCountryId: Int32Array;
  readonly nodeRegion: readonly (string | null)[];
  readonly nodeFlags: Uint8Array;
  readonly links: readonly NetLink[];
  /** 1 for ocean links, else 0. */
  readonly linkSea: Uint8Array;
  /** Adjacency in compressed rows: node u's entries are adjStart[u] .. adjStart[u + 1]. */
  readonly adjStart: Int32Array;
  readonly adjLink: Int32Array;
  readonly adjTo: Int32Array;
}

const linkKind = (link: RouteLink): LinkKind | null => {
  if (link.mode === 'pipeline') return null;
  if (link.mode !== 'sea') return link.mode;
  return CASPIAN_PORTS.has(link.from) && CASPIAN_PORTS.has(link.to) ? 'ferry' : 'sea';
};

const nodeFlag = (id: string, country: string): number =>
  (country === NORTHERN_COUNTRY ? VIA_NORTHERN : 0) |
  (id === MIDDLE_CORRIDOR_NODE ? VIA_MIDDLE : 0) |
  (id === SUEZ_NODE ? VIA_SUEZ : 0) |
  (id === CAPE_NODE ? VIA_CAPE : 0);

export function buildNetwork(content: Content): Network {
  const nodeIndex = new Map(content.nodes.map((node, i) => [node.id, i]));
  const nodeCountry = content.nodes.map((node) => node.country);
  const links: NetLink[] = [];
  for (const link of content.links) {
    const from = nodeIndex.get(link.from);
    const to = nodeIndex.get(link.to);
    const kind = linkKind(link);
    if (from === undefined || to === undefined || kind === null) continue;
    const cost = LINK_COST[kind];
    const hours = link.km / cost.kmh + link.handlingHours;
    links.push({
      id: link.id,
      from,
      to,
      kind,
      km: link.km,
      capacity: link.capacity,
      baseUsd: cost.usdPerKm * link.km + TRADE_PARAMS.valueOfTimeUsd * hours,
      crossesBorder: nodeCountry[from] !== nodeCountry[to],
    });
  }
  // Compressed adjacency rows: count each node's degree, then take prefix sums.
  const nodeCount = content.nodes.length;
  const adjStart = new Int32Array(nodeCount + 1);
  for (const { from, to } of links) {
    adjStart[from + 1] = (adjStart[from + 1] as number) + 1;
    adjStart[to + 1] = (adjStart[to + 1] as number) + 1;
  }
  for (let u = 0; u < nodeCount; u++) {
    adjStart[u + 1] = (adjStart[u + 1] as number) + (adjStart[u] as number);
  }
  const fill = adjStart.slice(0, nodeCount);
  const adjLink = new Int32Array(links.length * 2);
  const adjTo = new Int32Array(links.length * 2);
  const add = (u: number, v: number, e: number): void => {
    const k = fill[u] as number;
    adjLink[k] = e;
    adjTo[k] = v;
    fill[u] = k + 1;
  };
  links.forEach(({ from, to }, e) => {
    add(from, to, e);
    add(to, from, e);
  });
  return {
    nodeIndex,
    nodeCountry,
    nodeCountryId: Int32Array.from(nodeCountry, (country) => nodeCountry.indexOf(country)),
    nodeRegion: content.nodes.map((node) => node.region),
    nodeFlags: Uint8Array.from(content.nodes, (node) => nodeFlag(node.id, node.country)),
    links,
    linkSea: Uint8Array.from(links, (link) => (link.kind === 'sea' ? 1 : 0)),
    adjStart,
    adjLink,
    adjTo,
  };
}

/** Binary min-heap of (key, value) pairs in fixed typed arrays; the caller skips stale entries. */
export class MinHeap {
  private readonly keys: Float64Array;
  private readonly values: Int32Array;
  size = 0;

  /** `capacity` bounds the number of entries held at once. */
  constructor(capacity: number) {
    this.keys = new Float64Array(capacity);
    this.values = new Int32Array(capacity);
  }

  get minKey(): number {
    return this.keys[0] as number;
  }

  push(key: number, value: number): void {
    const { keys, values } = this;
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const parentKey = keys[parent] as number;
      if (parentKey <= key) break;
      keys[i] = parentKey;
      values[i] = values[parent] as number;
      i = parent;
    }
    keys[i] = key;
    values[i] = value;
  }

  /** Removes the minimum and returns its value. The heap must not be empty. */
  pop(): number {
    const { keys, values } = this;
    const top = values[0] as number;
    const n = --this.size;
    const lastKey = keys[n] as number;
    const lastValue = values[n] as number;
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= n) break;
      if (child + 1 < n && (keys[child + 1] as number) < (keys[child] as number)) child += 1;
      if ((keys[child] as number) >= lastKey) break;
      keys[i] = keys[child] as number;
      values[i] = values[child] as number;
      i = child;
    }
    keys[i] = lastKey;
    values[i] = lastValue;
    return top;
  }
}

/** Heap capacity for shortestPaths: one entry per layered edge relaxation plus the starts. */
export const heapCapacity = (net: Network): number => (net.links.length * 2 + 1) * LAYERS;

export interface PathTree {
  /** Generalised cost to each state (node × LAYERS + layer). */
  readonly dist: Float64Array;
  readonly predLink: Int32Array;
  /** Previous state on the cheapest path; -1 at the origin. */
  readonly predState: Int32Array;
}

export const createPathTree = (nodeCount: number): PathTree => ({
  dist: new Float64Array(nodeCount * LAYERS),
  predLink: new Int32Array(nodeCount * LAYERS),
  predState: new Int32Array(nodeCount * LAYERS),
});

/** Links are bidirectional; a cost of Infinity marks an unusable link. */
export function shortestPaths(
  net: Network,
  cost: Float64Array,
  origin: number,
  tree: PathTree,
  heap: MinHeap,
): void {
  const { dist, predLink, predState } = tree;
  const { adjStart, adjLink, adjTo, linkSea, nodeCountryId } = net;
  const home = nodeCountryId[origin] as number;
  dist.fill(Number.POSITIVE_INFINITY);
  for (const layer of [LAND, PRE]) {
    const start = origin * LAYERS + layer;
    dist[start] = 0;
    predState[start] = -1;
    heap.push(0, start);
  }
  while (heap.size > 0) {
    const d = heap.minKey;
    const state = heap.pop();
    if (d > (dist[state] as number)) continue;
    const u = state >> 2;
    const layer = state & 3;
    const landing = layer === SEA && nodeCountryId[u] !== home;
    const end = adjStart[u + 1] as number;
    for (let k = adjStart[u] as number; k < end; k++) {
      const e = adjLink[k] as number;
      const v = adjTo[k] as number;
      const nextLayer = NEXT_LAYER[layer * 2 + (linkSea[e] as number)] as number;
      if (nextLayer < 0) continue;
      if (nextLayer === PRE && nodeCountryId[v] !== home) continue;
      if (layer === SEA && nextLayer === POST && !landing) continue;
      const next = v * LAYERS + nextLayer;
      const nd = d + (cost[e] as number);
      if (nd < (dist[next] as number)) {
        dist[next] = nd;
        predLink[next] = e;
        predState[next] = state;
        heap.push(nd, next);
      }
    }
  }
}
