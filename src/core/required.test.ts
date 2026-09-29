import { describe, expect, it } from 'vitest';
import { required } from './required';

describe('required', () => {
  it('passes values through and throws on undefined', () => {
    expect(required(0, 'zero')).toBe(0);
    expect(() => required(undefined, 'region X')).toThrow('missing region X');
  });
});
