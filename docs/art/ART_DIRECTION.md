# Art direction — stylised, leaning animated

Accepted by the user on 2026-10-06 after the bread comparison and the recommendation to use readable animation-inspired shapes with light hand-painted texture. This is a targeted visual-cohesion follow-up to completed M3, not a gameplay revision or an instruction to rebuild its asset set.

Later planning update, 2026-10-06: Unfinished Sketch replaces Sleeping Mountain for M4; see docs/gameplay/UNFINISHED_SKETCH.md and current PLAN/NEXT_SESSION. Mountain references in the completed follow-up scope/prompt below are historical. This file does not approve Sketch references, generate new assets or authorize repeating the completed M3 pass.

## Game-wide heroine — user decision 2026-10-07

The user replaced the player character for the whole game with a woman art
restorer (option A in `asset-sources/references/sketch/player-woman-concepts-v1.png`):
dark messy bun with a paintbrush, brass goggles, deep-teal smock dress over a
cream blouse, mustard satchel, dark boots. This supersedes "keep the small teal
restorer's identity, cream scarf" and "keep existing registered player poses"
below. Poses, provenance and registration: docs/art/SKETCH_ASSETS.md.

## Royal Supper cartoon rework — user decision 2026-10-09

The user chose to rework Royal Supper's art to **match the Sketch's cartoon
look** (bold ink outlines, cel shading, poppy colours), covering everything
visible, with code animation plus drawn diner pose frames, from DreamLayer
reference sheets cut locally. This supersedes the M3 painterly target and the
completed cohesion pass below for Royal Supper; the masterpiece, the golden
pear and the museum stay as they are.

Delivered: a cartoon banquet hall backdrop (the whole hall in view, hazed and
with the tablecloth drape darkened so drops read), food, tableware, candles,
fan, checkpoint flags and a giant watchful diner seated behind the far table
edge with eating / turning / looking poses; a second banquet edit hangs in the
museum. Collision, timings, level data and saves are unchanged. Sources,
prompts, costs and the preparation recipe:
`asset-sources/references/supper/`, `asset-sources/prompts/supper-*.txt`,
`scripts/prepare-supper-cartoon.py`, `asset-sources/manifest.json`. Evidence:
[docs/validation/supper-cartoon](../validation/supper-cartoon/README.md).

## Unfinished Sketch — separate selected direction

Further user clarification: modern cartoon 2.5D, with a dimensional animated-world feel rather than flat 2D, pixel art or retro tiles. Side-view gameplay keeps its plane while platform/board thickness, rounded prop volume, layered scenery and soft stylised lighting establish depth. These cues must preserve foreground gameplay readability. Existing illustrated player poses can remain; no new full-3D character, free-depth controller or rendering engine is requested.

The user subsequently explicitly selected a fully animated/cartoon look for Sketch's artifacts and entire theme, with no realism or semi-realism. This includes the environment/background, not only interactive props. Use clear exaggerated silhouettes, readable outlines, broad colour shapes and simple cel-style shading. A drawn-workshop treatment may use playful construction marks; avoid photographic grain, realistic wood/metal/charcoal texture and semi-realistic scenery. Exact palette/composition and new references remain to be approved in a later art task.

S1 should use simple cartoon placeholders, not final generated assets. Existing gameplay supplies mechanism animation; the style does not request generated video or a new animation system. Preserve the restorer identity, recognizable sun identity and existing restoration registration. The approved Royal Supper, museum/masterpiece and completed cohesion pass remain unchanged. The M3 visual target below is specific to that completed pass and must not override Sketch's fully cartoon direction.

## Visual target

- Player and interactive props: clear designed silhouettes, simplified internal detail, broad readable highlights and soft shading, with restrained hand-painted texture. Keep the small teal restorer's identity, cream scarf, warm banquet palette and recognizable prop materials.
- Backgrounds: retain richer painterly detail, softer contrast and depth behind the playable foreground. Preserve the approved banquet composition and the backdrop behavior during the high dessert ascent.
- Bread/food: reduce photographic pores and microtexture. Keep recognizable irregular crumb shapes and warm crust. Avoid the oversized regular oval holes in the flat cartoon comparison, which resemble cheese.
- Motion: keep existing registered player poses and interaction/state animations. Animation-inspired appearance does not request generated video, a new animation system or more character frames.
- Masterpiece, recovered pear and inventory: preserve matching identity, registration and restoration masks. The existing approved painting is the composition reference; the style pass must not shift its targets.

The current/painted/cartoon comparison boards are exploratory examples. Acceptance of this written direction does not approve either generated board as a runtime asset. Preserve original sources and approvals; do not request the same reference approval again.

## Completed scoped pass — 2026-10-06

The bread/player/basket pilot was completed with real inputs at 1280×720 and
960×540. Selective offline preparation reduces fine colour texture in bread,
basket, crumb and cake; all original pixels/files, alpha and dimensions are
preserved at their original paths. The registered teal/cream player already
fits the target; richer soft scenery and the other 11 props remain in use.
No provider operation, generation charge, retired retry or ImageGen scope
extension. See asset-sources/production/cohesion-v1 for the reproducible recipe
and source-provider lineage.

