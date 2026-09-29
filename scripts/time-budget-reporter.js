// Fails the test run when the whole suite takes longer than the budget (see CLAUDE.md).
// The budget can be overridden with TEST_BUDGET_MS, e.g. to check this reporter itself.
const BUDGET_MS = Number(process.env.TEST_BUDGET_MS ?? 2000);

export default class TimeBudgetReporter {
  started = 0;

  onInit() {
    this.started = performance.now();
  }

  onTestRunEnd() {
    const elapsed = performance.now() - this.started;
    if (elapsed > BUDGET_MS) {
      console.error(`\nTest time budget exceeded: ${elapsed.toFixed(0)} ms > ${BUDGET_MS} ms`);
      process.exitCode = 1;
    }
  }
}
