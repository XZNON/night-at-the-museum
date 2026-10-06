# Unfinished Sketch S3B — playable review gate

Checkpoint note, 2026-10-06: the user subsequently confirmed Slice 3 is made and authorized committing/pushing completed S3A/S3B to origin/main. Fresh checkpoint tests (132/132), typecheck and build pass; browser results below are retained from implementation, not rerun. Next is S4 on a separate implementation request. Earlier uncommitted/review-only wording below records the original verification session.

2026-10-06. S3B joins the reviewed Layer 1/2 challenges and adds the second escalator to fixed safe Layer 3 ground. Stop for human review before S4. All changes remain uncommitted over bd9cab7; original S2, S3A and hard-v1 evidence is preserved.

Play [joined Layers 1/2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2) or [direct Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2). The existing [isolated Layer 1](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1) still ends at its original Layer 2 landing. [S1 mechanics](http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics) remains accepted. Run `npm run dev`; `npm run preview` serves the production build on 4173 and ignores these entries.

## Implemented behavior

Preset IDs now differ from entry and active leg IDs. Joined first arrival advances once into Layer 2 with empty FIFO, two available nails, deterministic phases, zero velocity, cleared input and no endpoint. The existing hard three-board/two-axe challenge is unchanged. Its grounded exit offers fresh-E boarding; the second ride reaches Layer 3 and shows one endpoint. Each ride owns its own tread/path/pad, and camera focus/direction blends through the connected picture. New-route HUD names the current layer and shows riding motion.

The second ride uses the planned 4-second path from (26.2,16.3) via (22,17.8),(18,19.4),(14,21),(10,22.7),(6,24.4) to (4.2,24.4). Fixed arrival spans x0..10/top24.4/thickness2, spawn(4.2,24.4), fall line22 and 18u focus24.6..26. Non-playable guides overlapping the landing were removed. Stair artwork has no collision. Arrival is 7.125u above the highest Layer 2 board top (17.275), beyond the measured 4.479u double-jump ceiling; it cannot bypass the challenge.

R/fall/axe recovery stays on the active leg. Leaving during either ride restores that departure exit, never partial transport. Joined traversal re-entry retains Layer 2 but resets its entrance/nails/phases; terminal R/fall/re-entry restores Layer 3 ground. Restart resets the selected study entrance. Invalid leg/stage ownership recovers safely; reviewed isolated S2 frozen snapshots remain normalized. Leg/stage/retry/recovery boundaries clear input. This fixes a held direction continuing after fall respawn. Pause/actual tab blur freeze simulation/transit and camera after the final rendered interpolation settles; queued input is cleared.

## Fresh verification

- `npm run typecheck`, `npm run test` and `npm run build` pass: **132 focused tests in 12 files**. New state/restore/ride tests intentionally position bodies in unit fixtures; browser traversal never teleports or mutates the model.
- **39 distinct Chromium cases have fresh passing results across runs:** 14 S3B/hard-route/isolation/regression cases, 12 accepted S1 mechanics cases, 12 isolated S2 route cases and one full S2 reduced-motion case. Broad run was 37/39 in 6.5m; both failures passed after test-driver corrections in a targeted 2/2 run (46.7s). Supplementary resource checks passed 2/2 (1.1m); final joined HUD verification passed 2/2 (1.4m). This is an aggregate, not a single clean39-case run. Exact commands/outcomes and final direct check (2/2,45.1s) are in [verification.json](verification.json).
- Headed real keys/clicks complete direct and joined entries at 1280×720 and 960×540, both rides, full reduced-motion joined traversals at both sizes, and terminal fall/R/re-entry/restart. Joined Layer 2 fall/traversal re-entry never replays Layer 1. Both rides' mid-transit R/re-entry, actual foreground-tab blur, pause/resize, held-E and jump/place/recall suppression were exercised. No-nail and unsafe blade attempts fail locally.
- Sentinel-save bytes remain unchanged, denied storage works, unknown studies fall back to mechanics, and production exposes no observation hook. One canvas remains through re-entry. Fresh geometry/texture checks show prior scene uploads released (lazy camera-dependent geometry counts decrease on reconstruction), with one player texture; see per-case `reentryResources` records. Shared core/save/campaign code was not changed, so the complete Royal Supper campaign was not rerun in this bounded slice.
- Fresh [mandatory-pin probes](mandatory-pin-probes.json), [jump envelope](jump-envelope.json), [safe waiting clearance](safe-standing-clearance.json), [timing windows](timing-windows.json) and [blade sweep/contact probes](hazard-contact-probes.json) retain the reviewed physical limits. Omit-A/B/C margins are 0.61/1.20/0.18u after body overlap, generous air-jump delays and extra coyote travel. The C margin remains small; movement/challenge changes require remeasurement.

