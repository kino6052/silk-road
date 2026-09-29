import { describe, expect, it } from 'vitest';
import { dateToWeek } from '../../core/calendar';
import { createPipeline, stepWorld } from '../engine/engine';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld, type World } from '../world/world';
import { createProjectsSystem } from './projects';

const content = fixtureContent();
const pipeline = createPipeline([createProjectsSystem(content)]);

const at = (year: number, month: number, day: number, bri = true): World => {
  const world = createWorld(content, { seed: 1, bri, people: 12 });
  world.week = dateToWeek({ year, month, day });
  stepWorld(world, pipeline);
  return world;
};

describe('projects system', () => {
  it('follows the historical lifecycle dates', () => {
    expect(at(2013, 9, 2).projects['rail-ab']?.status).toBe('hidden');
    expect(at(2013, 10, 7).projects['rail-ab']?.status).toBe('planned');
    expect(at(2014, 6, 2).projects['rail-ab']?.status).toBe('construction');
    expect(at(2015, 1, 5).projects['rail-ab']?.status).toBe('operating');
  });

  it('opens the links a project builds once it operates', () => {
    expect(at(2014, 6, 2).links['a~b~rail']?.open).toBe(false);
    expect(at(2015, 2, 2).links['a~b~rail']?.open).toBe(true);
  });

  it('marks projects without an opening date as stalled after six years of construction', () => {
    expect(at(2019, 8, 26).projects['port-b']?.status).toBe('construction');
    expect(at(2019, 9, 2).projects['port-b']?.status).toBe('stalled');
  });

  it('publishes counts and leaves BRI projects out of the shadow world', () => {
    const world = at(2014, 6, 2);
    expect(world.stats['projects.construction']).toBe(2);
    expect(world.stats['projects.operating']).toBe(0);
    expect(at(2016, 1, 4, false).links['a~b~rail']?.open).toBe(false);
  });
});
