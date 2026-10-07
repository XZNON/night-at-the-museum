# Sketch S4D — Both rides into Layer 3 and final S4 gate

> Update 2026-10-07: the wall climb has three nails (pickup at the Layer 3 start), taken back on the post-climb ground; the second section is now the [free-placement moving-swing crossing](SKETCH_S4B_PLAN.md) with two nails. Read glue/fixed-swing references below accordingly. See [S4 plan update](SKETCH_S4_PLAN.md).

2026-10-06 planning only. Fourth S4 block, separately requested after C review. [Overview/contracts](SKETCH_S4_PLAN.md), [paste-ready D prompt](SKETCH_S4_PROMPTS.md#s4d--full-route-through-s4).

## Playable result and boundary

Deliver proposed `?scene=unfinished-sketch&study=layers-1-3`: existing Layer1 pendulums → first ride → existing hard Layer2 → second ride → accepted walls → accepted glue → fixed S4 endpoint. This remains a save-isolated development study, not the complete second adventure. Preserve `layer-1`, `layer-2`, `layers-1-2`, A/B and joined L3 studies with their own endpoints. No finale/sun/campaign/ending/art work.

## Implementation order

1. Verify C's accepted route/checkpoint behavior and original S3 paths/landing/tuning. Recheck workspace/runtime/local changes and server ownership. Preserve newer edits and exact reviewed challenge data.
2. Add new `layers-1-3` preset composing the existing Layer1/2 and C route in one field. Clone only linkage for this preset: Layer2 `nextLegId: 'l3-walls'`, arrival section is the real wall entrance. Do not mutate shared arrays/legs or globally change old preset endpoints.
3. On second arrival advance once into `l3-walls` traversal with two nails, deterministic phase, zero velocity, cleared input and no S3 endpoint. Keep the exact second-ride arrival `(4.2,24.4)` on fixed support. Mid-ride leave/re-entry/R still uses Layer2 departure; arrival/fall/R now uses wall entrance in this preset. First ride retains Layer2 local behavior.
4. Snapshot ownership links all four legs, with layer3 section IDs independent of numeric layer. Once wall clears, glue retries stay there. Restart uses Layer1 entrance; direct L3 restart still uses L3 entrance. Update menus/labels and stage-specific cues from actual typed section/route data; no forced S3/Layer2 prose for new legs.
5. Preserve both keyed ride pads/treads and all scene ownership. Inspect the second arrival's blended camera/target view and the L3 handoffs at both sizes/reduced motion. Neighboring layers remain context, not selectable challenge targets.
6. Run the full new route and targeted earlier-study regressions. Fix only integration defects found; material mechanic retunes go back to the owning A/B review with remeasurement, not a silent last-minute difficulty change.
7. Update all current status documents and record the complete S4 gate/evidence. Offer playable review and stop before S5. Whole adventure/campaign completion remains unchecked.

## Final verification matrix

| Proof | Required result |
| --- | --- |
| Full route 1280x720 and 960x540 | Real inputs complete both rides, both L3 sections and one final endpoint |
| Direct wall/glue/joined L3 | Same accepted data, correct entrance/retry/endpoints |
| Existing S2/S3 entries | Old arrival/endpoints intact; mandatory outlines/pins/FIFO and axes unchanged |
| First/second ride retry/re-entry | Return to corresponding departure; no partial transit or held-E auto-action |
| Failure after each arrival/section | Active section entrance, not earlier cleared challenge |
| Restart per selected preset | Correct study entrance, clean ledger/attachments |
| Pause/actual blur/reduced motion/resize | Frozen simulation/transit, cleared input, readable targets and stable framing |
| Save/lifecycle/production | Sentinel unchanged, denied storage works, one canvas, resources released, new selectors ignored in production |
| Shared-code regressions | Accepted S1 wall/foothold/fixed/moving swing; Supper/campaign checks only where changed paths warrant them |

Run typecheck/all focused/build and proposed `tests/browser/sketch-layer3-full.spec.ts`, plus relevant direct/Layer3/S2/S3 browser cases. Use tracing off and no concurrent source edits during a run. Record ordinary retries, failures and targeted reruns; do not claim a single clean suite if results are aggregated.

Evidence: `docs/validation/sketch-s4/s4d/README.md`, verification/observations, both-size second-ride boarding/transit/wall arrival, L3 connection and final-ground captures. Link the preserved A/B measurement files rather than copying their results as fresh. Browser feasibility is not measured human difficulty/duration or representative-machine performance.

- [ ] Continuous Layer1→S4 endpoint and independent studies pass their real-control gates.
- [ ] Checkpoint/session/input/resource contracts hold across rides and same-layer transitions.
- [ ] Earlier challenge geometry and production/save isolation are preserved.
- [ ] S4 status/evidence accurately state completion; no S5 or final art is started.

## If D needs more time

Keep D as its own integration/verification session or add a separately requested D continuation for unresolved defects. Do not narrow verification to make it appear complete, change old expectations to accept a regression, or begin S5 before the S4 gate and user review. No automatic commit/push/publish.
