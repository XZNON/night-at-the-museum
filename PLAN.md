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
- [x] DreamLayer account/API connection, credits/cost verification (M3 reference checkpoint).
- [x] Small DreamLayer masterpiece, banquet and player reference set generated and inspected.
- [ ] User approval of reference visual direction (required before production generation).
- [x] Expanded Royal Supper mechanics implemented with placeholders (validation below).
- [x] User approval of the revised gameplay layout, including the final trident candle jumps.
- [ ] Generated/approved production assets.

M0–M2 implementation exists, including the playable museum → supper → pear restoration loop. Node v22.14.0 and npm v10.9.2 were re-verified on 2026-10-05. This repository is on `main` with origin `https://github.com/XZNON/night-at-the-museum.git`. M3 has begun: DreamLayer live access and costs are verified. Masterpiece/player references and the revised full-table banquet reference (banquet-v5.png) await user approval. Seven API credits were spent across the initial set and banquet revisions; the last observed balance was 93 and was not rechecked for this mechanics pass. No production art or sound has been integrated yet. M3 remains incomplete. See the latest implementation log and asset-sources/reference-review.md before continuing.

The user subsequently expanded Royal Supper's mechanics and requested planning before implementation. The gameplay hold was lifted on 2026-10-05. Current code contains double jump, butter/crumb sliding, rolling grapes, timed fan/three-candle passage, diner cover and jelly launches. User playtesting subsequently identified butter momentum/contact bugs, misleading cover and excessive repetition. The latest revision shortens and varies those sections; see the latest implementation log. The original 5–7 minute target is provisional pending revised human review; do not stretch the route with repetition. Preserve demanding timing, unlimited retries and section-end checkpoints. Diner detection remains full-body exposure during LOOK, including jumping out of cover. Production generation remains on hold until revised-layout review and reference approval. Gameplay implementation is authorized.

The user accepted the revised butter, hiding and dessert layout, then requested the final candle change: a shared trident-shaped holder with gaps requiring jumps between three separate tops. This is implemented and verified with model and Chromium traversal. The user subsequently confirmed the complete revised minigame is perfect, closing gameplay-layout approval. Visual-reference approval remains separate and pending.

## Document map

- AGENTS.md: implementation instructions.
- DECISIONS.md: current choices, scope and remaining decisions.
- REQUIREMENTS.md: behavior and shared contracts.
- ROYAL_SUPPER.md: first-adventure mechanics and verification specification.
- ASSETS.md: DreamLayer asset pipeline.
- OPENING.md: deferred nighttime character-emergence sequence for M6.
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

- Expanded supper specification settled; user lifted the gameplay planning hold on 2026-10-05. Complete its placeholder mechanics validation and human timing/readability review before production art.
- Prove double jump and bounce rules in the isolated movement lane. Measure reach, prevent jump stacking and gate bypass, and preserve fixed-step/pause behavior.
- Extend the placeholder route with butter/crumbs, grapes, the automatic timed three-candle/fan section, diner attention/cover and dessert bounce ascent. Revalidate fork reach, checkpoints and camera look-ahead with the new controller.
- Playtest each section and the full expanded museum/restoration loop before producing geometry-specific assets. Previous M2 browser results apply only to the previous layout/mechanics.
- Establish approved DreamLayer masterpiece and banquet references early; do not wait for the final museum.
- Export geometry-aligned background layers, player/props and pear assets against the proven camera/layout.
- Integrate art without changing collision based on image pixels.
- Add essential feedback, ambience and transition audio.
- Profile the first loop and fix major rendering/loading issues before adding worlds.

**Gate:** Royal Supper feels cohesive, its path is readable, interactions match visible props, and generation provenance is recorded.

**Expanded-route gate:** no stacked airborne jumps or bounce-overlap exploit; double jump cannot bypass required gates; timed flames really relight and burn; grapes/attention timers freeze on pause; retries have stable safe checkpoints; the complete museum/collection/placement/save/replay loop remains valid. Record actual traversal/readability evidence rather than relying on a build result. Then finish art/audio verification and the previously authorized commit/push to origin/main. No player-facing route map is required.

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

