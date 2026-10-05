# The Last Curator — Build plan and session handoff

## Objective

Deliver a small, polished browser game for the DreamLayer jam and Game Developer hiring process. Explore a dim red museum, enter artwork adventures, recover missing pieces, and restore one masterpiece to a complete ending. Target a complete first version in 2–3 development days, then polish before the October 12 submission deadline stated in the invitation.

The deadline is not a reason to include unfinished systems. Verify the live jam cutoff/timezone before final submission and leave upload time.

## Current status

- [x] Game concept, technical stack and build sequence documented.
- [x] First adventure selected: Royal Supper.
- [x] Working controls, progression, scope and scene contracts defined.
- [x] Application scaffold and locked dependency versions (M0).
- [x] Playable Royal Supper placeholder scene and focused tests (M1).
- [x] Minimal museum, pear restoration, accessible placement and validated saves (M2).
- [ ] DreamLayer account/API connection, credits/cost verification.
- [ ] Generated/approved production assets.

M0–M2 implementation now exists in this directory, including the playable museum → supper → pear restoration loop. Original planning documents were preserved. Node v22.14.0 and npm v10.9.2 were re-verified on 2026-10-05. This directory is now a Git repository on `main` with origin `https://github.com/XZNON/night-at-the-museum.git`. DreamLayer credentials were supplied in `.env` by the user; access, balance and generation costs have not been verified, and no generation requests have been made. Next milestone: M3, first adventure art and sound.

## Document map

- AGENTS.md: implementation instructions.
- DECISIONS.md: current choices, scope and remaining decisions.
- REQUIREMENTS.md: behavior and shared contracts.
- ROYAL_SUPPER.md: first-adventure mechanics and verification specification.
- ASSETS.md: DreamLayer asset pipeline.
- tech stack.md: technology and performance rationale.
- masterpiece.md: composition and restoration story.
- mini games.md: idea archive, including deferred alternatives.

## Build sequence and completion gates

### M0 — Foundation (implemented)

- Scaffold vanilla TypeScript + Vite in this directory, preserving documents.
- Install Three.js and appropriate development typings. Add Howler when audio integration starts.
- Configure relative base paths and dev/typecheck/build/preview scripts.
- Implement one renderer, resize handling, scene lifecycle, input and fixed-step loop.
- Establish typed level definitions and stable campaign/piece IDs. Implement only contracts needed by Royal Supper first.
- Supply a development-only direct entry to Royal Supper without changing campaign save data.

**Gate:** Local dev and production preview load; typecheck/build pass; resize and focus loss do not break movement or duplicate the loop.

### M1 — Royal Supper blockout (implemented)

- Tune movement and camera before arranging difficult jumps.
- Build the route and checkpoint recovery described in ROYAL_SUPPER.md.
- Implement fork and candle state changes, matching collision and clear E prompts.
- Collect the pear through the shared completion interface.
- Use deliberately simple placeholders; no dependency on DreamLayer availability.

**Gate:** Start-to-finish route is playable; both interactions are required and reachable; no softlock; falls recover quickly; pear collection is idempotent. Record actual playtest results and known limitations.

### M2 — Minimal complete restoration loop (implemented)

- Create a rough first-person room with walls, one artwork and a placeholder masterpiece.
- Enter Royal Supper by clicking the artwork; return near that frame after collection.
- Add inventory and close-up placement with drag/click/keyboard alternatives.
- Restore one colour region, reveal the sun objective and update campaign state.
- Save/reload campaign progress and support reset.

**Gate:** Museum → supper → collect → return → place → restore works in production preview. No visible enterable mountain door until its scene exists; a locked/coming-later development indicator is acceptable locally.

### M3 — First adventure art and sound

- Establish approved DreamLayer masterpiece and banquet references early; do not wait for the final museum.
- Export geometry-aligned background layers, player/props and pear assets against the proven camera/layout.
- Integrate art without changing collision based on image pixels.
- Add essential feedback, ambience and transition audio.
- Profile the first loop and fix major rendering/loading issues before adding worlds.

**Gate:** Royal Supper feels cohesive, its path is readable, interactions match visible props, and generation provenance is recorded.

### M4 — Second adventure and complete two-artwork game

- Build Sleeping Mountain with placeholders using the shared character controller.
- Add wind/bridge interactions through its own level configuration.
- Award sun, connect restoration and implement a complete ending after stage two.
- Produce only the required mountain assets, then integrate them.

**Gate:** New game through ending works with two artworks. Reset, save/load, retries, replay and unlocks are verified.

### M5 — Final museum presentation and scope gate

