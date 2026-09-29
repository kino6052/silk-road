import { describe, expect, it } from 'vitest';
import type {
  Content,
  Country,
  EventEffect,
  Region,
  RouteLink,
  RouteNode,
} from '../../content/types';
import { dateToWeek, weekToDate } from '../../core/calendar';
import type { System, SystemContext } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, stateHash, type World } from '../world/world';
import { createTradeSystem, railSubsidyUsd, serviceGap } from './trade';

// A small synthetic network with real node ids, so OD pairs from the demand table apply:
// a Northern rail corridor through Russia, a Middle Corridor over the Caspian, and a sea
// route from Shanghai to Rotterdam through Suez with a longer alternative round the Cape.
const sourced = { provenance: 'estimated', source: 'trade test network' } as const;
const base = fixtureContent();
const country = (id: string): Country => ({ ...(base.countries[1] as Country), id });
const region = (id: string): Region => ({
  ...(base.regions[2] as Region),
  id,
  country: id.slice(0, 3),
});
const node = (id: string, country: string, region: string | null = null): RouteNode => ({
  id,
  kind: 'city',
  country,
  region,
  lat: 0,
  lon: 0,
  ...sourced,
});
const link = (
  from: string,
  to: string,
  mode: RouteLink['mode'],
  km: number,
  extra: Partial<RouteLink> = {},
): RouteLink => ({
  id: `${from}~${to}~${mode}`,
  from,
  to,
  mode,
  km,
  open: true,
  capacity: 1,
  handlingHours: 0,
  ...sourced,
  ...extra,
});

const content: Content = {
  ...base,
  countries: ['CHN', 'KAZ', 'RUS', 'BLR', 'AZE', 'TUR', 'DEU'].map(country),
  regions: ['CHN-CQ', 'CHN-SH', 'CHN-XJ', 'KAZ-ALA', 'KAZ-REST', 'RUS-MOW'].map(region),
  nodes: [
    node('chongqing', 'CHN', 'CHN-CQ'),
    node('shanghai', 'CHN', 'CHN-SH'),
    node('khorgos', 'CHN', 'CHN-XJ'),
    node('almaty', 'KAZ', 'KAZ-ALA'),
    node('aktau', 'KAZ'),
    node('baku-alat', 'AZE'),
    node('tbilisi', 'GEO', 'GEO-TBS'),
    node('istanbul', 'TUR'),
    node('moscow', 'RUS', 'RUS-MOW'),
    node('brest', 'BLR'),
    node('duisburg', 'DEU'),
    node('rotterdam', 'NLD'),
    node('singapore', 'SGP'),
    node('bab-el-mandeb', 'YEM'),
    node('suez-canal', 'EGY'),
    node('cape-of-good-hope', 'ZAF'),
  ],
  links: [
    link('chongqing', 'shanghai', 'rail', 1700),
    link('chongqing', 'khorgos', 'rail', 3500),
    link('chongqing', 'almaty', 'road', 4200),
    link('khorgos', 'almaty', 'rail', 400, { handlingHours: 24 }),
    link('almaty', 'moscow', 'rail', 3800),
    link('moscow', 'brest', 'rail', 1100),
    link('brest', 'duisburg', 'rail', 1300, { handlingHours: 24 }),
    link('almaty', 'aktau', 'rail', 2600),
    link('aktau', 'baku-alat', 'sea', 470, { handlingHours: 48 }),
    link('baku-alat', 'tbilisi', 'rail', 550),
    link('tbilisi', 'istanbul', 'rail', 1800),
    link('istanbul', 'duisburg', 'rail', 2500),
    link('shanghai', 'singapore', 'sea', 3900),
    link('singapore', 'bab-el-mandeb', 'sea', 6500),
    link('bab-el-mandeb', 'suez-canal', 'sea', 2300),
    link('suez-canal', 'rotterdam', 'sea', 6000),
    link('singapore', 'cape-of-good-hope', 'sea', 9700),
    link('cape-of-good-hope', 'rotterdam', 'sea', 9800),
    link('rotterdam', 'duisburg', 'rail', 220),
    link('chongqing', 'moscow', 'rail', 5000, { open: false }),
    link('almaty', 'moscow', 'pipeline', 3000),
    link('chongqing', 'nowhere', 'rail', 100),
  ],
  projects: [],
};

