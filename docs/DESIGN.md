# One Belt, Many Lives — Design

An explorable simulation of the modern Belt and Road Initiative (BRI), land and
maritime, from its launch in September 2013 into an open-ended future. Two zoom
levels share one world clock:

- **Macro** — a pixel map with overlays, statistics and charts, running fast-forward.
- **Micro** — one person's life in a side-view pixel vignette, with their mind readable.

The goal is to let the player _feel_ who benefits and who does not: where life gets
better, where it gets worse, and how politics, globalisation, consumerism, inequality,
pollution and sanctions shape that. There is no win or lose state.

---

## 1. Decisions

| Area             | Decision                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Player           | An observer who can step into any person. No win/lose.                                                                                                                                                                                                                   |
| Genre            | Explorable simulation, like an interactive documentary or "SimCity as a lens".                                                                                                                                                                                           |
| Map              | Land corridors plus maritime routes.                                                                                                                                                                                                                                     |
| Time             | Starts 2013-09 (the Astana speech). Open-ended run; 2050 is a milestone, not an end.                                                                                                                                                                                     |
| Realism          | Real places with modelled numbers. Anchored historical timeline plus calibration up to today; free simulation afterwards.                                                                                                                                                |
| Future           | Scenario presets (Baseline, BRI scales back, Green BRI, Debt-crisis wave, Blocs harden, Climate stress) plus a weighted random event deck.                                                                                                                               |
| Countries        | **13 corridor countries:** China, Kazakhstan, Uzbekistan, Russia, Belarus, Poland, Germany, Azerbaijan, Turkey, Iran, Pakistan, Egypt, Greece. **7 external powers:** United States, European Union (as a policy bloc), India, Japan, Saudi Arabia, UAE, United Kingdom. |
| Regions          | Key regions only (2–6 per corridor country, about 45 in total) plus a "rest of country" region.                                                                                                                                                                          |
| Population       | Region aggregates plus about 2,000 fully simulated sample people per world.                                                                                                                                                                                              |
| Speed            | Weekly macro step; top speed ≈ 1 sim-year per 5 s with two worlds running.                                                                                                                                                                                               |
| Counterfactual   | A shadow "no-BRI" world runs in lockstep from v0.1. Nudges are mirrored into it where possible.                                                                                                                                                                          |
| People           | All roles: transport workers, affected locals, builders and business, officials and finance. Families and generations. Identity is driven by demographics.                                                                                                               |
| Minds            | Procedural belief model plus an information ecosystem. The mind view shows first-person thoughts and a belief panel ("believes" vs "actually true").                                                                                                                     |
| Wellbeing        | Six dimensions: income/wealth, health, security, freedom/voice, belonging, outlook.                                                                                                                                                                                      |
| Micro play       | Observe. At real turning points you can _nudge_, and the person may refuse. Nudges are unlimited but only happen at turning points.                                                                                                                                      |
| Micro time       | One clock, two zooms: macro in weeks, micro in hours. The focused person gets an hourly routine driven by needs and a cultural calendar.                                                                                                                                 |
| Actors           | All 20 states act through a shared policy engine. Key organisations (banks, state firms, contractors, unions, NGOs) are light actors with their own mind view.                                                                                                           |
| Themes           | Product chains with a "trace this product" view; consumer aspirations and household debt; class and inequality; ethical dilemmas and complicity.                                                                                                                         |
| Change           | Technology and economy shifts, culture and values drift, a living map, an open-ended run.                                                                                                                                                                                |
| Environment      | Pollution, land use and climate trend with disasters.                                                                                                                                                                                                                    |
| Sensitive topics | Simulated from several viewpoints, never graphic. Real leaders appear as offices, not names (names appear only in factual almanac and event text).                                                                                                                       |
| Tone             | Honest, humane and mixed. The simulation decides whether a story is hopeful or grim; the game never tells the player what to conclude.                                                                                                                                   |
| Discovery        | A story feed that balances winners and losers, plus free browsing and filters.                                                                                                                                                                                           |
| Reports          | A yearly digest plus a final "Many Lives" report available at any time.                                                                                                                                                                                                  |
| Rewind           | Yearly snapshots. Resuming from the past creates a branch.                                                                                                                                                                                                               |
| Sourcing         | Almanac plus provenance badges on every value: `historical`, `estimated` or `simulated`.                                                                                                                                                                                 |
| Data             | Trimmed raw datasets are committed with a manifest, then processed by a TDD-tested TypeScript pipeline into generated content.                                                                                                                                           |
| Art              | Macro: pixel map with overlays. Micro: side-view vignettes at 480×270, scaled up crisply, with a muted 32–48 colour palette. **v0.1 uses a functional debug view.**                                                                                                      |
| Tech             | TypeScript (strict), Canvas 2D, DOM panels, Vite. The sim runs in a Web Worker.                                                                                                                                                                                          |
| Platform         | Desktop first; the layout stays flexible for mobile later.                                                                                                                                                                                                               |
| Language         | English only, but all text goes through the i18n layer from day one.                                                                                                                                                                                                     |
| Audio            | Procedural WebAudio in a later phase.                                                                                                                                                                                                                                    |
| Saves            | IndexedDB slots, file export/import, and shareable seeds.                                                                                                                                                                                                                |
| Hosting          | GitHub Pages, deployed by GitHub Actions.                                                                                                                                                                                                                                |
| License          | MIT for code; CC BY 4.0 for curated data and almanac text (raw datasets keep their own licenses).                                                                                                                                                                        |
| Process          | Strict red/green/blue TDD with one commit per phase and 100% coverage of logic. See `CLAUDE.md`.                                                                                                                                                                         |

