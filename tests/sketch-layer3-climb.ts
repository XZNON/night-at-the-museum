import { SketchRouteModel, type SketchCommand } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchLayerThreeWalls } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning, type SketchRoute } from '../src/levels/unfinished-sketch';

// Input-only S4A climber shared by the unit tests (not a test file itself).
// Every frame is an input plus queued commands, so any prefix replays exactly
// into a fresh model; nothing edits the body or movement state. It pins A/B,
// runs right (over the third-nail pickup unless told to hop it), catches A,
// then waits `dwell` frames on every wall before kicking. Any free nail goes
// to the next unpinned board in reach; Q frees a nail only when the oldest is
// two boards behind the highest wall reached.
export interface Frame { input: Partial<Controls>; cmds: SketchCommand[] }
export const L = ['a', 'b', 'c', 'd', 'e', 'f'];
export const step = (m: SketchRouteModel, f: Frame) => {
  for (const c of f.cmds) m.enqueue(c);
  m.update(1 / 60, { ...idleControls(), ...f.input });
};

export interface ClimbOptions {
  dwell?: number; hold?: 'into' | 'none' | 'away'; omit?: string; field?: SketchRoute;
  pickup?: boolean; entry?: 'single' | 'double';
  /** Climb on from this model (S4D: just after the second lift's arrival). */
  model?: SketchRouteModel;
}
export function climb(o: ClimbOptions = {}) {
  const { dwell = 0, hold = 'none', omit = '', field = sketchLayerThreeWalls, pickup = true, entry = 'single' } = o;
  const frames: Frame[] = []; const log: string[] = [];
  const m = o.model ?? new SketchRouteModel(field, sketchTuning);
  const startLeg = m.legId;
  const go = (f: Frame) => { frames.push(f); step(m, f); if (m.pickupCollected && !log.includes('pickup')) log.push('pickup'); };
  const pin = (l: string): SketchCommand[] => omit === l ? [] : [{ type: 'place', targetId: `l3-wall-${l}-pin` }];
  go({ input: {}, cmds: [] });
  go({ input: {}, cmds: [...pin('a'), ...pin('b')] });
  // Skip the pickup by hopping over it when asked.
  for (let f = 0; f < 200 && m.controller.body.x < 9; f++) {
    const hop = !pickup && m.controller.body.x > 5 && m.controller.body.grounded;
    go({ input: { axis: 1, jumpPressed: hop, jumpHeld: !pickup, jumpReleased: hop }, cmds: [] });
  }
  for (let f = 0; f < 90 && m.move.state !== 'wall-slide'; f++) {
    const p = f === 0 || (entry === 'double' && f === 14);
    go({ input: { axis: 1, jumpHeld: true, jumpPressed: p, jumpReleased: p }, cmds: [] });
  }
  let last = '', d = 0, air = 0, top = -1, reached = -1;
  for (let f = 0; f < 4000; f++) {
    const b = m.controller.body; let axis = air, press = false; const cmds: SketchCommand[] = [];
    if (b.grounded && b.y < 25) { log.push('ground'); break; }
    // Pin ahead: any free nail goes to the next unpinned board in reach.
    const idx = m.move.state === 'wall-slide' ? L.indexOf(m.move.wall.slice(-1)) : -1;
    reached = Math.max(reached, idx);
    if (m.availableNails > 0) {
      const next = L.find((l, i) => i > Math.max(1, reached) && !m.isPinned(`l3-wall-${l}`) && omit !== l);
      const view = next && m.targetViews().find(v => v.id === `l3-wall-${next}-pin`);
      if (view && !view.reason) { cmds.push(...pin(next!)); log.push(`pin${next}`); }
    }
    if (m.move.state === 'wall-slide') {
      top = -1;
      if (last !== m.move.wall) {
        last = m.move.wall; d = 0; log.push(`${last.slice(-1)}${b.y.toFixed(1)}`);
        // Q only frees a board two or more behind the current wall.
        const oldest = m.oldestPlacement && L.indexOf(m.oldestPlacement.targetId.split('-')[2]);
        if (oldest !== null && oldest !== undefined && oldest < reached - 1 && m.availableNails === 0) { cmds.push({ type: 'recall' }); log.push('Q'); }
      }
      const kick = m.movement.wallDirection; axis = hold === 'into' ? -kick : hold === 'away' ? kick : 0;
      press = d++ >= dwell;
      if (press) air = axis;
    } else if (b.grounded) {
      last = ''; if (top < 0) { top = 0; log.push(`top${b.y.toFixed(1)}`); }
      axis = air = b.x < 9.6 || b.y > 49 ? 1 : -1; press = top === 4; top++;
    } else if (top >= 0) { top++; press = top === 18; }
    const held = press || (top >= 4 && top < 16) || (top >= 18 && top < 30);
    go({ input: { axis, jumpHeld: held, jumpPressed: press, jumpReleased: press }, cmds });
    if (m.recoveryRemaining) { log.push('fall'); break; } if (m.completed) { log.push('done'); break; }
    // Joined Layer 3 (S4C): the landing hands over to the next section instead.
    if (m.legId !== startLeg) { log.push('handoff'); break; }
  }
  return { m, log, frames };
}
