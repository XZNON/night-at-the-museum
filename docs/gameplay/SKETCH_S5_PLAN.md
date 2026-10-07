# Sketch S5 — Sun and campaign ending (plan)

2026-10-07, planning only. Written on the user's request after S4D was committed and pushed (`715770d`) and the user decided that **Layer 3 has no third section**: every Sketch section and layer is done. S5 builds no new traversal. It adds the sun at the end of the existing route and connects the Sketch to the museum campaign and its ending. Paste-ready prompts: [SKETCH_S5_PROMPTS.md](SKETCH_S5_PROMPTS.md).

> **Revision, 2026-10-07 (user, after S5A):** the reward is an **enchanted light in a torch**, claimed on the end ledge, not a sun. S5A's study now shows the torch (see DECISIONS). Read "sun" below as the claimed light wherever the Sketch is concerned. Decided (user, 2026-10-07): the light acts as the sun; carried back and placed in the masterpiece's sky, it lights it up. Piece/region/save IDs unchanged; player-facing names say "enchanted light". Mid-air claims stay.

S5 runs as **three separately requested blocks**, each stopping at a playable review gate:

| Block | Result | Depends on |
| --- | --- | --- |
| [S5A](#s5a--the-sun-on-the-end-ledge) | Sun on the end ledge of the full route; collection, settling and a success/return screen in a save-isolated study | S4D (pushed) |
| [S5B](#s5b--the-sketch-in-the-museum) | Sketch frame in the museum, locked until the pear is restored; enter, collect the sun into the campaign, return; Mountain removed everywhere | S5A reviewed |
| [S5C](#s5c--sun-placement-and-the-ending) | Sun placement in the masterpiece, the complete picture and the two-stage ending; full campaign regression | S5B reviewed |

Further subdivision is allowed when a block needs more time. Never run the three prompts together. Art and audio stay placeholders/reuse; final Sketch art is a separate task.

## 1. Fixed facts (verify before each block)

- **Route to reuse:** `sketchLayersOneToThree` (`study=layers-1-3`) in `src/levels/unfinished-sketch-layer3.ts`: Layer 1 → `l1-lift` → Layer 2 → `l2-lift` → wall climb → grounded handoff → swing crossing → end ledge `l3-swings-ledge` (x57..65, top 54; terminal exit spawn (59, 54); exit bounds x57..65, y54, h2.4). Accepted challenge data must not change.
- **Campaign source:** `src/campaign/definition.ts` still names `sleeping-mountain` (artwork/scene) for stage 2 (`sun-disc`, region `dawn-sky`). `Progression.applyCampaignCommand` is the only award/restore boundary: collecting the sun is `LOCKED_STAGE` until the pear is restored; completion = restored count equals stage count.
- **Saves:** `SaveV1` (`last-curator.save.v1`) stores only `collectedPieceIds`/`restoredPieceIds` (piece IDs) and settings, never artwork IDs. Renaming the stage-2 artwork ID does not touch stored data. Keep `garden-before-dawn`, `golden-pear`, `sun-disc`, `pear-tree`, `dawn-sky`, the save key and schema.
- **Museum:** `src/levels/museum.ts` (room 12×12, two frames on the back wall at z −5.82: Royal Supper x −2.8, masterpiece x 2.6; `targets.sun` already authored at left 78.4 %, top 24 %, 5.3×8.5 %). `src/scenes/museum.ts` maps frames to art by ID and shows `masterpiece.pear-restored` or `masterpiece.damaged`. The inspection (`GameUi.inspection`) already draws a `sun-disc` target button, inert today.
- **Art on hand (no generation needed):** `public/assets/restoration/complete.webp` (manifest `masterpiece.complete`, prepared from the approved masterpiece reference, not yet in `runtimeAssets`) and `sun-mask.png` (aligned sun region). The sun's inventory/in-world cutout is derived locally from these two (see `docs/art/SKETCH_ASSETS.md`), e.g. with the existing `scripts/prepare-art.py` flow or a runtime crop. A Sketch museum frame picture does not exist: use a cartoon placeholder drawn in code until the separate art task delivers `sketch.entrance`.
- **Dev vs production:** `?scene=unfinished-sketch&study=…` is dev-only and save-isolated; production ignores it. `__curatorDebug` is dev-only, so real-control Sketch traversal in browser tests runs on the dev server. Production checks use seeded saves and the museum/inspection UI.
- **Concurrent work:** an art reference pass is in progress in `asset-sources/`, `docs/art/SKETCH_ASSETS.md` and `scripts/sketch-references.mjs` (uncommitted). S5 must not edit or commit those files.

## 2. Product defaults chosen in planning (user may override at any gate)

1. **Sun location:** on the end ledge, toward its right end (proposed rect x 62..63.4, y 54..55.6, clear of the exit spawn x 59), so the player lands on the ledge and walks right to take it. No new hazard, mechanic or section.
2. **Landing vs collection:** in the adventure preset, landing on the end ledge is a safe checkpoint, not the endpoint; touching the sun is the endpoint. R/fall/re-entry on the ledge keep the ledge (S4D terminal rules).
3. **Settling:** collection freezes every moving mechanism in place (pendulums, boards, axes, bars) as the "picture settles" cue, and stops the HUD challenge text. The ledge is fixed ground, so nothing can drop or crush the player; Return stays available. (Default; the plan's original "authored rest poses" wording is satisfied by "stop where they are" because no mechanism touches the ledge.)
4. **Sketch frame:** on the museum's left side wall (proposed centre x −5.82, y 2, z −1.5, facing +x, 2.8×1.8), labelled "Unfinished Sketch". Visible from new game, **locked until the pear is restored**: prompt "Restore the golden pear first", click/E does nothing else. No locked frame ever opens a scene. Return pose in front of it, facing it.
5. **Sun inventory:** a sun cutout from `complete.webp` + `sun-mask.png` (local preparation, recorded in the asset manifest as `restoration.sun`, provider DreamLayer/local preparation, no credits).
6. **Ending:** placing the sun swaps the masterpiece to `masterpiece.complete` with the existing restoring animation, then an ending overlay: "The Garden Before Dawn — restored", one short line per recovered piece, buttons **Stay in the museum** and **New game (reset progress)** (the latter goes through the existing reset confirmation). Re-inspecting the finished masterpiece shows the complete picture and offers the ending again. Royal Supper and the Sketch stay replayable without new awards.
7. **Audio:** reuse existing cues (`collect`, `return`, `restore`) and the existing scene ambience; no new audio files.
8. **Texts:** campaign-facing Sketch texts are player language ("The sun is yours. Return to the museum."), never "S4D endpoint / Stop for review". Dev studies keep their review texts.

## 3. Contracts

- **Model never touches progression.** The Sketch model reports a sun touch (once per session) through a scene callback; `main.ts` applies `{ action: 'collect', artworkId: 'unfinished-sketch', pieceId: 'sun-disc' }` and persists on `changed`. The isolated study passes a callback that only shows the success screen ("Isolated study — campaign saves untouched").
- **One collection per scene life.** After the touch the sun is hidden, the stage is final (`completed`), repeated overlap does nothing, and R/fall/re-entry keep the player on the ledge with the sun taken.
- **Session ownership.** Same-session leave/re-entry of the campaign Sketch resumes its route checkpoint (as the studies do), keyed separately from every dev study. A full reload restarts the Sketch at Layer 1; owned/restored pieces persist. Snapshots from dev studies are refused.
- **Locked stage.** The museum never offers entry while the pear is unrestored; if entry were forced, `collect` returns `LOCKED_STAGE` and nothing is awarded.
- **Ending is derived, not stored.** "Complete" is `restoredPieceIds.length === stages.length`; no completed flag is saved (REQUIREMENTS edge case 7).

## S5A — The sun on the end ledge

**Playable result:** `?scene=unfinished-sketch&study=adventure` (proposed id; dev-only, save-isolated) plays the full S4D route and ends by touching the sun on the end ledge: sun disappears, mechanisms settle, cue, success screen with "Return" (in the study: back to the study menu) and "Keep exploring".

**Implementation order**
1. Verify HEAD (`715770d` or newer), origin, Node/npm, dev-server ownership; preserve the concurrent art files.
2. Data: optional route field `sun?: Rect & { id: string }`; new preset `sketchAdventure` (route id `adventure`) cloning `sketchLayersOneToThree` with player-facing name/hint/goal, the sun rect on the end ledge, and terminal texts that are not review texts. Do not mutate `layers-1-3`.
3. Model: `sunCollected` flag; on a step whose body overlaps the sun (any stage on the terminal leg, not recovering), set it once, freeze all mechanisms at their current phase (a settle flag the mechanism clock respects), mark `completed`, clear commands/attachments, cue. Ledge landing without the sun = safe checkpoint (no "endpoint" text). Restore keeps `sunCollected` only within the same route id and session; refuse foreign snapshots.
4. Scene: draw the sun (cartoon placeholder disc with rays; reduced motion: no pulse), hide it once taken; expose a `onSunCollected` callback; success overlay via `GameUi` (new `sketchSuccess(changed)` or reuse `success` with piece copy).
5. UI: study wiring (`sketchStudies`, menu card, eyebrow, tag, pause label "Restart the Sketch").
6. Tests: unit (composition clone, sun reachable on the ledge by walking, collected once, settle freezes mechanisms, R/fall/re-entry after collection, no award callback twice, older studies unchanged); browser `tests/browser/sketch-adventure.spec.ts` with real keys/clicks at 1280×720 and 960×540 reusing the S4D helpers (full route to the sun, success screen, terminal retries, reduced motion, production ignores the study). Regressions: S4D full spec and S4C joined.

**Gate:** sun collected exactly once with real controls at both sizes; settling never moves or harms the player; older studies, endpoints and texts unchanged; unit/build/typecheck pass. Stop for review.

## S5B — The Sketch in the museum

**Playable result:** normal entry (`npm run dev`, no `scene` param, or production): new game shows the Sketch frame, locked; after the pear is restored the frame opens the Sketch adventure (the S5A preset, campaign mode); touching the sun awards `sun-disc` once and persists; Return to Museum lands in front of the Sketch frame; inventory shows the sun; the inspection's sun target is present but placement is S5C's.

**Implementation order**
1. Campaign: rename stage 2 to `artworkId`/`sceneId` `unfinished-sketch`, clue "Finish the unfinished sketch to free the sun." Update `ArtworkId` and every Mountain string in code/UI (menu note "The sun adventure arrives in a later update", museum objective "wake the sun above the mountain", inspection message). Keep piece/region/save identities. Unit-test old pear-only, pear-restored and sun-collected saves.
2. Museum data/scene: third frame on the left wall with a code-drawn cartoon placeholder picture and plaque; locked look (dim, "Restore the golden pear first") until pear restored; prompt "Click / E — Enter the Unfinished Sketch" when open; `museum.sketchReturnPose`.
3. `main.ts`: campaign Sketch entry (`startSketchAdventure`) through the scene manager with transition locks; sun callback → progression collect → persist; success overlay with Return to Museum / Continue exploring; leave → museum at the Sketch return pose; same-session route memory for the campaign Sketch; pause menu labels for campaign mode ("Return to Museum", "Restart adventure" = Layer 1). Audio: existing cues/ambience.
4. UI: `museumState` objectives for every stage (pear missing / pear owned / pear restored → "Find the sun in the Unfinished Sketch" / sun owned → "Bring the sun to the masterpiece"); inventory shows the sun with its cutout (`restoration.sun`).
5. Tests: progression/save unit tests for the renamed stage; browser on the dev campaign entry with a seeded pear-restored save: frame locked on a fresh save, open after pear restore, enter, real-control route to the sun (S5A helpers), persisted `collectedPieceIds` includes `sun-disc`, return pose/prompt, re-entry, reload during the Sketch (restarts Layer 1, piece state intact), replay after collection (no duplicate, "already yours"), denied storage, transition spam. Production: seeded saves show the right frame state/objective/inventory; `study=` still ignored. Regressions: existing `campaign.spec.ts`, S5A spec.

**Gate:** campaign can go pear → Sketch → sun-in-inventory with real controls; no Mountain text or door anywhere; saves compatible; Supper loop unchanged. Stop for review.

## S5C — Sun placement and the ending

**Playable result:** with the sun in inventory, inspecting the masterpiece lets the player drag/click/keyboard-place the sun on its silhouette; colour spreads to the full picture (`complete.webp`), the museum frame updates, and the ending overlay plays. The game is complete: new game → pear → Sketch → sun → complete masterpiece/ending.

**Implementation order**
1. Assets: add `masterpiece.complete` and `restoration.sun` to `runtimeAssets`/`museumArtIds` (manifest status integrated); `masterpieceImage` and the museum texture pick damaged / pear-restored / complete from the restored count.
2. Inspection: sun piece button and target behave like the pear's (drag, click-then-target, Tab/Enter); wrong drops keep the piece; placing before owning says what to do; the pear target stays "restored".
3. `place()`: generalize to the stage being restored (validate piece = target = next stage's piece), `restore` via progression, persist, `restore` cue, animate, then on `complete` show the ending overlay (Stay / New game via existing reset confirmation). Museum objective "The Garden Before Dawn is complete"; masterpiece inspection after completion shows the complete picture and an "Ending" button.
4. Tests: unit for placement validation helpers if extracted; production browser with seeded saves (sun owned → place by drag, click and keyboard → reload shows complete; reload during the restore animation keeps the restored state; replay Supper/Sketch after completion adds nothing; reset returns to a fresh museum); dev-entry full campaign with real controls end to end (Supper via existing helpers, Sketch via S5A helpers) at 1280×720 and a 960×540 spot check; existing `campaign.spec.ts`, art/audio/blockout specs as touched, S5A/S5B specs.

**Gate:** one complete new-game-to-ending journey with real controls; restored/complete state survives reload at every boundary; no duplicate awards; reset works; all regressions pass. Then S5 is complete; S6 (refinement from human play) follows on its own request.

## Out of scope for all of S5

New traversal or sections, the moving-socket finale (dropped), new mechanics, Drowned Garden/bird, final Sketch art or a DreamLayer/ImageGen batch, new audio, a museum rebuild, publishing/jam submission, commits/pushes without the user's authorization, sub-agents.
