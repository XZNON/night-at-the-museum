# Sketch S4L — vertical lifts (evidence)

2026-10-07. Implemented at the playable S4L review gate on the user's S4L-only request. Both scripted escalators are replaced by vertical lift platforms built into the exit ground. Stop for user review; S4D (Layers 1–3) needs its own request. All changes are uncommitted over `98a213c`. No commit/push, generation, dependency, publishing or sub-agent work.

Play after `npm run dev`:

- [Layer 1 → lift → Layer 2 landing](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1)
- [Layer 2 → walkway → lift → Layer 3](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2)
- [Layers 1/2 through both lifts](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2)
- Parked context decks: `study=layer-3-walls`, `layer-3-swings`, `layer-3`

## Environment

Checkout `main` at `98a213c` (plan commit after `6e89b0e`), origin `https://github.com/XZNON/night-at-the-museum.git`, Node v22.14.0, npm 10.9.2. The Vite dev server on 5173 (PID 20324, started 12:04 for this checkout, not by this session) was reused; Playwright started and stopped its own preview on 4173. Unrelated newer local edits (asset-sources prompts/references, `docs/art/SKETCH_ASSETS.md`, `scripts/sketch-references.mjs`, `asset-sources/manifest.json`) were left untouched; some appeared during this session.

## What a player does

1. Clear the layer's challenge; the exit checkpoint spawns you off the deck. The HUD says "Walk right/left onto the lift…".
2. Walk onto the deck. Once you stand on it with your whole body, it starts by itself (E does nothing). Held keys are cleared at that moment.
3. A 0.4 s wind-up (deck shudders, lamp blinks, faint ink cab outline appears), then the deck rises straight up. You can walk and jump inside the cab; invisible walls on both sides (7u above the deck) keep you on it. Q, clicks and E do nothing.
4. At the top the deck is flush with the next layer's ground. When you stand on it, the arrival commits once, the walls drop and an arrow lights on the exit side. Step off right. The deck stays at the top as fixed ground.

## Geometry (measured, tested)

| Lift | Deck (bottom) | Top after rise | Rise / wind-up / rise time | Exit spawn (off deck) | Arrival retry spawn | Step off |
| --- | --- | --- | --- | --- | --- | --- |
| `l1-lift` | x63..66.5, top 11.9 (right end of `l1-exit` x55..63) | 15.2, under a deck-sized opening in `l2-landing` (now x66.5..77) | 3.3u / 0.4 s / 3.2 s | (55.7, 11.9) | (64.2, 15.2) on the parked deck | right |
| `l2-lift` | x-2.6..0, top 16.3 (left end of new walkway `l2-walkway` x0..23, top 16.3) | 24.4 beside `l3-arrival` x0..10 | 8.1u / 0.4 s / 4 s | (27.5, 16.3) | (4.2, 24.4) | right |

Deviation from the plan's default (deck ≈ x59.5..63 beside the landing): a deck parked left of x63 would extend the Layer 2 landing 3.5u toward board A (gap 5.3u → 1.8u), retuning the accepted first Layer 2 jump. Putting the deck under an opening in the landing keeps the parked footprint exactly x63..77 as accepted. The Layer 1 study endpoint marker moved onto the landing proper (x66.5..74.5) so it no longer floats over the open shaft; the endpoint fires when the player steps off the deck.

Clearances (unit-tested in `tests/sketch-lifts.test.ts`): double jump + body height (5.73u) < wall height 7u; board A's right edge, both axes' reach and every Layer 1 pendulum sweep stay left of the first cab's wall; the walkway's underside (y14.3) is over 6u above the highest Layer 1 jump envelope near it and has no target, mechanism or hazard over it or the second shaft; S4A wall B's lowest face (30.45) is above deck top + double jump + body (30.13) from the parked second deck, which also sits left of B. Layer 3 entrance (4.2, 24.4) and `l3-arrival` unchanged.

Parked decks: `layer-2` draws the first deck parked (its spawn stands on it); `layer-3-walls`, `layer-3-swings`, `layer-3` draw both parked. Decks and cab walls are model-made kinematic solids, never authored collision data.

## Accepted challenges unchanged

The unit runs rewrite measurement JSON for S3A (`sketch-s3/s3b/*.json`), S4A, S4B and S4C. Outputs from HEAD (`98a213c`, lifts stashed) and from the lift build were **byte-identical** (`diff -r --strip-trailing-cr`). Both differ from the committed S4A/S4B JSON in the same way (traces predate the Layer 3 air-momentum fix), so that drift is pre-existing, not caused here. All accepted files were restored after every run.

## Results

- `npm run typecheck`, `npm run build` pass (existing >500 kB chunk warning).
- `npx vitest run`: 201/201 (16 files; 19 new in `tests/sketch-lifts.test.ts`; escalator-driven unit tests in `sketch-route`, `sketch-joined`, `sketch-layer2`, `sketch-layer3-joined` updated to stepping on the deck).
  - start only in the exit stage, grounded, whole body on the deck; not in traversal, not straddling, not airborne over it, not while recovering
  - walls hold against alternating held A/D, held jumps and air jumps for the whole ride on both lifts (peak > 2.5u above the deck, head never near the wall top); exactly one arrival commit
  - nail place/recall/grip refused for the whole ride; arrival waits for the rider to stand on the deck at the top
  - mid-ride R, snapshot restore and `cancelRide()` (blur) return to the departure exit with the deck at the bottom and no auto-start, on `layer-1`, `layer-2` and `layers-1-2`; a defended fall during a ride recovers to the exit
  - parked decks in the Layer 2/3 studies; both lifts in sequence on the joined route
