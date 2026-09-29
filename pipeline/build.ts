import { parseCsv, toRecords } from './csv.ts';
import { encodeRuns, rasterize, type CountryShape, type Frame } from './geo.ts';
import { buildIndicators } from './indicators.ts';
import { checkManifest, type Manifest } from './manifest.ts';

export interface PipelineIo {
  readText(path: string): string;
  readBytes(path: string): Uint8Array;
  writeText(path: string, text: string): void;
}

const RAW = 'data/raw';

/** The game map: 20°W–130°E, 62°N–38°S at 0.3125° per cell. */
export const MAP_FRAME: Frame = { west: -20, north: 62, step: 0.3125, width: 480, height: 320 };

interface Feature {
  readonly properties: { readonly code: string };
  readonly geometry: { readonly coordinates: CountryShape['polygons'] };
}
const GENERATED = 'src/content/generated';

/** Verifies the raw-data manifest, then regenerates the game's derived content files. */
export function runPipeline(io: PipelineIo): void {
  const manifest = JSON.parse(io.readText(`${RAW}/MANIFEST.json`)) as Manifest;
  const problems = checkManifest(manifest, (file) => io.readBytes(`${RAW}/${file}`));
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const owid = toRecords(parseCsv(io.readText(`${RAW}/owid-co2-trimmed.csv`)));
  io.writeText(`${GENERATED}/indicators.json`, `${JSON.stringify(buildIndicators(owid))}\n`);
  const borders = JSON.parse(io.readText(`${RAW}/ne-110m-countries-trimmed.geojson`)) as {
    features: readonly Feature[];
  };
  const shapes = borders.features.map((feature) => ({
    code: feature.properties.code,
    polygons: feature.geometry.coordinates,
  }));
  const { codes, cells } = rasterize(shapes, MAP_FRAME);
  io.writeText(
    `${GENERATED}/map.json`,
    `${JSON.stringify({ ...MAP_FRAME, codes, runs: encodeRuns(cells) })}\n`,
  );
}
