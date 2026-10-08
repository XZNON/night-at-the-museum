# Sketch S5C — The light becomes the sun: placement and the ending (evidence)

2026-10-07. Implemented on the user's S5C-only request from the [S5C plan](../../../gameplay/SKETCH_S5C_PLAN.md). With the enchanted light in the inventory, the player places it in the masterpiece's dark sky (drag, click-then-target, or Tab/Enter); it becomes the dawn sun, the complete picture shows in the inspection and the museum frame, and the ending plays. The game is now complete from New Game to the ending: Royal Supper → golden pear → Unfinished Sketch → enchanted light → complete masterpiece → ending. Stop for user review. No new traversal, museum rebuild, opening, generation, new audio, dependency, commit/push, publishing or sub-agent work.

Play after `npm run dev`: [normal entry](http://127.0.0.1:5173/). To skip the adventures, seed a light-owned save in the browser console on that page and reload, then walk to the masterpiece (right of the Royal Supper frame on the back wall) and click it:

```js
localStorage.setItem('last-curator.save.v1', JSON.stringify({ schemaVersion: 1, campaignId: 'garden-before-dawn', collectedPieceIds: ['golden-pear', 'sun-disc'], restoredPieceIds: ['golden-pear'], settings: { masterVolume: 0.7, quality: 'normal' } }))
```

## Environment

Checkout `main` at `31ad72e` (= origin/main), with the uncommitted S5C planning docs from the previous session preserved; origin `https://github.com/XZNON/night-at-the-museum.git`; Node v22.14.0, npm 10.9.2. The dev server on 5173 (PID 20324, this checkout) was reused. The preview on 4173 (PID 14024, this checkout) predated the build; it was stopped and restarted after each `npm run build` (the second build followed the ending-spacing fix, before any recorded browser run).

## What a player sees

- **Light owned, inspection:** the held piece is the enchanted light's art (the painted sun with a warm halo) on a draggable button; the sky target reads "Sky" (aria "Sky silhouette for the enchanted light"); message "Drag the enchanted light into the dark sky, or select it and activate the sky. Tab / Enter also works." ([1280](production-light-owned-inspection.png), [960](production-light-owned-inspection-960.png))
- **Wrong drops keep the light:** elsewhere on the painting or on the restored pear → "That is not the sky's empty sun. The light stays in your inventory." The sky without a selection → "Choose the enchanted light, then the dark sky. The light stays in your inventory." Before the light: "Claim the enchanted light in the Unfinished Sketch first."; before the pear: "The pear comes first: restore the golden pear." ([before the light](production-sky-before-light.png))
- **Placement:** the `restore` cue; the save is written at once; the museum frame switches to `complete.webp`; the inspection shows the complete picture with the colour-restore animation and a warm glow from the sun ([mid-animation](campaign-restoring.png)); about 1.7 s later the ending opens (at once under reduced motion).
- **Ending:** "The Garden Before Dawn / Restored.", the complete picture, "The golden pear, home from Royal Supper." / "The enchanted light, carried out of the Unfinished Sketch, rises as the garden's sun.", "The gallery is quiet again. The garden has its dawn.", **Stay in the museum** (focused; Escape) and **New game (reset progress)** (the existing confirmation; Keep progress returns to the ending). ([1280](production-drag-ending.png), [960](production-960-ending.png), [campaign](campaign-ending.png))
- **After completion:** objective "The Garden Before Dawn is complete", inventory empty, masterpiece plaque "The garden at dawn, restored" ([museum](production-complete-museum.png)); the inspection shows the complete picture, both targets restored, no piece and **See the ending** ([inspection](production-complete-inspection.png)); menu note "The Garden Before Dawn is complete. Both paintings stay open to replay." ([menu](production-complete-menu.png)); the Sketch frame shows an empty torch with a pencilled wisp and still opens ([frame](production-complete-sketch-frame.png), [empty torch with the light owned](sketch-frame-empty-torch-1280.png)). The Royal Supper replay note for a restored pear now says "The golden pear already hangs in the masterpiece."; the Sketch replay says "already yours". No "later update" text remains.

## What changed

- `scripts/prepare-light.py` (new): crops 128×128 around the sun from `complete.webp`, keeps the painted disc by `sun-mask.png` (dilated 1 px) and adds a feathered warm halo; writes only `public/assets/restoration/light.png` (crop box 1234,190,1362,318; 30,236 bytes; sha256 `7cbc15bf…`) and its `restoration.light` manifest entry (DreamLayer source, `local_preparation`, 0 credits). `prepare-art.py` was not rerun; nothing was generated. `masterpiece.complete` and `restoration.light` are marked integrated after the camera checks below. Inspected at 1× and 2× on the inspection background before integration.
- `src/assets/manifest.ts`: `restoration.light`, `masterpiece.complete` in `runtimeAssets` and `museumArtIds`.
- `src/campaign/placement.ts` (new, pure): `nextPlacement(state)` (next stage, owned or not, or complete), `checkPlacement(state, piece, target)` (ok + stage, or the player message), `isComplete(state)`.
- `src/ui/masterpiece.ts`: `masterpieceStageArt(count)` / `masterpieceImage(count)` for damaged / pear-restored / complete.
- `src/scenes/museum.ts`: constructor takes `{ restored, lightTaken }`; `setRestored()` replaces `restoreColour()` (texture by count, Sketch frame lock, plaques, empty-torch redraw on the same canvas texture).
- `src/ui/game-ui.ts`: inspection for every state (only the next owned piece is offered; light piece button; sky target; complete state with See the ending; sun glow when animating), `ending()`, menu note by completion, Supper success note fix, inventory icon from the light art (the S5B CSS glow is removed). `src/style.css`: piece icon, placed sky ring, sun glow (off under reduced motion), ending layout.
- `src/main.ts`: `place()` validates with `checkPlacement` and restores through `applyCampaignCommand`, persists before animating, updates the museum, then shows the ending (timer owned and cleared on close/reset/dispose); overlay `ending` (Escape = Stay, `resume` refuses while it is open, reset from it returns to it on Keep progress); debug readback `overlay`, `campaignComplete`, `museum.restored`.
- Tests: `tests/campaign-placement.test.ts` (9 new: next placement, accepted/refused placements and messages, persist-on-restore and reload as complete with no stored flag, no change after completion, corrupted save, stage art, manifest entry/hash). `tests/browser/sketch-ending.spec.ts` (5 new). The S5B spec's helpers moved verbatim to `tests/browser/campaign-controls.ts` for reuse; S5B and campaign specs updated for the new sky label/messages and the light icon; `campaign.spec.ts` also checks the Supper replay note.

## Results

- `npm run typecheck`: pass. `npm run build`: pass (JS 760 kB / 198 kB gzip; the existing >500 kB warning).
- Unit: 238/238 with `--testTimeout=30000`. With the default timeout the accepted S4B test "measures the M1 grip windows…" exceeded 5 s again (237/238), as on HEAD; no evidence JSON was rewritten by the unit runs.
- **S5C browser** (`tests/browser/sketch-ending.spec.ts`), final clean run 5/5 in 5.6 min:
  1. Production drag: wrong drops on the painting and on the restored pear keep the light (save unchanged); drop on the sky → saved complete at once, complete picture, glow, ending; New game → Keep progress returns to the ending; Stay → complete museum; reload → complete menu note, museum and inspection; clicking the painting changes nothing; See the ending; Escape = Stay; the Sketch frame still opens; New game from the ending → Confirm → fresh museum, save key removed, another key kept, Sketch frame locked. No page errors, no HTTP ≥ 400.
  2. Production click: the sky without a selection keeps the light; select, then the sky; **reload during the restore animation** → complete everywhere.
  3. Production keyboard (Tab, Enter, Tab, Tab, Enter); sky refused before the pear and before the light (saves unchanged); **denied writes**: placement and ending in memory with "Progress remains in memory", stored save still light-owned.
  4. 960×540: keyboard placement, ending and complete inspection buttons in the viewport.
  5. **Dev full campaign with real controls at 1280×720**, 4.8 min: New Game → Royal Supper (bot route 2.6 min, three ordinary bot retries: two at the butter, one caught by the diner) → Return → pear by drag → Sketch frame (open) → full route and claim (first crossing try; the light was taken in the air by the last swing) → Return in front of the frame, empty torch → masterpiece → light by click → ending (`overlay: ending`, `campaignComplete: true`, `museum.restored: 2`) → Stay (unpaused, complete objective) → Sketch re-entry resumes the end ledge, Restart adventure → full route again → "already yours", save byte-identical → Return → Reset progress → Confirm → fresh museum, frame locked.
- Run history for the S5C spec: run 1 production 4/4, the full campaign lost its page context on its first line (a dev-server reload of the freshly opened page; fixed by waiting for the load); run 2 reached the ending, then failed the post-ending replay because the test expected Layer 1 while same-session re-entry correctly resumes the ledge (test fixed to use Restart adventure, as S5B's replay does); run 3 passed; the final clean run passed all 5. One test fix before run 1: the 960 case walked again from the masterpiece after Stay.
- **Regressions:** `campaign.spec.ts` 5/5 (6.6 min). `sketch-campaign.spec.ts` (S5B) 4/5, then the failed case passed on rerun: "S5B campaign route…1280" timed out pinning wall C at the Layer 3 climb entrance (body grounded at 4.2, 24.4) — a Sketch-route bot timing failure in code S5C did not touch. `sketch-adventure.spec.ts` (S5A) 3/4, then the failed case passed on rerun: the reduced-motion case had "no crossing in four real-control attempts", the same bot flake recorded on 2026-10-07 for S5A/S4C/S4D, also on HEAD. Outputs of these runs are in [regressions/](regressions/) (s5a/, s5b/, and the S5A failure capture in run1-failures/); the accepted s5a/ and s5b/ evidence files were restored from git.
- Captures were inspected by the agent: the light cutout, the light-owned inspection (1280/960), mid-animation glow, the ending (1280/960), the complete museum frame, inspection and menu, and the empty torch on the Sketch frame.

## Gate

One complete New Game → ending journey with real controls passed; the restored/complete state survives reload at every boundary (pear placed and light claimed: campaign/S5B specs; light placed and during the animation: S5C cases 1–2); no duplicate awards (replays after completion leave the save byte-identical; unit tests); reset works from the ending; every regression passed or has a recorded flake that passed on rerun. **S5 is complete at this automated gate; stop for user review.**

## Known and open

- The ending opens by timer 1.7 s after placement; closing the inspection first cancels it (See the ending reopens it). Review question: is the moment long enough to see the sun arrive, and should the ending also offer a direct look back at the painting?
- The ending's New game keeps the plan's wording "New game (reset progress)"; the pause menu keeps "Reset progress".
- The Sketch frame is still the code-drawn placeholder (now with an empty torch); the Sketch DreamLayer art pass is a separate request.
- The restored sky target keeps a faint ring over the painted sun so it stays findable for assistive technology; it hides its label.

## Limits

Automated real-input checks and agent visual inspection only; no human playtest of S5C, no measured first-time human duration, no representative-machine performance claim. Chromium only. Cross-browser, fullscreen, itch.io iframe and actual OS focus loss remain release checks.
