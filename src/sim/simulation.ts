import type { Content } from '../content/types';
import { createPipeline, createTwins, stepTwins, type System, type Twins } from './engine/engine';
import { createBeliefsSystem } from './minds/beliefs';
import { createDecisionsSystem, nudge } from './minds/decisions';
import { createLifecycleSystem } from './people/lifecycle';
import { createWellbeingSystem } from './people/wellbeing';
import { createEconomySystem } from './systems/economy';
import { createEnvironmentSystem } from './systems/environment';
import { createFinanceSystem } from './systems/finance';
import { createLabourSystem } from './systems/labour';
import { createProjectsSystem } from './systems/projects';
import { createTradeSystem } from './systems/trade';
import { createTimelineSystem } from './systems/timeline';
import { createWorld } from './world/world';

export interface SimulationOptions {
  readonly seed: number;
  readonly people?: number;
}

export interface Simulation {
  readonly twins: Twins;
  /** Advances both worlds by one week. */
  step(): void;
  /** Whispers to a person in the BRI world and mirrors it to their shadow twin. */
  nudge(turningPoint: string, option: string): boolean;
}

/** Countries, regions, projects and trade, in dependency order. */
export function macroSystems(content: Content): System[] {
  return [
    createTimelineSystem(content),
    createProjectsSystem(content),
    createEconomySystem(content),
    createFinanceSystem(content),
    createTradeSystem(content),
    createLabourSystem(content),
    createEnvironmentSystem(content),
  ];
}

/** Individual lives, which read the macro state. */
export function peopleSystems(content: Content): System[] {
  return [
    createLifecycleSystem(content),
    createWellbeingSystem(content),
    createBeliefsSystem(content),
    createDecisionsSystem(content),
  ];
}

/** The BRI world and its shadow, stepped together through every system. */
export function createSimulation(content: Content, options: SimulationOptions): Simulation {
  const pipeline = createPipeline([...macroSystems(content), ...peopleSystems(content)]);
  const twins = createTwins(options.seed, (world) =>
    createWorld(content, {
      ...world,
      ...(options.people === undefined ? {} : { people: options.people }),
    }),
  );
  return {
    twins,
    step: () => {
      stepTwins(twins, pipeline);
    },
    nudge: (turningPoint, option) => {
      const mirror = nudge(twins.bri, turningPoint, option);
      if (mirror) twins.shadow.pendingNudges.push(mirror);
      return mirror !== null;
    },
  };
}
