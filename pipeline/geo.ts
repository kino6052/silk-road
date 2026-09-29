export interface Frame {
  readonly west: number;
  readonly north: number;
  /** Degrees per cell, in both directions. */
  readonly step: number;
  readonly width: number;
  readonly height: number;
}
export interface CountryShape {
  readonly code: string;
  /** MultiPolygon coordinates: polygons → rings → [lon, lat]. */
  readonly polygons: readonly (readonly (readonly (readonly number[])[])[])[];
}
export interface Raster {
  readonly codes: string[];
  readonly cells: Uint8Array;
}
export function rasterize(_shapes: readonly CountryShape[], _frame: Frame): Raster {
  throw new Error('not implemented');
}
export function encodeRuns(_cells: Uint8Array): string {
  throw new Error('not implemented');
}
