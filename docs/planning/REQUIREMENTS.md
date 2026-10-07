# The Last Curator — Product and implementation requirements

Checkpoint status, 2026-10-06: S3A + S3B satisfy the implemented Slice 3 gate and the user requested their origin/main checkpoint. S4's Layer 3 climb/glue sections are next and remain unimplemented; the sun/campaign/ending remain S5 scope. This status supersedes prior review-only notes without changing gameplay contracts.

S4 delivery contract, 2026-10-06: [the plan](../gameplay/SKETCH_S4_PLAN.md) subdivides S4 into separately requested/reviewed A walls, B glue, C joined Layer 3 and D earlier-layer integration/final gate. Keep strict FIFO with two nails, three only in the Layer 3 wall climb after its start pickup (user decisions 2026-10-07), grounded checkpoints after the climb/glue, section-local retries/re-entry, direct section entries, one stacked scene and no rope. C must prove same-layer ground continuation and D the second-ride handoff; current S3 studies retain their endpoints. Final S4 is complete only after all four gates, with further subdivision if needed. Plans/prompts are documentation, not implemented behavior or current implementation permission.

## 1. Feature overview

A desktop browser adventure in which the player explores a small museum and enters paintings to recover pieces of one damaged masterpiece. Each recovered piece is carried back and placed into the masterpiece, restoring colour and unlocking the next adventure. The committed release contains Royal Supper and Unfinished Sketch; Drowned Garden remains a gated optional third stage. The user replaced unimplemented Sleeping Mountain on 2026-10-06. DreamLayer creates the major illustrated assets, and Three.js turns them into playable scenes. The objective is a complete, enjoyable, visually coherent jam submission rather than a broad unfinished campaign.

## 2. Goals and non-goals

### Goals

- One complete new-game-to-ending journey. The user selected a 5–7 minute first-playthrough target for expanded Royal Supper, including a few retries. The original whole-game roughly 5–10 minute target is under review; time the second adventure before setting a revised total campaign estimate.
- Responsive, forgiving platforming and understandable environmental interactions.
- Museum exploration, inventory and restoration that connect the adventures meaningfully.
- Substantial, documented DreamLayer contribution to masterpiece, artwork worlds and props.
- A static browser build that loads reliably and supports future artwork replacements.

### Non-goals

Online services, runtime image generation, multiplayer, free 3D painting traversal, complex combat, mobile controls, procedural worlds, multiple masterpieces or a general-purpose engine. Reserve mini-games are not required content.

## 3. Users and primary workflows

Primary player: a jam voter or hiring reviewer opening the itch.io game with keyboard and mouse.

### Campaign flow

1. Player selects New Game or Continue and sees controls. Starting is an explicit gesture that can activate audio.
2. Player enters the museum and approaches the masterpiece. First inspection reveals the pear silhouette and a clue toward Royal Supper.
3. Player walks to Royal Supper and clicks its frame while within interaction range and line of sight.
4. A transition loads the adventure and starts at its entrance or remembered session checkpoint.
5. Player advances through the longer side-scrolling tabletop route using double jumps, butter/crumb sliding, grape avoidance, the fork bridge, timed fan/three-candle crossing, diner attention/cover and dessert bounce ascent, then reaches the king's plate. Exact section order is a planning default defined in docs/gameplay/ROYAL_SUPPER.md.
6. Collecting the pear awards it once to inventory. A success cue offers Return to Museum.
7. Player returns near the supper frame and walks back to the masterpiece.
8. Clicking the masterpiece opens inspection. Player drags the pear to its target, or uses click/keyboard placement.
9. Correct placement consumes the inventory item, restores its region, saves progress and unlocks Unfinished Sketch once its playable scene is registered.
10. Player traverses Sketch's three layers with two reusable FIFO-recalled nails, collects the sun, returns and restores its region. See docs/gameplay/UNFINISHED_SKETCH.md for the selected sequence and slice gates.
11. In the two-stage build, the masterpiece is complete and the ending plays. In the optional three-stage build, the bird gap/garden unlocks; completion follows bird restoration instead.
12. Player may remain in the museum, replay an artwork or start a new game.

### Failed placement and failed traversal

