# Agent instructions — The Last Curator

## Purpose and current state

Build a small, polished browser game for the DreamLayer jam and hiring submission. One damaged masterpiece is restored by recovering pieces inside other museum artworks. The museum is 3D; adventures inside artwork are side-view 2.5D.

This checkout contains the M0–M2 TypeScript/Vite/Three.js foundation, playable Royal Supper geometry blockout, minimal first-person museum, pear placement/restoration loop, validated campaign saves, focused tests and planning documents. No generated production art, audio, mountain or campaign ending exists. Node v22.14.0 and npm v10.9.2 were re-verified on 2026-10-05. It is now a Git repository with origin `https://github.com/XZNON/night-at-the-museum.git`. Verify the environment before implementation rather than assuming these observations remain current.

The next implementation milestone is M3: first adventure art and sound. Do not treat this file as an instruction to start coding or spending credits without a user task.

## Read order and authority

1. `PLAN.md`: milestones, current task and handoff.
2. `DECISIONS.md`: settled choices, defaults and change boundaries.
3. `REQUIREMENTS.md`: game behavior, shared contracts and acceptance criteria.
4. `ROYAL_SUPPER.md`: first playable adventure.
5. `ASSETS.md`: DreamLayer workflow and asset requirements.
6. `tech stack.md`, `masterpiece.md`, `mini games.md`: supporting detail and idea archive.

Direct user instructions take precedence. Among documents, DECISIONS defines current choices, REQUIREMENTS defines behavior, and PLAN defines sequence. Concept descriptions in older documents do not reopen settled choices. When changing a decision, update the affected authoritative documents together and note what changed.

## Scope and working style

- Next session: verify DreamLayer access/costs, establish approved references and integrate the required first-adventure art/sound against the proven M2 layout. Preserve the museum/restoration loop and isolated development entry. Do not start with the final museum or generate the entire art set.
- Commit to Royal Supper + Sleeping Mountain. Drowned Garden is a gated third adventure. Reserve ideas remain outside the jam build.
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

- DreamLayer is the intended source for major visual assets. Do not silently substitute another generator.
- Preserve approved references and record generated assets in a manifest as described in ASSETS.md.
- Never put API keys in browser code, public assets, prompts/logs checked into the project, or the production bundle.
- Verify DreamLayer access, credit balance and costs before making a generation batch. The 100 credits are allocated API credits, not an assumed count of 100 images.
- Missing credentials do not block placeholder gameplay development. Report the specific art dependency when needed.
- Do not claim layered exports, transparent output or matching animation frames are guaranteed; inspect and prepare assets.

## Verification and handoff

Once scaffolded, provide `npm run dev`, `npm run typecheck`, `npm run build`, and `npm run preview`. Add focused tests for collision/progression risks rather than tests mirroring scene decoration.

Playtest jumping, fork/candle gates, checkpoints, collection and repeated scene entry. Later verify placement, saves, transitions and production paths. Profile on an actual representative machine before claiming the performance target is met.

Maintain `PLAN.md` milestone status and record validation, known issues and next task in its implementation log. If browser interaction cannot be tested, say so and provide reproducible manual checks.

Do not publish, submit to the jam, or email anyone unless the user authorizes that action. Creating local builds and submission materials is within implementation scope.
