import { weekToDate, type CivilDate } from '../../core/calendar';
import { createRng, type Rng } from '../../core/rng';
import type { World, WorldOptions } from '../world/world';

export interface SystemContext {
  readonly week: number;
  readonly date: CivilDate;
  /**
   * Random stream for one entity this week, private to the calling system. `purpose`
   * separates independent draws for the same entity (e.g. 'migrate' vs 'marry').
   */
  rng(entity: number, purpose?: string): Rng;
}

/** One simulation system. Systems mutate the world they own a slice of, in pipeline order. */
export interface System {
  readonly id: string;
  step(world: World, ctx: SystemContext): void;
  /** Optional one-off pass before the first week, e.g. to give everyone initial scores. */
  prime?(world: World, ctx: SystemContext): void;
}

/** The BRI world and its no-BRI shadow, stepped together for comparison. */
export interface Twins {
  readonly bri: World;
  readonly shadow: World;
}

export function createPipeline(systems: readonly System[]): readonly System[] {
  const ids = new Set<string>();
  for (const { id } of systems) {
    if (ids.has(id)) throw new Error(`duplicate system id: ${id}`);
    ids.add(id);
  }
  return systems;
}

function contextFor(world: World, systemId: string, date: CivilDate): SystemContext {
  return {
    week: world.week,
    date,
    rng: (entity, purpose) =>
      createRng({
        seed: world.seed,
        stream: purpose === undefined ? systemId : `${systemId}:${purpose}`,
        entity,
        tick: world.week,
      }),
  };
}

/** Runs every system's prime pass once, without advancing time. */
export function primeWorld(world: World, pipeline: readonly System[]): void {
  const date = weekToDate(world.week);
  for (const system of pipeline) system.prime?.(world, contextFor(world, system.id, date));
}

export function stepWorld(world: World, pipeline: readonly System[]): void {
  const date = weekToDate(world.week);
  for (const system of pipeline) system.step(world, contextFor(world, system.id, date));
  world.week += 1;
}

export function createTwins(seed: number, create: (options: WorldOptions) => World): Twins {
  return { bri: create({ seed, bri: true }), shadow: create({ seed, bri: false }) };
}

export function stepTwins(twins: Twins, pipeline: readonly System[]): void {
  stepWorld(twins.bri, pipeline);
  stepWorld(twins.shadow, pipeline);
}
