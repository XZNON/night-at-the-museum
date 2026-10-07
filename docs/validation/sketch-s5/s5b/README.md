# Sketch S5B — The Sketch in the museum (evidence)

2026-10-07. Implemented on the user's S5B-only request. The Unfinished Sketch is now the campaign's second adventure: its frame hangs on the museum's left wall, locked until the golden pear is restored; once open it enters the S5A full route (`sketchAdventure`) in campaign mode, and claiming the enchanted light collects stage-2 piece `sun-disc` once and persists it. Mountain is gone from code and UI. Placement in the masterpiece and the ending are S5C. Stop for user review. Committed and pushed to origin/main on the user's request after this evidence. No placement/ending, art generation, dependency, commit/push, publishing or sub-agent work.

Play after `npm run dev`: [normal entry](http://127.0.0.1:5173/) (New Game → Royal Supper → place the pear → walk to the left wall → Click / E on the Unfinished Sketch). To skip the Supper, seed a pear-restored save in the browser console on that page and reload:

```js
localStorage.setItem('last-curator.save.v1', JSON.stringify({ schemaVersion: 1, campaignId: 'garden-before-dawn', collectedPieceIds: ['golden-pear'], restoredPieceIds: ['golden-pear'], settings: { masterVolume: 0.7, quality: 'normal' } }))
```

## Environment

Checkout `main` at `b9920e3` (= origin/main; nothing to push), origin `https://github.com/XZNON/night-at-the-museum.git`, Node v22.14.0, npm 10.9.2. The Vite dev server on 5173 (PID 20324, `vite --host 127.0.0.1 --port 5173 --strictPort`, this checkout) was reused. A preview on 4173 (PID 20108, this checkout, started in an earlier session) was serving an older build; it was stopped and a fresh `npm run preview` was started after `npm run build`. The committed art reference pass and heroine player were not touched; no asset was generated or prepared.

## What a player sees

- **Museum, new game:** a third frame, "Unfinished Sketch", on the left wall (centre x −5.82, y 2, z −1.5, facing into the room, 2.8×1.8) with a code-drawn cartoon placeholder: a cream page with pencilled layers, dashed unfinished boards, a pendulum, a lift shaft and a torch holding a pale glow (faceless). Locked it is dimmed; plaque and prompt say **"Restore the golden pear first"**; click and E do nothing. ([locked](locked-frame-1280.png), [open](open-frame-1280.png))
- **Placing the pear** opens it in the same visit (full colour, plaque "An enchanted light waits inside", prompt **"Click / E — Enter the Unfinished Sketch"**). The inspection message points to the Sketch on the left wall.
- **Inside:** the full S5A route with campaign words only (HUD eyebrow and build tag "The Last Curator"; pause **Restart adventure** = Layer 1, **Return to Museum**, Reset progress). Claiming the light shows "The enchanted light." — "The light leaves the torch and is yours. Carry it to the masterpiece: it will light the garden's dawn sky." with **Return to Museum** / **Keep exploring** ([success](campaign-success-1280.png)). A replay claim says "A lovely return visit. The enchanted light is already yours; replay adds no duplicate." ([replay](replay-already-yours-960.png))
- **Return to Museum** lands in front of the Sketch frame facing it (−2.7, −1.5, yaw π/2) ([return](return-pose-1280.png)).
- **Objectives:** pear missing "Inspect the masterpiece · Find its missing pear in Royal Supper" / pear owned "Bring the golden pear to the masterpiece" / pear restored "Claim the enchanted light in the Unfinished Sketch" / light owned "Bring the light to the masterpiece". **Inventory:** "Inventory · Enchanted light" with a CSS glow icon. In the inspection the light is shown as held; the sky's "Sun" target answers "The enchanted light will become this garden's sun. Placing it in the sky arrives in a later update; it stays in your inventory." ([inspection](production-light-inspection.png)) Menu note: "Royal Supper and the Unfinished Sketch are playable. Placing the enchanted light arrives in a later update."

## What changed

- `src/campaign/definition.ts`: stage 2 `artworkId`/`sceneId` `unfinished-sketch` (was `sleeping-mountain`), clue "Climb the Unfinished Sketch and claim its enchanted light." `golden-pear`, `sun-disc`, `pear-tree`, `dawn-sky`, campaign ID, save key and schema unchanged; `save.ts` untouched.
- `src/levels/museum.ts`: frames get `facing`; third frame `unfinished-sketch`; `sketchReturnPose`.
- `src/scenes/museum.ts`: each frame is a group turned by `facing`; the Sketch placeholder is drawn to a canvas texture; `sketchOpen` (constructed from the pear-restored flag, opened by `restoreColour()`); a locked hit returns "Restore the golden pear first" and never activates.
- `src/main.ts`: shared `createSketchScene()` for studies and the campaign; `startSketchAdventure(restart)` (refuses unless the pear is restored, never on an isolated entry) with the light callback → `applyCampaignCommand({ collect, unfinished-sketch, sun-disc })` → `persist()` on `changed` → `collect` cue → `GameUi.sketchSuccess(result)`; its own `campaignSketchSession` plus a generation counter bumped by reset; `leave()` returns to `sketchReturnPose` from the Sketch; replay restarts the campaign Sketch; `place()` answers the inert sky target; debug readback adds `museum.sketchOpen`, `campaignSketch` and `sketch.study: 'campaign'`.
- **Fix:** `startSketch()` and the Slice 1 bay hotkeys (Digit1–6) now require the dev Sketch entry. By code reading of HEAD the default `sketchMode` is `mechanics`, so a digit key in the museum could open the dev playground, also in production; this was not reproduced in a browser on HEAD. The new spec checks Digit1 does nothing in the dev and production museum.
- `src/ui/game-ui.ts`, `src/style.css`: menu texts, objectives, inventory (`.light-icon`), inspection (alt text without the mountain, held light, messages), campaign `sketchSuccess(result)`, `markSketch(…, campaign)`, pause "Restart adventure", build tag "THE LAST CURATOR" outside dev studies.
- Tests: `tests/progression.test.ts` uses the new artwork ID; new `tests/campaign-sketch.test.ts`; new `tests/browser/sketch-campaign.spec.ts`; `tests/browser/campaign.spec.ts` expects the new pear-restored objective (it expected "wake the sun … in development").

## Results

- `npm run typecheck`, `npm run build` pass (existing >500 kB chunk warning).
- Unit: `tests/campaign-sketch.test.ts` 5/5 (renamed stage, retired ID unknown; pear-missing and pear-owned saves: `LOCKED_STAGE`, nothing written; pear-restored save: awarded once and written, replay unchanged and not written, reload unrepaired; light-owned save: unrepaired, claims add nothing, restore still possible through the boundary; frame and return-pose geometry). Full suite `npx vitest run` **229/229 with the default 5 s timeout** this time (the accepted S4B grip-window test stayed under 5 s; `--testTimeout=30000` was not needed). No accepted measurement JSON changed (`git status` clean under `docs/validation` after the run).

Browser (`tests/browser/sketch-campaign.spec.ts`, headed, dev normal entry on 5173 and production on 4173; real keys, mouse drags and clicks; shared S5A/S4 helpers; no `src` edit during any run): **5/5 on the first run**, no bot retry anywhere (each crossing on its first attempt, no Layer 2 retry).

| Case | Result | What it covers |
| --- | --- | --- |
| Locked frame, opening, transition spam (1280) | pass 19 s | New game: frame locked, click/E ×4 and Digit1 open nothing, no save written. Pear owned: still locked. Pear placed by click: the frame opens in the same visit; the sky target is inert. E + click spam ×5 opens exactly one Sketch (one canvas, Layer 1 start, campaign HUD with no dev words). Pause shows Restart adventure / Return to Museum; a real double click on Return lands once at the Sketch return pose. Three E/Return round trips: same pose and prompt, museum resources constant (17 geometries, 3 textures). |
| Campaign route 1280 (pear-restored save) | pass 68 s | Full route; the light was claimed in the air by the last swing. Success screen paused/settled; save is exactly the light-owned save; Keep exploring + R stays on the ledge without a second report; Return to Museum: pose, inventory "Enchanted light" with icon, objective; same-session re-entry resumes the ledge with the light taken and no report; reload during the Sketch → Continue → museum, campaign checkpoint gone, the Sketch restarts at Layer 1 with the torch lit, save unchanged. |
| Denied writes, then replay (960) | pass 120 s | Stored pear-restored save readable, every write throws. First route: claimed in the air; "Progress remains in memory" notice; in-memory progression owns `sun-disc`, stored save unchanged. Return, re-enter, Restart adventure → Layer 1, torch lit. Second route: landed before the light, walked to it; "already yours"; still one `sun-disc`; Return pose and objective. |
| Fully denied storage | pass 4 s | "Storage is unavailable" notice, new museum playable, frame locked and refusing E, no page errors. |
| Production seeded saves (1280) | pass 20 s | For no save / pear owned / pear restored / light owned with `?scene=unfinished-sketch&study=adventure`: study ignored (normal menu, no `__curatorDebug`, tag "THE LAST CURATOR", no Mountain/S5A text), objective and inventory as above, Digit1 ignored, walking by timing to the frame gives the locked or open prompt; open frames enter the Sketch (campaign HUD, Restart adventure) and Return lands at the frame. Light owned: icon, inspection shows the held light, inert sky target message, save untouched. ([new](production-new.png), [pear owned](production-pear-owned.png), [pear restored](production-pear-restored.png), [light owned](production-light-owned.png)) |

Every campaign Sketch HUD sample (Layer 1 entrance, Layer 3 arrival, handoff, ledge before the light, after the claim) and both success screens were checked against `S1–S5`, "review", "endpoint", "isolated", "study" and "mountain"; none appeared. The texts are recorded in the case JSON files.

Regressions (headed, after the S5B runs; the S5A spec writes into `s5a/light/`, so its outputs were moved to [regressions/](regressions/) and the accepted S5A files restored from git each time):

| Run | Result | Notes |
| --- | --- | --- |
| 1: `campaign.spec.ts` + `sketch-adventure.spec.ts` | 7/9 (11.5 min) | campaign: full production loop (Supper twice, pear placement, the new pear-restored objective, replay, reset), drag and keyboard placement, museum input contexts pass; **"malformed saves and denied storage" failed** in the unchanged Royal Supper bot route ("Expanded section after-butter": four checkpoint retries at the butter). S5A: both full routes and the menu/production case pass; **reduced motion failed** with four bot glue retries at the crossing ("no crossing in four real-control attempts"), the flake already recorded on 2026-10-07 for S4C/S4D, also on HEAD. [run1/](regressions/run1/) |
| 2: the two failed cases only | **2/2** (3.5 min) | Denied storage passed (Supper route with one retry at the butter); S5A reduced motion crossed on its first attempt, landed before the light and walked to it. [run2/](regressions/run2/) |

Reading: neither failure touches S5B code paths (the Supper scene, its route and the Sketch route model are unchanged; the S5A study still uses its own isolated callbacks), and both passed on an immediate rerun. Recorded as bot flakes, not one clean regression suite.

## Known and open

- The museum's Sketch placeholder still shows the torch lit after the light is claimed (code-drawn placeholder; final art belongs to the art task or S5C).
- The museum prompt box overlaps the lower half of the frame plaque at the return distance (same layout as the other frames).
- On the end ledge after the claim the HUD still reads "Click wood (strip or bar) to drive a nail" (S5A known item; nails are refused there).
- No new audio: the claim reuses `collect`, the return reuses `return`, the Sketch reuses the existing scene ambience.

## Limits

Scripted input on this machine. Bot feasibility is not measured human difficulty, first-time duration or representative-machine performance. The user has not yet played the campaign Sketch. S5C (placing the light as the sun, the complete picture and the ending) is not implemented.
