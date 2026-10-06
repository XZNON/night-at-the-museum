# Night at the museum — Deferred opening sequence

## Timing and priority

User-requested presentation task, recorded on 2026-10-05. Implement at M6, after the selected campaign, final museum and restoration ending work. It does not block current art integration or mini-game development. No assets or API generations are requested merely by recording this plan.

## Story

It is night at the dim red museum. The restorer is a character who lives inside the damaged masterpiece. They come alive and jump out of the painting to recover its missing pieces. Make the masterpiece's depicted traveller match the playable restorer when final composition is prepared.

## Shot sequence

Target duration: 5–8 seconds; skippable.

1. Establish the quiet museum with cool moonlight and restrained warm lamps.
2. Move the camera toward the damaged masterpiece.
3. The illustrated character notices the missing pieces and prepares to jump.
4. The character moves to the frame, then leaps through it toward the carpet.
5. They land with a soft shadow, brief landing pose and sound.
6. Transition into the existing first-person museum camera and give the player control.

## Implementation

Use DreamLayer character illustrations and authored Three.js animation, rather than an AI-generated video. Begin with placeholders to validate the sequence before spending credits.

- Derive roughly 4–6 useful poses from the approved restorer reference: painted/resting, noticing, preparing, jumping, landing and standing. Reuse existing suitable poses where possible; inspect identity and registration.
- Present the character on a textured plane positioned at the painting, initially integrated into its canvas composition.
- Coordinate the artwork layer and character cutout so the static painted figure does not remain visibly duplicated when the moving figure emerges.
- Animate position along a short jump arc, pose changes and camera timing.
- Use the real frame's depth/occlusion, plus an appropriate canvas boundary mask while the character remains inside, to sell the crossing. Verify draw order and transparent edges.
- Add a small ground shadow and timed sound for the landing. Avoid heavy particle effects or simulated character physics.
- Frame the transition into first-person control so the sprite disappears naturally rather than visibly popping out of existence.

This sequence does not require a rigged 3D character, a new rendering engine or a third-person museum controller. Those remain separate scope decisions; preserve the existing first-person hub.

## Lifecycle and accessibility

- Start only after an explicit user gesture; audio follows existing activation/volume rules.
- Show a keyboard-accessible Skip control. Skip reaches the same safe museum spawn/control state as normal completion.
- Play on New Game; Continue bypasses it. Replay can be a later menu option if inexpensive.
- Disable museum movement and artwork interaction during the sequence; restore input/cursor state cleanly afterward.
- Pause correctly on blur/visibility loss and avoid accumulating animation time while paused.
- Respect reduced motion with a brief static/dissolve version or immediate safe handoff.
- Do not mutate collection/restoration progress or include the sequence in adventure checkpoints.
- If opening assets cannot load, show the existing museum entry instead of blocking play.

## Acceptance checks

- Character appearance matches the masterpiece and adventure reference.
- Jump visibly crosses the frame and lands on the carpet; no duplicate painted figure or clipping artifacts.
- Normal completion, Skip and reduced-motion mode reach identical gameplay state.
- New Game plays it; Continue bypasses it.
- Pause, resize and repeated new-game entry leave no duplicate listeners, sprites or audio.
- Campaign progression/save behavior stays unchanged.
- Rendering and asset loading remain within the game's measured budgets.
