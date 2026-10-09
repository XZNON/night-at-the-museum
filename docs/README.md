# The Last Curator — documentation index

Start with the [current handoff](planning/NEXT_SESSION.md), then the [build plan](planning/PLAN.md), [decisions](planning/DECISIONS.md) and [requirements](planning/REQUIREMENTS.md). Agent instructions remain in [AGENTS.md](../AGENTS.md) at the project root. Paths written in prose or command prompts are relative to the project root; Markdown links are relative to their document.

## Current work

Latest, 2026-10-08: **v1 polish done** (title screen, clean HUD, pause menu, restoration screens, museum layout and ambience, UI sounds; [evidence](validation/v1-polish/README.md)). Next: museum polish, then release prep ([handoff](planning/NEXT_SESSION.md)).

Latest, 2026-10-07: **next is S5B** (Sketch frame in the museum, campaign claim of the light); the enchanted light acts as the sun in the campaign (user). Prompt: [NEXT_SESSION](planning/NEXT_SESSION.md).

Latest, 2026-10-08: **Sketch art pass part 1 is implemented at its review gate**: the approved references are cut locally into 27 skins and drawn in the Sketch scene from level data; gameplay unchanged ([evidence](validation/sketch-art/part1/README.md), [assets](art/SKETCH_ASSETS.md)). S5C committed/pushed at `7c5e06a`. Part 2 (backdrop, museum entrance) needs its own request.

Earlier, 2026-10-07: **S5C is implemented at its playable review gate; S5 is complete at the automated gate**: the enchanted light placed in the sky becomes the sun, the complete masterpiece and the ending; one real-control New Game → ending run passed ([evidence](validation/sketch-s5/s5c/README.md)). Stop for user review; S6 and the Sketch art pass need their own requests.

Earlier, 2026-10-07: S5B committed and pushed (`31ad72e`); **S5C planned** ([plan](gameplay/SKETCH_S5C_PLAN.md), prompt in [NEXT_SESSION](planning/NEXT_SESSION.md)). Next: S5C on its own request.

Earlier, 2026-10-07: **S5B (the Sketch in the museum) is implemented at its playable review gate**: frame on the left wall, locked until the pear is restored; campaign claim of the enchanted light (`sun-disc`), return, Mountain removed ([evidence](validation/sketch-s5/s5b/README.md)). Stop for user review; S5C needs its own request.

