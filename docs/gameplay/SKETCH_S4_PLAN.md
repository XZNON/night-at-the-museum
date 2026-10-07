# Sketch S4 — Layer 3 climb and glue implementation plan

**Update 2026-10-07 (user decisions during S4A review):** the wall climb has a third nail, picked up at the Layer 3 start and taken back on the post-climb ground. Section 2 is redesigned as a free-placement crossing (platform → moving swing → moving swing → fixed ledge, two nails); the [revised S4B plan](SKETCH_S4B_PLAN.md) supersedes the glue/fixed-swing text below. S4A's delivered climb is six boards A–F, not three; see its [evidence](../validation/sketch-s4/s4a/README.md). B/C/D must re-check their sequences with three nails and keep the pickup at the Layer 3 entrance.

Planning date: 2026-10-06. Documentation only; S4 is not implemented. Inspected baseline: clean main at `77acf036605521a705fdcb527f880589afce38cf`, origin `https://github.com/XZNON/night-at-the-museum.git`, Node v22.14.0/npm v10.9.2. Recheck these and preserve newer changes in every implementation session. S3 was committed/pushed at the user's request; this planning request does not authorize another commit/push or gameplay implementation.

## 1. Feature overview

Build the first two sections of Layer 3: a three-board criss-cross wall climb and a super-glue crossing using foothold nails and a fixed swing nail. Reuse the reviewed Sketch movement and two-nail FIFO ledger. Teach each transfer safely, then connect both challenges to the existing second escalator in one stacked cartoon 2.5D picture. End on fixed ground before S5's moving-socket finale. Deliver four separately requested implementation blocks with playable review gates.

The problem is route construction and section recovery, not inventing movement. S1 established individual mechanics; those results do not prove a new Layer 3 layout is traversable or readable.

## 2. Goals and non-goals

### Goals

- Three up/down boards support genuine alternating wall slides/kicks, mandatory nail placement and FIFO reuse, followed by a fixed landing.
- Dry-ground practice introduces explicit E grip, A/D momentum and Space/E release before the exposed foothold → fixed swing → foothold crossing.
- R, falls, glue contact and same-session leave/re-entry recover at the current cleared section, without replaying earlier layers or losing nails.
- Direct section studies, joined Layer 3 and a new full development route support review at 1280x720 and 960x540. Existing S1/S2/S3 studies keep their reviewed endpoints.
- Final S4 verification covers real controls and readable target/landing geometry in one scene/canvas.

### Non-goals

S5's moving mounts, sun, settling, museum registration, campaign/ending, saved route progress, final art/audio, provider requests, dependencies, a rope/grapple, new general physics/route framework, publication and sub-agents. Existing commit/push permission applied to the completed S3 checkpoint only.

## 3. Users and primary workflows

Desktop keyboard/mouse player. Existing controls remain: A/D or arrows move/pump; Space jumps/kicks/releases; E grips/releases a swing nail or boards the active escalator; click places; Q recalls oldest; R retries; Escape pauses.

1. Enter an implemented development study explicitly and start through its menu. Proposed selectors below are not working URLs today.
2. S4A starts at Layer 3 arrival, shows a safe approach/practice transfer, then traverses three moving climb boards with two nails. Land on fixed post-climb ground and stop.
3. S4B starts on the future post-climb/glue approach. Practise direct nail grip/release over dry ground, then place foothold A and land on its head.
4. Place fixed swing S, jump into grip range and press fresh E. While attached to S, Q recalls A. Place B with the freed nail, pump and release onto B. Q then recalls S, leaving B as support; jump onto fixed exit ground.
5. S4C connects the accepted wall and glue sections in the same Layer 3 coordinate system. Crossing fixed post-climb ground changes the active checkpoint/target ownership, without an escalator, scene change or endpoint overlay.
6. S4D adds a new development preset starting at Layer 1. Both existing rides lead into Layer 3 walls, then glue, then the S4 endpoint. Older studies still stop where they do now.
7. Retry the current section, leave/re-enter at its safe start, or Restart Adventure at the selected preset's entrance. Reload does not preserve this development-only progress.

