# The Last Curator — Product and implementation requirements

## 1. Feature overview

A desktop browser adventure in which the player explores a small museum and enters paintings to recover pieces of one damaged masterpiece. Each recovered piece is carried back and placed into the masterpiece, restoring colour and unlocking the next adventure. The committed release contains Royal Supper and Sleeping Mountain; Drowned Garden is an optional third stage. DreamLayer creates the major illustrated assets, and Three.js turns them into playable scenes. The objective is a complete, enjoyable, visually coherent jam submission rather than a broad unfinished campaign.

## 2. Goals and non-goals

### Goals

- One complete new-game-to-ending journey, roughly 5–10 minutes on a first successful playthrough; tune against playtests.
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
5. Player crosses the tabletop, topples the fork, extinguishes the candle and reaches the king's plate.
6. Collecting the pear awards it once to inventory. A success cue offers Return to Museum.
7. Player returns near the supper frame and walks back to the masterpiece.
8. Clicking the masterpiece opens inspection. Player drags the pear to its target, or uses click/keyboard placement.
9. Correct placement consumes the inventory item, restores its region, saves progress and unlocks Sleeping Mountain.
10. Player completes mountain, collects the sun and restores its region.
11. In the two-stage build, the masterpiece is complete and the ending plays. In the optional three-stage build, the bird gap/garden unlocks; completion follows bird restoration instead.
12. Player may remain in the museum, replay an artwork or start a new game.

### Failed placement and failed traversal

1. Invalid placement returns the piece to inventory and gives a gentle cue; no progress is lost.
2. Falling or touching an active flame respawns at the latest checkpoint.
3. Completed prop interactions remain completed during checkpoint recovery.
4. No death counter, lives, combat health or inventory loss is required.

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
- Camera follows smoothly but shows the next landing before a jump. No blind compulsory leaps.
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

TypeScript/Vite for a typed static build; Three.js WebGLRenderer for both perspective and orthographic worlds; HTML/CSS for accessible small interfaces; Howler.js for audio. Use custom kinematic movement for authored platforming and scripted props. DreamLayer produces major visuals. See tech stack.md for details and linked primary documentation.

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
- [ ] Collection, return, drag/click/keyboard placement, unlocks and replay behave correctly.
- [ ] Save/reload at collection/restoration boundaries preserves valid progress; denied storage does not crash.
- [ ] Resize/fullscreen, pause/blur, pointer-lock release/fallback and explicit audio start work.
- [ ] Typecheck and production build pass; production preview and hosted asset paths are verified.
- [ ] Performance measured on the stated device; any limitation is recorded.
- [ ] Major visuals are final assets with documented DreamLayer provenance; no unintended placeholder art remains.
- [ ] Submission materials identify DreamLayer's contribution and include screenshots/footage.

## 14. Risks, assumptions and open questions

Risks: custom platforming collision quality, generated asset alignment, limited credits, transparent-layer rendering cost, and scope creep. Mitigate with a playable blockout, explicit colliders, small inspected generation batches, profiling, and the two-artwork completion gate.

Assumptions: first-person hub and two-stage campaign are working defaults chosen during handoff; the player can use a desktop keyboard/mouse. See DECISIONS.md for authoritative choices and remaining art/account questions. No blocking question remains for the next blockout session.

## 15. Implementation handoff

Follow PLAN.md M0–M6. M0–M2 are implemented; the next milestone is M3, first adventure art and sound. Validate meaningful collision/progression risks with focused tests and playtest the complete route; compilation alone is insufficient. Log automated versus human verification and limitations before handing off. The game is done when the selected campaign ends correctly, required acceptance checks pass, and release materials are ready.
