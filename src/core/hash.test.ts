import { describe, expect, it } from 'vitest';
import { hashWords } from './hash';

describe('hashWords (MurmurHash3 x86_32 over 32-bit little-endian words)', () => {
  it('matches the reference vectors', () => {
    expect(hashWords([])).toBe(0);
    expect(hashWords([], 1)).toBe(0x514e28b7);
    expect(hashWords([], 0xffffffff)).toBe(0x81f16f39);
    expect(hashWords([0])).toBe(0x2362f9de);
  });
});