1. Invalid placement returns the piece to inventory and gives a gentle cue; no progress is lost.
2. Falling or touching an active flame respawns at the latest checkpoint.
3. Completed persistent prop interactions, such as the settled fork, remain completed during checkpoint recovery. Cyclic candle flames relight and are not a permanently completed prop state; failed timed challenges reset to a readable starting phase.
4. No death counter, lives, combat health or inventory loss is required.
5. Expanded Royal Supper is demanding, with unlimited retries and one checkpoint after each hard section. No intermediate checkpoint divides an individual challenge. Detection while outside cover in the diner's active look phase also returns to the last checkpoint.
6. Sketch falls, axe/glue contact and manual retry return to a safe section spawn with two available nails and predictable local mechanism state. Working checkpoint locations: each layer entrance and each Layer 3 section entrance. Earlier cleared sections and campaign awards remain intact. Ordinary same-session exit/re-entry retains its traversal session; page reload may reset traversal, never campaign pieces.

## 4. Functional requirements

### Shared behavior

- FR01: Campaign definition is the single source for stage order, piece ownership, restoration targets and completion count.
- FR02: One active world updates and renders at a time; scene changes cannot start overlapping transitions.
- FR03: Input is contextual. Museum walking, platforming and inspection cannot run simultaneously.
- FR04: Pause, blur and visibility loss clear held inputs and stop simulation. Resume resets accumulated time.
- FR05: Collection is idempotent; restoring a piece removes it from inventory and never allows recollection to duplicate it.
- FR06: Only the current unlocked stage may advance campaign progress. Replays may complete without changing inventory/progress.
- FR07: Artwork entry checks distance and line of sight. Locked artwork explains its prerequisite without entering.
- FR08: Return position is near the entry artwork and never inside a wall. Leaving an unfinished adventure is allowed.
- FR09: Inspecting pauses walking and releases pointer lock. Wrong drops never discard a piece.
- FR10: Colour restoration updates progress immediately; presentation may animate afterward. Reload during an animation must load the completed restoration.
- FR11: Save after collecting and restoring pieces and when settings change. Save failures preserve in-memory play.
- FR12: Reset requires an explicit confirmation and clears only this game's stored data.
- FR13: Completed artworks remain replayable; replay never reverses a restoration.
- FR14: End condition derives from the selected campaign stages, not a hardcoded three-piece check.
- FR15: Royal Supper allows at most one airborne jump after the initial launch; fresh presses, ceiling/side contact, falling, held input or bounce overlap cannot stack additional jumps. Valid landing/checkpoint recovery restores the allowance. Required gates must be tested against the measured full jump/bounce reach.
- FR16: The three-candle fan section uses timed sequential extinguishing and relighting; active flames cause checkpoint recovery. Three separated tops on a trident holder require jumps between the candles, with no underlying walkable bridge. Timing and overhead clearance must allow those jumps while preventing a bypass above or beneath lit candles. Timed hazards and diner attention use gameplay time and freeze on pause, blur, inspection and scene exit.
- FR17: Butter sliding, rolling grapes, diner attention/cover and bounce pads use explicit authored gameplay geometry and scripted states independent of illustration pixels. Diner exposure during the signalled active look phase triggers recovery, even if standing still; jumping above/out of cover exposes the player. Cover must hide the full player body.
- Watcher presentation: golden eye-to-table light rays identify LOOK; normal banquet lighting identifies AWAY/TURNING, with a head-turn warning before LOOK. No animated eye blobs. Rays do not change authored detection or cover geometry.
- FR18: Butter takeoff and landing preserve sliding momentum; neutral airborne input does not apply dry-ground braking. Crumb contact triggers section recovery, including swept side/top/underside contacts. Three varied butter patches use faster sliding, irregular spacing and differing obstacle sizes.
- FR19: Limit the diner passage to three progressively harder cover crossings. The visible safe standing strip and HIDDEN feedback must match full-body protection at their boundaries. The dessert finale mixes rises, a flat shelf, a drop and two jelly launches rather than a long repeated staircase. The original duration target remains provisional after user feedback; prioritize variety and readable retries.

### Unfinished Sketch requirements