### Delivery blocks

| Block | Playable result | Main risk owned | Dependency |
| --- | --- | --- | --- |
| [S4A](SKETCH_S4A_PLAN.md) | Isolated three-board wall route, safe start and fixed exit | Real alternating contacts, useful pin windows, wall camera | Completed S3 |
| [S4B](SKETCH_S4B_PLAN.md) | Isolated dry practice and complete glue route | Grip/release, placement while swinging, FIFO landing | S4A gate reviewed; its section scaffolding reused |
| [S4C](SKETCH_S4C_PLAN.md) | Wall → safe connection → glue in joined Layer 3 | Grounded section transition, checkpoint and ownership | S4A/S4B accepted layouts |
| [S4D](SKETCH_S4D_PLAN.md) | Layer 1 → both rides → wall → glue → fixed S4 endpoint | Second-ride handoff, earlier-layer preservation, lifecycle | S4C gate reviewed |

These are four minimum work boundaries, not promises of four sessions of fixed duration. Each begins only on its own explicit request and ends for review. If a mechanic gate is still broad, split it further using the continuation rules in its plan. Do not fill spare time by starting the next block, or collapse C/D into A/B. Fix material review findings in their owning block before proceeding.

## 4. Functional requirements

### Preserved movement and nail rules

- Two nails total; successful placement appends to FIFO. Invalid/full-budget/wrong-section actions do not mutate it. Q never chooses a newer or safer nail.
- Only pinned climbable boards offer wall contact. Wall contact consumes the air jump; a fresh kick spends transfer credit; same-board recontact cannot grant another climb kick. Another pinned board or grounded landing renews it. No global movement retune to make a draft route work.
- S4 working default: route climb boards use the existing `solidWhenPinned: true` and `resumePhase: true` flags, while S1 stays unchanged. This is an implementation default to make the required pins physically necessary, not a new user-approved rule for every board. Verify outline/body presentation for tall boards.
- A foothold head exists only with its nail. A fixed swing is gripped on fresh E within the existing radius; there is no automatic attachment or remote pull. A release uses existing momentum; release and correction jump need separate presses.
- Recall-current-wall/head/grip actually removes that support. The route must remain recoverable through ordinary motion or quick local retry.
- Glue contact uses the existing 0.35-second recovery cue/quick retry. Do not add a new stuck animation/state. Preserve fixed 60 Hz timing and freeze simulation on pause/blur.

### State transitions

| From | Trigger | To and invariant |
| --- | --- | --- |
| Wall traversal | Grounded landing on authored fixed wall exit | Isolated wall endpoint; two free nails, cleared attachment/input |
| Wall exit in joined L3 | Verified grounded connection to glue entry | Glue traversal, wall completion retained as active-section progress; no completion overlay |
| Glue traversal | Grounded landing on fixed glue exit | Terminal S4 safe ground; nails/attachment cleared once |
| Any traversal | R/fall/glue | Current section entrance, phase zero, two free nails; no earlier challenge replay |
| Cleared/terminal safe ground | R/fall | Same committed safe ground |
| Traversal leave/re-entry | Valid owned memory snapshot | Current section safe entrance; no in-air/wall/swing restore |
| Existing scripted ride leave/re-entry | Transit snapshot | That ride's departure exit, as in S3 |
| Any preset | Restart Adventure | That preset's entry leg, clears its route progress |

Keep the existing `traversal`, `exit`, `transit`, `arrival` stages unless an actual tested need appears. `legId` can identify `l3-walls` or `l3-glue` even though both belong to layer 3. A same-layer link is ordinary ground traversal: `nextLegId` with no escalator advances at its grounded shared landing. Current code follows `nextLegId` only in escalator arrival; implement the ground link in S4C, not by pretending it is a zero-duration escalator. For linked sections, `completed` remains false until the final endpoint. S4A/B terminal legs must accept `escalator: null` and `arrivalSectionId: null` safely.

