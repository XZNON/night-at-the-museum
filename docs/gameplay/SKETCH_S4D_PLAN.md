# Sketch S4D — Both rides into Layer 3 and final S4 gate

> Update 2026-10-07: the wall climb has three nails (pickup at the Layer 3 start), taken back on the post-climb ground; the second section is now the [free-placement moving-swing crossing](SKETCH_S4B_PLAN.md) with two nails. Read glue/fixed-swing references below accordingly. See [S4 plan update](SKETCH_S4_PLAN.md).

> **S4D delivered (2026-10-07, at review):** `layers-1-3` as specified below; see the [S4D evidence](../validation/sketch-s4/s4d/README.md) for the data-keyed fixes, recovery table and results.

## Revision for the delivered S4A/S4B/S4C (2026-10-07, supersedes conflicting text below)

> **Order change (user, 2026-10-07):** both escalators become vertical lifts in a separate block, [S4L](SKETCH_S4L_PLAN.md), which runs **before** S4D. Wherever this plan says escalator, ride pad, treads, boarding with E, `l1-escalator`/`l2-escalator` or `escalatorPosition`, use the delivered S4L lifts (`l1-lift`/`l2-lift`, step on to ride, invisible walls, one-way) and its evidence. The second lift arrives beside `l3-arrival`, so the climb entrance (4.2, 24.4) is unchanged.
>
> **S4L delivered (2026-10-07, at review):** the legs carry `lift` (IDs `l1-lift`, `l2-lift`) instead of `escalator`; read `l1-escalator`/`l2-escalator` below as those. Arrival commits in place on the parked deck (`l2-lift` deck x-2.6..0, top 24.4, beside `l3-arrival`), so the climb starts when the player steps right onto `l3-arrival`; retries on that ground still use (4.2, 24.4). Layer 3 studies already draw both decks parked (`route.parkedLifts`); a `layers-1-3` preset plays all three legs so it needs none. See the [S4L evidence](../validation/sketch-s4/s4l/README.md).

S4A, S4B and S4C are accepted and pushed (`6e89b0e`). Read their evidence first: [S4A](../validation/sketch-s4/s4a/README.md), [S4B](../validation/sketch-s4/s4b/README.md), [S4C](../validation/sketch-s4/s4c/README.md), plus [S3B](../validation/sketch-s3/s3b/). Where the original text below says glue, `l3-glue`, glue route or "accepted wall/glue route", read the S4B swing crossing (`l3-swings`) and the S4C joined Layer 3.

### What already exists (verify, do not rebuild)

- **Presets** (`src/levels/`): `sketchRoute` (`layer-1`), `sketchLayerTwo` (`layer-2`), `sketchJoinedRoute` (`layers-1-2`, legs `layer-1` → `layer-2`, S3 endpoint on `layer-3-landing`), `sketchLayerThreeWalls`, `sketchLayerThreeSwings`, `sketchLayerThree` (`layer-3`, legs `l3-walls` → `l3-swings`). `sketchLayerThreeSwings` already spreads every Layer 1/2 solid, mechanism and target through the walls preset, so one field can hold all four legs without duplicate IDs.
- **The second ride already lands on the climb's entrance.** `l2-escalator.arrival` is (4.2, 24.4) on the `l3-arrival` collider (x0..10, top 24.4), which is exactly the `l3-walls` section spawn. No connector or new geometry is needed.
- **Leg chaining.** `arrive()` follows `nextLegId` for a ride (`legId = next; restartLeg()`); `continueOnGround()` (S4C) follows it for a same-layer grounded exit; `restoreSession` walks the `nextLegId` chain from the entry leg, so four linked legs restore by construction; a mid-ride snapshot downgrades to that leg's exit checkpoint.
- **Section settings** (`SketchRouteLeg.settings`: `wall`, `placementReach`, `nailPickup`, `airCoast`; `hint`). `fieldSettings` is `leg.settings ?? field`. Layer 1/2 legs have no settings, so the new field must leave `wall`, `placementReach`, `nailPickup` and `airCoast` undefined (Layer 1/2 keep air braking and reach 10); the two Layer 3 legs carry the S4C settings (third nail, reach 11, wall feel, `airCoast: true`).
- **Camera:** rides blend from the departure band to the arrival section band (`leg.arrivalSectionId`); `sectionBlend` eases `l3-walls` → `l3-swings` over the ledge.

### New preset `layers-1-3`

Compose `sketchLayerThree` with the Layer 1/2 legs. Add `'layers-1-3'` to `SketchRouteId`/`sketchStudies`. Entry leg `layer-1`, spawn/deathY from `sketchRoute`. Legs (cloned, never mutating shared arrays/objects):

| Leg | Next | Ride / arrival section | Settings |
| --- | --- | --- | --- |
| `layer-1` | `layer-2` | `l1-escalator` → `layer-2` (as `layers-1-2`) | none |
| `layer-2` | `l3-walls` | `l2-escalator` → `l3-walls` (was `layer-3-landing`) | none |
| `l3-walls` | `l3-swings` | none (grounded handoff) | S4C climb settings |
| `l3-swings` | — | none (terminal end ledge) | S4C crossing settings |

`sectionOrder`: `layer-1`, `layer-2`, `l3-walls`, `l3-swings`. Keep `sectionBlend`. Layer bands: Layers 1/2 as in `layers-1-2`, Layer 3 as in `layer-3` (playable, height 40). Old presets keep their own legs and endpoints (`layers-1-2` still ends on `layer-3-landing`).

### Hard-coded assumptions that will be wrong for `layers-1-3` (fix from data, keep old texts identical)

