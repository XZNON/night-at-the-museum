# Agent instructions — The Last Curator

## Purpose and current state

Museum polish implemented, 2026-10-09 (user's list, one change at a time): gilded frames, wainscot/plank floor, velvet runner, brass lamps, next-frame shimmer, footsteps and room tone (scripts/make-museum-audio.py, 0 credits), interpolated museum walking, and a masterpiece-first opening (Royal Supper greyed out and locked until the masterpiece has been opened once; never stored; see DECISIONS). Unit 242/242; museum/campaign specs pass (Supper-bot flakes passed on rerun). See docs/validation/museum-polish/README.md. Committed and pushed on the user's request (`c97e303`). Next: release prep (prompt in NEXT_SESSION). Later, each on its own request (user, 2026-10-09): story stills with short dialogue at game start and the end; Royal Supper assets/graphics rework.

v1 polish committed/pushed on the user's request, 2026-10-08: title screen and clean HUD, key-glyph controls, an icon inventory, a new pause menu (Controls/Settings), restyled restoration screens, the masterpiece centred with the Sketch left and Royal Supper right, restoration ambience in the room, original UI sounds (scripts/make-ui-audio.py) and the bundled Fredoka font; gameplay and saves unchanged. See docs/validation/v1-polish/README.md. Next: the museum polish pass (user), then release prep. Later commits, generation and sub-agents need new authorization.

S6 human check recorded, 2026-10-08 (user played New Game → Royal Supper → pear → Unfinished Sketch → light → ending). Current session: v1 polish (the user's UI/sound/polish list, one change at a time), then production build, preview smoke test, itch.io zip and submission text; no upload/publish/submit. Royal Supper art/animation rework deferred. Commits/pushes, generation and sub-agents need the user's request.

Art pass part 2 committed/pushed on the user's request, 2026-10-08: generated toolbox backdrop (route inside the toolbox, wall-mounted ledges), torch and museum garage painting (5 DreamLayer credits, balance 54), the v6 trial superseded, and a new original rock/metallic Sketch loop (scripts/make-sketch-music.py). See docs/validation/sketch-art/part1/README.md. Next: S6 full review/regression, then M5-M6 release on their own requests. Later commits and generation need new authorization.

Sketch art pass part 1 implemented at its review gate, 2026-10-08: the approved references in asset-sources/references/sketch/ are cut locally into 27 skins (scripts/prepare-sketch-skins.py, public/assets/sketch/, 0 credits) and drawn by the Sketch scene from level data; collision and gameplay cues unchanged. See docs/validation/sketch-art/part1/README.md and NEXT_SESSION. Revised after user review (poppy colours, smooth interpolated motion, no lift frame) and committed/pushed on the user's request (2026-10-08). Next: discuss the backdrop and remaining art with the user, then part 2 (DreamLayer generation) on its own request with a credit check. Later commits need new authorization; no generation, publishing or sub-agents authorized.

S5C implemented at its playable review gate, 2026-10-07; S5 complete at the automated gate: the enchanted light (`sun-disc`) placed in the masterpiece's dark sky (drag/click/Tab-Enter) becomes the sun; the save is written first, the picture turns complete and the ending plays (Stay in the museum / New game through the reset confirmation). The game runs New Game → Royal Supper → pear → Unfinished Sketch → light → ending. See docs/validation/sketch-s5/s5c/README.md and NEXT_SESSION. Committed and pushed to origin/main on the user's request (2026-10-08). User, 2026-10-08: next is the art of the game (Sketch DreamLayer art pass) on its own request; S6 review/refinement remains. Later commits need new authorization; no generation, publishing or sub-agents authorized yet.

S5B implemented at its playable review gate, 2026-10-07: campaign stage 2 is `unfinished-sketch` (save IDs unchanged; Mountain removed from code/UI); the Sketch frame on the museum's left wall is locked until the pear is restored, then enters the S5A route in campaign mode; claiming the enchanted light collects `sun-disc` once and persists; Return to Museum lands at the frame; re-entry resumes, reload restarts at Layer 1, replay adds nothing. See docs/validation/sketch-s5/s5b/README.md and NEXT_SESSION. Committed and pushed to origin/main on the user's request (2026-10-07). Next: S5C (placement/ending) on its own request; plan docs/gameplay/SKETCH_S5C_PLAN.md, prompt in NEXT_SESSION. Later commits need new authorization; no generation, publishing or sub-agents authorized.

Next is S5B on its own request (prompt in NEXT_SESSION and SKETCH_S5_PROMPTS). User, 2026-10-07: the enchanted light acts as the sun in the campaign (stage-2 piece `sun-disc`, unchanged save IDs; lights up the masterpiece's sky); mid-air claims stay.

S5A committed/pushed at `9ce56f9` (user, 2026-10-07; the art reference pass was committed separately at `8e1d9fb`). Reward revision (user): the Sketch reward is an enchanted light held in a torch, claimed on the end ledge, not a sun; implemented in `study=adventure`, committed/pushed on request, at review. How the light restores the masterpiece is open for S5B/S5C. See DECISIONS.

S5A implemented at its playable review gate, 2026-10-07: save-isolated `study=adventure` plays the full route; the end ledge is a safe checkpoint and touching the sun (on foot or in the air) takes it once, settles every mechanism and shows a success screen; R/fall/re-entry afterwards stay on the ledge with no second report. The user completed it in their own play. See docs/validation/sketch-s5/s5a/README.md and NEXT_SESSION. Uncommitted over `715770d`; stop for user review; S5B needs its own request. No commit/push, generation, museum/campaign change or sub-agents authorized.

Layer 3 complete (user, 2026-10-07): S4D was played and committed/pushed at `715770d` on the user's request. There is no third Layer 3 section: the moving-socket finale is dropped and all sections and layers are done. S5 is only the sun (default: on the swing crossing's end ledge) and the campaign ending, planned as three separately requested blocks (S5A sun, S5B museum/campaign collection, S5C placement/ending) in docs/gameplay/SKETCH_S5_PLAN.md with prompts in SKETCH_S5_PROMPTS.md. Next is S5A on its own request; planning authorizes no code. See DECISIONS.

S4D implemented at its playable review gate, 2026-10-07: `study=layers-1-3` runs Layer 1 → lift → Layer 2 → lift → joined Layer 3 (climb, handoff, crossing) to one endpoint; the second arrival starts the climb; each section retries at its own entrance; Restart returns to Layer 1. S4's automated gate passed (see docs/validation/sketch-s4/s4d/README.md and NEXT_SESSION). Uncommitted over `d0856d1`; stop for user review; S5 needs its own request. No commit/push, generation or sub-agents authorized.

S4L accepted by the user on 2026-10-07 and committed/pushed at their request; next is S4D (Layers 1-3, final S4 gate) on its own request. No S4D code, generation or sub-agents are authorized by the acceptance.

S4L implemented at its playable review gate, 2026-10-07: both escalators are vertical lifts (step fully onto the deck after clearing the layer, invisible walls while riding, straight up, step off right; arrival commits in place; decks stay parked). See docs/validation/sketch-s4/s4l/README.md and NEXT_SESSION. Uncommitted over `98a213c`; stop for user review; S4D needs its own request. No commit/push, generation or sub-agents authorized.

Vertical lifts planned, 2026-10-07 (user): every layer transition becomes a vertical lift (step on to ride, invisible walls while riding, straight up) in its own block S4L before S4D; see docs/gameplay/SKETCH_S4L_PLAN.md. Planning only; S4L needs its own request.

S4C accepted by the user on 2026-10-07 (after the Layer 3 air-momentum fix) and committed/pushed at their request; next is S4D (Layers 1/2 joined to this Layer 3, the final S4 gate) on its own request, using the revised S4D plan/prompt. No S4D code, generation or sub-agents are authorized by the acceptance.

Layer 3 air momentum (user, 2026-10-07): letting go of A/D in the air keeps a jump's momentum on Layer 3 only (`airCoast`); Layers 1/2, S1 and Supper keep air braking.

S4C implemented at its playable review gate, 2026-10-07: `study=layer-3` joins the accepted S4A climb and S4B crossing; the grounded landing on the shared ledge hands over once in place (third nail taken back); crossing retries keep the climb; Restart returns to the Layer 3 entrance. See docs/validation/sketch-s4/s4c/README.md and NEXT_SESSION. Uncommitted over `68e7785`; stop for user review; S4D needs its own request; S4 is not complete. No commit/push, generation or sub-agents authorized.

S4B accepted by the user on 2026-10-07 and committed/pushed at their request; next is S4C on its own request. Earlier: S4B was implemented at its playable review gate: `study=layer-3-swings`, free placement on strip F and moving bars M1/M2 (never empty air), two nails, F → M1 → Q → M2 → Q → fixed end ledge over glue; a shared forced-detach fling was fixed. See docs/validation/sketch-s4/s4b/README.md and NEXT_SESSION. Uncommitted over `ce66df9`; stop for user review; S4C needs its own request. No commit/push, generation or sub-agents authorized.

Earlier direction, 2026-10-07: the user accepted the three-nail S4A and redesigned S4B: make a platform → moving swing → second moving swing → fixed end ledge, with free nail placement along nailable surfaces (not empty air) in that section only; the third nail is taken back after the climb (two nails in S4B). Plan: docs/gameplay/SKETCH_S4B_PLAN.md. S4B needs its own implementation request. The user authorized committing/pushing this accepted S4A + S4 planning checkpoint to origin/main; later commits need new authorization.

Latest S4A state, 2026-10-07 (second review): the user found the six-board climb still impossible but liked it, and decided Layer 3 gives a **third nail picked up at its start**, keeping the climb a little tough. Implemented with pin-ahead reach 11, a 0.9 s wall grip then 2 u/s slide, and a 0.3 s early-kick buffer (all section-only); Layers 1/2 and S1 keep two nails. Earlier: S4A was revised into a six-board continuous criss-cross with a section-only non-cancelling kick; it is back at its playable review gate; see docs/validation/sketch-s4/s4a/README.md and NEXT_SESSION. Stop for user review; S4B requires its own request. Uncommitted over `77acf03`; no commit/push, generation or sub-agents authorized.

Latest S4 handoff, 2026-10-06: S3 is committed/pushed at `77acf03`. The user requested implementation plans/prompts with comfortable session scope; S4 is **planned only** in docs/gameplay/SKETCH_S4_PLAN.md and SKETCH_S4A/B/C/D_PLAN.md, with four future prompts in SKETCH_S4_PROMPTS.md. Next implementation is S4A only on its own request. A wall climb → review → B glue → review → C joined Layer 3 → review → D earlier-layer integration/final S4 gate. Subdivide further when a proof needs more time; never treat four sessions as a hard cap or execute all prompts together. No S4 code/generation/commit/push/sub-agents are authorized by the planning request. Current NEXT_SESSION supersedes older S3B review handoffs below.

Latest user direction, 2026-10-06: the user confirmed Slice 3 is made and explicitly authorized committing/pushing the completed S3A/S3B checkpoint to origin/main. Next is S4 (Layer 3 wall climb/glue crossing), requiring a separate implementation request. This supersedes earlier S3B review-only and commit/push restrictions for this checkpoint; it does not authorize S4, generation, publishing or sub-agents. See current PLAN/NEXT_SESSION.

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

Sketch S1 is complete after the user's review. `docs/gameplay/SKETCH_S1_PLAN.md` records its technical plan; preserve the reviewed implementation. S2 (Layer 1, the first escalator and the stacked-world framing) is implemented and stops at its playable review gate; `docs/gameplay/SKETCH_S2_PLAN.md` records its plan and `docs/validation/sketch-s2/` its evidence. S3A is implemented at its playable review gate; S3B is now implemented at its playable review gate: joined Layers 1/2 and the second ride stop on safe Layer 3 ground. See docs/validation/sketch-s3/s3b/ and the current NEXT_SESSION review prompt; stop before S4.

Direct user instructions take precedence. Among documents, DECISIONS defines current choices, REQUIREMENTS defines behavior, and PLAN defines sequence. Concept descriptions in older documents do not reopen settled choices. When changing a decision, update the affected authoritative documents together and note what changed.

## Scope and working style

- The scoped M3 art-cohesion pass in docs/art/ART_DIRECTION.md is complete: four selective offline bread/basket/crumb/cake preparations, verified with 40 focused tests and nine Chromium scenarios. The stylised player, richer soft background and other props are reused; original sources and approved gameplay remain intact. See docs/planning/PLAN.md and docs/planning/NEXT_SESSION.md; preserve the result, including any newer local edits. M3 remains the completed baseline. Existing ImageGen authorization/provenance covers required M3 props only; it does not extend to other worlds or replacement generation of DreamLayer assets. Retired request identities remain for audit; do not retry them. Preserve audio, museum/restoration, saves, isolated entry, LOOK rays and high-dessert backdrop. Do not finish the museum or generate a catalogue. Sketch S1 is complete after review; S2 is implemented with its requested review corrections. The full adventure/ending remain unimplemented. S3A is implemented at its playable review gate; S3B is now implemented at its playable review gate: joined Layers 1/2 and the second ride stop on safe Layer 3 ground. See docs/validation/sketch-s3/s3b/ and the current NEXT_SESSION review prompt; stop before S4.
- Commit to Royal Supper + Unfinished Sketch. The user replaced Sleeping Mountain on 2026-10-06; it is now a reserve. Drowned Garden remains a gated third adventure.
- Sketch has two nails, authored placement targets and button-driven FIFO recall. Nails freeze boards/pendulums; axes stay active; final moving swing sockets carry their nails. The player swings directly on the nail with A/D momentum, without a rope. Follow docs/gameplay/UNFINISHED_SKETCH.md; do not substitute the older drawing-stroke idea or add grappling.
- Sketch's theme and artifacts, including backgrounds, must be fully animated/cartoon, not realistic or semi-realistic. Use simple cartoon placeholders in S1; exact final references remain a later art task. Preserve approved Royal Supper/museum/masterpiece assets and restoration registration. See the separate Sketch direction in docs/art/ART_DIRECTION.md.
- Preserve a modern cartoon 2.5D feel: side-view movement, visible board/platform thickness, rounded prop volume, depth-separated scenery and soft stylised lighting. Avoid flat 2D/retro pixel-game presentation. Depth must not obscure nail targets or hazards; no new free-3D controller or fully 3D character is required.
- Final Sketch has three stacked layers in one scene/canvas, moderately zoomed/reframed toward the active layer while retaining neighboring-layer context. Do not isolate a row as its own screen. This user refinement supersedes the fixed-full-board/no-zoom choice. Prove comfortable mechanic size and context in S2; S1 bays remain development tests. The user declared S1 complete; preserve its reviewed fixes and do not start S2 without a request.
- Advance one named slice per explicit implementation request, with a playable gate and user review before the next. The user requested S2 completion/review corrections on 2026-10-06, including mandatory nail reuse through a revised platform mechanic. S2 pendulums are outlined/non-solid until pinned; recall removes solid support. Preserve S1. S3A was subsequently explicitly requested and is implemented at its playable review gate. The later user difficulty review explicitly requires nails: its three faster, narrower boards are moving outlines with no support until pinned, and two faster active axes guard the leftward route. All three pins and FIFO reuse are required through collision and measured geometry; A/B/recall-A/C is the verified standard solution. See docs/validation/sketch-s3/hard-v1/README.md; the initial solid-board shortcut evidence is historical. The later user requested the S3B plan/handoff and explicitly authorized committing/pushing this reviewed checkpoint to origin/main. The later explicit S3B-only request implemented joined layers and the second ride; it does not authorize commits/pushes, Layer 3 challenges, campaign/ending, generation, publishing or sub-agents. Stop at the S3B review gate.
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