### Enumerated edge cases

1. Pin at a board's extreme phase: either remains traversable with a useful retry or visibly admits a poor choice; do not claim every pose works. Show meaningful useful windows rather than one exact tick.
2. One-board ascent, unpinned riding, omitting A/B/C or skipping wall entry: probe real collision and contacts, not an artificial completion counter.
3. Q removes the current wall/foothold/swing: detaches safely, no embedded body, nail duplication or extra jump credit.
4. Swing release brushes a thin head: sweep collision must produce a real grounded landing; an airborne checkpoint overlap cannot count.
5. Same-tick recall/place, release/jump, retry/interaction: existing transaction order and retry priority remain authoritative.
6. Held E at a ride/section boundary: cannot auto-grip or board; queued clicks/Q/direction are cleared.
7. Wrong/unknown/cross-preset session or target IDs: recover to selected entrance/reject action, never grant another section's targets through visibility.
8. Backtracking after wall clear: fixed connector is safe, old targets remain inactive, retry keeps glue progress. Do not add an invisible kill wall or allow a second checkpoint commit to replay the handoff.
9. Older-layer colliders/hazards below the climb: section fall line fires before accidental lower-layer landing; no hidden solid guide provides a bypass.
10. Resize while sliding or swinging; reduced motion; actual foreground-tab blur; leave during recovery: targeting and lifecycle remain correct.

## 5. User experience requirements

Keep modern cartoon 2.5D thickness, rounded mechanisms, depth-separated scenery and soft lighting. No realistic Sketch textures or flat pixel presentation. Distinguish wall boards, foothold heads and swing sockets using the reviewed target-specific nail presentation. Retain the oldest marker and clear refusal reasons.

Each practice area is a short safe introduction to that section, not a new mandatory multi-stage obstacle. Do not add checkpoints midway through the exposed climb or glue crossing. Make the next target and its landing visible before commitment and during the useful placement window. HUD must show Wall slide/Swing when active; current route HUD otherwise substitutes generic Grounded/In the air and needs an S4-scoped correction.

Retain moderate active-layer framing and neighboring Layer 2 context. Wall alternation should keep both opposing faces visible rather than snapping look-ahead with every kick. Glue framing should show the current head, pivot and next head. Reuse 18u view height initially. If justified, add a section-local look-ahead override with the existing 7.5u default unchanged for S2/S3; measure at both sizes before changing height. Reserve-guide ceiling at y30 and current world top32 are scenery/layout bounds, not approved limits on a real climb; update new presets' bounds/guides as needed without modifying old presets.

## 6. Technical design summary

### Inspected integration points

| File / current behavior | S4 work |
| --- | --- |
| `src/levels/unfinished-sketch.ts` | Extend typed studies/leg IDs; keep mechanism/tuning and accepted bays |
| `src/levels/unfinished-sketch-layer2.ts` | Reuse immutable S3 data; preserve `(4.2,24.4)` arrival and both paths |
| New `src/levels/unfinished-sketch-layer3.ts` | Shared wall/glue data in world coordinates; direct/joined factories without duplicate IDs |
| `src/gameplay/sketch-model.ts` / `SketchRouteModel` | Section-owned target/retry/session behavior; null-escalator endpoints; grounded continuation in C |
| `src/gameplay/sketch-movement.ts` | Reuse reviewed wall and fixed-swing states; only fix demonstrated material defects with affected regressions |
| `src/scenes/unfinished-sketch.ts` | Tall-board outlines, section focus, ground-link input clearing, no new loop |
| `src/main.ts`, `src/ui/game-ui.ts` | Resolve proposed studies to correct presets, menus/HUD/restart labels and per-preset memory |
| `tests/sketch-movement.test.ts` | Existing wall tests position bodies between contacts; add full route feasibility independently |
| `tests/browser/sketch-mechanics.spec.ts` | Reviewed mechanic regressions; this suite is not proof of the new wall/glue route |
| New `tests/sketch-layer3.test.ts`, browser `sketch-layer3-*.spec.ts` | Ownership/recovery and real-control direct/joined traversals |

