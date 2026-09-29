import type { Content } from '../content/types';
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
  readonly codes: readonly string[];
  readonly cells: Uint8Array;
}
const todo = (): never => {
  throw new Error('not implemented');
};
export const decodeMap = (_data: MapData): MapGrid => todo();
export const project = (_grid: MapGrid, _lon: number, _lat: number): { x: number; y: number } =>
  todo();
export const regionGrid = (_grid: MapGrid, _content: Content): Int16Array => todo();
export const terrain = (_grid: MapGrid, _regions: Int16Array, _content: Content): Uint8Array =>
  todo();