- Finish compact museum layout, red carpet, wooden floor, artwork arrangement, frames and dim warm lighting.
- Finish masterpiece composition, readable missing regions and restoration animation.
- Consider Drowned Garden only if M4 is complete and sufficient polish/testing time remains. Otherwise ship two artworks with the complete two-stage composition.
- If adding it, switch the campaign to three stages, build and verify the bird restoration and move the ending accordingly.

**Gate:** Every enterable artwork is playable; the chosen stage count and final art agree; the museum clearly communicates the next objective.

### M6 — Polish and release preparation

- Tune hints, movement, sound levels, checkpoints, transitions and ending.
- Test current desktop browsers, embedded input, fullscreen, aspect ratios, loading and storage failure.
- Profile on a representative integrated-GPU laptop. Document measured results rather than assuming the target is met.
- Build itch.io ZIP, screenshots and a short DreamLayer asset/process explanation.
- Prepare a release checklist; upload/submission/email require user authorization.

**Gate:** All release acceptance criteria in REQUIREMENTS.md pass or have an explicitly agreed scope adjustment. Complete ending, working hosted assets, and DreamLayer usage evidence are mandatory.

## Time and scope management

- Day 1 target: M0–M1 and begin M2.
- Day 2 target: finish M2, first-art integration and start second adventure.
- Day 3 target: complete the two-artwork game and museum presentation.
- Remaining time: polish and hosted testing. These are targets, not guarantees.
- If behind, cut optional content/decoration first. Preserve responsive movement, both core supper interactions, recoverable failure, collection/restoration and a complete ending.
- Do not generate a broad asset catalogue or build reserve adventures before the playable route needs them.

## Next-session starting prompt

> Read AGENTS.md, PLAN.md, DECISIONS.md, REQUIREMENTS.md, ROYAL_SUPPER.md and ASSETS.md. Continue with M3: verify DreamLayer access, credit balance and current operation costs without exposing credentials, establish a small approved masterpiece/banquet/character reference set, then prepare only geometry-aligned Royal Supper assets needed by the proven route. Integrate essential audio with Howler and saved volume. Preserve the M2 loop, accessible placement, validated saves and isolated development entry. Do not build the final museum, expose an unimplemented mountain, or generate a broad art catalogue. Update PLAN.md with actual validation and asset provenance.

## Implementation log

### 2026-10-05 — Planning handoff

Documentation completed. No code, dependencies, API calls for generation or deployment. Next task: M0 + M1. No blocking gameplay questions; DreamLayer access is an upcoming art dependency, not a blockout dependency.

### 2026-10-05 — M0 + M1 implementation

**Implemented:** Vanilla TypeScript/Vite/Three.js scaffold with relative `base: './'`; one lazily created WebGLRenderer/canvas, fixed 60 Hz simulation with capped catch-up, interpolation, resize/DPR caps, serialized scene transitions and explicit input/UI/loop/GPU disposal. Pause, blur and visibility handlers clear held keys and require resume. Unsupported WebGL reports a readable retry screen. HTML/CSS menu, HUD, prompts, pause/quality controls and completion/replay screens are present.

Royal Supper uses typed layout, physics tuning, bounds, colliders, hazards, checkpoint spawns and interaction timings. The placeholder route includes basket/bread jumps, dish and standing-clearance goblet passage, a required 9-unit fork bridge, a candle-top gate under a canopy, dessert jumps and the pear. Fork/candle actions ignore repeat activation and apply collision/hazard changes at the settled state. Session checkpoint and action state survive falls and scene exits, including an in-flight action. Clean adventure restart resets the route while preserving the in-memory award. Mini-game completion calls the shared idempotent campaign command service. No museum meshes or global unlock decisions live in the adventure.

Development-only direct entry: `/?scene=royal-supper`; collision/FPS diagnostics: `&debug=1` or F3; safe movement lane: `/?lane=movement`. Production ignores these queries, omits inspection hooks and opens the blockout menu. Both normal blockout play and direct entry deliberately use isolated in-memory progression; existing `last-curator.save.v1` data is not read or changed.

**Environment and locked dependencies:** Node 22.14.0, npm 10.9.2; Three.js 0.186.1, Vite 8.3.2, TypeScript 5.9.3, Vitest 5.0.3, Playwright 1.63.0, Three typings 0.186.0, Node typings 26.6.4. Exact versions are in package.json/package-lock.json. Howler remains deferred until actual audio integration at M3, as specified by M0. This folder is still not a Git repository. No original documents were removed.

**Verification:**