No backend, external service, table, API endpoint, save migration or new dependency. Reuse the actual Sketch route model; no ECS, second controller or generalized campaign engine. New data should only promote current concrete reuse, not speculative S5 mechanics.

### Geometry approach and working defaults

- Keep the S3 arrival collider x0..10/top24.4/thickness2 and spawn `(4.2,24.4)` as the Layer 3 entrance. Layer 3 travels generally rightward; the climb itself alternates between opposing faces.
- Start wall-board trials from S1's size 2.2x4.4, roughly 3.3u gap between faces, vertical travel4 and periods7/6/5s. These are candidate measurements, not final coordinates. Place three boards across opposing columns with different useful heights. Enter A on the face whose kick goes toward B, and B on the face whose kick goes toward C; a linear A/B/C array is not evidence of criss-cross reach.
- Place the third board above the first column with swept-path clearance, rather than overlapping two solid rectangles. Measure entry reach, falling-only wall attachment, face sign and final exit height. Keep a fixed landing outside the ordinary double-jump bypass envelope. Prefer moving targets within comfortable slide windows; do not require cursor-perfect one-tick placement.
- Start glue trials from S1 `combined` relative spacings (A→pivot about5.5u, pivot→B about6u), head size1.9x0.35 and the current 10u placement reach. Translate into the Layer 3 corridor and adjust vertical profile to fit the active camera and a full body arc above glue. Copying S1 coordinates is not proof of pin/grip/release/landing feasibility.
- Allow a broad fixed descent from the wall's high exit to a comfortable dry glue approach if necessary; C authors that safe connection. Do not stack the entire glue profile on the wall's peak by default and lose neighboring-layer context. No new escalator or descent hazard.
- Glue covers the physical gap; authored raised sites leave nail heads above the lethal surface. Dry tutorial supports cannot continue across the exposed gap. Measure no-nail, missing-pivot and missing-A/B bypass attempts, including retained swing momentum/correction jumps.
- Do not freeze numerical layout today. Each mechanic block records final typed coordinates, periods, focus bands, useful phase ranges and measured margins with the evidence before the next block reuses them. Routine geometry tuning is authorized only in that later implementation request.

## 7. Internal APIs and changes

These are local method contracts, not HTTP services. Schema examples describe data; fields/types are defined in section8. No authentication/network/rate-limiter is introduced.

### Existing command transaction

- Name: `SketchPlayfield.enqueue` / `update`
- Type: Internal Service (existing).
- Method: `enqueue(command: SketchCommand): void`; `update(dt: number, input: Controls): void`.
- Path: `src/gameplay/sketch-model.ts`.
- Auth: Active development scene; scene owns pointer input, model revalidates section/reach/budget at the consuming tick.
- Request Schema (JSON): `{"type":"place","targetId":"l3-wall-a-pin"}` or `{"type":"recall"}`; update uses existing Controls and fixed dt1/60.
- Response Schema (JSON): no synchronous return; observations use `{"availableNails":2,"queue":[],"move":{"state":"normal"}}` with actual existing getters/HUD.
- Error Codes: Existing cue/refusal string; no mutation on unknown/wrong-section/occupied/full-budget/out-of-reach placement. Off-screen picking is rejected by the scene. Current model does not implement a general line-of-sight query; avoid occluding mandatory targets, and do not claim that validation exists.
- Idempotency: Occupied-target duplicate rejected; each fresh Q recalls exactly one oldest placement.
- Rate Limits: Existing fixed-step transaction and fresh input; no networking.