**Open question:** the "media lens" (a panel showing how different outlets frame the
same event) is undecided. The information ecosystem models media either way; only that
panel is pending.

---

## 2. Architecture

### 2.1 Layers

```
                 ┌──────────────────────────────────────────────┐
  main thread    │ view/  (canvas + DOM, untested, no logic)    │
                 │   ▲ draws            │ user input            │
                 │ vm/  view-models     ▼                       │
                 │ app/ app-state reducer, worker client        │
                 └──────────────▲───────────────┬───────────────┘
                     snapshots/VM data          │ commands
                 ┌──────────────┴───────────────▼───────────────┐
  web worker     │ worker/ protocol handler                     │
                 │ sim/   engine: BRI world + shadow world      │
                 │ gen/   procedural generators (pixel grids…)  │
                 │ core/  rng, calendar, math, hashing, ids     │
                 │ content/ generated data + schemas            │
                 └──────────────────────────────────────────────┘
  build time       pipeline/  data/raw → src/content/generated
```

- **Logic** (100% coverage): `core`, `sim`, `gen`, `vm`, `app`, `i18n`, `content`,
  `worker` (protocol) and `pipeline`.
- **View** (no tests, excluded from coverage): `src/view/**`, `src/main.ts` and the
  worker bootstrap file. The view only copies pixel grids to canvases, renders VM data
  into DOM elements, and forwards input events as commands.
- Import boundaries are enforced by lint. `sim` and `core` never import
  `vm/app/view`, and nothing except `view` touches `window`, `document` or `canvas`.

### 2.2 Proposed source tree

```
src/
  core/        rng.ts, calendar.ts, fixed-math.ts, hash.ts, ids.ts
  content/     schemas.ts, loader.ts, generated/*.json
  i18n/        t.ts, en/*.json
  sim/
    world/     state types, createWorld, clone, serialize, stateHash
    engine/    system registry, tick pipeline, lockstep runner (BRI + shadow)
    systems/   timeline, projects, trade, finance, labour, migration,
               environment, information, beliefs, wellbeing, lifecycle,
               turning-points, stories, scenarios
    people/    person, household, generation, routine (micro/hourly)
    actors/    (post-v0.1) state policy engine, organisations
  gen/         names, sprite (pixel grid), scene (vignette layers), map tiles, thoughts
  vm/          map overlays, region panel, charts, mind view, story feed, compare
  app/         app state reducer, commands, save/load format
  worker/      protocol (typed messages) + handler
  view/        (untested) canvas renderer, DOM panels, input
  main.ts      (untested) bootstrap
pipeline/      readers (CSV/JSON), transforms, validators, build script
data/raw/      trimmed raw datasets + MANIFEST.json
tests/         calibration/, determinism/ (cross-cutting suites)
```

Unit tests sit next to their code as `*.test.ts`. Property tests use `*.prop.test.ts`.

### 2.3 Simulation core

- **World state** is plain, serialisable data (no classes holding hidden state), so
  cloning, hashing, snapshotting and saving all come for free.
- **Systems** are modules of the form `{ id, step(world, ctx) }` registered in an
  explicit order. Each system owns the part of the state it writes and documents what
  it reads. A new phase adds a system and content files; it never rewrites the engine.
- **Tick:** one macro tick is one week. Week 0 is Monday 2013-09-02. Micro mode runs
  hourly sub-steps for the focused person only, then reconciles into the weekly
  aggregates.
- **Determinism:**
  - Randomness comes from a _counter-based_ RNG keyed by `(seed, stream, entityId, tick)`.
    Because of this, removing BRI projects in the shadow world does not shift anyone
    else's random draws. Twins stay comparable.
  - There is no `Math.random`, no `Date`, and no engine-dependent transcendental `Math.*`
    (`exp`, `log`, `pow`, `sin`, …) in `sim/`. These are replaced by our own deterministic
    implementations, so results match across browsers. This is enforced by lint.
  - Every run has a `stateHash`. The same seed plus the same commands gives the same hash.
