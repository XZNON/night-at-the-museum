# Sketch S2 — Layer 1 and first escalator implementation plan

Updated: 2026-10-06. Later user review adds a fourth pendulum, faster sweep periods, progressively narrower landings and circular head-only platform nails; supersedes the original three-transfer layout. **Implemented; S2 review corrections include mandatory outlined/inked platforms; awaiting user playtest.** S1 is complete per the user, including its four reviewed fixes. This document was S2's preimplementation plan and remains the record of what was agreed; the actual delivered result, measured geometry, framing figures and verification are in [../validation/sketch-s2/README.md](../validation/sketch-s2/README.md) and [../planning/PLAN.md](../planning/PLAN.md). Selected rules remain in [DECISIONS](../planning/DECISIONS.md), [REQUIREMENTS](../planning/REQUIREMENTS.md) and [UNFINISHED_SKETCH](UNFINISHED_SKETCH.md); the numerical/layout choices below were implementation defaults and have now been measured and verified.

## Playable outcome and boundary

Deliver a save-isolated bottom-left entry through four varied pendulum platforms, fixed exit/checkpoint, and one scripted escalator to a safe fixed Layer 2 landing. Establish all three stacked layer regions in one world/scene/canvas, using clearly non-playable scenery guides for unbuilt content. Reserve the second escalator and Layer 3's three sections without implementing them.

The review gate ends on the Layer 2 landing with a clear slice-complete/next-layer marker. No Layer 2 boards/axes, Layer 3 challenges, sun award, museum door, campaign/ending integration, new art/audio production or generation. Preserve uncommitted M3 cohesion, approved Royal Supper, saves/restoration/audio and the reviewed S1 bays. Stop for user review before S3.

Use cartoon placeholders with visible platform thickness, rounded mechanisms, scenery depth and soft stylised shading. Keep side-view XY movement; depth must not hide targets/landings. Reuse the readable player. Exact final palette/references remain a later art task.

## Current integration points

Inspected main at `df49623` with uncommitted M3, revised S1 and documentation reorganization present. Recheck checkout/runtime before implementation; these observations are not a fresh test result.

| File | Bounded S2 responsibility |
| --- | --- |
| `src/levels/unfinished-sketch.ts` | Add typed stacked bounds/regions, Layer 1 solids, four pendulums/targets, checkpoint spawns, escalator trigger/path/duration and camera focus regions. Keep S1 bay data/tuning intact. A small adjacent route-data file is acceptable if this file becomes unwieldy. |
| `src/gameplay/sketch-model.ts` | Reuse nail ledger, mechanism phase capture/resume, collision and reviewed movement. Add only route checkpoint/completion and scripted transit state needed now. Existing `SketchSession`/`restartBay()` are bay-specific; do not overload them with implicit route behavior. |
| `src/scenes/unfinished-sketch.ts` | Render the connected blockout and cartoon guides; add bounded active-layer framing/escalator interpolation and correctly projected target picking. Retain S1 bay camera behavior. |
| `src/main.ts` | Add a validated development route selector before store creation, route session memory and correct retry/restart dispatch. Keep scene serialization and save isolation. Gate bay buttons/hotkeys to mechanics mode. |
| `src/ui/game-ui.ts`, `src/style.css` | Reuse budget/oldest/reach feedback; show current layer/checkpoint, escalator prompt and S2 endpoint. Preserve Supper controls/selectors. |
| Focused tests and a new S2 browser spec | Prove checkpoint/transit/FIFO/collision risks and real-input traversal; retain S1 regression coverage. No decoration-only tests. |

Prefer a narrow typed mechanics/route distinction and shared authored level data over copying the ledger/controller or inventing a generic level engine. Keep simulation free of Three.js, DOM, storage and museum objects. One renderer, one active scene, one fixed 60 Hz loop.

## Implementation order

### 1. Safe route entry and connected layout

Preserve the working S1 entry `?scene=unfinished-sketch&study=mechanics` and all six bays. Implemented S2 entry: `?scene=unfinished-sketch&study=layer-1`. Validate study values, preserve existing missing/unknown-value fallback, and resolve isolation before any campaign store access. Production must ignore the selector and expose no route/debug shortcut.

Author three vertically stacked regions and reserve both escalator corridors and the wall/glue/moving-socket regions above. Guides have no targets, hazards, walkable colliders or triggers; only the Layer 2 arrival ground is playable. Keep them recognizable as neighboring rows without a player-facing route map. Establish safe Layer 1 spawn/exit, route bounds and section-local fall detection before adding hard jumps. A higher-layer fall must eventually recover to its local checkpoint rather than requiring a fall below the entire world.

### 2. Framing proof before hard transfers

Build the moderate orthographic active-layer view from authored focus regions, world bounds and look-ahead. Show the current decision, next target/landing, and meaningful neighboring-row scenery/connection context together. Do not fit the entire world by shrinking mechanics, isolate one row, or switch scenes at the escalator. Lower/upper boundary views may naturally have only one neighboring row. Do not rely on a token sliver of scenery as proof of context.

Inspect and control the blockout at **1280×720 and 960×540**, including HUD-safe margins and target overlap. Record actual pixel sizes for player, platform landing surface, socket/oldest mark and hit area, plus what adjacent context is visible. Tune geometry/framing together before extending the route; no new minimum-pixel promise is assumed. Resize changes projection/UI only, preserving mechanism phase, nails, player and colliders. Reproject picking after camera/resize changes; reject off-screen, blocked and out-of-range targets and prevent cross-row click ambiguity. Camera visibility never grants placement reach.

During escalator travel interpolate focus from Layer 1 to Layer 2 with the player remaining visible. Respect reduced motion by removing nonessential easing/zoom drift while retaining readable essential transport/framing. Pause freezes camera progression and transit. S1 bay cameras remain unchanged.

