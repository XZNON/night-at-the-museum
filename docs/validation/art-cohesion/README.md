# Scoped M3 visual-cohesion QA — 2026-10-06

Baseline is completed M3 `1750ed3`. This is a selective local preparation pass,
not a new provider generation, gameplay revision or replacement reference set.
The previous uncommitted documentation/provenance edits are preserved.

## Inspection and selection

Inspected the complete 14-prop review and registered player poses, fresh start
views and the retained M3 fork, candle, cover/LOOK and high-dessert renders.
The player already has clear teal/cream shapes and broad painted shading.
Bread's dense photographic pores clash most strongly at actual camera scale.
Basket's thin wicker grain also competes at the pilot entrance. Cake's granular
crumb and the crumb hazard's fine ridges show the same issue later in the route.

Prepared only **bread, basket, crumb and cake**. Offline edge-preserving
Kuwahara filtering selects broad low-variance colour regions, blended with
original pixels to retain restrained texture. It adds no shapes, holes or
palette changes. Warm crust, irregular crumb cavities, wicker bands, cream
frosting and dark cake layers remain recognizable. The softer detailed banquet
background, registered player and the other 11 M3 prop subjects are reused.
Of the 14 M3 prop cutouts, only basket/crumb/cake change; bread is the separate
DreamLayer slice. Original files and source atlases remain byte-identical.

## Pilot evidence

`before-start-*` / `after-start-*`, `before-jump-*` / `after-jump-*`, and
`before-landing-*` / `after-landing-*` are fresh actual-renderer 1280×720 and
960×540 captures. Both pilot runs used real D/Space inputs and landed on the
first bread at y=1.4, x≈8.2. Additional `*-controls-960-*` captures repeat the
actual movement/landing pilot with controls at 960×540 (not just resized stills).
Read-only development observations check landing;
no teleport, time/phase or progression setter is used. Paused captures hide
only the dialog and wait two rendered frames after resize.

Reproduce with `node scripts/capture-cohesion.mjs before` and `after` while
`npm run dev` serves port 5173. The before command intercepts only revision
texture requests and returns the preserved original M3 PNG bytes. It uses the
same logical IDs, renderer, camera and unchanged controller as the after run.
Wall-clock input and camera interpolation may produce small pose offsets.
Append `http://127.0.0.1:5173/?scene=royal-supper 960` to either command to
repeat the controls at the smaller viewport.

Pixel comparisons are in `asset-sources/production/cohesion-v1/pilot-review.png`
and `review.png`. Reproduce preparation with `scripts/prepare-cohesion.py`
(`--pilot` limits it to bread/basket). Every revised image has exactly the
original dimensions and alpha channel; source and output hashes have separate
manifest records with `.cohesion-v1` revision IDs.

## Provider and cost boundary

No DreamLayer/ImageGen operation or retired-request retry occurred. Local
preparation costs **0 generation credits**. No fresh provider balance was
needed or assumed for offline work. Existing DreamLayer lineage and the scoped
ImageGen prop exception remain distinct; upstream failed-job/ImageGen billing
continues to be unknown. No new reference approval or provider exception.

## Final regression

All **40 focused tests**, typecheck and production build pass. The complete
**nine-scenario real-control Chromium suite passes** with `--trace off` in
**11.4 minutes**. Isolated first traversal/replay each used one ordinary butter
retry; production traversal/replay and denied-storage traversal used zero.
No gameplay tuning or harness-timing changes were needed.

`after-production-*` retains 26 state captures at both sizes: butter/crumb,
grapes, upright/rotating fork, trident, each of three ember states, relighting,
AWAY/LOOK cover, dessert approach and filled high finale. The restoration
capture preserves the matching pear/masks. These are quality-92 WebP exports
of the inspected PNG captures in ignored test-results; the pilot evidence is
lossless PNG. Baseline interaction captures remain in docs/validation/m3-props.

Agent inspection confirms reduced grain in bread/crumb/cake, preserved wicker
bands, alpha edges and teal player/foot registration, readable landing lips,
visible avatar under LOOK, aligned fork/cups/wax, independent flame cues,
high-backdrop continuity and registered restoration. The complete suite covers
collection/return/placement/reload/replay/reset, malformed/denied storage,
settings, asset failure/retry, museum input/pointer lock, isolated save protection,
frozen timers, movement, audio activation/volume/pause and resource disposal.

49 recorded image/source/runtime hashes and all 12 audio hashes match. Original
prepared/source files compare byte-identically against 1750ed3; dimensions and
alpha match for all four revisions. Runtime code differs only in four manifest
paths. Public assets: 7,881,765 bytes; dist: 8,527,937 bytes; JS: 638.89 kB /
165.02 kB gzip. Original textures remain at their paths for rollback, adding
691,723 bytes of prepared variants; the existing >500 kB chunk warning remains.

Automated traversal/agent visual QA cannot establish human first-play duration
or representative-machine performance. Cross-browser/fullscreen/itch.io iframe,
actual OS focus/hidden-tab, context restoration and hardware profiling remain
release checks. M3 stays complete as the baseline; the separate cohesion pass
is verified. No M4, mechanics, final museum, publication or generation.
