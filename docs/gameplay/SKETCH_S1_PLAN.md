# Sketch S1 — mechanics playground implementation plan

Updated: 2026-10-06. This was S1's preimplementation technical plan. S1 has since been implemented/revised in another session and the user has declared it complete. Preserve its explicit E-grab and other reviewed fixes; the original proposed defaults below are historical, not instructions to repeat S1. See NEXT_SESSION/PLAN for actual evidence and current status.

## Outcome and boundaries

Later user refinement: S1 is complete. The final adventure keeps three layers in one stacked world and uses moderate active-layer zoom/reframing with adjacent-layer context, superseding the fixed-full-board/no-zoom choice. S1 selectable bays/current cameras remain development proofs; this planning discussion does not modify them. S2 proves the refined framing before later layers are built, only when separately requested.

Deliver a save-isolated development playground with five selectable bays: pin/FIFO and moving platform; pinned-wall transfers; foothold; fixed-nail swing; moving-nail swing. Each has safe start/retry ground, a visible goal and a short instruction. Add one final combined two-nail transfer demonstration. The user can review each mechanic without playing a full adventure.

Visual constraint: the user selected fully animated/cartoon theme and artifacts for Sketch, with no realism or semi-realism, including its backgrounds. Use simple cartoon silhouettes, readable outlines and flat/simple shading for S1 placeholders; avoid realistic textures or shiny physical-material presentation. Reuse the existing readable player where suitable. This does not authorize final asset generation or changes to approved M3/masterpiece art.

Prove both mechanics and their reach before authoring Layer 1. No full layers, escalator, museum door, campaign change/award, sun collection, ending, final art/audio production, generation or dependency installation. Preserve the existing uncommitted M3 cohesion result and approved Royal Supper.

## Current code findings

- `src/main.ts` recognizes only the Supper scene/movement lane for save isolation. Store creation happens near startup, before scene loading. Sketch's dev-only selector must be included before that decision; setting isolation after loading is too late.
- Main start/replay/retry/checkpoint/resume/debug callbacks and GameUi's adventure HUD/pause context currently point specifically at Supper. Extend only the active-adventure dispatch needed for Sketch; do not copy the app or create another renderer/loop.
- `src/core/input.ts` owns shared keyboard movement and fresh jump edges. Q/pointer pin commands are not present. Sketch-specific commands need contextual ownership, fixed-step consumption and pause/transition clearing.
- `CharacterController` exposes the body but keeps coyote/buffer/air-jump/slide state private. Body teleports/velocity writes alone cannot make a safe external-motion transition. Do not use respawn as a swing-release shortcut.
- Existing collision is swept axis-aligned movement, not arbitrary rotating-platform physics. Reuse it for fixed landing rectangles, wall contact and arc-path collision; keep pendulum landing platforms flat on authored paths.
- `GameScene`/`SceneManager` already provide the necessary enter/update/render/resize/exit/dispose ownership. Keep this interface and one fixed 60 Hz loop unless an actual narrow need appears.
- `tests/browser/movement-lane.spec.ts` verifies fresh jumps and untouched save bytes. Existing tests also cover collision, progression, audio and serialized disposal. Reuse the same verification conventions, without changing old expectations to accommodate Sketch.

## Proposed file responsibilities

These are implementation targets, not existing files/APIs. Keep modules small; only split the real second use, not a generic engine.

