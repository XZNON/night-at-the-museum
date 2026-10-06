import { describe, expect, it } from 'vitest';
import { idleControls } from '../src/gameplay/controller';
import type { Controls } from '../src/gameplay/controller';
import { createSketchSession, SketchModel } from '../src/gameplay/sketch-model';
import type { SketchSession } from '../src/gameplay/sketch-model';
import { isSketchBayId, sketchBays, sketchBayIds, sketchTuning } from '../src/levels/unfinished-sketch';
import type { SketchBayId } from '../src/levels/unfinished-sketch';

// Ledger, freeze/resume, axes, retry snapshots and recovery. No Three.js, DOM
// or storage is involved; every action goes through the real command queue.

const dt = 1 / 60;
const keys = (o: Partial<Controls> = {}): Controls => ({ ...idleControls(), ...o });
const build = (bay: SketchBayId) => new SketchModel(sketchBays[bay], sketchTuning);
const run = (m: SketchModel, frames: number, input: Controls = keys()) => {
  for (let i = 0; i < frames; i++) m.update(dt, input);
};
const place = (m: SketchModel, targetId: string) => { m.enqueue({ type: 'place', targetId }); m.update(dt, keys()); };
const recall = (m: SketchModel) => { m.enqueue({ type: 'recall' }); m.update(dt, keys()); };
/** Walk right with ordinary input until the body reaches an authored x. */
const approach = (m: SketchModel, x: number) => {
  for (let i = 0; i < 900 && m.controller.body.x < x; i++) m.update(dt, keys({ axis: 1 }));
};
/** Stand on an authored surface so a socket is inside placement range. */
const stand = (m: SketchModel, x: number, y: number) => m.controller.respawn(x, y);

describe('pin ledger setup', () => {
  it('sockets only become reachable by walking to them', () => {
    const m = build('pins');
    const atSpawn = m.targetViews().filter(v => v.reason === '').length;
    expect(atSpawn).toBeLessThan(m.targetViews().length / 2);
    approach(m, 14);
    expect(m.targetViews().filter(v => v.reason === '').length).toBeGreaterThan(atSpawn);
  });
});

describe('bay data', () => {
  it('every bay has a spawn, goal, bounds and stable IDs, and rejects unknown bay values', () => {
    for (const id of sketchBayIds) {
      const bay = sketchBays[id];
      expect(bay.id).toBe(id);
      expect(bay.spawn).toBeTruthy();
      expect(bay.goalBounds.width).toBeGreaterThan(0);
      expect(bay.bounds.width).toBeGreaterThan(0);
      const targetIds = bay.targets.map(t => t.id);
      const mechanismIds = bay.mechanisms.map(m => m.id);
      expect(new Set(targetIds).size).toBe(targetIds.length);
      expect(new Set(mechanismIds).size).toBe(mechanismIds.length);
      expect([...targetIds, ...mechanismIds].every(entry => /^[a-z0-9-]+$/.test(entry))).toBe(true);
      // Every target points at a mechanism that exists in the same bay.
      for (const t of bay.targets) expect(mechanismIds).toContain(t.mechanismId);
      // Spawn and goal must be reachable inside the authored bounds.
      expect(bay.spawn.x).toBeGreaterThan(bay.bounds.x);
      expect(bay.goalBounds.x + bay.goalBounds.width).toBeLessThan(bay.bounds.x + bay.bounds.width);
    }
    expect(isSketchBayId('pins')).toBe(true);
    expect(isSketchBayId('nope')).toBe(false);
    expect(isSketchBayId(null)).toBe(false);
  });

  it('no bay ever offers an axe as a valid placement target', () => {
    for (const id of sketchBayIds) {
      for (const t of sketchBays[id].targets) {
        const mechanism = sketchBays[id].mechanisms.find(m => m.id === t.mechanismId)!;
        expect(mechanism.kind).not.toBe('axe');
        expect(mechanism.hazard).toBe(false);
      }
    }
  });
});