// Built on first use, so each test reports its own failure.
let system: System | undefined;
const trade = (): System => (system ??= createTradeSystem(content));
const contextAt = (week: number): SystemContext => ({
  week,
  date: weekToDate(week),
  rng: () => {
    throw new Error('trade draws no random numbers');
  },
});
const run = (world: World): World => {
  trade().step(world, contextAt(world.week));
  return world;
};
const worldAt = (year: number, bri = true): World => {
  const world = createWorld(content, { seed: 1, bri, people: 0 });
  world.week = Math.max(0, dateToWeek({ year, month: 7, day: 1 }));
  return world;
};
const stat = (world: World, key: string): number => world.stats[key] ?? Number.NaN;
const flow = (world: World, id: string): number => world.links[id]?.flow ?? Number.NaN;
const effect = (world: World, e: EventEffect, untilWeek = world.week + 10): void => {
  world.effects.push({ source: 'test', effect: e, untilWeek });
};
const closeBabElMandeb: EventEffect = {
  kind: 'route-disruption',
  node: 'bab-el-mandeb',
  factor: 0,
  weeks: 10,
};

const STAT_KEYS = [
  'trade.demand.teu',
  'trade.unserved.teu',
  'trade.rail.teu',
  'trade.sea.teu',
  'trade.rail.trains',
  'trade.corridor.northern',
  'trade.corridor.middle',
  'trade.suez.teu',
  'trade.cape.teu',
];