| File | Responsibility |
| --- | --- |
| `src/levels/unfinished-sketch.ts` (new) | Typed bay IDs/spawns/goals, solids, target kinds, mechanism paths/phases, hazard envelopes, nail/grip/slide/swing tuning and camera limits. Reserve stable object IDs for later layers. |
| `src/gameplay/sketch-model.ts` (new) | Two-nail ledger/FIFO queue, target validation, scripted mechanism state, temporary session/retry state, gameplay cues and fixed-step order. No Three.js, DOM, storage or museum references. |
| `src/gameplay/sketch-movement.ts` (new) | Sketch-only normal/wall-slide/nail-grip state transitions, eligible wall kicks, bounded direct-pivot swing and safe release/forced detach. Reuse current body/collision and normal controller where safe. |
| `src/scenes/unfinished-sketch.ts` (new) | GameScene lifecycle, orthographic camera, simple meshes, player/grip presentation, screen-to-world target picking, contextual Q/pointer command capture, render interpolation and debug observations. |
| `src/main.ts` (limited edits) | Dev selector/isolation, scene construction, active-adventure routing for start/replay/checkpoint/leave/pause/debug, and local input clearing. Production continues its existing campaign. |
| `src/ui/game-ui.ts`, `src/style.css` (limited edits) | Sketch HUD with nail count/FIFO marker/nearest valid target, bay selector, controls and shared pause/retry panels. Preserve existing Supper selectors/behaviour used by browser tests. |
| `src/gameplay/controller.ts` (only if required) | Small explicit external-motion transition/launch operation that clears stale jump/buffer/coyote/slide state and sets the intended allowance. Ordinary Supper update path/tuning stays equivalent. Do not subclass private state or refactor the whole controller. |
| `tests/sketch.test.ts`, `tests/sketch-movement.test.ts` (new) | Ledger, mechanism, recovery, movement state and measured-envelope tests. Split only by actual responsibility. |
| `tests/browser/sketch-mechanics.spec.ts` (new) | Real-control bay traversal, mouse target placement/FIFO recall, pause/retry/isolation/resize/re-entry. Dev observations are read-only, never teleport/set-state helpers. |

No S1 edits to campaign definition/save/progression, Royal Supper route/art/audio, asset manifest/provenance or dependency lockfile. If a shared helper must change, establish regression evidence before proceeding.

## Implementation order and incremental review

### A — Isolated shell and normal movement

1. Re-verify checkout/Node/npm/dependencies and record/preserve dirty changes. Establish existing focused test/typecheck/build baseline; current historical M3 results do not substitute for a new implementation baseline.
2. Add typed playground data and a minimal Sketch scene with safe floor, ordinary movement, orthographic camera, bay spawn/reset and disposal.
3. Add development selector and save isolation before SaveStore access. Working future selector: `?scene=unfinished-sketch&study=mechanics`, with a validated optional `bay` parameter. This link does not work today. Invalid bay falls back safely; production ignores all direct-entry parameters.
4. Route pause/replay/checkpoint/start to the actual isolated adventure, not always to Supper. Bay changes go through a safe reset, not a second loop. Add distinct HUD/canvas labels while retaining Supper UI behaviour.

**Local gate:** launch Sketch, move/jump, reset/switch bays, pause/resume, leave/re-enter; exactly one canvas/loop. Sentinel save bytes stay unchanged. Normal production still starts in the museum.

### B — Nail ledger, targeting and freeze platforms

1. Model available/placed nails and an ordered queue. A successful placement appends a nail placement; recall removes only the oldest; no click when full can evict or reorder.
2. Define marked target types: platform freeze socket, foothold site, fixed swing socket, moving swing socket. Axes have no valid pin target. Capture motion state when freezing and resume from that phase on recall.
3. Scene converts a canvas pointer event into a target ID; model revalidates range/type/visibility constraints at the consuming simulation tick. The cursor coordinate alone never changes collision or ownership. Preview a generous readable hit area around valid targets.
4. Use a scene-owned pointer/Q command queue with a `canInteract` guard for pause, loading and input-settle time. Ignore repeat Q. Clear commands on pause/blur, retry, bay change, transition and exit. UI clicks cannot leak into canvas placement.
5. Display two-nail count and the oldest target/nail clearly. Empty recall/full-budget/invalid targets produce cues without state mutation. Pin visuals and fixed colliders use the same authoritative transform.

**Local gate:** place A/B -> recall A -> place C -> recall B. Test rapid/held/full-budget/invalid actions, recall with empty queue, retry and visible pin/unpin on a board and pendulum. Catch incidental support removal safely.

