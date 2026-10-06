# Sketch Slice 2 — Layer 1, first escalator and stacked-world framing


Latest follow-up: [faster four-pendulum route and centered circular nail heads](four-pendulums/README.md), validated with 112 focused tests and 27 Chromium scenarios. The numerical three-platform layout and captures below are historical; the new evidence supersedes them.
Evidence for the S2 playable review gate. The 2026-10-06 completion review revised Layer 1 platforms to require pinning for solid support; fresh review results below supersede initial claims about geometry-only nail enforcement and reduced-motion coverage. Everything here was produced by the
commands recorded below on this checkout; nothing is carried over from the Slice
1 or M3 runs. Sketch art is still fully cartoon placeholder geometry.

## Completion review — 2026-10-06

The user asked to check and complete S2, then explicitly chose **mandatory nail reuse; revise the platform mechanic** after the review found 50 successful unpinned-C shortcuts among 108 ordinary jump schedules. The new route-only `solidWhenPinned` flag makes unpinned pendulums moving dashed outlines with no collision; pinning freezes and inks opaque pink support with its white landing lip. Recall removes support immediately. No hidden completion condition is added. S1 omits the flag and keeps its reviewed moving solid platforms.

Additional corrections:

- R at the Layer 1-clear exit now reanchors on that exit ground, rather than returning to starting ground with a cleared-stage state.
- The exit checkpoint commits only after a grounded landing at the fixed exit surface; airborne volume overlap cannot clear it.
- The reduced-motion scenario now drives the full route, checks the reframe/player visibility during transport and settles on Layer 2. The original test only reached the terrace.
- A real-control scenario covers R before boarding, pause/frozen player/camera/transit, R during the ride, arrival R and a fall from the arrival landing.
- The shared real-control test driver clamps run-up to the current support edge. One prior run failed on C because it walked beyond the platform to a destination-relative takeoff point (26 other scenarios passed). The corrected full 27-scenario run passed in 3.2 minutes without retrying failures. Captures and reduced-motion checks now use this same driver.
- S2 instructions have dark ink on a pale paper panel at both sizes; accepted S1 instructions are unchanged. Fresh captures replace the earlier solid-looking unpinned-platform evidence.
- Geometry measurements below were corrected from typed pivot/length/arc/size values. Geometry proves three platforms are needed, while the visible outline/solid mechanic makes nail reuse required.

Fresh verification: `npm run typecheck`, all **110 focused tests across 10 files**, and `npm run build` pass. Route checks are now 28 tests (24 initial plus four review regressions), including a genuine supported-ground double-jump bypass sweep and the 108 schedules that can no longer use uninked C. Production JS is 699.40 kB / 182.19 kB gzip; the existing nonfatal chunk-size warning remains. The final **15 S2 browser scenarios pass (2.7 minutes)** after the grounded-landing correction: 12 route, 2 capture and 1 reduced-motion. The unaffected **12 S1 browser regressions** also passed in the completed 27-scenario run. These are fresh results for this review; prior campaign/Supper results below are historical and were not repeated because their runtime paths did not change. The development review URL returned HTTP 200 at handoff.

Automated keyboard/mouse traversal and agent-inspected captures prove the delivered slice; no human playtest approval, first-time duration or representative-machine performance is claimed. S3, later challenges, sun/campaign/ending, art generation, commits/pushes and publishing were not undertaken.

## Scope delivered

Layer 1 of the connected three-layer world: bottom-left entry, three varied
pendulum transfers with user-approved outlined/inked states that require two-nail FIFO reuse, a safe Layer 1-clear
checkpoint, one authored escalator and a fixed Layer 2 arrival landing. Layers 2
and 3 exist only as non-playable guides. No museum entrance, campaign award,
sun, ending, new art, generation or dependency change is part of this slice.

## Exact review entry and controls

Development only, and save-isolated:

```text
http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1
```

Production (`npm run preview`, port 4173) ignores every direct-entry parameter,
shows no route or bay shortcut and opens the ordinary museum menu.

Controls for this study:

