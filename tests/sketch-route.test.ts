import { describe, expect, it } from 'vitest';
import { idleControls } from '../src/gameplay/controller';
import type { Controls } from '../src/gameplay/controller';
import { SketchRouteModel, createRouteSession } from '../src/gameplay/sketch-model';
import type { SketchRouteSession } from '../src/gameplay/sketch-model';
import { overlaps } from '../src/gameplay/collision';
import { sketchTuning } from '../src/levels/unfinished-sketch';
import { sketchRoute } from '../src/levels/unfinished-sketch-route';

// Layer 1 route proof: authored topology, the two-nail FIFO chain that defines
// the section, the bypass sweep that keeps the reuse unavoidable, the exit
// checkpoint, the scripted escalator and a real-input traversal. Everything
// runs through the ordinary controller; nothing teleports or sets a nail.

const dt = 1 / 60;
const keys = (o: Partial<Controls> = {}): Controls => ({ ...idleControls(), ...o });
const build = () => new SketchRouteModel(sketchRoute, sketchTuning);

const place = (m: SketchRouteModel, id: string): boolean => {
  m.enqueue({ type: 'place', targetId: id });
  m.update(dt, keys());
  return m.session.queue.some(p => p.targetId === id);
};
const recall = (m: SketchRouteModel): void => { m.enqueue({ type: 'recall' }); m.update(dt, keys()); };
const idle = (m: SketchRouteModel, frames: number): void => { for (let i = 0; i < frames; i++) m.update(dt, keys()); };

/** One released frame guarantees the takeoff press is a genuine fresh press. */
function prime(m: SketchRouteModel): void { m.update(dt, keys({ axis: 1, jumpHeld: false })); }

/** One ordinary held jump. */
function hop(m: SketchRouteModel, maxFrames = 220): boolean {
  prime(m);
  for (let f = 0; f < maxFrames; f++) {
    m.update(dt, keys({ axis: 1, jumpHeld: true, jumpPressed: f === 0 }));
    if (f > 4 && m.controller.body.grounded) return true;
  }
  return false;
}

/**
 * An ordinary held jump. `airAt` is the frame at which Space is released and
 * pressed again for the single airborne jump; `null` is a plain single jump.
 * Every number here is ordinary player input, never a state mutation.
 */
function jump(m: SketchRouteModel, airAt: number | null, maxFrames = 260): boolean {
  prime(m);
  let airborne = false;
  for (let f = 0; f < maxFrames; f++) {
    const held = airAt === null || f < airAt - 1 || f >= airAt;
    const pressed = f === 0 || (airAt !== null && f === airAt);
    m.update(dt, keys({ axis: 1, jumpHeld: held, jumpPressed: pressed }));
    if (!m.controller.body.grounded) airborne = true;
    else if (airborne && f > (airAt ?? 0) + 2) return true;
  }
  return false;
}

/** Walk to the right edge of any authored rectangle before taking off. */
function runToEdgeOf(m: SketchRouteModel, rect: { x: number; width: number }, limit = 600): void {
  for (let i = 0; i < limit; i++) {
    if (m.controller.body.x + m.controller.body.width >= rect.x + rect.width - 0.04) return;
    m.update(dt, keys({ axis: 1 }));
  }
}

function runTo(m: SketchRouteModel, x: number, limit = 600): void {
  for (let i = 0; i < limit && m.controller.body.x < x; i++) m.update(dt, keys({ axis: 1 }));
}

const board = (m: SketchRouteModel, id: string) => {
  const v = m.mechanismView().find(x => x.id === id)!;
  return { x: v.x, left: v.x - v.width / 2, right: v.x + v.width / 2, top: v.y + v.height / 2 };
};

/** Walk right until the body reaches the live right edge of a pinned board. */
function runToEdge(m: SketchRouteModel, id: string, limit = 600): void {
  for (let i = 0; i < limit; i++) {
    if (m.controller.body.x + m.controller.body.width >= board(m, id).right - 0.04) return;
    m.update(dt, keys({ axis: 1 }));
  }
}

/** Wait until a socket is genuinely in reach, then pin it. */
function pinWhenReachable(m: SketchRouteModel, id: string,
  want?: (x: number, y: number) => boolean, limit = 600): boolean {
  for (let i = 0; i < limit; i++) {
    const view = m.targetViews().find(v => v.id === id)!;
    if (view.reason === '' && (!want || want(view.x, view.y))) return place(m, id);
    m.update(dt, keys());
  }
  return place(m, id);
}

