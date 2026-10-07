# Unfinished Sketch — asset list and reference pass

Created 2026-10-07 at the user's request. This is the Sketch art asset list and
the record of the DreamLayer reference pass. It follows the fully cartoon,
modern 2.5D Sketch direction in [ART_DIRECTION.md](ART_DIRECTION.md) and the
provider rules in [ASSETS.md](ASSETS.md). Nothing here is integrated into the
game; generated images are **references only** until the user approves them.

## Setting — user-selected 2026-10-07

The picture lives inside a garage/toolbox. Mechanisms, hazards and scenery are
things found in a garage or toolbox, or things used with them (planks, rulers,
hatchets, clamps, paint tins, pencils, screws, tape). Keep the cartoon style
and the readable gameplay shapes; the theme dresses the mechanisms, it never
changes their collision or motion. This supersedes the "drawn workshop"
working concept.

## Order of work

1. Mechanism style references: done 2026-10-07 (11 approved, plus the
   backdrop direction).
2. Remaining layout-independent mechanism skins, sized from the typed level data.
3. Background/scenery layers after the S5 finale fixes the stacked-world bounds.
4. Museum entrance artwork when Sketch gets its frame in S5.

Player: reuse the existing teal restorer unless a reference shows a clear clash.
Generation of anything beyond the current step needs a further user request.

## Asset list

Generated with DreamLayer (side view, clean silhouette, flat plain background
for later cutout):

| ID | Asset | Used by | Status |
| --- | --- | --- | --- |
| `sketch.pendulum-plank` | Pendulum platform plank + hanger arm and pivot cap | Layer 1 | v1 approved reference |
| `sketch.moving-board` | Narrow moving board | Layer 2 | v1 approved reference |
| `sketch.axe` | Hatchet blade + handle rod on a pivot | Layer 2 | v1 approved reference |
| `sketch.climb-board` | Tall upright wooden ruler block (2.2 × 6.3 u) | Layer 3 climb | v1 approved reference |
| `sketch.nailable-strip` | Yardstick strip, wooden dowel bars, ceiling rail + trolley | Layer 3 crossing | v1 approved reference |
| `sketch.glue` | Tipped glue bottle + glue pool | Layer 3 crossing | v1 approved reference |
| `sketch.lift` | Hydraulic car lift: striped deck + amber lamp, stretchable chrome piston, pump box (replaces escalator, S4L) | Both layer transitions | v1 approved reference |
| `sketch.ground` | Thick workbench-top ground/ledge piece (tileable) | All layers | v1 approved reference |
| `sketch.swing-socket` | Moving swing socket/bracket | Finale (S5) | planned, after S5 |
| `sketch.nail` | Nail head + shaft, side and head-on views | All | v1 approved reference |
| `sketch.nail-pickup` | Third-nail pickup (edit of the nail reference) | Layer 3 start | v1 approved reference |
| `sketch.backdrop` | Giant toolbox interior, three colour bands, angry living background tools | Scene | v6 approved direction; final size after S5 |
| `sketch.decor` | Paint tin, pencil, screwdriver, spanner, tape, screws/nut sheet | Scene | v1 approved reference |
| `sketch.entrance` | Framed Sketch picture for the museum | Museum (S5) | planned, after S5 |

Derived locally, not generated: the sun's in-world and inventory cutout comes
from the approved `public/assets/restoration/complete.webp` with `sun-mask.png`
so it matches the restoration exactly.

Kept in code, not generated: unpinned dashed outlines, solid ink when pinned,
placement ghosts/highlights, FIFO marks, axe sweep envelopes and HUD count.
These are gameplay-state cues that must stay crisp and change together with the
colliders.

## Shared style rules for prompts

Fully cartoon/animation-film look, no realism or semi-realism. Bold clean dark
ink outlines, broad flat colour areas, simple two-tone cel shading, one soft
highlight. Visible board thickness (top face plus front face) for the 2.5D feel.
Playful pencil construction marks allowed; no photographic grain, realistic
wood grain, metal texture or charcoal scans. Perfectly flat, horizontal landing
top. Palette continues the placeholder palette: warm cream/honey (Layer 1),
pale blue (Layer 2), rose (Layer 3), dark plum-ink outlines.

## Reference pass log

See `asset-sources/manifest.json` (IDs `sketch.*.reference`) for execution IDs,
credits and hashes, and `asset-sources/prompts/sketch-*.txt` for prompts.
Sources are under `asset-sources/references/sketch/`.

- 2026-10-07 v1 (2 credits, balance 90 → 88): `pendulum-plank-v1.png` (2048²)
  and `moving-board-v1.png` (2560×1440). The style (ink outlines, flat colour,
  cel shading, pencil construction marks) fits the direction. Issues: the
  pendulum's cap-and-rod reads as a giant nail/thumbtack, which clashes with
  the nail mechanic, and its hole sits where the rod enters instead of on the
  front face. The board has an odd stepped lower lip. The user approved both
  as style references ("these look good") and set the garage/toolbox theme.
