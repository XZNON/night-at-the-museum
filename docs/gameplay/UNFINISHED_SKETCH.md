# The Unfinished Sketch — gameplay and six implementation slices

Updated: 2026-10-06. S1 was implemented/revised in another session and the user has now declared it complete; see NEXT_SESSION/PLAN for evidence. S2 is implemented and awaiting user review at its playable gate. The complete three-layer adventure, new art and ending remain unimplemented. Sketch replaces Mountain as adventure two, retaining `sun-disc` and the existing two-stage restoration. Explicitly labelled working defaults are not additional user approvals.

## Selected experience

Start at the bottom left of an unfinished picture. Clear three stacked layers, using two reusable nails to prepare moving objects and create transfers. Escalators connect Layers 1/2 and 2/3. Recover the sun at the top and return to the museum.

The final game is one connected composition with three stacked layers in the same scene/canvas. The user refined the camera choice: moderately zoom toward the active layer so its mechanics/player remain comfortably sized, while retaining neighboring-layer context. Smoothly reframe through escalator transitions; do not isolate only the current row or use separate layer screens. The earlier always-fixed full-board/no-zoom decision is superseded. S1 selectable bays are development tests only.

The misplaced sun makes the tools and pieces move unnaturally. Taking it settles the picture. Returning and placing it in The Garden Before Dawn completes the second restoration and campaign. Movement may look erratic, but gameplay motion must follow predictable authored paths rather than random forces.

The distinguishing decision is where and when to spend two nails, then when to retrieve the oldest. Preserve the user's platforming/action idea; the earlier proposals for completing drawn shapes or a wind/bridge mountain are superseded.

## Confirmed choices versus working defaults

| Subject | Status and rule |
| --- | --- |
| Campaign | User-selected: Royal Supper then Unfinished Sketch; pear restoration unlocks Sketch; sun restoration completes the two-adventure campaign. Mountain is a reserve; Garden remains gated. |
| Budget | User-selected: exactly two nails. |
| Placement | User-selected: authored places where nails can be put. No arbitrary drawing/free placement. |
| Retrieval | User-selected: one button recalls nails in FIFO order, oldest placed first. No selecting a newer nail or automatic eviction when the budget is full. |
| Platform effects | User-selected: pinning freezes pendulums and boards in place. S2 and later S3A difficulty reviews require reuse: Layer 1 pendulums and Layer 2 boards are moving outlines that become solid only while pinned; recall removes support. S1 is unchanged. |
| Hazards | User-selected: axes keep swinging; nails cannot stop them. |
| Finale mounts | User-selected: swing sockets move back and forth and carry the nail with them. These mounts are not frozen by pinning. |
| Swing | User-corrected: the player swings directly on/around the nail; there is no rope. A/D builds momentum. |
| Route | User-selected: three layers, with three specified sections in Layer 3. See sequence below. |
| Final camera/layout | User-refined: one stacked world, moderate active-layer focus/zoom with neighboring layers still visible for context. No full isolation of a row or separate screen. Resize preserves geometry; tune framing in S2. S1 bay cameras are development-only. |
| Input defaults | Mouse points at a reachable marked target; fresh left click places a nail. Q recalls the oldest remotely. A/D or arrows move/pump; Space jumps, wall-jumps or releases a swing; R retries. Key bindings are working defaults. |
| Attachment rule (S1 review revision) | Explicit fresh E grabs a placed swing nail within its grip zone. E or Space releases with current momentum. Passing a socket does not auto-grip; no distant grapple or rope. Preserve the completed S1 revision. |
| Wall defaults | Contact with a pinned climb board starts a controlled downward slide; fresh Space launches away from it. Anti-stacking and air-jump rules must be proven in Slice 1 without changing Royal Supper. |
| Retry defaults | Unlimited retries; checkpoint at each layer entrance and each Layer 3 section entrance. Reset the current challenge's temporary nail/motion state predictably, while retaining completed sections and campaign awards. |
| Presentation | User-selected: fully animated/cartoon theme and artifacts throughout Sketch, including backgrounds, platforms, tools, nails, glue and the sun's in-world presentation. No realism or semi-realism. A playful drawn-workshop setting remains a working concept; exact composition, palette and asset references are not yet approved. |