/** Climb from the spawn to the waiting terrace with ordinary input. */
function toTerrace(m: SketchRouteModel): void {
  runTo(m, 10.3);
  hop(m);
  runToEdgeOf(m, { x: 12.8, width: 4.8 });
}

/** The complete intended Layer 1 route, driven only by ordinary input. */
function traverse(): SketchRouteModel {
  const m = build();
  toTerrace(m);
  pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9);
  jump(m, null);
  runToEdge(m, 'l1-pendulum-a');
  pinWhenReachable(m, 'l1-freeze-b');
  jump(m, 24);
  runToEdge(m, 'l1-pendulum-b');
  recall(m);
  pinWhenReachable(m, 'l1-freeze-c');
  jump(m, 14);
  runToEdge(m, 'l1-pendulum-c');
  expect(m.controller.body.y, 'standing on C before second recall').toBeCloseTo(board(m, 'l1-pendulum-c').top, 1);
  recall(m);
  expect(pinWhenReachable(m, 'l1-freeze-d'), 'D is reachable from C').toBe(true);
  jump(m, 14);
  expect(m.controller.body.y, 'landed on D').toBeCloseTo(board(m, 'l1-pendulum-d').top, 1);
  runToEdge(m, 'l1-pendulum-d');
  jump(m, 20);
  return m;
}

const landOn = (m: SketchRouteModel, top: number, minX: number, maxX: number) => {
  const b = m.controller.body;
  return b.grounded && Math.abs(b.y - top) < 0.06 && b.x >= minX && b.x <= maxX;
};

/** Drop onto the fixed Layer 1 exit ground and let the checkpoint commit. */
function clearToExit(m: SketchRouteModel): void {
  m.controller.respawn(sketchRoute.legs[0].exitSpawn.x, sketchRoute.legs[0].exitSpawn.y + 2);
  m.update(dt, keys());
  m.controller.respawn(sketchRoute.legs[0].exitSpawn.x, sketchRoute.legs[0].exitSpawn.y);
  m.update(dt, keys());
}