- 2026-10-07 v1 (2 credits, balance 88 → 86): `axe-v1.png` and
  `climb-board-v1.png`, both 2048² although 3:4 was requested. Axe: chunky red
  hatchet on a honey handle, bolt-and-bracket pivot, white edge reads as the
  danger. Its single edge faces one side, so one swing direction looks less
  dangerous; a double-bit head would fix that. Climb board: butter-yellow
  upright ruler block with ticks on one edge; about 1:3.7 against the 2.2 × 6.3
  collider, and close in colour to the Layer 1 plank. The user approved both.
- 2026-10-07 v1 (3 credits, balance 86 → 83): `ground-v1.png` (2560×1440),
  `nail-v1.png` (2560×1440, side + head-on views) and `nail-pickup-v1.png`
  (2048², image-to-image edit of the nail, so it keeps the nail's identity).
  Nail and pickup read clearly and differ from the purple pivot bolts. Ground
  fits the workbench theme but is too thin (about 12:1) and its inset lower
  apron breaks straight tiling and the solid-ground read. The user approved all
  three as they are; thickness/tiling can be handled at cutout preparation.
- 2026-10-07 v1 (3 credits, balance 83 → 80): `nailable-strip-v1.png`,
  `glue-v1.png`, `decor-v1.png` (all 2560×1440). Strip sheet: plum ceiling rail,
  wheel trolley, two hangers and a honey dowel bar (about 10:1, matching the
  3 × 0.3 bars) plus a butter-yellow yardstick strip (about 11:1, matching
  strip F); the rail cuts out as a static layer, trolley/hangers/bar as the
  moving piece. Glue: the tipped bottle reads well, but the pool is a thick
  block (about 2.4:1) that reads like soap or jelly rather than a shallow
  spill. Decor: six clean toolbox props (paint tin, pencil, screwdriver,
  spanner, tape, screws and nut) with baked soft shadows. The user approved all
  three as they are; the pool's proportions can be handled at preparation.
- 2026-10-07 v1 (1 credit, balance 80 → 79): `lift-v1.png` (2560×1440).
  The user replaced the escalator with a hydraulic car lift look. Sheet: a
  hazard-striped deck with an amber lamp (about 4:1, thicker than the 3.5 ×
  0.6 deck), a uniform chrome piston (stretches cleanly for the 3.3 and 8.1
  rises) and a plum pump housing with hose and gauge (reads as a pump beside
  the lift, not a housing under it). Line weight is slightly thinner than the
  other references. The user approved it.
- 2026-10-07 v1 (1 credit, balance 79 → 78): `backdrop-v1.png` (2048², 4:3
  requested). Style test, not the final size. The open-toolbox interior, lid
  and warm top light read clearly. Issues: mostly washed-out grey-lavender and
  duller than the props; strong one-point perspective with converging side
  walls, which is unlike the side-on camera; the middle tray has firm dark
  horizontal lines that could be mistaken for ledges; the three bands do not
  line up with the layers. Awaiting user review.
- 2026-10-07 v2 (1 credit, balance 78 → 77): `backdrop-v2.png` (2048²). The
  user rejected v1 as too bare and colourless. v2: front-facing back wall in
  three bands (cream/honey bottom, sky-blue middle, rose top) crowded with
  colourful tools (screwdrivers, spanners, hammer, pliers, saw, level, clamps,
  paint tins, tape, wire, jars of screws) and calm centres. Risks: the
  white riveted dividers are bold and could read as ledges; saturation and
  contrast are near foreground level (honey plank on the honey band, red
  handles near the red axe); corner shelves still recede. Mitigate at
  preparation by softening/hazing in code or offline. Awaiting user review.
- 2026-10-07 v3 (1 credit, balance 77 → 76): `backdrop-v3.png` (2048²), an
  image-to-image edit of v2. The user asked for v3 with nuts and bolts and the
  softening fixes. Result: lighter, softer and less saturated, with a big bolt,
  a pile of hex nuts and screws at the bottom, and small nuts/washers scattered
  on the walls and shelves. The riveted dividers stayed bright white and only
  slightly thinner, so they can still read as ledges; soften them at
  preparation. Awaiting user review.

### Living-objects pilot (user idea, 2026-10-07)

The user proposed that the toolbox objects feel alive, with souls, and angry
(fits the story: the misplaced sun animates them; taking it settles them).
Working rule for the pilot: hazards furious, platforms grumpy (never reading
as hazards), centre of a platform's front face kept clear for the nail target,
the nail and ground stay faceless.

- v1 pilot (2 credits, balance 76 → 74), image-to-image edits:
  `axe-living-v1.png`: a strong furious face, but the edit zoomed in, cut off
  the handle and moved the pivot onto the head, which no longer matches the
  rod-and-blade swing. `pendulum-plank-living-v1.png`: a readable grumpy face,
  but centred exactly where the nail target goes, and the edit drifted to
  thinner lines, wood-grain swirls and a textured background. Awaiting user
  review.
- Clarified by the user: living angry faces belong on the **backdrop** tools
  only. Gameplay assets keep their approved faceless references; both pilot
  edits are rejected.
- v4 backdrop (1 credit, balance 74 → 73): `backdrop-v4.png`, an edit of v3.
  Angry faces on the screwdriver, paint tin, corner jar boxes, spirit level,
  wrench and hammer. Issues: a large face floats in the centre of the rose
  band and two disembodied faces float in the open blue band (gameplay space,
  could read as enemies); the giant bolt, nuts, pliers, saw and tape got no
  faces; the dividers are unchanged. Awaiting user review.
- v5 backdrop (1 credit, 73 → 72), edit of v4: floating faces removed, but the
  edit added a giant standing bolt character with legs in the centre of the
  play area; superseded. v6 (1 credit, 72 → 71), edit of v5: the bolt
  character is removed and every band centre is clear again. Faces sit only
  on objects (corner jar boxes, paint tin, red screwdriver, spirit level,
  wrench, hammer, tape). The giant bolt, nuts, pliers and saw still have no
  faces. Three chained edits have sharpened the lines with slight edge halos;
  further chained edits would likely degrade it more. The user approved v6
  ("v6 lgtm") as the backdrop direction. Final full-size backdrop after S5:
  generate fresh in one pass with faces on all background tools, centres
  clear, then fade the dividers at preparation.

### Player redesign (user request, 2026-10-07)

The user dislikes the current restorer design and noticed the player walks
"in reverse" when moving left in Sketch. Code fix: the Sketch scene now mirrors
the player picture toward horizontal travel (as Royal Supper already does);
typecheck and 214 unit tests pass, not yet checked in a browser.

- Concepts v1 (1 credit, 71 → 70): `player-concepts-v1.png` (2560×1440).
  A: restorer apprentice (mustard paint-splattered beret, round glasses, long
  teal smock with brushes). B: tinkerer curator (brass goggles, coral scarf,
  rolled sleeves, tool belt with hammer). C: living wooden mannequin (teal
  scarf, museum badge). Awaiting the user's pick and scope (all worlds or
  Sketch only).
