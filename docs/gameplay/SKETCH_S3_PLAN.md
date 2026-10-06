# Sketch S3 — Layer 2 boards, active axes and second escalator

Checkpoint update, 2026-10-06: S3A + S3B are complete for the user-requested origin/main checkpoint. Next is S4 on a separate implementation request; older proposed/unimplemented/review-only statements below are historical.

Planning date: 2026-10-06. **S3A difficulty revision and S3B implemented at the playable S3 review gate.** Fresh joined/second-ride evidence is in [s3b](../validation/sketch-s3/s3b/README.md); older planning text below is historical. The user subsequently rejected optional nails and explicitly requested faster boards/axes and compulsory pinning. Current tuning/evidence is in [hard-v1](../validation/sketch-s3/hard-v1/README.md), superseding the initial solid-board default and shortcut finding. The original planning scope below is retained; [S3A evidence](../validation/sketch-s3/README.md) records the later explicitly authorized implementation, measured default behavior and verification. S1 is accepted; preserve the latest S2 four-pendulum review result and its evidence in [four-pendulums](../validation/sketch-s2/four-pendulums/README.md). Fresh S3A results are in the validation record; historical S2 evidence remains unchanged.

## 1. Feature overview

Extend the connected Sketch picture with a compact Layer 2 board-and-axe route, then its second escalator to safe Layer 3 ground. Players freeze moving boards with two nails, time their jumps around axes that continue moving, and recall the oldest nail to prepare the next board. Keep modern cartoon 2.5D placeholders, one scene/canvas and moderate active-layer framing with neighboring-layer context. Deliver S3 in two separately requested work blocks, each with a playable review gate; S3 is complete only after both gates pass.

## 2. Goals and non-goals

Goals: a readable new hazard family; a usable freeze/FIFO strategy; reliable Layer 2-local failure recovery; and continuous Layer 1 → first escalator → Layer 2 → second escalator → fixed Layer 3 arrival. Preserve S1 and S2 controls, physics, four faster pendulums, outline/solid behavior, centered circular platform nail heads and both review entries.

Excluded: Layer 3 wall/glue/swing challenges, sun, museum entrance, campaign/ending, saves/schema changes, final art or asset generation, new dependencies, audio production, commits/pushes, publishing and sub-agents. Existing placeholder tools and approved player can be reused. S4 starts only on a later request.

## 3. Users and primary workflows

One desktop keyboard/mouse player; existing A/D or arrows, Space, click, Q, E, R and Escape controls.

1. **S3A direct entry:** enter a proposed `study=layer-2` shortcut on the existing fixed Layer 2 landing with two available nails. This remains part of the stacked picture, with earlier/later rows visible as context.
2. Observe board A and the first axe from safe ground, pin A at a useful phase, and jump into its safe standing region after the blade passes.
3. Pin B, time the next crossing, and land. From B, Q recalls A so that the freed nail can pin C; transfer to C around the second axe.
4. Land on fixed Layer 2 exit ground. Grounded landing commits a checkpoint, clears temporary nails/attachment/input and shows the S3A endpoint. No second escalator or Layer 3 playable content in S3A.
5. **S3B joined entry:** a proposed `study=layers-1-2` shortcut starts at Layer 1. Complete the preserved four-pendulum route and first escalator, then continue directly into Layer 2 instead of showing the S2 endpoint.
6. At the Layer 2 exit, walk to its boarding pad and press a fresh E. The second scripted ride deposits the player on fixed Layer 3 ground and shows the S3 endpoint. S3B also extends the direct Layer 2 entry through this ride.
7. Fall/axe contact/R retries the current challenge or safe checkpoint. Pause freezes motion and clears held inputs; leave/re-entry restores the remembered safe checkpoint, never midair or partway through a ride.

`study=layer-2` now works in development for S3A. `study=layers-1-2` remains proposed and unavailable until S3B. Keep `study=mechanics` and `study=layer-1` working with their existing scopes; unknown values still fall back to mechanics. Production ignores all shortcuts.

## 4. Functional requirements

### Settled rules and implementation defaults

