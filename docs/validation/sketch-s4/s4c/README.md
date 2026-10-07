# Unfinished Sketch S4C — joined Layer 3 review gate

2026-10-07. S4C is implemented and **accepted by the user** after the Layer 3 air-momentum review fix below, and committed/pushed at their request. S4D (joining Layers 1/2 to this Layer 3) needs its own request. S4 as a whole is not complete.

Play [joined Layer 3](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3) after `npm run dev`. The accepted isolated entries keep their behavior and endpoints: [S4A wall climb](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-walls), [S4B swing crossing](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-swings), [joined Layers 1/2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2), [direct Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2), [Layer 1](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1) and [S1 mechanics](http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics). Production preview ignores studies.

## Review fix: Layer 3 air momentum (user, 2026-10-07)

While testing S4C, the user reported that letting go of A/D during a jump made the player drop straight down instead of keeping the motion it had. The S4B fix covered only swing releases; ordinary jumps and wall kicks still braked to a stop in the air (ground braking, 70 u/s²). The user chose **Layer 3 only**: in the climb and the swing crossing (joined `layer-3`, isolated `layer-3-walls` and `layer-3-swings`), letting go in the air keeps the horizontal speed until landing. It slows only the way holding that direction would, so it never reaches further than holding it; the opposite key still steers. Layers 1/2, the S1 bays and Royal Supper keep air braking (tested).

- Code: `CharacterController.airCoast` (off by default) used by the existing coast rule; field/leg setting `airCoast` (`SketchLegSettings` includes it) set on S4A's field (inherited by S4B) and on both joined legs. `tests/sketch-movement.test.ts` adds: a let-go jump keeps 6.8 u/s and lands within 95–100% of the held distance; earlier layers, S1 bays and Supper keep braking.
- Effect on the climb: with the momentum kept after the kick's apex, F's kick now carries straight onto the ledge (landing x 14.08) instead of first landing on E's top; the input-only climb takes 312 frames instead of 377. Every S4A/S4B unit check and bypass probe still passes. Their new measurements are in `regressions/layer3-air-coast-unit/` (accepted S4A/S4B files left unchanged). S4B skip-M1 closest distances are now 11.8u/9.48u from F's near/middle spots (grip radius 2). Joined unit tests now walk right to the crossing start before nailing F's far end, as a player landing at x 14 must.
- A player who wants to stop over strip F's head or another small landing now taps the opposite key instead of letting go.
- Verification after the fix: 182/182 unit tests, build. Browser: joined 7/7, S4A 8/8, S4B 8/8 (two crossings needed a second bot attempt), S1 12/12; S3 13/14 with one S3B joined 1280 timing assertion (0.78 vs < 0.5) failing once, then 4/4 on rerun (Layers 1/2 do not use the changed path). The browser joined helpers now catch the moment over the ledge on F's kick and walk to the crossing start first. Current browser JSON/captures in this folder and `regressions/` are from this run.

