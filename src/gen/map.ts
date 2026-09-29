import type { Content } from '../content/types';
import { CLIMATE_TILE } from './palette';
import { decodeRuns } from './runs';

export interface MapData {
  readonly west: number;
  readonly north: number;
  readonly step: number;
  readonly width: number;
  readonly height: number;
  readonly codes: readonly string[];
  readonly runs: string;
}

export interface MapGrid {
  readonly west: number;
  readonly north: number;
  readonly step: number;
  readonly width: number;
  readonly height: number;
  /** Country code by cell value; '' is the sea. */
  readonly codes: readonly string[];
  readonly cells: Uint8Array;
}

export function decodeMap(data: MapData): MapGrid {
  const { runs, ...frame } = data;
  return { ...frame, cells: decodeRuns(runs, data.width * data.height) };
}

/** Fractional cell coordinates of a lon/lat point. */
export function project(grid: MapGrid, lon: number, lat: number): { x: number; y: number } {
  return { x: (lon - grid.west) / grid.step, y: (grid.north - lat) / grid.step };
}

/** Index into content.regions for each land cell of a corridor country (nearest centroid), else -1. */
export function regionGrid(grid: MapGrid, content: Content): Int16Array {
  const byCountry = new Map<string, { index: number; x: number; y: number }[]>();
  content.regions.forEach((region, index) => {
    const list = byCountry.get(region.country) ?? [];
    list.push({ index, ...project(grid, region.lon, region.lat) });
    byCountry.set(region.country, list);
  });
  const result = new Int16Array(grid.cells.length).fill(-1);
  for (let i = 0; i < grid.cells.length; i++) {
    const candidates = byCountry.get(grid.codes[grid.cells[i] as number] as string);
    if (!candidates) continue;
    const x = (i % grid.width) + 0.5;
    const y = Math.floor(i / grid.width) + 0.5;
    let best = -1;
    let bestDistance = Infinity;
    for (const candidate of candidates) {
      const distance = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
      if (distance < bestDistance) [best, bestDistance] = [candidate.index, distance];
    }
    result[i] = best;
  }
  return result;
}

/** Palette index per cell: sea with ripples, foreign land, corridor climates and borders. */
export function terrain(grid: MapGrid, regions: Int16Array, content: Content): Uint8Array {
  const tiles = new Uint8Array(grid.cells.length);
  const { width, cells } = grid;
  for (let i = 0; i < cells.length; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const cell = cells[i] as number;
    if (cell === 0) {
      tiles[i] = (x * 7 + y * 13) % 11 === 0 ? 1 : 0;
      continue;
    }
    const right = x + 1 < width ? (cells[i + 1] as number) : cell;
    const below = cells[i + width] ?? cell;
    if ((right !== 0 && right !== cell) || (below !== 0 && below !== cell)) {
      tiles[i] = 9;
      continue;
    }
    const region = regions[i] as number;
    if (region < 0) {
      tiles[i] = 2;
      continue;
    }
    const neighbours = [x + 1 < width ? regions[i + 1] : region, regions[i + width] ?? region];
    const edge = neighbours.some((other) => other !== undefined && other >= 0 && other !== region);
    const climate = content.regions[region]?.climate ?? 'continental';
    tiles[i] = edge ? 10 : CLIMATE_TILE[climate];
  }
  return tiles;
}