### 3. Four varied pendulum transfers and FIFO proof

Use flat landing rectangles on existing authored pendulum paths, with decorative suspension separate from collision. Keep capture/resume and visual/collider transforms synchronized. Vary useful pin positions/heights/phase windows: generous first demonstration, different second transfer, and a third that requires nail reuse. Provide safe waiting ground at entry and fixed ground at exit; no intermediate checkpoint splits this challenge.

Author from actual normal-jump/air-jump measurements in the current controller. S1 recorded placement reach **10 world units**, hit area **46 CSS pixels**, and player body **0.65×1.25 units**. Re-measure full jump reach/clearance and pendulum movement before choosing gaps; swing/wall measurements are not ordinary-jump limits. Prefer route geometry changes to global tuning changes that would disturb S1.

Intended resource sequence: pin A → land on A → pin B → land on B → Q recalls A → pin C → land on C → Q recalls B → pin D → land on D → fixed exit. Q remains strict FIFO; full-budget/invalid clicks never evict or reorder. Make the next target visible and reachable from the completed transfer with margin for aiming. Retain oldest markers and type-specific surface pin presentation. Recall of current support has real consequences and safe recovery, never selective recall or trapping/phasing.

Attempt shortcuts using full double-jump reach, unpinned incidental landings, favorable motion phases, repinning and early recall. The defining third-platform reuse cannot be bypassed by an ordinary route. Solve bypasses through readable geometry/path/clearance, not an invisible completion flag that denies an otherwise valid landing. S2 review revision: unpinned Layer 1 platforms are dashed outlines without collision; pinning freezes/inks solid support and recalling returns them to moving outlines. Passing through an outline or recalling current support causes an ordinary safe retry, never trapping/crushing. Preserve the reviewed S1 solid-platform rules.

### 4. Exit checkpoint and first escalator

Add explicit route states for traversal, waiting at exit, scripted transit and Layer 2 arrival. Working default: landing on fixed exit ground commits the Layer 1-clear checkpoint; a fresh E at the visible boarding trigger starts transit. E cannot also grip/interact in the same tick. A typed authored path/duration moves the player to fixed arrival ground without a new physics system or scene transition.

At the safe checkpoint boundary reset temporary nails/queue and local attachment/jump state predictably, with visible feedback; this is a section reset after the challenge, not automatic nail reuse inside it. Keep Layer 1 completion in the in-memory route session. R/fall before exit retries Layer 1 with two nails and deterministic starting phases. R during boarding/transit returns to the safe exit checkpoint; R after arrival returns to Layer 2 landing. Restart adventure returns to Layer 1 and clears route completion. No campaign persistence is added.

Transit owns player motion and suppresses movement/place/recall/grip commands so none can accumulate or fire on arrival. R takes priority; pause/blur freeze transport and clear held/queued input. Completion commits once, normal collision resumes on generous fixed ground, and no held key or buffered jump launches the player on arrival. Restore same-session leave/re-entry at the remembered safe checkpoint, not midair/transit; page reload may restart the isolated route. Preserve separate S1 sessions and lifecycle disposal.

## Verification and playable gate

| Risk | Required evidence |
| --- | --- |
| FIFO/budget/phase/support removal | Focused checks for A/B/recall-A/C/recall-B/D, refusal without mutation, freeze/resume and recall support without trapping; real clicks/Q on the route. |
| Reach and bypass | Recorded jump/placement envelopes and deliberate shortcut attempts across relevant phases; a complete intended traversal with actual A/D, Space, mouse and Q, without teleport/state mutation. |
| Checkpoint and transit | Focused restart priority, deterministic reset, one arrival, pause/resume and input suppression; real fall/R before exit, R mid-transit, arrival R, restart adventure and leave/re-entry checks. |
| Camera/picking/readability | Both-size route traversal/captures at spawn, A/B/C, exit, mid-transit and arrival; resize during play; reduced-motion check; adjacent context and projected targets remain usable. |
| Isolation/lifecycle | Campaign-save sentinel bytes unchanged, unknown selector fallback, production ignores shortcuts/debug mutation; repeated entry/exit with one canvas and no listener/resource growth. |
| Preservation | S1 focused/mechanics checks remain passing, especially explicit E grip, wall-owned sliding and recall safety. Run the Supper movement lane and affected input/UI/lifecycle regressions when shared paths change. Broaden to full campaign only when affected paths/failures warrant it. |

Run `npm run typecheck`, `npm run test`, `npm run build` and the targeted S2 browser spec with `--trace off`. Use `npm run dev` for playable review and `npm run preview` to verify production ignoring direct entry. Recheck environment/ports rather than assuming a previous server survives.

S2 is ready for user review only when the complete Layer 1 → escalator → safe Layer 2 endpoint is playable with two nails/FIFO reuse, no defining shortcut, predictable retries, clean lifecycle/save isolation, comfortable mechanics and adjacent context at both sizes. Tests/build do not replace traversal. If browser access is unavailable, explicitly report the unverified gate and give reproducible manual checks.

Record changed files, actual URL/controls, geometry/tuning measurements, automated versus agent/human evidence, captures and remaining limits in `docs/validation/sketch-s2/`, [PLAN](../planning/PLAN.md) and [NEXT_SESSION](../planning/NEXT_SESSION.md). That evidence folder now exists and holds the delivered result. Do not claim human duration, representative-machine performance or user approval. Hand off the playable result and stop before S3.

## New-session request

S2 has now been implemented on its own explicit request and is waiting at its playable review gate. The paste-ready S2 review prompt is maintained in [NEXT_SESSION](../planning/NEXT_SESSION.md#paste-ready-s2-review-prompt). S3 requires a separate request; no further S2 work is authorized by this document.
