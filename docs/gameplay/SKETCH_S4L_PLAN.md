# Sketch S4L — Vertical lifts between layers

2026-10-07 planning only. User decision after accepting S4C: replace both scripted escalators with **vertical lift platforms** built into the exit ground. This block runs **before S4D**, so S4D verifies the final transport once. [Overview/contracts](SKETCH_S4_PLAN.md), [S4D plan](SKETCH_S4D_PLAN.md), [paste-ready prompt](SKETCH_S4_PROMPTS.md#s4l--vertical-lifts).

## User decisions (2026-10-07)

1. **Step on it and it rises.** No E press. Standing on the lift deck starts it; while it rides, the player cannot get off: invisible walls hold them on the deck.
2. **Lifts for all the layers.** Every move between layers is a vertical lift: Layer 1 → 2 and Layer 2 → 3 now, and any later layer transition. The escalator stairs, treads, chevrons and boarding pads are retired.
3. Vertical only: the deck goes straight up; the player gets off at the same x as they got on, onto the next layer's ground.

## Playable result and boundary

`study=layer-1`, `layer-2` and `layers-1-2` ride lifts instead of escalators, with their existing endpoints (`layer-1` ends on the Layer 2 landing; `layer-2` and `layers-1-2` end on safe Layer 3 ground). Accepted challenges are unchanged: Layer 1 pendulums, Layer 2 boards/axes, the S4A climb, the S4B crossing and the S4C joined Layer 3 keep their geometry, tuning and texts. Only exit-side transport, a fixed walkway on Layer 2 (below) and their presentation change. S4D (the `layers-1-3` route) is not part of this block.

## Behaviour contract

- **Data:** replace `SketchEscalator` with a `SketchLift` on the leg (keep `leg.escalator`'s role; rename where practical): deck rect at the bottom (its top flush with the exit ground), rise (arrival top − departure top), duration, a short wind-up, the side the player steps off at the top (`exitSide: 1 | -1`), and the arrival spawn on the next layer's ground. New stable IDs `l1-lift`, `l2-lift`. Rides stay data; no physics engine.
- **Start:** the ride starts when the player is grounded on the deck with the whole body inside the deck's x-range (not on a hop across it, not while recovering). It starts only in the leg's exit stage (the challenge must be cleared first, as with the escalator); in traversal the deck is ordinary fixed ground. On start: invisible walls close on both sides, nail commands are refused and queued commands/held input are cleared (as today at a ride boundary), then a wind-up (default 0.4 s, visible: the deck shudders/lights) before it rises.
- **During the ride:** the deck is a kinematic solid moving on a fixed time schedule; the player keeps ordinary control inside the cab (walk, jump), carried up by the deck. Invisible walls ride with the deck on both sides and are taller than the full double-jump height (≥ 6 u above the deck), so no jump clears them. No nail placement, recall or grip. Pause/blur freeze the ride with the simulation.
- **Arrival:** at the top the deck is flush with the next layer's ground; the wall on `exitSide` opens and the next leg/arrival commits once (same rules as today's `arrive()`: `nextLegId` → restart that leg; otherwise the arrival section). The deck then stays at the top as fixed ground and never carries anyone down (one-way in this slice).
- **Recovery:** a mid-ride `R`, fall (impossible inside the walls, but defended), blur or leave/re-entry returns to the departure exit checkpoint with the deck back at the bottom; the exit spawn must be **off the deck**, so a retry never auto-starts a ride. Arrival/terminal rules stay as today.
- **Camera:** keep the existing transit reframe (departure band → arrival band by ride progress; linear under reduced motion).
- **Isolated Layer 3 studies** (`layer-3-walls`, `layer-3-swings`, `layer-3`): the Layer 2 lift is context there; draw its deck resting at the top as fixed ground beside the arrival ground, and keep every S4A/S4B/S4C behaviour and measurement.

## Geometry (defaults to verify; keep challenges untouched)

| Lift | Departure | Arrival | Notes |
| --- | --- | --- | --- |
| `l1-lift` (Layer 1 → 2) | Right end of Layer 1 exit ground (x55..63, top 11.9); deck ≈ x59.5..63 | Layer 2 landing (x63..77, top 15.2); step off right | Rise 3.3 u. Exit spawn moves left of the deck (≈ x55.7). Check clearance under Layer 2 board A (x≈54.3..57.7, y≥15.5) and the landing's left face. |
| `l2-lift` (Layer 2 → 3) | New fixed walkway extending the Layer 2 exit ground (x23..31, top 16.3) left to the shaft; deck ≈ x−2.6..0 | Layer 3 arrival ground `l3-arrival` (x0..10, top 24.4); step off right | Rise 8.1 u. Keeps `l3-arrival` and the climb entrance (4.2, 24.4) exactly as accepted. The walkway is plain ground: no new challenge, gap or hazard. Check it does not touch Layer 1 jump envelopes below (Layer 1 max ≈ y 6) or the Layer 2 challenge to its right, and that the arrival point after the ride is on fixed ground with B still uncatchable from it. |

Layer 2's travel is leftward, so after the exit checkpoint the player walks the walkway to the shaft. Arrival spawns: Layer 2 landing (64.2, 15.2) and Layer 3 entrance (4.2, 24.4) as today, or the deck's top centre if a retry/arrival places the player there; record whichever is chosen.

## Presentation (cartoon 2.5D)

Deck with visible thickness and a bright edge, two guide rails or an open shaft frame reaching the next layer, a simple cab outline or rail posts suggesting the invisible walls during the ride (a faint glass/ink outline is fine), a small cue on wind-up and arrival, and the deck parked flush at the top afterwards. Remove escalator ramps, treads, chevrons and pads. No new generated art; cartoon placeholders only.

## Implementation order

1. Recheck checkout/HEAD (`6e89b0e` or newer), runtime and server ownership; read S2/S3B and S4A–C evidence; inventory escalator code paths (`SketchEscalator`, `boardEscalator`, `beforeStep` transit, `boardingReady`, `escalatorPosition`, `transitProgress`, scene `buildEscalator`/`animateEscalator`/pads/chevrons, debug `escalators`/`transitId`/`boarding`, UI prompt text, tests).
2. Add the lift data and geometry (walkway, deck positions, exit spawns) in the level modules; keep IDs stable elsewhere.
3. Model: auto-start in exit stage, wind-up, kinematic deck + moving invisible walls in `buildWorld`, command refusal, arrival commit, recovery to the departure exit, snapshot downgrade of a mid-ride snapshot (unchanged rule).
4. Scene/UI: lift presentation, parked deck in other studies, HUD prompt ("Step onto the lift"), cues, debug readback (`lifts`, ride progress); keep one canvas and released resources.
5. Update tests that drove escalators (unit fixtures and browser helpers: boarding with E becomes stepping on the deck) and remeasure only what the transport touches.

## Verification gate

Unit: lift start only grounded fully on the deck in exit stage; not in traversal, not on a hop over it, not while recovering; walls hold the player against held A/D and jumps (including the air jump) for the whole ride; commands refused; one arrival commit; mid-ride `R`/snapshot → departure exit with the deck reset and no auto-restart; parked decks in Layer 3 studies; isolated presets unchanged elsewhere; S4A/S4B/S4C unit suites unchanged.

Browser (real keys/clicks, 1280×720 and 960×540): Layer 1 route → lift → Layer 2 landing endpoint; Layer 2 study → walkway → lift → Layer 3 ground endpoint; joined Layers 1/2 through both lifts; holding A/D/Space during a ride never gets the player off; pause/actual blur/resize mid-ride; leave/re-entry mid-ride; reduced motion; one canvas, save sentinel, production ignores studies. Regressions: S1 mechanics, S4A, S4B, S4C joined (move outputs into `docs/validation/sketch-s4/s4l/` and restore accepted files), and S3 `sketch-layer2` updated for lifts.

Evidence: `docs/validation/sketch-s4/s4l/README.md`, both-size captures of each lift at the bottom, mid-ride and arrival, geometry table, ride timings and results. Update DECISIONS/REQUIREMENTS (FR24)/UNFINISHED_SKETCH/PLAN/NEXT_SESSION; S4D then plans on lifts.

- [ ] Both lifts work in every ride study with real inputs; the player cannot leave mid-ride.
- [ ] Accepted challenges, Layer 3 studies and evidence unchanged.
- [ ] Recovery/snapshot/input/resource contracts hold across both lifts.

## If S4L needs more time

Split into L1 (data/model/presentation + the Layer 1 lift) and L2 (walkway + Layer 2 lift + joined checks), each with its own review. Do not start S4D while a lift defect is open.