/** Every takeoff/air-jump pairing available to an ordinary held double jump. */
const TIMINGS = [14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

/**
 * Sweep every legal standing surface for an ordinary jump that lands on the
 * given surface. Used both to prove a transfer is reachable and to prove a
 * shortcut does not exist.
 */
function sweepTo(from: { x: number; top: number }[], to: { minX: number; maxX: number; top: number }) {
  const found: { fromX: number; airAt: number }[] = [];
  for (const spot of from) {
    for (const airAt of TIMINGS) {
      // Give the hypothetical takeoff a real solid support and the candidate
      // destination its most generous swept surface. S2 outlines are otherwise
      // non-solid, which would make a bypass sweep pass without testing a full
      // grounded double jump or a possible destination landing at all.
      const m = new SketchRouteModel({ ...sketchRoute, solids: [...sketchRoute.solids,
        { id: 'probe-support', x: spot.x - 1, y: spot.top - 1, width: 3, height: 1 },
        { id: 'probe-destination', x: to.minX, y: to.top - 0.5, width: to.maxX - to.minX, height: 0.5 },
      ] }, sketchTuning);
      m.controller.respawn(spot.x, spot.top + 0.02);
      m.movement.reset();
      for (let i = 0; i < 4; i++) m.update(dt, keys());
      jump(m, airAt);
      if (landOn(m, to.top, to.minX, to.maxX)) found.push({ fromX: spot.x, airAt });
    }
  }
  return found;
}

/**
 * The widest sweep any pendulum can present: its resting half-width plus the
 * full arc travel. A transfer must remain possible across that whole range,
 * because the player chooses where to pin it.
 */
const sweepOf = (id: string) => {
  const mechanism = sketchRoute.mechanisms.find(x => x.id === id)!;
  const travel = mechanism.length * Math.sin(mechanism.arc);
  const halfWidth = mechanism.size.width / 2;
  const rest = mechanism.pivot.y - mechanism.length;
  const arcRise = mechanism.length * (1 - Math.cos(mechanism.arc));
  return {
    minX: mechanism.pivot.x - travel - halfWidth,
    maxX: mechanism.pivot.x + travel + halfWidth,
    top: rest + mechanism.size.height / 2,
    highTop: rest + arcRise + mechanism.size.height / 2,
  };
};

describe('Layer 1 authored data', () => {
  it('is a connected three-layer world with only Layer 1 and the Layer 2 landing playable', () => {
    expect(sketchRoute.layers.map(l => l.layer)).toEqual([1, 2, 3]);
    expect(sketchRoute.layers.filter(l => l.playable).map(l => l.id)).toEqual(['layer-1']);
    expect(sketchRoute.sectionOrder).toEqual(['layer-1', 'layer-2-landing']);
    // Rows stack upward without overlapping.
    for (let i = 1; i < sketchRoute.layers.length; i++) {
      expect(sketchRoute.layers[i].bounds.y).toBeGreaterThanOrEqual(sketchRoute.layers[i - 1].bounds.y);
    }
    // The Layer 2 landing is the only solid above Layer 1's exit ground.
    const upper = sketchRoute.solids.filter(s => s.y > sketchRoute.legs[0].exitBounds.y);
    expect(upper.map(s => s.id)).toEqual(['l2-landing', 'l2-landing-bound']);
    expect(sketchRoute.solids.find(s => s.id === 'l2-landing')!.width).toBeGreaterThanOrEqual(10);
  });

  it('reserves guides that can never be targeted, collided with or triggered', () => {
    const ids = sketchRoute.guides.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const guide of sketchRoute.guides) {
      const hit = sketchRoute.solids.some(s => overlaps(s, guide.rect));
      expect(hit, `${guide.id} has no collider`).toBe(false);
    }
    // No mechanism or target lives inside a reserved row.
    expect(sketchRoute.mechanisms.every(x => x.id.startsWith('l1-'))).toBe(true);
    expect(sketchRoute.targets.every(t => t.id.startsWith('l1-'))).toBe(true);
    // Layer 2 and Layer 3 keep their reserved regions covered by guides.
    expect(sketchRoute.guides.filter(g => g.layer === 2).length).toBeGreaterThan(4);
    expect(sketchRoute.guides.filter(g => g.layer === 3).length).toBeGreaterThan(6);
    // Every guide stays inside its own authored layer region.
    for (const guide of sketchRoute.guides) {
      const region = sketchRoute.layers.find(l => l.layer === guide.layer)!;
      expect(guide.rect.y).toBeGreaterThanOrEqual(region.bounds.y - 0.01);
      expect(guide.rect.y + guide.rect.height).toBeLessThanOrEqual(region.bounds.y + region.bounds.height + 0.01);
    }
  });

  it('authors four freezable pendulums, two nails and one escalator', () => {
    expect(sketchRoute.mechanisms.filter(x => x.kind === 'pendulum')).toHaveLength(4);
    expect(sketchRoute.mechanisms.every(x => x.freezable)).toBe(true);
    expect(sketchTuning.nailBudget).toBe(2);
    const e = sketchRoute.legs[0].escalator;
    expect(e.path).toHaveLength(6);
    expect(e.duration).toBeGreaterThan(2);
    expect(e.path[0]).toEqual({ x: 57.2, y: 11.9 });
    expect(e.arrival.y).toBeCloseTo(e.path.at(-1)!.y, 6);
    const landing = sketchRoute.solids.find(s => s.id === 'l2-landing')!;
    // The arrival stands on generous fixed Layer 2 ground.
    expect(e.arrival.y).toBeGreaterThanOrEqual(landing.y + landing.height - 0.001);
    expect(e.arrival.y).toBeLessThan(landing.y + landing.height + 0.6);
    expect(e.arrival.x).toBeGreaterThan(landing.x);
    expect(e.arrival.x).toBeLessThan(landing.x + landing.width);
  });
});

