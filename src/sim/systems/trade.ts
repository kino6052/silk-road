// Trade and logistics: weekly container demand between Chinese origins and corridor
// destinations, a logit split between the land mode (rail, road, Caspian ferry) and the
// sea mode, and incremental generalised-cost assignment on the route graph. Disruptions
// close or throttle links, sanctions make shippers avoid a country, so flows reroute
// (e.g. EU-bound rail from Russia to the Middle Corridor, or ships from Suez to the Cape).
import type { Content } from '../../content/types';
import { logistic } from '../../core/fixed-math';
import type { System } from '../engine/engine';
import type { World } from '../world/world';
import {
  demandTrend,
  LINK_COST,
  OD_TABLE,
  railSubsidyUsd,
  serviceGap,
  TRADE_PARAMS,
  yearOfWeek,
  type OriginDestination,
} from './trade/model';
import {
  buildNetwork,
  createPathTree,
  heapCapacity,
  LAND,
  LAYERS,
  MinHeap,
  SEA,
  shortestPaths,
  type PathTree,
  VIA_CAPE,
  VIA_MIDDLE,
  VIA_NORTHERN,
  VIA_SUEZ,
  type Network,
} from './trade/network';

export { railSubsidyUsd, serviceGap, TRADE_PARAMS } from './trade/model';

interface ActiveOd extends OriginDestination {
  readonly origin: number;
  readonly target: number;
}

interface Totals {
  demand: number;
  rail: number;
  sea: number;
  railEurope: number;
  northern: number;
  middle: number;
  suez: number;
  cape: number;
  unserved: number;
}

/** Rail (land-mode) share of an OD from the generalised costs of both modes. */
function railShare(land: number, sea: number, subsidy: number, gap: number): number {
  if (sea === Number.POSITIVE_INFINITY) return 1;
  if (land === Number.POSITIVE_INFINITY) return 0;
  return logistic(TRADE_PARAMS.logitPerUsd * (sea - land + subsidy) - gap);
}

function activeOds(net: Network): ActiveOd[][] {
  const byOrigin = new Map<number, ActiveOd[]>();
  for (const pair of OD_TABLE) {
    const origin = net.nodeIndex.get(pair.from);
    const target = net.nodeIndex.get(pair.to);
    if (origin === undefined || target === undefined) continue;
    const list = byOrigin.get(origin) ?? [];
    list.push({ ...pair, origin, target });
    byOrigin.set(origin, list);
  }
  return [...byOrigin.values()];
}

