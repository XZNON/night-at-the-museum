# Sketch S4A — Isolated criss-cross wall climb

2026-10-07: implemented, then revised after user review into a six-board continuous criss-cross (section-only kick lock); at the playable review gate; see [evidence](../validation/sketch-s4/s4a/README.md). Originally 2026-10-06 planning. First of four S4 blocks. Read [S4 contracts](SKETCH_S4_PLAN.md) and use [the S4A prompt](SKETCH_S4_PROMPTS.md#s4a--wall-climb) only when implementation is requested. S3 baseline is `77acf03`; recheck actual checkout and preserve newer work.

## Playable result and boundary

Deliver proposed `?scene=unfinished-sketch&study=layer-3-walls`: safe arrival/practice, three up/down climb boards requiring alternating contacts and FIFO reuse, and a fixed post-climb endpoint. Keep the Layer 2 band and stacked cartoon world visible. Do not build glue, connect earlier layers into this study, change the old S3 endpoint or start B.

## Implementation order

1. Inspect `SketchRouteModel`, the wall contact rules and current scene/UI study dispatch. Recheck Node/npm, branch/HEAD/origin, local changes and server ownership. Record old S3 baseline behavior from its retained evidence; historical tests are not a fresh run.
2. Add `l3-walls` to the leg union and `layer-3-walls` to the study/preset union. Create `src/levels/unfinished-sketch-layer3.ts` with stable wall data, Layer 3 arrival/exit sections and no duplicate IDs. Use the existing x0..10/top24.4 arrival/spawn(4.2,24.4). Preserve the original S3 data and leave its studies terminal.
3. Author a short safe approach that permits a first wall transfer, followed by the exposed three-board climb. Use opposing board faces, not an unchecked linear array. Reuse pinned-only, phase-resuming climbable board configuration as the labelled S4 working default. Start with S1 board sizes/gaps/periods, then measure the actual geometry. The third board must be pin-able with the recalled A nail while B supports the player.
4. Extend only the required route behavior for a terminal non-escalator wall leg. Grounded fixed exit commits the checkpoint and endpoint; `arrivalSectionId: null` never causes an asserted lookup. R/fall/re-entry reset wall entrance during traversal and fixed exit after completion. Add preset ownership to new memory snapshots per the overview; retain old S2 normalization. No same-layer next-leg continuation is needed until C.
5. Wire the new study/menu/restart labels. HUD uses the actual wall-slide state and current checkpoint. Preserve E semantics, air-jump/transfer-credit protections and unrelated controller behavior. Verify target hit areas and reason strings during a slide.
6. Adjust only the new preset's paper bounds, reserved guides and wall focus band. Tall-board outline/ink geometry must exactly match its collider. Keep both opposing targets in the decision view at 1280x720 and 960x540; add a section-local look-ahead override only if measurements justify it, with old camera defaults unchanged.
7. Add focused ownership/recovery/grounded-checkpoint cases and input-driven full wall-route feasibility. Run actual browser traversal and preserve affected S1/S2/S3 regressions. Save final geometry and observations before declaring the entry working.

## Measurements and checks

- Measure useful entry pin ranges, both contact-face signs, wall-kick flight and final landing. Wall capture happens while descending; a rising near-contact is not a proven transfer.
- Measure time from stable wall contact until sliding off its bottom, target visibility and the interval in which the next pin/kick works. Show several useful phase schedules, not one exact scripted click. Try early/late ordinary pin choices; label bad choices honestly.
- Probe no nails, only one board, omission of A/B/C, same-board kick repeats, ordinary air jumps over the route and top-edge landings. Solve bypasses with authored support/reach/height/clearance, not required-pin flags or completion counters.
- Exercise Q while A/B is the current wall, R with pending place/recall/jump, falls before/after checkpoint, re-entry during slide/recovery, restart and actual blur. Available + placed always equals two.
- Camera captures: entrance, practice, A→B, B/Q→C, final ascent and exit at both sizes. Confirm Layer 2 context, visible nail head/face, oldest marker and readable next target.

## Verification gate

Run `npm run typecheck`, `npm run test`, `npm run build` and proposed `tests/browser/sketch-layer3-walls.spec.ts` with tracing off. Rerun affected reviewed S1 wall/FIFO cases, S2 traversal and S3 direct/joined endpoint cases because route types/model/scene dispatch are touched. If shared controller/input or campaign/UI behavior changes, include the relevant Supper movement/production checks; broaden only for changed risk or failure.

Write `docs/validation/sketch-s4/s4a/README.md`, exact verification outcomes, final typed geometry, useful windows, skip margins and real-control captures. Unit state fixtures and real-control route evidence must be distinguished. Update PLAN/NEXT_SESSION to S4A review, not B implementation.

- [x] Full entrance→three-board climb→fixed endpoint works through real inputs at both sizes.
- [x] All three pins/FIFO reuse are physically required; alternation works without same-wall jump replenishment.
- [x] Slide timing permits readable placement; no support recall trap or wrong-section placement. (Scripted windows measured; human comfort of the B kick is the open review question.)
- [x] Retry/re-entry/restart/terminal recovery and prior entries remain correct.
- [x] Focused/build/browser gate and evidence are complete; stop for user review.

## If A needs more than one session

Do not combine A with B. If the three-board geometry or camera cannot be resolved comfortably, finish **A1** with a real playable entrance→safe first A/B transfer and bounded endpoint, measurements and explicit outstanding work. After its review/request, **A2** adds the third-board FIFO climb and final fixed landing, then runs the full A gate. An A1 placeholder endpoint does not mark A or S4 complete. Carry the unfinished evidence/geometry forward; never replace it with a build-only success claim.
