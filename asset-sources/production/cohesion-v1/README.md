# Selective offline M3 texture preparation

2026-10-06; accepted direction: stylised, leaning animated. This folder contains
review boards for local preparation, not generated replacement references.

| Revision ID | Original prepared pixels | Source provider | Radius / blend | Size |
| --- | --- | --- | --- | --- |
| royal-supper.bread.cohesion-v1 | public/assets/supper/bread.png | DreamLayer | 5 / 0.88 | 640×256 |
| royal-supper.basket.cohesion-v1 | public/assets/supper/props/basket.png | OpenAI ImageGen | 3 / 0.75 | 640×160 |
| royal-supper.crumb.cohesion-v1 | public/assets/supper/props/crumb.png | OpenAI ImageGen | 4 / 0.85 | 192×175 |
| royal-supper.cake.cohesion-v1 | public/assets/supper/props/cake.png | OpenAI ImageGen | 4 / 0.85 | 640×200 |

`scripts/prepare-cohesion.py --pilot` prepares bread/basket; its default prepares
the four demonstrated mismatches. Only high-frequency colour detail changes.
All alpha values, dimensions, crop registration and original files are retained.
Transparent-margin colour extrapolation prevents filtering against black; exact
original alpha is restored afterward. No invented bread holes or geometry.

Runtime uses separate `public/assets/supper/cohesion-v1/` paths behind the same
logical gameplay IDs. Manifest records preserve both source and runtime hashes,
parent reference lineage and the original provider. Source atlases/prompts and
registered player/restoration images remain unchanged.

No provider call, new generation, billing or retired-request retry. Local
generation cost is 0 credits. Historical failed-job and ImageGen costs stay
unknown; historical balance is not asserted as current. No extension to the
ImageGen authorization. Source credit/approval records are preserved; the
agent's camera QA of prepared revisions is distinct from user reference approval.

`pilot-review.png` and `review.png` show original (left) / prepared (right)
pixels. Actual game evidence and regression results live in
`docs/validation/art-cohesion/README.md` and docs/planning/PLAN.md.