| Subject | Requirement or default |
| --- | --- |
| Nail budget/input | Exactly two, authored targets, strict button-driven FIFO recall. Invalid/full-budget clicks do not reorder or evict. |
| Boards | Pinning freezes the current transform; recall resumes the captured motion phase. Boards offer no wall climbing here (`climbable: false`). |
| Board solidity | User difficulty revision: moving outlines have no collision until pinned; a pin freezes and inks support, recall removes it. This explicitly extends the authored rule to Layer 2; reviewed S1 stays unchanged. |
| Difficulty tuning | Narrow widths 3.4/3.0/2.6u; board periods 2.4/2.0/1.7s; axe periods 2.6/2.2s. Preserve movement/reach and measure windows/skip margins. |
| Axes | Independently mounted, continuously active scripted hazards. `freezable: false`, `hazard: true`; no nail targets on axes. Pinning any board cannot freeze an axe. |
| Layout | Working default: three board transfers and two independent axes, with different board paths/clearances. This is a starting layout count, not an approved fixed count. Prefer compact variety over repeating S2's four pendulums. |
| Direction | Working default: travel right to left from the existing right-side Layer 2 landing. Put the exit/second escalator to the left and its Layer 3 landing before the reserved S4 area. Guide locations are provisional and may be repositioned; S2 gameplay geometry stays intact. |
| Recovery | Checkpoint at Layer 2 entrance, then fixed exit, then fixed Layer 3 arrival. No checkpoint between the three intended board transfers by default. |
| Presentation | Cartoon board thickness and rounded tools, circular head-only platform nails centered on targets, readable independent axe mounting/sweep cues. |

Use authored geometry, motion phases and hazard clearance to make pinning useful and demonstrate the A/B/recall-A/C solution. Measure ordinary jumps and attempts to ride/jump unpinned boards; report discovered shortcuts honestly. FR27's outline mechanic is now explicitly authorized for Layer 2 by the user's difficulty review. Prove all three physical supports and FIFO reuse are needed through measured geometry, including late double jumps and edge grace; do not invent an invisible completion flag. Every otherwise valid landing remains valid.

### Checkpoint and transit transitions

| Current state / event | Required result |
| --- | --- |
| Direct Layer 2 start | Layer 2 traversal, two nails, local motion time zero, grounded safe spawn. |
| Layer 1 ride arrival, joined study | Commit Layer 1 clear; enter Layer 2 traversal with two nails and deterministic Layer 2 starting phases. Do not mark the joined route complete. |
| Layer 2 fall/axe/R | Short existing recovery cue, then Layer 2 start with empty FIFO and deterministic phases. Never require replaying Layer 1. |
| Airborne overlap of exit | Remain in traversal; only a real grounded landing commits the checkpoint. |
| Grounded exit landing | Clear temporary ledger/local motion/input; commit Layer 2 clear once. S3A ends here; S3B offers boarding. |
| Fresh E on exit boarding pad | Start only that leg's escalator. Consume E before movement/grip; suppress place/recall/jump commands throughout transit. |
| R during either ride | Return to that ride's departure checkpoint, not Layer 1 by default. |
| Pause/blur during a ride | Freeze player, transit time and camera; clear held/queued input. Resume does not launch on arrival. |
| Second ride arrival | Safe grounded Layer 3 spawn, zero velocity, cleared attachment/buffers, one S3 endpoint notification. |
| Leave during transit | Re-entry at that ride's departure checkpoint; never a fractional transit snapshot. |
| Restart adventure | Restart the selected development study's initial leg. Joined study resets Layer 1; isolated Layer 2 study resets Layer 2. This is a development-entry default, not campaign persistence. |

### Edge cases to exercise

1. Recall current support, repin into player overlap, or miss after recalling: ordinary recoverable motion, no trapping/phasing, no substituted nail.
2. Axe near a board/socket: no target hidden inside the lethal volume at all phases; provide a safe place to observe and click before commitment.
3. Axe contact from side/top/underside, while stationary, and while jumping: reliable local recovery; no thin-blade tunneling at authored maximum speed.
4. Clicking a nearby Layer 1 target while traversing Layer 2: refuse as belonging to another active route leg; camera visibility alone grants neither reach nor eligibility.
5. Multiple E/restart/recall/place events in one tick: restart wins; boarding consumes E; transit cannot buffer an action for arrival.
6. Resize while aiming or in transit: preserve mechanism phases/player/nails/checkpoint; reproject screen picking and maintain context.
7. Invalid/missing study, repeated exit/re-entry, denied storage and production query parameters: preserve current safe fallback and isolation.
8. Active Layer 2 fall passes above Layer 1 solids: trigger the local fall line before allowing accidental descent to become a checkpoint escape.

