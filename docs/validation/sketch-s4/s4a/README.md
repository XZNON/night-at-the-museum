# Unfinished Sketch S4A — isolated wall climb review gate

2026-10-07, second revision after user review. S4A is at its playable review gate again. Stop for user review; S4B (glue) is not started. All changes remain uncommitted over pushed main `77acf03`, together with the S4 planning documents.

Play [S4A wall climb](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-walls) after `npm run dev`. Existing entries keep their endpoints: [joined Layers 1/2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2) and [direct Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2) still end on safe Layer 3 ground at (4.2,24.4); [isolated Layer 1](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1) and [S1 mechanics](http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics) are unchanged. Production preview ignores studies.

## Second review (three nails)

The user played the six-board revision and found it still impossible, but liked it. They asked for **three nails on Layer 3, picked up at its start**, and for the climb to stay **a little bit tough**.

Likely human failure, from the model: on every wall the player had to press Q, aim a click at a moving outline and press Space within about 0.5 s of sliding (B was the tightest). A Space pressed on touching the next wall while still rising was silently dropped (no air jump left, and no wall contact yet).

Revision (section-only; S1 bays and Layers 1/2 keep two nails and their tuning):

- **Third nail pickup** on the arrival ground at x7..7.8, on the run toward A. The budget becomes 3 until the section restarts (R, fall or re-entry during traversal), when the nail reappears. HUD and rejections say "All 3 nails are placed" with three.
- **Pin ahead:** placement reach is 11 on this section, so the third nail can ink C while on A, and on each later wall the board after next. Q frees the oldest nail, two boards behind, whenever convenient. On a wall only `Space` is urgent.
- **Grip, then a quick slide (the toughness):** a catch holds still for 0.9 s, then slides at 2 u/s. About 1.15 s per wall before a kick fails, so the climb keeps a rhythm without demanding a frame-perfect kick.
- **Kick buffer:** an airborne Space with no air jump left is kept for 0.3 s and kicks the moment the next wall catches.
- An active axe in the shaft was prototyped and rejected: in the 3.3u shaft its hub kills every path through it, so a whole band of kick heights becomes certain death. Widening the shaft broke the held-back kick.

## Earlier review (continuous criss-cross)

The user's first try found the three-board version impossible: holding toward the wall just left braked the kick within ~0.7u of a 2.65u gap, and the B kick window was 0–20 frames. The six-board A–F criss-cross with a section kick lock (input held toward the far wall until the arc's top, a wall contact or a landing) replaced it. Both remain in this revision.

## Implemented behavior

`study=layer-3-walls` (route `layer-3-walls`, leg/section `l3-walls`) starts on the existing Layer 3 arrival (x0..10/top24.4, spawn 4.2,24.4) with the Layer 2 band below. Boards move as dashed, non-solid outlines until pinned; pinned boards are inked solid, climbable on their side faces and resume their captured phase when recalled. Standard route: pin A and B, run right over the third nail and jump onto A's left face (a single held jump; a second Space at the apex would already be a wall kick). On A, pin C with the third nail, then `Space`. On each later wall, `Q` (frees the board two behind) and pin the board after next, then `Space`, up to F; F's kick lands on the ledge. Grounded ledge contact commits the exit checkpoint and endpoint.

R/fall during traversal resets the entrance, the pickup, two nails and phases; after completion they restore the ledge. Re-entry restores the entrance during traversal/recovery and the ledge after completion. Memory snapshots carry `routeId`; the walls preset refuses foreign, missing-owner, transit/arrival or non-finite snapshots. Older S2/S3 snapshots without `routeId` keep their previous normalization. HUD shows the real wall-slide/kick state, oldest nail and a wall-specific endpoint. Boards carry letter labels.

Code: `src/levels/unfinished-sketch-layer3.ts` (data, section `wall`, `placementReach`, `nailPickup`), `SketchPlayfieldData` and `SketchTuning.wall.kickLock|kickBuffer|grip` (`src/levels/unfinished-sketch.ts`), lock/buffer/grip in `src/gameplay/sketch-movement.ts`, budget/pickup/reach in `SketchPlayfield` (`src/gameplay/sketch-model.ts`), pickup drawing in `src/scenes/unfinished-sketch.ts`. Input-only harness: `tests/sketch-layer3-climb.ts`.

## Final typed geometry