export function createTradeSystem(content: Content): System {
  const net = buildNetwork(content);
  const origins = activeOds(net);
  const nodeCount = net.nodeCountry.length;
  const linkCount = net.links.length;
  const nodeFactor = new Float64Array(nodeCount);
  const nodeSanction = new Float64Array(nodeCount);
  const nodeThroughput = new Float64Array(nodeCount);
  const fixedCost = new Float64Array(linkCount);
  const capacityTeu = new Float64Array(linkCount);
  const cost = new Float64Array(linkCount);
  const flow = new Float64Array(linkCount);
  /** One shortest-path tree per origin, and the link costs they were searched with. */
  const trees = origins.map(() => createPathTree(nodeCount));
  const searchedCost = new Float64Array(linkCount);
  const heap = new MinHeap(heapCapacity(net));
  const odCount = origins.reduce((sum, list) => sum + list.length, 0);
  const demand = new Float64Array(odCount);

  /** Disruption and sanction state of nodes; returns trade-shock multipliers by scope. */
  function readConditions(world: World): Map<string, number> {
    nodeFactor.fill(1);
    const shocks = new Map<string, number>();
    for (const { effect, untilWeek } of world.effects) {
      if (untilWeek <= world.week) continue;
      if (effect.kind === 'route-disruption') {
        const node = net.nodeIndex.get(effect.node);
        if (node !== undefined) nodeFactor[node] = (nodeFactor[node] as number) * effect.factor;
      } else if (effect.kind === 'trade-shock') {
        shocks.set(effect.scope, (shocks.get(effect.scope) ?? 1) * effect.factor);
      }
    }
    net.nodeCountry.forEach((country, i) => {
      nodeSanction[i] = world.countries[country]?.sanctions ?? 0;
    });
    return shocks;
  }

  function linkCosts(world: World): void {
    const { sanctionUsdPerKm, sanctionUsdPerBorder, disruptionRiskUsd } = TRADE_PARAMS;
    net.links.forEach((link, e) => {
      const state = world.links[link.id];
      const disruption = (nodeFactor[link.from] as number) * (nodeFactor[link.to] as number);
      const severity = Math.max(nodeSanction[link.from] as number, nodeSanction[link.to] as number);
      const sanction =
        severity * (sanctionUsdPerKm * link.km + (link.crossesBorder ? sanctionUsdPerBorder : 0));
      fixedCost[e] = link.baseUsd + disruptionRiskUsd * (1 - disruption) + sanction;
      capacityTeu[e] =
        state?.open === true
          ? link.capacity * state.capacityFactor * disruption * LINK_COST[link.kind].teuPerCapacity
          : 0;
    });
  }

  function congestedCosts(): void {
    for (let e = 0; e < linkCount; e++) {
      const capacity = capacityTeu[e] as number;
      const ratio = (flow[e] as number) / capacity;
      const squared = ratio * ratio;
      cost[e] =
        capacity > 0
          ? (fixedCost[e] as number) + TRADE_PARAMS.congestionUsd * squared * squared
          : Number.POSITIVE_INFINITY;
    }
  }

  /** True when congestion moved some link cost enough to change routes since the last search. */
  function costsMoved(): boolean {
    for (let e = 0; e < linkCount; e++) {
      if ((cost[e] as number) - (searchedCost[e] as number) > TRADE_PARAMS.rerouteUsd) return true;
    }
    return false;
  }

  /** Loads `teu` on the path to `target` in `tree`; returns the route flags of the path. */
  function load(tree: PathTree, target: number, teu: number): number {
    const { predLink, predState } = tree;
    let flags = 0;
    for (let state = target; state >= 0; state = predState[state] as number) {
      const node = state >> 2;
      nodeThroughput[node] = (nodeThroughput[node] as number) + teu;
      flags |= net.nodeFlags[node] as number;
      if ((predState[state] as number) >= 0) {
        const e = predLink[state] as number;
        flow[e] = (flow[e] as number) + teu;
      }
    }
    return flags;
  }

  /** This week's demand of an OD pair; readConditions() must have run. */
  function demandOf(pair: ActiveOd, trend: number, shocks: Map<string, number>): number {
    const { sanctionDemandCut } = TRADE_PARAMS;
    const scope = (node: number): number => shocks.get(net.nodeCountry[node] as string) ?? 1;
    const cut = (node: number): number => 1 - sanctionDemandCut * (nodeSanction[node] as number);
    const shock = (shocks.get('world') ?? 1) * scope(pair.origin) * scope(pair.target);
    return pair.teu * trend * shock * cut(pair.origin) * cut(pair.target);
  }

  function assign(world: World, totals: Totals): void {
    const year = yearOfWeek(world.week);
    const trend = demandTrend(year);
    const subsidy = railSubsidyUsd(world.bri, year);
    const gap = serviceGap(world.bri, year);
    const shocks = readConditions(world);
    linkCosts(world);
    const slices = TRADE_PARAMS.loadingSlices;
    for (let slice = 0; slice < slices; slice++) {
      congestedCosts();
      const search = slice === 0 || costsMoved();
      if (search) searchedCost.set(cost);
      let od = 0;
      origins.forEach((list, i) => {
        const tree = trees[i] as PathTree;
        if (search) shortestPaths(net, cost, (list[0] as ActiveOd).origin, tree, heap);
        for (const pair of list) {
          const landState = pair.target * LAYERS + LAND;
          const atSea = pair.target * LAYERS + SEA;
          const seaState =
            (tree.dist[atSea] as number) <= (tree.dist[atSea + 1] as number) ? atSea : atSea + 1;
          if (slice === 0) {
            demand[od] = demandOf(pair, trend, shocks);
            totals.demand += demand[od] as number;
          }
          // Each slice splits by mode on the current, congested costs.
          const landCost = tree.dist[landState] as number;
          const seaCost = tree.dist[seaState] as number;
          const part = (demand[od++] as number) / slices;
          if (Math.min(landCost, seaCost) === Number.POSITIVE_INFINITY) {
            totals.unserved += part;
            continue;
          }
          const newRail = pair.market !== 'other';
          const rail =
            part * railShare(landCost, seaCost, newRail ? subsidy : 0, newRail ? gap : 0);
          const sea = part - rail;
          if (rail > 0) {
            const flags = load(tree, landState, rail);
            totals.rail += rail;
            if (pair.market === 'europe') totals.railEurope += rail;
            if (flags & VIA_NORTHERN) totals.northern += rail;
            if (flags & VIA_MIDDLE) totals.middle += rail;
          }
          if (sea > 0) {
            const flags = load(tree, seaState, sea);
            totals.sea += sea;
            if (flags & VIA_SUEZ) totals.suez += sea;
            if (flags & VIA_CAPE) totals.cape += sea;
          }
        }
      });
    }
  }

  function publish(world: World, totals: Totals): void {
    for (const state of Object.values(world.links)) state.flow = 0;
    net.links.forEach((link, e) => {
      const state = world.links[link.id];
      if (state) state.flow = flow[e] as number;
    });
    for (const region of Object.values(world.regions)) region.throughput = 0;
    net.nodeRegion.forEach((id, i) => {
      const region = id === null ? undefined : world.regions[id];
      if (region) region.throughput += nodeThroughput[i] as number;
    });
    const { stats } = world;
    stats['trade.demand.teu'] = totals.demand;
    stats['trade.unserved.teu'] = totals.unserved;
    stats['trade.rail.teu'] = totals.rail;
    stats['trade.sea.teu'] = totals.sea;
    stats['trade.rail.trains'] = totals.railEurope / TRADE_PARAMS.teuPerTrain;
    stats['trade.corridor.northern'] = totals.northern;
    stats['trade.corridor.middle'] = totals.middle;
    stats['trade.suez.teu'] = totals.suez;
    stats['trade.cape.teu'] = totals.cape;
  }

  return {
    id: 'trade',
    step(world) {
      flow.fill(0);
      nodeThroughput.fill(0);
      const totals: Totals = {
        demand: 0,
        rail: 0,
        sea: 0,
        railEurope: 0,
        northern: 0,
        middle: 0,
        suez: 0,
        cape: 0,
        unserved: 0,
      };
      assign(world, totals);
      publish(world, totals);
    },
  };
}