## Captures and observations

Canonical final images use `layers-1-2-` or `layer-2-` prefixes. Unprefixed PNGs are earlier diagnostic captures from this S3B session, not the latest presentation. Per-case `observations-*.json` files record actual URLs, ticks, target positions, flights, checkpoint states and resources. Earlier failed-run observations can be superseded by that case's passing rerun; diagnostic failures are explicitly summarized in verification.json and below.

| Decision/state | 1280 | 960 |
| --- | --- | --- |
| First boarding | [capture](layers-1-2-layer-1-boarding-1280.png) | [capture](layers-1-2-layer-1-boarding-960.png) |
| First transport | [capture](layers-1-2-layer-1-mid-ride-1280.png) | [capture](layers-1-2-layer-1-mid-ride-960.png) |
| Clean Layer 2 handoff | [capture](layers-1-2-first-handoff-1280.png) | [capture](layers-1-2-first-handoff-960.png) |
| Narrow B / axes | [capture](layers-1-2-l2-board-b-1280.png) | [capture](layers-1-2-l2-board-b-960.png) |
| FIFO C | [capture](layers-1-2-l2-fifo-c-1280.png) | [capture](layers-1-2-l2-fifo-c-960.png) |
| Second boarding | [capture](layers-1-2-layer-2-boarding-1280.png) | [capture](layers-1-2-layer-2-boarding-960.png) |
| Second transport | [capture](layers-1-2-layer-2-mid-ride-1280.png) | [capture](layers-1-2-layer-2-mid-ride-960.png) |
| Safe Layer 3 endpoint | [capture](layers-1-2-layer-3-arrival-1280.png) | [capture](layers-1-2-layer-3-arrival-960.png) |

Agent inspected these states at both sizes: thick cartoon support, readable centered circular nail heads, visible next board/axe, active gold boarding pads, level rider tread and destination support, comfortable 50px/37.5px player, and adjacent-row context. The second boarding view includes the approaching landing; final arrival retains the Layer 2 band below. Reduced motion retains essential transport. Full three-layer framing includes reserved non-playable guides; no S4 challenge was authored.

## Diagnostics, limitations and manual review

Early driver checks read queue/R state before a simulation tick and sampled the camera before the last paused render; waits were corrected. High A pins and displaced B pins changed hard-axe clearance and exposed failed blade timings. The driver observes useful poses, and new full-route cases allow up to four ordinary recorded challenge attempts via real R; it never changes tuning or model state. One run was interrupted by a source reload caused by an agent edit during testing; subsequent runtime files stayed stable. Testing found the real held-direction respawn issue, which was fixed at route recovery boundaries. A broad S2 check also issued A before its pending R tick cleared input; waiting for that retry fixed the check. These diagnostic failures were not counted as passing attempts.

Review controls: A/D or arrows move, Space jumps twice, left click pins marked sockets, Q recalls the oldest, E boards on the active pad, R retries, Escape pauses. Clear Layer 1 with A/B/recall-A/C/recall-B/D, then the first ride. Layer 2 uses A/B/recall-A/C; watch both fast sweeps and use low/useful pin positions. Check that leftward decisions, boarding and final ground feel readable, and that fall/R/leave/restart recover where expected. Stop at the green Layer 3 endpoint.

Automated feasibility is not human difficulty/pacing approval, measured first-time duration, representative-machine performance, cross-browser/itch.io/fullscreen verification or actual OS focus/context-loss validation. Existing >500kB chunk warning remains (final JS 709.90kB /185.47kB gzip). No Layer 3 challenge, sun/campaign/ending, new art/dependencies, commit/push, publishing or sub-agent work. Next action is user review S3B.
