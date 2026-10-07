# Sketch S5A — The sun on the end ledge (evidence)

2026-10-07. Implemented on the user's S5A-only request. One save-isolated development study plays the accepted full route (Layer 1 → lift → Layer 2 → lift → wall climb → handoff → swing crossing) and ends by touching the sun on the end ledge. No new traversal, section or mechanic; no accepted layer retuned. Stop for user review before S5B. All changes are uncommitted over `715770d`. No museum/campaign change, generation, dependency, commit/push, publishing or sub-agent work.

Play after `npm run dev`: [The sun](http://127.0.0.1:5173/?scene=unfinished-sketch&study=adventure). Older studies are unchanged: `layer-1`, `layer-2`, `layers-1-2`, `layer-3-walls`, `layer-3-swings`, `layer-3`, `layers-1-3`.

**Human play:** the user played the study during this session and reported "Done, i completed the level." This is the user's own completion, not a measured duration or difficulty rating.

## Environment

Checkout `main` at `715770d`, origin `https://github.com/XZNON/night-at-the-museum.git`, Node v22.14.0, npm 10.9.2. The Vite dev server on 5173 (PID 20324, `vite --host 127.0.0.1 --port 5173 --strictPort`, this checkout) was reused; Playwright started its own preview on 4173 after a fresh `npm run build`. The concurrent art reference pass (`asset-sources/`, `docs/art/SKETCH_ASSETS.md`, `scripts/sketch-references.mjs`) was left untouched. During the first browser runs the machine was busy (about 54 % CPU from other applications); later runs were at about 18 %.

## What a player does

The S4D route unchanged → the swing onto the end ledge. Landing is a safe checkpoint ("The end ledge. Safe ground: walk right and take the sun."; spawn x 59). Walk right to the sun (x 62..63.4, y 54..55.6). A strong release can carry the player through the sun in the air (Layer 3 keeps air momentum); it is then taken in the air and the player lands where the flight ends (no snap back to x 59). Taking it: the sun disappears, every mechanism stops where it is, nails/grips/commands clear, the `collect` cue plays and the success screen shows "The sun." with **Return** (back to the study menu) and **Keep exploring**. HUD after: "The sun is yours · The picture settles".

## What changed

- Data (`src/levels/unfinished-sketch.ts`, `unfinished-sketch-layer3.ts`): `SketchSun` (rect + ledge cue/hint, take cue, done hint, endpoint banner), optional `SketchRoute.sun`, route/study id `adventure`. `sketchAdventure` spreads `sketchLayersOneToThree`, copies `spawn` and every leg (`{ ...leg }`), sets player-facing name/goal and the sun. `layers-1-3` and every older preset are untouched (unit-tested).
- Model (`src/gameplay/sketch-model.ts`): a `settled` flag stops mechanism time (`elapsed` no longer advances; settled views report zero velocity; nothing is pinned; a settled swept blade uses its resting pose). `SketchRouteModel`: `sunCollected`, one-shot `consumeSunTouch()`, `isSettled`. The sun is checked first in `afterStep` on the terminal leg (no lift, no next leg), in any stage, while not recovering. Collection: settle, `completed`, movement/attachment reset, ledger and command queue cleared, traversal → exit stage in place. With a sun, the terminal exit commit is a checkpoint (`completed` only once the sun is taken) and keeps the settled pose through R/fall. Adventure texts for ledge R/fall, hint, checkpoint (section names, "the end ledge"), endpoint. Snapshots carry `sunCollected` only for routes with a sun.
- Scene (`src/scenes/unfinished-sketch.ts`): placeholder sun (faceless disc, rim, highlight, ten rays; pulse and turning rays unless reduced motion), hidden once taken; an `onSunCollected` constructor callback fired from `fixedUpdate` when the model's one-shot flag is set; read-only `sunView()`.
- UI/wiring (`src/main.ts`, `src/ui/game-ui.ts`, `src/style.css`): study mapping; the study's callback only pauses, plays `collect` and shows `GameUi.sketchSuccess()` (no progression call); menu card "Take back the sun.", eyebrow/tag "S5A / The sun", pause "Restart the Sketch", compact Layer 3 HUD; debug readback `sketch.sun` (rect, collected, settled, view).
- Shared browser helper (`tests/browser/sketch-layer3-controls.ts`): `swingOff`/`attempt`/`cross` take an optional `done` predicate (default `completed`, so S4C/S4D behave as before); the adventure passes "reached the end ledge" because landing there no longer completes.

## Recovery and ownership (unit- and browser-tested)

| Where | R | Fall | Leave + re-entry | Restart the Sketch |
| --- | --- | --- | --- | --- |
| Layers 1–3 before the ledge | as S4D | as S4D | as S4D | Layer 1 start |
| End ledge, sun not taken | ledge (59, 54) | ledge | ledge, sun still there | Layer 1 start |
| End ledge, sun taken | ledge, sun taken, same settled pose, no second report | same | same (settled pose restored from the snapshot), no report | Layer 1 start, sun back, mechanisms moving |

Refused (restart at Layer 1): a `layers-1-3` snapshot, missing or foreign route id, a sun claim during the crossing, on the climb or mid-ride, a non-boolean claim, NaN elapsed with a claim. `layers-1-3` refuses adventure snapshots with or without the sun.

## Results

- `npm run typecheck`, `npm run build` pass (existing >500 kB chunk warning).
- `npx vitest run tests/sketch-adventure.test.ts`: 10/10 ([unit-measurements.json](unit-measurements.json)). Composition/clone, input-only full route (S4D's climb and crossing search replayed into the adventure: 912 frames, 15.2 s; this release takes the sun in the air at frame 907, x 61.58), walking from the ledge spawn (24 frames, 0.4 s, taken at x 61.38), settle (pose and route time constant; zero velocity; nothing pinned), cleared attachments/commands and refused nails afterwards, taken from the air, R/fall/re-entry after the sun with no second report, ledge-before-sun checkpoint, a real scene's callback firing exactly once across R, walking and a restored scene, snapshot refusal, S4D unchanged.
- Full unit suite: `npx vitest run` 223/224 with the default 5 s timeout: the accepted S4B test "measures the M1 grip windows…" took 9.5–9.7 s here and fails the same way on unchanged HEAD (`git archive` copy in the scratchpad, 9.4 s). With `--testTimeout=30000`: 224/224 (HEAD copy 214/214). The test file was not changed.
- Measurement JSON rewritten by unit runs (S3B, S4A, S4B, S4C, S4D): this build's outputs are byte-identical to the HEAD copy's (`diff --strip-trailing-cr`); accepted files restored from git.

Browser (`tests/browser/sketch-adventure.spec.ts`, headed, real keys and clicks, shared Layer 1/2/3 helpers; no `src` edit during any run):

| Run | Result | Notes |
| --- | --- | --- |
| 1 | 1/4 | Both full routes reached the success screen by walking, then failed a test check that read the body mid-jump. Reduced motion: four bot glue retries at M1 → M2 (no crossing). Busy machine. Records: [run1-failures/](run1-failures/) |
| (fix) | | Test: wait for the landing. `src`: the sun lost its face (faceless gameplay-asset rule) |
| 2 | 2/4 | 1280 passed (one bot glue retry). 960: the bot could not click moving M2 while swinging (three re-aims, then timeout). Reduced motion: four glue retries again. It also showed that the "walk and jump" check could coast off the ledge (Layer 3 air momentum; the game recovered correctly to the ledge), so that check now stops before jumping straight up and asserts no movement. Records: [run2/](run2/) |
| interrupted | — | For comparison, the unchanged S4D spec was started on the same busy machine. Its reduced-motion case also failed with four glue retries before the user asked to play and the run was stopped. Records: [regressions/s4d-interrupted/](regressions/s4d-interrupted/) |
| 3 (machine quieter, after the user's own completion) | **4/4** (3.3 min) | 1280 67 s: landed before the sun, R on the ledge, walked to it, Keep exploring. 960 65 s: the sun was taken in the air by the last swing, Return → menu → Enter. Reduced motion 61 s: one missed click on M2 re-aimed, landed before the sun. Every crossing on its first bot attempt. Files in this folder |

Each full-route case at 1280 and 960 covers the full S4D route with real controls, the handoff in player words ("Layer 3 swings start"), the ledge checkpoint before the sun (when it landed short), the success screen (paused, sun hidden, settled, queue empty, isolated-study note), resumed play with mechanisms and route time frozen, R and a fall off the ledge after the sun (ledge kept, no second success screen, same pose), leave/re-entry (same pose, sun hidden, one canvas, no texture growth), Restart the Sketch (Layer 1, sun back), save sentinel unchanged and no page errors. Sun samples: pulse scale varies with normal motion; constant 1 with no ray turn under reduced motion. The menu case covers denied storage, the menu card and pause label, and that production (4173) ignores `study=adventure` (normal New Game menu, no S5A tag, no `__curatorDebug`).

Regressions after run 3 (outputs moved here; accepted S4C/S4D files restored from git each time):

| Spec | Result | Evidence |
| --- | --- | --- |
| S4D `sketch-layer3-full.spec.ts` | 3/4: both full routes (1280 crossing on its second bot attempt, 960 first) and menu/production pass; reduced motion failed (four bot glue retries at M1 → M2). Rerun of reduced motion: failed again the same way | [regressions/s4d/](regressions/s4d/), [regressions/s4d-rerun/](regressions/s4d-rerun/) |
| S4C `sketch-layer3-joined.spec.ts` | 5/7: the 1280 full route failed when a strip-F click was consumed after the helper's 600 ms window ("a missed click never changes the queue"); reduced motion failed (four glue retries). Rerun: 1280 full route passed (crossing first attempt); reduced motion failed in the climb (the bot fell back to the entrance before pinning D) | [regressions/s4c/](regressions/s4c/), [regressions/s4c-rerun/](regressions/s4c-rerun/) |
| **HEAD comparison** (`715770d` via `git archive` in the scratchpad, own dev server on 5183 and preview on 4183, same specs) | S4D reduced motion passed after two bot glue retries; S4C reduced motion **failed with four glue retries**, as in this build | [regressions/head-comparison/](regressions/head-comparison/) |

Reading: the reduced-motion and click-timing failures reproduce on unchanged HEAD on this machine today, and the S4C/S4D studies' code paths are unchanged by S5A (no `sun`: never settled, no sun check; their unit tests and measurement JSON are identical to HEAD). They are recorded as bot flakes of the S4B crossing (and once the climb), not S5A defects; the same specs passed in the S4D session. Not one clean suite: the S4C/S4D full-route and menu cases pass, their reduced-motion cases did not pass today in either build.

## Known and open

- The HUD's placement hint on the end ledge still reads "Click wood (strip or bar) to drive a nail" (S4D behavior); nails are refused there.
- Landing on the ledge snaps to its spawn (x 59) as in S4D; a landing that flies through the sun keeps its own spot instead.
- Placeholder art only; final sun art (from `complete.webp` + `sun-mask.png`) belongs to S5B/S5C or the art task.

## Limits

Scripted input plus the user's own completion. Bot feasibility is not measured human difficulty, first-time duration or representative-machine performance. S5A is a development study: no museum frame, campaign award, sun placement or ending (S5B/S5C).
