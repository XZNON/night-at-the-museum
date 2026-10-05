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
| Royal Supper presentation | User requested the whole long banquet table, more diners eating/drinking, abundant wine/glasses/goblets/cutlery/fruit, and a trident-shaped three-candle candelabrum on 2026-10-05. Use decoration behind a readable foreground; extend the gameplay route according to the later expanded specification. Reference approval must be recorded before production generation. |
| Expanded Royal Supper | User subsequently requested a longer Mario-style side-scrolling route with butter/crumb sliding, rolling grapes, timed three-candle/fan passage, a diner attention section, stepped/double jumps and a bounce ascent. Build and validate the revised placeholder route before production art. The existing M2 layout is a regression baseline, not a fixed final layout. |
| Double jump | User-confirmed: one ground jump plus one airborne jump; repeated input cannot stack additional jumps. Reset only on a valid landing or checkpoint respawn. Measure the full envelope and prove that required gates cannot be skipped. |
| Candle timing | User-confirmed: rotating fan extinguishes flames in sequence; flames relight if the crossing is not completed quickly. Replace the old permanent extinguishing gate. |
| Route discovery | User-confirmed: camera follows the player forward into new sections. Readable scenery/animation communicates obstacles; no player-facing route map. |
| Persistence | Save campaign piece/restoration progress and settings. Puzzle states/checkpoint survive falls and hub exits in the same session, but may reset on page reload. |
| Generation | Development-time DreamLayer assets bundled locally; no live generation during play. |
| Primary platform | Desktop/laptop browser, keyboard and mouse. Touch and controller support deferred. |

## Deferred opening presentation

At M6, add a short nighttime opening: the restorer lives inside the masterpiece, comes alive and jumps out onto the red carpet to recover missing pieces. Use DreamLayer-generated character poses with authored Three.js motion, not AI-generated video. Preserve the first-person museum; no 3D character/controller change is required. Align the final masterpiece traveller with the restorer reference. See OPENING.md for shot sequence and lifecycle checks. This is a user-requested polish task, not current production generation scope.

## Controls

| Context | Controls |
| --- | --- |
| Museum | WASD / arrows move; mouse look; left click artwork under centre reticle. Pointer-lock fallback: drag to look and click artwork under cursor. |
| Mini-games | A/D or left/right move; Space jumps; E interacts with nearby highlighted object. |
| Inspection | Drag-and-drop or click piece then click target; keyboard select with Tab/Enter and activate target with Enter. |
| Global | Escape pauses gameplay or closes inspection; R restarts from the current checkpoint in a mini-game. Menu offers restart adventure and return to museum. |

Release pointer lock for menus/inspection. Reacquire only on an explicit player click. Space uses a fresh press for the airborne jump; holding the key does not retrigger it. No crouch, combat or climbing controller is planned; low passages must fit the standing character. Double jumping is now part of the user-requested expanded Royal Supper, superseding the M1 single-jump default.

## Expanded Royal Supper implementation choices

The user lifted the gameplay planning hold on 2026-10-05 and authorized the expanded mechanics blockout. Confirmed mechanics above supersede the older blockout rules. Duration, difficulty, checkpoint density and diner detection were selected in the follow-up planning answers. Other implementation choices below are working defaults to tune during the mechanics proof.

- Duration: user selected 5–7 minutes on a first playthrough including a few retries. Revisit the previous whole-game 5–10 minute target once the second adventure is timed; do not claim a new measured campaign duration.
- Difficulty/checkpoints: user selected demanding jumps and timing, unlimited retries and one checkpoint after each hard section, rather than frequent intermediate checkpoints. No campaign piece loss. Retry the challenging section from the last cleared section; tune section duration to avoid excessively long repeats.
- Diner: user selected exposure when a diner tilts their head/looks down as the detection condition. Standing still outside cover is not safe during that phase. Jumping above or out of cover while watched exposes the player and triggers checkpoint recovery. Telegraph the head turn before the active detection phase; authored cover must hide the entire character.
- Fan: automatic repeating sweep, with sequential extinguishing and timed relighting. User-confirmed final revision: three separate candle tops on one trident holder, with gaps that require jumping between them. Wait safely before entering; no permanent E/snuffer solution. Phase timings are tuned against an actual traversal.
- Grapes: visible, scripted rolling waves with predictable intervals. Avoid spawning hazards on the player or requiring an unseen reaction.
- Butter: a distinct slippery surface with reduced braking and faster 9.2-unit speed, retaining directional control and airborne momentum until a dry landing. Crumb contact retries the section. Three varied short patches replace the repetitive run, following user playtest feedback.
- Jelly: launch automatically on a downward landing. The bounce counts as the first launch and permits one airborne jump; side contact, overlap or sustained contact cannot repeatedly recharge/launch the player. Tune and verify this rule alongside the double jump.
- Checkpoints: starting spawn, then one after each hard section; no checkpoint midway through a challenge. Resets preserve the settled fork and campaign awards. Timed challenges restart at a readable phase after a failed attempt. Pause freezes all hazard/attention timers.
- Art: the banquet image supplies direction and prop identity. Runtime camera remains side-on; prepare separate geometry-aligned assets only after the expanded blockout passes. Existing reference approval remains recorded separately in the provenance manifest.

Exact distances, velocities, cycle periods and detection grace are tuning values to measure during the mechanics proof, not more design questions to ask the user.

## Changes supported cheaply

- Level layout, camera framing and difficulty through level/controller configuration.
- Piece names, art style and asset files through manifests.
- Adventure order and two/three-stage ending through one campaign definition.
- Replacement of the third adventure through the scene and completion contracts.
- Museum layout through a separate hub configuration.

## Changes requiring a deliberate scope revision

Free 3D movement inside paintings, a different rendering engine, complex combat, online generation, branching campaigns, mobile controls or a multi-masterpiece campaign. Do not introduce these during the initial build without user direction.

## Remaining decisions and their timing

The expanded Royal Supper's major gameplay choices are now recorded. Routine layout distances, timing and movement values should be measured/tuned during its new blockout proof, rather than reopening the selected mechanics.

1. DreamLayer access, actual credits and generation costs: verified for references; recheck before production batches.
2. Final painterly reference and player design: references exist; record explicit approval before production art. Expanded camera/movement proof precedes layout-specific exports.
3. Whether to ship the third adventure: decide after M4 in PLAN.md; do not build it speculatively.
4. Final title, soundtrack sources and submission copy: finalize during polish.
5. Exact jam cutoff timezone: verify the live jam page before scheduling submission; plan to upload ahead of the cutoff.


After user playtest feedback on 2026-10-05, the placeholder route ends at approximately 435 units. Preserve the bread/grape introduction and mandatory fork/fan gates; cap the watched passage at three progressively longer crossings with narrower cover. Replace fourteen repeated dessert rises with two jelly launches, varied rises, a level shelf and a drop. Cover visuals mark safe foot centres and confirm HIDDEN; full-body protection remains the rule. The user accepted the rest of this layout and requested separated trident candles as the final gameplay revision. Three 3-unit tops now have 3-unit gaps, no floor between them, and a 4-unit exit jump. The holder's brass arms are decorative below the route. A raised canopy permits ordinary jumps but prevents a route above lit heat; deep candle bodies block an underneath bypass. Ember windows begin at 2.0 / 3.1 / 4.2 seconds in an 11-second cycle and last 2 seconds each. The user subsequently approved the final gameplay layout on 2026-10-05. The original 5–7 minute target has no measured human timing; do not stretch playtime with repetition. Separate production-art reference approval remains pending.