## Sketch visual direction — user-selected

The user emphasized a modern cartoon **2.5D feel**, not flat 2D/retro pixel-game presentation. Keep side-view gameplay on the existing movement plane, but give boards/platforms visible thickness, mechanisms rounded volume, and scenery clear foreground/middle/background separation. Use soft stylised contact shadows and broad cartoon lighting, with restrained depth cues that never obscure nails, landings or hazards. Illustrated player poses may remain in a dimensional world; this does not require a new fully 3D character or free-depth movement. Fully cartoon does not mean flattening every object into an unshaded tile. Preserve the moderate active-layer camera framing.

Use a coherent cartoon/animation-art appearance for the entire new world, not cartoon props over a semi-realistic background. Favour expressive silhouettes, clear outlines, broad colour areas and simple cel-style shading. If retaining the unfinished-drawing theme, use playful construction marks and stylised linework rather than realistic charcoal scans, paper grain, wood/metal texture or cinematic material rendering.

Mechanisms move through the authored gameplay animations; choosing an animated art style does not authorize generated video, a new animation system or extra character-frame production. S1 uses simple cartoon-shaped placeholders and flat/simple materials, with the existing readable player where suitable. Final references/assets remain a later task. Preserve the sun's recognizable identity and existing masterpiece placement registration; this direction does not replace approved Royal Supper, museum/masterpiece assets or restoration masks.

## Nail and movement contract to prove first

- A nail is either available or placed on exactly one target. Available plus placed always equals two. Each successful placement appends a placement instance to the FIFO queue; retrieval removes its head. Invalid clicks, full budget and held/repeated input never create, move or reorder nails.
- Show available count, both occupied targets and which nail Q will recall. Mark the oldest nail in-world as well as in the HUD. FIFO cannot silently become selective retrieval.
- Recall is remote. With an empty queue it does nothing except a gentle cue. If the oldest supports the player, recalling it really releases that support; show the consequence rather than silently recalling the other nail. This rule is a working default to review in the playground.
- Targets have distinct readable types: freeze platform, foothold, fixed swing pivot, moving swing pivot. Reject unreachable, blocked and off-screen placement; tune range so the player can prepare the next transfer while sliding or swinging. Use a reachable highlight rather than requiring pixel-perfect clicks on a tiny nail.
- Board/pendulum freezing captures the current transform and motion phase. Working default: unpinning resumes that phase smoothly. Visual motion and collider state change together. Releasing support must not trap the player inside returning geometry.
- A ground foothold is an authored marked site with a clearly landable nail head. It is not an arbitrary ground projectile. The glue pool has marked raised foothold sites that remain usable above its hazard surface.
- Direct nail swinging is a bounded arc about a pivot, with a small authored grip/body offset, A/D momentum input and capped speed. No rope asset, tether length, rope solver or general rigid-body engine. Moving pivots contribute their motion to release velocity; prove the resulting reach in Slice 1.
- Define explicit normal, wall-slide and nail-grip movement states. A single press cannot both release and execute another jump in the same tick. Wall/swing attachment must not repeatedly replenish air jumps through overlap, same-surface recontact or held input. Keep Royal Supper's existing controller behaviour intact.
- Model moving pendulum landing pieces as readable flat platforms on scripted paths; decorative suspension may rotate separately. Do not build arbitrary rotating collision geometry unless the proof shows it is necessary. The player need not ride an unpinned board to complete the intended route; resolve incidental contact safely.
- All mechanisms, hazards, attachment and retry timers run on the existing fixed 60 Hz clock and freeze on pause/blur. Scene exit owns input, audio and GPU disposal.
- Measure useful wall-slide time, pin range, wall-jump envelope, fixed/moving-pivot release and foothold landing width before laying out hard transfers. Numerical tuning is not a separate approval question.