describe('the transfer chain is forced by placement reach', () => {
  it('exposes only pendulum A from the waiting terrace', () => {
    const m = build();
    toTerrace(m);
    const views = m.targetViews();
    expect(views.find(v => v.id === 'l1-freeze-a')!.reason).toBe('');
    expect(views.find(v => v.id === 'l1-freeze-b')!.reason).toBe('Out of reach.');
    expect(views.find(v => v.id === 'l1-freeze-c')!.reason).toBe('Out of reach.');
  });

  it('exposes only pendulum B from A and only C from B, at either end of A\'s sweep', () => {
    for (const side of ['left', 'right'] as const) {
      const m = build();
      toTerrace(m);
      const pinnedA = pinWhenReachable(m, 'l1-freeze-a', x => side === 'left' ? x < 21.6 : x > 22.8);
      expect(pinnedA).toBe(true);
      const landed = board(m, 'l1-pendulum-a');
      expect(side === 'left' ? landed.x < 22 : landed.x > 22.6).toBe(true);
      // The player rides the pinned board, so the first transfer must work
      // wherever A was pinned across its authored sweep.
      expect(jump(m, null)).toBe(true);
      expect(m.controller.body.grounded).toBe(true);
      expect(m.controller.body.y).toBeCloseTo(landed.top, 1);
      expect(m.controller.body.x).toBeGreaterThan(landed.left);
      expect(m.controller.body.x).toBeLessThan(landed.right);
      runToEdge(m, 'l1-pendulum-a');
      const onA = m.targetViews();
      expect(onA.find(v => v.id === 'l1-freeze-b')!.reason).toBe('');
      expect(onA.find(v => v.id === 'l1-freeze-c')!.reason).toBe('Out of reach.');
      expect(onA.find(v => v.id === 'l1-freeze-a')!.reason).toBe('A nail is already here.');
      expect(place(m, 'l1-freeze-b')).toBe(true);
      jump(m, 24);
      expect(m.controller.body.grounded).toBe(true);
      runToEdge(m, 'l1-pendulum-b');
      // The second nail is spent: C needs Q first, exactly as FIFO says.
      expect(m.targetViews().find(v => v.id === 'l1-freeze-c')!.reason).toBe('Both nails are placed. Press Q.');
      recall(m);
      expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-b']);
      expect(m.targetViews().find(v => v.id === 'l1-freeze-c')!.reason).toBe('');
      // A is far out of reach again, so the freed nail cannot be wasted on it.
      expect(m.targetViews().find(v => v.id === 'l1-freeze-a')!.reason).toBe('Out of reach.');
    }
  });
});

