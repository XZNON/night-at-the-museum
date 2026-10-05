# M3 production slice — approved direction

Prepared 2026-10-05 against gameplay snapshot `605bee4`. The user approved all three reference images with “Looks good to me”. Production generation is authorized within this small slice and subsequent required M3 assets; gameplay remains unchanged. Actual execution and cost evidence lives in `manifest.json`.

## Read-only access and price check

The existing secret-redacting bridge reports live image access, 93 promotional / 0 purchased / 93 available credits, and one credit per ordinary image operation. Current purchase pricing is $0.25 per credit. No generation was requested. Preserve a 20-credit reserve. Recheck live capabilities and balance immediately before running the approved batch; historical observations are not a spending guarantee.

The pinned `dreamlayer@0.3.0` supports generate, edit and cutout, but cannot invoke the server's sprite-sheet operation. Do not assume animation access through this CLI or upgrade it as part of the initial static slice.

## First batch

| Logical asset | Input and operation | Planned source | Runtime preparation | Quoted credits |
| --- | --- | --- | --- | --- |
| `player.idle` | Background removal of approved `player.reference` | `production/player-idle-cutout.png` | Inspect alpha/shadow, trim transparent margins, retain complete boots and scarf; mirror for left facing | 1 |
| `royal-supper.background` | Reference edit of approved `banquet.reference.v5` | `production/supper-background.png` | Prepare a subdued scenic layer with open foreground; avoid stretching the whole banquet across 435 units | 1 |
| `royal-supper.bread` | Reference edit of approved `banquet.reference.v5` | `production/bread-side.png` | Inspect straight side-view landing silhouette, then remove background | 1 |
| `royal-supper.bread.cutout` | Background removal of the preceding bread output | `production/bread-cutout.png` | Trim, resize and inspect edge halos; map visual top to authored platform top | 1 |

Initial quote: four ordinary operations / four credits. Cost is provisional until actual sequential before/after balances are recorded for each completed operation. Do not regenerate automatically after an uncertain response. Save the planned operation, immutable prompt and idempotency key before submission, then save returned execution/output identity before the next balance query.

Sources stay under `asset-sources/production`; prepared runtime images go under `public/assets`. Each operation receives a provenance record in `manifest.json`, including source/input hashes, reference lineage, prompt path, public execution ID, delivered size, quote, observed cost and preparation notes. No source filename becomes a save or gameplay identity.

## Prepared reference-edit prompts

Background:

> Derive a playable side-view scenery layer from this Royal Supper reference. Preserve its warm painterly candlelit red-and-gold palace, richly dressed diners eating and drinking, wine bottles, decanters, goblets, fruit and brass three-candle candelabra. Render the dining guests at the far side of the table, viewed straight across at tabletop height. Simplify the lower foreground into quiet dark warm colour and leave it free of route props, bread, platforms, butter, grapes, fork, jelly, pear or player. No near edge of an oblique table, perspective floor, UI, lettering or map. Background detail must stay softer and lower contrast than a tiny teal traveller. One flat wide image; no implied separate layers or transparent export.

Bread:

> Derive one reusable game platform from the painterly Royal Supper reference: a single warm golden loaf or thick bread slice in strict side elevation, with a broad nearly horizontal upper landing edge, rounded crust at both ends and a visible crumb-textured side. One isolated loaf only, centred and fully visible on a plain contrasting background. No plate, basket, hands, cutlery, table, shadow extending beyond the loaf, text or character. Strong readable silhouette and rich hand-painted oil texture; lighting from upper left, cream highlights and warm brown crust. Width approximately 2.4 times its height. This is art for an existing rectangular collider; do not add spikes or raised toppings to its landing surface.

## Camera and geometry acceptance

- Keep `src/levels/royal-supper.ts`, controller tuning, model timings, checkpoint IDs and campaign contracts unchanged.
- Use the existing 13-unit orthographic camera height. The 0.65 × 1.25-unit player is approximately 36 × 69 pixels at 1280 × 720 and 27 × 52 at 960 × 540.
- Inspect the slice at both viewport sizes in the actual start/bread camera. Check face/scarf contrast, boot baseline, facing, alpha edges, platform landing alignment, camera motion and scenery repetition.
- Run through the bread introduction with real controls; generated pixels do not define collision. Keep the isolated entry and movement lane independent of stored campaign state.
- Confirm required-asset failure reports Retry/Back rather than silently shipping placeholder substitutes. Dispose textures/materials with scene ownership and verify repeated entry at matching views.
- Expand only after this slice is rendered and inspected. The next required set is basket/crockery/goblet, butter/crumbs, rolling grape, fork, fan/trident wax/holder, cover dish, jelly, pear, player frames and locally aligned masterpiece restoration. Simple flame/feedback effects may remain authored code.

## Sound and completion after the reference checkpoint

Create original reproducible audio sources or use explicitly licensed files with provenance. Pin Howler and its typings; preserve the existing validated `masterVolume` setting. Activate from a real gesture, freeze scene ambience and stop gameplay cues on pause/blur, dispose scene sounds on transitions, and unload application audio on teardown. Cover jump/bounce, slide/hazard/attention, fork/fan, collection, return and restoration; visual cues remain sufficient with volume zero.

Finish the full production collection/return/placement/reload/replay/reset regression, isolated traversal/lifecycle checks and visual inspection before marking M3 complete or making its authorized commit/push. Mountain and the ending remain M4.

## Actual outcome — 2026-10-06

All three references were approved and live preflight repeated before production. Three operations delivered (player cutout, background edit, bread edit), each costing one credit: 93→92→91→90. The quoted fourth operation, bread cutout, repeatedly returned upstream 503 and is retired without a delivered execution/image. Its actual cost remains null, with no further observed balance delta. A documented local flat cross-section crop with crust borders supplies the bread runtime texture instead.

The slice is integrated and agent-inspected at 1280×720 and 960×540; real-control bread traversal passed with zero retries and required-image failure/retry works. Local registered poses, matching pear and aligned restoration images also work in production. Original synthesized Howler audio is integrated and independently documented. Final 40 focused tests and all 9 Chromium regressions pass.

Subsequent work on 2026-10-06: after seven failed food recovery rounds / 21 attempts, the user authorized OpenAI ImageGen for the remaining required M3 props. Three preserved atlases now supply 14 integrated food/crockery/mechanics props with separate provider provenance and unknown ImageGen billing. The failed DreamLayer identity is retired; known delivered DreamLayer costs remain 7 reference + 3 production credits, with last successful balance 90. Final prop-camera and production-loop QA is recorded in PLAN.md and NEXT_SESSION.md. Watcher eye blobs were also replaced with authored golden LOOK rays at the user's request, without changing gameplay or generated assets.
