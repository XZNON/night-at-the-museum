# S3A difficulty review — hard-v1

2026-10-06. The user rejected initial S3A as too easy and explicitly requested faster platforms, faster axes and nails that are really required. This revision stays within S3A and ends on fixed Layer 2 exit ground. S3B is still unimplemented. Earlier S3A captures/measurements remain in the parent folder and describe the superseded solid-board default.

Play: [Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2). Regression URLs: [S1 pins](http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=pins), [S2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1). Production isolation: [preview](http://127.0.0.1:4173/?scene=unfinished-sketch&study=layer-2). Production ignores studies; preview runs during Playwright checks, or with `npm run preview`.

## Changed gameplay

Moving Layer 2 boards are dashed volumes with no collision until pinned. Pinning freezes the current transform and inks thick solid support; FIFO recall removes that support immediately and resumes its captured motion phase. No invisible completion flag is used. Reviewed S1 retains its moving solid boards; S2's four faster pendulums, two FIFO recalls and centered circular nail heads keep their existing authored values.

| Object | Before | Current |
| --- | --- | --- |
| A width / period | 4.6u / 5.6s | 3.4u / 2.4s |
| B width / period | 4.2u / 4.8s | 3.0u / 2.0s |
| C width / period | 3.8u / 6.2s | 2.6u / 1.7s |
| Axe A pivot / period | (51.5,21.3) / 6.8s | (51.5,20.9) / 2.6s |
| Axe B pivot / period | (41.8,21.9) / 5.8s | (41.8,21.5) / 2.2s |

Boards move 2.33/2.40/3.65 times faster and axes 2.62/2.64 times faster. Lower mounts put the blades further into jumping clearance. Widths shrink 26/29/32 percent. Global movement, two-nail budget, 10u reach, 46px click area, retry checkpoints and 18u stacked-world camera stay unchanged.

## Mandatory nails and measured clearance

All three board pins and at least one FIFO recall are required through physical support, geometry and the two-nail budget. A/B/recall-A/C is the verified standard solution; midair recall/re-pinning remains valid advanced play and no flag forces a specific sequence. Unpinned outlines never appear in the collision surface list; real no-nail jumps fall and recover locally at both screen sizes. The budget refuses C while A/B occupy both nails; Q really recalls A, which removes support, before C can be pinned.

Skip envelopes grant full 6.8u/s takeoff, remove axes, include all 99 air-jump delays including re-ascent from below destination height, grant full body-edge overlap, and add an extra 0.68u of coyote travel. Extreme board poses are combined generously even when their phases differ. The gaps exceed these bounds:

| Omitted support | Smallest gap | Generous measured reach | Margin |
| --- | --- | --- | --- |
| A: entrance to B | 13.50u | 12.89u | 0.61u |
| B: A to C | 15.00u | 13.80u | 1.20u |
| C: B to exit | 13.30u | 13.12u | 0.18u |

The C skip margin includes a full extra coyote interval and body overlap; it should be remeasured if movement or geometry changes. Safe central standing/socket positions remain clear across 360 board phases and 72 blade phases per board: conservative horizontal gaps 1.25/0.25/0.65u. Safe waiting does not imply a safe jump.

At the measured default pin setup, A accepts the tested air-jump schedules 10/13/16/19/22/25/28 frames. Axe A crossing accepts sampled waits 76..94 frames in two-frame steps, a 0.30s span repeating every 2.6s. Axe B accepts 80..92 frames in two-frame steps after the recorded B setup, a 0.20s span repeating every 2.2s. These are setup-dependent successful samples, not exhaustive universal windows. Bad launch phases fail. Pin height/position changes clearance: the real browser solution pins A low (~16.12u), B around x46.73, C around x37.14, then watches the sweeps. The driver uses ordinary clicks and keys only, with airborne braking; observations are read-only.

Blade SAT/swept contact remains aligned to visible oriented geometry. Updated conservative tip speeds are 7.069/8.068u/s; worst authored player motion requires at most 16 intervals/17 poses per tick at the existing <=0.04u spacing and 0.02u pad. Stationary, side, underside and jump contact probes use actual faster authored periods. Socket/standing tests and recall-current-support/repin tests remain focused collision checks.

## Verification and evidence

Exact final commands, pass counts and known diagnostic failures are in [verification.json](verification.json). [Measurements](measurements.json) aggregates speed, skip and timing probes. Per-case observations record actual URLs, ticks, screen/world target poses, placement distances, flights and lifecycle results. Browser controls are A, Space, left click, Q, R, Escape, menu clicks and actual tab switching for blur; no browser teleport/state mutation. Unit blade/checkpoint probes intentionally position bodies and are separate from traversal.

Captures at each size: `entrance`, `on-board-a`, `on-board-b`, `fifo-c-pinned`, `on-board-c`, `exit`, `no-nail-retry`; plus `recalled-support-960`, S1 pins and S2 exit regressions at both sizes. Inspect these local PNGs alongside their observation records. The camera keeps the player at 50px/37.5px and neighboring Layer 1/3 context; dashed/inked supports and head-only circular nails remain readable.

Initial faster/lower tuning exposed a too-small second-axe window; raising only B's mount from 21.2 to 21.5 widened the measured window. Early real-control attempts also failed when pinning A high or using the old slow-axe launch timing; the driver now observes useful pin poses and the fast sweep. A new no-nail check initially asserted the wrong cue text (`Missed`); actual local fall cue is `Nothing under you`, and that assertion was corrected. A diagnostic browser observation type initially omitted world x/y; it was fixed before the final typecheck/build. These failures were not treated as passing validation.

## Review boundary and limitations

Review the short route's difficulty and whether the pin-height/timing decisions feel satisfying. Automated completion proves feasibility, not human difficulty/pacing approval; no human duration or representative-machine performance measurement is claimed. Sweeps/windows are deterministic and can be learned. S1/S2 remain regression entries. No S3B, second escalator, joined route, Layer 3 challenge, campaign/ending, art generation, dependency, commit/push, publishing or sub-agent work was added.