- `npm run typecheck` and `npm run build` pass. The static output totals about 573 kB before compression; the JavaScript is about 568 kB / 144 kB gzip. Vite emits a nonfatal >500 kB chunk warning, largely from bundled Three.js. No runtime CDN or generated asset dependency exists.
- `npm run test`: 18 focused tests pass across collision/controller, gate/recovery/session behavior, progression and serialized scene lifecycle. Swept tests cover thin floors, ceilings and walls at velocities above supported gameplay speed. Jump measurement: ~2.24 units rise and ~5.78 units horizontal held-jump travel; ordinary step rises/gaps are comfortably below the envelope, and the 9-unit fork gap exceeds it.
- Keyboard-driven Chromium development playtests complete the entire route at both low and normal quality. They verify safe E prompts, repeated E, checkpoint R, paused position stability, dispatched blur and held-key clearing, 960×540/1280×720 resize, candle-gap fall recovery, completion, clean replay and a single pear award. No teleport/state setters are used.
- Re-entry retains after-candle checkpoint and bridged/extinguished states. Three additional leave/re-entry cycles keep one canvas and a stable 98 rendered geometries; no browser exceptions occur. Unit checks verify rapid overlapping transitions are ignored and construction errors retain the active scene.
- Production preview at `http://127.0.0.1:4173/` loads bundled relative asset URLs with no failed asset responses or browser exceptions. A full keyboard traversal using visible prompts/HUD reaches the pear. Development hooks are absent, and an existing save sentinel remains unchanged after entry, exit, re-entry and collection.
- Final `npm run test:browser`: both integration tests pass (development/replay/lifecycle and full production traversal). The in-app browser was used to inspect the rendered scene and is left open on the production build. Browser tests preserve screenshots/traces in ignored `test-results/`; a representative screenshot is retained at `docs/validation/royal-supper-blockout.png`. `README.md` gives run commands, development entry points and reproducible manual checks. Automated traversal is recorded as automated playtesting, not a first-time human difficulty review.

**Known limitations / remaining verification:** All art is geometric placeholder art, and there is no audio, museum, placement UI, save system, mountain or campaign ending yet. No representative integrated-GPU profiling, multi-browser/fullscreen/itch.io iframe testing or human first-time route/readability review has been performed; do not claim the 60 FPS target. Actual OS focus switching/hidden-tab behavior remains a manual follow-up beyond the dispatched blur test. The >500 kB bundle warning should be revisited with later loading/performance work. A graphics-context-loss cue exists, but context restoration has not been exercised. The release acceptance list in REQUIREMENTS.md remains open.

**Credentials/art:** The user supplied a DreamLayer key in `.env`. The agent did not inspect or use its value. `.env`/`.env.*` are ignored, no client code imports credentials, and no generation calls or credit spending occurred. DreamLayer access, credit balance, costs and approved references still require verification before M3 generation.

**Next task:** M2 — build a minimal first-person placeholder room with a Royal Supper frame and masterpiece, then connect artwork entry → shared collection → safe return → accessible pear placement → region restoration → validated save/reset. Keep the development route isolated from saves. Do not expose an enterable Sleeping Mountain until implemented. The M0/M1 gates are met by the recorded local checks; release/profile checks remain separate.

### 2026-10-05 — M2 minimal restoration loop

**Implemented:** Small first-person museum with room bounds, floorboards/carpet, one Royal Supper frame and the Garden Before Dawn study. Museum dimensions, movement, interaction range, safe spawn/return poses and normalized placement targets are typed configuration. Clicking a nearby visible artwork enters supper; E under the reticle is also supported. Raycasts check distance and occlusion. Mouse look offers explicit pointer lock plus drag fallback; menus/inspection release it. The museum owns its listeners and GPU resources and uses the existing renderer, scene manager and fixed-step loop.

The existing supper layout, controller behavior, fork/candle timing, checkpoints and puzzle model remain intact. Collection still uses the shared idempotent campaign command, now saving campaign awards. Return near the supper frame works both after collection and during unfinished traversal. Session re-entry retains puzzle/checkpoint state; reload starts the traversal fresh while preserving campaign pieces. A short post-transition input guard prevents a repeated Return click from entering the destination frame.

Inventory derives from collected minus restored pieces. Close inspection pauses walking and supports native drag/drop, click selection/target activation and Tab/Enter placement. Wrong targets retain the pear and provide feedback. Valid placement consumes inventory through the shared restore command and saves immediately before the optional colour animation. Tree/garden colour updates both in close-up and in the museum frame; reduced-motion skips the animation. Restoring pear reveals the sun objective. The committed two-stage campaign remains incomplete at this point; there is no mountain frame, enterable unavailable adventure or premature ending.

Validated `last-curator.save.v1` persistence covers schema/campaign identity, known/unique IDs, owned restoration prefix, eligible collections and bounded settings. Unlocks/inventory/completion are derived, not stored flags. Malformed/incompatible data recovers safely with a notice. Read/write/reset failures preserve in-memory play and explain persistence limits. Quality and master volume save/reload; volume is prepared for M3 audio. Reset/New Game requires confirmation, initially focuses Keep progress, clears only this game's save and current session, then opens a fresh museum.

