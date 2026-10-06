# Agent instructions — The Last Curator

## Purpose and current state

Build a small, polished browser game for the DreamLayer jam and hiring submission. One damaged masterpiece is restored by recovering pieces inside other museum artworks. The museum is 3D; adventures inside artwork are side-view 2.5D.

This checkout contains the M0–M2 TypeScript/Vite/Three.js foundation, approved expanded Royal Supper gameplay, minimal museum/restoration loop and validated saves. M3 DreamLayer slice/restoration art and original Howler audio are integrated. After repeated DreamLayer 503 errors, the user explicitly authorized ImageGen for the remaining required props on 2026-10-06; three atlases/14 props are integrated and final camera/full-loop verification has passed. User-requested golden LOOK rays replace watcher eye blobs; the backdrop follows the high dessert camera. No mountain or campaign ending exists. Node v22.14.0 and npm v10.9.2 were re-verified on 2026-10-06. The repository is on main with origin `https://github.com/XZNON/night-at-the-museum.git`; M3 is complete; verify the current snapshot/worktree before implementation. Verify the environment before implementation rather than assuming these observations remain current.

M3 preserves guarded double jump, butter/crumb sliding, rolling grapes, required fork, separated trident candle jumps with timed relighting, three diner cover crossings and a varied two-jelly finale. Gameplay and the separate masterpiece, banquet-v5 and player references are user-approved on 2026-10-05. Do not ask for reference approval again or automatically regenerate delivered assets. The slice/props and complete loop are camera-validated, with distinct ImageGen provenance. The user accepted a scoped stylised/animation-inspired art-cohesion follow-up on 2026-10-06; see docs/art/ART_DIRECTION.md. M4 now selects Unfinished Sketch and the ending, replacing unimplemented Sleeping Mountain. See docs/gameplay/UNFINISHED_SKETCH.md for the six-slice plan. No measured human duration or representative-machine performance claim is recorded.

## Read order and authority

Use `docs/README.md` as the document index; all design/planning guides are grouped under `docs/`. Paths below are relative to the project root.

1. `docs/planning/PLAN.md`: milestones, current task and handoff.
2. `docs/planning/DECISIONS.md`: settled choices, defaults and change boundaries.
3. `docs/planning/REQUIREMENTS.md`: game behavior, shared contracts and acceptance criteria.
4. `docs/gameplay/ROYAL_SUPPER.md`, `docs/gameplay/UNFINISHED_SKETCH.md`: first adventure and selected second-adventure rules/slices.
5. `docs/art/ASSETS.md`: DreamLayer workflow and asset requirements.
6. `docs/reference/TECH_STACK.md`, `docs/reference/MASTERPIECE.md`, `docs/reference/MINI_GAMES.md`: supporting detail and idea archive.

Sketch S1 is complete after the user's review. `docs/gameplay/SKETCH_S1_PLAN.md` records its technical plan; preserve the reviewed implementation. S2 (Layer 1, the first escalator and the stacked-world framing) is implemented and stops at its playable review gate; `docs/gameplay/SKETCH_S2_PLAN.md` records its plan and `docs/validation/sketch-s2/` its evidence. S3A is implemented at its playable review gate; S3B is planned for the next separate implementation request; see docs/gameplay/SKETCH_S3B_PLAN.md and the current NEXT_SESSION prompt.

Direct user instructions take precedence. Among documents, DECISIONS defines current choices, REQUIREMENTS defines behavior, and PLAN defines sequence. Concept descriptions in older documents do not reopen settled choices. When changing a decision, update the affected authoritative documents together and note what changed.

## Scope and working style

