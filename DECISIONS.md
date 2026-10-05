# Decisions — The Last Curator

Updated: 2026-10-05. The user authorized closing routine design and implementation decisions for a new-session handoff. Agent-selected choices below are working defaults, not previously explicit user selections.

## Settled direction

| Decision | Choice | Basis |
| --- | --- | --- |
| Game structure | One masterpiece, recover pieces through artwork adventures, return and restore | User-confirmed |
| Museum | Small walkable 3D museum; dim light, red palette/carpet, wooden floor, focal masterpiece | User-confirmed |
| Artwork entry | Click nearby artwork to enter | User-confirmed |
| Adventures | Side-view 2.5D | User-confirmed |
| Restoration | Inventory piece dragged into a matching location; region gains colour; next objective unlocks | User-confirmed |
| First adventure | Royal Supper tabletop parkour | User-confirmed for next session |
| Deferred concept | Unfinished Sketch | User-confirmed |
| Stack | TypeScript, Vite, Three.js, HTML/CSS, Howler.js | Proposed and accepted planning direction |
| Sequence | Mechanics first, early minimal hub loop, final art/museum presentation afterward | User-approved plan |

## Closed working defaults

| Decision | Choice and reason |
| --- | --- |
| Museum camera | First person. A small hub does not require a visible 3D player or third-person camera collision. |
| Mini-game camera | Orthographic side view; motion on XY with Z used for scenery depth. |
| Release scope | Two committed adventures: Royal Supper then Sleeping Mountain. Drowned Garden is added only after the two-adventure game has a working ending. |
| Masterpiece | The Garden Before Dawn: traveller beneath a pear tree, mountains, sun and optional bird. Working art composition; identity may change without rewriting mechanics. |
| Pieces | `golden-pear`, `sun-disc`, optionally `blue-bird`; stable IDs independent of labels. |
| Progression | Linear. Royal Supper available initially; restoring pear unlocks mountain. Restoring sun completes the two-adventure version. |
| Three-adventure version | Add bird stage after sun and finish after bird. Decide release stage count before generating final restoration assets. |
| Return | Collect the piece, show a short success cue, then let the player choose Return to Museum. Return near the source artwork; walk back to the masterpiece. |
| Failure | Falls and flame contact respawn at the latest checkpoint, with no lives, score penalty or lost piece. |
| Replay | Completed artwork remains viewable and replayable; collected piece never duplicates. Replay does not reverse restoration. |
| Physics | Custom kinematic collision. Fork, valves and bridges follow scripted states. No free rigid-body simulation. |
| Player appearance | Small, readable restorer silhouette. Placeholder initially; final character reference chosen with art direction. No detailed 3D player required. |
| Persistence | Save campaign piece/restoration progress and settings. Puzzle states/checkpoint survive falls and hub exits in the same session, but may reset on page reload. |
| Generation | Development-time DreamLayer assets bundled locally; no live generation during play. |
| Primary platform | Desktop/laptop browser, keyboard and mouse. Touch and controller support deferred. |

## Controls

| Context | Controls |
| --- | --- |
| Museum | WASD / arrows move; mouse look; left click artwork under centre reticle. Pointer-lock fallback: drag to look and click artwork under cursor. |
| Mini-games | A/D or left/right move; Space jumps; E interacts with nearby highlighted object. |
| Inspection | Drag-and-drop or click piece then click target; keyboard select with Tab/Enter and activate target with Enter. |
| Global | Escape pauses gameplay or closes inspection; R restarts from the current checkpoint in a mini-game. Menu offers restart adventure and return to museum. |

Release pointer lock for menus/inspection. Reacquire only on an explicit player click. No crouch, combat, climbing controller or double jump in Royal Supper; its low passages must fit the standing character.

## Changes supported cheaply

- Level layout, camera framing and difficulty through level/controller configuration.
- Piece names, art style and asset files through manifests.
- Adventure order and two/three-stage ending through one campaign definition.
- Replacement of the third adventure through the scene and completion contracts.
- Museum layout through a separate hub configuration.

## Changes requiring a deliberate scope revision

Free 3D movement inside paintings, a different rendering engine, complex combat, online generation, branching campaigns, mobile controls or a multi-masterpiece campaign. Do not introduce these during the initial build without user direction.

## Remaining decisions and their timing

There are no blocking gameplay decisions for the Royal Supper blockout.

1. DreamLayer access, actual credits and generation costs: verify before first generation batch.
2. Final painterly reference and player design: select after camera/movement proof, before production asset batch.
3. Whether to ship the third adventure: decide after M4 in PLAN.md; do not build it speculatively.
4. Final title, soundtrack sources and submission copy: finalize during polish.
5. Exact jam cutoff timezone: verify the live jam page before scheduling submission; plan to upload ahead of the cutoff.
