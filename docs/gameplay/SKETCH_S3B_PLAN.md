# Sketch S3B — Joined layers and second escalator

Checkpoint update, 2026-10-06: the user confirmed Slice 3 is made and explicitly requested committing/pushing completed S3A/S3B to origin/main. Next is S4 on a separate implementation request. Earlier review-only/authorization notes below record the implementation session's boundary.

Planning date: 2026-10-06. **Implemented 2026-10-06 under the later explicit S3B-only request; stop at its playable gate for user review.** [Fresh evidence](../validation/sketch-s3/s3b/README.md) records actual results; the original planning context below is historical. The user requested this next-session plan and a commit/push checkpoint after the hard S3A revision. This document specializes [SKETCH_S3_PLAN](SKETCH_S3_PLAN.md) against the actual S3A code; it does not authorize starting implementation in this planning session. Preserve [hard-v1](../validation/sketch-s3/hard-v1/README.md), accepted S1 and the latest four-pendulum S2.

## 1. Feature overview

Join the reviewed Layer 1 and hard Layer 2 routes into one continuous development study, then carry the player on a second escalator to safe Layer 3 ground. Keep the existing isolated Layer 1 entry unchanged and extend isolated Layer 2 through the second ride. Preserve the required nails, faster mechanisms and stacked cartoon 2.5D framing. S3B ends at a safe arrival with no Layer 3 challenge or campaign integration.

## 2. Goals and non-goals

Goals: continuous Layer 1 → first ride → Layer 2 → second ride → fixed Layer 3 arrival; correct leg-local retry and checkpoint restoration; readable boarding/transport and neighboring-layer context at both review sizes.

Excluded: retuning/softening reviewed S3A, Layer 3 wall/glue/swing gameplay, sun collection, museum door, campaign/ending, save schema changes, generated assets, dependencies, audio production, publishing and sub-agents. The current request authorizes committing/pushing the existing checkpoint; that permission does not imply future automatic commits/pushes during S3B implementation.

## 3. Users and primary workflows

Desktop keyboard/mouse player; existing A/D or arrows, Space, click, Q, E, R, Escape and menus.

1. Joined entry `?scene=unfinished-sketch&study=layers-1-2` starts on Layer 1 with two nails and deterministic phases.
2. Complete the existing four-pendulum route, commit its exit checkpoint and press fresh E on the first boarding pad.
3. First ride arrives at the existing `(64.2,15.2)` landing. In the joined preset, advance once to Layer 2 traversal, with empty FIFO, two nails, zero velocities/local phases and cleared input. Do not show completion.
4. Traverse unchanged hard Layer 2: three outlined boards must be pinned; two faster axes remain active. The verified standard solution is A/B/recall-A/C. Advanced midair recall/repinning remains valid.
5. Grounded landing on existing fixed exit x23..31/top16.3 commits Layer 2 clear. It offers fresh-E boarding instead of the old S3A endpoint.
6. Second ride reaches generous fixed Layer 3 ground, clears input/temporary state and shows one S3 endpoint.
7. Isolated `study=layer-2` starts directly at step3 and reaches the same final endpoint. Existing `study=layer-1` still ends at its original Layer 2 landing; mechanics bays remain unchanged.

Both new/extended presets stay development-only. The joined URL is now implemented in development; production ignores shortcuts. Unknown study values keep the mechanics fallback.

## 4. Functional requirements

### Preserve the reviewed difficulty baseline

| Layer 2 data | Required preserved value |
| --- | --- |
| Board widths | A3.4 / B3.0 / C2.6u |
| Board periods | A2.4 / B2.0 / C1.7s |
| Axe periods and pivots | A2.6s at(51.5,20.9); B2.2s at(41.8,21.5) |
| Support | `solidWhenPinned: true`; recall removes support and resumes captured phase |
| Budget/controls | Exactly two, authored targets, strict FIFO; no automatic eviction |
| Movement/reach | Existing tuning, 10u placement reach, 46CSSpx hit area |
| Ownership | Only active-leg targets can be placed; visibility is insufficient |

Do not alter the authored route to simplify the joined traversal. Any material new geometry/movement change must retain measured skip prevention; current C-skip margin is 0.18u after generous body overlap/coyote allowance.

### Checkpoint/state transitions