- FR20: Exactly two nails, except the Layer 3 wall climb: a third nail is picked up at its start, resets with the section and is taken back on the post-climb ground (user decisions 2026-10-07). Authored valid targets, except the S4B swing crossing, where nails go anywhere along nailable surfaces (never empty air) with a preview and refusal reasons; explicit placement effects. Placement cannot duplicate nails or silently replace an occupied nail. A single recall action retrieves the oldest placed nail remotely in FIFO order. Invalid/full-budget input cannot reorder the queue. Show the budget and next recalled nail.
- FR21: Pinning freezes pendulums/boards at their current state; axes remain active. User-approved S2 revision: Layer 1 pendulums are moving dashed outlines with no collision until pinned; pinning inks solid support and recall removes it immediately. The later S3A difficulty review explicitly extends this authored rule to Layer 2 boards, preserving reviewed S1 behaviour. Visible outline/solid states match collision in the same simulation tick. Marked moving swing sockets carry a placed nail through their authored path instead of freezing. Visible target types explain the difference. Geometry and illustration states change together.
- FR22: Layer 3 includes pinned-board wall sliding/criss-cross jumps, foothold/direct-nail swing traversal above glue, and timed transfers between moving nail sockets. The player swings directly around the nail with A/D momentum; no rope, ranged grapple or rigid-body engine. Reach, attachment, release and air-jump defaults must be proven in S1. No repeated-input/contact jump stacking.
- FR23: FIFO reuse must be feasible in every intended sequence. A foothold is visibly landable; placement targets/destinations are visible before commitment. Recalling current support cannot silently choose another nail. Reset, pause, scene exit and re-entry must not leak attachment, queued inputs or nail ownership.
- FR24: Two escalators connect the first three layers and deposit the player on fixed safe ground. Six development slices each expose a playable, save-isolated review entry and tested gate; production ignores those shortcuts and offers no unavailable adventure door.
- FR25: Award stable `sun-disc` through shared progression once. Collection safely settles Sketch and offers return; final museum sun placement triggers two-stage completion. Retain existing piece/restoration/save identities and verify compatibility with pear-progress saves, collection/restoration reload boundaries and replay. Existing campaign source still names Mountain until the authorized integration slice.
- FR26: Final Sketch keeps three stacked layers in one connected scene/canvas. Moderately zoom/reframe toward the active layer while retaining neighboring-layer context; do not isolate only one row or switch layer screens. Smoothly reframe during escalator travel, respecting reduced motion. Resize preserves world geometry. S2 proves comfortably sized player/hazard/nail/target/HUD readability and context at 1280x720 and 960x540. Supersedes fixed full-board/no-zoom framing; S1 bays remain development tests. S2 delivers this at an 18-unit view on a roughly 34-unit stacked world with per-section vertical bands and no zoom change between layers.

- FR27: The four-pendulum Layer 1 route requires two FIFO recalls (A for C, then B for D) through the user-approved outlined/inked platform mechanic plus authored geometry, never a hidden completion rule. The fixed exit is at least 5.43 units above B's highest surface, above the measured ordinary double-jump ceiling; C stays beyond placement reach from the terrace and A. A moving outline cannot support the player. C cannot jump directly to the fixed exit; B cannot skip directly to D. All four outlined platforms must be pinned to provide support. Platform sweeps are faster with progressively narrower landings; placed nails show a camera-facing circular head centered on the placement hole. Every otherwise valid landing on solid geometry remains valid.

- FR28 (S3A difficulty review): save-isolated `study=layer-2` starts at the existing Layer 2 landing, traverses three faster, narrower non-climbable moving outlines that ink solid only while pinned, and two faster independent active axes to fixed left exit ground. Freeze current board transform; FIFO recall resumes its captured phase. Refuse targets belonging to another leg. Falls/axes/R reset Layer 2 entrance with two nails and deterministic motion; grounded exit landing clears temporary state/input and commits the endpoint. Traversal re-entry resets the Layer 2 attempt; exit re-entry stays at its checkpoint. Keep 18-unit framing, authored leftward look-ahead and adjacent rows. All three boards require pins to provide collision support; all three board pins and at least one FIFO recall are required by the two-nail budget and measured skip geometry, including edge overlap/coyote grace. The standard verified solution is A/B/recall-A/C; midair recall/repinning remains valid advanced play. Recall removes support immediately. The user explicitly rejected the earlier optional-nail solid-board default. Tune challenging but repeatable timing; do not add hidden completion flags. No joined entry or second escalator in S3A. Whole S3 remains incomplete until S3B.

