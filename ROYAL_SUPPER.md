# Royal Supper — First adventure build specification

## Purpose

Build a short, side-view 2.5D platforming adventure inside a painting of a royal supper. The player is tiny on a giant table. Food, cutlery and crockery form the route; the golden pear waits on the king's plate.

First deliverable: a playable blockout with simple meshes/colours. Final art and museum integration are subsequent milestones. Keep a direct development entry for quick iteration.

## Stable IDs and shared contract

- Artwork/scene: `royal-supper`.
- Awarded piece: `golden-pear`.
- Interactions: `fork-bridge`, `candle-flame`.
- Checkpoints: `basket-start`, `before-fork`, `after-fork`, `after-candle`.
- Report collection through CampaignCommand; do not directly edit inventory or museum objects.
- Return through the scene manager. In direct development mode, show a completion screen with Replay; do not invent a final museum just for this milestone.

## Player and camera

- Orthographic side view, player motion on XY, decorative depth on Z.
- Move A/D or arrows; Space jump; E nearby interaction; R checkpoint restart; Escape pause.
- No crouch, ladders, double jump, combat or free depth movement.
- Pass-under section has clearance for the standing character; avoid introducing another controller ability.
- Character/world measurements use one consistent scale. Put width, height, speed, acceleration, gravity, jump speed, coyote time and input buffer in a tuning object.
- Initial tuning defaults: coyote time 100 ms, jump buffer 120 ms; tune speed/gravity against the first test jumps rather than locking arbitrary numbers in prose.
- Provide a collision/debug view and a small movement test lane during development.
- Follow camera with forward look-ahead, clamped to level bounds. Show landing surfaces before compulsory jumps; no compulsory blind drops.

## Route, left to right

| Section | Playable requirement | Layout/art intention |
| --- | --- | --- |
| Bread basket | Safe spawn and 2–3 easy jumps teach movement | Bread pieces rise from basket to tabletop |
| Crockery | Cross plates and pass beneath overturned goblet | Wide landing surfaces and readable cutouts |
| Fork gap | E topples upright fork into a bridge | Two raised dishes separated by an unjumpable gap |
| Candle passage | E extinguishes flame before crossing | Narrow necessary route across candle top; side alcove reaches snuffer |
| King's plate | Final forgiving jumps and pear collection | King/banquet behind play plane; pear clearly visible |

Author route data after measuring the tuned jump envelope. Ordinary required jumps should use at most about 75% of demonstrated horizontal/vertical capability. Fork gap must exceed maximum unassisted reach and have no lower bypass. Candle gate must be hazardous while lit and traversable when extinguished; side trigger must be reachable safely.

Keep level bounds, hazard volumes and checkpoint spawns explicit. Decoration is never implicitly solid. Use a death plane beneath gaps. Ceiling/bounds prevent jumping around compulsory gates. Checkpoint spawn positions must be stable, clear of hazards and never depend on a prop still animating.

## Fork interaction

1. Player approaches the fork trigger on the near side of the gap.
2. Show “E — Topple fork” when in range.
3. E starts `upright → toppling → bridged`; ignore repeated E while moving.
4. Animate the fork into a known resting position.
5. Enable its horizontal bridge collider only when settled. Keep the player off the moving prop during the transition.
6. The bridged state persists through falls and session re-entry. Repeated activation is a no-op.
7. Crossing reaches the after-fork checkpoint; that checkpoint cannot be reached before the bridge is available.

## Candle interaction

1. Flame blocks the required candle-top passage and is visibly hazardous.
2. Reach a safe snuffer interaction from the near side; no jump through flame required.
3. Show “E — Extinguish candle”.
4. E starts `lit → extinguishing → extinguished` with clear feedback.
5. Remove flame hazard at the defined extinguishing moment; keep collider/presentation state consistent.
6. Candle body remains a platform and the route becomes safe.
7. Extinguished state persists through falls and session re-entry; it never relights automatically.

The snuffer can be a scripted prop; no grabbing inventory, aiming mechanic or simulated candle physics is needed.

## Recovery and completion

- Place checkpoint immediately before fork, after bridge and beyond candle.
- Fall/flame gives a short cue and respawns within the recovery target in REQUIREMENTS.md.
- Keep completed interaction states on checkpoint restart. Restart Adventure resets the local route, but does not delete an awarded campaign piece.
- On overlap with pear, collect once, play a brief celebration and show Return to Museum / Continue Exploring.
- Return to Museum goes to the source painting's safe hub position. Replay in dev mode returns to the start with a clean local session.
- If pear is already collected or restored, show a replay completion cue without a second inventory award.

## Art direction and asset boundary

A painterly royal banquet with warm candlelight, rich red/gold fabrics, oversized diners, porcelain, bread and reflective cutlery. The visual hierarchy puts the playable route and pear above background detail.

Banquet illustration and playable scene share an approved DreamLayer reference, but the playable level uses derived layers/cutouts rather than trying to walk through a single flattened image. Background diners need only subtle ambient movement, not AI or dialogue.

Minimum production assets: banquet background layers, bread/basket, plate/platform artwork, goblet, fork, candle and snuffer, pear cutout, player frames/reference, flame/feedback effects. Some simple geometry/effects can be authored in code; major art should visibly come from DreamLayer.

## Verification checklist

- [x] Movement is controllable at normal and low rendering quality (keyboard-driven Chromium routes).
- [x] Jump buffer/coyote behavior works and maximum-speed collisions do not tunnel through surfaces (focused simulation tests).
- [ ] First-time player can read the route and land without blind leaps.
- [x] Fork and candle each block progress until activated and cannot be bypassed (jump attempts against authored collision).
- [x] Trigger ranges work from safe positions; unrelated nearby props do not capture E.
- [x] Falls before/after each interaction restore a safe checkpoint and correct prop state.
- [x] Repeated E, R, pause and rapid return do not create softlocks or duplicate scene ownership (unit/browser checks).
- [x] Pear is awarded once; replay cannot duplicate it.
- [x] Resize, dispatched focus-loss handling, production preview and scene exit/re-entry behave correctly. Actual app/tab switching remains a manual follow-up.
- [x] Blockout is playable end to end; known issues and measured checks recorded in PLAN.md.

## Not in the first build

Shadow bridges from the earlier Feast of Shadows pitch, moving diners, timed scoring, optional collectibles, procedural levels, free-falling physics props, final museum decoration or the other adventures.
