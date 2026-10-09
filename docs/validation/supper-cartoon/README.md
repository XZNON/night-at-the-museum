# Royal Supper cartoon rework (2026-10-09)

On the user's request, ahead of release prep. The user chose: **match the Sketch's cartoon style** (bold ink outlines, cel shading, poppy colours); **everything visible**; **code animation plus drawn diner pose frames**; **DreamLayer reference sheets cut locally**. A three-image pilot (backdrop, food, diner) was shown as a game-scale mock and approved by the user before the rest was generated. Gameplay, collision, landing edges, timings, level data, save identities and the golden pear are unchanged.

## Generation (DreamLayer, 1 credit per image; balance 54 → 44)

Script: `scripts/art-references.mjs supper v1 …` (the Sketch reference script generalised by world; `scripts/sketch-references.mjs` remains as a wrapper so recorded Sketch commands still work). Prompts: `asset-sources/prompts/supper-*.txt`; outputs: `asset-sources/references/supper/*-v1.png`; execution IDs, hashes and balance deltas in `asset-sources/manifest.json`.

| Reference | Result |
| --- | --- |
| `backdrop` (16:9) | Cartoon banquet hall: curtains, windows, six guests, a long feast table. Used. The local CLI stream ended ("terminated") while the job ran; the image was recovered with the same idempotency key (balance 51 before and after the retry: no second charge). |
| `food` (16:9) | Bread, butter, crumb, cake, jelly, grape. Used. |
| `diner` (4:3, came back square) | Came back smiling at the viewer, not eating; only the parent of the three pose edits. |
| `backdrop-b` (edit) | Asked for different guests in the same hall; came back square and re-framed, so it cannot tile beside A. Cropped into the museum's Royal Supper painting. |
| `diner-eat`, `diner-turn`, `diner-look` (edits) | The three attention poses, same registration. Used. |
| `tableware` (16:9) | Basket, goblet, casserole, platter used; its fork lost the tines (unused). |
| `candles` (16:9) | Wax, flame, ember wick, fan, flag used; of the candelabrum only its foot (its cups are narrower than the route's 3-unit candles). |
| `fork` (9:16) | Upright fork replacing the sheet's. Used. |

## Preparation (local, 0 credits)

`scripts/prepare-supper-cartoon.py` keys the sheet background (colour key plus a border flood for the diner edits' paper texture, eroded two pixels so no pale halo), crops measured boxes, lifts colour like the Sketch skins, and writes 30 WebP files to `public/assets/supper/cartoon/` (856 KB in all; the earlier PNG cut was 3.7 MB). Board: `asset-sources/production/supper-cartoon-v1/runtime-board.png`; pilot mock: `pilot-review.png`.
- Backdrop: 2048×1152, saturation 0.72, a 26% dusk haze, the tablecloth drape below the far table edge darkened to 42% (drops still read).
- Strips (left cap, seamless middle tile, right cap): bread, butter, cake, platter.
- Casserole recoloured teal → plum-crimson (teal hues only): the heroine's teal smock blended into it.
- Museum painting: `backdrop-b` cropped to the side frames' 2.8 × 1.8 shape (was 16:9).
- The M3 Supper runtime files (DreamLayer scenery, cohesion-v1, ImageGen props) moved to `asset-sources/production/supper-m3-runtime/` (out of the bundle); their manifest entries point there and are marked retired. The historical M3 scripts still name the old `public/` paths.

## Scene changes (presentation only)

`src/scenes/royal-supper.ts`, `src/assets/supper-props.ts`, `src/assets/manifest.ts`:
- Backdrop 26 units wide (whole hall in view), its far table edge just below the route's ground; mirrored tiles; world background matches the drape's foot.
- Skins sized from each picture's proportions at runtime; strips repeat a whole number of middle tiles; the basket and jelly are drawn deeper than their colliders (jelly in front of its dish); a tall goblet block (the grape chute) is the goblet itself. Exact landing-edge lines kept.
- The diner is a giant guest seated behind the far table edge (6.2 units tall, the bust's flat foot hidden behind the platters), swapping eat / turn / look textures by attention phase; gaze rays start at the measured eyes of the look pose.
- Candles: cartoon flame over a faint glow of the full hazard rect; while out, a smoking wick and the ember timer bar (now warm orange); brass dishes, posts, crossbar and stem drawn in code with the drawn foot.
- Velvet canopy with a gold band over the candles; fork slimmer than its picture and offset so the toppled fork's top edge sits on the bridge's landing top; plum casserole covers (the cyan side/top outline boxes removed; the cyan floor strip that confirms hiding is kept).
- Checkpoint flags: dim until reached, then bright and waving.
- Code animation (all off under reduced motion, frozen with pause): flame flicker, chewing bob, look lean-in, jelly squash on bounce, flag wave.

## Verification

- Typecheck and production build pass (the >500 kB chunk warning predates this). Unit tests 242/242 (`--testTimeout=30000`); `docs/validation/sketch-s4/s4b/unit-measurements.json` unchanged. The production preview was restarted after each build.
- New `tests/browser/supper-cartoon.spec.ts`: plays the isolated dev route with the recorded real-keyboard schedule and captures every section end plus candle and diner frames; asserts no page errors and no failed requests. `before/` was captured on the old art, `after/` on the final art. Passed every run; the butter section needed one or two bot retries in most runs (the known timing flake).
- `art.spec.ts`: first run failed only because it aborted the old `props/fan.png`; updated to `cartoon/fan.webp`, then passed.
- `audio.spec.ts`, `movement-lane.spec.ts`: pass.
- `campaign.spec.ts`: 5/6 on the first run; the production full-route case failed in the route bot at the pear stage (the pear was collected, the bot missed the overlay button four times under load); passed on one rerun. 6/6 overall.
- `blockout.spec.ts`: **fails, pre-existing.** It has not been updated since 2026-10-06 and still looks for the old pause menu's "Low rendering quality" checkbox, which the v1 polish (2026-10-08) moved into Settings as "Low quality"; it times out there, before any Supper art matters. It needs updating to the v1 menus (suggested for release prep).
- Museum: `after/museum-arrival` and `after/museum-supper-frame` (production, seeded save) show the new painting in the gilded frame.

## Captures

`before/` and `after/` (WebP, Chromium 1280×720 unless named 960): `start-1280`, `start-960`, `end-0-bread` … `end-6-pear`, `candles-play-1..3`, `diner-play-1..5` (after: 4 is the look pose with the gaze), `museum-arrival`, `museum-supper-frame`.

## Not verified

The user's own play-through of the new look; motion (flicker, bob, squash) only checked in stills; representative-machine performance; other browsers.

## User review (2026-10-09) — fixes planned for the next session

1. Visible bars on the assets the player lands on (the landing-edge lines; any other code-drawn bar or box) must go.
2. The casseroles look like they sink into the floor.
3. The ground should read as a table, with the cloth hanging to the bottom of the screen; no platter bars or code boxes.
5. The yellow line along the floor (the landing-edge lines).
6. The yellow line on the bread crumbs (their landing-edge line).
7. Grapes come too late (the first pair needs about 21 s from the chute to the entry) and only about three waves are met; they should already be rolling and come in a denser continuous stream.

(No item 4.) Prompt: docs/planning/NEXT_SESSION.md.