- Scope clarified by the user: the new hero replaces the player for the
  **whole game** (Royal Supper, museum and Sketch) and is a **woman**. The
  child concepts are rejected. Woman concepts v1 (1 credit, 70 → 69):
  `player-woman-concepts-v1.png`, game-wide stylised animated look. A: art
  restorer (bun with paintbrush, brass goggles, deep-teal smock over cream
  blouse, mustard satchel). B: curator (plum-burgundy coat, cream scarf, bob,
  round gold glasses, gold satchel). C: conservator (mustard dungarees, teal
  shirt, coral bandana and ponytail, tool belt, holds a hammer). Awaiting pick.
- The user picked **A** (art restorer). `player-a-v1.png`: single clean
  reference, edit of the concept sheet (1 credit). A pose-sheet edit (1
  credit) is rejected (three poses only, smock turned into trousers). Single-pose
  edits from the reference: `player-a-walk-a-v1`, `player-a-jump-v1`, and
  `player-a-walk-b-v2` (a narrower step replacing a v1 duplicate of walk-a);
  4 credits, balance 69 → 63. Review board: `player-a-pose-review.png`.
  Identity and the long teal smock stay consistent. Backgrounds vary
  (peach/ivory), the jump has a small ground shadow and figure scale differs
  slightly: all handled at cutout/registration. Not integrated yet.
- Integrated 2026-10-07 at the user's request ("do that, and record the
  decision"): four DreamLayer background removals (4 credits, 63 → 59) in
  `asset-sources/production/player-v2/*-cutout.png`, then
  `scripts/prepare-player-v2.py` drops flat ground-line/shadow components,
  scales every pose by one common factor (idle height 256 px), centres the
  head/torso and puts grounded feet on y264, on a shared 224×272 canvas
  (wider than v1's 128 so the stride and jump skirt fit; both scenes size the
  sprite from the image aspect, so colliders and physics are unchanged).
  Output replaces `public/assets/player/{idle,walk-a,walk-b,jump}.png`; v1
  copies are in `asset-sources/production/player-v1-runtime/`. Review board:
  `asset-sources/production/player-v2/pose-review.png`. Royal Supper already
  cycles the four poses; Sketch still shows only the idle pose (wiring the
  walk/jump poses into the Sketch scene is pending; another session was
  editing that scene at the time).