| Input | Action |
| --- | --- |
| A / D or arrows | Move; A/D also pump a nail swing |
| Space | Jump (one airborne jump), wall kick, release a swing |
| E | Grab or let go of a placed swing nail; board the escalator at the pad |
| Left click | Drive a nail into a marked socket, exactly where it is drawn |
| Q | Recall the oldest placed nail, remotely |
| R | Retry from the current safe checkpoint |
| Escape | Pause |

Slice 1's playground is unchanged at
`http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics`, with `&bay=`
and digit hotkeys. A missing or unknown `study` value falls back to it.

## Manual review checks

1. Open the Layer 1 entry. The player starts on safe ground at the bottom left,
   and the HUD reads `1 / 3 · Layer 1` and `Checkpoint / layer-1 start`.
2. Walk right, hop the step and cross to the waiting terrace. Pendulum A's ring
   is on screen before any commitment; B and C report `Out of reach.`
3. A moving dashed outline cannot support you. Click A's ring: it freezes and
   becomes an opaque pink platform with a solid white landing lip and a nail
   on its surface. Jump onto it.
4. From A, B is the only target in reach. Click it, jump, then press Q: the HUD
   `Q recalls:` line moves to Pendulum B and A resumes as a moving dashed outline with no support.
5. Click C and jump onto it, then jump to the fixed exit ground. The HUD switches
   to `Checkpoint / layer-1 clear` and both nails are available again.
6. Walk onto the escalator pad. `Press E to board the escalator` appears.
7. Press E. The camera reframes upward with the player and the ride ends on the
   Layer 2 landing with the `Slice 2 endpoint` banner and `2 / 3 · Layer 2 landing`.
8. Walk off the Layer 2 landing's left edge: recovery returns to the Layer 2
   landing, never to Layer 1.
9. Press R before boarding or during the ride: recovery returns to the Layer 1
   exit checkpoint. Pause mid-ride: player, camera and transport progress freeze.
10. Press R on the Layer 2 landing: the player re-anchors there and the endpoint
    banner stays.
11. Pause mid-run, and press Escape while a movement key is held: motion and
    mechanism time freeze, held input is cleared and resume needs no extra press.
12. Resize between 1280×720 and 960×540 during play: projection changes only.
    Position, nails, queue and pendulum phases are untouched.

## Measured geometry and envelopes

Recorded from the current controller with held ordinary input, not estimates.

Jump envelope (`sketchMovement`, full-speed running):

| Move | Peak height | Horizontal travel | Airtime |
| --- | --- | --- | --- |
| Single jump | 2.243 u | 5.324 u | 0.833 s |
| Double jump (best, ~25-frame delay) | 4.479 u | 9.404 u | 1.433 s |
| Double jump (widest, ~40-frame delay) | 3.749 u | 10.764 u | 1.633 s |

The usable ceilings are therefore about **4.48 u high and 10.76 u across**.

Layer 1 authored geometry, from `src/levels/unfinished-sketch-route.ts`:

| Object | Rest position | Sweep |
| --- | --- | --- |
| Waiting terrace | top 1.6, x 12.8–17.6 | fixed |
| Pendulum A | board top 2.550–2.711, x 18.636–25.764 | ±1.064 u, 5.4 s |
| Pendulum B | board top 6.225–6.471, x 27.666–35.534 | ±1.434 u, 4.6 s |
| Pendulum C | board top 9.350–9.495, x 36.995–43.805 | ±1.105 u, 5.8 s |
| Layer 1 exit ground | top 11.9, x 47–55 | fixed |
| Escalator | 6-point authored path, 3.2 s, x 49.2 → 56.2 | scripted |
| Layer 2 landing | top 15.2, x 55–69 (14 u wide) | fixed |

Why the three platforms and nail reuse are required:

- The exit ground's top is **5.428845 u above B's highest possible surface**,
  above the 4.479 u double-jump ceiling, so no ordinary jump from B reaches it.
  Current tests sample B's full swept width at 0.2-u intervals and 14 air-jump
  timings (14–40 frames), with no exit landing. The previous 4.98-u claim and
  platform-coordinate ranges were inaccurate; this review recomputed them
  from the authored pivot/length/arc and half-height/half-width.
- Pendulum C is more than 10 u (the placement reach) from the terrace and from
  every standing point on pendulum A, so C cannot be placed or jumped to before
  the player has stood on B.
