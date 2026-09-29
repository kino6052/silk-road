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
export function checkManifest(
  _manifest: Manifest,
  _readBytes: (file: string) => Uint8Array,
): string[] {
  throw new Error('not implemented');
}
