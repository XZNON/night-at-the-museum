# Royal Supper — Expanded adventure specification

## Status and purpose

Build a varied side-view 2.5D platforming adventure across a lavish royal banquet. The player is tiny on the table; the golden pear waits on the king's plate. The original user-selected 5–7 minute first-playthrough target is provisional following playtest feedback to shorten repetitive challenges. Difficulty is demanding, with unlimited retries and one checkpoint after each hard section.

The user lifted the gameplay planning hold on 2026-10-05 and subsequently playtested the blockout, reporting lost butter momentum, harmless crumbs, misleading cover boundaries and excessive repetition. The revised route prioritizes variety and shorter retries: three distinct butter patches, three cover crossings and a compact two-bounce dessert route, followed by the requested separated trident candle tops. The user approved the complete final gameplay layout and separate visual references on 2026-10-05. No human first-time duration measurement is recorded; do not pad the route to meet the original target. M3 art/audio is integrated, including a user-authorized ImageGen exception for remaining required props after DreamLayer failures; final camera/full-loop verification is complete. docs/planning/PLAN.md records actual results.

## Stable IDs and shared contract

- Artwork/scene: `royal-supper`; awarded piece: `golden-pear`.
- Preserve the `fork-bridge` interaction ID and shared campaign collection operation.
- Preserve `candle-flame` as the identity of the required candle passage; replace its permanent extinguishing mechanics with the fan-driven timed three-candle section.
- Existing checkpoint IDs are a compatibility baseline. Retain useful IDs and add explicit stable IDs for the new section ends in typed level data. Runtime checkpoint state remains session-only; reload may reset it.
- Report collection through CampaignCommand. Do not directly edit inventory, museum objects or global unlocks.
- Keep the isolated development entry and movement lane independent of campaign storage.

## Player and camera

- Orthographic side view; motion on XY, decoration on Z. Camera follows the player left to right with look-ahead so upcoming landings/hazards are visible. No player-facing route map.
- A/D or arrows move, Space jumps, E interacts where needed, R checkpoint restart, Escape pause. No combat, crouch, ladders or free depth movement.
- Double jump: one ground launch plus one airborne jump, each on a fresh Space press. Holding/repeating input cannot grant further jumps. Ceiling, side contact, hazard overlap or walking off a ledge cannot recharge jumps. After coyote time expires, a ledge fall permits at most the single airborne rescue jump.
- A valid downward landing on solid gameplay geometry or checkpoint respawn restores the jump allowance. The controller must distinguish this from incidental touching/overlap.
- Jelly bounce: a downward landing launches automatically, consumes the first launch/coyote opportunity and allows exactly one airborne jump. Remaining inside its collider or brushing its side cannot repeatedly launch/recharge the player. Re-arm only for a new legitimate landing.
- Measure the full horizontal/vertical double-jump and bounce envelopes before authoring required gaps. Fork gap/overhead geometry must prevent bypass; bounce launch points must not permit skipping later mandatory sections.
- Store tuning and positions in typed configuration. Butter raises running speed from 6.8 to 9.2, reduces braking/acceleration and carries that movement mode through a jump until landing on dry ground. Airborne neutral input preserves slide momentum; reversal remains possible. No dynamic rigid-body engine is required.

## Proposed route order

The user selected the mechanics and progression style; this sequence is the working implementation order. Players read scenery and timing in the game rather than a map.

| Section | Challenge and purpose | Checkpoint policy |
| --- | --- | --- |
| Bread basket and crockery | Introduce ordinary jump, then double jump through increasingly tall bread/plate steps and standing-height goblet passages | Starting spawn; no extra checkpoint for each small jump |
| Butter and crumbs | Controlled slippery run; time jumps over crumbs while momentum persists, then land on a clear dish | One checkpoint after clearing the section |
| Rolling grapes | Predictable rolling waves with visible approach; mix stepped landings and airborne avoidance | One checkpoint after clearing the section |
| Fork crossing | E topples the fork into the required bridge; dimensions account for full double-jump reach | Preserve settled bridge; checkpoint after crossing |
| Fan and three candles | Automatic rotating fan briefly extinguishes candles one by one. Commit and cross before flames return | One checkpoint after the entire timed section; none between the candles |
| Diner attention and cover | Three safe dishes, followed by three progressively longer crossings (13, 15 and about 20 units to safety), with narrowing cover widths | One checkpoint after the whole watched passage |
| Jelly and dessert ascent | Jelly launch, two cake rises, a level shelf, a drop to a second jelly, then a final rise to the pear | The previous section's checkpoint covers retries; arrival completes the route |

Checkpoint spacing follows completed hard sections, not every platform. Tune section duration to keep repeated attempts meaningful without repeating most of the level. Platforms/checkpoint spawns must be stable and independent of moving hazards.

