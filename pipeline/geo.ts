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
  /** codes[cell value]; index 0 is the sea. */
  readonly codes: string[];
  readonly cells: Uint8Array;
}

type Edge = readonly [x1: number, y1: number, x2: number, y2: number];

const edgesOf = (shape: CountryShape): Edge[] =>
  shape.polygons.flatMap((polygon) =>
    polygon.flatMap((ring) =>
      ring.slice(1).map((point, i): Edge => {
        const previous = ring[i] as readonly number[];
        return [
          previous[0] as number,
          previous[1] as number,
          point[0] as number,
          point[1] as number,
        ];
      }),
    ),
  );

/**
 * Scanline (even-odd) fill of country shapes into a lon/lat grid: a cell belongs to a country
 * when its centre is inside the country's polygons (holes excluded).
 */
export function rasterize(shapes: readonly CountryShape[], frame: Frame): Raster {
  const codes = [''];
  const cells = new Uint8Array(frame.width * frame.height);
  for (const shape of shapes) {
    const edges = edgesOf(shape);
    let index = 0;
    for (let row = 0; row < frame.height; row++) {
      const lat = frame.north - (row + 0.5) * frame.step;
      const crossings: number[] = [];
      for (const [x1, y1, x2, y2] of edges) {
        if (y1 > lat !== y2 > lat) crossings.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const from = Math.max(
          0,
          Math.ceil(((crossings[i] as number) - frame.west) / frame.step - 0.5),
        );
        const to = Math.min(
          frame.width - 1,
          Math.floor(((crossings[i + 1] as number) - frame.west) / frame.step - 0.5),
        );
        for (let col = from; col <= to; col++) {
          if (index === 0) index = codes.push(shape.code) - 1;
          cells[row * frame.width + col] = index;
        }
      }
    }
  }
  return { codes, cells };
}

/** Encodes cells as `value.count,…` runs in base 36. */
export function encodeRuns(cells: Uint8Array): string {
  const runs: string[] = [];
  let start = 0;
  for (let i = 1; i <= cells.length; i++) {
    if (i < cells.length && cells[i] === cells[start]) continue;
    runs.push(`${(cells[start] as number).toString(36)}.${(i - start).toString(36)}`);
    start = i;
  }
  return runs.join(',');
}
