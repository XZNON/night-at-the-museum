# Sketch S4C — Connected Layer 3 and section recovery

> Update 2026-10-07: the wall climb has three nails (pickup at the Layer 3 start), taken back on the post-climb ground; the second section is now the [free-placement moving-swing crossing](SKETCH_S4B_PLAN.md) with two nails. Read glue/fixed-swing references below accordingly. See [S4 plan update](SKETCH_S4_PLAN.md).

## Revision for the delivered S4A/S4B (2026-10-07, supersedes conflicting text below)

Both sections are accepted and pushed (`68e7785`). Read their evidence first: [S4A](../validation/sketch-s4/s4a/README.md), [S4B](../validation/sketch-s4/s4b/README.md). Where the original plan below says glue route, `l3-glue`, foothold A/fixed swing or "broad safe descent", use these facts instead.

- **No connector to build.** S4A's exit ledge `l3-walls-exit` (x13.2..22, top 49.5) *is* S4B's start ground: both presets use the same collider. S4A's exit spawn is (17, 49.5) and S4B's section spawn (17.2, 49.5). The joined handoff is the grounded landing on that ledge (S4A's existing `exitBounds`), which advances `l3-walls` → `l3-swings` exactly once.
- **Legs/sections:** `l3-walls` (targets `l3-wall-a..f-pin`, entry spawn 4.2,24.4) gets `nextLegId: 'l3-swings'`; `l3-swings` (no marked targets, `surfaceIds` strip F/bars M1/M2, terminal end ledge x57..65 top 54) keeps its exit. Proposed preset/study `layer-3` (route id to add to `SketchRouteId`/`sketchStudies`), entry leg `l3-walls`. Compose from the two delivered presets in `src/levels/unfinished-sketch-layer3.ts` without duplicate IDs (`sketchLayerThreeSwings` already spreads the wall preset's solids/mechanisms/targets).
- **Grounded continuation:** today `afterStep` commits the exit checkpoint and, with no escalator, sets `completed`. Add the bounded helper: a leg with `nextLegId` and no escalator advances on that grounded commit instead (reset ledger, pickup, attachment, jump state, phases and queued input; `completed=false`; cue/HUD name the swing crossing). `arrive()` already follows `nextLegId` for rides; do not fake a zero-duration escalator.
- **The third nail is taken back at the handoff** (resetting the ledger clears `pickupCollected`), so the swings run with two nails as accepted.
- **Field-level settings must become section-aware in the joined preset.** These are per-playfield today: `wall` feel (movement built once in the `SketchPlayfield` constructor), `placementReach` (11 on the climb; S4B's measurements assume 10), `nailPickup` (pickup drawing/collection, reset text and the fall message "pick up the third nail again", which would be wrong on the swings), and `surfaces` (scene rules: free-placement click path, ghost, foreign rings hidden). Give the leg or section optional overrides (reach, pickup, wall feel) and use the active leg's values; the isolated S4A/S4B presets must behave exactly as accepted. The S4A wall feel only acts on walls, but verify it does not change the swings (e.g. kick lock/buffer never apply there).
- **Ownership:** only the active leg owns its targets/surfaces (`targetEligible`/`surfaceEligible` already use the leg). In the joined preset the ring-hiding rule should hide other legs' rings in both sections without changing the isolated S4A view.
- **Recovery:** during the swings, fall/glue/R/re-entry return to (17.2, 49.5) with two nails and keep the climb cleared; Restart returns to (4.2, 24.4) with the pickup back. `restoreSession`'s Layer 3 branch already walks `nextLegId` and restarts the snapshot's leg at its entrance; extend the Layer 3 route-id check to `layer-3`. Terminal R/fall/re-entry stay on the end ledge.
- **Camera:** sections already carry their own focus bands (walls: view 24, centre y 29.5..46, look-ahead 0; swings: view 20, centre 53..54.5, look-ahead 6). Blend between them over the ledge as the player walks; no camera-only progress.
- **Reuse:** input-only harnesses `tests/sketch-layer3-climb.ts` (climb) and `tests/sketch-layer3-swings-route.ts` (crossing; its `Run.start(field)` takes a field) for a full joined unit route; browser helpers in `tests/browser/sketch-layer3-walls.spec.ts` and `sketch-layer3-swings.spec.ts`. The S4A browser spec writes into `docs/validation/sketch-s4/s4a/`; move a regression run's output into the S4C evidence folder and restore the accepted files. Do not edit `src` during a browser run (Vite hot reload breaks the run).
- **Swing momentum:** a voluntary release now coasts with no input until landing (user fix during S4B review); keep it.

2026-10-06 planning only. Third S4 block, separately requested after A/B review. [Overview/contracts](SKETCH_S4_PLAN.md), [paste-ready C prompt](SKETCH_S4_PROMPTS.md#s4c--joined-layer-3). This is a playable integration gate, not permission to retune accepted mechanics.

## Playable result and boundary

Deliver proposed `?scene=unfinished-sketch&study=layer-3`: enter on the existing safe arrival, climb the accepted walls, walk across a broad safe post-climb connection, complete the accepted glue route and stop on fixed S4 ground. No previous layers' continuous entry or second-escalator continuation; older S3 presets keep their endpoint. S5 remains absent.

## Implementation order

1. Recheck actual A/B gates, geometry and session types. Resolve material review findings in those owning blocks before joining them. Preserve both isolated entries as regression references.
2. Compose wall/glue data by stable IDs in the shared Layer 3 module. Validate unique collider/mechanism/target/section IDs. Add ordinary fixed connector geometry between accepted exits/entries, including broad safe descent if the wall peak and glue approach differ in height. Reconcile shared landing colliders rather than stacking overlapping copies.
3. Add `layer-3` preset entering `l3-walls`. Its wall leg has `nextLegId: 'l3-glue'`, no escalator. Author ground connection/checkpoint bounds on the actual safe passage; align wall exit and glue entrance spawn to a reachable shared standing area. The transfer may anchor within that ground but must not teleport across a gap/challenge. Use one explicit grounded commit; airborne overlap and returning to the old pad cannot recommit.
4. Implement the bounded grounded continuation helper. Commit the next leg, reset nail/attachment/jump/phase/queued input, keep `completed=false`, and show Glue crossing/its checkpoint without an endpoint modal. Reuse the existing stages and leg field, not a zero-duration scripted ride. Terminal A/B studies still complete at their own exit.
5. Restore/retry uses active `l3-glue` after wall clear; restart uses preset entry `l3-walls`. A traversal snapshot always returns to current safe entrance with two nails, not a midair/gripped position. Reject wrong preset, unknown leg/stage and invalid route link; normalization cannot accidentally interpret glue as a Layer2 leg.
6. Correct endpoint/HUD hard-coded Layer2/S3 assumptions for S4 presets. Input clears on the same-layer boundary as on ride/leg/recovery boundaries. Framing blends over fixed walking ground and retains stacked context; no camera-only event mutates progress.
7. Validate individual entries plus complete A→B sequence with real inputs, particularly fails/re-entry/Restart after wall clear. Save exact handoff decisions and latest screenshots.

## Verification gate

Focused checks: exactly-once grounded advance, air overlap ignored, shared ground support, no intermediate `completed`, ownership before/after boundary, simultaneous held input/retry/commands, malformed restore, backtracking and terminal recovery. Complete route feasibility uses inputs, not positioned-state tests.

Browser checks at both sizes: full joined L3, deliberate glue fail after wall completion, R and same-session leave/re-entry from glue, fall/backtrack on connector, leave during wall/glue recovery, final endpoint/recovery and Restart returns to Layer3 entrance. Include actual blur, reduced motion and resize during the transition. Confirm two free nails at the handoff and one canvas/resources through repeated entry.

Run typecheck/all focused/build, proposed `tests/browser/sketch-layer3-joined.spec.ts`, accepted A/B browser traversals and affected S3 direct/joined recovery cases. Add relevant Supper checks if shared UI/input/campaign behavior changes; no full historical suite simply to repeat unchanged evidence.

Evidence: `docs/validation/sketch-s4/s4c/`, grounded transition observations, connector geometry, retry ownership table, both-size handoff/failure/re-entry/endpoint captures and exact results. Update NEXT_SESSION to C review. Do not mark whole S4 complete yet.

- [ ] One continuous wall→glue route completes at both sizes; no intermediate endpoint.
- [ ] Glue failure/leave/R never replays accepted wall; Restart does.
- [ ] Shared ground transition is readable, physical and once-only, with correct target/input ownership.
- [ ] Direct A/B and older S3 entries retain their reviewed behavior.

## If C needs an additional session

Keep C open. Deliver a connected playable route with a clearly identified remaining restore/lifecycle failure and reproducible case; do not mark the gate passed. Use a separately requested C continuation for that correction and its verification. Do not start D while section recovery remains unresolved, or use more sessions to add new challenge content.
