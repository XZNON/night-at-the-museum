# DreamLayer asset and process note (v1)

How the art and audio of Night at the Museum were made, for the jam submission and
reviewers. Figures come from `asset-sources/manifest.json` and
`asset-sources/audio-manifest.json` (prompts, request IDs, hashes and credits
per asset), checked 2026-10-10.

## Summary

- **Every illustrated image in the shipped game comes from DreamLayer.** All 81
  images in the build trace to DreamLayer generations in the manifest; the only
  other image is the favicon, drawn in code (`scripts/make-favicon.py`).
- **59 DreamLayer operations, 56 credits** of the 100 allocated API credits
  for the game: 28 text-to-image, 21 image-to-image, 4 edits, 4 background
  removals, 2 cutouts. **6 more text-to-image (6 credits) made the itch.io
  cover candidates** (2026-10-10), leaving a balance of 38.
- **All runtime preparation is local and reproducible**: Python scripts cut,
  register and size the generated sheets into runtime files (85 recorded local
  preparation steps, 0 credits).
- **Audio is original procedural synthesis** (no samples, no generation
  service); **gameplay never depends on generated pixels**: collision, hazards,
  timings and level data are authored in code, and the art is fitted to them.

## Workflow

1. **References first.** For each world, DreamLayer reference images were
   generated and reviewed by the developer before any production use: the
   masterpiece *The Garden Before Dawn*, the curator heroine, the Royal Supper
   banquet and the Unfinished Sketch toolbox. Approved references are kept in
   `asset-sources/references/`.
2. **Sheets, not single sprites.** Props were generated as themed sheets
   (food, tableware, mechanisms, tools) in one cartoon style, then cut apart
   locally, which keeps the style consistent and the credit cost low.
3. **Local preparation.** Scripts crop, clean edges, size each piece from the
   level data and write WebP/PNG runtime files:
   `prepare-art.py` (masterpiece states and masks), `prepare-player-v2.py`
   (heroine poses), `prepare-light.py` (the enchanted light), `prepare-sketch-skins.py`
   (Sketch skins, backdrop, torch, museum painting) and `prepare-supper-cartoon.py`
   (Royal Supper hall, props, diner poses, museum painting).
4. **Registration.** The masterpiece's damaged, pear-restored and complete
   states are derived from one approved painting and aligned masks, so placing a
   piece restores exactly its region.
5. **Fitted to gameplay.** Art is scaled to authored colliders and measured so
   its visible tops sit on the collision tops; animation (diner poses, swings,
   flames) is driven by code.

## What came from where

| Area | DreamLayer source | Prepared locally into |
| --- | --- | --- |
| Masterpiece | the approved painting | damaged / pear-restored / complete states, the golden pear and enchanted light pieces, region masks |
| Curator heroine | approved character reference, cutout | idle, walk and jump poses |
| Royal Supper | banquet hall, food, tableware, candles, fan, flags and diner pose sheets (cartoon rework, 10 credits) | 38 runtime files: backdrop, table cloth and canopy, food and tableware skins, candles, fan, flags, three diner poses, the museum's banquet painting |
| Unfinished Sketch | toolbox mechanism, tool and ground sheets; toolbox backdrop, torch and garage painting | 31 runtime files: 27 skins (boards, axes, lifts, nails, glue, rails, tools), backdrop, torch, the museum's Sketch painting (lit and empty) |
| Museum room | — | built in Three.js from code (walls, frames, lamps, floor, runner); the paintings on its walls are the DreamLayer images above |

## Cover art (itch.io page, not in the game)

Six cover candidates were generated with DreamLayer on 2026-10-10 at the
developer's request, in two sets of three (the second after the game was
renamed Night at the Museum; prompts in `asset-sources/prompts/cover-*.txt`,
references in `asset-sources/references/cover/`): the curator before the faded
masterpiece (A), leaping into the Royal Supper painting (B), restoring the
golden pear (C), the paintings coming alive at night (D), a key-art portrait
(E; the generation added an eye patch) and a moonlit hall (F).
`scripts/prepare-covers.py` frames each to itch's 630:500 ratio (cropped, or
the whole square picture over blurred extended sides) and sets the title in
the game's Fredoka; the generated art carries no lettering.

## OpenAI ImageGen (not in the shipped game)

During the first Royal Supper production pass (2026-10-06), DreamLayer returned
repeated 503 errors, and the developer authorized OpenAI ImageGen for three
remaining prop sheets. Those props were later **replaced by the DreamLayer
cartoon rework (2026-10-09) and are no longer used at runtime**; they are kept
under `asset-sources/production/supper-m3-runtime/` with their own provenance.
ImageGen usage is not counted as DreamLayer credit.

## Audio

All music and sound are original, deterministic procedural synthesis written
for the game: `scripts/make-audio.py` (effects and the museum/supper beds),
`make-sketch-music.py` (the Sketch's rock/metallic loop), `make-ui-audio.py`
(menu sounds) and `make-museum-audio.py` (footsteps and room tone). No external
recordings or samples; hashes in `asset-sources/audio-manifest.json`.

## Security

No API key is in the browser code, public assets or the production bundle;
DreamLayer was called only from local scripts with a key kept outside the
repository.