- After the complete campaign and museum presentation work, add the skippable nighttime opening in OPENING.md: the restorer animates out of the masterpiece using illustrated poses and Three.js motion, then hands off to first-person control. Keep reduced-motion/Skip paths and preserve saves. This task does not block earlier milestones.
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

## Next-session plan and starting prompt

Royal Supper's gameplay layout is approved. Next session finishes M3 art and sound:

1. Verify repository/environment and the existing baseline; preserve approved gameplay.
2. Obtain separate approval of masterpiece.png, banquet-v5.png and player.png. Prepare a small production batch meanwhile.
3. Recheck DreamLayer access/balance/costs, then validate a player/background/platform art slice in the approved camera before generating remaining required assets.
4. Integrate essential original/licensed Howler audio with saved volume and lifecycle ownership.
5. Verify the complete production loop and rendering/loading, record provenance/costs and finish M3. Sleeping Mountain plus the ending follows in M4.

See [NEXT_SESSION.md](NEXT_SESSION.md) for the detailed plan and paste-ready prompt. Gameplay approval closes the layout hold; visual-reference approval is still required before generation. Do not reopen accepted gameplay, pad duration with repetition, or start the final museum/optional adventure/opening. No publication/submission/email is authorized.

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

### 2026-10-05 — M3 reference checkpoint (awaiting user approval)

**Environment and M2 baseline:** Clean main at 92fff3c with the expected origin before work. Node 22.14.0 / npm 10.9.2 verified. Typecheck, production build and all 22 focused tests pass; all six existing Chromium browser scenarios pass (2.2 minutes). The complete production museum → supper → gates → pear → return → restore loop, save/reload, replay, confirmed reset, drag/click/keyboard placement, storage failure, isolated development route and scene/input lifecycle regressions were exercised with real controls. Current rendered supper start/candle and production restoration screenshots were inspected. The existing nonfatal bundle size warning remains. This is baseline automated playtesting; it is not a human readability review or representative-machine profile.

**DreamLayer verification:** Live key access verified through the local ignored .env, privately mapping its DREAM_LAYER_API_KEY name to the CLI's expected DREAMLAYER_API_KEY. No key value was printed, placed in a prompt or added to client/public/source files. Added exact development-only dreamlayer 0.3.0 and a secret-redacting local CLI bridge. Live capabilities report text-to-image, one-reference image edits, background removal, upscale and sprite-sheet access; ordinary successful image operations cost one API credit. Stable CLI cannot invoke the sprite beta. Transparent sprites quote 5.8 credits for 7 frames / 9.9 for 12; none requested. The API started with 100 promotional, zero purchased, 100 available credits. Current purchase pricing explicitly checked via /v1/balance?pricing=current is $0.25 per credit; the stable CLI default balance still reports legacy $0.17. Generation cost is unaffected. Keep 20 credits reserved for retries/edits.

**Reference batch and provenance:** Three sequential text-to-image calls completed with stable saved idempotency keys. Masterpiece execution 322dd1c7-2363-4a1b-b69f-d7566cbe0f3e, banquet 8d317350-cbc8-466f-a2fd-2a79eb6d0ae0, player 61d8b386-263a-427b-979b-16a59109e0ef. Each observed API available-balance delta was one credit: 100 → 99 → 98 → 97, total three. asset-sources/manifest.json preserves public IDs, prompts, hashes, delivered dimensions and credit evidence; reference-review.md records visual inspection and layout constraints. Masterpiece/banquet are 2560×1440; player is 2048×2048 despite requested 3:4. All remain unapproved references, outside public/assets and the build. Actual cutouts/transparency/animation alignment are still future preparation checks.

**Approval boundary / next work:** Present all three references and obtain explicit visual-direction approval, as required by this user task, before generating production assets. After approval, prepare only the tested supper layout's background/props/player/pear and aligned first-restoration presentation. Add original/licensed essential ambience and jump/interaction/collection/return/restoration feedback through Howler, with explicit activation, saved master volume, pause and scene disposal. Preserve all M2 behavior and isolated entry; do not expose mountain or finish the museum. Run complete production-loop regression, inspect actual integrated rendering/loading, record costs and limitations, then commit and push completed M3 to origin/main. No production art/audio integration or commit/push has occurred at this reference checkpoint; M3 stays open. No deployment, submission or email.

