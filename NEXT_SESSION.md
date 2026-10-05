# Next session — M4 Sleeping Mountain and ending

Updated 2026-10-06. M3 final prop-camera/art/audio/full-loop gate has passed. This handoff belongs to the completed-M3 snapshot; verify git status/log and origin before implementation. The user authorized committing/pushing completed M3. No mountain or campaign ending exists yet. No publication/submission/email or sub-agents.

## Preserve

Royal Supper gameplay and masterpiece/banquet-v5/player references remain approved. Guarded double jump, butter/crumb sliding, grapes, mandatory fork, separated trident candles with timed relighting, three diner crossings and two jelly launches are unchanged. Gameplay, level and campaign files still match baseline 605bee4. Existing DreamLayer slice/restoration art and original Howler audio remain intact.

Three OpenAI ImageGen sheets provide the 14 remaining required M3 props with separate provenance. Do not regenerate them. The user-requested watcher presentation now uses soft golden rays from painted eyes to table during LOOK; AWAY/TURNING use normal lighting. Head-turn warnings, authored cover/detection and pause timing remain unchanged. Rays stay behind player/cover and own their GPU resources. The existing distant background follows upward camera movement so the high dessert ascent has a filled backdrop; foreground/world collision are unchanged.

DreamLayer food recovery failed seven same-key rounds / 21 attempts before the user-authorized ImageGen fallback. Retired food request identity remains preserved: request f5b39560-0e62-40ff-ade9-339bcd2490ff, no output/execution identity. Known delivered DreamLayer costs remain 7 reference + 3 production credits; last successful balance was 90. Failed-job costs and ImageGen billing remain unknown, not zero. Do not retry retired requests. The ImageGen exception covers M3 props only and does not authorize substitution for mountain art.

## Verification and evidence

- Node v22.14.0/npm v10.9.2 re-verified. Final build/typecheck and all 40 focused tests pass.
- Complete nine-scenario real-control Chromium suite passed with tracing disabled (11.7 minutes). Covers full museum/collection/return/restoration/reload/replay/reset, click/drag/keyboard placement, malformed/denied storage, settings, input contexts, movement, pause/frozen timers, save isolation, audio and resource disposal.
- Supplemental production traversal/storage/restoration passed with individual candle-state captures. After the final backdrop correction, this production regression passed again (2.6 minutes, one ordinary butter retry), with fresh LOOK/AWAY, flame and finale captures.
- Agent-inspected 1280×720 and 960×540 visuals: avatar visible under cover during LOOK; normal AWAY lighting; fork rotation; trident cup/wax alignment and every ember/relit state; jelly/cake and high finale; pear restoration. Resized captures wait for two rendered frames. Notes/captures: docs/validation/m3-props and docs/validation/m3-restoration.png.
- All 41 recorded image/source/runtime and 12 original-audio hashes match. Private scans found no current local credential-value matches in source/public/build. Public assets: 7,190,042 bytes; dist: 7,836,184 bytes. JS: 638.86 kB / 165.00 kB gzip. Existing nonfatal >500 kB warning remains for loading/performance polish.
- These are automated controls/captures and agent visual inspection. No measured human first-time duration or representative-machine performance claim. Cross-browser/fullscreen/itch.io iframe, actual OS focus/hidden-tab, context restoration and representative profiling remain release checks.

## Next task

1. Read PLAN, DECISIONS, REQUIREMENTS and the Sleeping Mountain idea in mini games.md. Preserve this completed M3 snapshot and approved assets/gameplay.
2. Build a compact Sleeping Mountain placeholder route with authored wind currents and stone-bridge interaction using the established controller, explicit geometry, typed level data and scene lifecycle. Extract shared behavior only when this second use requires it.
3. Award stable sun-disc through shared progression; add a museum entrance only once playable. Connect sun placement/restoration and a complete two-stage ending. Replays must not duplicate awards or reverse restoration.
4. Verify new game → pear → mountain → sun → restoration → ending, with reload/reset/retry/transition/lifecycle and production paths. Validate camera and layout before geometry-specific mountain art.
5. DreamLayer remains intended for mountain art. Privately verify access, credits and current costs before a batch; missing art access does not block placeholder development. Do not reuse M3's provider exception automatically. Preserve approved references rather than asking for approval again.

M5 final museum and the optional garden scope gate follow a completed M4. Opening presentation stays M6. No broad catalogue, publishing/submission/email or sub-agents without authorization.

Commands: npm run dev; npm run typecheck; npm run test; npm run build; npm run preview. Browser checks: node node_modules/@playwright/test/cli.js test --trace off. Dev entry http://127.0.0.1:5173/?scene=royal-supper is save-isolated; production http://127.0.0.1:4173 ignores debug hooks. The persistent local preview on http://127.0.0.1:5175/?scene=royal-supper returned HTTP 200 this session; recheck rather than assuming it survives.