Earlier, 2026-10-07: S5A committed (`9ce56f9`); **the reward is now an enchanted light in a torch** (user revision, at review; [evidence](validation/sketch-s5/s5a/README.md#review-revision-the-enchanted-light)).

Earlier, 2026-10-07: **S5A (the sun on the end ledge) is implemented at its playable review gate** ([evidence](validation/sketch-s5/s5a/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=adventure)). Stop for user review; S5B needs its own request.

Earlier, 2026-10-07: **all Sketch sections and layers are done** (user decision; S4D pushed at `715770d`). The planned moving-socket finale is dropped; S5 (sun and campaign ending only) is planned as three blocks: [S5 plan](gameplay/SKETCH_S5_PLAN.md), [prompts](gameplay/SKETCH_S5_PROMPTS.md). Next: S5A on its own request.

Latest, 2026-10-07: **S4D Layers 1–3 (final S4 gate) is implemented at its playable review gate** — the whole route so far in one study ([evidence](validation/sketch-s4/s4d/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-3)). Stop for user review; S5 needs its own request.

Earlier, 2026-10-07: **S4L vertical lifts were implemented at their playable review gate** — both escalators replaced by step-on lifts ([evidence](validation/sketch-s4/s4l/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2)). Stop for user review; S4D needs its own request.

Earlier, 2026-10-07: **S4C joined Layer 3 is accepted** and pushed. Next: [S4L vertical lifts](gameplay/SKETCH_S4L_PLAN.md) (user decision), then S4D (final S4 gate) per the revised [S4D plan](gameplay/SKETCH_S4D_PLAN.md). It was at its playable review gate — [evidence](validation/sketch-s4/s4c/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3). S4D needs a separate request; S4 is not complete.

Earlier, 2026-10-07: **S4B free-placement moving-swing crossing was accepted** (it was at its playable review gate) — [evidence](validation/sketch-s4/s4b/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-swings). S4C needs a separate request.

Earlier, 2026-10-07: **S4A wall climb is revised again (three nails on Layer 3) and at its playable review gate** — [evidence](validation/sketch-s4/s4a/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-walls). The user accepted it and redesigned S4B as a free-placement moving-swing crossing ([plan](gameplay/SKETCH_S4B_PLAN.md)); S4B needs a separate request.

Latest user direction, 2026-10-06: Slice 3 is complete and pushed at `77acf03`. S4 implementation planning is now complete, split into four separately requested/reviewed blocks: wall climb, glue crossing, joined Layer 3 and full-route integration. Read [S4 overview](gameplay/SKETCH_S4_PLAN.md), [S4A plan](gameplay/SKETCH_S4A_PLAN.md), [all four prompts](gameplay/SKETCH_S4_PROMPTS.md) and [NEXT_SESSION](planning/NEXT_SESSION.md). No S4 gameplay is implemented; proposed studies are not working entries. Earlier review-only/uncommitted statements below are historical.

Royal Supper/M3 and its scoped cohesion pass are complete. Unfinished Sketch replaces Sleeping Mountain as adventure two and retains the sun reward. Sketch S1 is complete after user review; S2 (Layer 1, the first escalator and the stacked-world framing) is implemented with the requested mandatory nail-reuse revision and awaiting user playtest. Its four faster pendulum outlines become solid only while pinned, require two FIFO recalls, and show circular nail heads centered on their holes. Preserve all uncommitted work.

Sketch uses two nails (three on Layer 3, after a pickup at its start), authored targets and FIFO recall; direct nail swinging has explicit E grip and A/D momentum, with no rope. The final world has three stacked layers, moderate camera focus on the active layer with adjacent-layer context, and modern cartoon 2.5D depth. See the [Sketch design and slices](gameplay/UNFINISHED_SKETCH.md) and [art direction](art/ART_DIRECTION.md).

S3A's reviewed hard challenge is preserved. **S3B is implemented at its playable review gate:** [joined Layers 1/2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2) and [direct Layer 2](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2) now finish on safe Layer 3 ground after the second ride. Isolated S2 retains its original endpoint. Read [fresh S3B evidence](validation/sketch-s3/s3b/README.md), [the implementation plan](gameplay/SKETCH_S3B_PLAN.md) and [current review handoff](planning/NEXT_SESSION.md). Stop for user review before S4; the complete adventure/ending remain unimplemented. Current work is uncommitted over bd9cab7; earlier S3A/hard-v1 evidence is historical.

## Planning and contracts

| Document | Purpose |
| --- | --- |
| [Next session](planning/NEXT_SESSION.md) | Current status, evidence, controls and next task |
| [Build plan](planning/PLAN.md) | Milestones, slice status and implementation history |
| [Decisions](planning/DECISIONS.md) | Selected choices, defaults and change boundaries |
| [Requirements](planning/REQUIREMENTS.md) | Behaviour, shared contracts, saves and acceptance criteria |

## Gameplay and presentation

| Document | Purpose |
| --- | --- |
| [Royal Supper](gameplay/ROYAL_SUPPER.md) | Approved first-adventure rules and verification |
| [Unfinished Sketch](gameplay/UNFINISHED_SKETCH.md) | Selected second-adventure design and six slices |
| [Sketch S1 technical plan](gameplay/SKETCH_S1_PLAN.md) | Completed mechanics slice's technical plan; preserve reviewed revisions |
| [Sketch S2 technical plan](gameplay/SKETCH_S2_PLAN.md) | Layer 1, first escalator and stacked-world framing; implemented, awaiting review |
| [Sketch S3B implementation plan](gameplay/SKETCH_S3B_PLAN.md) | Implemented S3B scope, state contracts and verification gate |
| [Sketch S3 technical plan](gameplay/SKETCH_S3_PLAN.md) | S3A/S3B implemented; user review before S4 |
| [Sketch S4 overview](gameplay/SKETCH_S4_PLAN.md) | Four-block delivery, inspected code, state/data contracts and final gate |
| [Sketch S4A plan](gameplay/SKETCH_S4A_PLAN.md) | First future implementation: isolated wall climb |
| [Sketch S4B plan](gameplay/SKETCH_S4B_PLAN.md) | Free-placement moving-swing crossing (implemented; [evidence](validation/sketch-s4/s4b/README.md)) |
| [Sketch S4C plan](gameplay/SKETCH_S4C_PLAN.md) | Joined Layer 3 and grounded section recovery (accepted; [evidence](validation/sketch-s4/s4c/README.md)) |
| [Sketch S4L plan](gameplay/SKETCH_S4L_PLAN.md) | Vertical lifts replace both escalators (user decision; implemented at review, [evidence](validation/sketch-s4/s4l/README.md)) |
| [Sketch S5 plan](gameplay/SKETCH_S5_PLAN.md) | Sun on the end ledge, Sketch in the museum, placement and ending (S5A/B/C); [prompts](gameplay/SKETCH_S5_PROMPTS.md) |
| [Sketch S5C plan](gameplay/SKETCH_S5C_PLAN.md) | Placing the enchanted light as the sun, the complete masterpiece and the ending (implemented at review, [evidence](validation/sketch-s5/s5c/README.md)); prompt in [S5 prompts](gameplay/SKETCH_S5_PROMPTS.md#s5c--the-light-becomes-the-sun-and-the-ending) |
| [Sketch S4D plan](gameplay/SKETCH_S4D_PLAN.md) | Both rides into Layer 3 and final S4 gate (implemented at review, [evidence](validation/sketch-s4/s4d/README.md)) |
| [Sketch S4 prompts](gameplay/SKETCH_S4_PROMPTS.md) | Four paste-ready future requests; do not execute together |
| [Opening sequence](gameplay/OPENING.md) | Deferred M6 presentation; not the current task |

## Art and references

| Document | Purpose |
| --- | --- |
| [Art direction](art/ART_DIRECTION.md) | Royal Supper cartoon rework (2026-10-09), cartoon 2.5D Sketch direction, historical M3 direction |
| [Asset workflow](art/ASSETS.md) | Provider/credit rules, preparation, provenance and required assets |
| [Technology](reference/TECH_STACK.md) | Stack, rendering and performance rationale |
| [Masterpiece](reference/MASTERPIECE.md) | Composition and restoration story |
| [Concept archive](reference/MINI_GAMES.md) | Selected concepts, gated Garden and reserve ideas |

## Evidence and asset-local notes

These stay beside their files rather than being mixed into the planning folders:

- [Royal Supper cartoon rework](validation/supper-cartoon/README.md), [M3 props](validation/m3-props/README.md), [cohesion verification](validation/art-cohesion/README.md), [Sketch S1 evidence](validation/sketch-s1/) and [Sketch S2 evidence](validation/sketch-s2/).
- [Reference review](../asset-sources/reference-review.md), [original production-slice plan](../asset-sources/production-slice.md), [style comparisons](../asset-sources/style-previews/README.md) and [cohesion preparation](../asset-sources/production/cohesion-v1/README.md).
- Asset provenance remains in `asset-sources/`; runtime assets remain in `public/assets/`. Historical evidence is not a new test result or generation authorization.

## Folder map

```text
DreamLayer/
  README.md                 project overview and run instructions
  AGENTS.md                 agent instructions
  docs/
    README.md               this index
    planning/               status, plan, decisions, requirements
    gameplay/               adventures, slice plans, deferred opening
    art/                    art direction and asset workflow
    reference/              technology, masterpiece, concept archive
    validation/             retained test notes and captures
  asset-sources/            original assets, manifests, preparation notes
  public/assets/            runtime assets
  src/                      game implementation
  tests/                    focused and browser checks
  scripts/                  existing development/preparation tools
```

The historical cleanup only reorganized documents and their references. That cleanup did not start S2 or change gameplay, generated assets, dependencies or publication status.
