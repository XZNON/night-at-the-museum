# M3 camera verification — 2026-10-06

These are actual Chromium game-renderer captures at 1280×720 and 960×540, driven by keyboard/mouse controls. They are agent visual QA and automated traversal evidence, not measured human pacing or representative-machine profiling.

`captureFrozenArt` pauses simulation, hides only the pause/completion dialog, waits two rendered frames after resizing, captures, then restores the dialog. No body/phase/progression setters are used.

- `hidden-away-*` / `hidden-look-*`: isolated entry, normal lighting versus golden watcher rays, with the avatar visible inside authored cover. Taken before the final backdrop-follow adjustment; the rays themselves are unchanged.
- `production-hidden-*`: fresh production captures after backdrop-follow adjustment. Storage-denial notice is intentional and remains visible.
- `fork-*` / `fork-rotating-*`: upright and mid-rotation pivot/asset alignment.
- `trident-*`, `trident-ember-1/2/3-*`, `trident-relit-*`: all three wax tops/cups, individual safe windows, countdown strips and relighting. Brass arms remain decorative beneath real jump gaps.
- `dessert-approach-*` / `pear-finale-*`: jelly, cake and filled upper backdrop after the high-ascent correction. Pear is already collected in finale captures.
- `candle-exit.png` / `jelly-approach.png`: preserved earlier integrated-prop captures.

The full nine-scenario suite passed with tracing disabled. Final build/typecheck and 40 focused tests pass; the production traversal/storage/restoration regression passed again after the backdrop fix. Scripts can require normal checkpoint retries at butter when keyboard timing varies; physics/timings were not changed.

Generated art provenance is in `asset-sources/manifest.json`; authored audio is in `asset-sources/audio-manifest.json`. Watcher rays, flames, safe strips and backdrop transforms are authored Three.js presentation. No new art generation occurred in this verification session. See docs/planning/PLAN.md for the precise validation sequence and remaining release checks.