| Preset/state/event | Required result |
| --- | --- |
| Joined start / Restart Adventure | Leg1 traversal at its entrance, two nails, deterministic phases |
| Direct Layer 2 start / Restart Adventure | Leg2 traversal at its entrance, two nails, deterministic phases |
| Traversal fall/axe/R | Retry only current leg; Layer 2 never replays Layer 1 |
| Grounded exit | Clear temporary nails/phase offsets/attachment/commands; commit active-leg exit once |
| Airborne exit overlap | Remain traversal |
| Fresh E at active exit pad | Transit for that leg only; consume E and suppress jump/place/recall/grip |
| R while in transit | Same leg's departure exit checkpoint |
| Joined first arrival | Atomically advance to Layer 2 traversal; no endpoint and no command leak |
| Isolated Layer 1 first arrival | Preserve reviewed S2 terminal arrival behavior |
| Second arrival | Leg2 terminal arrival on Layer 3; zero velocity, two nails, one endpoint |
| Fall/R on terminal arrival | Return to that arrival ground, not either departure |
| Pause/actual blur | Freeze gameplay/transit/camera and clear held/queued input |
| Leave mid-transit | Re-entry at that ride's departure exit; never fractional ride progress |
| Joined traversal re-entry | Restore the current leg's entrance deterministically; retain earlier cleared leg |
| Direct Layer 2 traversal re-entry | Preserve its deterministic Layer 2 entrance retry |
| Existing S2 traversal re-entry | Preserve reviewed S2 queue/frozen snapshot normalization behavior |
| Exit/terminal re-entry | Restore the corresponding grounded safe checkpoint |

### Edge cases

1. R wins over same-tick E/place/recall. Boarding E cannot also grip or jump.
2. Held E cannot board a later ride automatically; crossing leg/stage boundaries clears input.
3. First-arrival handoff executes once and resets board phase offsets, not just displayed time.
4. Restoring joined leg 2 must accept an owned, reachable leg even though entryLegId is leg 1. Unknown/inconsistent leg/stage/target IDs recover safely.
5. Off-leg targets never enter FIFO; full/invalid clicks preserve queue order.
6. Resize while aiming/transiting preserves phases, pins, checkpoint and reprojects targets.
7. Current-support recall, repin overlap, bad blade timing and no-nail attempts keep local recovery.
8. Arrival ground cannot enable skipping Layer 2; staircase art is not a new walkable collision shortcut.
9. Same-scene re-entry/disposal keeps one canvas/renderer/loop and owned GPU/listener resources.
10. Denied storage and sentinel-save bytes preserve isolation; production exposes no dev observation hook.

## 5. User experience requirements

Keep the 18u active view, comfortable mechanic size, cartoon volume/thickness and adjacent-layer context. Leftward Layer 2 look-ahead stays authored; first ride turns into that section's focus without a separate screen. Second ride interpolates actual departure/arrival focus bands, respecting reduced-motion behavior. Render both independently identified escalators; highlight only the active boarding pad. HUD/menu/retry/endpoint text names the actual layer and preset, with no S2/S3A endpoint during joined intermediate arrival.

Working placement defaults for the second ride, to be camera-validated rather than treated as final approved geometry:

- Boarding on existing exit: rectangle x24.4,y16.3,width3.6,height2.4; existing checkpoint spawn(27.5,16.3) is retained.
- Path: `(26.2,16.3) → (22,17.8) → (18,19.4) → (14,21) → (10,22.7) → (6,24.4) → (4.2,24.4)` over 4.0s, with stable ID `l2-escalator`.
- Fixed arrival: x0..10/top24.4/thickness2.0; spawn(4.2,24.4); local fall line 22.0; section `layer-3-landing`, 18u view with centreY 24.6..26.0, rightward look-ahead toward reserved S4.

These defaults place safe arrival before future Layer 3 traversal and avoid the fast axes at x41.8/51.5. Reposition/remove overlapping non-playable guides if needed; do not author future S4 geometry. Measure destination visibility, safe standing area, scripted path/ground alignment and absence of a jump bypass. Landing dimensions/path timing may be tuned within this scope while preserving both challenge layouts.

## 6. Technical design summary

One Three.js scene/canvas and fixed 60 Hz loop remain. S3A already introduced `SketchRouteLeg`, leg-owned targeting, sessions by study and swept blade collision. Extend that code; do not repeat the extraction, copy models or create a general engine.

