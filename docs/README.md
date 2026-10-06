# The Last Curator — documentation index

Start with the [current handoff](planning/NEXT_SESSION.md), then the [build plan](planning/PLAN.md), [decisions](planning/DECISIONS.md) and [requirements](planning/REQUIREMENTS.md). Agent instructions remain in [AGENTS.md](../AGENTS.md) at the project root. Paths written in prose or command prompts are relative to the project root; Markdown links are relative to their document.

## Current work

Royal Supper/M3 and its scoped cohesion pass are complete. Unfinished Sketch replaces Sleeping Mountain as adventure two and retains the sun reward. Sketch S1 is complete after user review; S2 (Layer 1, the first escalator and the stacked-world framing) is implemented with the requested mandatory nail-reuse revision and awaiting user playtest. Its four faster pendulum outlines become solid only while pinned, require two FIFO recalls, and show circular nail heads centered on their holes. Preserve all uncommitted work.

Sketch uses two nails, authored targets and FIFO recall; direct nail swinging has explicit E grip and A/D momentum, with no rope. The final world has three stacked layers, moderate camera focus on the active layer with adjacent-layer context, and modern cartoon 2.5D depth. See the [Sketch design and slices](gameplay/UNFINISHED_SKETCH.md) and [art direction](art/ART_DIRECTION.md).

S3A is implemented with the later user-requested hard revision: compulsory outlined/inked boards, narrower landings and faster platforms/axes. Current measurements/captures are in [difficulty evidence](validation/sketch-s3/hard-v1/README.md). S3B remains planned/unimplemented. The [S3 implementation plan](gameplay/SKETCH_S3_PLAN.md) divides it into S3A (isolated Layer 2 boards/axes) and S3B (joined layers and second escalator), with separate playable review gates. Actual URLs, captures, measurements and limits are in [S3A evidence](validation/sketch-s3/README.md). The next session implements S3B using [its code-specific plan](gameplay/SKETCH_S3B_PLAN.md) and [paste-ready prompt](planning/NEXT_SESSION.md#paste-ready-s3b-implementation-prompt). The current session only prepares that handoff and checkpoints the reviewed work.

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
| [Sketch S3B implementation plan](gameplay/SKETCH_S3B_PLAN.md) | Current next-session scope: joined layers, second ride, safe arrival and verification |
| [Sketch S3 technical plan](gameplay/SKETCH_S3_PLAN.md) | S3A implemented for review; S3B joined route and second escalator unimplemented |
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