The sections below describe the original S4C gate; where they give the handoff landing (x 19.2–21.6, a hop from E's top) or 180 unit tests, the review fix above supersedes them.

## What the player does

1. Enter on the Layer 3 arrival ground (4.2, 24.4) with two nails. Pick up the third nail, climb the six criss-cross walls exactly as in S4A (reach 11, grip then fast slide, kick buffer).
2. From F, kick over E onto the high ledge. The **grounded landing** on that ledge is the handoff: "Wall climb clear. The third nail is taken back: two nails for the swing crossing." The player stays where they landed; nothing completes and no endpoint shows.
3. The same ledge is the crossing's start ground. Cross the glue exactly as in S4B (free placement on strip F and bars M1/M2, two nails, reach 10) and land on the fixed end ledge: "S4C endpoint reached · Wall climb and swing crossing clear · Stop for review".

During the crossing, glue, a fall, `R`, the pause panel's checkpoint retry and leave/re-entry all return to the swing start (17.2, 49.5) with two nails; the climb stays cleared. **Restart Layer 3** (pause panel) returns to (4.2, 24.4) with the pickup back. On the end ledge, `R`, a fall and re-entry stay on the ledge.

## Implemented behavior

- **Preset** `sketchLayerThree` (`src/levels/unfinished-sketch-layer3.ts`), route/study `layer-3`, entry leg `l3-walls`. It spreads the accepted `sketchLayerThreeSwings` (which already contains the climb's solids, mechanisms and targets), so every ID appears once and the ledge `l3-walls-exit` (x13.2..22, top 49.5) is one collider shared by both sections. Legs: `l3-walls` (`nextLegId: 'l3-swings'`, no escalator) and `l3-swings` (terminal). Sections and camera bands are the accepted ones, unchanged. No connector, ride, hidden wall or new geometry.
- **Grounded continuation** (`SketchRouteModel.continueOnGround`, `src/gameplay/sketch-model.ts`): the existing grounded exit commit (body grounded, feet exactly on the exit height, overlapping `exitBounds`) now hands over when the leg has a `nextLegId` and no escalator. It advances the leg once, resets the ledger (third nail and pickup taken back), attachment, wall/swing state, jump allowances (respawn in place), mechanism phase (elapsed 0, as the S4B retry does) and queued commands, and keeps `completed=false`. The scene clears held/queued input on the leg boundary as it does for rides and recoveries. An airborne overlap never commits; once on the crossing, the climb's leg is gone, so walking back, jumping and relanding cannot recommit.
- **Section-owned settings:** a leg may carry `settings` (`wall`, `placementReach`, `nailPickup`) that replace the field values while it is active, plus a section `hint`. The joined preset has none of these at field level: the climb leg carries S4A's wall feel, reach 11 and pickup; the crossing leg carries `{}` (shared tuning, reach 10, no pickup). Movement tuning is swapped at every leg start (`SketchMovement.retune`). Isolated presets have no leg settings and use their field values exactly as before (tested).
- **Placement mode and rings:** `freePlacement` follows the active leg's surfaces, so on the climb a click goes to marked wall rings only (no ghost or empty-air cross), and on the crossing clicks drive free nails. The joined field has surfaces, so the existing rule hides rings the active section does not own in both sections (Layer 2 rings on the climb; wall rings on the crossing). The isolated S4A view is unchanged (compared captures).
- **Pickup and messages:** the third-nail pickup is drawn and collectable only while the climb is active. Fall text names the pickup on the climb and "The swing crossing restarts with two nails; the climb stays clear…" on the crossing; a crossing retry says "Swing crossing reset. Two nails available. The climb stays clear."
- **Restore/ownership:** the Layer 3 snapshot rules now include `layer-3`: route id must match, legs must be on the entry chain, stage traversal or exit. A traversal snapshot restarts that leg at its entrance; a terminal snapshot restores the end ledge. A snapshot claiming the climb's exit is refused (that leg never rests there in the joined preset). Foreign (S4A/S4B/S2/S3) or malformed snapshots restart at the Layer 3 entrance; the isolated studies keep their own handling of a joined snapshot.
- **Camera:** `sectionBlend` on the joined route blends the climb band (view 24, centre y 29.5..46, look-ahead 0) into the crossing band (view 20, centre y 53..54.5, look-ahead 6) by the player's x over the ledge from 13.2 to 17.2 (smoothstep). It is camera-only; at x ≤ 13.2 the framing equals S4A's and at x ≥ 17.2 it equals S4B's.
- **UI:** menu card, eyebrow, build tag ("S4C / JOINED LAYER 3"), pause "Restart Layer 3", compact side-panel CSS. Debug readback adds `reach`, `pickupOffered` and `freePlacement` (read-only).

## Handoff observations

| Observation | Result |
| --- | --- |
| Unit climb (input-only harness) | handoff on frame 377 (6.3 s), landing x 19.34, y 49.5; log `pickup, pin C, A, B, C, Q, pin D, D, Q, pin E, E, Q, pin F, F, Q, top 49.9 (E), handoff` |
| Browser landings | x 19.2–21.6 on the ledge (the bot holds D through the hop from E); elapsed 0.08–0.10 s at the first observed frame |
| After the handoff | leg `l3-swings`, stage traversal, budget 2, available 2, queue empty, pickup false, reach 10, free placement on, motion normal, velocity 0, endpoint hidden, checkpoint "l3-swings start", wall rings "Another layer." |
| Commands queued for the landing tick | drained first (a surface click is refused on the climb; Q applied), then the ledger resets: queue empty |
| Airborne overlap at y 49.6 rising | no commit |

## Retry ownership

| Where | Glue / fall | `R` / checkpoint | Leave + re-entry | Restart Layer 3 |
| --- | --- | --- | --- | --- |
| Climb | entrance (4.2, 24.4), 2 nails, pickup back | entrance | entrance | entrance |
| Crossing | swing start (17.2, 49.5), 2 nails, climb kept | swing start | swing start | entrance, pickup back |
| End ledge | end ledge (59, 54) | end ledge | end ledge | entrance |

## Unit tests

`tests/sketch-layer3-joined.test.ts`, 11 cases; all unit tests 180/180 (169 before + 11). Measurements in `unit-measurements.json`.

- Composition: unique IDs for solids, mechanisms, targets, surfaces, hazards and legs; one shared ledge; legs/sections/exits equal the accepted presets; isolated presets carry no leg overrides.
- Section settings: climb reach 11, S4A wall feel, pickup, no free placement, surfaces refused; crossing reach 10, shared tuning, no pickup. Isolated S4A/S4B unchanged.
- **Full joined route with real inputs:** `tests/sketch-layer3-climb.ts` climbs (now stopping on the handoff tick), then `cross()` from `tests/sketch-layer3-swings-route.ts` (now accepting a starting run) crosses from where the player landed. Climb A, B, C, Q, D, Q, E, Q, F, Q; crossing F, M1, Q, M2, Q; 923 frames (15.4 s); replays from a fresh joined model to the S4C endpoint with two nails available and an empty queue.
- Once-only grounded handoff, in place; airborne overlap ignored; queued commands on the landing tick; held jump carries no press.
- Glue retry (74 frames to the glue), `R` with queued commands, Restart, climb fall, leave/re-entry per section, ten malformed/foreign snapshots, isolated studies with a joined snapshot, terminal ledge.

## Browser checks (real controls)

`tests/browser/sketch-layer3-joined.spec.ts`, Chromium headed, 7 cases, keys and mouse clicks only; debug state is read back, never written.

1. 1280×720 and 960×540: full climb → handoff → walk the ledge (camera blend) and back → crossing → S4C endpoint; terminal `R`, fall and leave/re-entry stay on the end ledge with one canvas and no texture/geometry growth; Restart Layer 3 returns to the entrance with the pickup back; campaign save sentinel untouched.
2. Deliberate glue fail after the climb; `R` with a nail placed, Space/D held and Q pressed together; pause-panel checkpoint retry; leave/re-entry while standing on F; leave during the glue recovery; a second glue fail after re-entry. All return to (17.2, 49.5) with two nails on `l3-swings`.
3. Leave/re-entry while sliding on A, a climb fall (names the pickup) and leave during the climb's recovery: all return to the entrance with the pickup back.
4. Pause while airborne over the ledge before the handoff, resize to 960×540 (frozen state), resume and land: one handoff. Pause right after the handoff and resize back to 1280×720 (frozen). Actual tab blur while walking the ledge (frozen elapsed/body). A glue fail afterwards still retries the crossing.
5. Reduced motion: complete joined route.
6. Denied localStorage still enters; production preview has no debug hook and ignores the study.

Runs: four full runs of the spec. Runs 1–2 (before a helper change) had one failure each in the full-route case: run 1 at 960 (detail overwritten by an accidental immediate rerun, which passed 7/7) and run 2 at 1280, where a click on moving bar M2 while swinging missed and the bot waited for it forever. The S4B review recorded the same bot behavior. The helper now re-aims after a missed click (a miss is an ordinary refused placement; the queue is asserted unchanged). Runs 3 and 4: 7/7 each; the recorded evidence is run 4, where every crossing completed on the first attempt and one M2 click needed a second aim. A first full-route version also timed out waiting for an M2 window after the ledge walk delayed the crossing: the bars' 5 s and 4.4 s periods beat over about 37 s, so the bot now hangs up to 40 s on M1 for a window (a human can simply wait too).

Captures (paused frames hide only the pause card): `entrance`, `on-a`, `pinned-f`, `handoff`, `ledge`, `on-f`, `swinging-m1`, `exit` at both sizes; `resize-before-handoff-960`, `resize-after-handoff-1280`, `crossing-reentry-1280`.

## Regressions

Rerun after the implementation, with no `src` edits during browser runs (the running 5173 Vite server is this checkout's):

| Spec | Result | Output |
| --- | --- | --- |
| `sketch-layer3-walls.spec.ts` (S4A + affected S1 walls + isolated S2) | 8/8 | moved to `regressions/s4a-walls/`; accepted S4A files restored from git |
| `sketch-layer3-swings.spec.ts` (S4B) | 8/8; the 960 crossing took three bot attempts (two glue retries), the others one | moved to `regressions/s4b-swings/`; accepted S4B files restored |
| `sketch-mechanics.spec.ts` (S1) | 12/12 | no files |
| `sketch-layer2.spec.ts` (S3 direct/joined, S2, S1 pins) | 14/14 | `SKETCH_EVIDENCE_DIR=docs/validation/sketch-s4/s4c/regressions/s3` |

Typecheck and build pass (existing >500 kB chunk warning). Royal Supper/campaign specs were not rerun: shared controller, input, save and campaign code are unchanged; save/progression unit tests pass.

## Review questions

- Is the handoff readable? The landing cue names it, the HUD switches to "Layer 3 swings", the climb's walls return to moving outlines (the nails are taken back) and the camera eases into the crossing's band as you walk right.
- Landings from the hop over E often end near the ledge's right edge (x ≈ 21.5 of 22). The boundary clears held keys, so the run stops there; keeping D held re-engages after key repeat and walks into the glue (a crossing retry; the climb is kept). Is that acceptable as is? No geometry was changed.
- The crossing's bars restart their motion at phase zero on the handoff, as on every S4B retry, so they visibly jump once if in view.

## Known limits

Scripted input only; the user's play is the comfort check. No human playtest or representative-machine performance claim. Earlier layers are not joined (S4D).