## Butter slide

- Clearly different surface appearance and a short safe introduction demonstrate reduced braking.
- Use authored crumbs as obstacles with explicit collision, visible takeoff space and a readable exit landing.
- Crumb contact from any side causes checkpoint recovery and a clear cue. Swept collision contacts count even when wall resolution prevents final overlap. Crumbs are obstacles to clear, not safe landing platforms.
- Three short patches vary crumb width, height, spacing and gap placement; avoid repeating a full obstacle pattern. Sliding survives butter takeoff/landing and ends on dry ground or respawn.
- No forced loss of directional control or unavoidable failure after entering the slide. Do not hide crumbs behind decorative food.
- Introduce this challenge separately from grapes. A later combination is optional after both mechanics prove readable.

## Rolling grapes

- Script motion/spawns with predictable timing; rolling appearance does not determine collision.
- Grapes enter through visible approach space, never on top of the player or a checkpoint. Hazard contact causes checkpoint recovery.
- Increase challenge through spacing/waves and landing positions; avoid random impossible sequences.
- Reset the retry wave to a readable phase after failure. Pause/blur freezes grape motion and spawn timing; leaving the scene stops its updates.

## Fork interaction

1. Reach a safe near-side trigger and show E — Topple fork.
2. E starts upright → toppling → bridged; repeat activation while moving is ignored.
3. Animate to its known resting pose and enable bridge collision only when settled. Presentation and collider state agree.
4. Settled bridge remains through falls and session re-entry; restart adventure resets local puzzles without removing campaign awards.
5. Verify both the full double-jump envelope and available bounce launch positions cannot bypass this required crossing.

## Timed fan and three-candle passage

- Use the approved trident-shaped holder with three candles as the visual basis. Each flame has an explicit independent hazard volume.
- Three 3-unit-wide candle tops are separated by 3-unit gaps. Jump onto the first candle, between both pairs, and across the 4-unit exit gap; there is no floor bridging the arms. A common brass foot, stem and crossbar sit below the route and provide no walkable shortcut.
- A fan automatically rotates/sweeps, extinguishing the flames in sequence. Each remains safe for a limited interval, then relights. The section requires timely forward traversal; waiting indefinitely within it is not a solution.
- Let the player observe the cycle from a safe entry area. Fan orientation, diminishing flame/embers and relighting cues communicate which candle is safe and when the window is closing.
- Timing values come from measured jumps and tested traversal. Choose offsets/windows that admit a reliable route with the allowed double jump, then tune difficulty. No permanently safe snuffer action replaces the timing challenge.
- Current jump-route windows open at 2.0 / 3.1 / 4.2 seconds in the 11-second cycle, each for 2 seconds. The canopy underside is at y7, allowing full ordinary jumps between y3.2 tops; heat fills the clearance to prevent jumping above lit candles. Deep column collision prevents an underneath shortcut.
- Relit flame contact burns and recovers at the last checkpoint, even if the player has not crossed fast enough. There is no checkpoint midway through the three-candle challenge.
- On failed retry, restart the cycle at a readable phase. Pause/blur freezes every phase timer. Leaving the scene stops local updates; session re-entry resumes the local state coherently, and reload may reset it.
- Reaching the far side can update the checkpoint; it does not permanently disable relighting. Prove that jumping above/below the hazard route cannot bypass the required timing.

## Diner attention and cover

- User-selected rule: if a diner tilts their head/looks down during the active detection phase and the player is outside cover, the player is caught. Standing still outside cover is not safe. Jumping above or out of cover can cause detection.
- A visible head-turn lead-in precedes the active look phase; afterwards the diner looks away. Implement one scripted cycle first, rather than general AI.
- During LOOK, soft golden rays shine from the painted eyes toward the table. Remove the old animated eye spheres; AWAY and TURNING retain normal banquet lighting. The rays stay behind player/cover silhouettes and share the paused gameplay phase. This visual change was requested on 2026-10-06; detection bounds and timings remain unchanged.
- Authored goblet/dish cover regions protect only a fully hidden player body. Art must explain cover boundaries and its height; pixels do not perform line-of-sight simulation.
- The dish fills the protection volume. An inset blue floor strip marks safe foot-centre positions, including both edges; it turns green when the player is fully hidden, matching the HIDDEN status. Use only a tiny numeric boundary tolerance, not a grace period that makes genuine exposure safe.
- Cap the passage at three cover crossings. Increase travel distance and narrow the safe dishes rather than extending a repeated pattern. Keep the same visible attention cycle and whole-section checkpoint.
- Reaching the exposed section from a checkpoint must not cause instant unavoidable detection. Tune lead-in/look-away intervals against actual travel time and provide reachable cover.
- Being caught returns to the last checkpoint with a clear cue. Freeze attention timing on pause/blur and stop it with scene lifecycle.

