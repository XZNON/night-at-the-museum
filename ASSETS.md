# DreamLayer asset workflow

## Goal

Use DreamLayer to create the masterpiece, matching recovered pieces, framed entrance artworks, layered playable worlds, props and character art. Keep style and identity consistent without spending credits on assets the final layout does not need.

The invitation allocates 100 API credits after claiming/verifying participation. Do not assume the balance is already available, that browser credits are the same pool, or that one credit equals one image.

## API timing and verified tooling

Set up the key at the beginning of the next implementation session and run read-only capability/balance checks. Use a local development environment variable named `DREAMLAYER_API_KEY`; never use a `VITE_` prefix for a secret. The CLI is the default asset-production tool, avoiding a custom API client for the jam.

After initial camera/movement setup, spend a small initial batch on approved masterpiece/banquet/character references. Produce geometry-specific props and scene layers after the Royal Supper route is validated. The key is not part of the shipped game.

Verified on 2026-10-05: [DreamLayer CLI](https://docs.dreamlayer.io/cli) provides `capabilities` and `balance` checks without generation charges, plus generate/edit/cutout/upscale commands. [Current documentation](https://docs.dreamlayer.io/) states ordinary image operations cost one credit each; sprite animations use frame-count pricing. A generated image followed by an edit and background removal is multiple operations. Recheck capabilities/pricing before spending.

Use saved execution IDs and stable idempotency keys to recover interrupted jobs without submitting duplicate generations. Start with one active job. See [retry guidance](https://docs.dreamlayer.io/agent-api/idempotency-and-retries) and [limits](https://docs.dreamlayer.io/agent-api/limits).

## Before generating

1. Verify account/API or CLI/MCP access, available credits and current generation/edit costs.
2. Keep credentials outside the client and public files; never log keys.
3. Identify model/tool capabilities actually available, including image references and output formats.
4. Create a small asset list for the current milestone with size, viewpoint, layer/cutout requirements and priority.
5. Reserve roughly 20% of available credits for retries/edits as a planning default; adjust to actual pricing and successful outputs.

Missing generation access does not stop placeholder gameplay work. Do not replace DreamLayer with another generator without user direction. On 2026-10-06 the user explicitly directed generating and using the remaining required props here; OpenAI ImageGen is authorized for that M3 set only. Keep providers/cost evidence distinct and preserve existing DreamLayer sources and failed request identities.

## Production order

### A. Early reference tests

Generate a small set of masterpiece and Royal Supper style references. Establish painterly appearance, lighting, player readability and artifact identity. These are direction tests, not a full asset batch.

Masterpiece default: The Garden Before Dawn. Supper default: warm candlelit royal banquet, red/gold fabric and oversized crockery. Preserve one approved reference for each world.

On 2026-10-05 the user requested a wider full-table supper reference with more diners eating/drinking, wine and glasses, cutlery/goblets/fruit, and trident-shaped three-candle candelabra. Preserve the original reference and record the reference-edit lineage. After visual approval, include these decorations only as needed by the tested supper camera; maintain foreground readability and authored collision geometry. The later expanded mechanics request changes the final layout; validate it before production.

### B. Geometry proof

Build and tune the placeholder route. Capture its camera view and document required platform/prop dimensions. Choose final two/three-stage campaign before producing final restoration masks and compositing.

### C. First adventure production

Derive scene layers and props from the approved banquet reference. Generate the pear with consistent appearance between masterpiece, king's plate and inventory. Work in small batches, inspect results, then integrate before generating more.

The expanded route and separate masterpiece, banquet-v5 and player references are user-approved on 2026-10-05. The old M2 geometry is no longer the export target. The DreamLayer player/background/bread slice, matching pear, entrance and aligned restoration images are integrated; original audio has separate provenance. Three production plus seven reference DreamLayer credits are recorded; latest successful balance is 90. After seven failed same-key food recovery rounds (21 attempts), the user explicitly authorized ImageGen for remaining required props. Three separate ImageGen atlases now supply 14 prepared props, integrated against unchanged camera/colliders and verified in final full-loop/camera QA. Failed DreamLayer food identity is retired and preserved, actual cost null. Sources/prompts are separate under production/imagegen and prompts/imagegen-*.txt; local crop/resize is reproducible with scripts/prepare-props.py. ImageGen billing is not exposed, so no DreamLayer credit amount is assigned. Do not regenerate delivered assets or retry retired requests automatically. See manifest.json and NEXT_SESSION.md.

### D. Other adventures and museum finish

Generate mountain assets after its route is validated. Produce Drowned Garden only if its scope gate passes. Finish museum decoration and title/interface art after playable assets are covered.

## Asset preparation rules

- Keep source images and exported runtime images separate.
- Specify side view for gameplay props, clear silhouette, required orientation and intended scale.
- Inspect background removal, edges and seams; output may need local preparation. Layered export is not assumed.
- Request alternate states against the same approved reference, but verify alignment. Generation does not guarantee pixel registration.
- Final restoration uses one aligned damaged base, restored art and authored region masks. Locally register/composite images when needed rather than relying on repeated generations to align perfectly.
- Inventory pieces are separate cutouts; the restored composition contains their matching positions. Define normalized target coordinates and hit regions against that composition.
- Decorative source pixels do not define collision. Runtime colliders remain authored level data.
- Use WebP for appropriate colour textures and PNG for lossless masks/edges when needed. Choose size by screen use; keep originals outside the build.
- Avoid large transparent margins and excessive overlapping layers. Atlas related frames/props when useful.
- Check whether character frames are actually consistent; do not assume generated sprite sheets align automatically.

## Asset manifest

Create `asset-sources/manifest.json` when generation starts. Each asset record should include:

```json
{
  "id": "royal-supper.pear",
  "status": "planned",
  "world": "royal-supper",
  "purpose": "Collectible and inventory representation",
  "referenceIds": [],
  "sourcePath": null,
  "runtimePath": null,
  "promptPath": null,
  "provider": "DreamLayer",
  "generatedAt": null,
  "creditsSpent": null,
  "pixelSize": null,
  "preparationNotes": "",
  "approved": false
}
```

Status values: planned, generated, approved, prepared, integrated, rejected. Provider identifies DreamLayer, not its underlying model. Record returned public execution IDs and actual credit usage; null means unknown, not zero. Underlying models/routing are private and must not be requested or invented. Preserve prompts and references without credentials. A separate typed runtime manifest maps logical IDs to prepared paths; game code must not depend on source filenames.

## Required sets

| Set | Required visual content |
| --- | --- |
| Masterpiece | Finished composition, damaged base, region masks, matching inventory pieces |
| Royal Supper | Entrance artwork, background layers, bread/crockery/goblet, butter/crumbs, grapes, fork, rotating fan/three-candle holder, dish cover, jelly, pear and player art |
| Sleeping Mountain | Entrance artwork, landscape layers, terrain/platform art, wind/bridge props, sun |
| Optional garden | Entrance artwork, garden layers, fountain/channels/valves/wheel, bird |
| Museum | Artwork textures, selected floor/carpet/decor textures; room/frame geometry authored separately |
| Presentation | Title artwork and selected icons; text/UI layout authored in HTML/CSS |

Audio is a separate licensed/original workflow, not a DreamLayer image output.

## Submission evidence

Keep approved references, a small before/after restoration comparison, and images showing generated props in the actual game. Record what DreamLayer generated and what was authored or edited locally. Prepare a concise workflow explanation and gameplay screenshots for itch.io. Do not claim an asset is DreamLayer-generated until its provenance is recorded.
