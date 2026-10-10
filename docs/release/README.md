# Release v1 — itch.io package, submission materials and checklist

Prepared 2026-10-10 for the DreamLayer jam. Nothing has been uploaded,
published or submitted; the developer does that.

## Files

| What | Where |
| --- | --- |
| itch.io zip (index.html at the root, relative paths) | `release/night-at-the-museum-v1.zip` and `.zip.sha256` (repository root, not committed); rebuild with `npm run build` then `python scripts/package-itch.py` |
| Page text, embed settings, controls, jam answer | [ITCH_PAGE.md](ITCH_PAGE.md) |
| DreamLayer asset and process note | [DREAMLAYER_PROCESS.md](DREAMLAYER_PROCESS.md) |
| Credits and licences | [CREDITS.md](CREDITS.md) |
| Cover image: **cover-b.png** (user's pick); candidates A gallery, B leap, C restore, D alive, E portrait, F moonlit | [cover/](cover/) — 630 × 500 and `@2x`; screenshots are the developer's own |
| Release test evidence | [docs/validation/release-v1/](../validation/release-v1/README.md) |

## Upload steps (for the developer)

1. itch.io → Dashboard → **Create new project**; fill in the settings from [ITCH_PAGE.md](ITCH_PAGE.md) (Kind of project: **HTML**).
2. Upload `night-at-the-museum-v1.zip` and tick **This file will be played in the browser**; set the embed options listed there (1280 × 720, fullscreen button on).
3. Paste the page text, controls and credits; add the cover image and screenshots.
4. Keep the project as a **Draft**, open its page and play it once inside itch's frame (see the hosted checks below).
5. Set it to **Public**, then on the jam page choose **Submit your project**, pick it and answer the jam's questions (the DreamLayer answer is in [ITCH_PAGE.md](ITCH_PAGE.md)).

## Release checklist

Status key: **verified** (automated or human evidence in this repository), **to check** (needs the developer, a hosted build or other hardware).

| Check | Status | Evidence |
| --- | --- | --- |
| Typecheck, production build, unit tests | verified 2026-10-10 | unit 249/249 (`--testTimeout=30000`) |
| New game → Royal Supper → pear → Sketch → light → ending | verified by automated real-control runs; the last full human play-through (2026-10-08) predates the Royal Supper cartoon rework, so **one human play of the release build is still to do** | S5C evidence; regression below |
| Release browser regression | verified on the renamed build: release 3/3, campaign 6/6, audio, art, Supper cartoon, Sketch art 5/5 , Sketch campaign 5/5, Sketch ending 5/5 including the full New Game → ending campaign (27/27, first run) | [release-v1](../validation/release-v1/README.md) |
| Production entry: no debug hooks or direct levels, no console errors or failed requests, favicon | verified | `release.spec.ts` |
| Subfolder + cross-site iframe (itch-like): focus after click, saves across reload, blur pause, fullscreen button, 1280 and 960 embeds | verified in Chromium | `release.spec.ts` |
| Case-sensitive file names (itch's servers) | verified: 79 literal asset paths (packager) and every scene's requests from a case-sensitive host | `package-itch.py`, `release.spec.ts` |
| itch.io limits | verified: 120 files, 10.1 MB unpacked, 8.7 MB zipped (`night-at-the-museum-v1.zip`) | `package-itch.py` |
| Saves: reload at collection/restoration, malformed and denied storage | verified (Chromium) | `campaign.spec.ts`, `sketch-ending.spec.ts` |
| Hosted build inside itch.io's real frame | **to check** on the draft page: title loads, sound starts after the first click, keys work after clicking the game, progress survives a page reload, fullscreen button | |
| Firefox / Edge / Safari | **to check**: only Chromium is automated. In each: the title and museum render, sound plays, walking and the Supper jumps feel the same, a reload keeps progress (Safari and Firefox may clear storage for embedded games) | |
| Performance on a representative laptop (60 FPS at 1280 × 720) | **not measured**; no representative-machine profile is recorded | |
| Play time | about 15 minutes (the developer's own run, 2026-10-10) | |
| Royal Supper checkpoint bug | fixed: a jumped-over checkpoint stranded the route so the pear did nothing (found in the user's play); unit-tested | `tests/royal-supper.test.ts` |
| Known behaviour | Clicking outside the game (including itch's fullscreen button) pauses it; Resume continues. The JS bundle is 841 kB (224 kB gzipped); Vite's size warning is expected. Three small masks used only by the art scripts ship in `assets/restoration/` (10 kB). | |