40 focused tests, typecheck/build and all nine real-control Chromium scenarios
pass (11.4 minutes, tracing off). Both-size before/after pilot and production
state/restoration evidence is in docs/validation/art-cohesion. Gameplay,
registration, LOOK rays, high backdrop, restoration, audio and saves are
unchanged. PLAN/NEXT_SESSION record exact validation/limits. M3 remains the
completed baseline; this separate art-only follow-up is verified. The prompt
below is retained as the completed request's scope, not a request to repeat it.

## Scoped M3 follow-up

Start by inspecting the **completed** game and its 14 integrated props; the earlier bread-only comparison predates the complete prop set. Identify specific mismatches rather than assuming every asset needs replacement. Work from baseline `1750ed3`, verifying current git state first.

Pilot: improve the bread texture with the existing player and one nearby prop visible in the real camera. Prefer local preparation or selective reference-guided edits. Keep originals and use distinct revision IDs/paths with reference lineage. Do not automatically regenerate delivered atlases or create a broad catalogue. Inspect at 1280×720 and 960×540, including motion and landing readability. Expand only to existing assets that demonstrably clash with the selected style.

Preserve layout, collider geometry, player dimensions/foot registration, physics, jump/bounce rules, checkpoint positions, fork/fan/candle timings, cover/detection, golden LOOK rays and high-dessert backdrop. Preserve the minimal museum, saves, isolated entry, audio activation/volume/pause/disposal, one renderer and one fixed-step loop. No Sleeping Mountain, ending, final museum or new mechanics in this follow-up.

DreamLayer remains the intended source for major assets. Recheck access/balance/current costs privately before DreamLayer operations. The existing ImageGen exception covers the required M3 prop set; record providers distinctly and do not automatically extend it to other worlds or replacement of existing DreamLayer assets. Retired requests must not be retried. Do not treat historical balance as current, invent costs or silently switch providers.

## Verification and completion

Record before/after images in the actual camera at both sizes. Check alpha/edges, player baseline, landings, cover boundaries, fork rotation, candle ember/relight states, backdrop continuity and matching pear/restoration. Record provenance, actual known costs and unknown billing explicitly.

After runtime art integration, run typecheck/build, focused tests and the complete isolated/production browser regressions. The completed M3 baseline has 40 focused tests and nine passing Chromium scenarios; read docs/planning/PLAN.md for the final backdrop-specific regression and testing limitations. Do not claim representative hardware performance or human duration from those results.

Keep M3 marked complete as the validated baseline; record this follow-up separately until verified. Update docs/planning/PLAN.md with the final change, evidence and remaining limits. M4 Sleeping Mountain and the ending remain the next feature milestone afterward. No publication, submission, email or sub-agents.

## Paste-ready prompt

Continue The Last Curator in C:\Users\XZNON\DreamLayer. Read AGENTS.md, docs/planning/PLAN.md, docs/planning/DECISIONS.md, docs/planning/REQUIREMENTS.md, docs/gameplay/ROYAL_SUPPER.md, docs/art/ASSETS.md, docs/art/ART_DIRECTION.md and docs/planning/NEXT_SESSION.md. Verify checkout/environment first; completed M3 baseline is 1750ed3. Preserve any subsequent worktree changes.

Do the scoped M3 visual-cohesion follow-up before M4. The user chose stylised, leaning animated: player/props with clear animation-inspired shapes, simplified shading and light hand-painted texture; backgrounds retain softer, richer painterly detail. Reduce photographic food microtexture without making bread look like cheese or flattening the museum's painted atmosphere. The comparison boards are examples, not approved replacement assets. Existing gameplay and reference approvals remain valid; do not ask for them again.

Inspect the completed game and integrated props first. Start with a small bread/player/nearby-prop pilot in the existing camera at 1280x720 and 960x540. Prefer preparation/reuse and selective edits, preserve original sources, and expand only to specific existing assets that clash. Do not regenerate the whole set or change gameplay to fit images.

Preserve approved layout, colliders, physics, timings, registered poses, golden LOOK rays, high-dessert backdrop, museum/restoration, matching pear/masks, validated saves, original Howler audio and isolated entry. Follow docs/art/ASSETS.md provider rules: DreamLayer for major assets with fresh private access/balance/cost checks; the existing ImageGen exception is limited to required M3 props. Never retry retired requests or silently extend provider authorization. Record provenance and actual costs.

Inspect before/after rendering, alpha/landings/cover, fork and candle states; run focused tests, typecheck/build and full isolated/production regressions after integration. Baseline: 40 focused tests and nine passing browser scenarios. Update docs/planning/PLAN.md and the handoff with the verified follow-up. Keep completed M3 intact as the baseline. Do not start Sleeping Mountain/ending, finish the museum, add mechanics, generate a broad catalogue, publish, submit, email or use sub-agents during this pass.