describe('trade system', () => {
  it('has the trade id and publishes every trade stat', () => {
    const world = run(worldAt(2020));
    expect(trade().id).toBe('trade');
    for (const key of STAT_KEYS) expect(stat(world, key)).toBeGreaterThanOrEqual(0);
    expect(stat(world, 'trade.rail.teu')).toBeGreaterThan(0);
    expect(stat(world, 'trade.sea.teu')).toBeGreaterThan(0);
  });

  it('serves all demand by rail or sea when routes exist', () => {
    const world = run(worldAt(2020));
    expect(stat(world, 'trade.unserved.teu')).toBe(0);
    expect(stat(world, 'trade.rail.teu') + stat(world, 'trade.sea.teu')).toBeCloseTo(
      stat(world, 'trade.demand.teu'),
    );
  });

  it('counts China–Europe trains from rail TEU to European destinations', () => {
    const world = run(worldAt(2020));
    expect(stat(world, 'trade.rail.trains')).toBeGreaterThan(0);
    expect(stat(world, 'trade.rail.trains') * 90).toBeLessThanOrEqual(
      stat(world, 'trade.rail.teu'),
    );
  });

  it('assigns flow to open links only', () => {
    const world = worldAt(2020);
    world.links['almaty~moscow~rail'] = {
      id: 'almaty~moscow~rail',
      open: false,
      capacityFactor: 1,
      flow: 7,
    };
    run(world);
    expect(flow(world, 'chongqing~moscow~rail')).toBe(0);
    expect(flow(world, 'almaty~moscow~pipeline')).toBe(0);
    expect(flow(world, 'almaty~moscow~rail')).toBe(0);
    expect(flow(world, 'khorgos~almaty~rail')).toBeGreaterThan(0);
    expect(flow(world, 'moscow~brest~rail')).toBeGreaterThan(0);
  });

  it('treats links without capacity or without state as unusable', () => {
    const world = worldAt(2020);
    (world.links['suez-canal~rotterdam~sea'] as { capacityFactor: number }).capacityFactor = 0;
    delete world.links['almaty~moscow~rail'];
    run(world);
    expect(flow(world, 'suez-canal~rotterdam~sea')).toBe(0);
    expect(stat(world, 'trade.suez.teu')).toBe(0);
    expect(stat(world, 'trade.cape.teu')).toBeGreaterThan(0);
    expect(flow(world, 'moscow~brest~rail')).toBeGreaterThan(0);
  });

  it('ships by sea without a land route and by rail without a sea route', () => {
    const world = worldAt(2020);
    (world.links['chongqing~shanghai~rail'] as { open: boolean }).open = false;
    run(world);
    expect(flow(world, 'shanghai~singapore~sea')).toBeCloseTo(stat(world, 'trade.sea.teu'));
    expect(flow(world, 'chongqing~khorgos~rail')).toBeCloseTo(stat(world, 'trade.rail.teu'));
  });

  it('leaves demand unserved when no route exists', () => {
    const world = worldAt(2020);
    for (const state of Object.values(world.links)) state.open = false;
    run(world);
    expect(stat(world, 'trade.unserved.teu')).toBeGreaterThan(0);
    expect(stat(world, 'trade.unserved.teu')).toBeCloseTo(stat(world, 'trade.demand.teu'));
    expect(stat(world, 'trade.rail.teu') + stat(world, 'trade.sea.teu')).toBe(0);
    expect(Object.values(world.links).every((state) => state.flow === 0)).toBe(true);
  });

  it('sends ships round the Cape while Bab-el-Mandeb is closed', () => {
    const open = run(worldAt(2020));
    expect(stat(open, 'trade.suez.teu')).toBeGreaterThan(0);
    expect(stat(open, 'trade.cape.teu')).toBe(0);

    const closed = worldAt(2020);
    effect(closed, closeBabElMandeb);
    run(closed);
    expect(stat(closed, 'trade.suez.teu')).toBe(0);
    expect(flow(closed, 'singapore~bab-el-mandeb~sea')).toBe(0);
    expect(stat(closed, 'trade.cape.teu')).toBeGreaterThan(0);
    expect(stat(closed, 'trade.rail.teu')).toBeGreaterThan(stat(open, 'trade.rail.teu'));
  });

  it('ignores expired disruptions, unknown nodes and unrelated effects', () => {
    const baseline = run(worldAt(2020));
    const world = worldAt(2020);
    effect(world, closeBabElMandeb, world.week);
    effect(world, { ...closeBabElMandeb, node: 'atlantis' });
    effect(world, { kind: 'pandemic', severity: 0.5, weeks: 10 });
    run(world);
    expect(world.links).toEqual(baseline.links);
    const { 'trade.drivers': _drivers, ...stats } = world.stats;
    const { 'trade.drivers': _baseline, ...expected } = baseline.stats;
    expect(stats).toEqual(expected);
  });

  it('spreads flow over alternative routes when a link is congested', () => {
    const world = worldAt(2020);
    (world.links['suez-canal~rotterdam~sea'] as { capacityFactor: number }).capacityFactor = 0.02;
    run(world);
    expect(stat(world, 'trade.suez.teu')).toBeGreaterThan(0);
    expect(stat(world, 'trade.cape.teu')).toBeGreaterThan(0);
  });

  it('diverts part of EU-bound rail from sanctioned Russia to the Middle Corridor', () => {
    const open = run(worldAt(2022));
    const sanctioned = worldAt(2022);
    (sanctioned.countries.RUS as { sanctions: number }).sanctions = 0.6;
    run(sanctioned);
    // Calibrated to 2022–23: transit wasn't banned, so only part of the traffic shifts.
    expect(stat(sanctioned, 'trade.corridor.middle')).toBeGreaterThan(
      stat(open, 'trade.corridor.middle'),
    );
    expect(flow(sanctioned, 'aktau~baku-alat~sea')).toBeGreaterThan(
      flow(open, 'aktau~baku-alat~sea'),
    );
    expect(stat(sanctioned, 'trade.corridor.northern')).toBeLessThan(
      0.9 * stat(open, 'trade.corridor.northern'),
    );
    // China–Russia cargo has no way round Russia and keeps running.
    expect(stat(sanctioned, 'trade.corridor.northern')).toBeGreaterThan(0);
    expect(stat(sanctioned, 'trade.demand.teu')).toBeLessThan(stat(open, 'trade.demand.teu'));
  });

  it('scales demand with active trade shocks', () => {
    const baseline = stat(run(worldAt(2020)), 'trade.demand.teu');
    const global = worldAt(2020);
    effect(global, { kind: 'trade-shock', scope: 'world', factor: 0.5, weeks: 10 });
    const russia = worldAt(2020);
    effect(russia, { kind: 'trade-shock', scope: 'RUS', factor: 0.5, weeks: 10 });
    effect(russia, { kind: 'trade-shock', scope: 'RUS', factor: 0.5, weeks: 10 });
    effect(russia, { kind: 'trade-shock', scope: 'world', factor: 0.1, weeks: 10 }, 0);
    expect(stat(run(global), 'trade.demand.teu')).toBeCloseTo(baseline / 2);
    const shocked = stat(run(russia), 'trade.demand.teu');
    expect(shocked).toBeLessThan(baseline);
    expect(shocked).toBeGreaterThan(baseline / 2);
  });

  it('grows demand over time', () => {
    const early = stat(run(worldAt(2014)), 'trade.demand.teu');
    const late = stat(run(worldAt(2024)), 'trade.demand.teu');
    expect(late / early).toBeGreaterThan(1.2);
  });

  it('carries less rail in the no-BRI shadow world, from the same start', () => {
    const railShare = (world: World) =>
      stat(world, 'trade.rail.teu') / stat(world, 'trade.demand.teu');
    expect(railShare(run(worldAt(2013, false)))).toBe(railShare(run(worldAt(2013, true))));
    const bri = run(worldAt(2019, true));
    const shadow = run(worldAt(2019, false));
    expect(railShare(bri)).toBeGreaterThan(railShare(shadow));
    expect(stat(bri, 'trade.rail.trains')).toBeGreaterThan(2 * stat(shadow, 'trade.rail.trains'));
  });

  it('counts region throughput once per node on each route', () => {
    const world = worldAt(2020);
    (world.regions['KAZ-REST'] as { throughput: number }).throughput = 123;
    run(world);
    const transit =
      (flow(world, 'chongqing~khorgos~rail') + flow(world, 'khorgos~almaty~rail')) / 2;
    expect(world.regions['CHN-XJ']?.throughput).toBeCloseTo(transit);
    expect(world.regions['CHN-SH']?.throughput).toBeGreaterThan(0);
    expect(world.regions['KAZ-REST']?.throughput).toBe(0);
  });

  it('is deterministic and keeps no state between worlds', () => {
    const a = run(worldAt(2021));
    const b = worldAt(2021);
    (b.countries.RUS as { sanctions: number }).sanctions = 0.8;
    effect(b, closeBabElMandeb);
    run(b);
    const again = run(worldAt(2021));
    expect(stateHash(again)).toBe(stateHash(a));
    expect(again.links).toEqual(a.links);
  });
});

describe('rail subsidy and service gap', () => {
  it('subsidises BRI rail from 2014 and phases the subsidy out after 2021', () => {
    expect(railSubsidyUsd(false, 2018)).toBe(0);
    expect(railSubsidyUsd(true, 2013.9)).toBe(0);
    const full = railSubsidyUsd(true, 2014);
    expect(full).toBeGreaterThan(0);
    expect(railSubsidyUsd(true, 2021)).toBe(full);
    expect(railSubsidyUsd(true, 2023)).toBeLessThan(full);
    expect(railSubsidyUsd(true, 2023)).toBeGreaterThan(0);
    expect(railSubsidyUsd(true, 2040)).toBe(0);
  });

  it('closes the rail service gap faster in the BRI world', () => {
    expect(serviceGap(true, 2013)).toBe(serviceGap(false, 2013));
    expect(serviceGap(true, 2020)).toBeLessThan(serviceGap(false, 2020));
    expect(serviceGap(false, 2020)).toBeLessThan(serviceGap(false, 2013));
  });
});