### C — Wall-slide/jump and foothold

1. Add explicit wall contact eligibility for pinned climb boards. Contact starts a capped downward slide; contact with arbitrary scenery does not.
2. Implement fresh-press wall kick through an explicit motion transition, with one authoritative consumed action per tick. Do not let ordinary jump processing also fire on that press.
3. Prove anti-stacking: holding/repeating Space, recontacting the same wall, repinning it or scraping a corner cannot recharge an unlimited climb. Working default: a distinct opposite pinned wall or valid ground landing renews the wall-transfer opportunity; exact air-jump eligibility is recorded after proof.
4. Add a flat visibly landable nail head at authored foothold sites. Descending landing works; swept side/underside collision is safe. Nail recall removes both its art and support.

**Local gate:** criss-cross between two pinned walls while reusing FIFO nails; achieve a safe foothold landing; demonstrate recovery after recalling current support. Measure wall slide time, placement window, wall kick reach and minimum foothold landing width at both review sizes.

### D — Direct swing on fixed and moving nails

1. Enter grip only on a reachable placed swing nail's hand/grip zone; choose at most one attachment deterministically. No rope, distant auto-pull or teleport across a gap.
2. Represent the player's grip/body offset as a bounded arc around the nail. A/D adds bounded angular momentum; gravity and speed/angle limits define repeatable motion. Use a simple placeholder pose/hand marker that visibly touches the pivot, never a tether line.
3. Space releases once, with tangential velocity. Include moving-pivot velocity for the moving-mount bay. Normal movement resumes through the explicit controller transition; no stale buffer, coyote jump or butter mode survives.
4. Handle same-anchor re-grip, ceiling/wall contacts and current-pivot FIFO recall. Working defaults: suppress immediate same-nail reattachment after release, prohibit repeated jump refresh from the same target, and preserve momentum on forced detach without giving another jump. Record final rules after measurements.
5. Sweep the player through the arc displacement against authored geometry/hazards; clamp/detach safely on obstruction rather than moving through walls. Keep grip sites offset so intended swings have real body clearance. Script moving pivot position/velocity from the same fixed clock; interpolate player and nail coherently in rendering.

**Local gate:** build momentum, release to a visible fixed landing; repeat from a moving mount at useful phases; perform a two-nail transfer and FIFO recall without support ambiguity. Measure actual attainable gaps and camera requirements. If direct nail grip cannot achieve the desired reach, report it for a design discussion; do not silently add a rope or extend the player's arms unrealistically.

### E — Combined proof, regression and handoff

1. Add a compact two-nail demonstration combining foothold -> fixed swing -> new foothold, plus separate moving-pivot transfer and wall-climb bays. It proves future challenges, not a miniature full layer.
2. Finalize deterministic retry snapshots: player/spawn, two available nails, empty FIFO queue, grip/jump state, mechanism phase and cleared interaction commands. R/pause-menu retry use the same operation. Same-session leave/re-entry retains the intended bay session; restart explicitly resets it.
3. Freeze all simulation on pause/blur and clear commands; resumed render/input must not advance mechanisms or repeat a pre-pause placement. Dispose listeners/meshes/materials exactly once on exit and repeated re-entry.
4. Complete focused tests, typecheck/build and real-control browser checks below. Preserve existing failure evidence; do not tune the old Supper tests around new bugs. Update slice status only with actual results.
5. Give the user the exact implemented URL, bay controls, manual checks, actual-camera captures and measured movement/placement limits. Record unresolved issues and recommended tuning; stop before S2 for the playable review.

## Fixed-step transaction and movement invariants

Proposed order to verify during implementation: restart/bay-reset wins and clears other commands; advance unpinned authored mechanisms; consume recall then placement against the current transforms; resolve one movement/attachment/jump action; sweep collision/hazard contacts; apply recovery once if needed; publish HUD state. Commands are drained once, not once per render. If both recall/place occur in one tick, deterministic recall-before-place permits legitimate reuse without over-allocation; all other ordering must be documented/tested.

