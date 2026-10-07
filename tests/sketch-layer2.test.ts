import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { idleControls, CharacterController } from '../src/gameplay/controller';
import type { Controls } from '../src/gameplay/controller';
import { SketchRouteModel, createRouteSession } from '../src/gameplay/sketch-model';
import { sketchLayerTwo } from '../src/levels/unfinished-sketch-layer2';
import { sketchRoute } from '../src/levels/unfinished-sketch-route';
import { sketchMovement, sketchTuning, isSketchStudy } from '../src/levels/unfinished-sketch';
import { bladeContact, sweptBladeContact } from '../src/gameplay/sketch-blade';

const DIR = process.env.SKETCH_EVIDENCE_DIR ?? 'docs/validation/sketch-s3/s3b';
mkdirSync(DIR, { recursive: true });
const record = (name: string, value: unknown) => writeFileSync(`${DIR}/${name}.json`, JSON.stringify(value, null, 2));
const dt = 1 / 60;
const keys = (o: Partial<Controls> = {}): Controls => ({ ...idleControls(), ...o });
const build = () => new SketchRouteModel(sketchLayerTwo, sketchTuning);
const tick = (m: SketchRouteModel, n = 1, o: Partial<Controls> = {}) => {
  for (let i = 0; i < n; i++) m.update(dt, keys(o));
};
const pin = (m: SketchRouteModel, id: string) => { m.enqueue({ type: 'place', targetId: id }); tick(m); return m.isOccupied(id); };
const recall = (m: SketchRouteModel) => { m.enqueue({ type: 'recall' }); tick(m); };
const surface = (m: SketchRouteModel, id: string) => m.solids.find(s => s.id === id)!;

function edge(m: SketchRouteModel) {
  const b = m.controller.body;
  const s = m.solids.find(s => Math.abs(b.y - s.y - s.height) < 0.05 && b.x + b.width > s.x && b.x < s.x + s.width)!;
  for (let i = 0; i < 300 && b.x > s.x + 0.22; i++) tick(m, 1, { axis: -1 });
  tick(m, 8); // brake while still on support
}

function transfer(m: SketchRouteModel, id: string, airAt = 16): boolean {
  const s = surface(m, id); const goalX = s.x + s.width / 2 - sketchMovement.width / 2;
  let airborne = false;
  for (let f = 0; f < 180; f++) {
    tick(m, 1, { axis: m.controller.body.x > goalX + 0.2 ? -1 : 0,
      jumpHeld: f !== airAt - 1, jumpPressed: f === 0 || f === airAt });
    const b = m.controller.body;
    airborne ||= !b.grounded;
    if (m.recoveryRemaining > 0) return false;
    if (airborne && b.grounded && f > airAt + 1) return Math.abs(b.y - s.y - s.height) < 0.1 && b.x < s.x + s.width && b.x + b.width > s.x;
  }
  return false;
}

// Entire setup uses real fixed-tick controls/ledger commands; no pose mutation.
function throughA(wait = 0, airAt = 16) {
  const m = build(); tick(m, 2); edge(m); tick(m, wait);
  if (!pin(m, 'l2-freeze-a')) return null;
  if (!transfer(m, 'l2-board-a', airAt)) return null;
  return m;
}

