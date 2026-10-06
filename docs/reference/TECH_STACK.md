# The Last Curator — Tech stack

## Selected stack

Use TypeScript, Vite, Three.js with WebGLRenderer, HTML/CSS UI, and Howler.js audio. Ship a static browser build on itch.io. Use one renderer and a small game-specific runtime for the museum and all mini-games.

Three.js is a rendering library, not a complete game engine. Our runtime supplies scene lifecycle, input, collision, interactions, inventory, progression, checkpoints, and saving. Keep these systems specific to this game rather than building a general-purpose engine.

## Responsibilities

| Area | Choice | Implementation |
| --- | --- | --- |
| Language | TypeScript | Typed scene contracts, level definitions, inventory and progress |
| Development/build | Vite + npm | Vanilla TypeScript project; production static bundle |
| Rendering | Three.js WebGLRenderer | One canvas and renderer, one active world at a time |
| 3D museum | Three.js perspective camera | Simple room geometry, textured surfaces, frames and restrained lighting |
| 2.5D mini-games | Three.js orthographic camera | Side-view gameplay on an XY plane; depth-separated illustrated scenery |
| 2D elements | Three.js textured planes + HTML/CSS | World sprites in Three.js; menus, inventory and inspection in DOM |
| Collision/movement | Small custom kinematic controllers | Museum wall bounds; mini-game rectangles, gravity and authored moving platforms |
| Animation | Three.js transforms/AnimationMixer where needed | Sprite frames, scripted prop motion, camera transitions and restoration shader |
| Audio | Howler.js | Music, ambience, sound effects, volume controls and fades |
| Progress | Shared typed state + localStorage | Versioned saves; handle unavailable storage and allow reset |
| Visual assets | DreamLayer | Approved artwork references, derived layers, props, pieces and character poses |
| Distribution | itch.io HTML5 ZIP | index.html at ZIP root, relative asset paths, responsive canvas |

## Museum

Build the room, floor, carpet, partitions, and frames with simple meshes. DreamLayer images become painting textures and selected decorative surface textures.

Use a perspective camera with a first-person controller, selected as the working default in docs/planning/DECISIONS.md. Support mouse look during exploration and release cursor capture when opening inventory or inspecting the masterpiece. Test cursor capture in the itch.io embed and provide drag-to-look fallback.

Detect artwork interaction through raycasting, restricted by distance and visibility. Block movement through walls using simple floor-plan collision bounds. The hub does not require dynamic rigid-body physics.

## Mini-games

Use the same renderer with separate scenes and an orthographic camera. Movement and collision happen on the XY plane, while illustrated planes sit at different Z depths for parallax and occlusion.

Use unlit materials for most illustrations to preserve DreamLayer's authored colours. Keep decorative art separate from explicit collision shapes.

Share a character controller across games: fixed-step movement, gravity, jump buffering, coyote time, checkpoints and moving-platform support. Use collision resolution that prevents tunnelling at the maximum supported movement speeds. Keep initial terrain and bridge collision shapes simple; elaborate slopes are outside the first prototype.

Fork toppling, valves and bridges use scripted transitions between known states. Update collision geometry to match each state. These puzzle interactions need predictable outcomes rather than simulated rigid bodies.

## UI and masterpiece restoration

Use HTML/CSS overlays for inventory, prompts, pause menu, settings, and masterpiece inspection. Use Pointer Events for dragging inventory pieces into authored target regions, with click-to-select/click-to-place as an alternative.

Pause world movement while inspecting. Drive inventory, restoration masks and artwork unlocks from the same progress state.

Use an aligned base image, restored image and region mask to animate colour restoration. This avoids loading a full-resolution painting for every possible restoration combination.

## DreamLayer workflow

Generate assets during development through DreamLayer's available API, CLI or MCP workflow, then include approved assets in the build. The player's game session does not require image generation, API access or an exposed API key.

Keep original high-resolution sources separately. Export game-ready WebP images when appropriate, with PNG for assets whose edges or masks need lossless data. Use sprite atlases for related character frames and small props when useful.

## Performance plan

These are initial budgets to validate in the actual prototype, not guaranteed performance claims.

- Desktop/laptop browser with keyboard and mouse is the jam target. Touch controls can be a later addition.
- Aim for 60 FPS at 1280×720 on a representative integrated-GPU laptop; offer a reduced quality setting for slower devices.
- Cap device pixel ratio at 1.5 initially and allow a 1.0 low setting.
- Render/update only the active scene. Pause gameplay and clear input on loss of focus.
- Use a fixed 60 Hz simulation step with capped catch-up work; render independently and interpolate motion where useful.
- Keep museum lighting restrained. Start with no real-time shadow maps; add a single limited shadow setup only if it visibly helps and profiling permits it.
- Avoid reflections, volumetric lighting, and full-screen postprocessing in the first build. Add effects only against a measured budget.
- Use 1024–2048 px artwork textures according to on-screen size; reserve larger images for close-up inspection only when needed.
- Compressed downloads do not imply small GPU memory use. Control texture dimensions and loaded texture count.
- Preload hub essentials and the first adventure; load later worlds during safe transitions or idle time. Show loading progress.
- Reuse geometry, materials and cached assets. Explicitly dispose unused GPU resources when evicting a scene, while retaining shared assets.
- Avoid large overlapping transparent planes and excessive particles; monitor draw calls, texture memory and frame times.
- Initial download goal: approximately 20 MB or less. Total asset goal: approximately 50 MB or less. Reassess after final artwork and audio exports.

## Validation

Verify the complete museum → mini-game → inventory → restoration loop in a production build. Check resize, fullscreen, cursor release, keyboard focus, audio activation after user input, saved progress and checkpoint recovery.

Profile Royal Supper on a representative integrated-GPU machine before expanding the content. Test the actual itch.io iframe; local development alone does not verify hosted paths or input behaviour.

Use Vite base './', and construct runtime asset URLs relative to the configured base. Bundle dependencies locally and avoid runtime CDN dependencies. Pin installed versions through package-lock.json once the project is scaffolded.

## Sources

- [Three.js documentation](https://threejs.org/docs/)
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Vite guide](https://vite.dev/guide/)
- [Howler.js](https://howlerjs.com/)
- [itch.io HTML5 upload guide](https://itch.io/docs/creators/html5)
