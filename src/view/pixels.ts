// Copies palette-indexed pixel grids onto canvases. No game logic.
import type { Rgb } from '../gen/palette';

export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** Writes `grid` into `image` at (x, y); with `transparent`, index 0 is skipped. */
export function blit(
  image: ImageData,
  grid: Grid,
  palette: readonly Rgb[],
  x = 0,
  y = 0,
  transparent = false,
): void {
  const { data, width } = image;
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const index = grid.pixels[row * grid.width + col] ?? 0;
      if (transparent && index === 0) continue;
      const [r, g, b] = palette[index] ?? [255, 0, 255];
      const at = ((y + row) * width + x + col) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
    }
  }
}

/** A canvas of the given pixel size whose 2D context never smooths. */
export function canvas(
  width: number,
  height: number,
): {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  return { el, ctx };
}

export const rgb = ([r, g, b]: Rgb, alpha = 1): string =>
  `rgba(${String(r)},${String(g)},${String(b)},${String(alpha)})`;
