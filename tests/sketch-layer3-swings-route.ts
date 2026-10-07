import { SketchRouteModel, type SketchCommand } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchLayerThreeSwings } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning, type SketchRoute } from '../src/levels/unfinished-sketch';

// Input-only S4B crosser shared by the unit tests (not a test file itself).
// Every frame is an input plus queued commands; a found route replays exactly
// into a fresh model, and nothing edits the body or movement state. The
// search snapshots models only to avoid replaying long prefixes; the final
// check always replays the recorded frames from a fresh model.
export interface Frame { input: Partial<Controls>; cmds: SketchCommand[] }
export const tick = (m: SketchRouteModel, f: Frame) => {
  for (const c of f.cmds) m.enqueue(c);
  m.update(1 / 60, { ...idleControls(), ...f.input });
};

/** Memoized deep copy that shares the immutable authored data. */
function snapshot<T>(value: T, shared: Set<unknown>, memo = new Map<unknown, unknown>()): T {
  if (value === null || typeof value !== 'object' || shared.has(value)) return value;
  if (memo.has(value)) return memo.get(value) as T;
  if (value instanceof Map) {
    const copy = new Map(); memo.set(value, copy);
    for (const [k, v] of value) copy.set(k, snapshot(v, shared, memo));
    return copy as T;
  }
  if (value instanceof AbortController) return value;
  const copy = Array.isArray(value) ? [] as unknown[] : Object.create(Object.getPrototypeOf(value));
  memo.set(value, copy);
  for (const key of Object.keys(value)) (copy as Record<string, unknown>)[key] = snapshot((value as Record<string, unknown>)[key], shared, memo);
  return copy as T;
}

export class Run {
  readonly frames: Frame[] = [];
  constructor(readonly m: SketchRouteModel) {}
  static start(field: SketchRoute = sketchLayerThreeSwings) { return new Run(new SketchRouteModel(field, sketchTuning)); }
  fork(): Run {
    const r = new Run(snapshot(this.m, new Set<unknown>([this.m.route, sketchTuning])));
    r.frames.push(...this.frames); return r;
  }
  go(input: Partial<Controls> = {}, cmds: SketchCommand[] = []) { const f = { input, cmds }; this.frames.push(f); tick(this.m, f); return this; }
  get body() { return this.m.controller.body; }
  get cx() { return this.body.x + this.body.width / 2; }
  get cy() { return this.body.y + this.body.height / 2; }
  get failed() { return this.m.recoveryRemaining > 0 || this.m.stage !== 'traversal' && !this.m.completed; }
  /** Live grip of the newest free nail on this surface. */
  grip(surfaceId: string) {
    const p = [...this.m.session.queue].reverse().find(q => q.surfaceId === surfaceId);
    return p ? this.m.grips.find(g => g.id === p.targetId) ?? null : null;
  }
}

export const replay = (frames: Frame[], field: SketchRoute = sketchLayerThreeSwings) => {
  const m = new SketchRouteModel(field, sketchTuning);
  for (const f of frames) tick(m, f);
  return m;
};

/** Stage A: nail strip F at `offset` from the start ground and land on its head. */
export function toFoothold(run: Run, offset: number, jumpX = 21): Run | null {
  const r = run.fork();
  r.go({}, [{ type: 'place-at', surfaceId: 'l3-strip-f', offset }]);
  if (r.m.placedCount !== 1) return null;
  const head = r.m.targetPosition(r.m.session.queue[0].targetId)!;
  let jumped = false;
  for (let f = 0; f < 240; f++) {
    const d = head.x - r.cx;
    if (!jumped && r.body.grounded && r.body.x >= jumpX) { jumped = true; r.go({ axis: 1, jumpPressed: true, jumpHeld: true }); continue; }
    const axis = !jumped ? 1 : Math.abs(d) > 0.15 ? Math.sign(d) : 0;
    r.go({ axis, jumpHeld: jumped && r.body.vy > 0 });
    if (r.failed) return null;
    if (jumped && r.body.grounded && Math.abs(r.body.y - (head.y + 0.175)) < 1e-3) {
      for (let s = 0; s < 6; s++) r.go();
      return r;
    }
  }
  return null;
}

