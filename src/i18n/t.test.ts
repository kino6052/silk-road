import { describe, expect, it } from 'vitest';
import { createTranslator } from './t';

describe('translator', () => {
  const t = createTranslator({ hello: 'Hello, {name}! You are {age}.', plain: 'Plain' });

  it('looks up keys and fills {placeholders}', () => {
    expect(t('plain')).toBe('Plain');
    expect(t('hello', { name: 'Aigerim', age: 34 })).toBe('Hello, Aigerim! You are 34.');
  });

  it('leaves unknown placeholders visible and falls back to the key', () => {
    expect(t('hello', { name: 'Ali' })).toBe('Hello, Ali! You are {age}.');
    expect(t('missing.key')).toBe('missing.key');
  });
});
