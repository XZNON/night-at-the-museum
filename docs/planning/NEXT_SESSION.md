# Next session — Royal Supper review fixes, then release prep

**User review of the cartoon rework, 2026-10-09 (to do in the next session, not this one):**
1. Remove the visible bars on the assets the player lands on: the landing-edge lines on every platform top, and any other code-drawn bar or box that still shows. The art's own top must line up with the collider top.
2. The casserole covers look like they sink into the floor.
3. The ground should look like **the player is running on a table**: tablecloth tabletop as the ground, the cloth hanging down to the bottom of the screen. No plain platter bars and no leftover code-drawn bars or boxes (both).
4. (No item 4: the user's numbering slip.)
5. The yellow line along the floor must go (part of 1).
6. The bread crumbs still show a yellow line (their landing-edge line, part of 1).
7. Grapes come far too late and the player meets only about three waves. They should already be rolling across the whole run when the player arrives, and come continuously in a denser stream ("more grapes, denser stream"; still pairs on the ground, not new height lanes).

Use the paste-ready prompt below. Release prep follows in the session after.

## Paste-ready Royal Supper review-fix prompt (next session)

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer (main). The Royal Supper cartoon rework is implemented,
committed and pushed (the commit after 6026f84); check git status and preserve any newer local changes.
Goal of this session: fix my review of the cartoon Royal Supper, one change at a time, showing me a screenshot of each
before moving on. Then stop for my play-through. The jam deadline is October 12, so keep the scope tight.

Start by reading AGENTS.md, docs/README.md, docs/planning/PLAN.md, docs/planning/NEXT_SESSION.md (the review list at the
top), docs/planning/DECISIONS.md (the "Royal Supper cartoon rework" entry), docs/gameplay/ROYAL_SUPPER.md and
docs/validation/supper-cartoon/README.md. Check the environment (node/npm, dev server 5173, preview 4173; restart the
preview after each build).

Code facts (verify before editing):
- src/scenes/royal-supper.ts buildPlatforms draws each skinned platform plus a landing-edge line:
  this.box(..., top - 0.025, 0.98, p.width, 0.05, 0.03, imageArt.lip); the lip colours are in supperPlatformArt
  (src/assets/supper-props.ts). Also code-drawn: forkLanding (bridge top strip once toppled), a box on each candle
  top (0xffe7bf), the ember timer bar (this.embers, orange), the cyan floor strip inside each cover (coverStrips,
  turns green while hidden), the canopy boxes, and the checkpoint flags.
- Covers: the casserole picture fills each cover rect (c.y = 2.4 is the floor top) at z -0.4, behind the floor
  platters (z 0.95).
- Ground: the long ground runs are 'plate' platforms drawn as a repeated platter strip (crockery 86..99,
  butter-exit 161..169, grape-run 168..260, fork-bank, fork-far-dish 282..296, after-candle-dish 315..374,
  dessert-entry, dessert-shelf, dessert-drop, kings-plate). The route has real pits: the bread section (0..86) is
  floating bread with no ground, gaps between the butter slabs, the fork gap, between the three candles, the dessert
  ascent. deathY is -4. The backdrop's far table edge sits at y 2.1 (supperPropPresentation.backdrop).
- Grapes (src/levels/royal-supper.ts): startX 259 → endX 168, speed 4.2, period 6.5, pairs offsets [0, 1.4],
  approachSeconds 1.3, approachHeight 3.6. RoyalSupperModel.grapes starts the clock when x >= sections[2].start (164);
  the first pair spawns at the chute (259) and needs about 21 s to reach the entry, so the player meets about three
  waves. The scene sizes its grape mesh pool from these values.

Do, in order:
1. Landing bars and lines (items 1, 5, 6): remove every visible landing-edge line, the fork-landing strip and the
   candle-top boxes. The art's top must sit exactly on each collider top: adjust the cutouts' crops in
   scripts/prepare-supper-cartoon.py (or the scene placement) so no transparent margin or outline offset leaves the
   player floating or sunk; check bread, crumbs, butter, cake, jelly, platters, the fork bridge and the candle tops
   at 1280x720 and 960x540. Replace the code cues that are bars with art-native cues and keep them readable:
   the ember timer (for example the wick's glow or smoke fading, plus a flicker just before relight) and the cover
   hiding cue (for example the casserole glows or the player dims while HIDDEN). Update the section hints that
   mention "blue strip" or embers to match.
2. Covers (item 2): the casserole must sit on the surface, not sink into it (z order and base line).
3. The table (item 3): make the ground read as the tabletop with the tablecloth hanging to the bottom of the screen.
   Collision and pits stay exactly as they are, so a pit must still look like a pit: one table segment under each
   ground collider (cloth top at the collider top, cloth hanging down past the view's bottom, cloth ends folding
   down at the segment edges), dark gaps between segments. Floor dishes and food stand on the cloth. For the
   floating bread section and the dessert ascent, show me a mock first and ask how the floating pieces should read.
   Prefer cutting the cloth from the existing backdrop's tablecloth (0 credits); if a new DreamLayer tablecloth
   sheet is needed, ask me first and check the balance (last 44 credits).
4. Grapes (item 7, a gameplay change I asked for): the grape run is already full of rolling grapes when the player
   reaches it, with a continuous, denser stream (shorter period; still pairs on the ground). Keep it fair: no grape
   on or about to hit the after-butter checkpoint spawn (163) or the entry, a readable first approach, the raised
   grape dishes still useful, retries reset to the same readable phase, pause/blur still freezes it. Tune with the
   route recorder (tests/route-plan.ts must still find a route), update tests/royal-supper.test.ts expectations,
   the grape rules in docs/gameplay/ROYAL_SUPPER.md and DECISIONS. Show me the tuning before finalising.

Rules:
- Collision, landing heights, other timings, level data outside the grapes, saves and save IDs stay unchanged.
- Presentation goes through the scene's resources set; respect reduced motion; no new dependencies.
- No DreamLayer generation without my OK and a balance check.
- After the changes run typecheck, build and unit tests (--testTimeout=30000), then the browser specs art.spec.ts,
  audio.spec.ts, movement-lane.spec.ts, campaign.spec.ts and supper-cartoon.spec.ts with
  EVIDENCE_DIR=docs/validation/supper-cartoon/review-fixes (convert captures to webp). Bot retries/flakes: rerun once
  and report honestly. blockout.spec.ts is stale since the v1 menus (it looks for "Low rendering quality"); update it
  to the current pause/Settings menus if time allows, otherwise leave it for release prep and say so.
- Restore docs/validation/sketch-s4/s4b/unit-measurements.json if a unit run changes it.
- Update PLAN, NEXT_SESSION, DECISIONS, AGENTS and the supper-cartoon evidence README. Commit or push only when I ask.
  No sub-agents unless I ask.
```

**Latest, 2026-10-09: Royal Supper cartoon rework implemented and reviewed; committed and pushed on the user's request.** The user moved it ahead of release prep and chose: match the Sketch's cartoon style; everything visible; code animation plus drawn diner frames; DreamLayer sheets cut locally. Pilot (backdrop, food, diner) approved by the user, then the rest: 10 credits in all (54 → 44). Cartoon banquet hall, food, tableware, candles, fan, flags, a velvet candle canopy, a plum casserole cover (teal blended with the heroine), and a giant diner seated behind the far table with eating / turning / looking frames; a second banquet edit hangs in the museum. Gameplay, collision, level data and saves unchanged. See the [evidence](../validation/supper-cartoon/README.md), DECISIONS and `scripts/prepare-supper-cartoon.py`. Play: [Royal Supper study](http://127.0.0.1:5173/?scene=royal-supper) or the campaign. The user reviewed it (list at the top); next: the review-fix prompt above, then release prep with the prompt below (rerun `art.spec.ts` and `supper-cartoon.spec.ts` with the release specs).

**Later sessions (user, 2026-10-09; each on its own request):**
- **Story stills and dialogue at the start and the end.** A few illustrated stills with short dialogue that explain the story when a new game starts (why the masterpiece is damaged, the curator's task) and close it after the restoration (around the ending). Content, number of stills, art source (DreamLayer generation needs the user's OK and a balance check; last 44 credits), skippability and replay behaviour are to be agreed with the user first. Saves and gameplay unchanged unless asked.

**Latest, 2026-10-09: museum polish done and regression-checked; committed and pushed on the user's request (`c97e303`).** Gilded frames, wainscot and plank floor, velvet runner, brass lamps, next-frame shimmer, footsteps and room tone, interpolated museum walking, and the user's masterpiece-first opening (Royal Supper greyed out and locked until the masterpiece has been opened once; never stored). See the [museum polish evidence](../validation/museum-polish/README.md) and DECISIONS. Next is release prep: use the paste-ready release prep prompt below. Note for it: new-game browser flows must open and close the masterpiece before entering Royal Supper.

**Latest, 2026-10-08: v1 polish done and regression-checked; committed and pushed on the user's request.** See the PLAN log and the [v1 polish evidence](../validation/v1-polish/README.md). The user chose **the museum polish pass next**. Candidate ideas, to agree with the user first:
- real gilded frames with depth;
- a brass lamp over each frame that lights once that adventure is open;
- wainscot panelling, a dado rail and skirting;
- wood plank variation and a carpet runner with a gold border;
- rope stanchions, a bench and entrance doors;
- small ceiling lights;
- brass plaques in the new font;
- a shimmer on the next frame to visit;
- procedural footsteps and room tone.

Code-built first. Any DreamLayer texture needs the user's OK and a balance check (last recorded: 54). Then release prep: production build, preview smoke test of the full campaign, itch.io zip of `dist/` and submission text (add a favicon; the browser currently gets a 404). No upload, publish or submit. Verify the live jam cutoff (October 12 per the invitation). Royal Supper's art rework stays deferred.

Running the browser specs: restart the preview after each build. The Supper butter and Sketch route bots are timing-sensitive and flaky under machine load (see the evidence). Point `EVIDENCE_DIR` at a new folder so the accepted S5B/S5C/art evidence stays untouched.

## Paste-ready museum polish prompt (next session)

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer (main; last pushed commit is the v1 polish handoff, after 876c164).
Goal of this session: polish the 3D museum before submitting v1 to the DreamLayer jam. The room is still mostly plain boxes.

Start by reading AGENTS.md, docs/README.md, docs/planning/PLAN.md, docs/planning/NEXT_SESSION.md and docs/planning/DECISIONS.md
(the "v1 polish" entry at the top) and docs/validation/v1-polish/README.md. Check the git state and the environment
(node/npm, dev server on 5173, preview on 4173; restart the preview after each build).

State to know:
- v1 polish is done and pushed: title screen, clean HUD, new pause menu, restyled restoration screens, UI sounds.
- The museum layout (user, 2026-10-08) is in src/levels/museum.ts:
  - the masterpiece is centred on the back wall (x 0, z −5.82, 4.6 × 2.6);
  - the Unfinished Sketch hangs on the left wall and Royal Supper on the right wall (z −1.5, facing into the room);
  - spawn is (0, 4.6) facing the masterpiece; the return poses face their frames.
- src/scenes/museum.ts builds the room from simple boxes (the box() helper) and canvas plaques (Georgia).
- It also has the restoration ambience: hemisphere/point light, a spotlight and wall halo on the masterpiece, gold motes
  when complete, eased with GLOW_SECONDS and instant under reduced motion.
- Frames are picked by raycasting the painting meshes (userData.artworkId); walls are the only solids;
  interactionRange is 3.5; the Sketch frame stays dimmed and locked until the pear is restored.
- Royal Supper's art rework stays deferred. Don't start it.
- The jam deadline is October 12 per the invitation; verify the live cutoff and time zone before submitting anything.

How to work this session:
- Ask me which museum ideas I want first. Candidates, all code-built:
  - real gilded frames with depth and moulding;
  - a small brass lamp over each frame that lights once that adventure is open (signposts the next objective);
  - wainscot panelling, a dado rail and skirting; plank variation on the floor;
  - a carpet runner with a gold border to the masterpiece;
  - velvet rope stanchions in front of the masterpiece, a bench, entrance doors behind the spawn;
  - small ceiling lights instead of one lamp;
  - brass plaques in the game's Fredoka font;
  - a soft shimmer on the frame to visit next;
  - procedural footsteps and room tone.
- Do them one at a time and show me each (screenshot or a link to try) before moving on.
- Keep gameplay, saves and save IDs, artwork IDs, frame positions, the interaction/raycast contract,
  return poses and the restoration ambience unchanged unless I ask. Props must not block walking to any frame
  or the reticle ray to a painting. Keep the room readable (not too dark).
- Keep draw calls and textures modest. Put every new geometry, material and texture through the scene's resources set
  so they are disposed. Respect reduced motion.
- Sounds stay original and procedural. Don't rerun make-audio.py, make-sketch-music.py or make-ui-audio.py
  in a way that changes existing files I haven't asked to change. Record new audio in asset-sources/audio-manifest.json.
- No DreamLayer generation without my explicit OK and a balance check (last recorded balance: 54 credits).
- After changes, run typecheck, build and unit tests (--testTimeout=30000; tests/campaign-sketch.test.ts checks the layout).
  Then run the browser specs that walk the museum: campaign.spec.ts, sketch-campaign.spec.ts, sketch-ending.spec.ts,
  and sketch-art.spec.ts for the museum frame case.
  - Point EVIDENCE_DIR at a new folder (for example docs/validation/museum-polish/regression/<spec>) so the accepted
    S5B/S5C/art evidence is not rewritten.
  - The Royal Supper butter and Sketch route bots are timing-sensitive and flaky under machine load; rerun a failed bot case
    once and report reruns honestly.
  - Unit runs can touch docs/validation/sketch-s4/s4b/unit-measurements.json; restore it if it changes.
- When the museum is done, prepare the release:
  - production build and a production-preview smoke test of the full campaign;
  - a favicon (it currently 404s);
  - an itch.io-ready zip of dist/ plus short submission text and a short DreamLayer asset/process note.
  Don't upload, publish or submit anything; I'll do that.
- Keep PLAN.md, NEXT_SESSION.md and AGENTS.md up to date. Commit or push only when I ask. No sub-agents unless I ask.
```

## Paste-ready release prep prompt (the session after the Supper review fixes)

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer (main; check the latest commit after the Supper review fixes).
Goal of this session: prepare v1 for the DreamLayer jam submission. No new features.

Start by reading AGENTS.md, docs/README.md, docs/planning/PLAN.md, docs/planning/NEXT_SESSION.md,
docs/planning/DECISIONS.md and docs/planning/REQUIREMENTS.md (the release acceptance criteria), plus the latest
validation READMEs (docs/validation/v1-polish and the museum polish evidence). Check the git state and the environment
(node/npm, dev server on 5173, preview on 4173; restart the preview after each build).

State to know:
- The full game works: New Game → Royal Supper → golden pear → Unfinished Sketch → enchanted light → ending.
- v1 polish (title screen, clean HUD, menus, restoration screens, UI sounds) and the museum polish are done.
- Royal Supper's cartoon rework and its review fixes are done (docs/validation/supper-cartoon).
- The plan lists the deadline as October 12. Ask me for the live jam cutoff and time zone and record them in PLAN.

Do, in order, showing me results as you go:
1. Small release fixes only:
   - add a favicon (it currently 404s);
   - set the page title and meta description;
   - make sure the production build has no failed requests, console errors, dev-only UI or debug hooks;
   - check that relative asset paths work from a subfolder, as itch.io serves them.
2. Production build. Run typecheck, unit tests (--testTimeout=30000) and the release-relevant browser specs:
   campaign.spec.ts, audio.spec.ts, art.spec.ts, supper-cartoon.spec.ts, sketch-campaign.spec.ts, sketch-ending.spec.ts
   and sketch-art.spec.ts.
   - Point EVIDENCE_DIR at docs/validation/release-v1/regression/<spec>.
   - Rerun a failed bot case once and report reruns honestly.
   - Restore docs/validation/sketch-s4/s4b/unit-measurements.json if a unit run changes it.
3. A production-preview smoke test of the full campaign with real controls at 1280×720 and 960×540,
   with saves, reload, reset and the ending.
   - Test the game inside an iframe page that mimics itch.io's embed (focus, pointer lock, fullscreen button, resizing).
   - If I can, I'll also spot-check Firefox/Edge; tell me what to look for.
4. Build an itch.io-ready zip of dist/: index.html at the zip root, relative paths. Report its size and file count;
   it must stay under itch's limits.
   - Put it and its SHA-256 in a release folder that isn't committed, or tell me where it is.
5. Write the submission materials in docs/release/:
   - a short game description (pitch, controls, how long it takes);
   - a DreamLayer asset and process note: which assets came from DreamLayer, which from ImageGen with my
     authorization (retired from the runtime by the cartoon rework), what was prepared locally, and that the audio
     is original procedural synthesis;
     use asset-sources/manifest.json and audio-manifest.json for credits used;
   - a credits/licence list (Three.js, Howler, Fredoka);
   - 3–5 suggested screenshots captured from the production build;
   - a release checklist with what is verified and what isn't (representative-machine performance, other browsers).
6. Update PLAN.md (M5/M6 status), NEXT_SESSION.md and AGENTS.md.

Rules:
- Keep gameplay, saves and save IDs unchanged.
- No DreamLayer generation without my explicit OK and a balance check (last recorded balance: 44 credits).
- Don't upload, publish, submit to the jam or email anyone; I'll do that.
- Commit or push only when I ask. No sub-agents unless I ask.
```

**Current, 2026-10-08: S6 human check recorded; v1 polish session.** The user played the full game New Game → ending. This session works through the user's UI/sound/polish list one change at a time (gameplay, collision, level data, saves unchanged unless asked), then a production build, preview campaign smoke test, itch.io zip of `dist/` and short submission text. No upload/publish/submit; the user does that after verifying the live jam cutoff (October 12 per the invitation). Royal Supper art/animation rework is deferred. No generation without explicit OK and a balance check (last 54).

**Art pass part 2, 2026-10-08 (committed and pushed on the user's request):** generated torch, museum garage painting (lit/taken) and toolbox backdrop (5 credits, balance 54) are integrated: the route sits inside the toolbox with wall-mounted ledges. Before that, **v6 backdrop trial + Sketch music:** the approved v6 toolbox wall is shown as a camera-following stage backdrop (0 credits; balance 59) with clean layer edges, and the Sketch plays a new original rock/metallic loop (`scripts/make-sketch-music.py`); see the [part 1 README](../validation/sketch-art/part1/README.md#v6-backdrop-trial-2026-10-08). Next: the user's verdict, then the backdrop/entrance/torch discussion.

**Current handoff, 2026-10-08 (art pass part 1 implemented):** S5C is committed and pushed (`7c5e06a`). On the user's request the approved Sketch references were cut locally into 27 skins (`scripts/prepare-sketch-skins.py`, 0 credits) and integrated into the Sketch scene, sized from level data with gameplay unchanged; see [part 1 evidence](../validation/sketch-art/part1/README.md) and [SKETCH_ASSETS](../art/SKETCH_ASSETS.md). Committed and pushed on the user's request (2026-10-08); next: discuss the backdrop and remaining art with the user.

Play after `npm run dev`: [full adventure](http://127.0.0.1:5173/?scene=unfinished-sketch&study=adventure) or the campaign from the [normal entry](http://127.0.0.1:5173/).

Review revision (2026-10-08, user): colours made poppy (saturated skins and bands, inked rings), stutter fixed (moving parts interpolated between steps; materials/textures pre-warmed at scene entry), lift frame dropped; the backdrop will change later. Review questions: are the colours poppy enough? Is motion smooth on your display now?

Next, each on its own request: commit/push if authorized; **art pass part 2** with DreamLayer (verify access and balance first; last recorded 59): the final full-size backdrop from the v6 direction and the museum's Sketch entrance picture, optionally a torch reference; **S6** human review/refinement.

**Earlier handoff, 2026-10-07 (S5C implemented; S5 complete at the automated gate):** the game now runs New Game → Royal Supper → golden pear → Unfinished Sketch → enchanted light → complete masterpiece → ending. With the light owned, the masterpiece's inspection offers it as a draggable piece (its art is the painted sun cut locally from `complete.webp`, 0 credits); drag, click-then-"Sky" or Tab/Enter places it; the save is written at once, the picture turns complete in the inspection and the museum frame with a warm glow, and the ending opens (Stay in the museum / New game through the reset confirmation; Escape = Stay). Afterwards the objective, menu note and inspection (See the ending) read complete, the Sketch frame shows an empty torch, and Supper/Sketch replays add nothing. Unit 238/238 (`--testTimeout=30000`), build; S5C browser 5/5 including one dev full campaign with real controls; regressions campaign 5/5, S5B and S5A each with one known Sketch-route bot flake that passed on rerun. [S5C evidence](../validation/sketch-s5/s5c/README.md). All S5C changes are uncommitted over `31ad72e`; stop for user review. No commit/push, generation, dependencies, publishing or sub-agents are authorized.

Play after `npm run dev`: [normal entry](http://127.0.0.1:5173/) — the whole game, or seed a light-owned save (snippet in the evidence) and inspect the masterpiece.

Review questions: is the 1.7 s restore moment before the ending long enough to see the sun arrive? Ending wording and buttons ("Stay in the museum" / "New game (reset progress)")? The empty-torch pencil wisp on the placeholder Sketch frame? The restored sky keeps a faint ring over the sun.

Next after acceptance (each on its own request): (S5C committed and pushed on the user's request, 2026-10-08; the user chose the game art next) **S6** human review/refinement and the complete gameplay/campaign/lifecycle regression (no new mechanic family); the **Sketch DreamLayer art pass** (verify access/credits first); then M5 museum presentation and M6 polish/opening.

## S5C request handoff (executed)

**Earlier handoff, 2026-10-07 (S5B implemented):** the Unfinished Sketch is the campaign's second adventure, at its playable review gate. Its frame hangs on the museum's left wall, locked ("Restore the golden pear first") until the pear is restored; open, it enters the S5A full route in campaign mode; claiming the enchanted light collects `sun-disc` once, persists it and offers Return to Museum (in front of the Sketch frame) or Keep exploring; same-session re-entry resumes the Sketch checkpoint, a reload restarts it at Layer 1, a replay claim says "already yours". Objectives and inventory ("Enchanted light", CSS glow icon) follow; Mountain is gone from code and UI; save identities unchanged. Typecheck, build, unit 229/229 (default timeout), S5B browser 5/5 on the first run; regressions `campaign.spec.ts` and the S5A spec pass after rerunning two bot flakes (Supper butter retries; S5A reduced-motion glue retries), see the [S5B evidence](../validation/sketch-s5/s5b/README.md). Stop for user review. Committed and pushed to origin/main on the user's request. Next: S5C on its own request with the prompt below. No generation, dependencies, publishing or sub-agents are authorized.

Review questions: the code-drawn frame placeholder (it keeps the torch lit after the claim); the Slice 1 hotkey fix (digit keys could reach the dev playground from the campaign; now dev-entry only).

## Paste-ready S5C prompt

Plan: [SKETCH_S5C_PLAN.md](../gameplay/SKETCH_S5C_PLAN.md) (written 2026-10-07 on the user's request; planning only, no S5C code).

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer. Implement Unfinished Sketch S5C only: the enchanted light placed in the masterpiece's sky as its sun, the complete picture and the ending. Read AGENTS.md, docs/README.md, PLAN/NEXT_SESSION, DECISIONS/REQUIREMENTS, docs/gameplay/SKETCH_S5C_PLAN.md (all of it; its section 1 lists the verified code facts and section 2 the defaults) and the S5B evidence (docs/validation/sketch-s5/s5b/README.md). Recheck checkout/HEAD (expected 31ad72e or newer), origin, Node/npm and dev-server ownership (restart a stale preview after building).

Keep the save identities (sun-disc, dawn-sky, the save key and schema); players know the piece as the enchanted light. Prepare the light's piece art locally from complete.webp + sun-mask.png with a soft halo (new small script, public/assets/restoration/light.png, runtime ID restoration.light, recorded in asset-sources/manifest.json, 0 credits; do not rerun prepare-art.py; no generation) and use it in the museum inventory and the inspection instead of the CSS glow. Add masterpiece.complete and restoration.light to the runtime manifest and museum art set; the museum frame and inspection show damaged / pear-restored / complete from the restored count. The light piece and the sky target behave like the pear's (drag, click-then-target, Tab/Enter; wrong drops keep the piece; clear messages before owning the light or restoring the pear). Generalize place() to the next stage's piece through progression restore (extract and unit-test a small pure helper), persist before animating, reuse the restore cue and the restoring animation with a short warm glow (none under reduced motion), then show the ending overlay (Stay in the museum / New game through the existing reset confirmation; Keep progress returns to the ending). Completion is derived from progression, never stored. After completion: objective "The Garden Before Dawn is complete", inspection shows the full picture with See the ending, the Sketch frame shows an empty torch, no "later update" text remains, Supper and the Sketch stay replayable with "already yours" (fix the Supper success note for an owned/restored pear).

Run typecheck, all unit tests (use --testTimeout=30000 only if the S4B grip-window test exceeds 5 s again, and say so) and build. Browser: production with seeded saves (place by drag, click and keyboard; wrong drops; reload shows complete; reload right after placement keeps it; Keep progress / Confirm reset from the ending; denied storage) and one dev-entry full campaign with real controls from New Game through Royal Supper, pear placement, the Sketch (S5A/S5B helpers) and light placement to the ending at 1280x720, then a Sketch replay with no save change and New game to a fresh museum; plus a 960x540 spot check of keyboard placement and the ending. Rerun campaign.spec.ts, sketch-campaign.spec.ts and sketch-adventure.spec.ts (update expectations the plan changes; move S5A outputs out of s5a/ and restore its accepted files); restore accepted evidence JSON rewritten by unit runs. Do not edit src during a browser run. Record bot retries/flakes honestly. Save evidence in docs/validation/sketch-s5/s5c, update PLAN/NEXT_SESSION/DECISIONS/REQUIREMENTS/AGENTS/docs index, mark S5 complete only if the full gate passes, and stop for my review. No new traversal, museum rebuild, opening, art generation, new audio, new dependencies, commits/pushes, publishing or sub-agents.
```

## S5B request handoff (executed)

**Earlier handoff, 2026-10-07 (S5A done; next S5B):** S5A is committed (`9ce56f9`) with the user's reward revision (`32bb7ad`): the Sketch reward is an **enchanted light in a torch** on the end ledge, claimed by touching it (in mid-air too). The user decided it **acts as the sun** in the campaign: it is the stage-2 piece (`sun-disc`, unchanged save IDs) and later lights up the masterpiece's sky. The art reference pass and the woman restorer player are committed (`8e1d9fb`). **Push check:** `32bb7ad` was committed but GitHub returned Internal Server Error three times; a later local commit (`b8df40e`, heroine poses in the Sketch) is also unpushed; if `git status -sb` shows `ahead`, push before starting.

Next: **S5B** — the Sketch frame in the museum (locked until the pear is restored), campaign claim of the light with persistence and return, Mountain removed. Plan: [S5 plan](../gameplay/SKETCH_S5_PLAN.md) (revision note + S5B). Then S5C (placing the light/sun in the masterpiece and the ending).

Known: the accepted S4B unit test "measures the M1 grip windows…" exceeds the 5 s default on this machine (also on HEAD); run the suite with `--testTimeout=30000`. The S4C/S4D reduced-motion browser bots were flaky on 2026-10-07 (also on HEAD).

## Paste-ready S5B prompt

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer. Implement Unfinished Sketch S5B only: the Sketch as the campaign's second adventure. Read AGENTS.md, docs/README.md, PLAN/NEXT_SESSION, DECISIONS/REQUIREMENTS, docs/gameplay/SKETCH_S5_PLAN.md (revision note, sections 1-3 and S5B) and the S5A evidence including its enchanted-light revision (docs/validation/sketch-s5/s5a/README.md). Recheck checkout/HEAD (expected 32bb7ad or newer; push it first if origin/main is still behind), origin, Node/npm and dev-server ownership. The Sketch art reference pass and the woman restorer player are committed (8e1d9fb); do not regenerate or replace them.

Reward (user, 2026-10-07): the Sketch's reward is the enchanted light held in a torch on the end ledge (study=adventure, route.light, onLightClaimed). In the campaign it acts as the sun: it is the stage-2 piece and later lights up the masterpiece's sky. Keep the save identities unchanged (garden-before-dawn, golden-pear, sun-disc, pear-tree, dawn-sky, the save key and schema); only player-facing names say "enchanted light". Claiming it in mid-air stays as is.

Rename campaign stage 2 from sleeping-mountain to unfinished-sketch (artwork and scene IDs); remove every Mountain text/door from code and UI. Add the Sketch frame on the museum's left wall with a code-drawn cartoon placeholder picture, locked until the pear is restored (no scene ever opens while locked; prompt "Restore the golden pear first"). When open, it enters the sketchAdventure preset in campaign mode: claiming the light applies progression collect for sun-disc once and persists; the success screen offers Return to Museum (landing in front of the Sketch frame) or Keep exploring. Same-session leave/re-entry resumes the Sketch checkpoint (keyed apart from dev studies); reload restarts it at Layer 1 with campaign pieces intact; replay after the claim awards nothing new ("already yours"). Update museum objectives (pear missing / pear owned / pear restored -> "Claim the enchanted light in the Unfinished Sketch" / light owned -> "Bring the light to the masterpiece") and the inventory (an "Enchanted light" entry with a local placeholder icon, e.g. a crop of complete.webp + sun-mask.png or a code/CSS glow; no generation). Placement in the masterpiece and the ending are S5C.

Run typecheck, all unit tests (use --testTimeout=30000 if the accepted S4B grip-window test exceeds 5 s again, and say so) and build. Unit-test the renamed stage with pear-only, pear-restored and light-owned saves. Browser: dev campaign entry with seeded saves and real controls (locked frame, open after pear restore, full route to the light reusing the S5A helpers, persisted sun-disc, return pose, re-entry, reload during the Sketch, replay without duplicates, denied storage, transition spam); production checks with seeded saves (frame state, objective, inventory, study= ignored). Rerun campaign.spec.ts and the S5A spec; restore accepted evidence JSON rewritten by unit runs. Do not edit src during a browser run. Record bot retries/flakes honestly (the S4C/S4D reduced-motion bot crossings were flaky on 2026-10-07, also on HEAD). Save evidence in docs/validation/sketch-s5/s5b, update PLAN/NEXT_SESSION/status docs and stop for my review. No placement/ending, art generation, new dependencies, commits/pushes, publishing or sub-agents.
```

**Earlier handoff, 2026-10-07 (S5A committed; reward revised):** S5A was committed and pushed at `9ce56f9` on the user's request (the art reference pass was committed separately at `8e1d9fb`). The user then changed the reward to an **enchanted light held in a torch** that the player claims; it is implemented in `study=adventure` with unchanged contracts and was committed and pushed on the user's request. Stop for review. Before S5B, settle how the light restores the masterpiece (proposed: placed into the dark sky it becomes the dawn sun; save/piece IDs unchanged). Review question: with the taller claim rect, the bot usually claims the light in the air from the last swing; keep that? [Revision evidence](../validation/sketch-s5/s5a/README.md#review-revision-the-enchanted-light).

**Earlier handoff, 2026-10-07 (S5A implemented):** S5A is at its playable review gate. The user played `study=adventure` this session and completed it. Stop for user review; S5B (Sketch frame in the museum, campaign sun collection, return) needs its own request with the [S5B prompt](../gameplay/SKETCH_S5_PROMPTS.md). All S5A changes are uncommitted over `715770d`; commit/push only if the user authorizes it. No generation, dependencies, museum/campaign changes, publishing or sub-agents are authorized.

Play after `npm run dev`: [The sun](http://127.0.0.1:5173/?scene=unfinished-sketch&study=adventure). The full S4D route, then the end ledge is a safe checkpoint; walk right to the sun (or fly through it from a strong release). Taking it settles every mechanism and shows the success screen (Return to the study menu / Keep exploring); R, falls and re-entry afterwards keep the ledge with the sun taken. [S5A evidence](../validation/sketch-s5/s5a/README.md) has the contracts, run history and results.

Implemented: `SketchSun`/`route.sun`, study `adventure` (`sketchAdventure`, legs cloned from `layers-1-3`), model `settled`/`sunCollected`/`consumeSunTouch()`, scene `onSunCollected` callback and faceless placeholder sun, `GameUi.sketchSuccess()`, menu/eyebrow/tag/pause wiring, optional `done` predicate on the shared crossing helpers. Tests: `tests/sketch-adventure.test.ts` 10/10; `tests/browser/sketch-adventure.spec.ts` 4/4 (run 3). Regressions: S4D 3/4, S4C 5/7 (1280 passed on rerun). Known: one accepted S4B unit test exceeds the 5 s default on this machine (also on HEAD); the S4C/S4D reduced-motion bot runs fail on crossing/climb timing today, also on unchanged HEAD for S4C, so they are bot flakes, not S5A defects.

Review questions: the sun can be taken in mid-air when a release coasts through it (Layer 3 air momentum); keep that, or move the sun so the player always lands first? Is the settle (everything freezes in place) enough of a "picture settles" cue for now? The success screen's Return goes to the study menu here; in S5B it becomes Return to Museum.

Next after acceptance: [S5B prompt](../gameplay/SKETCH_S5_PROMPTS.md) with the [S5 plan](../gameplay/SKETCH_S5_PLAN.md) (S5B section), reusing `sketchAdventure`, its `onSunCollected` callback and the S5A browser helpers.

## S5A request handoff (executed)

**User decision, 2026-10-07:** the user played S4D; it is committed and pushed (`715770d`). Layer 3 gets **no third section**: the moving-socket finale is dropped and all sections and layers are done. S5 is now only the sun (default: collected on the swing crossing's end ledge) and the campaign ending (Sketch museum frame replacing Mountain, return, sun placement, two-stage ending). S5 is planned (2026-10-07, planning only) as three separately requested blocks in the [S5 plan](../gameplay/SKETCH_S5_PLAN.md): **S5A** sun on the end ledge (save-isolated `study=adventure`), **S5B** the Sketch frame in the museum (locked until the pear is restored) with campaign sun collection and return, **S5C** sun placement, the complete masterpiece and the ending. Next: paste the [S5A prompt](../gameplay/SKETCH_S5_PROMPTS.md#s5a--the-sun-on-the-end-ledge) in a new session. No S5 code exists. Planning defaults (sun position, frame wall, locked frame, settle by freezing, ending buttons) are listed in the plan's section 2 for the user to override at any gate.

**Current handoff, 2026-10-07 (S4D implemented):** S4D is at its playable review gate and S4's automated gate has passed. Stop for user review; S5 (sun, campaign/ending; no finale section) needs its own request and plan/prompt. All S4D changes are uncommitted over the accepted S4L checkpoint `d0856d1`; commit/push only if the user authorizes it. No generation, dependencies, publishing or sub-agents are authorized.

Play after `npm run dev`: [Layers 1–3](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-3). Route: Layer 1 pendulums (A, B; Q for C; Q for D) → step onto the lift → Layer 2 boards/axes leftward (A, B; Q for C) → walk onto the second lift → on arrival walk right over the third-nail pickup and climb the six walls → the ledge takes the third nail back → nail strip F, bars M1/M2 and swing onto the end ledge. Each section retries at its own entrance; Restart Layers 1–3 returns to the Layer 1 start. [S4D evidence](../validation/sketch-s4/s4d/README.md) has the data-keyed fixes, recovery table, results and captures.

Implemented: `sketchLayersOneToThree` (`layers-1-3`) composing the accepted `layer-3` field with cloned legs (`layer-2` → `l3-walls` on the second lift); optional `leg.arrivalCue`; hazard/arrival/endpoint texts and Layer 3 restore/HUD rules keyed on data, older studies unchanged; wall letters keyed on leg targets; menu/eyebrow/tag/pause; compact HUD on Layer 3 via `data-layer`. Tests: 214/214 unit (13 new), build; `tests/browser/sketch-layer3-full.spec.ts` 4/4 in runs 1 and 3 (run 2 lost the 960 case to a real OS focus pause; test fixed); regressions S3 14/14, S4C 7/7, S4A 8/8, S4B 8/8, S1 12/12, S4L 8/8, S2 12/12 + 1/1. Shared browser helpers: `tests/browser/sketch-layer2-controls.ts`, `tests/browser/sketch-layer3-controls.ts`.

Review questions: does the full run (about 1.5 min for the bot, longer for a person) feel like one picture, and is the arrival cue enough to send you right over the pickup? Other sections' nail rings are hidden in this study (outlines stay visible as context), unlike `layers-1-2` where they show small; keep that? A fall during Layer 1/2 retries only that layer; a Layer 3 fall restarts the climb (not Layer 2). Anything to tune before S5 should go back to its owning block (no silent retune here).

Next after acceptance: plan S5 (sun and campaign/museum entry and ending; no finale section, per the user decision above) on its own request.

## S4D request handoff (executed)


**S4L accepted, 2026-10-07:** the user accepted S4L and authorized committing/pushing this checkpoint to origin/main. Next is **S4D** on its own request: paste the [S4D prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4d--full-route-through-s4) and read the [S4D plan](../gameplay/SKETCH_S4D_PLAN.md) (its S4L note lists the delivered lift facts).

**Current handoff, 2026-10-07 (S4L implemented):** S4L is at its playable review gate. Stop for user review; S4D (Layers 1–3, the final S4 gate) needs its own request with the [S4D prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4d--full-route-through-s4) and [plan](../gameplay/SKETCH_S4D_PLAN.md) (its note lists the delivered lift facts). All S4L changes are uncommitted over `98a213c`; commit/push only if the user authorizes it. No generation, dependencies, publishing or sub-agents are authorized.

Play after `npm run dev`: [Layer 1 → lift](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1), [Layer 2 → walkway → lift](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2), [both lifts](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2). Clear the layer, walk onto the deck (no E), ride (walk/jump freely; you cannot leave), step off right. [S4L evidence](../validation/sketch-s4/s4l/README.md) has geometry, timings, results and captures.

Implemented: `SketchLift` on `leg.lift` (`l1-lift` x63..66.5 under an opening in the Layer 2 landing; `l2-lift` x-2.6..0 at the end of a plain walkway x0..23, rising beside `l3-arrival`), 0.4 s wind-up, 7u invisible cab walls, refused nail commands, one in-place arrival commit, parked decks (`route.parkedLifts` in the Layer 2/3 studies), recovery to the departure exit on R/fall/snapshot/re-entry/actual blur, Escape freeze, debug `lifts`/`onDeck`/`ride`. Accepted challenge data and unit measurements unchanged (byte-identical to HEAD). Tests: 201/201 unit; browser S4L 8/8, S3 14/14, S2 13/13 after a test-timing fix, S1 12/12, S4A 8/8, S4B 8/8, S4C 7/7.

Review questions: is stepping off to trigger the endpoint readable (arrival commits in place, the Layer 1/Layer 2 study endpoints fire on the landing ground)? Should an actual blur mid-ride send you back to the exit (current, per plan) or only freeze like Escape? Are the placeholder shaft/deck/cab cues clear? The Layer 2 walkway is 27u of plain walking to the second lift.

## S4L request handoff (executed)


**Order change, 2026-10-07 (user):** every layer transition becomes a vertical lift built into the exit ground: step onto the deck and it rises (no E); invisible walls keep the player on it while it rides; it goes straight up onto the next layer's ground. Next is **S4L** on its own request: paste the [S4L prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4l--vertical-lifts) and read the [S4L plan](../gameplay/SKETCH_S4L_PLAN.md). S4D (Layers 1–3, final S4 gate) follows after S4L review, using its revised prompt. Planning only; no lift code exists yet.


**S4C accepted, 2026-10-07:** the user accepted S4C after the Layer 3 air-momentum fix and authorized committing/pushing this checkpoint to origin/main. Next is S4D (Layers 1/2 joined to this Layer 3, the final S4 gate) on its own request: paste the [S4D prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4d--full-route-through-s4) and read the [S4D plan](../gameplay/SKETCH_S4D_PLAN.md) first (revised for the delivered S4A–C facts after this checkpoint). No S4D code exists yet.

## S4C review handoff (accepted)


**Review fix, 2026-10-07 (Layer 3 air momentum):** the user reported that letting go of A/D in a jump dropped the player. On their choice, Layer 3 only (climb and crossing, joined and isolated) now keeps the jump's horizontal momentum when let go; Layers 1/2, S1 and Supper are unchanged. F's kick now lands straight on the ledge. 182/182 unit tests; browser joined 7/7, S4A 8/8, S4B 8/8, S1 12/12, S3 14/14 after one rerun. Details in the [S4C evidence](../validation/sketch-s4/s4c/README.md). Still at the S4C review gate.

**Current handoff, 2026-10-07 (S4C implemented):** S4C is at its playable review gate. Stop for user review; S4D (joining Layers 1/2 to this Layer 3, the final S4 gate) needs its own request. All S4C changes are uncommitted over the pushed S4B checkpoint `68e7785`; commit/push only if the user authorizes it. No generation, dependencies, publishing or sub-agents are authorized. S4 is not complete.

Play [joined Layer 3](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3) after `npm run dev`. [S4C evidence](../validation/sketch-s4/s4c/README.md) has the handoff observations, retry ownership table, unit/browser results, captures and regressions. Route: pick up the third nail and climb the six walls as in S4A; the grounded landing on the high ledge takes the third nail back and starts the swing crossing in place (two nails, free placement), as in S4B; land on the end ledge for the S4C endpoint. During the crossing, glue/fall/`R`/re-entry return to the swing start (17.2, 49.5) with the climb kept; Restart Layer 3 returns to the entrance (4.2, 24.4) with the pickup back.

Implemented: `layer-3` preset/study composed from the accepted presets (one shared ledge collider, no new geometry); `nextLegId` without an escalator hands over on the grounded exit commit (`continueOnGround`: once only, in place, ledger/pickup/attachment/jump/phase/commands reset, `completed=false`); optional leg `settings` (wall feel, reach, pickup) and `hint` so the joined preset is section-aware while isolated presets keep their field values; `freePlacement` follows the active leg; pickup drawn/collected only on the climb; section-specific retry/fall text; Layer 3 restore rules extended to `layer-3` (a claimed climb-exit snapshot is refused); camera `sectionBlend` over the ledge x13.2→17.2; menu/eyebrow/tag/pause/CSS wiring. Tests: `tests/sketch-layer3-joined.test.ts` (11; all unit 180/180) and `tests/browser/sketch-layer3-joined.spec.ts` (7/7 in the last two full runs). Regressions S4A 8/8, S4B 8/8, S1 12/12, S3 14/14.

Review questions: is the handoff readable (cue, HUD section switch, walls returning to outlines, camera easing right)? Landings from the hop over E often end near the ledge's right edge (≈21.5 of 22); held D stops at the boundary but re-engages on key repeat and can walk into the glue (a crossing retry). Acceptable as is? The bars restart at phase zero on the handoff (as on every S4B retry).

Next after acceptance: [S4D prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4d--full-route-through-s4) with the [S4D plan](../gameplay/SKETCH_S4D_PLAN.md), read with the delivered S4A/S4B/S4C facts (the joined preset is `sketchLayerThree`; the hand-over helper and leg settings exist). If the user finds a restore/lifecycle problem in C, fix it in a separately requested C continuation before D.

## S4C implementation request handoff (executed)


**S4B accepted, 2026-10-07:** the user played S4B after the momentum fix, declared it done and authorized committing/pushing this checkpoint to origin/main. Next is S4C (join the wall climb and the swing crossing in one Layer 3) on its own request, using the revised [S4C prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4c--joined-layer-3) and the revision section of the [S4C plan](../gameplay/SKETCH_S4C_PLAN.md); the user may also request the early Sketch art reference pass discussed in-session (not authorized yet, no credits spent).

**Current handoff, 2026-10-07 (S4B implemented):** S4B is at its playable review gate. Stop for user review; S4C (joining the wall climb to this crossing) needs its own request. All S4B changes are uncommitted over the pushed S4A checkpoint `ce66df9`; commit/push only if the user authorizes it. No generation, dependencies, publishing or sub-agents are authorized.

Play [S4B swing crossing](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-swings) after `npm run dev`. [S4B evidence](../validation/sketch-s4/s4b/README.md) has the final geometry, measured windows, bypass probes, browser checks and regressions. Route: hover wood to see the ghost nail; click strip F near its high far end and stand on the head; click bar M1 near its left end; jump while M1 slides back toward you and press `E` close to the nail; `Q` frees F; click bar M2; pump with A/D, release with `Space` (air jump available) and press `E` at M2; `Q` frees M1; swing and release onto the end ledge.

Implemented: nailable surfaces (`SketchNailSurface`), the `place-at` command revalidated at the consuming tick (ownership, budget, reach 10, 1u spacing, no head inside the player), free placements as ordinary FIFO entries with `surfaceId`/`offset`, ghost preview and HUD refusal reasons, `layer-3-swings` preset with a terminal `l3-swings` leg. Shared fix: a forced detach (recalling the gripped nail) keeps only the swing's arc velocity; it previously flung the player at 135.9 u/s on the tick after a grip. Layers 1/2, S1 bays and S4A keep their marked targets. User review fix: a swing release now keeps its momentum when the direction key is let go (before, it dropped straight down).

Review questions: is the M1 → M2 timing comfortable (it is the demanding step; M2 → ledge is forgiving)? Do strip F and the bars read as nailable wood rather than ground? Is the placement puzzle (F's far end; M1's left half) discoverable from the ghost/HUD feedback?

Next after acceptance: [S4C prompt](../gameplay/SKETCH_S4_PROMPTS.md) with [S4C plan](../gameplay/SKETCH_S4C_PLAN.md): join S4A's ledge (x13.2..22, top 49.5) to this start ground in one Layer 3, take the third nail back on that ground, and keep both sections' recovery. S5's moving-socket finale must be differentiated from these moving bars in its own request.

## S4B implementation request handoff (executed)

**Previous handoff, 2026-10-07:** the user accepted the three-nail S4A wall climb and redesigned S4B: make a platform → swing point moving back and forth → second moving swing point → fixed end ledge. The player chooses where to drive each nail along nailable things (foothold strip, moving bars), never in empty air; there are no pre-made rings in this section. The third nail stays for the climb and is taken back after it, so S4B uses two nails and FIFO. Layers 1/2 and the walls keep marked targets. Start from the [revised S4B plan](../gameplay/SKETCH_S4B_PLAN.md) and its [prompt](../gameplay/SKETCH_S4_PROMPTS.md#s4b--moving-swing-crossing), only on the user's explicit request. S5's moving-socket finale must be differentiated later. At the user's request, accepted S4A and the S4 plans are committed and pushed to origin/main as the checkpoint after `77acf03`; that does not authorize later commits.

## S4A review handoff (accepted)


**Accepted S4A handoff, 2026-10-07 (second review — three nails):** the user found the six-board climb still impossible but liked it. They decided Layer 3 gives a **third nail picked up at its start** and asked for the climb to stay a little tough. S4A is revised and back at its playable review gate; stop for user review. S4B requires its own request after acceptance. All S4A code, tests, evidence and S4 planning docs are uncommitted over pushed main `77acf03`.

Play [S4A wall climb](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-walls) after `npm run dev`. [S4A evidence](../validation/sketch-s4/s4a/README.md) has both reviews, geometry, measured waits and skip margins. Route: pin A and B, run right over the nail pickup, jump onto A; pin C from A with the third nail, `Space`. On each later wall: `Q` (frees the board two behind), pin the board after next, `Space`, up to F. F's kick carries over E onto the ledge.

Section-only (preset fields): pickup x7..7.8 on the arrival ground (budget 2→3 until the section restarts), placement reach 11, wall grip 0.9 s then slide 2 u/s, kick 14.5 with lock to the arc's top, 0.3 s early-kick buffer. Layers 1/2 and S1 keep two nails and their tuning. A shaft axe was prototyped and rejected (its hub makes a band of kick heights certain death in the 3.3u shaft). Verification: build pass; 148/148 unit tests; S4A browser spec 8/8 with real input at both sizes; S1/S3 regressions rerun (see PLAN log). Scripted input only — the user's own play is the comfort check.

Next after acceptance: [S4B prompt](../gameplay/SKETCH_S4_PROMPTS.md) with [S4B plan](../gameplay/SKETCH_S4B_PLAN.md), read with three nails on Layer 3 (see the update note atop each S4 plan). S4C must place the glue section relative to the taller climb (ledge top 49.5) and keep the pickup at the Layer 3 entrance. Reuse `routeId` snapshot ownership, terminal-leg handling, the per-field `wall`/`placementReach`/`nailPickup` overrides. No commit/push, generation or sub-agents are authorized.

## Historical first S4A review handoff

The user found the first three-board S4A climb humanly impossible: a kick cancelled while holding toward the wall. The six-board continuous criss-cross with a section kick lock (slide 1.2, kick 14.5) replaced it; that version passed 143 unit tests and 8/8 browser cases before the second review above.

## Historical S4 planning handoff

**Current handoff, 2026-10-06:** S3 is committed/pushed at `77acf03`; S4 planning is complete and no S4 gameplay is implemented. The user requested comfortable session boundaries. S4 is divided into **four separately requested blocks**: A isolated wall climb, B isolated glue crossing, C joined Layer 3/section recovery, D integration with Layers 1/2 and the final S4 gate. Each stops for playable review. Four is not a hard session cap; A/B have further-subdivision rules if the proofs need more time. Planning does not authorize executing these prompts, commits/pushes, generation or sub-agents.

Start with [S4 overview/contracts](../gameplay/SKETCH_S4_PLAN.md) and [S4A plan](../gameplay/SKETCH_S4A_PLAN.md). All four [paste-ready prompts](../gameplay/SKETCH_S4_PROMPTS.md) are written; the first is [S4A](../gameplay/SKETCH_S4_PROMPTS.md#s4a--wall-climb). Read the actual preceding block's evidence before using each later prompt; proposed selectors are not working entries yet. [B](../gameplay/SKETCH_S4B_PLAN.md), [C](../gameplay/SKETCH_S4C_PLAN.md) and [D](../gameplay/SKETCH_S4D_PLAN.md) define their dependencies, implementation order, verification and stop conditions.

The technical risks are complete alternating wall-contact feasibility, placement/release onto a real foothold head, same-layer grounded transitions (the current model only advances linked legs at escalator arrival), section-owned memory restore, null-escalator terminal state and camera/HUD assumptions. Preserve `(4.2,24.4)` Layer 3 arrival, old study endpoints and all reviewed S1/S2/S3 challenge data. Final S4 stops before S5's moving-socket finale/sun/campaign. S4 studies remain save-isolated/development-only, with no new asset or dependency.

Planning verification: clean main at `77acf036605521a705fdcb527f880589afce38cf` before edits, expected origin, Node v22.14.0/npm v10.9.2 rechecked. Runtime/tests/dependencies/assets were inspected and remain unchanged. Existing 132-test/build/browser results are checkpoint/implementation evidence, not a new playtest or S4 pass. No provider request, commit or push in this planning session. Earlier handoff text below is historical.

## Historical S3 checkpoint handoff

**Latest user direction, 2026-10-06:** the user confirmed Slice 3 is made and explicitly requested committing/pushing its completed checkpoint to origin/main. S3 (S3A + S3B) is complete for this checkpoint. The next named slice is S4, requiring a separate implementation request; no S4 code was added here. The S3B review instructions below are retained as historical review guidance, not the current next task.

S4 builds Layer 3's criss-cross wall climb and glue crossing with the proven S1 wall-slide/kick, foothold and direct fixed-pivot nail swing mechanics. Preserve two nails, strict FIFO, all reviewed earlier challenges, save isolation and the connected cartoon 2.5D world. Add safe introductions and checkpoints at the layer entrance, after the climb and after glue; provide individual section review entries. Verify both sections individually and consecutively with real controls at 1280x720 and 960x540, including recall-current-support, falls/R and camera targeting. Stop on safe ground before the moving-socket finale. S5 owns the finale, sun and campaign ending; art is a separate follow-up. See [S4 scope](../gameplay/UNFINISHED_SKETCH.md#s4--layer-3-wall-climb-and-glue-crossing).

Checkpoint verification: Node v22.14.0/npm v10.9.2 rechecked; fresh fetch found main/origin/main synchronized at bd9cab7 before committing. All 132 focused tests, typecheck and production build pass again. Existing browser evidence is preserved; browser playtests were not repeated for this commit-only request. The existing >500kB chunk warning remains.

## Historical S3B review handoff

**Current state, 2026-10-06:** S3B is implemented for its playable review gate. Joined `study=layers-1-2` starts on Layer 1, clears the four reviewed pendulums, rides to the unchanged hard Layer 2 challenge, then rides to fixed safe Layer 3 ground. Direct `study=layer-2` reaches the same endpoint. `study=layer-1` retains its original Layer 2 endpoint; accepted S1 is preserved. No Layer 3 challenge, sun, campaign/ending, generated art or publication was added. All current changes are uncommitted on main over `bd9cab7`.

Play: [Joined Layers 1/2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2), [Direct Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2). Run `npm run dev` if the server is stopped. [Fresh S3B evidence](../validation/sketch-s3/s3b/README.md) records commands, captures, recovery and limits. [Implementation plan](../gameplay/SKETCH_S3B_PLAN.md) retains the scope and state contracts. Earlier records below are historical and superseded by this gate.

Preserve S2's four faster pendulums, two FIFO recalls and centered nail heads; preserve hard S3A's outlined boards (widths 3.4/3.0/2.6, periods 2.4/2.0/1.7s) and active axes (2.6/2.2s at 51.5,20.9 and 41.8,21.5). Two nails, strict FIFO, 10u reach, save isolation, cartoon depth and stacked 18u camera context remain. The new landing is x0..10/top24.4; second ride lasts 4s. R/fall retries the active leg or committed safe ground, leaving mid-ride restores its departure, and Restart resets the selected entry.

## Paste-ready S3B review prompt

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer. Review implemented Unfinished Sketch S3B only and fix material problems found in that review. Read AGENTS.md, docs/README.md, current PLAN/NEXT_SESSION, DECISIONS/REQUIREMENTS, SKETCH_S3B_PLAN.md and docs/validation/sketch-s3/s3b/README.md. Verify checkout/runtime/server ownership and preserve newer local changes over bd9cab7.

Play study=layers-1-2 and study=layer-2. Check both rides, the first-arrival handoff with no endpoint, unchanged mandatory-pin challenge difficulty, layer-local falls/R/re-entry, terminal Layer 3 recovery and Restart Adventure. Inspect boarding/ride/landing framing at 1280x720 and 960x540, reduced motion, actual blur and input clearing. Preserve accepted S1 and isolated S2's original endpoint, four faster pendulums/FIFO/centered nail heads, hard S3A geometry/axes, two nails, strict FIFO, save isolation and cartoon 2.5D stacked context.

After any material correction rerun relevant focused tests/typecheck/build and real-control browser checks, save fresh evidence separately and update the handoff. Automated feasibility is not human difficulty approval. Finish at the S3B playable gate and stop. Do not start S4, Layer 3 challenges, sun/campaign/ending, asset generation, dependencies, commits/pushes, publishing or sub-agents.
```

<a id="paste-ready-s3b-implementation-prompt"></a>

The former implementation handoff has now been executed under the user's explicit S3B-only request. The next action is user review, not another implementation slice.

<a id="paste-ready-s3a-review-prompt"></a>

## Historical S3A review prompt


```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer. Review implemented S3A only at study=layer-2. Read AGENTS.md, docs/README.md, current PLAN/NEXT_SESSION, DECISIONS/REQUIREMENTS, SKETCH_S3_PLAN and docs/validation/sketch-s3/README.md. Preserve all uncommitted M3/S1/S2/S3A work. Check the leftward three-board/two-axe route, FIFO A/B/recall-A/C strategy, local recovery and grounded exit, both camera sizes and compulsory outlined/inked support with measured skip prevention. Fix only material S3A issues found in review, then rerun affected focused/build/browser checks and update evidence. Do not start S3B, Layer 3, campaign/ending, art generation, commits/pushes, publishing or sub-agents.
```


## Historical S3A implementation prompt

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer. Implement Unfinished Sketch S3A only, following docs/gameplay/SKETCH_S3_PLAN.md: a save-isolated Layer 2 moving-board/active-axe route from its existing landing to fixed exit ground. This request authorizes the bounded route/session changes, cartoon placeholders, focused tests, browser verification and handoff updates needed for S3A. Finish its playable gate and stop for my review before S3B.

Read AGENTS.md and docs/README.md, then PLAN, DECISIONS, REQUIREMENTS, UNFINISHED_SKETCH, SKETCH_S3_PLAN and NEXT_SESSION. Recheck environment/git status and preserve all uncommitted work, accepted S1, and the latest four faster S2 pendulums with two FIFO recalls and circular nail heads centered on the placement holes. Latest S2 evidence is docs/validation/sketch-s2/four-pendulums/README.md; its test results are historical.

Reuse two nails, marked placement targets, strict FIFO recall, freezeable boards and axes that never freeze. Use the plan's labelled layout defaults; measure jump/reach/axe clearance and report shortcuts honestly. Keep S2's outlined/inked rule on Layer 1; do not silently apply it to Layer 2. Keep one scene/canvas, cartoon 2.5D depth, moderate active-layer framing with neighboring-layer context, and correct look-ahead for the Layer 2 direction. Add the proposed study=layer-2 entry only after validation; preserve existing entries and production/save isolation.

Verify real-control Layer 2 traversal, nail reuse, axe contact at multiple phases, local fall/R recovery, recall-current-support safety, pause, resize and re-entry at 1280x720 and 960x540. Run npm run typecheck, npm run test, npm run build and targeted S1/S2/S3A browser regressions with tracing off. Record actual URLs, controls, captures, measurements and limitations in docs/validation/sketch-s3/, PLAN and NEXT_SESSION. A build alone is not playtesting.

Do not implement S3B's joined route or second escalator, Layer 3 challenges, sun/campaign/ending, generated art, new dependencies, commits/pushes, publishing or sub-agents. Make routine implementation choices autonomously; ask only for a missing blocker or a material change to settled rules.
```

**Current handoff, 2026-10-06:** S2 implementation and the explicitly requested completion review are complete; it stops at its playable gate for user playtest. Layer 1's four faster pendulum transfers require two FIFO recalls with two nails through moving dashed outlines that become solid only while pinned. Exit retry and grounded checkpoint landing are corrected, the first scripted escalator reaches a fixed Layer 2 landing, and the connected three-layer blockout retains non-playable guides for later content. Play at `?scene=unfinished-sketch&study=layer-1`. S1 is unchanged and accepted. Fresh evidence: 112 focused tests, typecheck/build, 15 S2 browser scenarios (12 route, 2 capture, 1 full reduced-motion traversal), and 12 S1 browser regressions. Earlier movement/campaign/blockout results are historical; they were not rerun in this bounded review. Latest four-platform evidence and captures are in docs/validation/sketch-s2/four-pendulums/ and PLAN; the final 27 browser scenarios passed in 3.3 minutes. Circular platform nail heads sit exactly on the clicked holes. Preserve all uncommitted runtime, asset, evidence and documentation work; nothing was committed or pushed. S3 requires a separate request.

## Completion review, 2026-10-06

The user asked to check/complete S2 and explicitly chose mandatory nail reuse. S2 pendulums now remain moving dashed outlines without collision until pinned; a pin freezes and inks a solid platform, Q removes its support and resumes the outline. This bounded route-only flag preserves accepted S1. Pressing R before escalator boarding now stays on the cleared exit checkpoint rather than incorrectly returning to the starting ground. The exit checkpoint commits only after a grounded landing, not airborne overlap. The reduced-motion browser check now traverses the entire route/ride, and a real-control scenario verifies mid-ride pause/retry and Layer 2 arrival/fall recovery. A browser driver run-up error was corrected to keep its takeoff on current support; route instructions have a contrasting paper panel only in S2. Current validation is recorded in [Sketch S2 evidence](../validation/sketch-s2/README.md).

Historical statements below about geometry alone forcing nails, S2 not having started, or a planning-only session are superseded by this explicitly authorized completion review. S3 remains a separate request.

## Paste-ready S2 review prompt

Historical review prompt retained for S2 corrections. The current next implementation prompt is S3B above; use the four-pendulum evidence for any later S2 review.

```text
Continue The Last Curator in C:\Users\XZNON\DreamLayer. Review Unfinished Sketch slice S2 as implemented, and only fix material problems found in that review. This request authorizes S2 corrections, cartoon placeholder adjustments, focused tests and planning/handoff updates. S1 is complete and accepted; preserve its reviewed implementation and do not ask for its approval again. S3, later layers, the campaign award, the sun, the ending, generated art, dependencies, commits/pushes, publication and sub-agents are not authorized.

Read AGENTS.md and docs/README.md, then docs/planning/PLAN.md, DECISIONS.md, REQUIREMENTS.md, docs/gameplay/UNFINISHED_SKETCH.md, SKETCH_S2_PLAN.md, docs/validation/sketch-s2/README.md and docs/planning/NEXT_SESSION.md. Verify the current checkout, branch/HEAD, origin and Node/npm. Preserve all uncommitted M3 cohesion, revised S1, S2 and document-reorganization work; do not reset or clean the checkout.

Run npm run dev and open http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1. The manual checks, controls, measured geometry and framing are listed in docs/validation/sketch-s2/README.md. Pay particular attention to the readability of the next target before each commitment, the FIFO reuse moment, the escalator boarding prompt and the Layer 2 arrival framing.

If a finding is a genuine design or readability problem, fix the route data or the framing rather than adding a hidden completion rule: bypasses must be solved by geometry and clearance. Keep the route-only outlined/inked collision rule and the exit ground above the measured double-jump ceiling from pendulum B, keep pendulum C beyond the 10-unit placement reach from the terrace and from pendulum A, and keep every transfer reachable from many ordinary jump timings.

Re-run npm run typecheck, npm run test, npm run build, the S2 browser specs and the affected S1 regressions after any change. Record what changed, what was measured and what remains unproven in docs/validation/sketch-s2/ and PLAN/NEXT_SESSION, and distinguish automated evidence from human review.
```

## Accepted baseline and historical evidence

**The user declared S1 complete on 2026-10-06 after its implementation/review revisions.** Preserve it; S2 is implemented and its current review corrections are recorded above. The S1 development entry is `http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics` (recheck the server; production ignores it and starts in the museum). `&bay=pins|walls|foothold|fixed-swing|moving-swing|combined` selects a bay. Controls: A/D move/pump, Space jump/wall kick/release, E grab/release a nail, left click places at a socket, Q FIFO recall, R reset, Escape pause, digits 1-6 select bays.

Four review issues were fixed: support removal no longer traps or phases the player; a pinned wall owns vertical motion so one wall cannot be climbed by double jumping it; grabbing a swing nail now needs an explicit press instead of auto-clipping; and each target kind shows its nail the way that target uses it (a clipped platform is pinned along its surface, a swing nail is driven into its socket bracket, a foothold nail is driven down and its head is the platform).

S1's review gate is accepted by the user's completion statement. S2 was subsequently implemented and the user explicitly requested completion/review corrections, requiring mandatory nail reuse. Preserve uncommitted M3 cohesion and revised S1; stop before S3 until a separate request.

Latest layout refinement: keep all three layers in one connected stacked world/scene/canvas, but moderately zoom/reframe toward the active layer so mechanics/player stay comfortably sized. Keep neighboring-layer context visible; do not zoom so far that only one isolated layer remains. Escalators smoothly transition focus; resize preserves geometry and reduced-motion skips nonessential camera animation. This supersedes fixed-full-board/no-zoom framing. S2 proves active-layer framing/readability at 1280x720 and 960x540 with non-playable guides for future rows. S1 bay cameras remain unchanged development tests.

Latest implementation (2026-10-06): six bays, two nails, strict FIFO recall, freeze platforms, permanently active axes, moving swing mounts that carry their nail, pinned-wall slide and kick, foothold nail heads and direct fixed/moving-pivot nail swinging with no rope. 77 focused tests, typecheck, build, 10 new real-control browser scenarios, the existing movement lane, the full expanded Royal Supper route and all five production campaign scenarios pass. Captures and measured envelopes are in docs/validation/sketch-s1; details are in docs/planning/PLAN.md's implementation log.

Latest planning, 2026-10-06: the user replaced Sleeping Mountain with Unfinished Sketch, kept the sun reward/two-stage ending, and selected two nails with authored placement targets and FIFO button recall. Board/pendulum nails freeze them; axes stay active; final moving swing sockets carry the nail. The player swings directly on the nail with A/D momentum, without a rope. docs/gameplay/UNFINISHED_SKETCH.md records the selected route, working defaults, six playable slice gates and acceptance criteria.

Latest art steering: Sketch's entire theme and artifacts must be fully animated/cartoon, including the backgrounds, with no realism or semi-realism. S1 uses simple cartoon silhouettes/materials. See docs/art/ART_DIRECTION.md's separate Sketch section; do not apply M3's richer painterly backdrop rule to the new world. This does not authorize generation or replacing approved existing assets.

Latest dimensional clarification: maintain a modern cartoon 2.5D feel, not a flat 2D/retro pixel-game look. Use platform thickness, rounded mechanisms, scenery depth layers and soft stylised lighting while preserving side-view movement, nail/landing readability and moderate active-layer zoom. Existing illustrated player poses remain valid; no new full-3D controller/character is requested. Documentation only; preserve completed S1 and do not start S2 on this clarification alone.

Latest result, 2026-10-06: the accepted **stylised, leaning animated** M3 cohesion pass is complete and verified. Selective offline preparation simplifies bread/basket/crumb/cake colour detail; the clear teal player, richer soft background and other 11 props are reused. No new generation, reference approval or provider exception. Originals, dimensions/alpha, gameplay, LOOK rays, high-dessert backdrop, restoration/saves/audio and isolated entry remain intact.

Starting cohesion checkout was main at completed M3 `1750ed3`, with the requested documentation/provenance edits preserved. Those edits were independently committed during that session as `df49623` (Document accepted stylised art direction and scoped cohesion pass); fresh fetch confirmed HEAD/origin/main at that snapshot. Node 22.14.0/npm 10.9.2 and installed exact dependencies were verified. The subsequent planning session confirmed local/remote main at `df49623` and the same runtime versions, preserving every existing change. The art pass, its handoff and current Sketch planning changes are uncommitted; preserve them and verify current status before continuing. M3 remains complete as the baseline. M4 is partially implemented: S1 is complete; S2 is implemented; S3 onward and the ending remain unimplemented.

## Latest cohesion verification

- All 40 focused tests, typecheck and production build pass. All nine Chromium scenarios pass with --trace off in 11.4 minutes, including complete isolated/replay/lifecycle and production/restoration/save/reset regressions. Isolated traversals each used one ordinary butter retry; production traversals used zero.
- Fresh before/after real-control starts/jumps/bread landings at 1280×720 and 960×540; resized captures wait two rendered frames. Agent-inspected fork/candle states, cover/LOOK, jelly/cake/high-finale and matching pear/restoration. Evidence: docs/validation/art-cohesion/README.md, pilot PNGs and 27 production WebP captures. No human-duration or representative-machine claim.
- Exactly four runtime manifest paths select public/assets/supper/cohesion-v1 variants. Original source/prepared files are byte-identical, all four size/alpha comparisons match, 49 recorded image hashes and 12 audio hashes match. Gameplay/scenes/core/UI/campaign/levels/dependencies still match 1750ed3. Private credential audit reports zero matches.
- Provenance: separate .cohesion-v1 revision IDs reference the original DreamLayer bread / ImageGen basket/crumb/cake. Local preparation costs 0 generation credits; no provider requests, fresh-balance assumptions, retired retries or exception expansion. Upstream unknown billing remains unknown. Reproduce via scripts/prepare-cohesion.py; originals and review boards remain in asset-sources/production/cohesion-v1.
- Public assets 7,881,765 bytes; dist 8,527,937 bytes. JS 638.89 kB / 165.02 kB gzip; existing >500 kB warning. Rollback originals retained alongside 691,723 bytes of variants. Remaining release limitations are unchanged.

Updated 2026-10-06. M3 final prop-camera/art/audio/full-loop gate and the separate scoped cohesion gate have passed. Verify git status/log and origin before implementation. The current art revisions and handoff remain uncommitted. Sketch has an accepted development mechanics scene; the full second adventure and campaign ending do not exist yet. No publication/submission/email or sub-agents.

## Preserve

Royal Supper gameplay and masterpiece/banquet-v5/player references remain approved. Guarded double jump, butter/crumb sliding, grapes, mandatory fork, separated trident candles with timed relighting, three diner crossings and two jelly launches are unchanged. Gameplay, level and campaign files still match baseline 605bee4. Existing DreamLayer slice/restoration art and original Howler audio remain intact.

Three OpenAI ImageGen sheets provide the 14 remaining required M3 props with separate provenance. Do not regenerate them. The user-requested watcher presentation now uses soft golden rays from painted eyes to table during LOOK; AWAY/TURNING use normal lighting. Head-turn warnings, authored cover/detection and pause timing remain unchanged. Rays stay behind player/cover and own their GPU resources. The existing distant background follows upward camera movement so the high dessert ascent has a filled backdrop; foreground/world collision are unchanged.

DreamLayer food recovery failed seven same-key rounds / 21 attempts before the user-authorized ImageGen fallback. Retired food request identity remains preserved: request f5b39560-0e62-40ff-ade9-339bcd2490ff, no output/execution identity. Known delivered DreamLayer costs remain 7 reference + 3 production credits; last successful balance was 90. Failed-job costs and ImageGen billing remain unknown, not zero. Do not retry retired requests. The ImageGen exception covers M3 props only and does not authorize substitution for Sketch art.

## Completed M3 baseline verification and evidence

- Node v22.14.0/npm v10.9.2 re-verified. Final build/typecheck and all 40 focused tests pass.
- Complete nine-scenario real-control Chromium suite passed with tracing disabled (11.7 minutes). Covers full museum/collection/return/restoration/reload/replay/reset, click/drag/keyboard placement, malformed/denied storage, settings, input contexts, movement, pause/frozen timers, save isolation, audio and resource disposal.
- Supplemental production traversal/storage/restoration passed with individual candle-state captures. After the final backdrop correction, this production regression passed again (2.6 minutes, one ordinary butter retry), with fresh LOOK/AWAY, flame and finale captures.
- Agent-inspected 1280×720 and 960×540 visuals: avatar visible under cover during LOOK; normal AWAY lighting; fork rotation; trident cup/wax alignment and every ember/relit state; jelly/cake and high finale; pear restoration. Resized captures wait for two rendered frames. Notes/captures: docs/validation/m3-props and docs/validation/m3-restoration.png.
- All 41 recorded image/source/runtime and 12 original-audio hashes match. Private scans found no current local credential-value matches in source/public/build. Public assets: 7,190,042 bytes; dist: 7,836,184 bytes. JS: 638.86 kB / 165.00 kB gzip. Existing nonfatal >500 kB warning remains for loading/performance polish.
- These are automated controls/captures and agent visual inspection. No measured human first-time duration or representative-machine performance claim. Cross-browser/fullscreen/itch.io iframe, actual OS focus/hidden-tab, context restoration and representative profiling remain release checks.

## M4 — six slices, only on later implementation requests

Read AGENTS, PLAN, DECISIONS, REQUIREMENTS, UNFINISHED_SKETCH, SKETCH_S2_PLAN and this handoff; consult SKETCH_S1_PLAN as historical context and preserve the uncommitted completed cohesion work. Sleeping Mountain is now a reserve. Its old archive/log entries do not reopen the selected Sketch campaign.

| Slice | Playable review result | Status |
| --- | --- | --- |
| S1 | Save-isolated nail/FIFO, freeze platform, wall-slide/jump, foothold and fixed/moving-pivot direct swing playground | Complete per user, including review revisions |
| S2 | Four faster pendulum transfers, first escalator and stacked-world framing proof | Implemented 2026-10-06; playable at `?scene=unfinished-sketch&study=layer-1`, awaiting user review |
| S3 | Moving boards/active axes and second escalator | Planned only: S3A isolated route, S3B joined route/second escalator; neither started |
| S4 | Layer 3 criss-cross wall climb and glue/foothold/nail swing crossing | Not started |
| S5 | Moving-socket finale, sun/settling, full museum restoration and two-stage ending | Not started |
| S6 | Human review, refinement and complete gameplay/regression gate | Not started |

Detailed gates/defaults are in docs/gameplay/UNFINISHED_SKETCH.md. Prove the risky movements in S1, not when building Layer 3. At each slice end provide exact implemented review entry, controls/manual checks, real-control evidence, focused tests/build, limitations and next task; pause progression for material user feedback. Never claim a proposed URL already works. Add a museum entrance only when the full scene is playable; keep partial entries save-isolated and ignored in production.

The user required mandatory nail reuse during the 2026-10-06 S2 review. Layer 1 pendulums are moving dashed outlines without collision until pinned; pinning freezes and inks a solid platform, and FIFO recall removes its support immediately. This route-only authored rule preserves S1's moving solid platforms. All four pendulums remain geometrically required: the exit is at least 5.43 units above B's highest surface (above the 4.479-unit double-jump ceiling), and C is beyond the 10-unit placement reach from the terrace and A. No completion flag rejects a valid landing; the drawn platform and collision change together. This supersedes the earlier claim that geometry alone required nail reuse, which review disproved. The later speed/difficulty review adds D: from C, Q recalls B before pinning D; the widened horizontal route prevents skipping C or D. Platforms use progressively narrower 4.6/4.2/3.8/3.4-unit landings and 3.4/2.8/2.45/2.1-second periods. Placed platform nails show only a circular head centered on the clicked hole.

S1 has a separate technical plan in docs/gameplay/SKETCH_S1_PLAN.md and is now implemented in `src/levels/unfinished-sketch.ts`, `src/gameplay/sketch-model.ts`, `src/gameplay/sketch-movement.ts` and `src/scenes/unfinished-sketch.ts`, with focused tests in `tests/sketch.test.ts` and `tests/sketch-movement.test.ts`, browser checks in `tests/browser/sketch-mechanics.spec.ts` and review captures in `tests/browser/sketch-capture.spec.ts`.

S2 is implemented in `src/levels/unfinished-sketch-route.ts`, the shared `SketchPlayfield` base plus `SketchRouteModel` in `src/gameplay/sketch-model.ts`, the route blockout and active-layer camera in `src/scenes/unfinished-sketch.ts`, and the `study=layer-1` selector and route session in `src/main.ts`. Focused checks are in `tests/sketch-route.test.ts`; browser checks are in `tests/browser/sketch-layer1.spec.ts`, `tests/browser/sketch-layer1-capture.spec.ts` and `tests/browser/sketch-layer1-motion.spec.ts`.

The exact implemented review entries, bay list, route URL, controls and evidence are in docs/planning/PLAN.md's 2026-10-06 S1 and S2 log entries and docs/validation/sketch-s2/README.md. Sketch remains save-isolated and development-only; there is still no museum door, campaign award or ending.

Keep stable sun/piece/restoration/save identities and approved Royal Supper unchanged. Source campaign still names Mountain today; replace its artwork/scene/clue in S5 and verify actual old-save compatibility. Check full new game -> pear -> Sketch -> sun -> restoration -> ending then reload/reset/retry/replay/lifecycle.

The six slices deliver refined placeholder gameplay/campaign, not final art. Required Sketch reference/production art and final camera/audio QA are a separate scoped follow-up. DreamLayer remains intended; verify live access/credits/costs before an authorized batch and do not extend the M3 ImageGen exception. No reference assets for Sketch are approved/generated in this session.

M5 final museum and the optional garden scope gate follow a completed M4. Opening presentation stays M6. No broad catalogue, publishing/submission/email or sub-agents without authorization.

Commands: npm run dev; npm run typecheck; npm run test; npm run build; npm run preview. Browser checks: node node_modules/@playwright/test/cli.js test --trace off. Dev entry http://127.0.0.1:5173/?scene=royal-supper is save-isolated; production http://127.0.0.1:4173 ignores debug hooks. The persistent local preview on http://127.0.0.1:5175/?scene=royal-supper returned HTTP 200 this session; recheck rather than assuming it survives.

## Continuation boundary

The docs/art/ART_DIRECTION.md prompt records the completed art-only request; do not repeat it or regenerate delivered art automatically. S1 is accepted; S2 is implemented with explicitly requested review corrections. This handoff preserves its playable gate and does not authorize S3 or the whole adventure. No publication/submission/email, broad catalogue, generation, commits/pushes or sub-agents without authorization.