- FR29 (S3B implemented at playable review gate): compose joined Layers 1/2 and a second scripted ride to safe Layer 3 arrival, preserving hard S3A and isolated S2. Only joined first arrival advances into Layer 2; direct Layer 2 also extends through the second ride. Restore/retry uses the active leg/checkpoint; Restart Adventure uses the selected entry leg. No Layer 3 challenge/campaign content. See [S3B implementation plan](../gameplay/SKETCH_S3B_PLAN.md) for the state table, code changes and verification gate.

### State transitions

| State | Event | Next state / effect |
| --- | --- | --- |
| Menu | New / Continue | Loading → Museum |
| Museum | Click available artwork | Transition → Adventure |
| Adventure | Fall / flame | Respawn at session checkpoint; keep prop states |
| Adventure | Collect stage piece | Award once; remain in adventure with success/return UI |
| Adventure | Return / exit | Transition → Museum near originating artwork |
| Museum | Inspect masterpiece | Inspection; movement paused |
| Inspection | Valid placement | Save restoration → animate → reveal next target or ending |
| Inspection | Invalid placement | Remain in inspection; piece stays in inventory |
| Active world | Pause / blur | Paused; explicit resume returns to previous state |
| Any loading state | Required asset fails | Error UI with Retry / Back; no award or lost save |

### Edge cases

1. Rapid repeated click/E/return: process once while a transition or prop action is in flight.
2. Return or reload after collection but before restoration: piece remains in inventory.
3. Reload during restoration: restored state wins; no repeated award or lost piece.
4. Reload during traversal: restart the artwork's puzzle/checkpoint state; persisted campaign pieces remain owned/restored.
5. Stored data malformed or incompatible: validate, recover safe defaults, and show a nonfatal message. Do not crash.
6. Storage denied/full: continue in memory and indicate that progress will not persist.
7. Two-stage save used by a later three-stage build: preserve recognized piece progress, recompute unlocks/ending from the new campaign; do not trust a stored completed flag.
8. Input lost during jump: clear held keys and pause; no uncontrolled movement on return.
9. Resize/fullscreen: preserve gameplay positions and recompute camera/UI framing.
10. Unsupported WebGL: readable support message rather than a blank screen.
11. Missing final art: placeholders allowed in development, not silent substitutes in the release.

## 5. User experience requirements

- Museum: dim red ambience, wooden floorboards, red carpet and a strongly framed/lit masterpiece. Darkness must not obscure navigation or prompts.
- Mini-games: readable silhouettes and landing surfaces; decorative foreground cannot hide hazards or interaction points.
- Introduce move/jump/E at the relevant first use. Show only the nearest reachable interaction prompt.
- Royal Supper's camera follows smoothly and shows the next landing before a jump. Sketch moderately focuses its active layer while showing adjacent-layer context in the same stacked world. No blind compulsory leaps in either adventure.
- The longer supper progresses left to right; players discover challenges through the scene, motion and contextual cues, with no player-facing route map. Flame/attention changes need readable advance cues, and grapes need visible approach distance. Timing can be demanding while remaining learnable.
- Return/loading/collection/placement states have visible feedback.
- Inventory and missing targets use shape and labels as well as colour.
- Placement supports drag, click and keyboard. Menus expose visible focus and basic keyboard navigation.
- Master volume and low-quality option; no flashing restoration effects. Respect reduced-motion preference for nonessential camera/transition effects.
- Museum first-person mouse look has a drag-to-look fallback when pointer lock is unavailable.

## 6. Technical design summary

Suggested modules, to be created during implementation:

```text
src/
  main.ts
  core/          # loop, input, scene manager, asset ownership
  gameplay/      # kinematic controller, collision, interaction, checkpoints
  campaign/      # definition, progression operations, save validation
  scenes/        # museum and isolated artwork scenes
  levels/        # typed authored layouts, starting with royal-supper.ts
  ui/            # menus, HUD, inventory, inspection
  assets/        # logical manifest definitions
public/assets/   # prepared runtime assets only
asset-sources/   # approved source art and provenance; excluded from build
```

Each scene exposes enter, fixedUpdate, render/interpolation, resize, exit and dispose behavior. Use direct typed interfaces rather than an event bus or engine framework unless actual complexity requires one. Mini-games issue completion through shared progression operations; they do not reference museum meshes.

Level definitions separate platforms, hazards, checkpoint spawns, interaction triggers and decoration. Object state changes apply art transforms and collision changes together. The campaign registers only scenes that exist in the release.

