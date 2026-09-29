import { describe, expect, it } from 'vitest';
import { decodeRuns } from '../src/gen/runs.ts';
import { encodeRuns, rasterize, type Frame } from './geo.ts';

// A 10×10 frame of 1° cells from 0°E–10°E and 10°N–0°N.
const frame: Frame = { west: 0, north: 10, step: 1, width: 10, height: 10 };
const square = (code: string, x0: number, y0: number, x1: number, y1: number, hole = false) => ({
  code,
  polygons: [
    [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
      ...(hole
        ? [
            [
              [x0 + 2, y0 + 2],
              [x1 - 2, y0 + 2],
              [x1 - 2, y1 - 2],
              [x0 + 2, y1 - 2],
              [x0 + 2, y0 + 2],
            ],
          ]
        : []),
    ],
  ],
});
const at = (cells: Uint8Array, x: number, y: number) => cells[y * frame.width + x];

describe('rasterize', () => {
  it('fills cells whose centres fall inside a country, 0 elsewhere', () => {
    const { codes, cells } = rasterize([square('AAA', 0, 0, 4, 10)], frame);
    expect(codes).toEqual(['', 'AAA']);
    expect(at(cells, 0, 0)).toBe(1);
    expect(at(cells, 3, 9)).toBe(1);
    expect(at(cells, 4, 5)).toBe(0);
    expect(cells.filter((cell) => cell === 1).length).toBe(40);
  });

  it('respects holes and keeps several countries apart', () => {
    const { codes, cells } = rasterize(
      [square('AAA', 0, 0, 6, 6, true), square('BBB', 7, 7, 10, 10)],
      frame,
    );
    expect(codes).toEqual(['', 'AAA', 'BBB']);
    // (3, 6) is at lon 3.5, lat 3.5: inside AAA's hole.
    expect(at(cells, 3, 6)).toBe(0);
    expect(at(cells, 0, 9)).toBe(1);
    expect(at(cells, 8, 1)).toBe(2);
  });

  it('ignores shapes and edges outside the frame', () => {
    const { cells } = rasterize([square('ZZZ', 20, 20, 30, 30), square('AAA', -5, 2, 2, 3)], frame);
    expect(cells.filter((cell) => cell !== 0).length).toBe(2);
  });
});

describe('run-length encoding', () => {
  it('round-trips cells compactly', () => {
    const cells = new Uint8Array([0, 0, 0, 5, 5, 1, 0, 0]);
    const text = encodeRuns(cells);
    expect(text).toBe('0.3,5.2,1.1,0.2');
    expect(decodeRuns(text, cells.length)).toEqual(cells);
  });
});
