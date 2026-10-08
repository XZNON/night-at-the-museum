# Sketch S5C — The light becomes the sun: placement and the ending (plan)

**Implemented 2026-10-07 at its playable review gate** ([evidence](../validation/sketch-s5/s5c/README.md)); the defaults below were kept. This plan is now historical.

2026-10-07, planning only, on the user's request after S5B was committed and pushed (`31ad72e`). This refines the S5C section of the [S5 plan](SKETCH_S5_PLAN.md) with the facts verified in the code after S5B and the user's enchanted-light decisions. Paste-ready prompt: [SKETCH_S5_PROMPTS.md](SKETCH_S5_PROMPTS.md#s5c--the-light-becomes-the-sun-and-the-ending) (also in NEXT_SESSION). S5C is one block with one playable review gate; split it into S5C1 (placement) and S5C2 (ending and full-campaign run) if the session runs short, never by skipping the gate.

**Playable result:** with the enchanted light in the inventory, inspecting the masterpiece lets the player drag it, click it then the sky target, or use Tab/Enter to place it in the dark sky. The light becomes the dawn sun, colour spreads to the full picture (`complete.webp`), the museum frame updates and the ending plays. The game is complete: New Game → Royal Supper → pear → Unfinished Sketch → light → complete masterpiece → ending.

## 1. Facts verified after S5B (recheck at the start)

- **Campaign:** stage 2 is `unfinished-sketch`, piece `sun-disc`, region `dawn-sky` (`src/campaign/definition.ts`). `Progression.applyCampaignCommand({ action: 'restore', artworkId: 'unfinished-sketch', pieceId: 'sun-disc' })` already works once the light is collected and the pear restored, and returns `complete: true` (unit-tested in `tests/campaign-sketch.test.ts`). Completion is `restoredPieceIds.length === stages.length`; nothing else is stored.
- **Masterpiece images** (`public/assets/restoration/`, all 1600×900, aligned): `damaged.webp`, `pear-restored.webp` (the sun is a dark disc), `complete.webp` (warm painted sun with a halo; manifest `masterpiece.complete`, status `prepared`, not in `runtimeAssets`). `sun-mask.png` is the aligned sun region (bbox x 1252..1344, y 213..296); `museum.targets.sun` (left 78.4 %, top 24 %, 5.3×8.5 %) covers the same region.
- **Runtime manifest** (`src/assets/manifest.ts`): `masterpiece.damaged`, `masterpiece.pear-restored`, `restoration.pear`; `museumArtIds` loads those plus `royal-supper.entrance`. `src/ui/masterpiece.ts` `masterpieceImage(restored: boolean)` picks between two images only.
- **Museum scene** (`src/scenes/museum.ts`): the constructor takes a `restored` boolean (pear restored) that picks the masterpiece texture and opens the Sketch frame; `restoreColour()` swaps to `pear-restored` and opens the frame. The Sketch frame picture is code-drawn and always shows the torch lit (S5B review note).
- **Inspection** (`GameUi.inspection`, `src/ui/game-ui.ts`): pear button (`data-piece="golden-pear"`, draggable, `restoration.pear` art), pear target, sky target (`data-target="sun-disc"`, label "Sun", aria "Sun silhouette"). When the light is owned it shows a non-interactive "Enchanted light" item with a CSS glow (`.light-icon`). Messages and the piece-selected text are pear-specific. The `.restoring` CSS animation (desaturated → colour, 1.2 s) runs when `animate` is true (never under reduced motion).
- **Placement** (`place()` in `src/main.ts`): only `golden-pear` on its own target restores; the sky target answers an inert message (S5B). On success: `persist()` synchronously, `restore` cue, `activeMuseum()?.restoreColour()`, `ui.museumState`, `ui.inspection(state, animate)`.
- **Overlays** (`main.ts`): `menu | none | pause | inspection | success | reset`. `requestReset` stores `beforeReset`; `cancelReset` returns to menu, inspection, pause or play. `confirmReset` clears the save key only, resets progression, settings, the Supper session and the campaign Sketch session, then enters a fresh museum.
- **Texts still saying "later update":** menu note "Placing the enchanted light arrives in a later update"; sky-target message; inspection message when the light is owned. Objective for a restored light already reads "The Garden Before Dawn is restored" (S5B fallback).
- **Supper success after completion:** its small note says "Your pear is in inventory. Walk to the masterpiece to place it." even on a replay after restoration (older copy). The Sketch replay says "already yours" correctly.
- **Tests to reuse:** `tests/browser/campaign.spec.ts` (production Supper loop helpers `supperRoute`, `inspectFromSpawn`, `inspectFromReturn`, placement by click/drag/keyboard), `tests/browser/sketch-campaign.spec.ts` (seeded saves, `toSketchFrame`, `toEndLedge`, `claim`, production blind walk), `tests/browser/expanded-route.ts`.

## 2. Defaults chosen in planning (user may override at the gate)

1. **The light's piece art:** a local cutout of the painted sun from `complete.webp` with a soft halo, masked by `sun-mask.png` widened by a feathered glow (about 128×128 PNG, `public/assets/restoration/light.png`). Runtime ID `restoration.light`, provider DreamLayer, operation `local_preparation`, 0 credits, recorded in `asset-sources/manifest.json`. It replaces the CSS glow in the museum inventory and the inspection, so the piece the player drags is exactly what appears in the sky (like the pear). Prepared by a new small script (e.g. `scripts/prepare-light.py`) that writes only this file and its manifest entry; do not rerun `prepare-art.py`. No generation.
2. **Sky target wording:** visible label "Sky", aria-label "Sky silhouette for the enchanted light"; keep `data-target="sun-disc"`. (Existing tests that click "Sun silhouette" are updated.)
3. **Placement flow:** identical to the pear: drag onto the target; click the piece then the target; Tab to the piece, Enter, Tab to the target, Enter. A drop elsewhere on the painting or on the restored pear keeps the piece ("That is not the sky's empty sun. The light stays in your inventory."). Before owning the light the target says "Claim the enchanted light in the Unfinished Sketch first."; before the pear is restored it says "The pear comes first: restore the golden pear."
4. **Restore moment:** `restore` cue, the museum texture switches to `complete.webp`, the inspection re-renders with the complete picture and the existing `.restoring` animation plus a short warm glow from the sun position (CSS only; none under reduced motion). After the animation (or at once with reduced motion) the ending overlay opens.
5. **Ending overlay** (new overlay `ending`): eyebrow "The Garden Before Dawn", heading "Restored.", one line per recovered piece ("The golden pear, home from Royal Supper." / "The enchanted light, carried out of the Unfinished Sketch, rises as the garden's sun."), a short closing line, buttons **Stay in the museum** (closes to the museum, unpaused) and **New game (reset progress)** (opens the existing reset confirmation; Keep progress returns to the ending). Escape = Stay. Focus trap as other modals.
6. **After completion:** objective "The Garden Before Dawn is complete"; inventory "Empty"; menu note "The Garden Before Dawn is complete. Both paintings stay open to replay."; inspecting the masterpiece shows the complete picture, both targets marked restored, and a **See the ending** button; the Sketch frame's placeholder shows an empty torch once the light is owned or restored (redraw on state); Royal Supper and the Sketch stay replayable and say "already yours" (fix the Supper small note for owned/restored pears).
7. **Museum texture:** `MuseumScene` takes the restored count (0/1/2) instead of a boolean; a `setRestored(count)` replaces `restoreColour()` and also redraws the Sketch frame state.
8. **Audio:** reuse `restore` for the placement and `collect` (or nothing) for the ending; no new files.
9. **Texts:** no "later update" text remains anywhere once S5C lands; no Mountain text; dev studies keep their own texts.

## 3. Contracts

- **One boundary:** only `applyCampaignCommand` restores; `place()` validates piece = target = the next stage's piece (generalised from the pear; extract a small pure helper such as `nextPlacement(state)` returning the placeable piece or a reason, unit-tested).
- **Persist before animating:** the save is written synchronously before any animation, so a reload during the animation shows the complete picture and the ending is reachable from the inspection.
- **Derived completion:** "complete" comes from progression (`result.complete` / restored count), never a stored flag; validated saves with both pieces restored load as complete.
- **No duplicate awards:** replays after completion change nothing; a second placement attempt is impossible (no piece left) and harmless if forced.
- **Reset:** the ending's New game goes through the existing confirmation; Keep progress returns to the ending; Confirm clears only this game's key and gives a fresh museum (frame locked again).

## 4. Implementation order

1. Verify HEAD (`31ad72e` or newer), origin, Node/npm, dev-server ownership (5173 dev, 4173 preview from this checkout; restart a stale preview after building).
2. Art prep: `scripts/prepare-light.py` → `public/assets/restoration/light.png` + manifest entry; add `restoration.light` and `masterpiece.complete` to `runtimeAssets` and `museumArtIds`; mark `masterpiece.complete` integrated after camera checks. Inspect the cutout at 1×/2×.
3. Pure helpers + unit tests: `masterpieceStageImage(restoredCount)`, `nextPlacement(state)`; museum objective/inventory/menu texts if extracted.
4. Museum scene: restored count, `setRestored()`, Sketch frame empty-torch redraw.
5. UI: inspection for every state (pear owned / pear restored / light owned / complete), light piece button (drag, click, keyboard), sky target, messages, `.restoring` + glow, ending overlay, "See the ending", menu note, Supper success note fix.
6. `main.ts`: generalised `place()`, overlay `ending`, Escape/blur handling for it, reset from the ending (`beforeReset = 'ending'`, `cancelReset` back to the ending), debug readback `campaign.complete`.
7. Tests (below), docs, evidence.

## 5. Verification

- `npm run typecheck`, all unit tests (`--testTimeout=30000` only if the S4B grip-window test exceeds 5 s again; say so), `npm run build`.
- **Production (4173), seeded saves:** light owned → place by drag, by click, by keyboard (three separate cases); wrong drops keep the piece; ending overlay; reload → objective complete, complete picture in the museum and inspection, See the ending; reload during the restore animation (immediately after placement) still complete; pear-restored save: the sky asks for the light first; Keep progress / Confirm reset from the ending; malformed/denied storage still playable (placement in memory, notice).
- **Dev entry full campaign (5173), real controls, 1280×720:** New Game → Royal Supper (existing helpers) → return → place the pear → walk to the Sketch frame → full route and claim (S5A/S5B helpers) → Return → walk to the masterpiece → place the light → ending → Stay → objective complete; then replay the Sketch (and the Supper, if time allows) with "already yours" and no save change; New game via the confirmation → fresh museum, frame locked. 960×540 spot check: seeded light-owned save, keyboard placement, ending layout screenshot.
- **Regressions:** `campaign.spec.ts` (its "Sun silhouette" clicks change with the new label), `sketch-campaign.spec.ts` (S5B: inventory icon and inspection expectations change), `sketch-adventure.spec.ts` (S5A; move its outputs out of `s5a/` and restore the accepted files), any touched art/audio/blockout spec. Record bot retries/flakes honestly (Supper butter retries and the S5A/S4C/S4D reduced-motion crossings were flaky on 2026-10-07).
- Do not edit `src` during a browser run. Restore accepted evidence JSON rewritten by unit runs.
- Evidence in `docs/validation/sketch-s5/s5c/`; update PLAN, NEXT_SESSION, DECISIONS, REQUIREMENTS (FR25, release checklist item "New game reaches a complete restored masterpiece and ending"), AGENTS and the docs index.

**Gate:** one complete New Game → ending journey with real controls; the restored/complete state survives reload at every boundary (pear placed, light claimed, light placed, during the animation); no duplicate awards; reset works from the ending; every regression passes or has an honestly recorded, reproduced-on-rerun flake. Then S5 is complete; stop for user review. S6 (refinement from human play) and the Sketch DreamLayer art pass follow on their own requests.

## Out of scope

New traversal or mechanics, the museum rebuild (M5), the opening (M6), final Sketch art or any DreamLayer/ImageGen generation, new audio, publishing/jam submission, commits/pushes without the user's authorization, sub-agents.