## Challenge sequence

### Layer 1 — Four pendulum platforms

Layer 1 pendulums move as empty dashed outlines and cannot hold the player. Pin one to freeze and ink it solid, jump to it, pin the next, transfer and recall A to secure C, then recall B from C to secure D. Recalled platforms return to moving outlines immediately. Provide a safe first demonstration, then vary the useful positions instead of repeating the same jump four times. Reach fixed ground and enter the escalator to Layer 2. Completed transfers must make the next target visible and reachable.

### Layer 2 — Moving boards and fixed swinging axes

Layer 2 boards are fast moving outlines with no support until pinned; a pin freezes and inks a narrow solid landing, and recall removes it. All three board pins and FIFO reuse are needed; A/B/recall-A/C is the verified standard solution. Freeze boards in useful positions while the faster independently mounted axes remain active. Observe the axe sweep, prepare the next board, transfer and recall the older nail. Different clearances/timings should change the decision rather than extending an identical sequence. Fixed waiting ground and visible sweep envelopes allow learning without an unseen reaction. Finish at the next escalator.

### Layer 3, section 1 — Criss-cross wall climb

Three boards move up/down. Freeze the first; slide down its side while preparing the opposite board; jump across, recall the older nail, pin the third and continue alternating upward to an adjacent fixed platform. Start with a safe practice transfer before the exposed climb. The useful pin height and remaining slide time must be readable.

### Layer 3, section 2 — Super-glue crossing

Place a foothold nail at a marked ground site above the glue and jump onto it. Place a fixed wall swing nail, grip it, recall the older foothold, place that nail ahead, build momentum and release onto the new foothold. Recall the older swing nail and jump onto safe ground. Teach the first direct nail swing over dry ground; glue contact gives a short stuck cue and quick retry, not a long escape animation.

### Layer 3, section 3 — Moving nail swings to the sun

Pin a moving swing socket, grip and build momentum, then place the second nail on another moving socket and time the transfer. Continue the agreed FIFO reuse where needed, with visible travel endpoints and a visible destination. The placement moment and release moment both matter. Reach generous fixed ground at the sun; the reward platform adds no new hazard.

Collection awards `sun-disc` once, gives a success cue, settles the mechanisms into safe authored rest poses and offers Return to Museum. Settling must not drop/crush the player or block leaving. Collection does not itself complete the campaign: final sun placement does.

## Six slices and review gates

These are dependency-sized work packages, not guaranteed one-session time estimates. Start the next only after the previous playable gate passes and material user feedback is resolved. Do not implement all six under a request for one slice. If a gate takes longer, continue or subdivide that slice transparently rather than starting later layers.

### S1 — Mechanics playground

Technical implementation order, proposed file boundaries, current-code integration points and test matrix: docs/gameplay/SKETCH_S1_PLAN.md. Read it before an authorized S1 implementation; this slice section defines its scope/gate, not the whole technical plan.

**Build:** A save-isolated Sketch scene and small independent bays for FIFO pin/recall; a pendulum/board; an active axe; pinned-wall slide/jump; foothold; fixed-pivot and moving-pivot direct nail swings. Use existing player art or simple placeholders. Prove collision, attachment, recovery and input before full route construction.

**Player sees:** Every new mechanic immediately, with resettable safe experiments and a visible nail queue. No museum door or campaign award.

**Gate:** All bays work with two nails; FIFO remains exact after invalid/full-budget actions and retries; fixed/moving release is controllable; no rope exists; no jump stacking, nail duplication or contact softlock; pause freezes motion and clears held input; re-entry disposes cleanly. Record measured reach/range and an achievable example of each later transfer. Run typecheck/build, focused mechanic tests, real-control bay checks and Royal Supper movement regression if shared code changed.

