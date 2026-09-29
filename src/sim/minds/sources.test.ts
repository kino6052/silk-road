import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../testing/content.fixture';
import { createWorld } from '../world/world';
import { covers, exposure, spin } from './sources';

const person = createWorld(fixtureContent(), { seed: 1, bri: true, people: 12 }).people[0];
if (!person) throw new Error('fixture');
const traits = (overrides: Partial<typeof person.traits>) => ({
  ...person,
  traits: { ...person.traits, ...overrides },
});

describe('information sources', () => {
  it('expose the young to social media and the old to state media', () => {
    const young = exposure(person, { age: 22, pressFreedom: 0.5, urban: 1, worksOnProject: false });
    const old = exposure(person, { age: 70, pressFreedom: 0.5, urban: 1, worksOnProject: false });
    expect(young['social-media']).toBeGreaterThan(old['social-media']);
    expect(old['state-media']).toBeGreaterThan(young['state-media']);
  });

  it('give independent media reach only where the press is free, employers only to project workers', () => {
    const open = exposure(traits({ openness: 1 }), {
      age: 40,
      pressFreedom: 0.9,
      urban: 0.5,
      worksOnProject: true,
    });
    const closed = exposure(traits({ openness: 1 }), {
      age: 40,
      pressFreedom: 0.05,
      urban: 0.5,
      worksOnProject: false,
    });
    expect(open['independent-media']).toBeGreaterThan(closed['independent-media']);
    expect(open.employer).toBeGreaterThan(0);
    expect(closed.employer).toBe(0);
    for (const weight of Object.values(open)) expect(weight).toBeGreaterThanOrEqual(0);
  });

  it('let your own eyes see local things but not national debt', () => {
    expect(covers('own-eyes', 'pollution')).toBe(true);
    expect(covers('own-eyes', 'debt')).toBe(false);
    expect(covers('employer', 'jobs')).toBe(true);
    expect(covers('employer', 'sanctions')).toBe(false);
    expect(covers('state-media', 'debt')).toBe(true);
  });

  it('spin the truth: state media downplays harm where the press is unfree', () => {
    expect(spin('state-media', 'pollution', 0.8, 0.1)).toBeLessThan(0.8);
    expect(spin('state-media', 'china', 0.5, 0.1)).toBeGreaterThan(0.5);
    expect(spin('state-media', 'pollution', 0.8, 1)).toBeCloseTo(0.8, 9);
    expect(spin('independent-media', 'china', 0.5, 0.9)).toBeLessThan(0.5);
    expect(spin('social-media', 'land', 0.4, 0.5)).toBeGreaterThan(0.4);
    expect(spin('employer', 'jobs', 0.4, 0.5)).toBeGreaterThan(0.4);
    expect(spin('own-eyes', 'pollution', 0.8, 0)).toBe(0.8);
    expect(spin('word-of-mouth', 'danger', 0.6, 0)).toBe(0.6);
    expect(spin('state-media', 'pollution', 0.05, 0)).toBeGreaterThanOrEqual(0);
    expect(spin('state-media', 'china', 0.95, 0)).toBeLessThanOrEqual(1);
  });
});