### Proposed grounded section advance, S4C only

- Name: `advanceGroundConnection` (private route helper; proposed).
- Type: Internal Service (new, concrete second use of next-leg linking).
- Method: `advanceGroundConnection(): void` after validated fixed-ground checkpoint contact.
- Path: `src/gameplay/sketch-model.ts`.
- Auth: Current leg has `nextLegId`, no escalator, and a grounded landing in its authored connection bounds.
- Request Schema (JSON): no caller payload; derived state `{"legId":"l3-walls","stage":"exit","grounded":true}`.
- Response Schema (JSON): observed `{"legId":"l3-glue","stage":"traversal","completed":false,"queue":[],"availableNails":2}`.
- Error Codes: Missing/invalid link is a configuration/test failure; reject unknown link, never silently jump to another layer. No airborne transition.
- Idempotency: Change active leg once; later ticks cannot recommit the previous leg.
- Rate Limits: At most one route boundary per simulation tick.

### Existing session restore, extended ownership

- Name: `SketchRouteModel.restoreSession` / `session`.
- Type: Internal Service (existing).
- Method: `restoreSession(session: SketchRouteSession): void`; getter returns cloned snapshot.
- Path: `src/gameplay/sketch-model.ts`, stored by `src/main.ts` in the existing per-study map.
- Auth: Snapshot belongs to selected preset and reachable known leg; valid stage.
- Request Schema (JSON): `{"routeId":"layer-3","entryLegId":"l3-walls","legId":"l3-glue","stage":"traversal","elapsed":0,"sequence":0,"queue":[],"frozen":{}}`.
- Response Schema (JSON): same snapshot shape after normalization, with current safe entrance and no attachment/buffered actions.
- Error Codes: Wrong preset/entry/leg/stage or malformed values reset selected entrance; documented old snapshots retain reviewed S2 normalization.
- Idempotency: Repeated restore yields the same safe section/ledger/phase.
- Rate Limits: Scene transition ownership only.

## 8. Data model and storage

Proposed additions are introduced only when their owning block needs them:

```ts
// A adds wall; B adds glue; C/D add their actual presets.
type NewS4Study = 'layer-3-walls' | 'layer-3-glue' | 'layer-3' | 'layers-1-3';
type NewS4LegId = 'l3-walls' | 'l3-glue';
// Extend existing unions, do not replace their old members.

// Existing SketchRouteLeg fields reused:
// sectionId: string; targetIds: string[];
// exitBounds: Rect; exitSpawn: { x: number; y: number }; exitDeathY: number;
// nextLegId?: SketchRouteLegId;
// escalator: SketchEscalator | null; arrivalSectionId: string | null;

// New optional field in existing SketchRouteSession:
routeId?: SketchRouteId;
// Emit routeId for every new S4 snapshot. Legacy absence is accepted only for
// existing S2/S3 presets under their current validation/normalization rules.
// entryLegId, legId and stage already encode committed section progress;
// do not add a redundant cleared-section array or persist world/body/grip state.

// Only if framing measurements justify it:
// SketchRouteSection.focus.lookAhead?: number; old fallback remains 7.5u.
```

Use stable `l3-wall-a/b/c` mechanism IDs with distinct `...-pin` targets; glue `l3-glue-a`, `l3-glue-pivot`, `l3-glue-b` targets; `l3-wall-exit`, `l3-glue-entry`, `l3-glue-exit` fixed ground. IDs are proposed until A/B implement them, then preserve them. No duplicates across combined arrays. Scene boundary detection must include section progress, not just a camera change. New fields need independent ownership/failure tests, not snapshots mirroring decoration.

No SaveV1/save-key/progression changes. Memory sessions are per preset; browser reload starts its study over. Legacy dev snapshots are not a disk migration problem, but existing reviewed tests/session semantics must still pass.

## 9. Services and technology choices

