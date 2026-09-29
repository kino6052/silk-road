import { canonicalJson } from '../../core/canonical-json';
import { hashString } from '../../core/hash';
import type { Content } from '../../content/types';

/**
 * The whole simulation state. It is plain JSON-safe data so it can be cloned, hashed,
 * snapshotted and saved without custom code. Later milestones add system-owned slices.
 */
export interface World {
  readonly seed: number;
  /** false in the no-BRI shadow world. */
  readonly bri: boolean;
  week: number;
}

export interface WorldOptions {
  readonly seed: number;
  readonly bri: boolean;
}

/** Bump when the save structure changes incompatibly. */
const SAVE_FORMAT = 1;

export function createWorld(_content: Content, _options: WorldOptions): World {
  throw new Error('not implemented');
}

export function cloneWorld(world: World): World {
  return structuredClone(world);
}

export function serializeWorld(world: World): string {
  return JSON.stringify({ format: SAVE_FORMAT, world });
}

export function deserializeWorld(text: string): World {
  const save = JSON.parse(text) as { format: unknown; world: World };
  if (save.format !== SAVE_FORMAT) {
    throw new Error(`unsupported save format: ${String(save.format)}`);
  }
  return save.world;
}

export function stateHash(world: World): number {
  return hashString(canonicalJson(world));
}