| Item | Value |
| --- | --- |
| Columns | right x10.9..13.1 (centre 12), left x5.4..7.6 (centre 6.5) |
| Board travel | vertical 0.5u (cosine) while unpinned |
| A (right) | centre y29.2, height 7.8 (25.3..33.1): reaches down beside the arrival edge |
| B (left) | centre 33.6, height 6.3 (30.45..36.75) |
| C (right) | centre 37.1, height 6.3 |
| D (left) | centre 40.6, height 6.3 |
| E (right) | centre 45.225, height 8.55 (top 49.5): extended so only F's kick clears it |
| F (left) | centre 49.6, height 10.3 (top 54.75): tall final wall nothing clears |
| Periods | A–F 7, 6.5, 6, 5.5, 5, 4.5 s |
| Ledge | x13.2..22, top 49.5 (solid 47.5..49.5), flush right of E; exit spawn (17,49.5), exit fall line 45 |
| Third nail | pickup x7..7.8, y24.4..25.6 on the arrival ground; budget 2 → 3 until restart |
| Placement reach | 11 (shared tuning 10) |
| Section | spawn (4.2,24.4), fall line 22, focus viewHeight 24, centreY 29.5..46, lookAhead 0 |
| Wall feel | grip 0.9 s, then slideMaxFall 2; kickHorizontal 9, kickVertical 14.5, kickLock 0.8 s (ends at apex), kickBuffer 0.3 s |

## Measured behavior

From `unit-measurements.json` (input-only harness in `tests/sketch-layer3-climb.ts`: inputs and commands only, no body/state edits). The climber pins A/B, runs over the pickup, catches A with one held jump and waits `dwell` frames on every wall. A free nail goes to the next unpinned board in reach; Q only frees a nail two boards behind the highest wall reached.

- Neutral input completes A–F with 0–70 frame waits (about 1.17 s) on every wall; 80 and 90 fail. The nail pattern is always `pin C (from A) · Q · pin D · Q · pin E · Q · pin F · Q`.
- Double-jump entry: 0–60 frames complete.
- Holding back toward the wall just left (the earlier cancel): completes at 0–60 frames; 80 fails. The same input without the section feel never reaches B.
- Grip: a catch on A holds its height for 0.9 s, then falls ~1.5u in the next 0.8 s.
- Kick buffer: Space pressed while rising against B (before the catch) kicks at the catch; with `kickBuffer: 0` the same press is dropped and the player stays sliding.
- From A, C is 10.18u away: valid with reach 11, out of reach with the shared 10.
- Without the pickup, this pin-ahead strategy stalls on B (no free nail). A two-nail rhythm (Q and pin on every wall) was not re-measured.
- Contacts strictly alternate columns and reach A–F in order. Omitting any single board fails.
- Skip margins unchanged (same geometry): B is 0.31u above double-jump reach from the arrival ground; same-column gaps 0.2–0.35u; top-to-top two above ≥2.0u beyond a double jump; D's kick 1.05u below E's top; D's top 0.76u short of the ledge by double jump. Double-jump ceiling 4.486u; kick rise 4.205u.

## Verification (2026-10-07, second revision)

- `npm run build` (includes typecheck): pass; existing >500 kB chunk warning.
- `npm run test`: 148/148 in 13 files (16 S4A cases in `tests/sketch-layer3.test.ts`; S1/S2/S3 unit tests unchanged and passing).
- `npx playwright test tests/browser/sketch-layer3-walls.spec.ts --trace off`: 8/8. The real-input climb now asserts the pickup (budget 3) during the run, pins C from A and keeps the board ahead pinned. Same coverage as before: both sizes with terminal R/fall/re-entry/restart, pause/blur/resize/retry/re-entry, recalling current A or B (3 available afterwards), no-nail falls with denied storage and production isolation, reduced motion, S1 walls/FIFO and the isolated S2 endpoint.
- Regressions after the shared model/movement edits (`sketch-layer2` + `sketch-mechanics`, evidence in `regressions/`): 25/26; the S3B direct second ride at 1280 timed out once in transit, then passed 6/6 on `--repeat-each 3` (flake; transit code unchanged).

"Real input" means Playwright keyboard/mouse at 60 Hz, not a human playtest. The user's next try is the real comfort check. No representative-machine performance claim.

## Captures

Each at 1280 and 960 width: `entrance` (pickup visible), `on-a`, `pinned-c` (3/3 placed from A), `pinned-e`, `pinned-f`, `exit`; plus `resize-slide-960`. Regression captures are under `regressions/`. Captures taken through pause hide only the pause overlay.

## Known issues

- Human comfort is unverified until the user plays this revision.
- The early-press kick buffer is covered by unit tests only; real-key timing in the browser is too racy to assert.
- Hopping over the pickup leaves two nails; the climb then needs Q + pin on every wall, as before.
- A second `Space` at the jump apex beside A is a wall kick, not a double jump.
- Holding back toward the old wall after the very last kick (F) can still pull the player off the ledge line.
- The entrance toast repeats the section hint until it fades.
- The S1 pins browser case is occasionally flaky in long runs.

## Review checklist

- [ ] Climb A→F with your own hands at both sizes; judge the grip/slide rhythm and whether it feels "a little tough" rather than impossible.
- [ ] Pick up the third nail; pin C from A; try Q at different moments; omit a pin; recall the wall you are on; R mid-slide and after the endpoint; Leave/re-enter.
- [ ] Press Space just as you touch the next wall: it should kick as soon as you catch.
- [ ] Confirm joined/direct S3 entries still end at (4.2,24.4) with two nails.