export interface Leap { wait: number; second: number }
/**
 * From standing (or a swing), wait then leap right with an optional air jump,
 * pressing E the first frame the target nail is inside the grip radius.
 */
export function leapToGrip(run: Run, surfaceId: string, leap: Leap, radius = sketchTuning.gripRadius - 0.05): Run | null {
  const r = run.fork();
  for (let f = 0; f < leap.wait; f++) { r.go(); if (r.failed) return null; }
  r.go({ axis: 1, jumpPressed: true, jumpHeld: true });
  for (let f = 1; f < 150; f++) {
    const g = r.grip(surfaceId);
    const close = !!g && Math.hypot(r.cx - g.x, r.cy - g.y) <= radius;
    const second = f === leap.second;
    r.go({ axis: 1, jumpPressed: second, jumpHeld: (f < 14) || (f >= leap.second && f < leap.second + 14), interactPressed: close });
    if (r.m.move.state === 'swing' && g && r.m.move.swingTarget === g.id) return r;
    if (r.failed || r.body.grounded) return null;
  }
  return null;
}

/** `steer` is the direction held after the release (1 right, 0 let go). */
export interface Release { pump: number; angle: number; jump: number; steer?: number }
/** Pump along the arc, release at the angle once moving right, steer right. */
export function swingRelease(run: Run, rel: Release, grip?: string, radius = sketchTuning.gripRadius - 0.05): Run | null {
  const r = run.fork();
  for (let f = 0; f < 600; f++) {
    const sw = r.m.movement.swing;
    if (!sw) return null;
    if (f >= rel.pump && sw.omega > 0 && sw.angle * 180 / Math.PI >= rel.angle) break;
    r.go({ axis: Math.sign(sw.omega) || 1 });
    if (r.failed) return null;
  }
  if (!r.m.movement.swing) return null;
  r.go({ axis: 1, jumpPressed: true, jumpHeld: true });
  for (let f = 1; f < 200; f++) {
    const g = grip ? r.grip(grip) : null;
    const close = !!g && Math.hypot(r.cx - g.x, r.cy - g.y) <= radius;
    const jump = f === rel.jump;
    r.go({ axis: rel.steer ?? 1, jumpPressed: jump, jumpHeld: jump || (f > rel.jump && f < rel.jump + 14), interactPressed: close });
    if (grip && g && r.m.move.state === 'swing' && r.m.move.swingTarget === g.id) return r;
    if (!grip && r.m.completed) return r;
    if (r.failed || (r.body.grounded && !r.m.completed)) return null;
  }
  return null;
}

export const WAITS = Array.from({ length: 80 }, (_, i) => i * 4);
export const SECONDS = [8, 12, 16, 20, 24, 28, 999];
export const PUMPS = [0, 20, 40, 60, 80, 100, 130, 160, 200];
export const ANGLES = [0, 15, 30, 45, 60, 75, 90];
export const JUMPS = [6, 12, 18, 24, 30, 999];

/** All successful options for a stage, in grid order. */
export function all<T, P>(params: P[], tryOne: (p: P) => T | null): { p: P; r: T }[] {
  const out: { p: P; r: T }[] = [];
  for (const p of params) { const r = tryOne(p); if (r) out.push({ p, r }); }
  return out;
}
export const grid = <A, B>(a: A[], b: B[]) => a.flatMap(x => b.map(y => [x, y] as const));
export const grid3 = <A, B, C>(a: A[], b: B[], c: C[]) => a.flatMap(x => b.flatMap(y => c.map(z => [x, y, z] as const)));

/**
 * The standard two-nail sequence with chosen nail offsets: F, M1 (grip),
 * Q frees F, M2 while swinging, release/grip M2, Q frees M1, release to the
 * ledge. Returns the first complete route or the stage it stopped at.
 */
