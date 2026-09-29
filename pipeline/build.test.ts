import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { runPipeline, type PipelineIo } from './build.ts';

const csv =
  'country,iso_code,year,population,gdp,co2,co2_per_capita,coal_co2\nGreece,GRC,2013,11000000,,70,6.4,20\n';

const fakeIo = (manifestSha: string) => {
  const written = new Map<string, string>();
  const files: Record<string, string> = {
    'data/raw/owid-co2-trimmed.csv': csv,
    'data/raw/MANIFEST.json': JSON.stringify({
      files: [
        {
          file: 'owid-co2-trimmed.csv',
          title: 'OWID',
          url: 'https://github.com/owid/co2-data',
          license: 'CC BY 4.0',
          retrieved: '2026-09-29',
          sha256: manifestSha,
        },
      ],
    }),
  };
  const io: PipelineIo = {
    readText: (path) => files[path] ?? '',
    readBytes: (path) => new TextEncoder().encode(files[path] ?? ''),
    writeText: (path, text) => written.set(path, text),
  };
  return { io, written };
};

describe('runPipeline', () => {
  it('verifies the manifest and writes generated indicators', () => {
    const { io, written } = fakeIo(createHash('sha256').update(csv).digest('hex'));
    runPipeline(io);
    const indicators = JSON.parse(written.get('src/content/generated/indicators.json') ?? '{}');
    expect(indicators.GRC['2013'].population).toBe(11e6);
  });

  it('refuses to run when the manifest check fails', () => {
    const { io, written } = fakeIo('stale');
    expect(() => runPipeline(io)).toThrow(/sha256 mismatch/);
    expect(written.size).toBe(0);
  });
});