## 5. User experience requirements

Prove the entrance, every board/axe decision, exit and ride at 1280×720 and 960×540. Start from the established 18-unit camera view and 46-pixel target hit area; preserve global movement/reach tuning. Frame the upcoming landing and axe before jumping. For the proposed return path, add an authored section direction so look-ahead points left instead of keeping the current unconditional rightward offset. Direction changes at section boundaries, not on every movement key press.

Keep neighboring layers visible; do not isolate Layer 2 in a new screen or shrink everything to a full-world overview. During the second ride, interpolate between its actual departure/arrival focus bands, respecting reduced motion. HUD names the active layer/checkpoint, budget/oldest nail, nearest eligible target, hazard retry cue and boarding/endpoint.

Axes have a visible stationary mount and blade motion independent of boards. Use restrained cartoon motion/sweep cues and broad lighting; depth cannot hide hazards or the circular nail head. Inspect actual danger bounds against the visible blade, especially at diagonal angles. A conservative hazard bound must be understandable rather than causing apparently unexplained hits in empty space.

## 6. Technical design summary

Keep TypeScript/Vite/Three.js/HTML UI and the fixed 60 Hz loop. Reuse `SketchPlayfield`, the ledger, scripted board/axe motion, controller and lifecycle. The second real route leg justifies a small typed route-leg extraction; do not copy the model or build a general level engine.

| Actual integration point | Planned responsibility |
| --- | --- |
| `src/levels/unfinished-sketch.ts` | Extend validated study IDs, section direction and route-leg/session vocabulary; preserve S1 bay data and tuning. |
| `src/levels/unfinished-sketch-route.ts` | Preserve all S2 authored coordinates/periods/widths and its endpoint. Add Layer 2 data nearby; a separate `unfinished-sketch-layer2.ts` is appropriate if it keeps the file readable. Compose the joined preset from existing geometry rather than copying or overwriting it. |
| `src/gameplay/sketch-model.ts` | Replace assumptions of one exit/escalator with the active leg. Add entry/leg ownership, grounded checkpoint transitions and per-leg retry. Filter valid targets by authored ownership. Preserve the existing nail transaction and S1 movement paths. |
| `src/scenes/unfinished-sketch.ts` | Replace guides only where real Layer 2 content is built; build multiple escalator rigs keyed by stable ID; use active-leg transit and from/to camera bands. Keep S2/S1 visuals otherwise unchanged. |
| `src/main.ts` | Resolve validated study before `SaveStore` access; choose preset/entry leg; keep sessions separately by study instead of sharing the current single `routeSession`. Extend read-only dev observations. |
| `src/ui/game-ui.ts`, `src/style.css` | Correct study-specific introduction, current checkpoint, transit prompt, endpoint and retry/restart copy. Avoid exposing implementation details to the player. |
| `tests/sketch-route.test.ts` and new Layer 2 checks | Preserve S2 geometry/FIFO/transit regressions; add Layer 2 behavior and joined-leg recovery risks. |
| `tests/browser/sketch-layer1-*.ts` and new Layer 2/joined specs | Preserve real-control S2 regression; new direct and joined traversal, capture and lifecycle checks. Reuse observation and keyboard helpers with direction support. |

Important findings from current code:

- `SketchRoute`, `SketchRouteModel` and camera/renderer currently assume exactly one `escalator`, one exit, and `arrival` meaning the S2 endpoint. Appending boards alone would leave Layer 2 retries/completion wrong.
- `SketchPlayfield.update()` uses end-of-tick overlap against `axeHazard()`'s rotated-blade axis-aligned bounds. It is not a swept blade-contact test. Verify authored speeds/paths against missed contacts and diagonal false-positive clearance; if needed, add bounded swept/substep hazard checking for this real risk with focused S1 regression. No rigid-body engine.
- `centreAt()` currently gives axes a full periodic rotation. Preserve that established behavior as the starting default; do not promise a bounded pendulum axe animation unless deliberately authored and tested.
- The Layer 2 arrival is already at `(64.2, 15.2)`, on fixed ground spanning x 63..77. Keep it. Earlier left-side Layer 2 guides are scenery, not a proven playable route. Measure heights/spacing inside the reserved band before choosing exact new coordinates.