- Only pendulum A is within the 10 u reach from the terrace; B and C both report
  `Out of reach.` there.
- Without a pin, each Layer 1 pendulum has no collision and is visibly a
  moving dashed outline. This user-approved mechanic closes the discovered
  unpinned-C alternative; it does not gate completion or reject solid landings.
- With both nails placed, C reports `Both nails are placed. Press Q.`, so the
  third platform requires a recall. FIFO means Q frees A, the nail not under the
  player. Recalling A from B is safe; recalling the support you stand on is not.

Timing tolerance: each transfer is swept across 14 ordinary air-jump timings.
At least five timings per transfer complete the whole chain to that platform, so
no transfer is a single-frame gate.

## Active-layer framing at both review sizes

Measured in the real camera, read from the live orthographic projection:

| Viewport | World view | Pixels per world unit | Player body | Marked ring | Click hit area |
| --- | --- | --- | --- | --- | --- |
| 1280×720 | 32.0 × 18.0 u | 40.0 | 26 × 50 px | 48 px | 46 px |
| 960×540 | 32.0 × 18.0 u | 30.0 | 19.5 × 37.5 px | 36 px | 46 px |

- The view is a moderate zoom: an 18-unit-tall window on a route whose three
  stacked layers span about 34 units vertically. It does not fit the whole
  world and does not isolate one row.
- Vertical framing is clamped to an authored per-section band. Layer 1 keeps the
  camera centre between y 5.5 and 11.2, Layer 2 between 13.7 and 16.8, and the view
  height is 18 units in both, so crossing the escalator is a pure vertical
  reframe with no zoom change.
- Adjacent rows stay in frame: from Layer 1 the reserved Layer 2 row and its
  second-escalator corridor are visible above the active row; on the Layer 2
  landing, Layer 1's exit ground and escalator are visible below and Layer 3's
  reserved rows above.
- Every committed transfer shows the next target on screen before it, proven by a
  browser check at both sizes: A from the terrace, B from A, C from B and the
  exit ground from C.
- The camera reframes horizontally with look-ahead so the player sits left of
  centre and the next landing is already visible.

## Initial implementation test evidence (historical)

`npm run test` — **106 focused tests pass** across 10 files (82 before S2, all
still passing, plus 24 new Layer 1 route checks in
`tests/sketch-route.test.ts`).

The new file proves:

- three stacked layer regions, only Layer 1 playable, reserved rows with no
  collider, target, hazard or trigger, and guides that stay inside their own row;
- three freezable pendulums, two nails, an escalator that ends on generous fixed
  Layer 2 ground;
- the forced reach chain at both ends of pendulum A's sweep: only A from the
  terrace, only B from A, only C from B, and A out of reach again after Q;
- the bypass sweeps quoted above;
- a complete real-input traversal from spawn to the Layer 2 endpoint;
- the Layer 1-clear checkpoint committing once and clearing nails, queue and
  attachment state;
- one fresh E starting the ride, with that same press unable to grip or jump;
- R before exit, R during the ride and R after arrival;
- restart adventure clearing route completion;
- section-local recovery from Layer 1, the exit checkpoint and the Layer 2
  landing, each returning to its own checkpoint;
- same-session memory round-tripping the queue and frozen phases, and a mid-ride
  snapshot downgrading to the exit checkpoint rather than restoring midair.

`npm run typecheck` passes. `npm run build` passes; JavaScript is about 698.6 kB
/ 182.0 kB gzip, so the familiar nonfatal >500 kB warning remains and is larger
than the pre-S2 638.9 kB because of the route data, the stacked-world scenery and
the route model.

## Initial implementation browser evidence (historical)

`node node_modules/@playwright/test/cli.js test <spec> --trace off`

- `tests/browser/sketch-layer1.spec.ts` — **10 scenarios pass** (1.0 min):
  save-isolated open with one canvas and untouched sentinel bytes; unknown
  `study` falling back to the playground; active-layer framing; every committed
  transfer showing the next target at both sizes; the full two-nail FIFO
  traversal with Q reuse, the boarding prompt, the scripted ride and the Layer 2
  endpoint; fall recovery and R; pause/resume with cleared held input; resize at
  both sizes preserving geometry; leave/re-entry resuming the remembered safe
  checkpoint on the ground; production ignoring the entry with no inspection hook.
