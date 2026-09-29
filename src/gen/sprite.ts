import type { Person } from '../sim/people/types';
import { ROLE_GROUP } from '../sim/people/roles';
import { SPRITE } from './palette';

export interface Sprite {
  readonly width: number;
  readonly height: number;
  /** SPRITE_PALETTE indices, row-major; 0 is transparent. */
  readonly pixels: Uint8Array;
}

const WIDTH = 8;
const HEIGHT = 12;

const LIGHTER = new Set([
  'russian',
  'belarusian',
  'polish',
  'german',
  'greek',
  'albanian',
  'tatar',
]);
const DEEPER = new Set(['baloch', 'sindhi', 'punjabi', 'urdu', 'pashtun']);
const CAP_WEARERS = new Set(['uyghur', 'uzbek', 'tajik']);
const MUSLIM = new Set(['sunni', 'shia']);

/** Bits of the person's genes, as a fraction in [0, 1). */
const gene = (genes: number, shift: number) => ((genes >>> shift) & 255) / 256;

/** A small procedural character: build, skin, hair, headwear and work clothes. */
export function spriteOf(person: Person, age: number, religion: string): Sprite {
  const pixels = new Uint8Array(WIDTH * HEIGHT);
  const set = (x: number, y: number, colour: number) => {
    pixels[y * WIDTH + x] = colour;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, colour: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, colour);
  };
  const base = LIGHTER.has(person.culture) ? 0 : DEEPER.has(person.culture) ? 2 : 1;
  const shade = gene(person.genes, 0) < 0.2 ? Math.min(2, base + 1) : base;
  const skin = SPRITE.skin[shade] as number;
  const hair =
    age > 60 ? SPRITE.grey : (SPRITE.hair[LIGHTER.has(person.culture) ? 1 : 0] as number);
  const clothes = SPRITE.clothes[ROLE_GROUP[person.role]];
  const top = age < 12 ? 4 : 0;
  const wide = gene(person.genes, 16) < 0.3 ? 0 : 1;
  // Head, eyes, neck.
  rect(2, top + 1, 5, top + 3, skin);
  rect(2, top, 5, top, hair);
  set(3, top + 2, SPRITE.eyes);
  set(4, top + 2, SPRITE.eyes);
  // Body and legs.
  rect(1 + wide, top + 4, 6 - wide, top + (age < 12 ? 5 : 7), clothes);
  rect(2, top + (age < 12 ? 6 : 8), 5, HEIGHT - 2, SPRITE.trousers);
  rect(2, HEIGHT - 1, 5, HEIGHT - 1, SPRITE.shoes);
  // Headwear.
  if (person.role === 'construction-worker' || person.role === 'engineer') {
    rect(1, top, 6, top, SPRITE.hardHat);
  } else if (
    person.sex === 'f' &&
    age >= 12 &&
    MUSLIM.has(religion) &&
    gene(person.genes, 24) < 0.7
  ) {
    rect(1, top, 6, top, SPRITE.scarf);
    rect(1, top + 1, 1, top + 3, SPRITE.scarf);
    rect(6, top + 1, 6, top + 3, SPRITE.scarf);
  } else if (
    person.sex === 'm' &&
    CAP_WEARERS.has(person.culture) &&
    gene(person.genes, 24) < 0.4
  ) {
    rect(2, top, 5, top, SPRITE.cap);
  }
  return { width: WIDTH, height: HEIGHT, pixels };
}