Reuse TypeScript typed data, `SketchRouteModel`/`SketchMovement`, Three.js WebGLRenderer, existing HTML/CSS HUD, Howler lifecycle and Playwright/Vitest. These already implement the required mechanics and scene ownership. Asset generation and new packages are unnecessary for this placeholder stage.

## 10. Security and isolation

Add selectors only to existing development validation/scene routing. Production ignores every new study and exposes no observation hook. Keep sentinel campaign-save bytes unchanged and denied-storage behavior working. Do not include credentials or provider operations in plans, browser code or evidence.

## 11. Observability and verification

Evidence lives in `docs/validation/sketch-s4/s4a/`, `s4b/`, `s4c/`, `s4d/` only after actual implementation. Record exact commands/results, real URLs, read-only leg/stage/checkpoint/FIFO/motion observations, useful phase/release windows, skip probes and 1280/960 captures. No fake current pass counts or stub evidence directories are created by this plan.

Unit fixtures may position bodies to exercise state boundaries; complete route feasibility and browser traversal use inputs only. Drivers may observe valid poses and record ordinary retries; they must not teleport, alter tuning/state, hide retries or mutate progress. Report failed drafts and aggregate reruns honestly.

## 12. Rollout strategy

Implement A→review→B→review→C→review→D→review. Publish no Site/build externally. Each new entry becomes a working URL only after its block validates. Old mechanics/layer-1/layer-2/layers-1-2 studies remain independent regression references with unchanged endpoints. Undo S4 using its distinct new preset wiring/data if needed, without resetting approved S3 or user changes. Do not commit/push automatically.

## 13. Success metrics and acceptance

- [ ] Complete wall route has multiple useful pin/kick schedules; next mark is visible and reachable while sliding at both sizes.
- [ ] Exactly two nails/FIFO support all three wall pins and the A/S/recall-A/B/recall-S glue sequence through physical collision.
- [ ] Complete glue route offers a useful release interval, real foothold landings and no basic jump-only/missing-pivot bypass.
- [ ] Section recovery, ground connection and second ride have correct active ownership with no intermediate endpoint in new joined presets.
- [ ] All direct/Layer3/full-S4 entries work; old entries and accepted S1/S2/S3 challenge data remain correct.
- [ ] Local section fall lines prevent lower-row catches; no guide/background provides collision or hides targets.
- [ ] Typecheck/focused tests/build and the relevant actual-control browser gates pass; one canvas/loop/resources survive re-entry.
- [ ] Final S4 stops before moving sockets/sun/campaign; measured human pacing/performance are claimed only if actually measured.

## 14. Risks, assumptions and open questions

Risks: copying bay geometry that is not a full route proof; contacting the wrong board face; targets too high to click during the falling contact window; tall climb/glue framing losing neighboring context; retained swing velocity bypassing a head; null-escalator `nextLegId` never advancing; route-specific HUD/endpoint strings hard-coded for Layer2/S3; broad shared changes weakening accepted gameplay.

Working assumptions: four blocks keep mechanics and two integration gates comfortably separate; physical outline/ink support is reused for S4 climb only; brief dry practice and fixed descent are sufficient for readable introductions. These are tunable within S4, not evidence of human approval. Final coordinates/phases/focus are determined in A/B and frozen before C/D.

No blocking product question remains for A. If usable geometry cannot fit the agreed connected view without changing movement or settled gameplay, stop at that measured finding and present the concrete alternatives for user direction. Do not quietly expand the world/mechanics to force the plan.

## 15. Implementation handoff

Start with [S4A](SKETCH_S4A_PLAN.md) and its [paste-ready prompt](SKETCH_S4_PROMPTS.md#s4a--wall-climb). Each block includes its code order, evidence and acceptance checklist. Treat prompts B/C/D as future requests to paste separately after review, not authorization granted now. S4 is complete only after D's continuous route gate; the full adventure and campaign still require S5/S6 and a separate art follow-up.
