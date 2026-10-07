# Unfinished Sketch S4B — free-placement moving-swing crossing review gate

2026-10-07. S4B is implemented and **accepted by the user** after the momentum review fix below, and committed/pushed at their request. S4C (joining the wall climb to this crossing) is next on its own request.

Play [S4B swing crossing](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-swings) after `npm run dev`. Existing entries keep their endpoints: [S4A wall climb](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-walls), [joined Layers 1/2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2), [direct Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2), [isolated Layer 1](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1) and [S1 mechanics](http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics). Production preview ignores studies.

## What the player does

The section starts on S4A's post-climb ledge with two nails (the climb's third nail is taken back there). There are no marked rings in this section. Moving the mouse shows a ghost nail on the nearest wood: green when the spot is valid, red with the reason in the HUD when it is not, and a red cross over empty air.

1. Click strip **F** (a diagonal batten braced into the ledge edge) and stand on the nail head. The far, high end of F is the useful spot; the near end cannot even reach M1.
2. Click bar **M1** (slides back and forth under a ceiling track). Jump from the head while M1 slides back toward you and press `E` close to the nail.
3. While swinging, `Q` frees F. Click bar **M2** (it moves out of phase with M1).
4. Pump with A/D, release with `Space` (an air jump is available after a release) and press `E` near the M2 nail.
5. `Q` frees M1. Swing and release onto the fixed end ledge. The landing clears the ledger: S4B endpoint.

Glue, a fall, `R` or re-entry during the crossing retry this section's start (two nails, phase zero). On the end ledge `R`, a fall and re-entry stay on the ledge.

## Implemented behavior

- **Nailable surfaces** (`SketchNailSurface` in `src/levels/unfinished-sketch.ts`): a segment in its mechanism's local frame with a kind. A foothold strip grows a landable head (1.9×0.35, as in S1); a moving bar gives a grip pivot (0.8) carried by the bar. Strips and bars are never solid themselves.
- **`place-at` command** (`src/gameplay/sketch-model.ts`): the scene projects the cursor onto the nearest surface within the existing 46 px hit area and sends `{ surfaceId, offset }`. The model revalidates at the consuming tick: known surface, finite offset in 0..1, owned by the current section, budget, reach 10 from the body centre, at least 1u from another nail on that surface, and a head may not overlap the player. Refusals never change the queue. Placed nails keep their local offset as the bar moves.
- **FIFO ledger unchanged:** a free placement is an ordinary queue entry (unique target ID, plus `surfaceId`/`offset`), so recall, head/grip collision, the oldest marker and snapshots reuse the existing code. Recalling the current head or grip removes it at once.
- **Ownership:** S4B owns only its three surfaces; the S4A wall targets in view are other-section context and their rings are hidden here. After the endpoint, surfaces refuse ("Not part of this section.").
- **Snapshots** carry surface/offset; as in S4A, traversal/recovery re-entry returns to the entrance, foreign or malformed snapshots restart, and terminal snapshots restore the end ledge.
- **Presentation** (`src/scenes/unfinished-sketch.ts`): wooden battens set just behind the play plane with no landing lip; bars hang from a trolley on a track spanning their full travel; F/M1/M2 letters; ghost nail and empty-air cross; free nails drawn as a downward-driven head on F and a camera-facing round head on a bar. HUD: "Click: nail Strip F here", "Bar M1 · Out of reach.", "Empty air · nails only go into wood". The compact S4A side-panel layout keeps the middle clear.
- **Study wiring:** `study=layer-3-swings`, route `layer-3-swings`, leg/section `l3-swings` (terminal, no escalator), menu/pause/eyebrow/tag labels and a read-only `grips`/`nailSurfaces` debug readback.

### Review fix: a released swing keeps its momentum (user, 2026-10-07)

