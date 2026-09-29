import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkManifest, type ManifestEntry } from './manifest.ts';

const bytes = new TextEncoder().encode('iso,year\nKAZ,2013\n');
const sha = createHash('sha256').update(bytes).digest('hex');
const entry = (overrides: Partial<ManifestEntry> = {}): ManifestEntry => ({
  file: 'a.csv',
  title: 'A',
  url: 'https://example.org',
  license: 'CC BY 4.0',
  retrieved: '2026-09-29',
  sha256: sha,
  ...overrides,
});

describe('checkManifest', () => {
  it('accepts files whose checksum and metadata are complete', () => {
    expect(checkManifest({ files: [entry()] }, () => bytes)).toEqual([]);
  });

  it('reports checksum mismatches and missing license or source', () => {
    const problems = checkManifest(
      { files: [entry({ sha256: 'bad' }), entry({ file: 'b.csv', license: '', url: '' })] },
      () => bytes,
    );
    expect(problems).toEqual([
      'a.csv: sha256 mismatch',
      'b.csv: missing license',
      'b.csv: missing url',
    ]);
  });
});
