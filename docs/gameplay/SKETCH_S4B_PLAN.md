# Sketch S4B — Free-placement moving-swing crossing

**Status, 2026-10-07: implemented at its playable review gate** (single session, no B1/B2 split). Final coordinates, measurements and checks: [S4B evidence](../validation/sketch-s4/s4b/README.md). Stop for user review before S4C.

Revised 2026-10-07 after the user accepted S4A and redesigned this section. It replaces the earlier foothold A → fixed swing S → foothold B glue plan. It is the second of four S4 blocks; read the [S4 contracts](SKETCH_S4_PLAN.md) and the [B prompt](SKETCH_S4_PROMPTS.md#s4b--moving-swing-crossing).

## User decisions (2026-10-07)

- **Sequence:** make a platform → a swing point moving back and forth → a second, also moving, swing point → land on a fixed end ledge → end.
- **Free placement:** no pre-made nail rings in this section. The player chooses where to drive each nail, anywhere along **nailable things** (wooden strips, moving swing bars), never in empty air. Finding the spot that reaches the next thing is the puzzle.
- **End:** a fixed ledge to land on, not a placed foothold.
- **Nails:** the third nail stays for the S4A wall climb and is **taken back** on the post-climb ground, so this section uses **two nails** with strict FIFO.
- **Scope:** free placement is for this section only. Layers 1/2 and the wall climb keep their reviewed marked targets.

## Playable result and boundary

Deliver proposed `?scene=unfinished-sketch&study=layer-3-swings`, starting on fixed ground at the future post-climb position (S4A ledge top 49.5, x13.2..22, so C can join it unchanged). A glue pool below the crossing is the hazard; touching it retries this section only. No wall/swing linking, earlier-layer extension, sun or S4C work.

## Nailable surfaces

New data type alongside marked targets; existing targets and their tests stay untouched.

- `SketchNailSurface { id, mechanismId, kind: 'foothold' | 'moving-swing', from, to }`: a segment in the mechanism's local frame. A foothold strip makes a landable nail head where it is driven; a swing bar makes a grip pivot carried by the bar's motion. One click, no mode switch: the surface decides the nail's role.
- Placement command `{ type: 'place-at', surfaceId, offset }`, where `offset` is the 0..1 position along the segment. The scene projects the cursor onto the nearest surface and computes this at click time; the model revalidates it at the consuming tick (reach 10 from body centre, nail spacing, budget). The nail stays at that local offset as the bar moves.
- Hover shows a ghost nail at the projected point, tinted valid or invalid with the refusal reason. Invalid clicks never change the queue.
- The FIFO ledger is unchanged: a placement records its surface and offset. Q recalls the oldest; recalling the current support or grip removes it at once.
- Snapshots carry surface/offset. As in S4A, re-entry during traversal returns to this section's entrance.

## Proposed layout (to measure, not assumed)

1. **Start ground:** fixed, safe, with the third nail already gone. A wooden foothold strip F runs out over the glue at a height reachable from it.
2. **Moving bar M1:** a horizontal bar sliding back and forth (S1 moving-mount style: period ~5 s, travel ~4–5u). Only reachable from F's head, not from the start ground.
3. **Moving bar M2:** further on, also moving, out of phase with M1. Reachable only by releasing from M1's swing.
4. **End ledge:** fixed ground, reachable only from M2's release.

Standard two-nail sequence:

| Moment | Queue oldest→newest | Player action |
| --- | --- | --- |
| Nail F at a chosen spot, land on its head | F | Platform made |
| Nail M1 at a chosen spot, jump, E grip | F, M1 | Swinging on a moving pivot |
| Q frees F | M1 | Still swinging |
| Nail M2 at a chosen spot while swinging | M1, M2 | — |
| Release, E grip M2 | M1, M2 | Second moving swing |
| Q frees M1 | M2 | — |
| Pump, release onto the end ledge | — | Grounded end: ledger cleared |

Placement choice matters through: F's spot (closer to M1's path or higher), the M1 spot (pivot offset along the bar changes where its arc reaches), and the M2 spot relative to M1's release window.

## Bypass rules (geometry, not flags)

- Strip F is short enough that a foothold anywhere on it cannot reach M2 or the end ledge by jumping.
- Footholds only exist on F; bars only give swing pivots. So nails cannot leapfrog as stepping stones across the glue.
- M1's best release cannot reach the end ledge directly; M2 is required.
- No nails, omitting F, M1 or M2, and the start-to-M1 jump without F must all fail physically.

## Implementation order

1. Inspect S4A's delivered code/evidence and S1 `moving-swing`/`foothold` behavior (explicit E grip, obstruction release, carry, forced detach). Verify the environment and preserve newer local work.
2. Add surface data, the `place-at` command, revalidation, ghost preview and HUD text. Unit-test the ledger (FIFO, invalid, full budget, recall of current support or grip, snapshot normalization) before any layout.
3. Add the `l3-swings` leg and `layer-3-swings` preset in the Layer 3 module at final world coordinates, as a terminal null-escalator leg with its own section, fall line and focus.
4. Tune M1/M2 periods, travel and phase, the strip and the ledge with an input-only harness. Sweep placement offsets to record which spots work, not just one solution. Then add the bypass probes.
5. Real-control browser checks at 1280×720 and 960×540, including clicking a moving bar while swinging.

## Measurements and checks

Record the range of valid offsets on F, M1 and M2 for a moderate player (several pump/release timings), M2 placement windows while swinging, release-to-grip and release-to-ledge landing windows, and how long a missed transfer takes to retry. Probe: no nails, each omission, placement in empty air (refused), the leapfrog attempt, direct M1→ledge release, regrip replenishment, Q while standing on F, Q on the current grip, pause/actual blur/resize/re-entry while swinging, denied storage and terminal recovery.

## Verification gate

Run typecheck/all unit tests/build; a new `tests/browser/sketch-layer3-swings.spec.ts` with tracing off; affected S1 moving-swing/foothold/combined regressions; S4A route/recovery; and affected S3 boundaries. If shared movement/collision/input changes, rerun the wall and moving-pivot S1 cases too.

Evidence goes in `docs/validation/sketch-s4/s4b/`: exact commands, final coordinates, valid-offset ranges, FIFO/motion observations, windows, failures/retries, skip probes and captures at both sizes. Update the handoff to the B review.

- [ ] Free placement works on nailable things only, with a clear preview and refusal reasons.
- [ ] The full sequence is feasible with real controls at both sizes; several placement choices work.
- [ ] Two nails/FIFO and head/grip/recall collision agree; every support is physically required.
- [ ] A quick section-local retry is demonstrated; accepted S4A/S1/S2/S3 remain correct; no S4C work begins automatically.

## If B needs more than one session

**B1:** free placement (surfaces, preview, ledger) plus F → M1 → a labelled temporary proof ledge. **B2**, after review and a request: add M2 and the final end ledge, then remove the proof ledge. Never label B1 complete.

## Knock-on for later slices

- **S4C** joins the wall climb's ledge to this start ground. The third nail is taken back there (the S4A exit already clears the ledger and the pickup).
- **S5** was planned as a moving-socket finale. Now that moving swings appear here, S5's request must decide how its finale differs (for example harder or longer, or carrying the sun) so it does not repeat this section.