**Stop:** No full layer, production art or sun/ending integration. This slice may contain several short work blocks; risky mechanics are not deferred to Layer 3.

### S2 — Layer 1 and first escalator

Technical implementation order, current-code integration points, checkpoint/transit defaults and verification gate: [SKETCH_S2_PLAN.md](SKETCH_S2_PLAN.md). **S2 is implemented on 2026-10-06 and awaits the user review gate**, playable at `?scene=unfinished-sketch&study=layer-1` with evidence in [../validation/sketch-s2/README.md](../validation/sketch-s2/README.md). The user-approved review revision makes FIFO reuse mandatory through outlined/inked collision states; geometry alone had allowed an unpinned C landing. The exit is at least 5.43 units above B's highest surface, above the measured 4.479-unit double-jump ceiling, and C remains beyond placement reach from the terrace and A. The later S2 difficulty review adds a fourth, faster pendulum D, narrower landings and a second FIFO recall: Q retrieves B from C before pinning D. B cannot skip C to D and C cannot skip D to the exit. Placed platform nails show only a circular head centered on the clicked hole. S1's accepted mechanics gate remains satisfied.

**Layout prerequisite:** Establish overall stacked-world bounds and three layer regions, with non-playable guides for unbuilt rows. Reserve both escalators and Layer 3's sections. Prove moderate active-layer zoom/framing at 1280x720 and 960x540 before extending the route. Keep adjacent-layer context visible while player, hazards, nail heads, targets/FIFO marks and HUD stay comfortably sized; do not shrink every mechanic to fit a permanent overview. Tune zoom/center/bounds from measured S1 envelopes, retain placement reach limits, prevent cross-row target ambiguity and preserve geometry on resize. Escalators reframe smoothly, respecting reduced-motion preferences. Exact zoom/context is a blockout tuning value. This replaces the fixed-full-board-only prerequisite.

**Build:** Bottom-left entry, four varied pendulum transfers, safe exit/checkpoint and scripted escalator to a fixed Layer 2 landing. Use the proven S1 rules; make escalator motion authored, not a new physics system.

**Player sees:** A complete first layer with a clear end and next-layer marker.

**Gate:** Complete with real inputs and nail reuse; demonstrate fall/R recovery, FIFO ordering, pin/unpin collision and safe escalator arrival. Camera shows next target/landing at 1280x720 and 960x540. No jump shortcut bypasses the defining reuse challenge. Focused pendulum/elevator/retry checks and typecheck/build pass.

**Stop:** Layer 2 is a fixed development landing, not a playable unavailable campaign door.

### S3 — Layer 2 and second escalator

Implementation planning: [SKETCH_S3_PLAN.md](SKETCH_S3_PLAN.md). S3A implemented on 2026-10-06 at its playable review gate; S3B is now implemented at its playable review gate; see [fresh S3B evidence](../validation/sketch-s3/s3b/README.md). The later user difficulty review requires pins and faster, narrower mechanisms; see [current S3A validation](../validation/sketch-s3/hard-v1/README.md). The initial solid-board shortcut is superseded. Deliver in two separately requested work blocks: S3A proves the isolated Layer 2 board/axe route through fixed exit ground; S3B joins Layers 1/2 and adds the second escalator to a safe Layer 3 endpoint. Each stops at a playable review gate. The whole S3 milestone stays incomplete until S3B passes. Object counts, return-path direction and exact placement are explicitly labelled layout defaults; S1/S2 and their current nail/solidity rules remain the preserved baseline.

The next-session code-specific plan and preserved difficulty baseline are in [SKETCH_S3B_PLAN](SKETCH_S3B_PLAN.md); the user requested planning and an origin/main checkpoint after hard S3A review. The later explicit S3B-only request implemented this plan; stop for review before S4.