## Recovery, session state and completion

- Unlimited retries, no lives, death counter or campaign piece loss. Recovery remains quick.
- Use starting spawn and one checkpoint after each cleared hard section; no intermediate checkpoints split an individual challenge.
- Preserve the settled fork and campaign awards during recovery. Cyclic hazards restart at readable retry phases rather than becoming permanently cleared. Local traversal state remains session-owned and separate from campaign saves.
- Restart Adventure resets the local route while preserving collected/restored pieces. Replay cannot duplicate the pear or reverse restoration.
- Pear overlap awards once, gives feedback and offers Return to Museum / Continue Exploring. Return near the source frame; preserve drag/click/keyboard placement, immediate restoration saving and confirmed reset.
- Timers and motion use the one fixed-step gameplay clock, not unmanaged browser intervals. Input clears on pause/blur and transitions remain serialized.

## Art and audio boundary

A warm painterly whole-table banquet: many diners eating/drinking, rich red/gold fabric, bread, dishes, wine/glasses/goblets/cutlery/fruit and three-candle brass candelabra. Keep gameplay silhouettes and landings stronger than background detail. Banquet-v5 is a direction reference, not a geometry map; derive layers/props for the side-view camera.

The user accepted a stylised, animation-inspired cohesion follow-up on 2026-10-06: simplify photographic prop detail while retaining light painted texture and the softer banquet background. Inspect the completed M3 props first and start with a small bread/player/prop pilot. Preserve all mechanics, visible state cues, LOOK rays, high-dessert backdrop and approved compositions. The completed M3 gate stays recorded; this follow-up is tracked separately in docs/art/ART_DIRECTION.md.

That scoped pass is now verified: offline bread/basket/crumb/cake texture
preparation with exact original dimensions/alpha and preserved source paths.
The registered player, painted backdrop and other 11 M3 props are reused.
No generation or gameplay change. 40 focused tests and all nine Chromium
scenarios pass; both-size pilot/state/restoration evidence is retained in
docs/validation/art-cohesion. M4 was not started.

Validate the expanded blockout and camera before production generation. Then prepare only required background layers, reusable platform/food/crockery art, butter/crumbs, grapes, fork, fan/candelabrum, cover props, jelly, pear and player frames. Record DreamLayer provenance, executions and actual credits; inspect edges, transparency and animation alignment. Keep source and runtime assets separate.

Essential Howler audio includes ambience, jump/bounce, interaction, slide/hazard/attention cues, collection, return and restoration. Use original/licensed sources and record provenance. Respect saved master volume, explicit activation, pause and scene disposal. Audio cues supplement visible timing rather than making sound mandatory.

No mountain scene, final museum decoration, extra adventure, deployment/submission/email or broad speculative art catalogue is part of this expanded M3 pass.

## Expanded verification gates

- [x] User playtest approval of the revised gameplay layout, including the final trident candle jumps.
- [x] Ground plus airborne jump only; held input, repeat presses, coyote transitions, ceiling/side contact and bounce overlap cannot stack more.
- [x] Double jump and jelly cannot bypass the fork or timed candle passage.
- [x] Sliding is controllable; crumb landings remain readable and collision works at supported sliding speed.
- [x] Grapes offer a visible, reproducible route and never spawn on the player.
- [x] Three flames extinguish/relight in sequence; slow traversal burns, timed crossing succeeds, pause freezes phases.
- [x] Diner head turn is readable; exposure including jumping out of cover is detected; full cover protects.
- [x] Checkpoints occur after hard sections; each retry starts safely and preserves campaign awards/settled fork.
- [ ] Camera shows upcoming landings, first-time traversal is timed against the 5–7 minute target, and difficulty is reviewed by playtesting.
- [x] Full production museum → supper → pear → restoration flow, save/reload, replay, confirmed reset and all placement methods remain correct.
- [x] Isolated entry, resource disposal, repeated scene entry, resize, blur/pause, asset loading and production paths pass.
- [x] Generated art/audio provenance and actual costs are recorded; integrated rendering is visually inspected.

Checked gameplay items retain focused and historical browser evidence in docs/planning/PLAN.md. Gameplay/references are user-approved; DreamLayer slice, registered poses, pear/restoration and original Howler audio remain integrated. Three user-authorized ImageGen sheets now supply all 14 remaining required props, with separate provenance and unchanged collision. The complete art/audio gate passed on 2026-10-06: all nine untraced Chromium scenarios, both camera sizes, individual flame states and the full production/restoration loop. Final backdrop QA found/fixed the empty area above the high dessert ascent; 40 focused checks and the production storage/traversal/restoration regression passed after that presentation fix. Watcher LOOK rays are verified; physics/timings remain unchanged. No measured first-time human duration or representative-machine profile is claimed.
