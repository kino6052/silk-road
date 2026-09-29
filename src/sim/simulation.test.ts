import { describe, expect, it } from 'vitest';
import { fixtureContent } from './testing/content.fixture';
import { createSimulation, macroSystems, peopleSystems } from './simulation';
import { stateHash } from './world/world';

const content = fixtureContent();

describe('simulation', () => {
  it('orders the macro systems before the people systems', () => {
    expect(macroSystems(content).map((s) => s.id)).toEqual([
      'timeline',
      'projects',
      'economy',
      'finance',
      'trade',
      'labour',
      'environment',
    ]);
    expect(peopleSystems(content).map((s) => s.id)).toEqual([
      'lifecycle',
      'wellbeing',
      'beliefs',
      'decisions',
    ]);
  });

  it('uses the default sample size unless told otherwise', () => {
    expect(createSimulation(content, { seed: 1 }).twins.bri.people.length).toBeGreaterThanOrEqual(
      2000,
    );
  });

  it('steps the BRI and shadow worlds together, deterministically', () => {
    const run = () => {
      const simulation = createSimulation(content, { seed: 4, people: 60 });
      for (let i = 0; i < 16; i++) simulation.step();
      return simulation.twins;
    };
    const twins = run();
    expect(twins.bri.week).toBe(16);
    expect(twins.shadow.week).toBe(16);
    expect(stateHash(run().bri)).toBe(stateHash(twins.bri));
    expect(stateHash(twins.shadow)).not.toBe(stateHash(twins.bri));
  });

  it('mirrors nudges into the shadow world, and refuses unknown turning points', () => {
    const simulation = createSimulation(content, { seed: 4, people: 60 });
    let nudged = false;
    for (let i = 0; i < 200 && !nudged; i++) {
      simulation.step();
      const open = simulation.twins.bri.turningPoints.find((tp) => tp.chosen === null);
      if (open) nudged = simulation.nudge(open.id, open.options[1] as string);
    }
    expect(nudged).toBe(true);
    expect(simulation.twins.shadow.pendingNudges.length).toBeGreaterThan(0);
    expect(simulation.nudge('missing', 'accept')).toBe(false);
  });
});