## 7. APIs and backend changes

No backend or network gameplay APIs. DreamLayer integration is a development tool, not a player-session service. The new internal operation below defines the shared progression boundary.

- Name: CampaignCommand
- Type: Internal Service (new, synchronous TypeScript operation)
- Method: `applyCampaignCommand(command)`
- Path: `src/campaign/progression.ts` (module, not an HTTP endpoint)
- Auth: None; caller is the local game. Validate against campaign/state, not caller-provided unlocks.
- Purpose: Collect or restore a piece and return authoritative progress.
- Request Schema (JSON):

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["action", "artworkId", "pieceId"],
  "properties": {
    "action": { "enum": ["collect", "restore"] },
    "artworkId": { "type": "string", "minLength": 1 },
    "pieceId": { "type": "string", "minLength": 1 }
  }
}
```

- Response Schema (JSON):

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["ok", "changed", "error", "collectedPieceIds", "restoredPieceIds", "complete"],
  "properties": {
    "ok": { "type": "boolean" },
    "changed": { "type": "boolean" },
    "error": { "enum": [null, "UNKNOWN_ID", "PIECE_ARTWORK_MISMATCH", "LOCKED_STAGE", "PIECE_NOT_OWNED"] },
    "collectedPieceIds": { "type": "array", "uniqueItems": true, "items": { "type": "string" } },
    "restoredPieceIds": { "type": "array", "uniqueItems": true, "items": { "type": "string" } },
    "complete": { "type": "boolean" }
  }
}
```

- Validation: IDs must exist and belong to the same stage; collect requires its artwork to be unlocked; restore requires collection and current stage eligibility. A piece already collected/restored succeeds without mutation. Restored IDs must be a subset of collected IDs and a valid campaign prefix.
- Error Codes: Listed in the response schema; invalid commands do not mutate progress.
- Idempotency: Duplicate collection/restoration returns `ok: true, changed: false` without duplicate inventory or animations.
- Rate Limits: Not applicable. Gate interaction input while applying transitions; no queues, cron jobs or webhooks.

## 8. Data model and storage

No database tables. Introduce these typed client-side models:

| Model | Fields |
| --- | --- |
| CampaignDefinition | `id: string`, `stages: CampaignStage[]` |
| CampaignStage | `artworkId: string`, `pieceId: string`, `sceneId: string`, `restorationRegionId: string`, `clue: string` |
| SaveV1 | `schemaVersion: 1`, `campaignId: string`, `collectedPieceIds: string[]`, `restoredPieceIds: string[]`, `settings: Settings` |
| Settings | `masterVolume: number` (0–1), `quality: 'normal' \| 'low'` |
| AdventureSession | `artworkId: string`, `checkpointId: string`, `interactionStates: Record<string, string>` |
| PlatformDefinition | `id: string`, `x/y/width/height: number`, `enabled: boolean`, optional interaction owner |
| InteractionDefinition | `id: string`, `kind: string`, `triggerBounds`, `initialState: string`, typed state config |

Storage key: `last-curator.save.v1`. Inventory is derived as collected minus restored, unlocks derive from restoration order, and completion derives from campaign stage count. Do not persist redundant unlock/completion flags.

Keep session traversal state in memory; page reload may reset it. Validate saves, remove unknown IDs and recover the longest valid restored prefix. Keep recognized collected pieces for available campaign stages. No telemetry or personal data is required.

## 9. Services and technology choices

TypeScript/Vite for a typed static build; Three.js WebGLRenderer for both perspective and orthographic worlds; HTML/CSS for accessible small interfaces; Howler.js for audio. Use custom kinematic movement for authored platforming and scripted props. DreamLayer produces major visuals. See docs/reference/TECH_STACK.md for details and linked primary documentation.

## 10. Security and privacy

No account/login or personal data in the game. Bundle approved generated assets, never DreamLayer keys. Keep credentials outside client/public files. Use licensed or original audio and record its source. No runtime CDN dependency is needed.

## 11. Observability and operations

Development diagnostics should expose FPS/frame time, active scene and checkpoint; collision debug overlay is useful. Errors identify missing asset IDs and failed transitions. No external analytics or production dashboards. Disable debug UI and direct-level shortcuts in release. Record measured performance in the implementation log.

## 12. Rollout strategy