**Reference-checkpoint final checks:** Typecheck/build still pass after adding the exact development CLI dependency. A local scan of 59 tracked/new source/reference/tooling/build files found zero occurrences of the local credential value, reporting only the count. Git confirms .env is ignored. Prepared assets have not entered the bundle. The baseline JavaScript remains approximately 589 kB / 151 kB gzip.

### 2026-10-05 — User-requested fuller Royal Supper reference

**Direction change:** The user requested the entire bigger table, more people visibly eating, more wine/glasses/cutlery/goblets/fruits and a trident-shaped holder with three candles. DECISIONS.md, ROYAL_SUPPER.md and ASSETS.md now record that presentation direction. Preserve the validated route, gates/checkpoints and a readable foreground; extra candles remain part of one scripted candle passage rather than new puzzle steps.

**Generation / inspection:** Live access and one-credit image-operation cost rechecked, starting balance 97. Four sequential reference operations delivered at one observed API credit each, leaving 93 available (seven credits spent including the initial set). v2 reference edit, execution f93bf14a-1044-4b40-a0a6-2f0ec4b0601a: fuller feast but five-candle holder, cropped table ends and player on floor, rejected. v3 reference edit, ecb3a65d-47ba-4e84-8834-51cfb0c41e25: correct main three-candle silhouette but square/multiple-table composition, rejected. Fresh wide v4 generation, e4e34aec-4ac0-47e6-8b9c-1f43e315c006: improved faces/dining and correct three-candle holders but left table end cropped, rejected for framing. Fresh wide v5 generation, ca6ea46e-9966-42a8-8cca-1b5f47ae4646: both table ends and complete tabletop visible, more dining guests, abundant wine/glassware/fruit/cutlery and two clear three-candle holders. Selected as the new approval candidate, not marked approved. v5 is 2560×1440. Original and all revisions/prompts/hashes/public IDs are preserved in asset-sources/manifest.json; edit lineage versus fresh text generation is explicit. No production requests were made.

**Limitations / next work:** The candidate has oblique table depth and does not embed the player. It is direction art; derive the actual side-view layers and props against the M2 camera, with the separate player reference, after explicit user approval. Cutouts, aligned runtime art and sound remain unimplemented. Syntax checks for reference tooling and git diff --check pass. Runtime code/collision unchanged; the previous M2 browser validation remains the baseline, not a new integrated-art playtest. Await approval of revised banquet and the existing masterpiece/player before production integration, complete M3 verification and the authorized commit/push. No deployment/submission/email.

### 2026-10-05 — Expanded Royal Supper planning, no implementation

The user requested a longer Mario-style side-scroller with butter/crumb sliding, rolling grapes, a rotating fan that extinguishes three candle flames sequentially before they relight, double jumping without extra jump stacking or gate bypass, a diner attention/cover section and a jelly bounce ascent. No player-facing route map is wanted. In the follow-up planning answers the user selected a 5–7 minute first-playthrough target, demanding jumps/timing, unlimited retries and one checkpoint after each hard section. Diner detection is exposure during the head-tilt/look phase, including jumping above/out of cover; standing still outside cover is not safe.

AGENTS.md, PLAN.md, DECISIONS.md, REQUIREMENTS.md, ROYAL_SUPPER.md and ASSETS.md were synchronized. The old single-jump/permanently extinguished candle rules are superseded for the upcoming implementation. ROYAL_SUPPER.md now specifies the full mechanics and pending acceptance checks; its proposed section order is a design default, not a player map. Automatic fan cycles, predictable grape waves, controlled butter sliding, valid-landing bounce/jump reset, readable hazard/diner cues and retry phases are working implementation defaults. Exact speeds/distances/cycle values will be measured and tuned. One checkpoint follows a cleared hard section, with none midway through a challenge. Full museum/save/placement/reset/replay regression remains required after the expansion.