Normal movement has the existing ground/air jump rules. Wall/grip overrides explicitly own motion while active; entering/leaving them clears incompatible transient state. Only a new legitimate support/attachment may renew an allowed jump, not repeated overlap with the same target. Repinning the same target is not a new surface for jump-credit purposes. A release and a correction jump require different fresh presses. Numbers and exact eligibility remain bounded S1 proof decisions, not alterations to Royal Supper.

A moving mount never freezes when pinned; a frozen board never drifts while pinned; axes never respond to nails. FIFO recall of the current support has real physical consequences, advertised by the oldest-nail marker. Recall does not choose a safer newer nail. A retry restores the local invariant instead of persisting a softlock.

## Verification matrix

| Risk | Focused proof | Browser/manual proof |
| --- | --- | --- |
| Nail loss/duplication/wrong recall | Exactly two across placement/invalid/full-budget/FIFO/reset actions | Real click A/B, Q, C; visible oldest marker and budget |
| Freeze/resume and moving targets | Captured transform/phase; active axe; moving pivot unchanged by pin | Observe pin/recall and reachable placement at different phases |
| Controller resource leak/exploit | Fresh wall kick/release, same-target contacts, held input, explicit transition clearing | Rapid release/re-press, wall transfer, swing correction and same-anchor re-grip |
| Collision/support removal | Thin foothold sweeps, wall/ceiling bounds, arc obstruction, forced detach | Land on nail; recall current support; recover without trapped body |
| Moving release | Pivot velocity plus tangent; bounded speed/reach and viable landing phases | A/D momentum and timed moving-pivot transfer |
| Pause/reset/lifecycle | Queue/grip/reset snapshots and idempotent teardown | Pause with keys held/placement pending; blur; R; repeated leave/re-entry; stable resources |
| Save isolation/production | Dev selector resolves before storage; no collection operation | Sentinel bytes unchanged including settings/retry; production ignores selector and debug mutation is absent |
| Royal Supper preservation | Existing controller/collision/route/audio/progression tests remain passing | Existing movement lane; isolated Supper regression when shared input/controller/UI changes |
| Readability | No tests mirroring decoration | Inspect/control each bay at 1280x720 and 960x540, including targeting while sliding/gripping |

Future verification commands: `npm run typecheck`, `npm run test`, `npm run build`; targeted new browser spec plus existing movement lane with tracing off. Existing Playwright config starts dev/preview on 5173/4173. Run the affected Supper browser scenario because S1 touches main/UI/input routing; expand to full production/restoration suite if those paths changed or failures warrant it. No long suite repeated for unchanged local tuning alone. All command results are future work, not claimed passes.

## S1 acceptance and review record

- [ ] Safe playground and all bay selectors operate in isolation; exact implemented entry documented.
- [ ] Two nails, authored targets and strict FIFO retrieval work under ordinary and repeated input.
- [ ] Freeze platforms/active axes/moving swing mounts match their visible rules.
- [ ] Wall-slide/kick, foothold and direct fixed/moving-nail swing proof routes are playable.
- [ ] No rope, hidden grapple, jump stacking, teleport, nail loss or unrecoverable contact state.
- [ ] Retry/pause/blur/transition/re-entry are deterministic and clean; one renderer/canvas/loop.
- [ ] Existing saves are untouched; production remains the existing campaign with no new door.
- [ ] Relevant tests/typecheck/build and real-control checks pass; Royal Supper remains unchanged.
- [ ] Both-size captures and measured reach/slide/targeting/release limits recorded, with limitations distinguished from human review.
- [ ] User receives playable S1 for feedback; no S2 work starts automatically.

Unresolved implementation values: placement reach/hit area, wall eligibility/air-jump rule, grip radius/clearance, pumping/damping/caps, re-grip guard and exact bay geometry. Prove them in the bays instead of asking for every numeric value or building production routes first. Major user choices (two nails/FIFO/marked targets/no rope/A-D momentum/freeze effects) remain fixed.
