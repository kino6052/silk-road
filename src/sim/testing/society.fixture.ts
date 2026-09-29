// Helpers for labour and environment tests: the tiny fixture world plus a Chinese region,
// with hand-made projects in place of the fixture's.
import type { Content, EventEffect, Project } from '../../content/types';
import { stepWorld, type System } from '../engine/engine';
import type { ProjectStatus, RegionState } from '../world/state';
import type { World } from '../world/world';
import { fixtureContent } from './content.fixture';

const sourced = { provenance: 'estimated', source: 'test fixture' } as const;

export function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('missing fixture entry');
  return value;
}

/** A BRI rail project with no jobs, land, emissions or displacement unless given. */
export const project = (id: string, region: string, extra: Partial<Project> = {}): Project => ({
  id,
  kind: 'rail',
  country: region.slice(0, 3),
  region,
  bri: true,
  sponsor: 'CHN',
  lenders: [],
  costBn: 1,
  loanBn: 0,
  interestRate: 0,
  announced: { year: 2013, month: 9, day: 2 },
  constructionStart: { year: 2013, month: 9, day: 2 },
  jobs: { construction: 0, operation: 0, localShare: 1 },
  co2KtPerYear: 0,
  landHa: 0,
  displacedPeople: 0,
  opensLinks: [],
  ...sourced,
  ...extra,
});

/** Fixture content (AAA-ONE, AAA-REST, BBB-REST) plus CHN-EAST, with the given projects. */
export function societyContent(projects: readonly Project[]): Content {
  const base = fixtureContent();
  return {
    ...base,
    countries: [...base.countries, { ...must(base.countries[1]), id: 'CHN', pm25: 60 }],
    regions: [...base.regions, { ...must(base.regions[2]), id: 'CHN-EAST', country: 'CHN' }],
    projects,
    indicators: {
      ...base.indicators,
      CHN: { 2013: { population: 1e9, gdp: 1e13, co2: null, co2PerCapita: null, coalCo2: null } },
    },
  };
}

export function setStatus(world: World, status: ProjectStatus, ...ids: string[]): void {
  for (const id of ids) {
    const state = world.projects[id];
    if (state) state.status = status;
  }
}

export function addEffect(world: World, source: string, effect: EventEffect): void {
  world.effects.push({ source, effect, untilWeek: world.week + 4 });
}

export function run(world: World, systems: readonly System[], weeks: number): void {
  for (let week = 0; week < weeks; week++) stepWorld(world, systems);
}

export const regionOf = (world: World, id: string): RegionState => must(world.regions[id]);