describe('the defining third transfer cannot be bypassed', () => {
  const bTop = sweepOf('l1-pendulum-b').highTop;
  const exit = sketchRoute.legs[0].exitBounds;

  it('no ordinary jump from pendulum B reaches the fixed exit ground', () => {
    const b = sweepOf('l1-pendulum-b');
    const from = Array.from({ length: Math.ceil((b.maxX - b.minX) / 0.2) + 1 },
      (_, i) => ({ x: Math.min(b.maxX, b.minX + i * 0.2), top: bTop }));
    expect(sweepTo(from, { minX: exit.x, maxX: exit.x + exit.width, top: exit.y })).toEqual([]);
    // Height alone proves it: the exit top is above the double-jump ceiling.
    expect(exit.y - bTop).toBeGreaterThan(4.479);
  });

  it('pendulum C is unreachable from the terrace and from pendulum A', () => {
    const c = sweepOf('l1-pendulum-c');
    expect(sweepTo([{ x: 15.0, top: 1.6 }, { x: 16.4, top: 1.6 }], c)).toEqual([]);
    const a = sweepOf('l1-pendulum-a');
    expect(sweepTo([{ x: a.minX + 0.3, top: a.top }, { x: a.maxX - 1.1, top: a.top }], c)).toEqual([]);
    expect(sweepTo([{ x: a.minX + 0.3, top: a.highTop }, { x: a.maxX - 1.1, top: a.highTop }], c)).toEqual([]);
  });

  it('pendulum B cannot be skipped straight from the terrace', () => {
    const b = sweepOf('l1-pendulum-b');
    expect(sweepTo([{ x: 14.0, top: 1.6 }, { x: 16.0, top: 1.6 }], b)).toEqual([]);
  });

  it('cannot skip C to D or D to the exit across the full generous source sweeps', () => {
    for (const [source, destination] of [
      ['l1-pendulum-b', 'l1-pendulum-d'], ['l1-pendulum-c', 'exit'],
    ]) {
      const from = sweepOf(source);
      const to = destination === 'exit'
        ? { minX: exit.x, maxX: exit.x + exit.width, top: exit.y } : sweepOf(destination);
      const starts = Array.from({ length: Math.ceil((from.maxX - from.minX) / 0.2) + 1 },
        (_, i) => ({ x: Math.min(from.maxX, from.minX + i * 0.2), top: from.highTop }));
      expect(sweepTo(starts, to), `${source} cannot skip to ${destination}`).toEqual([]);
    }
  });

  it('requires a second FIFO recall to ink D and removes B while C stays solid', () => {
    const m = build();
    toTerrace(m);
    pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9);
    jump(m, null);
    runToEdge(m, 'l1-pendulum-a');
    pinWhenReachable(m, 'l1-freeze-b');
    jump(m, 24);
    runToEdge(m, 'l1-pendulum-b');
    recall(m);
    pinWhenReachable(m, 'l1-freeze-c');
    jump(m, 14);
    runToEdge(m, 'l1-pendulum-c');
    const queue = m.session.queue.map(p => p.targetId);
    expect(place(m, 'l1-freeze-d')).toBe(false);
    expect(m.session.queue.map(p => p.targetId)).toEqual(queue);
    recall(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-c']);
    expect(m.solids.some(s => s.id === 'l1-pendulum-b')).toBe(false);
    expect(m.solids.some(s => s.id === 'l1-pendulum-c')).toBe(true);
    expect(pinWhenReachable(m, 'l1-freeze-d')).toBe(true);
    jump(m, 14);
    expect(m.controller.body.y).toBeCloseTo(board(m, 'l1-pendulum-d').top, 1);
  });

  it('every intended transfer lands from many ordinary jump timings, not one', () => {
    // For each transfer, count how many ordinary air-jump timings complete the
    // whole chain up to and including that transfer. A transfer that only
    // worked on one or two timings would be a frame-perfect gate.
    const chain = (upto: 'a' | 'b' | 'c' | 'd', airAt: number) => {
      const m = build();
      toTerrace(m);
      if (upto === 'a') {
        if (!pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9)) return false;
        runTo(m, 16.6);
        return jump(m, airAt) && m.controller.body.grounded;
      }
      if (!pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9)) return false;
      jump(m, null);
      runToEdge(m, 'l1-pendulum-a');
      if (!m.controller.body.grounded) return false;
      if (upto === 'b') {
        if (!pinWhenReachable(m, 'l1-freeze-b')) return false;
        runToEdge(m, 'l1-pendulum-a');
        return jump(m, airAt) && m.controller.body.grounded;
      }
      if (!pinWhenReachable(m, 'l1-freeze-b')) return false;
      runToEdge(m, 'l1-pendulum-a');
      if (!jump(m, 24) || !m.controller.body.grounded) return false;
      runToEdge(m, 'l1-pendulum-b');
      recall(m);
      if (!pinWhenReachable(m, 'l1-freeze-c')) return false;
      runToEdge(m, 'l1-pendulum-b');
      if (upto === 'c') return jump(m, airAt) && m.controller.body.grounded;
      if (!jump(m, 14) || !m.controller.body.grounded) return false;
      runToEdge(m, 'l1-pendulum-c');
      recall(m);
      if (!pinWhenReachable(m, 'l1-freeze-d')) return false;
      return jump(m, airAt) && m.controller.body.grounded;
    };
    for (const upto of ['a', 'b', 'c', 'd'] as const) {
      const working = TIMINGS.filter(airAt => chain(upto, airAt)).length;
      expect(working, `${upto}: air-jump timings that complete the transfer`).toBeGreaterThanOrEqual(5);
    }
  });

  it('the intended traversal reaches the Layer 1 exit checkpoint', () => {
    expect(traverse().stage).toBe('exit');
  });

  it('uninked pendulums supply no collision, and pin/recall changes support in the same tick', () => {
    const m = build();
    toTerrace(m);
    expect(m.solids.some(s => s.id.startsWith('l1-pendulum-'))).toBe(false);
    expect(pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9)).toBe(true);
    expect(m.solids.some(s => s.id === 'l1-pendulum-a')).toBe(true);
    jump(m, null);
    expect(m.controller.body.grounded).toBe(true);
    const top = m.controller.body.y;
    recall(m);
    expect(m.solids.some(s => s.id === 'l1-pendulum-a')).toBe(false);
    idle(m, 15);
    expect(m.controller.body.y).toBeLessThan(top - 0.5);
    idle(m, 120);
    expect(m.stage).toBe('traversal');
    expect(m.availableNails).toBe(2);
    expect(m.controller.body.y).toBeCloseTo(0, 5);
  });

  it('cannot use moving C to skip FIFO recall, across 108 ordinary jump schedules', () => {
    for (let wait = 0; wait < 360; wait += 20) {
      for (const airAt of [16, 20, 24, 28, 32, 36]) {
        const m = build();
        toTerrace(m);
        pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9);
        jump(m, null);
        runToEdge(m, 'l1-pendulum-a');
        pinWhenReachable(m, 'l1-freeze-b');
        jump(m, 24);
        runToEdge(m, 'l1-pendulum-b');
        idle(m, wait);
        expect(place(m, 'l1-freeze-c')).toBe(false);
        expect(m.solids.some(s => s.id === 'l1-pendulum-c')).toBe(false);
        jump(m, airAt);
        expect(m.stage, `wait ${wait}, air jump ${airAt}`).toBe('traversal');
        expect(m.controller.body.x).toBeLessThan(sketchRoute.legs[0].exitBounds.x);
        idle(m, 180);
        expect(m.availableNails).toBe(2);
        expect(m.controller.body.y).toBeCloseTo(0, 5);
      }
    }
  });
});

