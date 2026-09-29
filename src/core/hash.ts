// Integer-only hashes (Math.imul and bit ops), so results are identical in every JS engine.

function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** MurmurHash3 (x86, 32-bit) over a list of 32-bit words. Words are coerced with `| 0`. */
export function hashWords(words: readonly number[], seed = 0): number {
  let h = seed | 0;
  for (const word of words) {
    let k = Math.imul(word | 0, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= words.length * 4;
  return fmix32(h);
}

/** 32-bit FNV-1a over UTF-16 code units; turns names such as RNG streams into words. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