Next implementation sequence: guarded movement/bounce proof → longer placeholder sections and timed hazards → full loop/camera/difficulty playtesting → approved DreamLayer production art → Howler sound → production rendering/loading/regression checks → completed M3 commit/push. Major preference questions are settled. The explicit request not to start implementation remains in effect until the user moves forward. No gameplay source/dependency changes, art generation, credit spending, commit/push or deployment occurred in this planning turn. Last observed API balance remains 93, not rechecked here. Previous M2 checks validate only current old gameplay. Planning verification: git diff --check; no gameplay tests rerun for documentation edits.

### 2026-10-05 — M3 expanded mechanics blockout (gameplay hold lifted)

**Authorization and scope:** The user explicitly superseded the planning hold and requested the expanded placeholder mechanics, route/production-loop playtesting and this handoff. No production art/audio generation, credits, mountain scene, museum finish, deployment, submission, email, commit or push is part of this pass. The pre-existing uncommitted reference/tooling/document/dependency work was preserved. M3 remains incomplete until layout review, reference approval and later art/audio integration.

**Implemented:** Typed route over approximately 664 units, twelve bread landings, separate butter/crumb and rolling-grape sections, required 16-unit fork bridge, automatic fan/three sequential relighting flames, watched dish-cover passage, jelly launch and fourteen rising dessert landings to the pear at height 44.4. One starting spawn and one checkpoint after each hard section; no checkpoint splits the fan, watched passage or ascent. Recovery is unlimited and takes 0.35 seconds, preserving the settled fork and campaign awards. Required section-end checkpoints advance in order. The following side-view camera tracks height as well as horizontal movement, shows upcoming landings and uses local hints/status cues with no map/progress bar.

Swept collision reports legitimate landings to the controller. Fresh press plus an explicit single air-jump allowance prevents held/repeat, coyote, side/ceiling or bounce-overlap stacking. A downward jelly landing replaces velocity with the bounce launch, consumes the ground/coyote opportunity and permits one air jump; overlap/side contact never recharges it. Butter reduces ground braking/acceleration while retaining reversible control. Grapes use fixed scripted pairs with a visible, collider-protected approach chute, bounded travel and repeatable retry phase. All cyclic motion/attention uses the one 60 Hz gameplay clock, freezes on pause/blur and stops on scene exit; local phases persist on ordinary session re-entry and reset on retries.

The fan cycle is 11 seconds, opening contiguous hazard envelopes at 2.0 / 2.9 / 3.8 seconds for 1.65 seconds each. Flames relight independently; there is no safe permanent pocket between them. Full-depth candle bodies block an underneath route, and a canopy whose top is above jump reach blocks the roof shortcut. The diner cycle is 2.4 seconds AWAY, 0.85 seconds TURNING, 2 seconds LOOK. Authored blue cover protects only a fully contained body; still exposure or jumping above it during LOOK is caught. Red/downward eyes and HUD phase telegraph attention. The fork settles in 0.85 seconds before enabling its collider, ignores repeat E and survives falls/session exits.

Museum return, idempotent shared campaign operations, validated saves, drag/click/Tab-Enter placement, immediate restoration saving, reset confirmation, replay and isolated development entry remain in place. No campaign schema or global unlock logic changed. Production still ignores development queries and omits inspection hooks; gameplay has no DreamLayer/API-key dependency.

**Environment and baseline:** Node v22.14.0 / npm v10.9.2 verified; branch main and expected origin verified. Before changing gameplay, typecheck/build, all 22 original focused tests and five campaign/museum Chromium scenarios passed, including the original complete M2 loop, all placement methods, save/reset/replay, storage failure and museum input/lifecycle. These are recorded separately from expanded-layout checks.

**Current validation:** All 31 focused tests pass, including measured jump/bounce envelopes, fresh/held/repeated presses, coyote rescue and landing reset, bounce/ceiling/side guards, butter braking/reversal, fork/canopy bypass sweeps, sequential relighting/burn recovery, cover/exposure, predictable grapes/contact recovery, complete real-input model traversal and campaign/save/lifecycle risks. Typecheck and production build pass; the familiar nonfatal Three.js >500 kB warning remains (approximately 594 kB JavaScript / 152 kB gzip). Git diff whitespace check is clean. A production-output scan found no credential identifiers or development inspection hook.