- The scoped M3 art-cohesion pass in docs/art/ART_DIRECTION.md is complete: four selective offline bread/basket/crumb/cake preparations, verified with 40 focused tests and nine Chromium scenarios. The stylised player, richer soft background and other props are reused; original sources and approved gameplay remain intact. See docs/planning/PLAN.md and docs/planning/NEXT_SESSION.md; preserve the result, including any newer local edits. M3 remains the completed baseline. Existing ImageGen authorization/provenance covers required M3 props only; it does not extend to other worlds or replacement generation of DreamLayer assets. Retired request identities remain for audit; do not retry them. Preserve audio, museum/restoration, saves, isolated entry, LOOK rays and high-dessert backdrop. Do not finish the museum or generate a catalogue. Sketch S1 is complete after review; S2 is implemented with its requested review corrections. The full adventure/ending remain unimplemented. S3A is implemented at its playable review gate; S3B is planned for the next separate implementation request; see docs/gameplay/SKETCH_S3B_PLAN.md and the current NEXT_SESSION prompt.
- Commit to Royal Supper + Unfinished Sketch. The user replaced Sleeping Mountain on 2026-10-06; it is now a reserve. Drowned Garden remains a gated third adventure.
- Sketch has two nails, authored placement targets and button-driven FIFO recall. Nails freeze boards/pendulums; axes stay active; final moving swing sockets carry their nails. The player swings directly on the nail with A/D momentum, without a rope. Follow docs/gameplay/UNFINISHED_SKETCH.md; do not substitute the older drawing-stroke idea or add grappling.
- Sketch's theme and artifacts, including backgrounds, must be fully animated/cartoon, not realistic or semi-realistic. Use simple cartoon placeholders in S1; exact final references remain a later art task. Preserve approved Royal Supper/museum/masterpiece assets and restoration registration. See the separate Sketch direction in docs/art/ART_DIRECTION.md.
- Preserve a modern cartoon 2.5D feel: side-view movement, visible board/platform thickness, rounded prop volume, depth-separated scenery and soft stylised lighting. Avoid flat 2D/retro pixel-game presentation. Depth must not obscure nail targets or hazards; no new free-3D controller or fully 3D character is required.
- Final Sketch has three stacked layers in one scene/canvas, moderately zoomed/reframed toward the active layer while retaining neighboring-layer context. Do not isolate a row as its own screen. This user refinement supersedes the fixed-full-board/no-zoom choice. Prove comfortable mechanic size and context in S2; S1 bays remain development tests. The user declared S1 complete; preserve its reviewed fixes and do not start S2 without a request.
- Advance one named slice per explicit implementation request, with a playable gate and user review before the next. The user requested S2 completion/review corrections on 2026-10-06, including mandatory nail reuse through a revised platform mechanic. S2 pendulums are outlined/non-solid until pinned; recall removes solid support. Preserve S1. S3A was subsequently explicitly requested and is implemented at its playable review gate. The later user difficulty review explicitly requires nails: its three faster, narrower boards are moving outlines with no support until pinned, and two faster active axes guard the leftward route. All three pins and FIFO reuse are required through collision and measured geometry; A/B/recall-A/C is the verified standard solution. See docs/validation/sketch-s3/hard-v1/README.md; the initial solid-board shortcut evidence is historical. The later user requested the S3B plan/handoff and explicitly authorized committing/pushing this reviewed checkpoint to origin/main. S3B runtime, assets/generation/credits, publishing and sub-agents remain outside that planning/checkpoint request. Future S3B implementation does not automatically authorize commits/pushes.
- Progress from one complete playable loop toward a complete ending; do not leave unavailable adventures as playable doors in the release.
- Use placeholders for layout and movement. Establish art references early, generate final assets after camera and layout stabilize.
- Use sub-agents only when explicitly requested by the user or another applicable instruction.
- Make routine implementation decisions autonomously. Ask only for missing information that prevents meaningful work or a material change to the agreed game.
- Keep progress commentary concise. Report verification honestly; do not equate a successful build with playtesting.

## Technical rules

- TypeScript + Vite + Three.js WebGLRenderer; HTML/CSS UI; Howler.js audio.
- One renderer/canvas, one active scene, one animation loop, fixed 60 Hz gameplay simulation.
- No React, second rendering engine, general-purpose ECS, backend or dynamic rigid-body engine for initial scope.
- Separate scene logic, explicit collision geometry, level data, art manifests and shared progression state.
- Mini-games cannot mutate museum objects or decide global unlocks. Award pieces through shared progression operations.
- Keep level coordinates, interaction IDs, physics tuning and asset references in typed configuration rather than scattered literals.
- Do not build speculative abstractions. Extract shared behavior when the second actual use needs it.
- Use stable IDs; labels and art paths must be replaceable without breaking saves.
- Input listeners, timers, audio and GPU resources need explicit scene lifecycle ownership. Avoid duplicate loops/listeners after transitions.
- Scene transitions are serialized; ignore repeated input while transitioning and clear held input on pause/blur.
- Collision must work independently of DreamLayer pixels. Props and their colliders change states together.
- Use relative build/runtime asset paths suitable for itch.io. Keep dependencies in the bundle and lock installed versions.

## Art and credentials

- DreamLayer is the intended source for major visual assets. The user explicitly authorized OpenAI ImageGen for the remaining required M3 props on 2026-10-06; record this exception and distinct provenance. Do not silently substitute for later worlds or replace approved existing assets.
- Preserve approved references and record generated assets in a manifest as described in docs/art/ASSETS.md.
- Never put API keys in browser code, public assets, prompts/logs checked into the project, or the production bundle.
- Verify DreamLayer access, credit balance and costs before making a generation batch. The 100 credits are allocated API credits, not an assumed count of 100 images.
- Missing credentials do not block placeholder gameplay development. Report the specific art dependency when needed.
- Do not claim layered exports, transparent output or matching animation frames are guaranteed; inspect and prepare assets.

## Verification and handoff

Once scaffolded, provide `npm run dev`, `npm run typecheck`, `npm run build`, and `npm run preview`. Add focused tests for collision/progression risks rather than tests mirroring scene decoration.

Playtest jumping, fork/candle gates, checkpoints, collection and repeated scene entry. Later verify placement, saves, transitions and production paths. Profile on an actual representative machine before claiming the performance target is met.

Maintain `docs/planning/PLAN.md` milestone status and record validation, known issues and next task in its implementation log. If browser interaction cannot be tested, say so and provide reproducible manual checks.

Do not publish, submit to the jam, or email anyone unless the user authorizes that action. Creating local builds and submission materials is within implementation scope.
