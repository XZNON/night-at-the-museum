# Sketch S4C — Connected Layer 3 and section recovery

> Update 2026-10-07: the wall climb has three nails (pickup at the Layer 3 start), taken back on the post-climb ground; the second section is now the [free-placement moving-swing crossing](SKETCH_S4B_PLAN.md) with two nails. Read glue/fixed-swing references below accordingly. See [S4 plan update](SKETCH_S4_PLAN.md).

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