Measured held-input envelopes: double jump approximately 11.56 units horizontal / 4.48 units high; jelly plus air jump approximately 14.96 units horizontal / 7.88 units high. Fork bypass sweeps cover 88 second-jump timings; lit-canopy attempts are checked from both the entry and underneath. The only adventure jelly lies after the required gates. The test-only route recorder uses real controls/collision/timers, no teleport or progression setters, and its keyboard schedule drives actual Chromium production traversal.

The six-scenario full Chromium suite passed in 17.1 minutes. It exercised expanded development traversal/lifecycle and production museum → supper → pear → return → wrong/correct click placement → reload → full replay → repeated entry → reset cancellation/confirmation; drag and pure Tab/Enter placement from valid reloaded inventory; malformed/denied/full storage and saved settings; and museum bounds, drag look, pointer lock/release/denial, input isolation, resize and resource disposal. No browser exceptions or failed asset responses occurred. Production hooks were absent. One production replay retried the ascent once; the denied-storage traversal retried bread twice and butter once. Input review also found that a genuine release/re-press between fixed ticks could be missed by the held-state guard. Input now latches Space release alongside its fresh press, preserving the air-jump cap even for both events in one tick; a focused regression test passes. On the final build after the input fix and fan-depth correction, the complete production collection/return/click-restoration/reload/full-replay/repeated-entry/reset scenario and the isolated movement-lane scenario both passed (6.4 minutes). The lane uses a real rapid release/re-press and verifies held/repeated input, the single air jump, valid landing reset, one canvas and untouched save bytes. Final production traversal took about 192 seconds with one early section retry; optimized replay including fan observation took about 168 seconds with no retries. This brings actual coverage to seven distinct Chromium scenarios. The fixed keyboard schedule can finish a fraction short of a checkpoint flag under browser load; the harness now completes that safe section-end walk through ordinary D input before deciding a retry. No teleports, progression setters or production hooks were added. The rotating fan was moved in front of the canopy for visibility; its rendered frozen scene was inspected, alongside cover/hidden LOOK, jelly approach, pear collection and restoration. Representative final screenshots are retained in docs/validation/royal-supper-fan-m3.png, royal-supper-jelly-m3.png and pear-restoration-m3.png; remaining ephemeral captures live in ignored test-results. The expanded isolated browser scenario has passed: low/normal quality, resize, dispatched blur clearing held input/freezing body and timers, intentional early burn, fully hidden LOOK survival, jumping out of cover detection, stationary exposure detection, retry/checkpoint/fork retention, clean restart and replay, repeated scene disposal with stable matching-view geometry counts and one canvas, and untouched campaign-save sentinel. Its fresh scripted traversal with deliberate checks took about 180 seconds; optimized replay about 167 seconds, both with zero incidental retries.

**Duration/readability limitation:** The initial shorter revision took 109 seconds on the optimized zero-retry browser script, so it was lengthened before this final pass. Current fixed-step route time is 165.9 seconds and production keyboard traversal approximately 167 seconds, including planned cover waits and checkpoint synchronization. This is an optimized known-route script, not a first-time human run. The user-selected 5–7 minute target including a few retries and demanding difficulty are design targets, NOT verified human measurements. Human timing/readability approval remains open and production art stays on hold. README.md provides reproducible manual checks. No representative integrated-GPU, cross-browser, fullscreen/itch.io iframe, actual OS focus/tab-switch or graphics-context-restoration verification is claimed.

**Next task:** Time a fresh human traversal and review difficulty, cover cadence, camera and hazard readability; tune the placeholder configuration if needed. Record approval of the revised layout and separate masterpiece/banquet/player references before production generation. Then recheck DreamLayer access/balance/costs and produce only the required geometry-aligned art, followed by essential Howler audio and its validation. Keep mountain unavailable and the museum unfinished. M3 is not complete, and the earlier completed-M3 commit/push authorization is not treated as a reason to push this unfinished milestone.

