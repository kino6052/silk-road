import { createRng } from '../core/rng';
import type { Climate } from '../content/types';
import type { Role } from '../sim/people/types';
import { SCENE } from './palette';

export interface SceneInput {
  readonly climate: Climate;
  /** Urban share of the region, 0–1. */
  readonly urban: number;
  /** PM2.5, µg/m³. */
  readonly pollution: number;
  /** Hour of day, 0–23. */
  readonly hour: number;
  readonly role: Role;
  readonly seed: number;
}

export interface Scene {
  readonly width: number;
  readonly height: number;
  /** SCENE_PALETTE indices, row-major. */
  readonly pixels: Uint8Array;
}

const WIDTH = 160;
const HEIGHT = 90;
const HORIZON = 60;
const PORT_ROLES = new Set<Role>(['dockworker', 'sailor', 'fisher', 'port-manager']);
const FIELD_ROLES = new Set<Role>(['farmer', 'herder']);
const MARKET_ROLES = new Set<Role>(['market-trader', 'shopkeeper']);

/** A side-view vignette of a person's world: sky, smog, hills, town, ground and work. */
export function sceneOf(input: SceneInput): Scene {
  const pixels = new Uint8Array(WIDTH * HEIGHT);
  const rng = createRng({ seed: input.seed, stream: 'scene', entity: 0, tick: 0 });
  const rect = (x0: number, y0: number, x1: number, y1: number, colour: number) => {
    for (let y = Math.max(0, y0); y <= Math.min(HEIGHT - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(WIDTH - 1, x1); x++)
        pixels[y * WIDTH + x] = colour;
    }
  };
  const night = input.hour < 6 || input.hour >= 20;
  const smog = Math.min(0.8, input.pollution / 150);
  // Sky, with stars at night and smog that thickens toward the horizon.
  for (let y = 0; y < HORIZON; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const haze = smog * (0.4 + (0.6 * y) / HORIZON);
      const sky = night ? (y < 30 ? 4 : 5) : Math.min(3, Math.floor((y / HORIZON) * 4));
      const star = night && (x * 37 + y * 11) % 97 === 0;
      pixels[y * WIDTH + x] = (x * 31 + y * 17) % 100 < haze * 100 ? SCENE.smog : star ? 6 : sky;
    }
  }
  rect(130, 8, 136, 14, night ? 8 : 7);
  // Hills.
  const hill =
    input.climate === 'arid' || input.climate === 'mediterranean'
      ? 10
      : input.climate === 'highland'
        ? 12
        : 11;
  for (let x = 0; x < WIDTH; x += 8)
    rect(x, HORIZON - 4 - rng.int(0, 14), x + 7, HORIZON - 1, hill);
  // Ground and road.
  rect(0, HORIZON, WIDTH - 1, HEIGHT - 1, input.climate === 'arid' ? SCENE.sand : SCENE.grass);
  rect(0, 70, WIDTH - 1, 73, SCENE.road);
  // Town: more and taller buildings in cities, lit windows at night.
  const buildings = Math.round(input.urban * 12);
  for (let b = 0; b < buildings; b++) {
    const x = rng.int(0, WIDTH - 14);
    const w = rng.int(6, 14);
    const h = rng.int(8, 36);
    rect(x, HORIZON - h, x + w, HORIZON - 1, SCENE.building);
    if (night)
      for (let y = HORIZON - h + 2; y < HORIZON - 2; y += 4) rect(x + 2, y, x + 3, y, SCENE.window);
  }
  // The work of this person.
  if (input.role === 'truck-driver') rect(20, 64, 44, 72, SCENE.truck);
  if (input.role === 'construction-worker' || input.role === 'engineer') {
    rect(120, 18, 122, HORIZON - 1, SCENE.crane);
    rect(96, 18, 146, 20, SCENE.crane);
  }
  if (input.role === 'rail-worker') rect(0, 76, WIDTH - 1, 77, SCENE.rail);
  if (PORT_ROLES.has(input.role)) rect(0, 80, WIDTH - 1, HEIGHT - 1, SCENE.water);
  if (FIELD_ROLES.has(input.role))
    for (let y = 76; y < HEIGHT; y += 3) rect(0, y, WIDTH - 1, y, SCENE.field);
  if (MARKET_ROLES.has(input.role)) rect(60, 62, 90, 69, SCENE.stall);
  return { width: WIDTH, height: HEIGHT, pixels };
}
