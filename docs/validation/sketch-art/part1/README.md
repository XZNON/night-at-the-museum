# Sketch art pass, part 1 — approved references cut out and integrated

Date: 2026-10-08. Requested by the user ("cut out and integrate the approved
references first, lets do that and test"). Local preparation only: no
generation, 0 DreamLayer credits.

## What changed

- `scripts/prepare-sketch-skins.py` cuts the user-approved references in
  `asset-sources/references/sketch/` into 27 runtime skins in
  `public/assets/sketch/` (colour key against the flat background, a
  morphological opening that drops pencil construction lines, hole filling
  where safe, fixed crop boxes). Review board:
  `asset-sources/production/sketch-v1/skins-review.png`. Each skin has a
  `sketch.*` entry (`local_preparation`, 0 credits, crop box, hash) in
  `asset-sources/manifest.json`.
- Fixes noted at reference review, made at preparation: the pendulum plank's
  nail-like cap/rod and its hole are painted out (the scene keeps its own
  rod); the axe head is mirrored into a double bit so both swing directions
  show the white edge; the ground uses only the workbench top board (its inset
  apron is replaced by a flat body in code, so blocks tile straight); the glue
  pool becomes a seamless surface tile over a flat body (no thick soap block).
- `src/assets/sketch-skins.ts` maps mechanism families to skins and holds the
  world-unit presentation sizes and sampled body colours. `src/scenes/unfinished-sketch.ts`
  draws: pendulums as planks, Layer 2 boards as boards, Layer 3 walls as
  rulers, ground as workbench tops, glue as a tiled pool with the tipped
  bottle at the far end, axes as handle + double-bit head + pivot bolt, lifts
  as the striped deck with a piston that stretches with the rise and a pump
  below walking level, strip F as a yardstick, M1/M2 as dowels on a trolley
  and rail, pins as head-on nail heads, foothold nails as side-view cap and
  shaft, swing-socket nails side-on, the third-nail pickup, and the toolbox
  props washed out behind each band.
- Every skin is sized from the collider/level data. Long spans stretch only a
  plain middle (3-slice); short spans take narrower slices instead of
  squeezing, which avoided blurry mips on narrow blocks. A missing skin falls
  back to the existing code placeholder.
- Unchanged: collision, motion, hazards, timings, level data and saves. Gameplay
  cues stay in code: dashed unpinned outlines, target rings, ghosts, FIFO
  marks, axe sweep circle, lift lamp/cab/arrow, the torch and its light.

## Not in this part

The final full-size backdrop (v6 is a direction only) and the museum's Sketch
entrance picture still need DreamLayer generation; the torch has no reference
and stays a code placeholder. The swing-socket skin is no longer needed (the
moving-socket finale was dropped).

## Verification

- `npm run typecheck`, `npm run build`: pass.
- `npx vitest run --testTimeout=30000`: 238/238 (the longer timeout is the
  known S4B grip-window test that can exceed 5 s under load).
- `tests/browser/sketch-art.spec.ts` (Chromium, dev server):
  - static framings of the five route studies and six S1 bays at 1280x720 and
    960x540: no page errors, no failed requests (the pre-existing
    `/favicon.ico` 404 is excluded by URL); `static-*.png`.
  - the full `study=adventure` route with real keys and clicks through the
    shared Layer 1/2/3 helpers: both lifts, the climb, the crossing and the
    claimed light (success screen, then Keep exploring on the settled ledge);
    captures `*-1280.png`, record
    `browser-full-adventure-with-skins-real-keys-and-clicks-to-the-claimed-light.json`.
    The first run reached the claim but its last check looked for the
    endpoint label that the success screen covers; the check was corrected
    and the rerun passed.
- Production: `dist/assets/sketch/` holds all 27 skins, the bundle references
  all 27 and `npm run preview` serves them (HTTP 200). The campaign entry uses
  the same scene factory and art set; it was not replayed in production here.

Not verified: human playtest of the skinned route, representative-machine
performance. Older spec files were not rerun, because they rewrite committed
evidence folders.

## Review revision, 2026-10-08

User review: (1) colours too dull, looks whitewashed, should be poppy and
colourful; (2) sometimes lags or frames skip; (3) the backdrop changes later;
(4) drop the lift's frame.

- Colour: skins re-prepared with saturation x1.45 / contrast x1.08 (sampled
  body colours lifted the same way); decor shadows flood-keyed out (a border
  flood through pale pixels stops at the ink), tape hole kept transparent;
  bands Layer 1 violet `#b69cff`, Layer 2 mint `#8fe3b0`, Layer 3 pink
  `#ff9fca`, sky `#5bb8f0`; the white haze between rows is now a soft ink
  shadow line; decor opacity 0.88; target rings carry a dark ink edge (the
  cyan rings nearly vanished on an earlier turquoise Layer 1 try).
- Lift: rails, beam and rungs are not drawn when the deck is skinned; deck,
  piston, pump, lamp, cab outline and exit arrow remain.
- Smoothness, cause found: the player and camera were interpolated between
  60 Hz steps but mechanisms, targets, nails, grips and lift decks were drawn
  at the latest step. On a 144 Hz display (this machine) a moving board held
  still on 233 of 400 display frames and then jumped a whole step. They now
  use the loop's alpha between the step's start pose and the current pose:
  0 of 400 frozen frames, frame-to-frame speed change p95 1.4e-4 vs 8.3e-3.
  Also, `SceneManager` now pre-compiles every material and uploads every
  texture at scene entry, hidden objects included (`renderer.compile` skips
  invisible ones), so first pins/nails/pickups no longer stall; frame times
  around first pins in Layer 2 and the Layer 3 climb: p99 7.3 ms, max 7.5 ms
  (an earlier probe had a 34.7 ms spike).
- New test `moving mechanisms are drawn smoothly on every display frame`
  (300 frames of `l2-board-b` as drawn, at most 3 frozen; record in its JSON);
  a read-only `drawnMechanisms()` readback feeds it through the dev debug hook.
- Verification: typecheck, build, 238/238 unit tests (`--testTimeout=30000`),
  `sketch-art.spec.ts` 3/3 (static framings, full adventure with real input to
  the claimed light, smoothness); Royal Supper and the museum still load with
  no page errors after the pre-warm change. Captures in this folder were
  refreshed. Frame-time numbers are from this Chromium session, not a
  representative-machine profile.