### 2026-10-05 — Royal Supper user playtest fixes and pacing revision

**Feedback and changes:** The user tested the expanded blockout and reported butter momentum disappearing after a jump, harmless crumb contact, repeated butter patterns, misleading cover safety, too many repeated hiding sections and an overlong dessert staircase. Butter now reaches 9.2 units/second (ordinary speed 6.8), carries its slippery movement through takeoff until the next landing, and preserves airborne velocity with neutral directional input. Dry landings and respawn clear the slide mode; reversing still brakes. Swept collision exposes actual resolved contacts, so crumb side/top/underside contact retries from the section checkpoint with explicit feedback, even when resolution prevents final overlap.

The butter section is reduced from about 105 to 65 units: three irregular patches with six crumbs of differing sizes, heights and spacing. Mandatory fork/fan geometry and grape timings remain intact, translated 40 units earlier. The watched passage has three safe dishes and three progressively longer crossings, with cover widths 4.8 / 4.4 / 4.0. Cover silhouettes fill their protection volumes; inset blue floor strips mark safe foot-centre positions, turning green with HIDDEN. Numeric tolerance protects exact boundaries while genuine exposure/jumping out still causes recovery. Three diner heads sit above the corresponding covers. The fourteen-rise dessert staircase is replaced by two jelly launches, cake rises, a flat shelf, a drop and a short final ascent. Pear is now at x435/y15.6; stable checkpoint and campaign IDs remain unchanged. No intermediate checkpoints were added.

**Verification:** Node v22.14.0 / npm v10.9.2 rechecked. Typecheck, build and all 35 focused tests pass, including neutral-input butter takeoff/landing, dry-ground/respawn cleanup, crumb contact on three faces, nearest swept contact, protection at both edges of all three covers throughout LOOK, exposed detection, mandatory-gate bypass checks and a full real-controls model route. Production build retains the existing nonfatal >500 kB Three.js chunk warning. Whitespace validation passes with Windows CR-at-EOL handling.

All seven distinct Chromium scenarios pass across the six successful production/museum/movement-lane scenarios and the corrected isolated-route rerun. Production collection → return → wrong/correct click placement → reload → full replay → reset passed, alongside drag/Tab-Enter placement, malformed/denied/full storage, settings, museum input/bounds/pointer lock and isolated jump controls. The isolated rerun passed intentional early flame recovery, fully hidden LOOK, jumping above cover, stationary exposure, frozen body/timers during pause, held-input clearing after natural braking, checkpoint/fork retention, clean restart/replay, repeated scene disposal with one canvas/stable resources and untouched campaign-save sentinel. No browser exceptions or failed production responses occurred. The initial isolated assertion wrongly expected pause input clearing to erase existing velocity immediately; the corrected check lets normal braking settle and then verifies no renewed motion. Earlier timing-script attempts retried faster-butter/grape sections; the final isolated traversal/replay and both production traversals had no incidental retries. Real controls are used throughout, with no teleports or progression setters. The rendered green cover strip/HIDDEN during LOOK, dessert approach and collection were inspected; revision screenshots are retained at docs/validation/royal-supper-cover-revision.png and royal-supper-dessert-revision.png.

**Pacing / next task:** The fixed-step known-route traversal is 98.48 seconds; the first revised production browser traversal took about 100.7 seconds with zero retries, versus roughly 167 seconds before this revision. These are optimized scripted runs, not human timings or a difficulty approval. Review the revised butter/cover/finale in a human playthrough, especially stopping distance, safe-strip readability and the second jelly landing. The original 5–7 minute target is provisional; do not add repeated content to stretch it. DECISIONS.md, REQUIREMENTS.md, ROYAL_SUPPER.md and README.md describe the revision and manual checks. All previous uncommitted work is preserved. No art generation, credit spending, audio, mountain, publishing, commit or push occurred; M3 remains incomplete pending revised-layout review, reference approval and art/audio work.

### 2026-10-05 — Separated trident candle passage

