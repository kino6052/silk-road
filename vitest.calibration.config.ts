import { defineConfig } from 'vitest/config';

// History calibration: simulates 2013–2024 on the real content and checks the broad shape of
// history. It is slower than unit tests, so it runs on its own with its own time budget.
export default defineConfig({
  test: {
    include: ['tests/calibration/**/*.test.ts'],
    reporters: ['default', './scripts/time-budget-reporter.js'],
  },
});
