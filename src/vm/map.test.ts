import { describe, expect, it } from 'vitest';
import type { MapGrid } from '../gen/map';
import { fixtureContent } from '../sim/testing/content.fixture';
import { createWorld } from '../sim/world/world';
import { mapVm } from './map';

const content = fixtureContent();
const grid: MapGrid = {
  west: 60,
  north: 50,
  step: 1,
  width: 20,
  height: 20,
  codes: [''],
  cells: new Uint8Array(400),
};

describe('map view-model', () => {
  const world = createWorld(content, { seed: 1, bri: true, people: 20 });

  it('scores every region for the chosen overlay in [0, 1]', () => {
    for (const overlay of [
      'income',
      'pollution',
      'unemployment',
      'china',
      'wellbeing',
      'debt',
    ] as const) {
      const vm = mapVm(world, content, grid, overlay);
      expect(vm.overlay).toHaveLength(content.regions.length);
      for (const value of vm.overlay) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    expect(mapVm(world, content, grid, 'none').overlay.every((v) => v === 0)).toBe(true);
    const region = world.regions['AAA-ONE'];
    if (region) region.pollution = 100;
    expect(mapVm(world, content, grid, 'pollution').overlay[0]).toBe(1);
  });

  it('draws links with their load and people around their region', () => {
    const link = world.links['a~b~rail'];
    if (link) Object.assign(link, { open: true, flow: 5000 });
    const vm = mapVm(world, content, grid, 'none');
    const rail = vm.links.find((l) => l.mode === 'rail');
    expect(rail).toMatchObject({ x1: 10, y1: 10, x2: 12, y2: 9, open: true });
    expect(rail?.load).toBeGreaterThan(0);
    expect(vm.people.length).toBe(world.people.filter((p) => p.deathWeek === null).length);
    for (const person of vm.people) {
      expect(Math.abs(person.x - 10)).toBeLessThan(4);
      expect(Math.abs(person.y - 10)).toBeLessThan(4);
    }
    const first = world.people[0];
    if (first) first.deathWeek = 0;
    expect(mapVm(world, content, grid, 'none').people.length).toBe(vm.people.length - 1);
  });

  it('shows neutral wellbeing for a region nobody in the sample lives in', () => {
    const empty = createWorld(content, { seed: 1, bri: true, people: 20 });
    for (const person of empty.people) if (person.region === 'AAA-TWO') person.deathWeek = 0;
    expect(
      mapVm(empty, content, grid, 'wellbeing').overlay[
        content.regions.findIndex((r) => r.id === 'AAA-TWO')
      ],
    ).toBe(0.5);
  });
});