describe('the intended route is traversable with ordinary input', () => {
  it('carries one full traversal from spawn to the Layer 2 endpoint', () => {
    const m = traverse();
    expect(m.stage).toBe('exit');
    expect(m.availableNails).toBe(2);
    expect(m.session.queue).toEqual([]);
    expect(m.completed).toBe(false);

    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    expect(m.boardingReady()).toBe(true);
    m.update(dt, keys({ interactPressed: true }));
    expect(m.stage).toBe('transit');
    for (let i = 0; i < 400 && m.stage === 'transit'; i++) m.update(dt, keys());
    expect(m.stage).toBe('arrival');
    expect(m.completed).toBe(true);
    expect(Math.abs(m.controller.body.x - sketchRoute.legs[0].escalator.arrival.x)).toBeLessThan(0.01);
    expect(m.controller.body.vx).toBe(0);
    expect(m.controller.body.vy).toBe(0);
    expect(m.controller.airJumpAvailable).toBe(true);
  });

  it('places A then B, recalls A with Q and only then places C', () => {
    const m = build();
    toTerrace(m);
    expect(pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9)).toBe(true);
    jump(m, null);
    runToEdge(m, 'l1-pendulum-a');
    expect(pinWhenReachable(m, 'l1-freeze-b')).toBe(true);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-a', 'l1-freeze-b']);
    expect(m.targetViews().find(v => v.id === 'l1-freeze-c')!.reason).toBe('Both nails are placed. Press Q.');
    jump(m, 24);
    runToEdge(m, 'l1-pendulum-b');
    recall(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-b']);
    expect(m.oldestPlacement?.targetId).toBe('l1-freeze-b');
    expect(pinWhenReachable(m, 'l1-freeze-c')).toBe(true);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-b', 'l1-freeze-c']);
    // The first pendulum resumes its own captured phase when A is recalled.
    const resumed = m.mechanismView().find(v => v.id === 'l1-pendulum-a')!;
    expect(resumed.pinned).toBe(false);
    expect(Math.abs(resumed.vx) + Math.abs(resumed.vy)).toBeGreaterThan(0);
    // B stays pinned, because recall only ever takes the oldest nail.
    expect(m.isPinned('l1-pendulum-b')).toBe(true);
  });
});

