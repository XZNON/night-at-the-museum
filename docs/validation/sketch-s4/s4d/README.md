# Sketch S4D — Layers 1–3, final S4 gate (evidence)

2026-10-07. Implemented on the user's S4D-only request ("Start SKETCH_S4D_PLAN.md"). One save-isolated development study runs Layer 1, the first lift, Layer 2, the second lift and the accepted joined Layer 3 (wall climb, grounded handoff, swing crossing) to one fixed endpoint on the end ledge. Stop for user review before S5. All changes are uncommitted over `d0856d1` (the accepted S4L checkpoint). No commit/push, generation, dependency, publishing or sub-agent work.

Play after `npm run dev`: [Layers 1–3](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-3). Older studies are unchanged: `layer-1`, `layer-2`, `layers-1-2`, `layer-3-walls`, `layer-3-swings`, `layer-3`.

## Environment

Checkout `main` at `d0856d1`, origin `https://github.com/XZNON/night-at-the-museum.git`, Node v22.14.0, npm 10.9.2. The Vite dev server on 5173 (PID 20324, `vite --host 127.0.0.1 --port 5173 --strictPort`, started for this checkout before this session) was reused; Playwright started and stopped its own preview on 4173 after a fresh `npm run build`. Unrelated local edits (asset-sources prompts/references and manifest, `docs/art/SKETCH_ASSETS.md`, `scripts/sketch-references.mjs`) were left untouched; `asset-sources/prompts/sketch-backdrop.txt` appeared during this session from other work.

## What a player does

Layer 1's four pendulums (pin A, B; Q for C; Q for D) → step onto the first lift → Layer 2's boards and axes leftward (A, B; Q for C) → walk the walkway onto the second lift → arrive on the parked deck beside the Layer 3 ground: "Layer 3 reached. Two nails; pick up the third on your way to the walls." → walk right over the pickup, climb the six walls → landing on the high ledge takes the third nail back ("Wall climb clear…") → nail strip F, bars M1/M2, swing onto the end ledge → "S4D endpoint reached · Layers 1–3 complete · Stop for review".

## What changed

