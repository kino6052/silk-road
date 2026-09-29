import { describe, expect, it } from 'vitest';
import mapJson from '../content/generated/map.json';
import { CONTENT } from '../content';
import { decodeMap, project, regionGrid, terrain } from './map';
import { PALETTE } from './palette';

const grid = decodeMap(mapJson);
const regions = regionGrid(grid, CONTENT);
const tiles = terrain(grid, regions, CONTENT);
const cellAt = (lon: number, lat: number) => {
  const { x, y } = project(grid, lon, lat);
  return Math.floor(y) * grid.width + Math.floor(x);
};
const codeAt = (lon: number, lat: number) => grid.codes[grid.cells[cellAt(lon, lat)] ?? 0];

describe('map generation', () => {
  it('decodes the generated grid with real geography', () => {
    expect([grid.width, grid.height]).toEqual([480, 320]);
    expect(codeAt(116.4, 39.9)).toBe('CHN');
    expect(codeAt(76.9, 43.24)).toBe('KAZ');
    expect(codeAt(22.4, 39.6)).toBe('GRC');
    expect(codeAt(65, 15)).toBe('');
  });

  it('projects lon/lat to fractional cell coordinates', () => {
    expect(project(grid, -20, 62)).toEqual({ x: 0, y: 0 });
    expect(project(grid, 130, -38)).toEqual({ x: 480, y: 320 });
  });

  it('gives corridor land cells their nearest region and leaves the rest out', () => {
    const region = (lon: number, lat: number) =>
      CONTENT.regions[regions[cellAt(lon, lat)] ?? -1]?.id;
    expect(region(116.4, 39.9)).toBe('CHN-BJ');
    expect(region(87.6, 43.8)).toBe('CHN-XJ');
    expect(region(62.3, 25.3)).toBe('PAK-BAL');
    expect(region(2.35, 48.85)).toBeUndefined();
    expect(region(65, 15)).toBeUndefined();
  });

  it('paints sea, foreign land, corridor climates and borders from the palette', () => {
    const used = new Set(tiles);
    expect(tiles.length).toBe(grid.width * grid.height);
    for (const index of used) expect(PALETTE[index]).toBeDefined();
    expect(used.size).toBeGreaterThan(8);
    expect(tiles[cellAt(65, 15)]).not.toBe(tiles[cellAt(2.35, 48.85)]);
    expect(tiles[cellAt(116.4, 39.9)]).not.toBe(tiles[cellAt(2.35, 48.85)]);
  });

  it('handles grid edges and regions without content', () => {
    // A 3×2 grid: sea, AAA, AAA / BBB, AAA, AAA — land reaches the last row and column.
    const tiny = {
      west: 0,
      north: 2,
      step: 1,
      width: 3,
      height: 2,
      codes: ['', 'AAA', 'BBB'],
      cells: new Uint8Array([0, 1, 1, 2, 1, 1]),
    };
    const painted = terrain(tiny, new Int16Array([-1, 0, 1, -1, 5000, 5000]), CONTENT);
    expect(painted[3]).toBe(9);
    expect(painted[5]).toBe(4);
    expect(painted[1]).toBe(10);
  });
});