export function cross(o: { f: number; m1: number; m2: number; first?: boolean }, from?: Run) {
  // S4C passes a joined run that has just handed over on the start ground.
  const start = from ?? Run.start();
  start.go();
  const onF = toFoothold(start, o.f);
  if (!onF) return { stage: 'F', run: null };
  // Click M1 on the first frame its spot is in reach from the head.
  const placed = onF.fork();
  for (let f = 0; f < 400 && placed.m.placedCount < 2; f++) {
    placed.go({}, placed.m.surfaceRefusal('l3-bar-m1', o.m1) === '' ? [{ type: 'place-at', surfaceId: 'l3-bar-m1', offset: o.m1 }] : []);
  }
  if (placed.m.placedCount !== 2) return { stage: 'place M1', run: null };
  let stage = 'M1';
  for (const [wait, second] of grid(WAITS, SECONDS)) {
    const onM1 = leapToGrip(placed, 'l3-bar-m1', { wait, second });
    if (!onM1) continue;
    stage = 'M2';
    // Q frees F at once; M2 is nailed on the first frame it is in reach.
    const swing = onM1.fork().go({}, [{ type: 'recall' }]);
    for (let f = 0; f < 120 && swing.m.availableNails > 0; f++) {
      const ok = swing.m.surfaceRefusal('l3-bar-m2', o.m2) === '';
      swing.go({ axis: Math.sign(swing.m.movement.swing?.omega ?? 1) || 1 }, ok ? [{ type: 'place-at', surfaceId: 'l3-bar-m2', offset: o.m2 }] : []);
      if (!swing.m.movement.swing) break;
    }
    if (swing.m.availableNails > 0 || !swing.m.movement.swing) continue;
    for (const [pump, angle, jump] of grid3(PUMPS, ANGLES, JUMPS)) {
      const onM2 = swingRelease(swing, { pump, angle, jump }, 'l3-bar-m2');
      if (!onM2) continue;
      stage = 'ledge';
      const freed = onM2.fork().go({}, [{ type: 'recall' }]);
      for (const [p2, a2, j2] of grid3(PUMPS, ANGLES, JUMPS)) {
        const done = swingRelease(freed, { pump: p2, angle: a2, jump: j2 });
        if (done) return { stage: 'done', run: done, params: { wait, second, pump, angle, jump, p2, a2, j2 } };
      }
      if (o.first) break;
    }
    if (o.first) break;
  }
  return { stage, run: null };
}

/** Stand on strip F at `f`, nail M1 at `m1` as soon as it is in reach. */
export function nailedM1(f: number, m1: number): Run | null {
  const start = Run.start(); start.go();
  const onF = toFoothold(start, f);
  if (!onF) return null;
  for (let k = 0; k < 400 && onF.m.placedCount < 2; k++) {
    onF.go({}, onF.m.surfaceRefusal('l3-bar-m1', m1) === '' ? [{ type: 'place-at', surfaceId: 'l3-bar-m1', offset: m1 }] : []);
  }
  return onF.m.placedCount === 2 ? onF : null;
}

/** Wait frames (from M1's placement) that lead to a grip with some air-jump timing. */
export function gripWaits(placed: Run, waits = WAITS): number[] {
  return waits.filter(wait => SECONDS.some(second => !!leapToGrip(placed, 'l3-bar-m1', { wait, second })));
}

/**
 * Pump/release from the current swing with no further nail and report the
 * furthest right edge reached while the feet are at or above `top`.
 */
export function releaseReach(run: Run, rel: Release, top: number): number {
  const r = swingRelease(run, rel);
  if (r) return Infinity; // it completed: reached the ledge
  // Replay the same inputs while watching the body; swingRelease forks.
  const w = run.fork();
  let best = -Infinity;
  for (let f = 0; f < 600; f++) {
    const sw = w.m.movement.swing;
    if (!sw) break;
    if (f >= rel.pump && sw.omega > 0 && sw.angle * 180 / Math.PI >= rel.angle) break;
    w.go({ axis: Math.sign(sw.omega) || 1 });
  }
  if (!w.m.movement.swing) return best;
  w.go({ axis: 1, jumpPressed: true, jumpHeld: true });
  for (let f = 1; f < 200 && !w.failed && !w.body.grounded; f++) {
    const jump = f === rel.jump;
    w.go({ axis: rel.steer ?? 1, jumpPressed: jump, jumpHeld: jump || (f > rel.jump && f < rel.jump + 14) });
    if (w.body.y >= top) best = Math.max(best, w.body.x + w.body.width);
  }
  return best;
}
