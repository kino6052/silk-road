# Roadmap

Each milestone is delivered as one pull request, built entirely in red/green/blue TDD
cycles (see `CLAUDE.md`). A milestone is done when all of these hold:
- CI is green, with lint, typecheck, tests, 100% logic coverage and build.
- Calibration tests for the systems it touches pass.
- Every new user-facing string goes through i18n.

## v0.1 — Core loop

### M0 · Scaffold and guardrails
- Vite + TypeScript (strict), Vitest with v8 coverage (100% thresholds on logic,
  `src/view/**` excluded), `fast-check`, ESLint (import boundaries, determinism bans in
  `sim/`), Prettier.
- `npm run verify` runs lint, typecheck, tests with coverage, and build. A pre-push hook runs it.
- GitHub Actions: verify on every push and pull request; deploy to GitHub Pages from `main`.
- `LICENSE` (MIT) and `LICENSE-DATA` (CC BY 4.0).
- First TDD cycles: counter-based seeded RNG, and the calendar (week ↔ date, from 2013-09-02).

### M1 · Engine
- World state model, `createWorld`, clone, serialize/deserialize, `stateHash`.
- System registry and tick pipeline, and a fixed-step clock with speed control.
- `bri` flags and a lockstep runner for the BRI world and the shadow world.
- Deterministic math helpers (`exp`, `log`, `pow` replacements).
- Determinism and property suites in place.

### M2 · Data pipeline and content v1
- Dataset research and license check, trimmed raw files, and `MANIFEST.json`.
- CSV/JSON readers, transforms and schemas, plus the content loader.
- Content:
  - the 13 corridor and 7 external countries, with a political profile for each;
  - about 45 regions with demographics;
  - the city, port and border-crossing graph with rail, road and sea routes;
  - about 15 flagship projects;
  - about 40 dated historical events;
  - name lists per culture.
- Data validation suite.

### M3 · Macro systems (thin)
- Timeline, projects, trade and logistics, finance and debt, labour and migration, and
  the pollution index.
- Scenario presets and the weighted event deck for the future.
- First calibration suite.

### M4 · People
- Demographics-driven generation of about 2,000 people per world, in households.
- Lifecycle: ageing, births, deaths, marriages, jobs and moves across generations.
- Six-dimension wellbeing and needs.

### M5 · Minds
- Information ecosystem (sources, reach, delay, distortion).
- Beliefs vs truth, fears, hopes and goals.
- Thought templates through i18n.
- Turning points, nudges that may be refused (with an explanation), and mirroring to the shadow twin.

### M6 · Micro time
- Hourly routine for the focused person (role schedule, needs, cultural calendar).
- Reconciliation with the weekly aggregates.

### M7 · Generators and view-models
- Map tiles, sprite pixel grids and vignette scene layers.
- VMs for overlays, region panel, charts, mind view, story feed (with detectors and
  balancing), and "with vs without BRI".
- Provenance badges.

### M8 · App shell and debug view → release v0.1
- Worker protocol, app-state reducer (speeds, macro/micro, selection, overlays, filters).
- Thin debug view: canvas map, agent dots, DOM panels, raw sprites and scenes at ×4.
- Cold open (a person near Khorgos, September 2013), then zoom out, with a 3-step hint overlay.
- Saves (IndexedDB slots, export/import) and seeds.
- Deploy to GitHub Pages.

## After v0.1 — Layers (each phase is one or more milestone PRs)

| Phase | Content |
|---|---|
| P1 Actors | Policy engine for all 20 states (goals, regime-type responses). External rival initiatives (PGII, Global Gateway, IMEC, Japan's infrastructure lending). Key organisations as light actors with a mind view. |
| P2 Globalisation | Product chains (raw material → factory → transport → shop → consumer) with value, wages, pollution and labour conditions at each step. "Trace this product" view. Local industry undercut by imports. |
| P3 Consumerism and class | Aspirations, advertising and peer effects, household debt. Wealth and income distributions (Gini, top-10% share), elite capture, mobility across generations, class as identity. |
| P4 Ethics | Personal values, moral dilemmas at turning points, and a hidden-costs ledger linking comfort in one place to harm in another. |
| P5 Environment depth | Land use and displacement, water stress, climate trend and disasters, CO₂ per project, green vs coal-heavy projects. |
| P6 Ever-changing world | Technology diffusion (e-commerce, EVs, solar, automation and AI), culture and values drift across generations, a living map (cities and routes appear, grow and close), and an open-ended run past 2050. |
| P7 Time travel | Yearly compressed snapshots, timeline scrubbing, resuming from the past as a branch, and a branch viewer. |
| P8 Reports and almanac | Yearly digest, the final "Many Lives" report, and an almanac with viewpoints and sources. |
| P9 Presentation | Pixel-art polish (animation, day/night, weather), procedural audio, the media lens (if approved), a mobile layout, more countries and translations. |
