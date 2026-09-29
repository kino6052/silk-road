import { describe, expect, it } from 'vitest';
import { parseCsv, toRecords } from './csv.ts';

describe('parseCsv', () => {
  it('splits rows and fields, tolerating CRLF and a trailing newline', () => {
    expect(parseCsv('a,b\r\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsv('x,,z')).toEqual([['x', '', 'z']]);
  });

  it('handles quoted fields with commas, newlines and escaped quotes', () => {
    expect(parseCsv('name,note\n"Almaty, KZ","said ""hi""\nthen left"')).toEqual([
      ['name', 'note'],
      ['Almaty, KZ', 'said "hi"\nthen left'],
    ]);
  });

  it('returns no rows for empty text', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('toRecords', () => {
  it('keys each row by the header', () => {
    expect(
      toRecords([
        ['iso', 'year'],
        ['KAZ', '2013'],
      ]),
    ).toEqual([{ iso: 'KAZ', year: '2013' }]);
    expect(toRecords([])).toEqual([]);
    expect(toRecords([['a', 'b'], ['1']])).toEqual([{ a: '1', b: '' }]);
  });
});