**User feedback / implementation:** The user accepted the rest of the revised minigame and requested spaces between the three trident candles so the player jumps to the next one. Candle tops at x296 / 302 / 308 are now 3 units wide, with 3-unit gaps and a 4-unit gap to the exit. Removed the continuous underlying candle-run floor. A common brass foot, central stem and three arms support separate wax tops; the holder is decorative below the route. Raised the canopy underside to y7 so ordinary held jumps fit; heat fills the clearance above lit tops and deep column collision prevents an underneath bypass. The top of the canopy remains unreachable. Retuned sequential ember windows to 2.0 / 3.1 / 4.2 seconds, each lasting 2 seconds in the existing 11-second cycle. Checkpoint policy, IDs and campaign contracts remain intact. Updated DECISIONS.md, REQUIREMENTS.md, ROYAL_SUPPER.md and manual checks.

**Verification:** Node 22.14.0 / npm 10.9.2 rechecked. All 36 focused tests pass, including real-controls traversal through the new jumps, walking into a gap causing fall recovery without a hidden floor, sequential relighting/burn recovery and existing lit-canopy bypass sweeps. Typecheck/build pass with the existing nonfatal Three.js chunk-size warning; whitespace check passes. Both targeted Chromium regressions pass (7.4 minutes): isolated traversal/recovery/cover/pause/replay/disposal/save isolation, and production collection/return/restoration/reload/full replay/reset. All four final browser traversals completed with no incidental retries; deliberate early flame contact still recovers correctly. No browser exceptions or failed production responses occurred. The rendered trident/spacing was inspected from the fan observation capture, retained at docs/validation/royal-supper-trident-revision.png. Fixed-step known-route time is now 99.92 seconds, with the candle stage at 7.07 seconds; production traversal/replay including fan observation were about 102.2 seconds each. These are scripted timing measurements, not human difficulty approval.

**Next task:** User review of the final candle jumps, then separate reference approval and DreamLayer access/cost recheck before geometry-specific production art. The user accepted the other gameplay revisions; do not reopen them or add repeated padding. Production art/audio, mountain and ending remain future milestones. No generation, spending, publishing, commit or push occurred in this candle revision.

### 2026-10-05 — Gameplay approved; art/sound handoff

The user confirmed the final trident revision is perfect. Record the Royal Supper gameplay layout as approved and retain its movement, timing, collision and checkpoint configuration during art integration. This approval does not supply a timed first-time duration measurement or approve the separate DreamLayer reference images. Updated the visual review's stale M2 coordinates/camera/snuffer guidance to the current 435-unit route, 13-unit view, 16-unit fork and separated timed candles. Next: review masterpiece.png, banquet-v5.png and player.png for visual-direction approval; recheck DreamLayer access/balance/costs; produce and validate a small player/background/platform art slice, then remaining required props and original/licensed Howler audio. Complete production-loop/rendering verification before the already authorized completed-M3 commit/push. Sleeping Mountain and the ending follow in M4. No generation, credit spending or runtime changes occurred in this approval handoff.

### 2026-10-05 — Session close and repository snapshot

The user explicitly requested committing and pushing the completed session before continuing in a new session. This authorizes the approved gameplay/reference/tooling/documentation snapshot now; it does not mark M3 art/audio complete or authorize generation/publishing. AGENTS.md and the next-session plan now start with visual-reference review rather than repeating approved gameplay review. NEXT_SESSION.md contains the detailed plan and paste-ready prompt. This snapshot includes generated reference provenance and preserved candidates/rejections, development tooling, the expanded approved mechanics, focused/browser tests and selected validation captures. Credentials, dependencies, builds and ephemeral test outputs remain ignored. No new art spending occurs.

Final session-close checks: all 36 focused tests and typecheck/build pass; all three development scripts pass Node syntax checks. The final runtime bundle matches the build exercised by the two successful trident Chromium regressions recorded above; documentation-only handoff edits did not rerun the long browser suite. The nonfatal >500 kB chunk warning remains. A private scan of 80 commit-candidate/build files found zero occurrences of the local credential values and printed only counts. Git confirms .env, node_modules, dist and test-results are ignored. Whitespace checks pass. origin/main was fetched and matched local HEAD before preparing this snapshot; push status is reported after the actual Git operation.