Data (`src/levels/unfinished-sketch-layer3.ts`): `sketchLayersOneToThree` (`layers-1-3`) spreads the accepted `sketchLayerThree` field (every solid, mechanism, target, surface and hazard, unchanged) and clones four legs: `layer-1` → `layer-2` (first lift, as `layers-1-2`), `layer-2` → `l3-walls` (second lift; arrival section `l3-walls` instead of `layer-3-landing`), `l3-walls` → `l3-swings` (grounded handoff, S4C settings), `l3-swings` (terminal, S4C settings). Entry `layer-1`, spawn (1.5, 0), both lifts played (`parkedLifts` undefined), no field-level wall/reach/pickup/air-coast, so Layers 1/2 keep air braking, reach 10 and no pickup. New optional leg field `arrivalCue` (the cue when a lift's arrival starts that leg); only the new preset's climb leg sets it. Older presets are not mutated (unit-tested: their links, arrival sections, parked lifts and cues are as before).

Route-id assumptions fixed from data (`src/gameplay/sketch-model.ts`), older studies' texts identical:

| Assumption | Before | Now |
| --- | --- | --- |
| Hazard cue | "Glue!" whenever the field had any static hazard | named by what was hit (static glue vs. a mechanism blade); no older study can hit both |
| Arrival cue | Layer 2's text for any linked arrival | `leg.arrivalCue ?? ` Layer 2's text |
| Layer 3 strict restore, HUD move reset, motion text | route-id list of the three Layer 3 studies | the active leg's section is on Layer 3; restore is strict when the study's entry leg or the snapshot's leg is on Layer 3 (identical for every older study) |
| Crossing retry/fall texts (`laterSection`) | route `layer-3` and not the entry leg | a leg entered by a grounded handoff (another leg links to it without a lift) |
| Exit cue / HUD endpoint | per route id | adds `layers-1-3`: "S4D endpoint. Layers 1–3 complete: landed on the fixed end ledge." / "S4D endpoint reached · Layers 1–3 complete · Stop for review"; the S3 endpoint can never show here (the second arrival never enters the `arrival` stage) |
| `layers-1-3` snapshots | — | must carry `routeId: 'layers-1-3'` (no legacy snapshots exist); otherwise restart at Layer 1 |

Scene/UI: wall letters now show where a leg of the route climbs those walls (same result for `layer-3-walls`/`layer-3`, now also `layers-1-3`); study mapping, menu card ("The whole picture."), eyebrow, build tag, pause "Restart Layers 1–3"; the HUD gets `data-layer` from the active section so `layers-1-3` switches to the compact Layer 3 status/hint layout on arrival (Layers 1/2 keep the S3 layout).

Accepted and recorded, not changed: ring visibility keys on `field.surfaces`, so in `layers-1-3` (which carries the crossing's surfaces) other sections' marked rings are hidden in every section; in `layers-1-2` they show small with "Another layer." Other sections' targets stay refused either way ("Another layer.", unit/browser-asserted); the challenge outlines remain visible as context. Changing the rule by leg would have changed `layer-3`'s crossing view.

## Recovery and ownership (unit-tested; browser-checked as noted)

| Where | Glue / fall / hazard | `R` (incl. queued input) | Leave + re-entry | Restart Layers 1–3 |
| --- | --- | --- | --- | --- |
| Layer 1 | Layer 1 start (1.5, 0) | start | start | Layer 1 start |
| First ride | Layer 1 exit (55.7, 11.9) | exit, deck at bottom | exit (mid-ride snapshot → exit) | Layer 1 start |
| Layer 2 | Layer 2 start (64.2, 15.2); axe hit says "Caught by the axe" | start | start | Layer 1 start |
| Second ride | Layer 2 exit (27.5, 16.3) | exit, deck at bottom | exit | Layer 1 start |
| Climb | entrance (4.2, 24.4), pickup back | entrance | entrance | Layer 1 start |
| Crossing | swing start (17.2, 49.5), climb kept | swing start | swing start | Layer 1 start |
| End ledge | end ledge (59, 54) | end ledge | end ledge | Layer 1 start |

Actual blur mid-ride returns to that ride's departure exit (S4L contract). Thirteen foreign/malformed/impossible snapshots restart at Layer 1 (a `layers-1-2` exit snapshot, a `layer-3` snapshot, missing/foreign route id, wrong entry leg, unknown leg, a Layer 3 leg in `transit`/`arrival`/unknown stage, NaN elapsed, infinite sequence, the climb claiming its exit); `layers-1-2`, `layer-3` and `layer-3-swings` keep their own rules for a `layers-1-3` snapshot.

## Second arrival

Arrival commits once, in place, on the parked second deck (x ≈ -0.72 of deck x-2.6..0, y 24.4): leg `l3-walls`, two nails, the third collectable, zero velocity, mechanism phase zero (identical to a fresh `layer-3`), queue/frozen empty, reach 11, wall feel and air momentum on, no endpoint, both decks parked with walls open. Place/recall/E/Space every frame during the ride never act; held Space/E after arrival do nothing. Camera: the ride blends the Layer 2 band into the climb's band (view height 18 → 24); see `layers-1-3-layer-2-mid-ride-*`, `layers-1-3-layer-3-lift-arrival-*`, `climb-arrival-*`.

## Results

- `npm run typecheck` and `npm run build` pass (existing >500 kB chunk warning).
- `npx vitest run`: 214/214 (17 files; 13 new in `tests/sketch-layers-1-3.test.ts`). The new file covers composition and cloning, Layer 1/2 defaults, both ride boundaries (S3 fixture style for Layers 1/2), the second arrival contract, an input-only climb (`tests/sketch-layer3-climb.ts` now accepts a starting model) and `cross()` from the second arrival to the S4D endpoint (912 frames, 15.2 s; climb A, B, C, Q, D, Q, E, Q, F, Q; crossing F, M1, Q, M2, Q; replays from a rebuilt second arrival), the recovery table, the axe/glue cues and snapshot refusal. Measurements: [unit-measurements.json](unit-measurements.json).
- Unit runs rewrite S3A (`sketch-s3/s3b/*.json`), S4A, S4B and S4C measurement JSON. Outputs from HEAD `d0856d1` (extracted with `git archive` and run in the scratchpad) and from this build are byte-identical (`diff --strip-trailing-cr`); both differ from the committed S4A/S4B JSON in the pre-existing way S4L recorded. Accepted files restored from git.
- Browser, real keys and clicks (headed for actual blur), shared helpers: Layer 2/lift helpers moved unchanged into `tests/browser/sketch-layer2-controls.ts` (plus an `intoClimb` option on `ride`), Layer 3 helpers into `tests/browser/sketch-layer3-controls.ts`; the original specs import them (reruns below).

| Spec | Result | Evidence |
| --- | --- | --- |
| `sketch-layer3-full.spec.ts` (new) run 1 | 4/4 (4.2 min): 1280 full route 91 s, 960 full route 101 s, reduced motion 57 s, menu/denied storage/production 1 s; every crossing on its first bot attempt | overwritten by run 3 |
| same, run 2 | 3/4: the 960 case failed at the climb fall, 81 s in. The game showed "Focus was lost": a real OS focus change on the headed window paused it. That case's mid-ride actual-blur check had switched Playwright's focus emulation off and never on again, so any later focus change paused the run. Not a game defect (pausing on blur is the contract). The reduced-motion crossing took two bot attempts (one glue retry, as recorded for S4B/S4C) | [run2-failure/](run2-failure/) |
| same, run 3 after the test fix (focus emulation switched back on after each blur check) | 4/4 (4.2 min): 1280 91 s, 960 101 s, reduced motion 56 s, menu 1 s; every crossing on its first attempt | `browser-*.json`, captures here |
| S3 `sketch-layer2.spec.ts` (Layer 2/lift helpers now imported from the shared module) | 14/14 (5.5 min) | [regressions/s3/](regressions/s3/) via `SKETCH_EVIDENCE_DIR` |
| S4C `sketch-layer3-joined.spec.ts` (Layer 3 helpers now imported) | 7/7 (2.5 min); crossings on first attempt | [regressions/s4c/](regressions/s4c/) (moved; accepted files restored) |
| S4A `sketch-layer3-walls.spec.ts` | 8/8 (1.2 min) | [regressions/s4a/](regressions/s4a/) (moved; accepted files restored) |
| S4B `sketch-layer3-swings.spec.ts` | 8/8 (1.3 min); crossings on first attempt | [regressions/s4b/](regressions/s4b/) (moved; accepted files restored) |
| S1 `sketch-mechanics.spec.ts` | 12/12 | assertions only |
| S4L `sketch-lifts.spec.ts` | 8/8 (2.0 min) | [regressions/s4l/](regressions/s4l/) (moved; accepted files restored) |
| S2 `sketch-layer1.spec.ts` + `sketch-layer1-motion.spec.ts` | 12/12 + 1/1 | assertions only |

Aggregate across runs, not one clean suite: the regression specs ran once each, serially, after S4D run 1 and before run 2; no `src` edit during any browser run (the only edit between runs 2 and 3 was the S4D spec's focus fix). The other specs' own blur checks have the same latent focus-emulation pattern; they passed and were not changed.

The full-route cases at each size: Layer 1 R with queued input, re-entry and a terrace fall; the full Layer 1 traversal; one lift with full ride recovery per size (1280: first lift; 960: second lift — R mid-ride, mid-ride re-entry, Escape pause + resize mid-ride, actual blur mid-ride) and the other ridden plainly, with escape attempts against the cab walls; Layer 2 fall, re-entry, R with queued input and traversal; the second arrival contract and compact HUD; climb fall (pickup named), re-entry from wall A, R with queued input; the full climb and handoff (1280: Escape + resize to 960 and back while airborne over the shared ledge before the handoff; 960: actual tab blur on the ledge after it); crossing glue fail, R with queued input, re-entry from F's head; the crossing; terminal R, fall and re-entry (one canvas, no texture growth); Restart Layers 1–3 to (1.5, 0) with both decks at the bottom; save sentinel unchanged; no page errors.

## Limits

Scripted input only. Browser feasibility is not measured human difficulty, first-time duration or representative-machine performance; the user's own play is the comfort check. The Sketch remains a development study: no S5 moving-socket finale, sun, campaign/museum entry, ending or art.