## 7. APIs and backend changes

No HTTP API, backend, network generation, jobs or persistence service. Existing `SketchCommand` stays `{ type: 'place'; targetId: string } | { type: 'recall' }`; actions are still validated by the model on the consuming fixed tick. The bounded internal factory change below seeds each study consistently.

- **Name:** `createRouteSession` (existing internal factory, extended).
- **Type:** Internal Service.
- **Method:** `createRouteSession(entryLegId = 'layer-1')`.
- **Path:** `src/gameplay/sketch-model.ts`.
- **Auth:** None; development-only study validation happens before construction.
- **Request Schema (JSON):** serialized argument, not a network payload:

```json
{ "type": "string", "enum": ["layer-1", "layer-2"], "default": "layer-1" }
```

- **Response Schema (JSON):** proposed fresh in-memory session:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["entryLegId", "legId", "stage", "elapsed", "sequence", "queue", "frozen"],
  "properties": {
    "entryLegId": { "enum": ["layer-1", "layer-2"] },
    "legId": { "enum": ["layer-1", "layer-2"] },
    "stage": { "enum": ["traversal", "exit", "transit", "arrival"] },
    "elapsed": { "type": "number", "minimum": 0 },
    "sequence": { "type": "integer", "minimum": 0 },
    "queue": {
      "type": "array", "maxItems": 2,
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["nailId", "targetId", "sequence"],
        "properties": {
          "nailId": { "type": "string" },
          "targetId": { "type": "string" },
          "sequence": { "type": "integer", "minimum": 0 }
        }
      }
    },
    "frozen": { "type": "object", "additionalProperties": { "type": "number", "minimum": 0 } }
  }
}
```

- **Validation:** typed entry must exist in the chosen route preset. Factory returns entry=active leg, traversal, zero time/sequence, empty queue/frozen. Restore filters unknown target/mechanism IDs and rejects inconsistent leg/stage ownership.
- **Error Codes:** no public error-code API; typed invalid entries are programmer errors. External query strings follow the safe existing fallback. Old in-memory S2 snapshots normalize to entry/leg Layer 1; there is no persisted save migration.
- **Idempotency:** factory has no shared-state/storage mutation; repeated calls create independent equivalent starting sessions.
- **Rate Limits:** not applicable. Existing fresh-input/transition guards apply.

## 8. Data model and storage

Planned narrow changes; exact naming can follow existing code conventions without changing the behavior above:

```ts
type SketchRouteLegId = 'layer-1' | 'layer-2';
type SketchStudy = 'mechanics' | 'layer-1' | 'layer-2' | 'layers-1-2';