The user found that after a swing release the jump only carried forward while D was held; letting go dropped the player straight down. Cause: the shared controller applies ground-strength braking (70 u/s²) in the air with no input, so the release speed vanished in about 0.1 s; the release carry only raised the speed cap while a direction was held. Fix (`src/gameplay/controller.ts`, swing releases only, so Royal Supper, wall kicks and forced detaches are unchanged): after a voluntary release, letting go keeps the horizontal speed until landing. It slows only the way holding that direction would, so it never reaches further than holding it; opposite input still steers. Measured: 8.12 u/s at release is still 8.12 u/s half a second later with no input. The M1→ledge bypass probe now runs 4800 attempts (held right and let go): none lands, margin still 3.22u. Unit 169/169; S4B browser 8/8 and S1 mechanics 12/12 rerun (one scripted S4B crossing needed a second attempt; the other three crossed first time).

### Shared movement fix (affects S1)

Real-input probing found that recalling the gripped nail on the tick after a grip flung the player (measured 135.9 u/s; one probe flew 30u left and 10u up). The grip places the body directly beneath the nail but starts the swing at the approach angle, so the first swing tick moves the body onto the arc, and a forced detach reused that one-tick displacement as velocity. Approached from the right, this could have flung a player from M1 toward the ledge. A forced detach now keeps the swing's own arc velocity (plus the mount's), still with no air jump and no carry. The reviewed "body settles directly beneath the nail" grip and every voluntary release are unchanged. Regression: `tests/sketch-movement.test.ts` "recalling the nail on the tick after a side grip does not fling the player" (fails at 135.9 u/s without the fix).

## Final typed geometry

| Item | Value |
| --- | --- |
| Start ground | S4A ledge `l3-walls-exit` x13.2..22, top 49.5; spawn (17.2, 49.5) |
| Glue | x22..57, y46.8..48.3; section fall line 46 |
| Strip F | fixed; segment (23.4, 49.9) → (26.6, 50.9); head centred on the chosen point |
| Bar M1 | 3u bar at y55; left extreme centre x34.5, travel +4 in x, period 5 s, phase 0; nail positions x33..40 |
| Bar M2 | 3u bar at y56; left extreme centre x45.5, travel +4, period 4.4 s, phase 0.5; nail positions x44..51 |
| End ledge | x57..65, top 54; exit spawn (59, 54); exit fall line 49 |
| Nails | two, strict FIFO; reach 10; grip radius 2; free-nail spacing 1u |
| Camera | view height 20, centre y 53..54.5, look-ahead 6 right; Layer 3 band height 40 for this preset |

## Measured behavior

From `unit-measurements.json`, produced by `tests/sketch-layer3-swings.test.ts` with the input-only crosser in `tests/sketch-layer3-swings-route.ts`. Every frame is an input plus queued commands; nothing edits body or movement state. The search snapshots the model to avoid replaying prefixes, and the found route is replayed from a fresh model.

- **Standard route:** F at its far end, M1 at its left end, M2 at its centre; command order `F, M1, Q, M2, Q`; 550 frames (9.2 s) including waits; replays to the endpoint with two nails available and an empty queue.
- **Placement choices that complete:** F far end with M1 at 0, 0.25 or 0.5 and M2 at 0, 0.5 or 1; F at 0.5 and 0.75 with M1 at 0. From F's near end (offset 0) M1 is out of placement reach. M1 at 0.75 or 1 can never be gripped from F.
- **M1 grip windows** (wait after nailing M1, bar period 300 frames): F far/M1 left end: frames 72–216 (2.4 s of every 5 s). The rule is simple: jump while M1 slides back toward you. M1 at 0.25: about 120 frames per cycle; M1 at 0.5 or from F's middle: about 90.
- **M2 placement while swinging on M1** (first 5 s, pumping): M2 offset 0 in reach for 86 of 300 frames, 0.5 for 42, 1 for 30.
- **Release to grip M2** (378-combination grid of pump time × release angle × air-jump time): 220 work for M2 at 0, 101 at 0.5, 20 at 1. **Release to the ledge from M2:** 201–315 of 378.
- **Missed transfer retry:** recalling the current grip to detach, fall into glue and regain control at the start: 46 frames (0.77 s). Recalling the current head: 27 frames to the glue plus 22 recovery frames.
- Exploratory (not a committed test): a state-based bot (hang until M2 is within 10.2u and moving away, pump, release rising past 60°, air jump only while below the target) crossed from 32–33 of 36 different M1 grips. The browser driver uses this rule.