- Browser (real keys/clicks, headed for actual blur): see the table below.

| Spec | Result | Evidence |
| --- | --- | --- |
| `sketch-lifts.spec.ts` (new) | 8/8 (final code; also 8/8 on the first run before the presentation fixes) | `browser-*.json`, `l1-*.png`, `layer-*-parked-*.png` here |
| `sketch-layer2.spec.ts` (S3, updated for lifts) | 14/14 (final code; an earlier run failed 6 cases only because the test pressed Space after arrival, fixed in the test) | `layer2/` (both lifts: `*-lift-bottom`, `*-lift-waiting`, `*-mid-ride`, `*-lift-arrival`, `layer-3-arrival` at 1280 and 960) |
| `sketch-layer1.spec.ts` + `sketch-layer1-motion.spec.ts` (S2, updated) | 12/13, then the failing case 1/1 after a test fix: it held D in the same frame R was consumed, and the R boundary clears held keys (existing contract) | assertions only |
| S1 `sketch-mechanics.spec.ts` | 12/12 | assertions only |
| S4A `sketch-layer3-walls.spec.ts` (its S2 case updated for the lift) | 8/8 | `regressions/s4a` (moved; accepted files restored) |
| S4B `sketch-layer3-swings.spec.ts` | 8/8 | `regressions/s4b` (moved; accepted files restored) |
| S4C `sketch-layer3-joined.spec.ts` | 7/7 | `regressions/s4c` (moved; accepted files restored) |

The new spec covers, at 1280x720 and 960x540: the full Layer 1 route to the lift; E doing nothing; the spawn never auto-starting; Q/click refused in the cab; trying to leave (held A, held D, jumps and air jumps) never leaves the deck x-range; arrival in place at y 15.2, step off, Slice 2 endpoint; walking back over the parked deck never rides; mid-ride R; Escape pause freezing the ride (progress, body) and resize while paused; resume continues; an actual blur (second foreground tab) returns to the exit with the deck reset; leave/re-entry mid-ride returns to the exit; the ride then completes; one canvas, save sentinel unchanged, no page errors; reduced motion; parked decks/entrances in the Layer 2/3 studies; production (4173) ignores `layer-1`, `layer-2`, `layers-1-2` with no debug hook. The S3 spec drives the Layer 2 challenge to the walkway and second lift, Layer 3 endpoint after stepping off, the joined route through both lifts, R / leave-re-entry / pause / resize / actual blur mid-ride on both lifts at 1280, trying to leave on both lifts, reduced motion through both lifts at both sizes, denied storage and production.

Scripted input only: no human playtest, no representative-machine performance claim.

## Captures

`l1-lift-bottom`, `l1-lift-mid`, `l1-lift-arrival`, `l1-landing-endpoint`, `l1-paused-resized`, `l1-reduced-motion-mid`, `layer-2-entrance-parked-l1`, `layer-3-walls-entrance-parked-l2`, `layer-3-entrance-parked-l2` (each `-1280`/`-960`). Layer 2 lift captures are in `layer2/` (`layer-2-layer-2-lift-waiting-*`, `layer-2-layer-2-mid-ride-*`, `layer-2-layer-3-lift-arrival-*`, joined `layers-1-2-layer-1-*` / `layer-2-*`).

## Implementation notes

- Data: `SketchLift` (`deck`, `rise`, `duration`, `windUp`, `exitSide`, `arrival`) replaces `SketchEscalator`; `leg.lift`; `route.parkedLifts`; `LIFT_WALL_HEIGHT` 7, `LIFT_WALL_THICKNESS` 0.5.
- Model: `liftViews()` (bottom / wind-up / rising / arriving / parked), `addRouteSolids` hook in `buildWorld`, deck carry in `beforeStep`, start check in `afterStep`, in-place `commitArrival`, `settleArrival` for retries/restores, `cancelRide()` for blur, interact masked during the ride. Stages unchanged (`transit` is the ride).
- Scene: shaft rails/rungs/top beam, thick deck with bright lip and lamp, faint ink cab with glass, exit-side arrow on arrival; escalator ramps, treads, chevrons and pads removed; one canvas, resources released on dispose.
- Debug readback: `liftId`, `lifts[]` (state, progress, walls, deck left/right/top), `onDeck`, `ride` (replacing `transitId`, `escalators`, `boarding`).
- `main.ts`: window blur and hidden tab call `cancelRide()` before pausing.

## Known issues / review questions

- Is the in-place arrival readable? The endpoint (Layer 1 study) and the S3 endpoint (Layer 2 study) now fire when the player steps off the deck onto the landing, not the instant the deck stops.
- A blur mid-ride sends you back to the exit (as planned); Escape only freezes. Acceptable, or should blur also just freeze?
- The Layer 2 exit view starts with the second lift off-screen to the left; the HUD prompt points left. The walkway is 27u of plain walking.
- The walkway/exit seam at x23 shows the two colliders' outlines (cosmetic).