Local blockout → local complete loop → art integration → complete two-artwork production preview → authorized itch.io test upload → release. Test actual iframe input/audio/asset paths. ZIP index.html at root and use relative asset URLs. Keep a known-good local build before replacing a hosted build. Publishing and email need user authorization.

## 13. Success metrics and acceptance criteria

Performance/download figures are budgets to measure, not current claims:

- Aim for 60 FPS at 1280×720 on a representative integrated-GPU laptop; cap normal DPR at 1.5 and low DPR at 1.0.
- Initial download target ≤20 MB and total prepared assets target ≤50 MB.
- Checkpoint recovery target ≤1 second after a short failure cue; interaction feedback begins by the next rendered frame.
- Single-player load, static hosting; gameplay continues after asset loading without network requests for generation.

Release checks:

- [ ] New game reaches a complete restored masterpiece and ending with selected stage count.
- [ ] Royal Supper fork/candle are reachable and required; no jump or exit can bypass core gates.
- [ ] Falls/flame recover without losing campaign pieces or completed session interactions.
- [ ] Sketch's FIFO budget, platform freezing, active axes, wall climb, glue crossing, direct nail swings/moving mounts, escalators and section recovery pass real-control checks; no rope or bypass/stacking exploit.
- [ ] Collection, return, drag/click/keyboard placement, unlocks and replay behave correctly.
- [ ] Save/reload at collection/restoration boundaries preserves valid progress; denied storage does not crash.
- [ ] Resize/fullscreen, pause/blur, pointer-lock release/fallback and explicit audio start work.
- [ ] Typecheck and production build pass; production preview and hosted asset paths are verified.
- [ ] Performance measured on the stated device; any limitation is recorded.
- [ ] Major visuals are final assets with documented DreamLayer provenance; no unintended placeholder art remains.
- [ ] Submission materials identify DreamLayer's contribution and include screenshots/footage.

## 14. Risks, assumptions and open questions

Risks: custom platforming collision quality, generated asset alignment, limited credits, transparent-layer rendering cost, and scope creep. Mitigate with a playable blockout, explicit colliders, small inspected generation batches, profiling, and the two-artwork completion gate.

Assumptions: first-person hub and two-stage campaign are working defaults chosen during handoff; the player can use a desktop keyboard/mouse. See docs/planning/DECISIONS.md for authoritative choices and remaining art/account questions. No blocking question remains for the next blockout session.

## 15. Implementation handoff

Follow docs/planning/PLAN.md M0–M6. M0–M3 are complete at snapshot 1750ed3, including approved supper gameplay, DreamLayer slice/restoration, original Howler audio and the user-authorized ImageGen M3 props with distinct provenance. Final camera/full-loop checks passed. The accepted stylised cohesion follow-up in docs/art/ART_DIRECTION.md is also complete; preserve its uncommitted result, gameplay, restoration registration, saves and lifecycle contracts. Do not regenerate the entire set or retry retired requests. Validate meaningful collision/progression risks and the complete loop after runtime changes; compilation alone is insufficient. Log automated versus human verification and limitations. M4 now adds Unfinished Sketch and the ending through six slices in docs/gameplay/UNFINISHED_SKETCH.md; final Sketch art, museum/polish follow later. S2 implementation and the mandatory-reuse mechanic revision were explicitly requested on 2026-10-06; preserve that result; S3A is now implemented at its own review gate, with S3B requiring a separate request.

The scoped follow-up is complete: four offline bread/basket/crumb/cake variants,
preserved original sources/registration/alpha, reused player/background/other
props and no mechanics/provider-generation change. All 40 focused tests,
typecheck/build and nine Chromium scenarios pass; actual-camera evidence and
limits are in docs/validation/art-cohesion and docs/planning/PLAN.md. Preserve the uncommitted
art result. M4 S1 is accepted; S2 and S3A are implemented at their review gates. S3B is implemented at its review gate; S4 onward and the ending remain unimplemented.


Current S3B contract result (2026-10-06): joined first arrival advances exactly once into clean Layer 2 traversal; direct and joined second arrival commit safe Layer 3 ground. Retry/re-entry is leg-local, mid-transit re-entry downgrades to that departure, and restart uses entryLegId. Two keyed rides/pads, stage/leg/recovery input boundaries and unchanged hard challenge data are verified in docs/validation/sketch-s3/s3b. Stop for user review before S4.
