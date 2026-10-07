# The Last Curator — documentation index

Start with the [current handoff](planning/NEXT_SESSION.md), then the [build plan](planning/PLAN.md), [decisions](planning/DECISIONS.md) and [requirements](planning/REQUIREMENTS.md). Agent instructions remain in [AGENTS.md](../AGENTS.md) at the project root. Paths written in prose or command prompts are relative to the project root; Markdown links are relative to their document.

## Current work

Latest, 2026-10-07: **S4C joined Layer 3 is accepted** and pushed; S4D (final S4 gate) is planned in the revised [S4D plan](gameplay/SKETCH_S4D_PLAN.md). It was at its playable review gate — [evidence](validation/sketch-s4/s4c/README.md), [play](http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3). S4D needs a separate request; S4 is not complete.

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
| [Sketch S4C plan](gameplay/SKETCH_S4C_PLAN.md) | Joined Layer 3 and grounded section recovery (implemented; [evidence](validation/sketch-s4/s4c/README.md)) |
| [Sketch S4D plan](gameplay/SKETCH_S4D_PLAN.md) | Both rides into Layer 3 and final S4 gate after C review |
| [Sketch S4 prompts](gameplay/SKETCH_S4_PROMPTS.md) | Four paste-ready future requests; do not execute together |
| [Opening sequence](gameplay/OPENING.md) | Deferred M6 presentation; not the current task |

## Art and references

| Document | Purpose |
| --- | --- |
| [Art direction](art/ART_DIRECTION.md) | Completed M3 direction and separate cartoon 2.5D Sketch direction |
| [Asset workflow](art/ASSETS.md) | Provider/credit rules, preparation, provenance and required assets |
| [Technology](reference/TECH_STACK.md) | Stack, rendering and performance rationale |
| [Masterpiece](reference/MASTERPIECE.md) | Composition and restoration story |
| [Concept archive](reference/MINI_GAMES.md) | Selected concepts, gated Garden and reserve ideas |

## Evidence and asset-local notes

These stay beside their files rather than being mixed into the planning folders:

- [M3 props](validation/m3-props/README.md), [cohesion verification](validation/art-cohesion/README.md), [Sketch S1 evidence](validation/sketch-s1/) and [Sketch S2 evidence](validation/sketch-s2/).
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
