import { describe, expect, it } from 'vitest';
import { SCENE, SCENE_PALETTE } from './palette';
import { sceneOf, type SceneInput } from './scene';

const base: SceneInput = {
  climate: 'continental',
  urban: 0.5,
  pollution: 20,
  hour: 12,
  role: 'farmer',
  seed: 1,
};
const brightness = (pixels: Uint8Array) =>
  [...pixels].reduce(
    (sum, i) => sum + (SCENE_PALETTE[i] ?? [0, 0, 0]).reduce((a, b) => a + b, 0),
    0,
  ) / pixels.length;
const count = (pixels: Uint8Array, index: number) => pixels.filter((p) => p === index).length;

describe('vignette scenes', () => {
  it('draws a deterministic 160×90 scene', () => {
    const scene = sceneOf(base);
    expect([scene.width, scene.height, scene.pixels.length]).toEqual([160, 90, 14400]);
    expect(sceneOf(base)).toEqual(scene);
  });

  it('darkens at night and greys the sky with smog', () => {
    expect(brightness(sceneOf({ ...base, hour: 1 }).pixels)).toBeLessThan(
      brightness(sceneOf(base).pixels),
    );
    expect(count(sceneOf({ ...base, pollution: 120 }).pixels, SCENE.smog)).toBeGreaterThan(
      count(sceneOf(base).pixels, SCENE.smog),
    );
  });

  it('builds more in cities and shows the tools of each trade', () => {
    expect(count(sceneOf({ ...base, urban: 1 }).pixels, SCENE.building)).toBeGreaterThan(
      count(sceneOf({ ...base, urban: 0 }).pixels, SCENE.building),
    );
    expect(count(sceneOf({ ...base, role: 'truck-driver' }).pixels, SCENE.truck)).toBeGreaterThan(
      0,
    );
    expect(
      count(sceneOf({ ...base, role: 'construction-worker' }).pixels, SCENE.crane),
    ).toBeGreaterThan(0);
    expect(count(sceneOf({ ...base, role: 'dockworker' }).pixels, SCENE.water)).toBeGreaterThan(0);
    expect(count(sceneOf({ ...base, role: 'farmer' }).pixels, SCENE.field)).toBeGreaterThan(0);
    expect(count(sceneOf({ ...base, climate: 'arid' }).pixels, SCENE.sand)).toBeGreaterThan(0);
  });

  it('draws highland hills, railway tracks and market stalls', () => {
    expect(count(sceneOf({ ...base, climate: 'highland' }).pixels, 12)).toBeGreaterThan(0);
    expect(count(sceneOf({ ...base, role: 'rail-worker' }).pixels, SCENE.rail)).toBeGreaterThan(0);
    expect(count(sceneOf({ ...base, role: 'market-trader' }).pixels, SCENE.stall)).toBeGreaterThan(
      0,
    );
  });
});