- **Shadow world:** `createWorld(content, seed, { bri: false })` drops every entity whose
  `bri` flag is set (projects, loans, events). Both worlds step in lockstep inside the
  worker. People share identity and seeds across both worlds. A nudge is queued for the
  twin and applied if a matching turning point occurs there; the UI shows when a nudge
  could not be mirrored.
- **Provenance:** every content value carries `historical | estimated | simulated` and a
  source reference, so provenance badges come straight from the data.

### 2.4 Systems (v0.1 thin versions)

| System                 | v0.1 behaviour                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timeline               | Applies dated historical events (e.g. COVID-19, sanctions on Russia from 2022, the Red Sea shipping crisis, Italy's BRI exit) as effect bundles.                                                               |
| Scenarios / event deck | After today's date, the chosen preset sets trend modifiers and draws weighted plausible events.                                                                                                                |
| Projects               | Lifecycle: planned → financed → construction → operating, stalled or cancelled. Each stage produces jobs, land take, displacement, emissions and travel-time changes.                                          |
| Trade & logistics      | Route graph of rail, road and sea with border and port nodes. Freight comes from a gravity model with lowest-cost route choice, so sanctions and war reroute flows (for example, the Middle Corridor shift).   |
| Finance & debt         | Loans (lender, rate, grace period, term). Debt service against revenue; distress then leads to renegotiation, an IMF programme, default or an asset lease.                                                     |
| Labour & migration     | Jobs by sector per region, wages, and migration driven by wage and wellbeing gaps.                                                                                                                             |
| Environment            | Air-pollution index per region from projects and industry, affecting health. (Land and climate come later.)                                                                                                    |
| Information            | Source types (state media, local press, independent/foreign media, social media, word of mouth, employer, own eyes), each with reach, delay and distortion per country, language and literacy.                 |
| Beliefs                | Per person: fact → `{value, confidence, source, since}`, plus fears, hopes and goals. The gap from the truth is computed.                                                                                      |
| Wellbeing              | Six dimensions per person, derived from person and region state.                                                                                                                                               |
| Lifecycle              | Ageing, birth, death, marriage, job change, moving house. Children inherit circumstances.                                                                                                                      |
| Turning points         | Situations (relocation offer, job offer, protest, emigration, bribe) produce decisions. Options are scored by _believed_ outcomes plus personality plus the nudge bias; the explanation lists the top factors. |
| Stories                | Detectors pick up notable changes. The feed is balanced across winners and losers and across countries.                                                                                                        |

### 2.5 View-models and generators (logic, tested)

- `gen/sprite` turns a person's genes, culture, role and age into a palette-indexed pixel grid.
- `gen/scene` turns a place type, climate, time of day, weather and pollution into a list of vignette layers and props.
- `gen/map` turns content plus region state into map tile data.
- `gen/thoughts` turns salient beliefs, needs and events into template keys plus parameters, rendered through i18n.
- `vm/*` covers overlay colours, region panels, chart series, the mind view, the story feed and "with vs without BRI" comparisons.

### 2.6 Data pipeline

`data/raw/` holds trimmed source files (limited to the 13+7 countries and 2000–2025).
`data/raw/MANIFEST.json` records the URL, license, retrieval date and SHA-256 for each
file. `pipeline/` (TypeScript, TDD, 100% coverage) validates the manifest and parses
and transforms the files into `src/content/generated/*.json`, which is committed.

Candidate sources, each with its license to be verified before bundling:

- World Bank WDI: GDP, population, Gini, external debt, PM2.5.
- AidData's Global Chinese Development Finance dataset.
- Boston University Global China databases.
- IMF or CEPII trade data.
- Official rail and port statistics.
- National census summaries for demographics.
- A hand-compiled, cited event timeline.

Where a license forbids redistribution, the pipeline uses a hand-compiled, cited
summary of the facts instead.

### 2.7 Testing

| Kind                    | Purpose                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                    | Every function in the logic layers. 100% lines, branches, functions and statements.                                                                                                                                                   |
| Property (`fast-check`) | Invariants for any seed: conservation of money and people, bounded beliefs and wellbeing, lossless save/load, twin alignment.                                                                                                         |
| Determinism             | A fixed seed run for N years gives a golden `stateHash`. Same result on every run, in CI and in browsers.                                                                                                                             |
| Data validation         | Schemas, referential integrity, valid dates, every historical value has a source, every i18n key exists.                                                                                                                              |
| History calibration     | The run from 2013 reproduces real trends within tolerances, e.g. growth in China–Europe rail trips to 2021, the post-2022 drop in transit through Russia, Pakistan's debt stress in 2022–23, and Red Sea diversion from Suez in 2024. |