describe('exit checkpoint, escalator transit and retry behaviour', () => {
  it('commits the exit checkpoint only after landing, never from airborne overlap', () => {
    const m = build();
    m.controller.respawn(sketchRoute.legs[0].exitSpawn.x, sketchRoute.legs[0].exitSpawn.y + 0.4);
    m.update(dt, keys());
    expect(m.stage).toBe('traversal');
    idle(m, 60);
    expect(m.stage).toBe('exit');
    expect(m.controller.body.y).toBeCloseTo(sketchRoute.legs[0].exitSpawn.y, 5);
  });

  it('landing on fixed exit ground commits the Layer 1-clear checkpoint once', () => {
    const m = build();
    place(m, 'l1-freeze-a');
    clearToExit(m);
    expect(m.stage).toBe('exit');
    expect(m.placedCount).toBe(0);
    expect(m.availableNails).toBe(2);
    expect(m.isPinned('l1-pendulum-a')).toBe(false);
    expect(m.move.state).toBe('normal');
    expect(m.completed).toBe(false);
    // It commits once: standing there again changes nothing.
    idle(m, 30);
    expect(m.stage).toBe('exit');
  });

  it('a fresh E on the boarding pad starts the ride and cannot also act as a grip', () => {
    const m = build();
    clearToExit(m);
    // E at the checkpoint itself is away from the pad and does nothing.
    expect(m.boardingReady()).toBe(false);
    m.update(dt, keys({ interactPressed: true }));
    expect(m.stage).toBe('exit');
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    expect(m.boardingReady()).toBe(true);
    // The fresh E starts the ride and is consumed: movement never runs on this
    // tick, so the same press cannot also grip a nail or start a jump.
    m.update(dt, keys({ interactPressed: true, axis: 1, jumpPressed: true }));
    expect(m.stage).toBe('transit');
    m.enqueue({ type: 'recall' });
    m.enqueue({ type: 'place', targetId: 'l1-freeze-a' });
    const before = m.controller.body.x;
    m.update(dt, keys({ axis: 1, jumpPressed: true }));
    expect(m.controller.body.x).toBeLessThan(before + 2);
    expect(m.placedCount).toBe(0);
  });

  it('R before boarding keeps the cleared exit checkpoint and allows boarding', () => {
    const m = traverse();
    expect(m.stage).toBe('exit');
    m.enqueue({ type: 'recall' });
    m.update(dt, keys({ restartPressed: true, axis: 1, jumpPressed: true }));
    expect(m.stage).toBe('exit');
    expect(m.controller.body.x).toBeCloseTo(sketchRoute.legs[0].exitSpawn.x, 5);
    expect(m.controller.body.y).toBeCloseTo(sketchRoute.legs[0].exitSpawn.y, 5);
    expect(m.availableNails).toBe(2);
    idle(m, 60);
    expect(m.stage).toBe('exit');
    expect(m.controller.body.grounded).toBe(true);
    expect(m.controller.body.y).toBeCloseTo(sketchRoute.legs[0].exitSpawn.y, 5);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    expect(m.boardingReady()).toBe(true);
    m.update(dt, keys({ interactPressed: true }));
    expect(m.stage).toBe('transit');
  });

  it('R during the ride returns to the safe exit checkpoint', () => {
    const m = build();
    clearToExit(m);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    m.update(dt, keys({ interactPressed: true }));
    expect(m.stage).toBe('transit');
    for (let i = 0; i < 40; i++) m.update(dt, keys());
    expect(m.transitProgress).toBeGreaterThan(0);
    m.update(dt, keys({ restartPressed: true }));
    expect(m.stage).toBe('exit');
    expect(m.controller.body.x).toBeCloseTo(sketchRoute.legs[0].exitSpawn.x, 5);
    expect(m.controller.body.y).toBeCloseTo(sketchRoute.legs[0].exitSpawn.y, 5);
    expect(m.transitProgress).toBe(0);
  });

  it('R after arrival stays on the Layer 2 landing and never undoes the route', () => {
    const m = build();
    clearToExit(m);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 400 && m.stage === 'transit'; i++) m.update(dt, keys());
    expect(m.completed).toBe(true);
    m.update(dt, keys({ restartPressed: true }));
    expect(m.stage).toBe('arrival');
    expect(m.completed).toBe(true);
    expect(Math.abs(m.controller.body.x - sketchRoute.legs[0].escalator.arrival.x)).toBeLessThan(0.02);
  });

  it('restart adventure returns to Layer 1 and clears route completion', () => {
    const m = build();
    clearToExit(m);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 400 && m.stage === 'transit'; i++) m.update(dt, keys());
    m.restartAdventure();
    expect(m.stage).toBe('traversal');
    expect(m.completed).toBe(false);
    expect(m.controller.body.x).toBeCloseTo(1.5, 5);
    expect(m.availableNails).toBe(2);
  });

  it('a fall in Layer 1 retries the section with two nails and phase zero', () => {
    const m = build();
    toTerrace(m);
    idle(m, 37);
    expect(place(m, 'l1-freeze-a')).toBe(true);
    expect(m.isPinned('l1-pendulum-a')).toBe(true);
    m.controller.respawn(20, -3.9);
    for (let i = 0; i < 30 && m.recoveryRemaining === 0; i++) m.update(dt, keys());
    expect(m.recoveryRemaining).toBeGreaterThan(0);
    for (let i = 0; i < 40 && m.recoveryRemaining > 0; i++) m.update(dt, keys());
    expect(m.stage).toBe('traversal');
    expect(m.placedCount).toBe(0);
    expect(m.availableNails).toBe(2);
    expect(m.routeTime).toBe(0);
    expect(m.controller.body.x).toBeCloseTo(1.5, 5);
    // Deterministic: the same pendulum pose comes back on every retry.
    const rest = sketchRoute.mechanisms.find(x => x.id === 'l1-pendulum-a')!;
    expect(m.mechanismView().find(v => v.id === 'l1-pendulum-a')!.y)
      .toBeCloseTo(rest.pivot.y - rest.length, 6);
  });

  it('a fall from the Layer 2 landing recovers to that layer, not to Layer 1', () => {
    const m = build();
    clearToExit(m);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 400 && m.stage === 'transit'; i++) m.update(dt, keys());
    m.controller.respawn(62, 13.4);
    for (let i = 0; i < 40 && m.recoveryRemaining === 0; i++) m.update(dt, keys());
    for (let i = 0; i < 40 && m.recoveryRemaining > 0; i++) m.update(dt, keys());
    expect(m.stage).toBe('arrival');
    expect(m.controller.body.y).toBeCloseTo(sketchRoute.legs[0].escalator.arrival.y, 5);
  });

  it('a fall from the exit checkpoint returns to that checkpoint, not to Layer 1', () => {
    const m = build();
    clearToExit(m);
    // Drop past the exit ground's right edge and past the checkpoint fall line.
    m.controller.respawn(64.5, 9);
    for (let i = 0; i < 60 && m.recoveryRemaining === 0; i++) m.update(dt, keys());
    expect(m.recoveryRemaining).toBeGreaterThan(0);
    for (let i = 0; i < 40 && m.recoveryRemaining > 0; i++) m.update(dt, keys());
    expect(m.stage).toBe('exit');
    expect(m.controller.body.x).toBeCloseTo(sketchRoute.legs[0].exitSpawn.x, 5);
    expect(m.availableNails).toBe(2);
  });

  it('the ride only advances through fixed steps, so a paused loop freezes it', () => {
    const m = build();
    clearToExit(m);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 30; i++) m.update(dt, keys());
    const frozen = { x: m.controller.body.x, y: m.controller.body.y };
    expect(m.controller.body.x).toBe(frozen.x);
    expect(m.transitProgress).toBeCloseTo(30 * dt / sketchRoute.legs[0].escalator.duration, 6);
  });
});

