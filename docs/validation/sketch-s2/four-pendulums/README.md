# S2 review: faster four-pendulum route and circular nail heads

Validated 2026-10-06. User requested faster/tougher swings, one more swing and only the circular head visible at the clicked nail hole before S3.

## Delivered

- Four pendulum platforms A/B/C/D; original A/B/C periods 5.4/4.6/5.8 seconds become 3.4/2.8/2.45 seconds, with D at 2.1 seconds. A/B/C sweep speed increases by approximately 59%/64%/137%, retaining authored amplitudes.
- Progressively narrower landings: 4.6/4.2/3.8/3.4 units. A remains a running single jump; B is a higher transfer; C/D use lower rises and more precise horizontal braking. Pin position matters.
- Exactly two nails: pin A and B, recall A from B to pin C, then recall B from C to pin D. Outlines have no collision; pinning solidifies support; recall removes it in the same simulation tick.
- D is centered at (48.4, 9.1), C at (39.6, 7.5). Exit, escalator and arrival shift 8 units right. Their heights, checkpoint behavior, 3.2-second transit and the moderate 18-unit view remain unchanged. Stacked bounds widen with the route.
- Platform nail heads are circular, camera-facing and centered at the clicked target; no lateral shaft or offset. The round red rim/gold face remains readable at both sizes, with existing oldest-head emphasis. S1 foothold and explicit grip geometry/rules are preserved.

## Fresh verification

- Node v22.14.0, npm v10.9.2; checkout main at df49623 with pre-existing uncommitted M3/S1/S2/doc work preserved.
- All 112 focused tests in 10 files pass. Route tests are 30, including two new regressions proving the second FIFO recall/support removal and no B-to-D/C-to-exit skip over generous swept source positions. The timing sweep now also checks D: at least five ordinary airborne-jump schedules complete each transfer.
- Typecheck and production build pass. Existing nonfatal >500 kB chunk warning remains (JS 700.63 kB / 182.48 kB gzip).
- Final 27 Chromium scenarios pass in 3.3 minutes: 12 route, two capture, one reduced-motion traversal and 12 S1 regressions. Real keys/clicks/Q/E drive the four-platform traversal and escalator, checkpoint retries, pause/fall recovery, both sizes, isolation and lifecycle. No teleport or state mutation.
- Initial capture traversal passed, but another capture run overshot C with a test driver that held D through a long fixed wait. Corrected the real-key driver to brake over the landing and observe the whole flight; the subsequent complete suite passed without test-level retries. Gameplay tuning was not relaxed to pass that driver.
- Agent inspected fresh A/C/D and arrival captures at 1280x720 and 960x540: circular centered head, visible next target/exit, player, readable HUD and neighboring-layer context. Screenshots are retained in this directory; prior three-platform captures in the parent are historical.

## Review

Play `http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1`. A/D move, Space ground/air jump, left click a reachable ring to pin, Q recalls oldest, E boards escalator, R retries, Escape pauses. Review the faster sweeps and narrower later landings, the second FIFO recall from C, centered circular heads, and safe escalator arrival.

This is automated traversal plus agent visual inspection, not human approval, measured first-time pacing or representative-machine performance. S3 and later gameplay, generation, campaign/ending, commits/pushes and publishing remain outside this review.