describe('S3A moving-board route', () => {
  it('adds only a validated Layer 2 study, grounded existing landing and a local leg', () => {
    expect(isSketchStudy('layer-2')).toBe(true); expect(isSketchStudy('layers-1-2')).toBe(true);
    const m = build(); tick(m, 2);
    expect(m.legId).toBe('layer-2'); expect(m.section.travelDirection).toBe(-1);
    expect(m.controller.body).toMatchObject({ x: 64.2, y: 15.2, grounded: true });
    expect(m.availableNails).toBe(2); expect(m.leg.escalator?.id).toBe('l2-escalator');
    expect(sketchLayerTwo.solids.filter(s => s.id.startsWith('l1-'))).toEqual(sketchRoute.solids.filter(s => s.id.startsWith('l1-')));
    expect(sketchLayerTwo.mechanisms.filter(s => s.id.startsWith('l1-'))).toEqual(sketchRoute.mechanisms);
  });

  it('inks Layer 2 support only while pinned, keeps it non-climbable, and rejects other-layer marks', () => {
    const m = build(); tick(m);
    expect(m.solids.filter(s => /^l2-board/.test(s.id))).toHaveLength(0);
    expect(m.field.mechanisms.filter(s => /^l2-board/.test(s.id)).every(s => s.climbable === false && s.solidWhenPinned)).toBe(true);
    expect(pin(m, 'l2-freeze-a')).toBe(true);
    expect(m.solids.filter(s => /^l2-board/.test(s.id)).map(s => s.id)).toEqual(['l2-board-a']);
    recall(m); expect(m.solids.filter(s => /^l2-board/.test(s.id))).toHaveLength(0);
    expect(m.targetViews().filter(t => t.id.startsWith('l1-')).every(t => t.reason === 'Another layer.')).toBe(true);
    expect(pin(m, 'l1-freeze-d')).toBe(false); expect(m.placedCount).toBe(0);
  });

  it('freezes boards without freezing axes; invalid/full clicks retain FIFO; recall resumes the captured phase', () => {
    const m = throughA()!; expect(m).not.toBeNull(); edge(m);
    expect(pin(m, 'l2-freeze-b')).toBe(true);
    const board = m.mechanismView().find(v => v.id === 'l2-board-a')!;
    const axe = m.mechanismView().find(v => v.id === 'l2-axe-a')!;
    tick(m, 120);
    expect(m.mechanismView().find(v => v.id === 'l2-board-a')!.y).toBe(board.y);
    expect(m.mechanismView().find(v => v.id === 'l2-axe-a')!.angle).not.toBe(axe.angle);
    const queue = m.session.queue;
    expect(pin(m, 'l2-freeze-c')).toBe(false); expect(pin(m, 'l2-axe-a')).toBe(false);
    expect(m.session.queue).toEqual(queue);
    recall(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['l2-freeze-b']);
    expect(m.mechanismView().find(v => v.id === 'l2-board-a')!.y).toBeCloseTo(board.y, 6);
    tick(m, 10); expect(m.mechanismView().find(v => v.id === 'l2-board-a')!.y).not.toBe(board.y);
  });

  it('calibrates ordinary transfer schedules and both active-axe crossing windows', () => {
    const aSchedules = [10, 13, 16, 19, 22, 25, 28].filter(f => throughA(0, f));
    expect(aSchedules.length).toBeGreaterThanOrEqual(5);
    const windowsB: number[] = []; const windowsC: number[] = []; const launchPhases: unknown[] = [];
    for (let delay = 0; delay < 156; delay += 2) {
      const m = throughA()!; edge(m); pin(m, 'l2-freeze-b'); tick(m, delay);
      const launchB = m.mechanismView().find(v => v.id === 'l2-axe-a')!.angle % (Math.PI * 2);
      if (!transfer(m, 'l2-board-b')) continue;
      windowsB.push(delay); edge(m);
      const fullQueue = m.session.queue; expect(pin(m, 'l2-freeze-c')).toBe(false); expect(m.session.queue).toEqual(fullQueue);
      recall(m); expect(pin(m, 'l2-freeze-c')).toBe(true);
      // Once on B, C has its own independent timing decision.
      for (let cDelay = 0; cDelay < 132; cDelay += 2) {
        const n = throughA()!; edge(n); pin(n, 'l2-freeze-b'); tick(n, delay);
        expect(transfer(n, 'l2-board-b')).toBe(true); edge(n); recall(n); pin(n, 'l2-freeze-c'); tick(n, cDelay);
        const launchC = n.mechanismView().find(v => v.id === 'l2-axe-b')!.angle % (Math.PI * 2);
        if (transfer(n, 'l2-board-c')) { windowsC.push(cDelay); launchPhases.push({ delay, cDelay, launchB, launchC, boards: n.mechanismView().filter(v => v.id.startsWith('l2-board')) }); edge(n); expect(transfer(n, 'l2-exit')).toBe(true); expect(n.stage).toBe('exit'); break; }
      }
    }
    const cWindows: unknown[] = [];
    for (let delay = 0; delay < 132; delay += 2) {
      const m = throughA()!; edge(m); pin(m, 'l2-freeze-b'); tick(m, 84);
      expect(transfer(m, 'l2-board-b')).toBe(true); edge(m); recall(m); pin(m, 'l2-freeze-c'); tick(m, delay);
      const phase = m.mechanismView().find(v => v.id === 'l2-axe-b')!.angle % (Math.PI * 2);
      if (transfer(m, 'l2-board-c')) cWindows.push({ delay, phase });
    }
    record('timing-windows', { aSchedules, windowsB, windowsC, launchPhases, cWindows, sampleStepFrames: 2 });
    expect(windowsB.length).toBeGreaterThanOrEqual(3); expect(windowsC.length).toBeGreaterThanOrEqual(3);
    expect(cWindows.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps every socket and safe central standing region clear across all blade phases', () => {
    const m = build(); const clearances: Record<string, number> = {};
    for (const board of m.field.mechanisms.filter(m => m.id.startsWith('l2-board'))) {
      let minGap = Infinity;
      for (let f = 0; f < 360; f++) {
        const k = 0.5 - 0.5 * Math.cos(f * Math.PI / 180);
        const x = board.centre.x + board.travel.x * k;
        const y = board.centre.y + board.travel.y * k + board.size.height / 2;
        for (const axe of m.field.mechanisms.filter(m => m.sweptBlade)) {
          minGap = Math.min(minGap, Math.abs(x - axe.pivot.x) - axe.length - axe.size.height / 2 - 0.325);
          for (let a = 0; a < 360; a += 5) {
            const angle = a * Math.PI / 180;
            const pose = { x: axe.pivot.x + axe.length / 2 * Math.sin(angle), y: axe.pivot.y - axe.length / 2 * Math.cos(angle), angle };
            expect(bladeContact({ x: x - 0.325, y, width: 0.65, height: 1.25 }, pose, axe.length, axe.size.height)).toBe(false);
          }
        }
      }
      clearances[board.id] = minGap;
    }
    record('safe-standing-clearance', clearances);
  });

  it('requires every inked board through collision and rejects skips with the measured worst-case jump envelope', () => {
    const m = build(); tick(m, 2); edge(m);
    tick(m, 1, { axis: -1, jumpPressed: true, jumpHeld: true });
    tick(m, 15, { axis: -1 }); tick(m, 1, { axis: -1, jumpPressed: true, jumpHeld: true });
    let movingLandings = 0;
    for (let f = 0; f < 150; f++) {
      tick(m, 1, { axis: -1 });
      if (m.controller.body.grounded && !m.recoveryRemaining && m.controller.body.x < 60 && m.controller.body.x > 31) movingLandings++;
    }
    expect(movingLandings).toBe(0); expect(m.completed).toBe(false); expect(m.availableNails).toBe(2);
    // Envelope probes grant full takeoff speed, latest edge overlap and NO axes:
    // more generous than the real route, so failures do not depend on hazards.
    const reach = (drop: number) => {
      let max = 0;
      for (let airAt = 1; airAt < 100; airAt++) {
        const c = new CharacterController(sketchMovement, 0, 0);
        const ground = [{ id: 'start', x: -100, y: -1, width: 100.65, height: 1 }];
        for (let f = 0; f < 20; f++) c.update(dt, keys({ axis: 1 }), [{ ...ground[0], width: 200 }]);
        const start = c.body.x;
        for (let f = 0; f < 200; f++) {
          c.update(dt, keys({ axis: 1, jumpHeld: f !== airAt - 1, jumpPressed: f === 0 || f === airAt }), []);
          // A delayed air jump may happen below the landing height. Do not
          // stop at the first descent before that jump is even consumed.
          if (c.body.y < sketchLayerTwo.deathY - 16.675) break;
          if (f > airAt && c.body.vy < 0 && c.body.y <= -drop) {
            if (c.body.y - c.body.vy * dt > -drop) max = Math.max(max, c.body.x - start + c.body.width);
            break;
          }
        }
      }
      return max + sketchMovement.speed * sketchMovement.coyoteTime;
    };
    const a = sketchLayerTwo.mechanisms.find(m => m.id === 'l2-board-a')!;
    const b = sketchLayerTwo.mechanisms.find(m => m.id === 'l2-board-b')!;
    const c = sketchLayerTwo.mechanisms.find(m => m.id === 'l2-board-c')!;
    const skips = [
      { skip: 'A', gap: 63 - (b.centre.x + b.travel.x + b.size.width / 2), drop: 0 },
      { skip: 'B', gap: a.centre.x - a.size.width / 2 - (c.centre.x + c.travel.x + c.size.width / 2), drop: a.centre.y + a.travel.y - c.centre.y },
      { skip: 'C', gap: b.centre.x - b.size.width / 2 - 31, drop: b.centre.y + b.size.height / 2 - 16.3 },
    ].map(p => ({ ...p, generousReach: reach(p.drop) }));
    record('mandatory-pin-probes', { unpinnedMovingLandings: movingLandings, skips });
    for (const p of skips) expect(p.gap, `cannot skip ${p.skip}`).toBeGreaterThan(p.generousReach);
  });

  it('fall/R/re-entry reset only Layer 2, while the grounded exit remains a safe endpoint', () => {
    const m = build(); tick(m, 2); pin(m, 'l2-freeze-a'); tick(m, 1, { restartPressed: true });
    expect(m.controller.body.x).toBe(64.2); expect(m.session.queue).toEqual([]); expect(m.routeTime).toBe(0);
    // Unit checkpoint boundary proof, separate from control traversal.
    m.controller.respawn(27.5, 16.7); tick(m); expect(m.stage).toBe('traversal');
    tick(m, 40); expect(m.stage).toBe('exit'); expect(m.completed).toBe(false); expect(m.availableNails).toBe(2);
    m.controller.respawn(20, 12); tick(m); expect(m.recoveryRemaining).toBeGreaterThan(0); tick(m, 30);
    expect(m.stage).toBe('exit'); expect(m.controller.body.x).toBe(27.5);
    const n = build(); n.restoreSession(m.session); expect(n.stage).toBe('exit'); expect(n.completed).toBe(false);
    n.restartAdventure(); expect(n.stage).toBe('traversal'); expect(n.controller.body.x).toBe(64.2);
    expect(createRouteSession('layer-2').legId).toBe('layer-2');
    const p = throughA()!; const fresh = build(); fresh.restoreSession(p.session);
    expect(fresh.controller.body.x).toBe(64.2); expect(fresh.availableNails).toBe(2); expect(fresh.routeTime).toBe(0);
  });

  it('recalling current solid support and repinning never traps the player in a board', () => {
    const m = throughA()!; expect(m).not.toBeNull(); const top = m.controller.body.y; recall(m);
    expect(m.solids.some(s => s.id === 'l2-board-a')).toBe(false); tick(m, 20);
    expect(m.controller.body.y).toBeLessThan(top); pin(m, 'l2-freeze-a'); tick(m, 15);
    const b = m.controller.body;
    expect(m.solids.some(s => b.x < s.x + s.width && b.x + b.width > s.x && b.y < s.y + s.height - 1e-6 && b.y + b.height > s.y + 1e-6)).toBe(false);
    tick(m, 1, { restartPressed: true }); expect(m.controller.body.x).toBe(64.2);
  });

  it('measures the unchanged jump envelope in both directions', () => {
    const measurements = [-1, 1].flatMap(axis => [null, 10, 16, 25, 32, 38, 44, 48].map(airAt => {
      const c = new CharacterController(sketchMovement, 0, 0); const ground = [{ id: 'ground', x: -100, y: -1, width: 200, height: 1 }];
      for (let f = 0; f < 20; f++) c.update(dt, keys({ axis }), ground);
      const start = c.body.x; let high = 0; let duration = 0;
      for (let f = 0; f < 180; f++) {
        c.update(dt, keys({ axis, jumpHeld: airAt === null || f !== airAt - 1, jumpPressed: f === 0 || f === airAt }), ground);
        high = Math.max(high, c.body.y); duration = (f + 1) * dt;
        if (f > 2 && c.body.grounded) break;
      }
      return { axis, airAt, high, distance: Math.abs(c.body.x - start), duration };
    }));
    record('jump-envelope', { jumps: measurements });
    expect(Math.max(...measurements.map(m => m.high))).toBeCloseTo(4.48, 1);
    expect(measurements.filter(m => m.axis === -1).map(m => m.distance)).toEqual(measurements.filter(m => m.axis === 1).map(m => m.distance));
  });
});

describe('S3A blade collision precision', () => {
  it('agrees on cardinal and diagonal contacts and excludes empty AABB corners', () => {
    const box = { x: -0.1, y: -0.1, width: 0.2, height: 0.2 };
    for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      expect(bladeContact(box, { x: 0, y: 0, angle }, 2.6, 0.65)).toBe(true);
    }
    expect(bladeContact({ x: 0.7, y: 0.7, width: 0.1, height: 0.1 }, { x: 0, y: 0, angle: Math.PI / 4 }, 2.6, 0.65)).toBe(false);
  });
  it('catches thin crossings including terminal player speed between ticks', () => {
    const pose = () => ({ x: 0, y: 0, angle: 0 });
    expect(sweptBladeContact({ x: 0, y: 0.4, width: 0.65, height: 1.25 },
      { x: 0, y: -1.6, width: 0.65, height: 1.25 }, 0, dt, 2.2, 2.5, 0.65, pose)).toBe(true);
    expect(sweptBladeContact({ x: 2, y: 0.4, width: 0.65, height: 1.25 },
      { x: 2, y: -1.6, width: 0.65, height: 1.25 }, 0, dt, 2.2, 2.5, 0.65, pose)).toBe(false);
  });
  it('recovers locally on stationary, side, underside and jumping blade contacts at authored phases', () => {
    const contacts = [];
    for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.75]) {
      for (const approach of ['stationary', 'side', 'underside', 'jump']) {
        const m = build();
        tick(m, Math.round(sketchLayerTwo.mechanisms.find(m => m.id === 'l2-axe-a')!.period * 60 * phase));
        const pose = m.mechanismView().find(v => v.id === 'l2-axe-a')!;
        // Unit contact probes intentionally position the body; browser traversal never does.
        const c = Math.cos(-pose.angle); const s = Math.sin(-pose.angle);
        let cx = pose.x; let cy = pose.y;
        if (approach === 'side') {
          const radius = 1.3 + 0.325 * Math.abs(c) + 0.625 * Math.abs(s) - 0.015;
          cx += c * radius; cy += s * radius;
        } else if (approach === 'underside' || approach === 'jump') {
          const sign = c >= 0 ? -1 : 1;
          const radius = 0.325 + 0.325 * Math.abs(s) + 0.625 * Math.abs(c) - 0.015;
          cx += -s * sign * radius; cy += c * sign * radius;
        }
        m.controller.respawn(cx - 0.325, cy - 0.625);
        tick(m, 1, approach === 'side' ? { axis: -1 } : approach === 'jump' ? { jumpPressed: true, jumpHeld: true } : {});
        expect(m.recoveryRemaining).toBeGreaterThan(0); contacts.push({ phase, approach });
        tick(m, 30); expect(m.legId).toBe('layer-2'); expect(m.controller.body.x).toBe(64.2);
        expect(m.availableNails).toBe(2);
      }
    }
    record('hazard-contact-probes', contacts);
  });
});