| Actual integration point | Work required |
| --- | --- |
| `src/levels/unfinished-sketch.ts` | Add validated joined study; separate route preset ID from entry/active leg; add typed next-leg link |
| `unfinished-sketch-route.ts` / `unfinished-sketch-layer2.ts` | Keep challenge values; author second ride/arrival and compose joined preset with unique IDs |
| `src/gameplay/sketch-model.ts` | Remove route.id-as-entry assumptions; advance linked leg on first arrival; validate restore; use active leg for recovery, ownership, time and completion |
| `src/scenes/unfinished-sketch.ts` | Replace single `escalatorStep` with rigs/steps keyed by escalator ID; build each pad and animate correct path; detect leg+stage input boundaries |
| `src/main.ts` | Resolve joined query before SaveStore; construct correct entry leg and preserve independent map sessions; extend read-only diagnostics |
| `src/ui/game-ui.ts` | Joined/direct intro, restart labels, active checkpoint/boarding and terminal text |
| Focused/browser tests | State-transition, restore/input ownership, unchanged difficulty, direct and joined real traversal |

Current pitfalls: constructor/session/restart equate `route.id` to a leg; restore rejects any active leg different from entry; arrival/notifications/HUD still assume S2; only one tread field exists despite constructor iterating legs; boarding decorations use legs[0]; animation reads the active leg's path for that single tread; boundary clearing checks field.id layer2 and stage only. Fix these actual assumptions together. Do not use route ID or name substrings as completion logic.

## 7. APIs and backend changes

No HTTP API, backend, provider calls, jobs or persistent service. `SketchCommand` remains place(targetId)/recall. Internal factory is reused without broadening nail semantics:

- Name: `createRouteSession` (existing).
- Type: Internal Service.
- Method: `createRouteSession(entryLegId = 'layer-1')`.
- Path: `src/gameplay/sketch-model.ts`.
- Auth: None; validated dev entry is resolved before campaign storage.
- Request Schema (JSON):

```json
{"type":"string","enum":["layer-1","layer-2"],"default":"layer-1"}
```

- Response Schema (JSON), fresh factory output:

```json
{
  "type":"object","additionalProperties":false,
  "required":["entryLegId","legId","stage","elapsed","sequence","queue","frozen"],
  "properties":{
    "entryLegId":{"type":"string","enum":["layer-1","layer-2"]},
    "legId":{"type":"string","enum":["layer-1","layer-2"]},
    "stage":{"const":"traversal"},"elapsed":{"const":0},"sequence":{"const":0},
    "queue":{"type":"array","maxItems":0},
    "frozen":{"type":"object","maxProperties":0}
  }
}
```

- Validation: `legId === entryLegId`; chosen route contains that entry leg. Joined seeds leg 1; direct seeds leg 2. Later in-memory snapshots use existing stage/queue/frozen types and validate ownership separately.
- Error Codes: No public codes. Invalid typed route data is a programmer error; external study strings use safe fallback; invalid restore normalizes to an owned safe checkpoint.
- Idempotency: Fresh calls return independent equivalent sessions; internal arrival transition advances at most once per ride.
- Rate Limits: Not applicable; fresh-input/serialized-transition guards remain.

## 8. Data model and storage

Suggested minimal typed additions (names may follow local conventions without changing the behavior):

```ts
type SketchRouteId = 'layer-1' | 'layer-2' | 'layers-1-2';
type SketchStudy = 'mechanics' | SketchRouteId;
// SketchRouteLegId remains 'layer-1' | 'layer-2'; Layer 3 is only a terminal section.
interface SketchRoute { id: SketchRouteId; entryLegId: SketchRouteLegId; /* existing data */ }
interface SketchRouteLeg { nextLegId?: SketchRouteLegId; /* existing data */ }
```

Joined links leg 1 to leg 2; isolated Layer 1 has no next link, preserving its endpoint. Leg2's ride ends at `layer-3-landing`. Existing `SketchRouteSession` fields suffice: entryLegId, legId, stage, elapsed, sequence, queue, frozen. Keep earlier clearance implicit in ordered leg/stage, not contradictory extra booleans. Set active leg from a validated snapshot before calling checkpoint/arrival helpers. Same-session maps remain keyed by validated study; no localStorage/schema migration/tables. Reset temporary phases/ledger on a new leg. Terminal goal bounds belong to each preset, so the first landing is not accidentally accepted as final.

## 9. Services and technology choices

Reuse TypeScript/Vite/Three.js/HTML UI, scripted rides, custom controller, existing resource ownership and Howler lifecycle. No new package/service is needed. Keep the existing precise Layer 2 swept blade code and S1 collision behavior.

## 10. Security and privacy

Joined/direct entries remain dev-only and bypass SaveStore. Check sentinel bytes unchanged, storage denial, unknown entries and production fallback. No external credentials/generation/network APIs are part of implementation.

## 11. Observability and operations