### Bypass probes (geometry, not flags)

| Probe | Result |
| --- | --- |
| No nails | Running off the start falls into the glue; section retry |
| Skip F: start ground → M1 | Closest body centre to M1's whole swept bar over ordinary jumps: 3.41u (grip radius 2) |
| Skip M1: any F head → M2 | Closest centre 8.59u (F far end) to 11.41u |
| F leapfrogging | Footholds exist only on F; its right end is 30.4u from the ledge |
| Skip M2: M1 → ledge | 2400 pump/release/air-jump attempts from 12 grips at M1 0/0.25/0.5: none lands; furthest right edge at ledge height 53.78 vs ledge 57 (3.22u margin). An earlier exploratory 105k-attempt sweep (before the detach fix and glue change) also found none. |
| Regrip M1 for fresh air jumps | 5 real E regrips: furthest right edge 48.4 |
| Empty air / unknown surface / bad offset / out of reach / full budget / too close / head inside player | Refused with the reason; queue unchanged |
| Q on current head / current grip | Support removed at once; forced detach has no air jump and only arc speed; glue retry at the start |

## Browser checks (real controls)

`tests/browser/sketch-layer3-swings.spec.ts`, Chromium headed, tracing off, 8/8 pass (1.3 min). Keys and mouse clicks only; state is read back for assertions and decisions. Clicks are aimed with the read-only `nailSurfaces` projection after the camera settles.

1. 1280×720 and 960×540: full crossing (F far end, M1 left end, M2 centre), clicking M2 on a moving bar while swinging on M1; endpoint; terminal `R`, fall and leave/re-entry stay on the ledge; Restart returns to the start; campaign save sentinel untouched. Both crossed on the first attempt.
2. Another choice (M1 at 0.25, M2 at 0) crosses.
3. Preview/refusals: out-of-reach ghost and HUD, empty-air cross and cue, valid preview, full-budget refusal, FIFO frees the first nail.
4. `Q` on the current head and on the current grip: support removed, glue retry at the start; detach speed under 15 u/s.
5. Pause while swinging, resize to 960×540 frozen, actual tab blur freezes simulation, leave/re-entry while swinging returns to the entrance with an empty queue and one canvas.
6. No-nail attempts fall locally at both sizes; denied storage still runs the study; production preview ignores the entry.
7. Reduced motion completes the crossing.

Captures: `entrance`, `on-f`, `swinging-m1`, `swinging-m2`, `exit` at both widths; `preview-valid`, `preview-out-of-reach`, `preview-empty-air`, `resize-swing`. Per-test JSON event logs: `browser-*.json`.

## Regressions

`sketch-mechanics` (S1 bays, 12, real controls), `sketch-layer3-walls` (S4A, 8) and `sketch-layer2` (S3/S2 boundaries, 14) after the shared detach fix and scene changes: 33/34 in one run (5.9 min). The failure was S3B joined both rides at 960×540, which ran while a `src` edit triggered a Vite hot reload mid-test; rerun 3/3 pass with no edits. S3 output: `regressions/` (`SKETCH_EVIDENCE_DIR`). The S4A spec writes into its own folder, so its fresh output was moved to `regressions/s4a-walls/` and the accepted S4A evidence restored unchanged. Final state after the last small model edit: build pass, 168/168 unit tests, S4B browser 8/8 (all crossings first attempt). Royal Supper/museum specs not rerun: no shared controller, campaign or save code changed.

## Limits and open questions for review

- Scripted input only. The user's play is the comfort and difficulty check; no human duration or representative-machine performance is claimed.
- The M1 → M2 transfer is the demanding step (timing against M2's motion); M2 → ledge is forgiving. The placement choice changes how forgiving M1 → M2 is (M2 at its left end gives the most options).
- On a grip the body still settles directly beneath the nail and moves onto the arc on the next tick (reviewed S1 behavior, now harmless).
- Strips and bars read as wood set behind the play plane; whether players expect to stand on F before nailing it is a review question.
- The entrance toast still repeats the hint (existing behavior).
- S4C must join S4A's ledge to this start ground; S5's moving-socket finale must be differentiated from these moving bars in its own request.
