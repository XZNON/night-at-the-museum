# Release v1 evidence — 2026-10-10

Production build of **Night at the Museum** (renamed from The Last Curator on
the user's request this session), bundle `index-CMgvzK9b.js`, over `a69e562`
with this session's uncommitted release changes. Chromium only.

## What changed this session

- Release fixes: favicon, meta description; production keeps no debug hooks or direct levels.
- **Royal Supper bug (found in the user's play):** a checkpoint jumped over stranded the route and the pear did nothing. Fixed: a skipped checkpoint is taken on the next landing past it (gates still apply). Unit test in `tests/royal-supper.test.ts`.
- **Sketch step tips** (user): what to press now, with key glyphs, and an E keycap over a grabbable swing nail; short layer goals. Screenshots in [coach/](coach/).
- **Rename** to Night at the Museum (player-facing only; saves unchanged).

## Results

| Check | Result |
| --- | --- |
| Typecheck, production build | pass |
| Unit (`--testTimeout=30000`) | 249/249; accepted evidence JSON rewritten by unit runs restored |
| `release.spec.ts` (new): production entry; itch-like embed (cross-site iframe, subfolder, case-sensitive host) with focus, saves across reload, blur pause, fullscreen button, 1280/960; Royal Supper and the Sketch load every asset from the case-sensitive host | 3/3 |
| `campaign.spec.ts` (production Supper route, placement, reload, replay, reset; storage failures; museum input) | 6/6 |
| `audio.spec.ts` | 1/1 |
| `art.spec.ts` | 1/1 |
| `supper-cartoon.spec.ts` | 1/1 |
| `sketch-art.spec.ts` | 5/5 |
| `sketch-campaign.spec.ts` (headed; the Sketch in the campaign with the step tips active) | 5/5 |
| `sketch-ending.spec.ts` (headed; production placement, reload, denied writes, 960, and the **full campaign New Game → ending with real controls at 1280**) | 5/5 |

All 27 checks above passed on the first run on the renamed build (14:02–14:31; the two headed Sketch specs ran after the user's screenshots).
An earlier, superseded run on the pre-fix build had one known Supper butter-bot
flake in `campaign.spec.ts` (the replay route missed after-butter in four tries).

Screenshots and logs: [regression/](regression/) (PNG captures converted to WebP).

## Package

`release/night-at-the-museum-v1.zip` (not committed): 120 files, 10.1 MB
unpacked, 8.7 MB zipped, `index.html` at the root, forward-slash entries; all
79 literal asset paths match their files exactly. SHA-256 in
`release/night-at-the-museum-v1.zip.sha256`.

## Not verified

- The hosted build inside itch.io's real frame (the developer checks the draft page).
- Firefox, Safari, Edge; representative-machine performance. (Play time: about 15 minutes, the user's own run.)
- A full human play of this build (the user was playing it during the session; the pear bug came from that play).