interface SketchRouteLeg {
  id: SketchRouteLegId;
  sectionId: string;
  targetIds: string[]; // eligible placement targets for this leg
  exitBounds: Rect;
  exitSpawn: { x: number; y: number };
  exitDeathY: number;
  escalator: SketchEscalator | null; // null at the S3A exit review gate
  arrivalSectionId: string | null;
}
```

`SketchRoute`: extend route ID to the required presets, replace singular exit/escalator fields with `legs: SketchRouteLeg[]`, and keep existing typed sections/layers/guides/geometry. Represent the S2 preset as one leg with the same data and Layer 2-arrival endpoint. The S3A preset starts on the Layer 2 leg and ends at its fixed exit; S3B composes both legs and the Layer 3-arrival endpoint. Keep endpoint selection explicit in each preset.

`SketchRouteSection`: add optional `travelDirection: 1 | -1`, default +1 for unchanged S1/S2 framing. `SketchRouteSession`: add `entryLegId` and `legId`; retain existing stage/time/queue/frozen fields. Reset current-leg phase time on a new leg/retry, while the leg/stage preserves earlier clearance. Arrival on leg 1 in a joined preset advances once to leg 2 traversal; final arrival retains the endpoint state. Avoid duplicate stored completion flags that disagree with leg/stage.

Main stores `Map<route study, SketchRouteSession>` instead of a single shared session. Scene owns transit elapsed, command queue, input listeners and GPU resources. No localStorage tables, campaign save fields or schema version changes.

## 9. Services and technology choices

Existing custom kinematic movement and scripted mechanisms already meet this scope. Reuse their typed configuration, Three.js renderer and HTML HUD; no additional engine, ECS, service or package is justified. Final assets and providers remain a later task.

## 10. Security and privacy

All new studies are development-only and resolved before campaign store access. Verify sentinel save bytes remain unchanged, production strips the debug hook and ignores direct entries, and no credentials/provider calls appear in source or runtime. Existing campaign piece/restoration IDs remain untouched.

## 11. Observability and operations

Extend only read-only dev diagnostics needed for active study/leg/checkpoint, axis poses/hazard bounds, target ownership, pins, transit ID/progress and camera. Retain one canvas/loop and explicit disposal on repeated entry. Record measurements and failure cases in `docs/validation/sketch-s3/` when implementation starts; no evidence folder is being created as a substitute for testing now.

## 12. Rollout strategy

Implement S3A locally, validate and stop for review. A separate S3B request integrates accepted S3A and both escalators, validates direct and joined routes, and stops at Layer 3 safe ground. Keep the existing S2 preset as a regression/review entry throughout. No deployment or campaign door in either work block. Preserve all pre-existing uncommitted work; do not use a repository reset as rollback.

## 13. Success metrics and acceptance criteria

S3A-specific traversal/FIFO/active-hazard/local-checkpoint/framing/isolation gates are verified in the [validation record](../validation/sketch-s3/README.md). Mixed joined-route/transit criteria below remain S3B work. The initial solid-board unpinned route is superseded by the explicitly requested difficulty revision: outlines cannot support the player, and measured skip gaps require each pin and FIFO reuse. Current evidence is in hard-v1. Human difficulty review remains pending.

- [ ] Direct Layer 2 route completes with real A/D, Space, click and FIFO Q inputs at both sizes; boards visibly freeze and axes keep moving.
- [ ] Each required transfer offers several ordinary timing/placement choices, rather than a single frame-perfect input; record the tested envelope and failed shortcuts.
- [ ] Hazard contact/recovery agrees with visible cues across cardinal/diagonal phases, stationary/jumping/side approaches and authored maximum speed.
- [ ] Falls/R/support recall recover locally with exactly two nails, deterministic phases and no phase/attachment/input leak.
- [ ] Layer 2 clearing requires grounded exit landing; no airborne checkpoint capture.
- [ ] S3B completes Layer 1 → Layer 2 → second escalator → Layer 3 with no teleport or model mutation; first arrival does not end the joined route.
- [ ] Pause, blur handling, transit retry, arrival fall/R, restart and leave/re-entry preserve the correct leg/checkpoint and one canvas.
- [ ] Current/next targets and axe cues remain readable with neighboring-layer context at 1280×720 and 960×540; leftward look-ahead works and resize preserves geometry.
- [ ] Typecheck, focused tests, build and appropriate browser regressions pass; production remains save-isolated from development shortcuts.

Human difficulty/pacing review and representative-machine performance remain separate measurements. Historical S2 results (112 focused tests and 27 Chromium scenarios) are a baseline, not S3 validation.

## 14. Risks, assumptions and open questions

Risks: one-escalator assumptions misrouting retry/completion; leftward route with rightward camera look-ahead; diagonal axe bounds or missed fast contacts; boards placed too close to the neighboring-row geometry; and test drivers overshooting narrow landings. Resolve the first two before hard layout, then measure physics/hazard envelopes and drive real inputs. Reuse the S2 driver's airborne braking and adapt its direction rather than using teleport/state mutation.

Assumptions to tune: three boards/two axes, right-to-left return path, entrance/exit checkpoints, and the exact placements/periods. The later difficulty review settles compulsory outlined/inked Layer 2 support and requests faster, narrower timing challenges. Keep global movement tuning unchanged. The two work blocks are scope controls, not guaranteed one-session duration estimates; finish a block's verification before declaring it complete.

No missing credential/reference blocks placeholder implementation. The existing first-escalator landing and reviewed S2 route are fixed constraints. A material change to board solidity or nail rules needs explicit review; ordinary coordinate/phase adjustments within this plan are routine implementation decisions.

## 15. Implementation handoff — two work blocks

### S3A — Isolated Layer 2 board/axe route

1. Recheck checkout, uncommitted files, Node/npm, installed dependencies and server ports. Read indexed authoritative docs and latest four-pendulum evidence; capture the S2 geometry/tuning baseline.
2. Add the smallest typed leg/session extraction needed for a second actual layer, while preserving the one-leg S2 preset's runtime behavior. Add safe study-specific memory and proposed Layer 2 entry; keep unknown/production handling intact.
3. Replace the relevant guides with fixed entrance/exit and a first moving board/independent axe. Author local fall line, safe spawn and leftward camera focus before difficult transfers.
4. Prove a single pin/freeze/axe crossing and recall-support retry; inspect hazard bounds at several phases and maximum relevant player/blade speeds.
5. Build the remaining varied board/axe transfers and FIFO A/B/recall-A/C solution. Measure jumps/reach/pin windows and possible unpinned shortcuts; use data tuning, not global movement changes or hidden completion gates.
6. Implement grounded exit checkpoint, direct-entry restart, pause/leave/re-entry and S3A endpoint. End on fixed Layer 2 exit ground. Do not add the second escalator or joined-study entry yet.
7. Run focused current-leg/FIFO/hazard/recovery tests, typecheck/build, real-input direct traversal at both sizes and affected S1/S2 browser regressions. Record commands, actual implemented URL, captures, measurements and limitations in `docs/validation/sketch-s3/`, PLAN and NEXT_SESSION.

**S3A gate:** a complete, recoverable direct Layer 2 route with working boards, active axes, actual FIFO traversal and readable framing. Stop for review. Mark S3A delivered, but leave the whole S3 milestone incomplete.

### S3B — Join both layers and add the second escalator

The current code-specific plan is [SKETCH_S3B_PLAN](SKETCH_S3B_PLAN.md). Use it with the preserved hard-v1 Layer2 baseline; the initial solid-board default is superseded.

1. Start only on a separate request after S3A review. Recheck and preserve the reviewed S3A result.
2. Compose the joined route/study from existing Layer 1 and accepted Layer 2 data. Change first arrival into Layer 2 start for this preset only; keep `study=layer-1` ending at its original Layer 2 landing.
3. Add the authored second escalator and generous fixed Layer 3 arrival, with no Layer 3 challenge. Extend the direct Layer 2 preset through the ride.
4. Render both escalators in the same scene, choose active-leg transit/camera bands, and update endpoint/HUD/prompt copy by preset.
5. Verify R/pause/fall/leave/re-entry at each challenge, exit, ride and arrival. Prove restarting Layer 2 never requires redoing Layer 1, while joined Restart Adventure resets the full joined study.
6. Traverse direct Layer 2 and the joined Layer 1/2 route with real inputs at both sizes; inspect mid-second-ride/Layer 3 captures and reduced-motion framing. Run focused state-transition tests, typecheck/build, S1/S2/S3A browser regressions and isolation/production checks. Broaden to Supper/campaign only if shared core/save/input changes or failures justify it.
7. Update PLAN/NEXT_SESSION and evidence with actual results. Mark S3 complete only after its full joined/second-escalator gate passes; stop before S4.

**S3B gate:** continuous two-layer traversal and both rides, correct local recovery, safe Layer 3 endpoint, preserved S1/S2 and clear evidence at both sizes.

Use `npm run dev`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run preview`. Run targeted Playwright specs with `node node_modules/@playwright/test/cli.js test <actual spec paths> --trace off`; do not invent passing commands/specs before creating them. A successful build alone is not playtesting. If browser control cannot be exercised, report the unverified gate and reproducible manual checks rather than marking the block complete.

The current next-session prompt is [S3B implementation](../planning/NEXT_SESSION.md#paste-ready-s3b-implementation-prompt). The user requested this handoff after the hard S3A review, plus an origin/main checkpoint. S3B is planned but remains unimplemented; start only under the next explicit implementation request.