describe('same-session route memory', () => {
  it('preserves S2 placement on its own targets when exploring after the exit checkpoint', () => {
    const m = build(); clearToExit(m);
    expect(m.stage).toBe('exit');
    expect(m.targetViews().find(t => t.id === 'l1-freeze-d')!.reason).toBe('');
    expect(place(m, 'l1-freeze-d')).toBe(true);
    m.retry(); expect(m.session.queue).toEqual([]); expect(m.stage).toBe('exit');
  });
  it('round-trips the queue, frozen phases and the layer start', () => {
    const m = build();
    toTerrace(m);
    pinWhenReachable(m, 'l1-freeze-a', x => x > 22.9);
    jump(m, null);
    runToEdge(m, 'l1-pendulum-a');
    pinWhenReachable(m, 'l1-freeze-b');
    const saved = JSON.parse(JSON.stringify(m.session)) as SketchRouteSession;
    const restored = build();
    restored.restoreSession(saved);
    expect(restored.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-a', 'l1-freeze-b']);
    expect(restored.isPinned('l1-pendulum-a')).toBe(true);
    expect(restored.isPinned('l1-pendulum-b')).toBe(true);
    expect(restored.routeTime).toBe(saved.elapsed);
    // Re-entry always starts from the safe Layer 1 checkpoint pose.
    expect(restored.controller.body.x).toBeCloseTo(sketchRoute.sections['layer-1'].spawn.x, 5);
  });

  it('never restores in mid-transit; a mid-ride snapshot re-enters at the checkpoint', () => {
    const m = build();
    clearToExit(m);
    runTo(m, sketchRoute.legs[0].escalator.boarding.x + 1.2);
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 40; i++) m.update(dt, keys());
    const midRide = JSON.parse(JSON.stringify(m.session)) as SketchRouteSession;
    expect(midRide.stage).toBe('transit');
    const restored = build();
    restored.restoreSession(midRide);
    expect(restored.stage).toBe('exit');
    restored.update(dt, keys());
    expect(restored.controller.body.x).toBeCloseTo(sketchRoute.legs[0].exitSpawn.x, 5);
    expect(restored.controller.body.grounded).toBe(true);
  });

  it('a fresh route session starts at Layer 1 with two nails', () => {
    const session = createRouteSession();
    expect(session).toEqual({ entryLegId: 'layer-1', legId: 'layer-1', stage: 'traversal', elapsed: 0, sequence: 0, queue: [], frozen: {} });
  });
});
