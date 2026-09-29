import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../sim/testing/content.fixture';
import { createWorld } from '../sim/world/world';
import { spriteOf } from './sprite';
import { SPRITE } from './palette';

const people = createWorld(fixtureContent(), { seed: 2, bri: true, people: 40 }).people;
const adult = people.find((p) => p.role !== 'child' && p.role !== 'student');
if (!adult) throw new Error('fixture');

describe('sprites', () => {
  it('draws a deterministic figure on a transparent 8×12 canvas', () => {
    const sprite = spriteOf(adult, 35, 'folk-none');
    expect([sprite.width, sprite.height, sprite.pixels.length]).toEqual([8, 12, 96]);
    expect(spriteOf(adult, 35, 'folk-none')).toEqual(sprite);
    expect(sprite.pixels.filter((p) => p === SPRITE.transparent).length).toBeGreaterThan(10);
    expect(
      sprite.pixels.some(
        (p) => p === SPRITE.skin[0] || p === SPRITE.skin[1] || p === SPRITE.skin[2],
      ),
    ).toBe(true);
  });

  it('shows age, work and faith: children small, builders in hard hats, grey hair with age', () => {
    const child = spriteOf({ ...adult, role: 'child' }, 5, 'folk-none');
    const opaqueRows = (pixels: Uint8Array) =>
      new Set(
        [...pixels.keys()]
          .filter((i) => pixels[i] !== SPRITE.transparent)
          .map((i) => Math.floor(i / 8)),
      ).size;
    expect(opaqueRows(child.pixels)).toBeLessThan(
      opaqueRows(spriteOf(adult, 35, 'folk-none').pixels),
    );
    expect(spriteOf({ ...adult, role: 'construction-worker' }, 35, 'folk-none').pixels).toContain(
      SPRITE.hardHat,
    );
    expect(spriteOf({ ...adult, sex: 'm', role: 'farmer' }, 70, 'folk-none').pixels).toContain(
      SPRITE.grey,
    );
    const covered = people
      .filter((p) => p.sex === 'f' && p.role !== 'child')
      .some((p) => spriteOf(p, 30, 'sunni').pixels.includes(SPRITE.scarf));
    expect(covered).toBe(true);
    expect(spriteOf({ ...adult, sex: 'f' }, 30, 'folk-none').pixels).not.toContain(SPRITE.scarf);
  });

  it('varies skin, build and headwear by culture and genes', () => {
    const skin = (culture: string, genes: number) =>
      spriteOf({ ...adult, culture, genes, role: 'farmer' }, 30, 'folk-none').pixels[2 * 8 + 2];
    expect(skin('russian', 0xffffffff)).toBe(SPRITE.skin[0]);
    expect(skin('baloch', 0xffffffff)).toBe(SPRITE.skin[2]);
    expect(skin('russian', 0)).toBe(SPRITE.skin[1]);
    const slim = spriteOf({ ...adult, genes: 0, role: 'farmer' }, 30, 'folk-none');
    const broad = spriteOf({ ...adult, genes: 0xffffffff, role: 'farmer' }, 30, 'folk-none');
    expect(slim.pixels[4 * 8 + 1]).not.toBe(broad.pixels[4 * 8 + 1]);
    const man = { ...adult, culture: 'uyghur', sex: 'm' as const, role: 'farmer' as const };
    expect(spriteOf({ ...man, genes: 0 }, 30, 'sunni').pixels).toContain(SPRITE.cap);
    expect(spriteOf({ ...man, genes: 0xffffffff }, 30, 'sunni').pixels).not.toContain(SPRITE.cap);
  });
});