describe('two-nail ledger and strict FIFO recall', () => {
  it('holds exactly two nails across placements, invalid actions and full-budget clicks', () => {
    const m = build('pins');
    expect(m.availableNails).toBe(2);
    approach(m, 14);
    place(m, 'pins-freeze-a');
    place(m, 'pins-freeze-b');
    expect(m.placedCount).toBe(2);
    expect(m.availableNails).toBe(0);
    // A third click at a different, in-range socket cannot evict or reorder.
    const before = JSON.stringify(m.session.queue);
    place(m, 'pins-freeze-c');
    expect(m.placedCount).toBe(2);
    expect(JSON.stringify(m.session.queue)).toBe(before);
    expect(m.cue).toContain('Both nails');
    // A repeat click on an occupied socket changes nothing.
    place(m, 'pins-freeze-a');
    expect(JSON.stringify(m.session.queue)).toBe(before);
    // Available plus placed always equals the budget.
    expect(m.availableNails + m.placedCount).toBe(sketchTuning.nailBudget);
  });

  it('recalls only the oldest nail and never a newer one', () => {
    const m = build('pins');
    approach(m, 14);
    place(m, 'pins-freeze-a');
    place(m, 'pins-freeze-b');
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-a', 'pins-freeze-b']);
    recall(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-b']);
    expect(m.oldestPlacement?.targetId).toBe('pins-freeze-b');
    place(m, 'pins-freeze-c');
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-b', 'pins-freeze-c']);
    recall(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-c']);
    // A single empty-queue recall is a cue, not a state change.
    recall(m); recall(m);
    expect(m.placedCount).toBe(0);
    expect(m.cue).toContain('No nails');
    expect(m.availableNails).toBe(2);
  });

  it('the specified A/B -> recall A -> place C -> recall B sequence holds exactly', () => {
    const m = build('pins');
    approach(m, 14);
    place(m, 'pins-freeze-a'); place(m, 'pins-freeze-b');
    recall(m);
    place(m, 'pins-freeze-c');
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-b', 'pins-freeze-c']);
    recall(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-c']);
    expect(m.availableNails).toBe(1);
    // No nail is duplicated: two distinct IDs have existed, none remain twice.
    expect(new Set(m.session.queue.map(p => p.nailId)).size).toBe(m.session.queue.length);
  });

  it('recall is consumed before placement in the same tick, permitting legal reuse', () => {
    const m = build('pins');
    approach(m, 14);
    place(m, 'pins-freeze-a'); place(m, 'pins-freeze-b');
    m.controller.respawn(26, 1.2);
    m.enqueue({ type: 'place', targetId: 'pins-freeze-c' });
    m.enqueue({ type: 'recall' });
    m.update(dt, keys());
    // Drain order is recall-then-place regardless of enqueue order.
    expect(m.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-b', 'pins-freeze-c']);
    expect(m.placedCount).toBe(2);
  });

  it('refuses unknown targets and out-of-reach placements without mutating state', () => {
    const m = build('pins');
    place(m, 'not-a-target');
    expect(m.placedCount).toBe(0);
    // Move far away, then try the same socket that was in reach at spawn.
    m.controller.respawn(44, 0.6);
    place(m, 'pins-freeze-a');
    expect(m.placedCount).toBe(0);
    expect(m.cue).toContain('reach');
  });
});

describe('freeze, resume and permanently active mechanisms', () => {
  it('a pinned board holds its exact transform and phase, and resumes on recall', () => {
    const m = build('pins');
    approach(m, 14);
    run(m, 37);
    place(m, 'pins-freeze-a');
    const frozen = m.mechanismView().find(v => v.id === 'pins-board-a')!;
    expect(m.isPinned('pins-board-a')).toBe(true);
    run(m, 240);
    const held = m.mechanismView().find(v => v.id === 'pins-board-a')!;
    expect(held.x).toBeCloseTo(frozen.x, 6);
    expect(held.y).toBeCloseTo(frozen.y, 6);
    expect(held.vx).toBeCloseTo(0, 6);
    expect(held.vy).toBeCloseTo(0, 6);
    // An unpinned board in the same bay keeps moving throughout.
    const free = m.mechanismView().find(v => v.id === 'pins-board-c')!;
    expect(Math.abs(free.vy) + Math.abs(free.vx)).toBeGreaterThan(0.05);
    recall(m);
    expect(m.isPinned('pins-board-a')).toBe(false);
    const moving = m.mechanismView().find(v => v.id === 'pins-board-a')!;
    expect(Math.abs(moving.vy) + Math.abs(moving.vx)).toBeGreaterThan(0.05);
  });

  it('a moving swing socket is never frozen and carries its nail along the path', () => {
    const m = build('moving-swing');
    stand(m, 10.5, 4.2);
    place(m, 'moving-nail');
    const first = m.targetPosition('moving-nail')!;
    run(m, 30);
    const later = m.targetPosition('moving-nail')!;
    expect(m.isPinned('moving-mount-a')).toBe(false);
    expect(Math.hypot(later.x - first.x, later.y - first.y)).toBeGreaterThan(0.2);
    const view = m.mechanismView().find(v => v.id === 'moving-mount-a')!;
    expect(Math.abs(view.vx)).toBeGreaterThan(0.05);
    // The nail follows the mount and stays inside its authored travel.
    expect(later.x).toBeGreaterThanOrEqual(16.4);
    expect(later.x).toBeLessThanOrEqual(21.6);
  });

  it('an axe keeps sweeping while the rest of the bay is frozen and pinned', () => {
    const m = build('pins');
    approach(m, 14);
    place(m, 'pins-freeze-a');
    place(m, 'pins-freeze-b');
    run(m, 50);
    const blade = m.mechanismView().find(v => v.id === 'pins-axe')!;
    expect(Math.abs(blade.angle)).toBeGreaterThan(0.05);
    expect(m.hazards.some(h => h.width > 1 && h.height > 1)).toBe(true);
    // Placing a nail never marks the axe pinned.
    expect(m.isPinned('pins-axe')).toBe(false);
  });
});

describe('footholds, recovery and retry snapshots', () => {
  it('a pinned foothold becomes a real solid and disappears on recall', () => {
    const m = build('foothold');
    stand(m, 11, 2.2);
    const before = m.solids.filter(s => s.id.endsWith('-head')).length;
    expect(before).toBe(0);
    place(m, 'foothold-a');
    const head = m.solids.find(s => s.id === 'foothold-a-head')!;
    expect(head).toBeTruthy();
    expect(head.width).toBeGreaterThanOrEqual(1.5);
    const position = m.targetPosition('foothold-a')!;
    expect(position.x - head.width / 2).toBeCloseTo(head.x, 6);
    recall(m);
    expect(m.solids.some(s => s.id === 'foothold-a-head')).toBe(false);
  });

  it('glue contact recovers to the spawn and clears temporary state exactly once', () => {
    const m = build('foothold');
    stand(m, 11, 2.2);
    place(m, 'foothold-a');
    m.controller.respawn(22, 1.2);
    run(m, 20, keys({ axis: 1 }));
    expect(m.recoveryRemaining).toBeGreaterThan(0);
    expect(m.cue).toContain('Glue');
    // The retry snapshot restores spawn, both nails, an empty queue and no pins.
    run(m, 40);
    expect(m.recoveryRemaining).toBe(0);
    expect(m.placedCount).toBe(0);
    expect(m.availableNails).toBe(2);
    expect(m.controller.body.x).toBe(sketchBays.foothold.spawn.x);
    expect(m.controller.body.y).toBe(sketchBays.foothold.spawn.y);
    expect(m.bay.mechanisms.some(mech => m.isPinned(mech.id))).toBe(false);
  });

  it('R restarts the bay and clears any pending commands', () => {
    const m = build('pins');
    approach(m, 14);
    place(m, 'pins-freeze-a'); place(m, 'pins-freeze-b');
    m.controller.respawn(26, 1.2);
    m.enqueue({ type: 'place', targetId: 'pins-freeze-c' });
    m.update(dt, { ...idleControls(), restartPressed: true });
    expect(m.placedCount).toBe(0);
    expect(m.controller.body.x).toBe(sketchBays.pins.spawn.x);
    expect(m.controller.body.vx).toBe(0);
    expect(m.cue).toContain('reset');
  });

  it('a same-session snapshot round-trips the queue and every frozen phase', () => {
    const m = build('pins');
    approach(m, 14);
    run(m, 23);
    place(m, 'pins-freeze-a'); place(m, 'pins-freeze-b');
    const saved = JSON.parse(JSON.stringify(m.session)) as SketchSession;
    expect(saved.frozen['pins-board-a']).toBeGreaterThan(0);
    const restored = build('pins');
    restored.restoreSession(saved);
    expect(restored.session.queue.map(p => p.targetId)).toEqual(['pins-freeze-a', 'pins-freeze-b']);
    expect(restored.isPinned('pins-board-a')).toBe(true);
    expect(restored.session.frozen['pins-board-a']).toBe(saved.frozen['pins-board-a']);
    // A fresh session starts from a clean, documented shape.
    expect(createSketchSession('walls').queue).toEqual([]);
  });

  it('marking the goal pad completes the bay without awarding anything', () => {
    const m = build('pins');
    const goal = sketchBays.pins.goalBounds;
    m.controller.respawn(goal.x + 1, goal.y + 0.1);
    m.update(dt, keys());
    expect(m.completed).toBe(true);
    expect(m.cue).toContain('goal reached');
  });
});

describe('target reach and validity reporting', () => {
  it('reports a reason for every refused socket and none for a usable one', () => {
    const m = build('pins');
    approach(m, 14);
    const near = m.targetViews().filter(v => v.distance <= sketchTuning.placementReach);
    expect(near.length).toBeGreaterThan(0);
    expect(near.every(v => v.reason === '')).toBe(true);
    const far = m.targetViews().filter(v => v.distance > sketchTuning.placementReach);
    expect(far.length).toBeGreaterThan(0);
    expect(far.every(v => v.reason === 'Out of reach.')).toBe(true);
    expect(m.nearestValidTarget()).not.toBeNull();
    place(m, near[0].id);
    expect(m.targetViews().find(v => v.id === near[0].id)!.reason).toBe('A nail is already here.');
  });

  it('marks exactly one socket as the oldest for in-world and HUD display', () => {
    const m = build('pins');
    approach(m, 14);
    place(m, 'pins-freeze-a'); place(m, 'pins-freeze-b');
    const oldest = m.targetViews().filter(v => v.oldest);
    expect(oldest.length).toBe(1);
    expect(oldest[0].id).toBe('pins-freeze-a');
    expect(m.hud().oldest).toContain('Freeze socket A');
    recall(m);
    expect(m.targetViews().filter(v => v.oldest)[0].id).toBe('pins-freeze-b');
    expect(m.hud().oldest).toContain('Freeze socket B');
  });
});