- `tests/browser/sketch-layer1-capture.spec.ts` — **2 scenarios pass**, producing
  the captures listed below from the same real-input route.
- The initial reduced-motion scenario only reached the terrace; it did not
  exercise transport, despite the earlier handoff claim. The completion review
  replaces it with full real-input traversal, mid-ride framing and safe arrival.

All clicks are real pointer clicks on the drawn sockets, all movement is real
keyboard input, and the only reads of the game are the read-only dev
observations. No teleport, set-state or progression helper exists in this slice.

## Regressions

Because `src/main.ts`, `src/ui/game-ui.ts` and `src/style.css` changed, the
affected shared paths were re-run:

- `tests/browser/sketch-mechanics.spec.ts` plus one new off-screen-click check —
  **13 pass** (30 s), so the accepted Slice 1 bays, the explicit E grab, FIFO
  recall and the pause/retry panel are unchanged.
- `tests/browser/sketch-capture.spec.ts` — **9 pass**, retaining the Slice 1
  evidence set.
- `tests/browser/movement-lane.spec.ts` — **pass**, so the shared controller and
  input contracts still hold.
- `tests/browser/campaign.spec.ts` — **5 pass** (7.7 min). One run of the
  production museum → supper → pear → return → placement → reload → replay →
  reset scenario first failed at the final `pear` stage of the fixed keyboard
  schedule and then passed unchanged on an immediate rerun in 117.3 s with zero
  retries, matching the recorded baseline.
- `tests/browser/blockout.spec.ts` — **pass** (3.7–4.2 min) on reruns, 100.7 s and
  116.8 s fixed-step routes. One earlier run failed the repeated-re-entry geometry
  count with 12 against 14, which is the lazy Three.js resource-upload artifact
  already noted in the handoff when counts are compared at matching views.

Royal Supper's level, model, collision, controller and campaign files are
unchanged by this slice; `src/core/input.ts` and `src/gameplay/controller.ts`
differ from HEAD only because of the preserved Slice 1 work.

## Captures

All at 1280×720 and 960×540 in the real camera, taken from the same route:

| File | What it shows |
| --- | --- |
| `layer1-spawn` | Bottom-left entry, Layer 1 band and Layer 2 row above |
| `layer1-terrace` | Waiting terrace with pendulum A in frame |
| `layer1-pendulum-a-pinned` | A frozen with its nail on the surface |
| `layer1-on-pendulum-a` | Riding A with B marked and in reach |
| `layer1-on-pendulum-b` | On B with both nails spent, `Q recalls: Pendulum A` |
| `layer1-after-recall` | A resumed, one nail available, C placeable |
| `layer1-on-pendulum-c` | On C with the exit ground ahead |
| `layer1-exit-checkpoint` | `Checkpoint / layer-1 clear`, two nails available |
| `layer1-escalator-prompt` | Boarding pad, `Press E to board the escalator` |
| `layer1-escalator-transit` | Mid-ride reframe between the two layers |
| `layer1-layer2-arrival` | Fixed Layer 2 landing and the `Slice 2 endpoint` banner |

## Honest limitations

- These are automated real-control traversals, captures and agent inspection.
  They are **not** a human first-time review, and no difficulty, readability or
  fun approval is claimed.
- No performance profiling was done on a representative machine and no frame-rate
  or human-duration claim is made. The recorded traversal is a scripted known
  route, not a human run.
- The route was authored from measured envelopes and swept for bypasses, but a
  player can still choose a pin position the checks do not enumerate. If the exit
  ground ever proves reachable from B in play, the geometry must change rather
  than a completion flag.
- Layer 2 and Layer 3 are deliberately empty scenery. Nothing here proves that
  the boards, axes, wall climb, glue crossing or moving sockets are fun or fair;
  those are S3 and S4.
- Reduced-motion behaviour is now covered through the full transport and
  reframe, including player visibility and arrival, but not by a visual comparison of easing.
- Cross-browser, fullscreen, itch.io iframe, real OS focus switching and graphics
  context restoration remain release checks and were not exercised.
- Sketch's art is fully cartoon placeholder geometry with no generated assets,
  matching the separate Sketch art direction. Final references remain a later
  scoped task.