**Build:** Compact board/axe sequence, Layer 2 checkpoint and escalator to fixed Layer 3 ground. Join Layers 1/2; provide isolated Layer 2 entry.

**Player sees:** A new hazard family and a continuous two-layer route.

**Gate:** Axe contact at relevant swing phases reliably retries Layer 2; nailed boards remain still while axes move; targets and sweep cues are readable; pin/retrieval cannot create a softlock. Real-control Layer 2 and joined Layers 1/2 traversals pass; pause and section recovery remain correct. No additional movement system.

### S4 — Layer 3 wall climb and glue crossing

Current next slice after the user's 2026-10-06 completed-S3 checkpoint request. Requires a separate implementation request; no S4 work is included in that checkpoint.

**Build:** Layer 3 sections 1/2 using S1's proven wall and fixed-pivot swing mechanics. Add safe introductions and checkpoints at the layer entrance, after the wall climb and after glue. Provide individual section entry for review.

**Player sees:** The complete criss-cross climb and the foothold-to-swing-to-foothold resource sequence, joined to earlier layers.

**Gate:** Both sequences are achievable with exactly two nails and strict FIFO; enough slide time exists to place the next pin; release lands on a readable foothold; glue/recall-current-support/R retries neither lose nails nor erase earlier cleared sections. Individually and consecutively traverse sections with real controls. Camera/input targeting works while climbing/swinging at both review sizes.

**Stop:** End at safe ground before the moving-socket finale. Do not invent another wall or rope system here.

### S5 — Moving-socket finale, sun and campaign ending

**Build:** Section 3 from the proven moving-pivot mechanic; full three-layer traversal; sun collection and safe settling cue. Register the playable Sketch scene, replace the campaign's Mountain entry/clue with Sketch, add its museum frame, and connect collection/return/placement/completion through existing progression operations. Provide a minimal complete two-stage ending using existing masterpiece/restoration material and placeholder presentation where needed.

**Player sees:** The whole adventure and new game -> pear -> Sketch -> sun -> complete masterpiece/ending. No unavailable Mountain door.

**Gate:** Moving targets remain predictable; a transfer can be planned without an off-screen reaction; full Sketch route and full campaign work. Test existing pear saves, sun-owned-before-placement reload, reload during final restoration, replay without duplicate awards/ending mutation, unfinished exit/re-entry, denied storage, reset and repeated transitions. Retain `garden-before-dawn`, `golden-pear`, `sun-disc`, restoration region identities and save key/schema unless a demonstrated incompatibility requires a deliberate change; artwork IDs are not currently stored in SaveV1. Verify this against current code before implementation.

**Stop:** No final museum rebuild, garden, opening cinematic or final asset batch. Gameplay/campaign completion is not final art completion.

### S6 — Refinement and complete regression

**Build:** Resolve human review findings: pin-target readability, FIFO feedback, slide time, swing response/release, moderate active-layer zoom/context/readability, axe/glue cues, retry length, escalator handoff and sun/ending feedback. Use existing appropriate audio or placeholder cues without replacing approved Royal Supper audio. No new obstacle family.

**Player sees:** A coherent refined placeholder adventure and complete campaign. Record actual first-time timing/retries where possible rather than padding to a duration estimate.

**Gate:** Focused tests/typecheck/build and complete relevant Chromium regressions pass, including existing Royal Supper/placement/save/audio/lifecycle coverage plus Sketch. Real-control checks at both sizes, restart adventure, checkpoint retries, FIFO/support recall, all transitions, reload/reset/replay and input clearing pass. Document human versus automated evidence and outstanding cross-browser/iframe/device checks; no unmeasured performance claim.

**Stop:** Mark the gameplay blockout/campaign gate complete only when evidenced. Final Sketch references, production art and art/audio camera QA remain a separately scoped follow-up before release/M4 art completion.

## Efficient verification and handoff