Direct development entry and movement lane use a separate in-memory progression service and never access campaign storage, including settings/reset actions. Production ignores direct-entry/debug queries and ships no inspection hook. No final art, audio integration, mountain scene, generation request, deployment or submission was added. Current decisions and release scope are unchanged; AGENTS.md/REQUIREMENTS.md/README.md were synchronized with the M2 handoff.

**Environment / build:** Node 22.14.0 and npm 10.9.2 re-verified; this directory is still outside Git. Dependencies/lockfile remain unchanged. `npm run typecheck` and `npm run build` pass. Static output is approximately 596 kB before compression, with JavaScript about 589 kB / 151 kB gzip. The existing nonfatal >500 kB Three.js chunk warning remains. Relative paths and bundled dependencies remain in use.

**Verification:**

- `npm run test`: all 22 focused tests pass. The original 18 collision/controller, gate/recovery, progression and scene-lifecycle tests remain passing; four save tests cover corruption, prefix/eligibility repair, duplicate/unknown IDs, incompatible schema/campaign, settings, replay idempotency and failed storage/reset isolation.
- Six Chromium browser scenarios pass on final code. Final verification ran five successful scenarios in the full suite and reran the production-loop case successfully after correcting the test harness's locator double-click retry against a departed button. That case now sends an actual double click at the observed button coordinates. Browser traversal uses real controls with visible production HUD/prompts; no teleport or progression setters are shipped or used to complete the route.
- Production preview `http://127.0.0.1:4173/`: new museum → clicked supper entry → both gates → pear collection → double-click safe return → inventory → invalid sun target → correct click placement → colour restoration. Reload after actual collection retains the pear; reload during restoration loads completed progress. Replay traverses the full route after reload and cannot duplicate/reverse the pear. Three further entry/return cycles work, reset cancellation retains progress, confirmed reset persists through reload, and another game's stored data survives. No browser exceptions or failed asset responses are observed; production debug hooks are absent.
- Separate production drag and keyboard placement cases start from validated reloaded inventory fixtures. A wrong drag retains inventory; correct drag and pure Tab/Enter placement restore the region and survive reload. Simulated malformed/denied/full storage stays playable through collection and restoration. Quality/volume settings persist and reload correctly.
- Development browser regression completes supper at low/normal quality, exercises checkpoint recovery, repeat E, restart/replay, pause/blur, resize and re-entry. Existing campaign-save sentinel bytes remain untouched throughout the isolated route and settings changes.
- Museum browser checks verify wall bounds, drag look, paused position stability, held-key clearing on dispatched blur, inspection input isolation, real pointer lock/release, simulated pointer-lock denial/fallback, resize and one canvas. Three museum → supper → museum cycles keep geometry/texture counts stable for the same return view and no greater than the initial wider view. Counts are compared at matching views because Three uploads visible resources lazily.
- Rendered museum and restored close-up were visually inspected, including correction of HUD/inspection overlap. Screenshots are retained at `docs/validation/museum-m2.png`, `docs/validation/pear-restoration-m2.png` and `docs/validation/museum-small-m2.png`. The in-app browser remains open on the playable production museum. README.md includes run commands and reproducible manual checks.

**Known limitations / remaining checks:** This is an M2 placeholder study, not the release. Audio, DreamLayer references/production assets, Sleeping Mountain, the full ending and final museum presentation remain future work. Automated traversal is not a first-time human difficulty/readability review. Multi-browser, fullscreen, itch.io iframe/hosted paths, actual OS focus/tab switching, graphics-context restoration and representative integrated-GPU profiling are still unverified; no device FPS claim is made. The release acceptance list stays open.

**Art / credentials:** `.env` values were not inspected, logged or imported. No DreamLayer API calls or credit spending occurred. Verify access, balance and current generation/edit costs before M3's small reference batch, and preserve approved references/provenance as ASSETS.md requires.

**Next task:** M3 — approved DreamLayer masterpiece/banquet/character references, then only the first-adventure layers/props required by the stable camera/route; integrate essential sound through Howler using saved volume. Preserve the complete loop, save validation, accessible placement and isolated development study. Keep Sleeping Mountain unavailable until its M4 implementation exists. M2's local production-loop gate is met; release/profile gates remain separate.

### 2026-10-05 — Initial Git snapshot

The user authorized the first commit and push to `https://github.com/XZNON/night-at-the-museum.git`. The remote was verified empty before initializing local `main` and adding `origin`. The initial snapshot contains the M0–M2 source, locked dependencies, tests, planning/handoff documents and retained validation screenshots. `.env` files, installed dependencies, local builds and browser test outputs are excluded by `.gitignore`. No gameplay scope change or website deployment is part of this repository setup; M3 remains the next implementation task.
