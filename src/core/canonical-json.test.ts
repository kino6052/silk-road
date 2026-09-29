import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonical-json';

describe('canonicalJson', () => {
  it('sorts object keys at every depth and keeps array order', () => {
    const a = { b: 1, a: [{ y: 2, x: 1 }, 'z'], c: { e: null, d: true } };
    const b = { c: { d: true, e: null }, a: [{ x: 1, y: 2 }, 'z'], b: 1 };
    expect(canonicalJson(a)).toBe('{"a":[{"x":1,"y":2},"z"],"b":1,"c":{"d":true,"e":null}}');
    expect(canonicalJson(b)).toBe(canonicalJson(a));
  });

  it('drops undefined properties like JSON.stringify does', () => {
    expect(canonicalJson({ a: undefined, b: 2 })).toBe('{"b":2}');
  });
});