- Every slice: preserve the checkout, record changed scope, run typecheck/build and tests for affected collision/state risks, and traverse the new playable content with real controls. Compilation and screenshots alone are not playtesting.
- Add development-only scene/layer/section entry as actual slices exist. Keep all direct entries save-isolated and ignored in production; document the exact implemented URL/selector in the handoff. Suggested identifiers such as `unfinished-sketch` are future values, not working links today.
- Repeat earlier Sketch checks when shared behaviour changes. Run relevant Royal Supper regressions whenever shared input/controller/collision/lifecycle is touched; the expensive full campaign suite belongs at integration/final refinement unless an earlier change warrants it.
- After each slice, update its status, gate evidence, known issues, exact launch/manual checks and next task in PLAN/NEXT_SESSION. Show before/after or new-section captures in the real camera and let the user review the playable result. Do not label automation as human approval.
- Use `npm run dev`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run preview`; scope browser commands to affected checks until full integration. These commands already exist; Sketch-specific entries/tests do not yet exist.
- Preserve one renderer, one scene and one fixed-step loop. Keep authored geometry, target types/IDs, mechanism paths, tuning and art references in typed data. Do not build a generic nail engine, ECS, rope solver or dynamic rigid-body system.

## Open items and scope limits

No major adventure/budget/FIFO/swing-effect decision remains open. Routine defaults needing S1 proof: placement reach/click interface; direct grip radius and release feel; wall-jump/air-jump eligibility; same-nail re-grip protection; recall-current-support response; unpin contact safety. Escalator path, motion phases, difficulty and checkpoint tuning need blockout review. If direct nail swinging cannot deliver the intended gaps, show the measured limitation and discuss a scope change; do not silently add a rope or grappling hook.

Fully animated/cartoon appearance is selected; exact reference composition, palette, new asset list and ending presentation remain unapproved. No game duration or performance target has been demonstrated for Sketch. The six slices cover playable placeholder mechanics/campaign and refinement, not all final art or release validation. DreamLayer remains intended for major new visuals; M3's ImageGen exception does not cover Sketch. No generation/credits, commits/pushes, publication, submission, email or sub-agents are authorized by this plan. S2 implementation/review corrections, including mandatory reuse, were authorized on 2026-10-06; S3A was subsequently requested and implemented; stop at its review gate before separately requested S3B. A later explicit implementation request should name S1 (or the next completed-gate slice), not the whole minigame.

## Archived S1 request template — completed, do not repeat

The user has declared S1 complete. The template below records its original bounded request; S2 is now next on a separate request, with the refined moderate active-layer camera. Do not treat this historical template as a request to redo S1.

Continue The Last Curator in C:\Users\XZNON\DreamLayer. Read AGENTS.md, docs/planning/PLAN.md, docs/planning/DECISIONS.md, docs/planning/REQUIREMENTS.md, docs/gameplay/UNFINISHED_SKETCH.md, docs/gameplay/SKETCH_S1_PLAN.md and docs/planning/NEXT_SESSION.md. Verify and preserve the current checkout, including the completed uncommitted M3 cohesion work. Implement only Sketch slice S1, the save-isolated mechanics playground, and satisfy its playable gate. Two nails, marked targets, button-driven FIFO recall; freeze boards/pendulums, leave axes active, carry nails on moving swing sockets. The player swings directly on the nail with A/D momentum; no rope. Preserve Royal Supper, audio, saves and restoration. Provide the exact review entry, real-control validation, relevant focused/build results and a handoff; stop before S2. No asset generation/credits, commits/pushes, publishing or sub-agents.


S3B gate update, 2026-10-06: both development presets now reach the safe Layer 3 arrival after the second ride; joined first arrival continues into Layer 2 without completion. All reviewed S1/S2/hard-S3A mechanics remain. The next action is user review, not S4. See docs/validation/sketch-s3/s3b and current NEXT_SESSION.