`src/gameplay/sketch-model.ts`:
- `update()` hazard cue: `this.field.hazards.length ? 'Glue! Quick retry.' : 'Caught by the axe…'`. The new field has the glue pool, so a Layer 2 axe hit would say "Glue!". Choose the text by what was actually hit.
- `arrive()` cue: "Layer N reached. Three boards, two nails; the axes stay active." is Layer 2's. Arriving at `l3-walls` needs the climb's own cue (pick up the third nail).
- `layerThree` (route-id list) controls the strict Layer 3 snapshot rule and the `move` HUD reset; `laterSection` (route id `layer-3`) controls the crossing's retry/fall texts; `hud().motion` shows wall-slide/swing text only for `layer-1` or `layerThree`. Make these follow the active leg/section (e.g. a Layer 3 leg) so `layers-1-3` gets the S4C behavior on Layer 3 and the S3 behavior on Layers 1/2. Do not loosen the existing Layer 3 restore strictness or the S2 queue-normalization path.
- `afterStep()` exit cue and `hud().endpoint` are keyed by route id; the new terminal needs "S4D endpoint · Layers 1–3 complete · Stop for review", and the S3 "Layer 3 ground" endpoint must never appear in `layers-1-3`.
- `targetEligible` keeps S2's post-clear exploration only for route `layer-1`; leave it.

`src/scenes/unfinished-sketch.ts`: wall letters only for `layer-3-walls`/`layer-3` field ids; add the new id (or key it on data). Ring hiding uses `field.surfaces`, so in `layers-1-3` other legs' rings hide in every section (in `layers-1-2` they show small with "Another layer."). Accept and record it, or key the rule on the active leg; do not change the isolated presets.

`src/main.ts`, `src/ui/game-ui.ts`, `src/style.css`: study mapping, menu card, eyebrow, build tag, pause "Restart Layers 1–3", HUD layout for the new study id.

### Recovery and ownership (expected)

| Where | Glue / fall / hazard | `R` / checkpoint | Leave + re-entry | Restart Layers 1–3 |
| --- | --- | --- | --- | --- |
| Layer 1 | Layer 1 start | Layer 1 start | Layer 1 start (S2 queue rules) | Layer 1 start |
| Layer 1 exit / first ride | Layer 1 exit | exit | exit (mid-ride → exit) | Layer 1 start |
| Layer 2 | Layer 2 start (64.2, 15.2) | Layer 2 start | Layer 2 start | Layer 1 start |
| Layer 2 exit / second ride | Layer 2 exit | exit | exit (mid-ride → exit) | Layer 1 start |
| Climb (after the second arrival) | climb entrance (4.2, 24.4), pickup back | climb entrance | climb entrance | Layer 1 start |
| Crossing | swing start (17.2, 49.5), climb kept | swing start | swing start | Layer 1 start |
| End ledge | end ledge | end ledge | end ledge | Layer 1 start |

The second arrival starts the climb once with two nails (the third is collectable), zero velocity, cleared input and phase zero; no S3 endpoint. Held E/Space from the ride must not act on arrival.

### Tests and evidence (reuse)

- Unit (`tests/sketch-layers-1-3.test.ts`, proposed): composition (unique IDs, four legs, links, Layer 1/2 legs without settings, `airCoast` only on Layer 3 legs); ride and leg boundaries with the existing S3 fixture style (`tests/sketch-joined.test.ts`: `exit`/`board`/arrival ticks) since there is no input-only Layer 1/2 harness; from the second arrival, the input-only climb (`tests/sketch-layer3-climb.ts`, which needs an option to start from a given model) and `cross()` from `tests/sketch-layer3-swings-route.ts` (accepts a starting run; walk to x ≥ 16.8 first, since F's kick now lands at x ≈ 14.1) to the S4D endpoint; per-section recovery/restore table; hazard and arrival cues; snapshots from every other study refused or kept per their own rules.
- Browser (`tests/browser/sketch-layer3-full.spec.ts`): Layer 1 via `traverseLayerOne` (`tests/browser/sketch-layer1-controls.ts`); Layer 2 and the rides via the helpers in `tests/browser/sketch-layer2.spec.ts` (not exported; extract into a shared module and rerun that spec to show no behavior change); Layer 3 via the helpers in `tests/browser/sketch-layer3-joined.spec.ts` (same: extract, then rerun). Known bot traits: an M2 click while swinging can miss (re-aim), the bars beat over ≈37 s (hang up to 40 s), the S4B bot sometimes needs several crossing attempts, and one S3B joined timing assertion flaked once in S4C.
- Regressions: S4C joined, S4A, S4B, S1 mechanics, S3 `sketch-layer2` (with `SKETCH_EVIDENCE_DIR`). Move S4A/S4B spec outputs into `docs/validation/sketch-s4/s4d/regressions/` and restore the accepted files; unit runs also rewrite accepted S4A/S4B/S3B measurement JSON, so restore those from git unless values legitimately changed. Do not edit `src` during a browser run.
- The full route is long (two rides plus four sections): budget test time and keep Playwright's 600 s per-test timeout in mind.

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

- [x] Continuous Layer1→S4 endpoint and independent studies pass their real-control gates.
- [x] Checkpoint/session/input/resource contracts hold across rides and same-layer transitions.
- [x] Earlier challenge geometry and production/save isolation are preserved.
- [x] S4 status/evidence accurately state completion; no S5 or final art is started.

## If D needs more time

Keep D as its own integration/verification session or add a separately requested D continuation for unresolved defects. Do not narrow verification to make it appear complete, change old expectations to accept a regression, or begin S5 before the S4 gate and user review. No automatic commit/push/publish.
