import { defineConfig } from 'vitest/config';

// Logic lives everywhere under src/ and pipeline/ except the view layer.
// View files only draw and forward input, so they are excluded from coverage.
// Entry points that only wire real I/O are excluded the same way.
const VIEW_FILES = [
  '**/*.fixture.ts',
  'src/view/**',
  'src/main.ts',
  'src/worker/bootstrap.ts',
  'pipeline/cli.ts',
];

export default defineConfig({
  base: './',
  test: {
    // Unit tests only; the long history calibration runs separately (vitest.calibration.config.ts).
    include: ['src/**/*.test.ts', 'pipeline/**/*.test.ts', 'tests/determinism/**/*.test.ts'],
    // The whole suite must finish within 2 s (scripts/time-budget-reporter.js).
    reporters: ['default', './scripts/time-budget-reporter.js'],
    // Tests build their own fixtures and share no mutable module state, so files can reuse
    // imported modules; this keeps the whole suite inside the 2 s budget.
    pool: 'threads',
    isolate: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'pipeline/**/*.ts'],
      exclude: [...VIEW_FILES, '**/*.test.ts', '**/*.d.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