Read-only dev observations should expose study, entry/active leg, stage/checkpoint, transit ID/progress, nails/targets, camera and canvas count. Do not expose model mutators for browser tests. Store fresh S3B captures/JSON/commands in `docs/validation/sketch-s3/s3b/`; leave earlier S3A/hard-v1 and S2 evidence unchanged. Record actual URLs and failed attempts rather than presenting planning expectations as results. Representative-machine performance and human duration/difficulty remain separate unmeasured gates.

## 12. Rollout strategy

Local development only: implement typed state/route composition, then second ride/presentation, then verify direct and joined entries. Preserve isolated S2 throughout. Update authoritative documents together and leave a playable S3B review gate. No production Sketch door or deployment; no implicit commit/push permission in a future implementation prompt.

## 13. Success metrics and acceptance criteria

- [x] Real joined traversal completes both reviewed challenges and both rides at 1280×720 and 960×540.
- [x] Direct Layer 2 completes unchanged hard challenge and second ride at both sizes.
- [x] Joined first arrival advances to leg 2 once, keeps completed=false and clears temporary/input state.
- [x] Fail/R/re-entry on Layer 2 never replays Layer 1; ride retry restores that departure; terminal retry restores Layer 3 ground.
- [x] Restart Adventure resets the selected study's entry, and session maps do not contaminate each other.
- [x] Pause/actual blur/resize/transit command spam/reduced motion preserve phase, camera and ownership.
- [x] Required nails, fast periods/narrow widths, no-nail failure and skip margins remain verified.
- [x] S1 and isolated S2 retain their reviewed behavior and endpoints; one canvas/resources survive repeated entries.
- [x] Typecheck, focused tests, build, appropriate browser regressions and production/save isolation pass.
- [x] Fresh captures show both boarding pads, first handoff, active Layer 2 decisions, second mid-ride and final arrival with adjacent-row context.

Whole S3 becomes implemented only when this joined/second-ride gate passes; stop for human review before S4. Do not equate automated completion with difficulty approval or performance profiling.

## 14. Risks, assumptions and open questions

Risks: preset ID confused with entry leg; restored joined leg 2 discarded; stale phase offsets/actions surviving handoff; one tread overwritten by another; goal/target IDs deduplicated incorrectly; extra fixed ground enabling a bypass; camera jumps when direction changes. Focused tests precede scene polish.

Assumptions: second-ride coordinates/duration and generous landing above are tunable defaults; existing movement/difficulty is preserved. User requested next-session planning after the hard review, so that reviewed revision is the integration baseline. No missing credential or reference blocks this placeholder work. No blocking product question remains; future S4 layout/art/campaign choices stay outside scope.

## 15. Implementation handoff

1. Re-read indexed authoritative docs and hard-v1 evidence. Verify branch/HEAD/origin, worktree, Node/npm/dependencies and server ownership; preserve any newer edits. This session checkpoints the existing work; do not assume the next checkout is clean.
2. Add route-preset/entry-leg typing and next-leg linkage. Seed/restore/restart correctly for each preset. Add focused first-arrival/second-arrival/restore/retry tests before scene work.
3. Compose joined geometry from existing reviewed data with unique IDs. Add second ride and fixed Layer 3 arrival only. Keep old Layer 1 preset's original endpoint.
4. Implement atomic leg handoff and input/ledger/phase reset. Update leg-local retry/checkpoint/terminal conditions and stage-specific target eligibility.
5. Render both pads and keyed treads/rigs; animate their own paths. Update camera bands/leg+stage boundary clearing, reduced motion and UI/diagnostics.
6. Adapt S3A tests to assert unchanged hard challenge through its Layer 2 exit before testing the added ride; redirect fresh evidence to s3b. Add joined full route and lifecycle cases. Run actual keys/clicks, not teleport/mutators, at both sizes; drive actual blur and reduced-motion full traversal. Run S1/S2 regressions and production/save isolation. Broaden campaign only if shared core/input/save changes or failures warrant it.
7. Run `npm run typecheck`, `npm run test`, `npm run build`, `npm run dev` and `npm run preview` as appropriate. Use `node node_modules/@playwright/test/cli.js test <actual specs> --trace off`. Record actual commands/pass counts/failures/URLs/captures/measurements and limits; update PLAN/NEXT_SESSION and acceptance status honestly.
8. Finish at fixed Layer 3 safe ground, deliver review URL/evidence and stop. Do not start S4 or campaign/art work. Current review handoff: [NEXT_SESSION](../planning/NEXT_SESSION.md#paste-ready-s3b-implementation-prompt).
