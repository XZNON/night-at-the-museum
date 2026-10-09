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

## User review (2026-10-09)

1. Visible bars on the assets the player lands on (the landing-edge lines; any other code-drawn bar or box) must go.
2. The casseroles look like they sink into the floor.
3. The ground should read as a table, with the cloth hanging to the bottom of the screen; no platter bars or code boxes.
5. The yellow line along the floor (the landing-edge lines).
6. The yellow line on the bread crumbs (their landing-edge line).
7. Grapes come too late (the first pair needs about 21 s from the chute to the entry) and only about three waves are met; they should already be rolling and come in a denser continuous stream.

(No item 4.) All fixed in the session below.

## Review fixes (2026-10-09)

One change at a time, each shown to the user as a screenshot board before moving on (boards in `review-fixes/`). New art is cut locally from the existing references (`scripts/prepare-supper-cartoon.py`, 0 credits; DreamLayer balance still 44): `fork-bridge`, `cloth`, `cloth-left`/`cloth-right`, `velvet`, `trim`, `stand-cup`, `stand-stem` (85 KB of WebP in all, recorded in `asset-sources/manifest.json`; the earlier 30 files re-export byte-identical).

1. **Landing lines and bars** (`item1-landing-board.webp`). The landing-edge lines, the fork-landing strip and the candle-top boxes are gone. Each skin has a measured `surface` share so its drawn top edge sits on the collider top: the cake was drawn 0.21 u low (feet now on the frosting, the strawberries behind), the wax rim and basket rim moved up slightly; bread, butter, plates and jelly were already within 0.02 u. The toppled fork swaps (halfway through the topple) to `fork-bridge.webp`, its rows left-aligned so the top edge is straight along the bridge. The ember bar became the wick's glow growing until relight plus a small flame flickering back for the last 0.45 s (steady under reduced motion); the cover strip became a warm halo behind the casserole and the player falling into its shadow while HIDDEN. Hints and the flame cue reworded.
2. **Casseroles** (`item2-covers-board.webp`). Drawn in front of the floor art (behind the player), lowered by the picture's 0.04 u bottom margin so the base touches the walking line, over a soft contact shadow.
3. **The table** (`item3-table-board.webp`, mock `item3-floating-mock.webp`). One tablecloth segment per ground run (touching runs share one cloth; under a butter slab the cloth starts at the slab's foot), its straightened, thinned edge line on the collider top, hanging to y −2.9 below every view, with a shaded fold at each end over a pit; pits stay dark gaps. The platter strips on the ground are gone; the raised grape dishes and the goblet arch stand on goblets on the cloth. For the floating bread section and the dessert ascent the user picked **goblet stands** (B) from three in-game mocks (as now / goblet stands / ribbons; the temporary mock switch and spec were removed): the goblet's cup at its own proportions under each piece and its straight stem repeated down past the view; no collision. The canopy is velvet from the backdrop curtains with a gilt trim from a portrait frame along its underside (user).
4. **Grapes** (`item4-grapes-board.webp`; gameplay change asked for by the user). Period 6.5 → 3.5 s (the user chose it over 3.0 and 4.0 after seeing the tuning; all three have a recorded route), `wakeX: 99` and `preroll: 23.1`: the run is full on arrival (11–12 grapes on the ground at any moment), nothing pops into view, an after-butter retry always starts with the last pair just off the entry and the next 2 s away, and grapes still roll off at x 168. `grapeRects` is a pure export of the model. The route recorder records each grape-section move on a grape-free copy and starts it at the first frame whose whole path keeps 0.45 u clear of the stream (it waits on the dishes): grape stage 24.7 s. New unit tests: run full on arrival, still pairs, never past the entry at any phase, clock wakes at the butter, retries reset the phase.

5. **Remaining code shapes** (`item5-code-shapes-board.webp`; user follow-up: "still code blocks on top of the cauldron and other places"). The candle holder's brass boxes became gilt bars (the frame trim) on goblet-stem posts; the flame's rectangular heat box a soft round glow; the canopy's straight-cut ends (one showed as a red block above the first casserole) got gilt edges; three gold cones above the king's plate were removed. Left in code but never in view: a floor slab below every camera and a fallback for art types that no longer exist.
6. **Plates on the goblets** (`item6-goblet-plates-board.webp`; user: "the golden glasses have plates on them but they still have the blocks on them as well"). A raised dish's plate strip filled its whole 0.6 collider, so its middle read as a slab under the plate rim. Each raised dish (grape dishes, goblet arch, dessert shelf/drop, king's plate) is now a stack of three thin plates at the platter's own proportions filling the same collider; the solid underside the player can bump into stays visible.

### Verification

- Typecheck and production build pass (the >500 kB chunk warning predates this). Unit tests 244/244 (`--testTimeout=30000`; two new grape tests); `docs/validation/sketch-s4/s4b/unit-measurements.json` unchanged. The production preview was restarted after each build.
- Browser (Chromium): `art.spec.ts`, `audio.spec.ts`, `movement-lane.spec.ts` pass. `campaign.spec.ts`: 5/6 on the first run; the production full-route case failed in its replay leg, where the route bot missed the butter stage four times (no hazard cue: the known wall-clock flake; the butter is unchanged); it passed on one rerun (butter retries 1 and 2). 6/6 overall. `supper-cartoon.spec.ts` passes every run (final run: one butter and one dessert bot retry). The grape stage passed first try in every browser run, dev and production.
- `blockout.spec.ts` is updated to the v1 menus (quality on the pause menu's Settings page as "Low quality", the "Paused" title) and passes (two butter bot retries).
- Headless Chromium renders about 145 fps at the bread and butter views, so the table art does not slow the bots.
- Order: after the main run, presentation-only changes followed: the lowest bread slice's stand, then item 5 (holder, heat glow, canopy edges, cones), then item 6 (plate stacks). After each, typecheck and build were rerun, the preview restarted, and `art.spec.ts` and `supper-cartoon.spec.ts` (these captures) rerun (latest build: `art.spec.ts` passed; `supper-cartoon.spec.ts` failed once when the butter bot missed four times under machine load, other apps busy; the butter inputs and gameplay are unchanged by construction; it passed on one rerun with one butter and one dessert retry); the Royal Supper and route unit tests 22/22. Campaign, audio, movement-lane and blockout ran on the build before these presentation changes.

Captures (`review-fixes/`, WebP, 1280×720 unless named 960): the six item boards and the floating-pieces mock; `start-1280`, `start-960`, `bread-play-1..2`, `end-0..6`, `grapes-play-1..5` (1 is the after-butter retry phase), `fork-play-1..2`, `candles-play-1..3`, `hidden-1280`, `hidden-960` (HIDDEN under the diner's look), `diner-play-1..5`, `dessert-play-1..4`.

### Not verified

The user's own play-through of the fixes (next); motion (the wick glow growth, pre-relight flicker, halo) only in stills and the bot run; representative-machine performance; other browsers.
