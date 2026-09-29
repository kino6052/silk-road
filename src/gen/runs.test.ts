import { describe, expect, it } from 'vitest';
import { decodeRuns } from './runs';

describe('decodeRuns', () => {
  it('expands base-36 runs and rejects a size mismatch', () => {
    expect(decodeRuns('a.2,0.1', 3)).toEqual(new Uint8Array([10, 10, 0]));
    expect(() => decodeRuns('1.5', 4)).toThrow(/size/);
    expect(decodeRuns('', 0)).toEqual(new Uint8Array(0));
  });
});
