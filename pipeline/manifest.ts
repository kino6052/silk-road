import { createHash } from 'node:crypto';

export interface ManifestEntry {
  readonly file: string;
  readonly title: string;
  readonly url: string;
  readonly license: string;
  readonly retrieved: string;
  readonly sha256: string;
}

export interface Manifest {
  readonly files: readonly ManifestEntry[];
}

/** Lists problems with the raw-data manifest; an empty list means all files check out. */
export function checkManifest(
  manifest: Manifest,
  readBytes: (file: string) => Uint8Array,
): string[] {
  const problems: string[] = [];
  for (const entry of manifest.files) {
    const actual = createHash('sha256').update(readBytes(entry.file)).digest('hex');
    if (actual !== entry.sha256) problems.push(`${entry.file}: sha256 mismatch`);
    if (!entry.license) problems.push(`${entry.file}: missing license`);
    if (!entry.url) problems.push(`${entry.file}: missing url`);
  }
  return problems;
}
