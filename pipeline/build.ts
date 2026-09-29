import { parseCsv, toRecords } from './csv.ts';
import { buildIndicators } from './indicators.ts';
import { checkManifest, type Manifest } from './manifest.ts';

export interface PipelineIo {
  readText(path: string): string;
  readBytes(path: string): Uint8Array;
  writeText(path: string, text: string): void;
}

const RAW = 'data/raw';
const GENERATED = 'src/content/generated';

/** Verifies the raw-data manifest, then regenerates the game's derived content files. */
export function runPipeline(io: PipelineIo): void {
  const manifest = JSON.parse(io.readText(`${RAW}/MANIFEST.json`)) as Manifest;
  const problems = checkManifest(manifest, (file) => io.readBytes(`${RAW}/${file}`));
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const owid = toRecords(parseCsv(io.readText(`${RAW}/owid-co2-trimmed.csv`)));
  io.writeText(`${GENERATED}/indicators.json`, `${JSON.stringify(buildIndicators(owid))}\n`);
}
