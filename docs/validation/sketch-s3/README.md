# Unfinished Sketch S3A — Layer 2 playable review gate

**Superseded difficulty default:** the user rejected this initial optional-nail route and explicitly requested a hard revision. Current gameplay uses required outlined/inked boards and faster mechanisms; see [hard-v1](hard-v1/README.md). Original measurements/captures below remain historical.

Implemented 2026-10-06. S3A is an isolated moving-board/active-axe route ending on fixed Layer 2 ground. S3B, the joined study, second escalator, Layer 3 challenges, reward and campaign ending remain unimplemented.

## Actual entries and controls

- [Play S3A](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2).
- [Preserved S2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1).
- [Accepted S1](http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics).
- [Production isolation check](http://127.0.0.1:4173/?scene=unfinished-sketch&study=layer-2) opens the campaign menu and has no debug hook.

Start on the existing landing at (64.2, 15.2), then travel **left**. A/D or arrows move; Space ground/air jump; click a reachable blue ring to freeze a board; Q recalls the oldest nail; R retries the current checkpoint; Escape pauses. Pin A and B, land on B, recall A, pin C, transfer to C and reach the gold strip on the fixed exit. Axes remain active. A clear commits only on grounded exit landing, then clears nails, attachment, local phase and held input. The exit is the S3A endpoint; E has no boarding action there.

R/fall/axe contact before clearance retries Layer 2's entrance with two nails and deterministic phases. After clearance, R/fall/leave/re-entry uses the exit checkpoint. Restart Layer 2 returns to the entrance. Traversal re-entry starts a clean Layer 2 attempt; the reviewed S2 in-memory queue behavior remains unchanged. Reload starts a fresh isolated study.

## Environment and implementation

Starting checkout: main at `df496232fbbf738e5247f4bf7c9bc60dae00dbcf`, origin `https://github.com/XZNON/night-at-the-museum.git`. Node v22.14.0 / npm 10.9.2, Python 3.11.15; installed dependencies match package.json/lockfile. Both server ports were free at the initial check. Vite was started at 127.0.0.1:5173; Playwright started production preview at 127.0.0.1:4173.

Pre-existing uncommitted M3 assets/preparation, S1/S2, input/controller changes and documentation reorganization remain in the checkout. No dependency install, provider request, generation, commit, push or publication occurred. Layer 1 coordinates, platform widths, periods, FIFO solution and first escalator data are retained; the singular route exit/escalator fields moved into a typed leg. Layer 2 is authored separately in `src/levels/unfinished-sketch-layer2.ts`. Sessions are held separately by study, before any campaign store access.

During editing a Python default-encoding error truncated the UI file. Its campaign base and Sketch controls/HUD were reconstructed using the tracked base, retained source reads, earlier review patches and baseline captures, then restored to the reviewed title/status/footer arrangement. This incident is the reason the verification includes the full production campaign and S1/S2 UI regressions. Subsequent writes use UTF-8. No scene, approved artwork or campaign save was reconstructed or reset.

## Authored geometry and measurements

| Object | Authored motion / standing surface |
| --- | --- |
| Entrance | Existing x63..77 ground, top 15.2; spawn x64.2 |
| Board A | x56, top 15.775..17.275, vertical travel 1.5, width 4.6, period 5.6s |
| Board B | centre x45.8..48, top 16.675, horizontal travel 2.2, width 4.2, period 4.8s |
| Board C | centre x35.8..38, top 15.875..17.075, diagonal travel (2.2, 1.2), width 3.8, period 6.2s |
| Axe A | Independent pivot (51.5, 21.3), blade 2.6 × .65, full rotation period 6.8s |
| Axe B | Independent pivot (41.8, 21.9), blade 2.5 × .65, full rotation period 5.8s, phase .35 cycles |
| Exit | Fixed x23..31 ground, top 16.3; retry x27.5; no second escalator |
| Local fall line | y12.8, above preserved Layer 1 exit at y11.9 |

Global movement and placement tuning are unchanged. Exactly two nails; placement reach 10u; target hit area 46 CSS pixels. Layer 2 boards remain solid while moving, do not offer climbing, and resume from their captured phase on recall. S1/S2 phase behavior remains preserved.

`jump-envelope.json` measures full-speed held jumps in both directions. Single jump: 2.243u rise, 5.78u horizontal displacement, .85s flight. Peak double-jump height: 4.479u at air-jump frame 25, with 9.86u displacement / 1.45s flight. A later air jump trades height for distance: tested frame 48 gives 2.716u peak, 11.56u / 1.70s. These are measured input schedules, not an exhaustive universal bound; the complete raw sweep is retained.

`timing-windows.json`: A succeeds for seven air-jump schedules, frames 10/13/16/19/22/25/28. From the same real-control model setup, A→B succeeds for 17 sampled waiting delays: 0..96 and 312..396 frames at 12-frame intervals (two broad windows within one 6.8s axe cycle). For each successful B schedule the independent B→C delay search finds a successful crossing; sample first successes are 24..156 frames. Each path continues to fixed exit with FIFO A/B/recall-A/C. The calibration preserves the global controller and uses ordinary model inputs, not pose mutation. Browser flights and actual click distances are recorded separately in `browser-observations.json`.

`safe-standing-clearance.json` records conservative horizontal gaps between a board's central full player body and the circular blade envelope: A 1.25u, B .25u, C .65u. Every board phase was probed against axe phases at 5° intervals, confirming safe central waiting/placement regions. The new blades use SAT against their visible rotated rectangle, then bounded spatial sampling at ≤.04u relative travel with .02u padding. At terminal player speed 28u/s, normal horizontal speed 6.8u/s, and the authored blade speeds (conservative tip bound 2.703/3.060u/s), a 60Hz tick requires up to 14 intervals / 15 sampled poses. Cardinal/diagonal, stationary/edge/jumping contacts and thin between-tick crossings have focused probes in `hazard-contact-probes.json`. Debug danger rectangles are broad-phase bounds; their empty diagonal corners are not lethal.

The first low axe-mount draft admitted no A→B timing in the calibration. Raising the mounts created broad upper-sweep windows. Browser QA then found marginal B→C clearance with a later press and a different C pin position; final pivots 21.3/21.9 admit both viewport traversals while unsafe sweeps still cause a retry. Endpoint text was also corrected from the inherited S2 wording.

## Shortcuts — review finding

`shortcut-probes.json` deliberately checks moving solid platforms. A can be landed on without a nail across all 28 sampled phase waits. A complete **unpinned route succeeds in fixed-tick simulation**, with B/C waits 228/264 frames. The intended pinned FIFO route completes with real browser controls, but **pinning is not compulsory in Layer 2 under the plan's solid-board default**. The 14 sampled entrance→B skip attempts fail through geometry. No invisible completion condition or Layer 1 outline rule was added. Requiring mandatory Layer 2 nail reuse would be a material design change for review.

## Verification

- `npm run test`: all **125 focused tests in 11 files** pass.
- `npm run typecheck` and `npm run build`: pass. Production JS 705.64kB / 184.33kB gzip; existing chunk warning remains.
- Broad command: `node node_modules/@playwright/test/cli.js test tests/browser/sketch-layer2.spec.ts tests/browser/sketch-layer1.spec.ts tests/browser/sketch-layer1-motion.spec.ts tests/browser/sketch-mechanics.spec.ts tests/browser/campaign.spec.ts --trace off` — **36 passed / one blur-driver failure**, 10.4 minutes. All 30 existing regression scenarios (five production campaign, 13 S2 route/reduced-motion, 12 S1) passed.
- Investigated the blur failure in Chromium: Playwright explicitly enables forced-focus emulation. A headed window alone still failed. Corrected the driver by disabling that emulation, then switching an actual foreground tab; no synthetic event or gameplay mutation. The targeted hazard/blur case passes (10.1s).
- Final `node node_modules/@playwright/test/cli.js test tests/browser/sketch-layer2.spec.ts --trace off`: **all seven cases pass**, 1.1 minutes, in headed Chromium. This covers full pinned FIFO traversal/captures at both sizes, exit retry/re-entry/restart, support recall/fall/R/pause/resize, active hazard contact and real blur, production/denied-storage/unknown-study isolation, S2 traversal and S1 pin/FIFO controls at both sizes.
- Thus all 37 distinct browser scenarios are verified across these runs; this is not reported as a single 37/37 run. `verification.json` retains exact commands/results. `git diff --check` passes; local Markdown links have no missing targets.

Actual successful placement observations on the final full route: A 7.353u/7.351u, B 8.313u/8.188u, C 7.035u/7.126u at 1280/960 respectively, all within the unchanged 10u reach and visibly on canvas. Raw positions/URLs/ticks are in `browser-measurements.json` and per-case `observations-*.json`. The focused files exercise ledger ownership, captured-phase resume, active axes, safe placement, transfer windows, unpinned probes, grounded exit, local retry and blade contact. Browser tests use real A/D, Space, pointer clicks, Q, R, Escape and visible menu buttons; the development hook is read-only. Unit contact/checkpoint probes intentionally position a body and are explicitly distinguished from real traversal.

## Captures and framing

A final S2 ownership audit also retained its original ability to pin its own reachable platform when exploring from the cleared exit. Added a focused preservation check and reran the real-control S2 transfer/captures after that correction; S3A traversal/gate behavior is unchanged.

Seventeen fresh PNGs are retained. Agent inspected entrance, standing/transfers, FIFO heads/axes, exit and S1/S2 captures at both sizes. Both requested sizes have entrance, A/B/C standing, FIFO C pin and exit captures:

| Moment | 1280×720 | 960×540 |
| --- | --- | --- |
| Entrance | [Capture](entrance-1280.png) | [Capture](entrance-960.png) |
| Board A | [Capture](on-board-a-1280.png) | [Capture](on-board-a-960.png) |
| Board B | [Capture](on-board-b-1280.png) | [Capture](on-board-b-960.png) |
| Recall A / pin C | [Capture](fifo-c-pinned-1280.png) | [Capture](fifo-c-pinned-960.png) |
| Board C | [Capture](on-board-c-1280.png) | [Capture](on-board-c-960.png) |
| Fixed exit | [Capture](exit-1280.png) | [Capture](exit-960.png) |
| S1 pins regression | [Capture](s1-pins-regression-1280.png) | [Capture](s1-pins-regression-960.png) |
| S2 exit regression | [Capture](s2-exit-regression-1280.png) | [Capture](s2-exit-regression-960.png) |
 Additional support-recall and S1/S2 regression captures are retained here; earlier evidence folders are not overwritten. `browser-observations.json` retains actual URLs, viewports, camera/body/target observations and flight samples.

The Layer 2 view remains 18u high and 32u wide at both aspect-identical sizes, with authored **leftward** 7.5u look-ahead. The 1.25u player is 50px / 37.5px tall at 720p / 540p. Focus ranges 17..18.8; the neighboring Layer 1 and Layer 3 bands remain visible in the same scene/canvas. Board thickness, round nail heads, mounted red blades, sweep guides and pale depth-separated scenery are visible before each commitment. Axes rotate independently of the frozen boards. Resize preserves authored geometry and queue.

## Review and limitations

This is automated real-control traversal plus agent visual inspection, not human approval, measured first-time pacing or a representative-machine performance profile. The raw timing sweep is sampled, and its successful phases do not prove every possible pin position or input schedule. Blade sampling has a conservative .02u margin. The existing >500kB production chunk warning remains. Final Sketch art/palette/audio and campaign integration are later work.

Human review should assess the leftward return path, usefulness of freezing versus moving-board traversal, both axe timing decisions, narrow C landing, visible nail heads/HUD at 960×540, and local checkpoint behavior. S3A stops here. S3B needs a separate request after review.
