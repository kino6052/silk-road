import { defineConfig } from 'vitest/config';

// Logic lives everywhere under src/ and pipeline/ except the view layer.
// View files only draw and forward input, so they are excluded from coverage.
const VIEW_FILES = ['src/view/**', 'src/main.ts', 'src/worker/bootstrap.ts'];

export default defineConfig({
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'pipeline/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'pipeline/**/*.ts'],
      exclude: [...VIEW_FILES, '**/*.test.ts', '**/*.d.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
