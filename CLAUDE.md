# One Belt, Many Lives — working rules

Read `docs/DESIGN.md` (what we build and why) and `docs/ROADMAP.md` (the order we build it in).

## TDD: red → green → blue, one commit per phase

For every behaviour:

1. 🔴 **Red.** Write one failing test for the next small behaviour. Run it and confirm it
   fails _for the expected reason_ (not a typo or import error). For a brand-new
   function, the red commit may add a signature stub that throws `not implemented`, so the
   test fails on behaviour rather than on a missing import. Commit:
   `test(red): <area> — <behaviour>`
2. 🟢 **Green.** Write the minimum code that makes the test pass, with all other tests
   still green. Commit: `feat(green): <area> — <behaviour>` (or `fix(green): …`).
3. 🔵 **Blue.** Refactor code and tests with everything green: naming, duplication,
   structure. Commit: `refactor(blue): <area> — <what changed>`. If the review finds
   nothing to change, end the cycle at green. Never make empty commits.

Red commits fail their tests on purpose, so no commit hook blocks failing tests.
Push only after a green or blue commit. The pre-push hook and CI run `npm run verify`
on the pushed tip, and every green push to the default branch deploys to GitHub Pages.

## Coverage: 100% of logic, 0% of view

- Logic lives in `src/{core,sim,gen,vm,app,i18n,content,worker}` and `pipeline/`. It must
  have 100% line, branch, function and statement coverage, enforced by Vitest thresholds.
- View lives in `src/view/**`, `src/main.ts` and the worker bootstrap. It is excluded from
  coverage and must not contain logic: it only draws VM data and pixel grids and forwards
  input as commands. If a view file needs an `if` about game state, move that decision
  into a view-model.
- Procedural generators return plain data (pixel grids, layer lists, tile data), so they are logic.
- Never use coverage-ignore comments to reach 100%.

## Test kinds

- Unit tests sit next to the code as `*.test.ts`.
- Property tests (`fast-check`) use `*.prop.test.ts`.
- Determinism suites live in `tests/determinism/` (golden `stateHash` for a fixed seed).
- Calibration suites live in `tests/calibration/` (historical trends within tolerance).
- Data validation covers schemas, references, sources and i18n keys.

## Simulation invariants

- `src/sim` and `src/core` are pure TypeScript: no DOM, no `window`, no I/O.
- No `Math.random`, `Date` or `performance` in the simulation. Use `core/rng` (counter-based,
  keyed by seed, stream, entity and tick) and the sim clock.
- No `Math.exp/log/pow/sin/cos/tan/atan2/cbrt/hypot` in `sim/`. Use the deterministic
  helpers in `core/fixed-math` so results match across browsers.
- World state is plain serialisable data. Every entity introduced by the BRI carries `bri: true`.
- Every content value carries provenance: `historical | estimated | simulated` plus a source.
- Real leaders appear as offices ("China's leadership"), never as named characters with thoughts.
- All user-facing text goes through `i18n`.

## Scope discipline

- Build the milestone in `docs/ROADMAP.md`. Nothing from later phases.
- Effort goes into logic. The v0.1 view is a functional debug view.
