import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SketchRouteModel, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchLayerThreeSwings as route, sketchLayerThreeWalls } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning } from '../src/levels/unfinished-sketch';
import {
  ANGLES, JUMPS, PUMPS, Run, WAITS, cross, grid, grid3, gripWaits, leapToGrip, nailedM1, releaseReach, replay,
  swingRelease, toFoothold,
} from './sketch-layer3-swings-route';

const fresh = () => new SketchRouteModel(route, sketchTuning);
const tick = (m: SketchRouteModel, input: Partial<Controls> = {}) => m.update(1 / 60, { ...idleControls(), ...input });
const rows: Record<string, unknown> = {};
afterAll(() => {
  mkdirSync('docs/validation/sketch-s4/s4b', { recursive: true });
  writeFileSync('docs/validation/sketch-s4/s4b/unit-measurements.json', JSON.stringify(rows, null, 2));
});

const ledge = route.solids.find(s => s.id === 'l3-swings-ledge')!;
const ledgeTop = ledge.y + ledge.height;
const sweep = (id: string) => {
  const m = route.mechanisms.find(x => x.id === id)!;
  const s = route.surfaces!.find(x => x.mechanismId === id)!;
  return { x0: m.centre.x + Math.min(0, m.travel.x) + s.from.x, x1: m.centre.x + Math.max(0, m.travel.x) + s.to.x, y: m.centre.y + s.from.y };
};
/** Closest body centre to a swept bar area over many ordinary running jumps. */
function closestJump(from: Run, bar: { x0: number; x1: number; y: number }, waits = [0]) {
  let best = Infinity; let at = '';
  for (const wait of waits) for (const second of [6, 10, 14, 18, 22, 26, 30, 34, 999]) for (const hold of [14, 30]) {
    const r = from.fork();
    for (let f = 0; f < wait; f++) r.go({ axis: 1 });
    r.go({ axis: 1, jumpPressed: true, jumpHeld: true });
    for (let f = 1; f < 150; f++) {
      const p = f === second;
      r.go({ axis: 1, jumpPressed: p, jumpHeld: f < hold || (f >= second && f < second + hold) });
      const dx = r.cx < bar.x0 ? bar.x0 - r.cx : r.cx > bar.x1 ? r.cx - bar.x1 : 0;
      const d = Math.hypot(dx, r.cy - bar.y);
      if (d < best) { best = d; at = `wait ${wait} second ${second} hold ${hold} at ${r.cx.toFixed(2)},${r.cy.toFixed(2)}`; }
      if (r.body.grounded || r.m.recoveryRemaining > 0) break;
    }
  }
  return { best, at };
}

describe('S4B free placement ledger', () => {
  it('starts on S4A\'s post-climb ledge with two nails and no marked rings of its own', () => {
    const m = fresh(); tick(m);
    expect(m.controller.body).toMatchObject({ x: 17.2, y: 49.5 });
    expect(sketchLayerThreeWalls.legs[0].exitBounds).toMatchObject({ x: 13.2, y: 49.5 });
    expect(m.solids.some(s => s.id === 'l3-walls-exit' && s.y + s.height === 49.5 && s.x === 13.2 && s.width === 8.8)).toBe(true);
    expect(m.nailBudget).toBe(2); expect(route.nailPickup).toBeUndefined();
    expect(route.legs[0].targetIds).toEqual([]);
    // The climb's marked boards stay visible context but belong to another section.
    expect(m.targetViews().every(v => v.reason === 'Another layer.')).toBe(true);
    expect(m.place('l3-wall-a-pin')).toBe(false); expect(m.placedCount).toBe(0);
  });

  it('refuses empty air, unknown surfaces and bad offsets without changing the queue', () => {
    const m = fresh(); tick(m);
    for (const [surfaceId, offset] of [['', 0], ['nowhere', 0.5], ['l3-strip-f', -0.1], ['l3-strip-f', 1.2], ['l3-strip-f', NaN]] as const) {
      m.enqueue({ type: 'place-at', surfaceId, offset }); tick(m);
      expect(m.placedCount, `${surfaceId} ${offset}`).toBe(0);
    }
    expect(m.cue).toContain('wood');
    expect(m.surfaceRefusal('', 0)).toBe('Empty air. Nails only go into wood.');
    expect(m.surfaceRefusal('l3-bar-m1', 0)).toBe('Out of reach.');
  });

  it('places a free foothold head that is real support and keeps its offset', () => {
    const m = fresh(); tick(m);
    m.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 1 }); tick(m);
    const [p] = m.session.queue;
    expect(p).toMatchObject({ surfaceId: 'l3-strip-f', offset: 1 });
    expect(m.target(p.targetId)).toMatchObject({ kind: 'foothold', size: { width: 1.9, height: 0.35 } });
    expect(m.solids.some(s => s.id === `${p.targetId}-head`)).toBe(true);
    expect(m.targetPosition(p.targetId)).toEqual(m.surfacePoint('l3-strip-f', 1));
    // Spacing: a second nail within one unit on the same strip is refused.
    expect(m.surfaceRefusal('l3-strip-f', 0.9)).toBe('Too close to another nail.');
    expect(m.placeAt('l3-strip-f', 0)).toBe(true);
    expect(m.surfaceRefusal('l3-strip-f', 0.5)).toBe('Both nails are placed. Press Q.');
    expect(m.placeAt('l3-strip-f', 0.5)).toBe(false); expect(m.placedCount).toBe(2);
    // Strict FIFO: Q frees the first (far) nail and its head disappears.
    m.enqueue({ type: 'recall' }); tick(m);
    expect(m.session.queue.map(q => q.offset)).toEqual([0]);
    expect(m.solids.some(s => s.id === `${p.targetId}-head`)).toBe(false);
  });

  it('a head that would hit the player is refused; recall and placement in one tick reuse the nail', () => {
    const start = Run.start(); start.go();
    const onF = toFoothold(start, 1)!;
    const r = onF.fork().go({}, [{ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0 }]);
    expect(r.m.session.queue.map(q => q.offset)).toEqual([1, 0]);
    // Full budget: Q and a click in the same tick recall the oldest first.
    r.go({}, [{ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 }, { type: 'recall' }]);
    expect(r.m.session.queue.map(q => q.offset)).toEqual([0, 0.5]);
    // Jumping up through the strip: a head inside the body is refused.
    const air = Run.start(); air.go();
    for (let f = 0; f < 200 && air.body.x < 21.6; f++) air.go({ axis: 1 });
    air.go({ axis: 1, jumpPressed: true, jumpHeld: true });
    const refusals = new Set<string>();
    for (let f = 0; f < 40; f++) {
      air.go({ axis: 1, jumpHeld: true });
      const o = Math.max(0, Math.min(1, (air.cx - 23.4) / 3.2));
      const point = air.m.surfacePoint('l3-strip-f', o)!;
      if (point.y > air.body.y && point.y < air.body.y + air.body.height) refusals.add(air.m.surfaceRefusal('l3-strip-f', o));
    }
    expect([...refusals]).toEqual(['The head would hit you.']);
  });

  it('a bar nail rides with its bar at the same local spot', () => {
    const r = nailedM1(1, 0.25)!;
    const p = r.m.session.queue[1];
    const centre = () => r.m.mechanismView().find(v => v.id === 'l3-bar-m1')!;
    const local = () => { const c = centre(); const at = r.m.targetPosition(p.targetId)!; return { x: at.x - c.x, y: at.y - c.y }; };
    const before = local(); const x0 = centre().x;
    for (let f = 0; f < 90; f++) r.go();
    expect(Math.abs(centre().x - x0)).toBeGreaterThan(0.5);
    expect(local().x).toBeCloseTo(before.x, 9); expect(local().y).toBeCloseTo(before.y, 9);
    expect(r.m.grips.find(g => g.id === p.targetId)!.vx).not.toBe(0);
  });

  it('snapshots carry surface and offset; traversal re-entry returns to the entrance', () => {
    const r = nailedM1(1, 0)!;
    const session = r.m.session;
    expect(session.queue.map(q => [q.surfaceId, q.offset])).toEqual([['l3-strip-f', 1], ['l3-bar-m1', 0]]);
    const n = fresh(); n.restoreSession(session);
    expect(n.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(n.session.queue).toEqual([]); expect(n.availableNails).toBe(2);
    for (const bad of [{ ...session, routeId: 'layer-3-walls' }, { ...session, routeId: undefined }, { ...session, stage: 'transit' },
      { ...session, stage: 'arrival' }, { ...session, elapsed: -1 }, { ...session, legId: 'l3-walls' }]) {
      const k = fresh(); k.restoreSession(bad as SketchRouteSession);
      expect(k.stage).toBe('traversal'); expect(k.controller.body.x).toBe(17.2); expect(k.session.queue).toEqual([]);
    }
    // The S4A wall snapshot never grants this section anything.
    const k = fresh(); k.restoreSession(new SketchRouteModel(sketchLayerThreeWalls, sketchTuning).session);
    expect(k.controller.body.x).toBe(17.2);
  });

  it('recalling the current head drops the player into the glue and retries this section', () => {
    const start = Run.start(); start.go();
    const onF = toFoothold(start, 1)!;
    expect(onF.body.grounded).toBe(true);
    const r = onF.fork().go({}, [{ type: 'recall' }]);
    let frames = 0;
    while (r.m.recoveryRemaining <= 0 && frames < 300) { r.go(); frames++; }
    expect(r.m.cue).toBe('Glue! Quick retry.');
    let back = 0;
    while (r.m.recoveryRemaining > 0) { r.go(); back++; }
    expect(r.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(r.m.availableNails).toBe(2); expect(r.m.session.queue).toEqual([]);
    rows.recallCurrentHead = { framesToGlue: frames, recoveryFrames: back };
  });
});

describe('S4B crossing with real inputs', () => {
  it('the standard two-nail sequence completes and replays from a fresh model', () => {
    const result = cross({ f: 1, m1: 0, m2: 1, first: true });
    expect(result.stage).toBe('done');
    const frames = result.run!.frames;
    const m = replay(frames);
    expect(m.completed).toBe(true); expect(m.stage).toBe('exit');
    expect(m.availableNails).toBe(2); expect(m.session.queue).toEqual([]); expect(m.move.state).toBe('normal');
    // The order of nail commands is the authored FIFO sequence.
    const order = frames.flatMap(f => f.cmds.map(c => c.type === 'recall' ? 'Q' : c.type === 'place-at' ? c.surfaceId.slice(-2).replace('-', '').toUpperCase() : '?'));
    expect(order).toEqual(['F', 'M1', 'Q', 'M2', 'Q']);
    expect(m.hud().endpoint).toContain('S4B endpoint');
    rows.standardRoute = { params: (result as { params?: unknown }).params, frames: frames.length, seconds: +(frames.length / 60).toFixed(2), order };
  });

  it('several placement choices work; a near F spot cannot even reach M1', () => {
    const matrix: Record<string, string> = {};
    for (const [f, m1, m2] of [[1, 0, 0], [1, 0, 0.5], [1, 0.25, 1], [1, 0.5, 0.5], [0.5, 0, 1], [0.75, 0, 0.25]] as const) {
      const result = cross({ f, m1, m2, first: true });
      matrix[`F${f}/M1 ${m1}/M2 ${m2}`] = result.stage;
      expect(result.stage, `F${f} M1 ${m1} M2 ${m2}`).toBe('done');
    }
    expect(nailedM1(0, 0)).toBeNull();
    matrix['F0/M1 any'] = 'M1 out of reach from that head';
    rows.placementChoices = matrix;
  });

  it('measures the M1 grip windows from F\'s far and middle spots', () => {
    const windows: Record<string, number[]> = {};
    for (const [f, m1] of [[1, 0], [1, 0.25], [1, 0.5], [1, 0.75], [0.5, 0]] as const) {
      const placed = nailedM1(f, m1);
      windows[`F${f}/M1 ${m1}`] = placed ? gripWaits(placed, WAITS.filter(w => w % 8 === 0)) : [];
    }
    expect(windows['F1/M1 0'].length).toBeGreaterThan(8);
    expect(windows['F1/M1 0.75']).toEqual([]);
    rows.m1GripWaitFrames = { note: 'wait frames after M1 is nailed (bar period 300 frames) that lead to a grip', windows };
  });

  it('measures M2 placement windows while swinging, then release-to-grip and release-to-ledge options', () => {
    const placed = nailedM1(1, 0)!;
    const wait = gripWaits(placed, [72, 80, 88, 96])[0];
    const onM1 = [8, 12, 16, 20, 24, 28, 999].map(second => leapToGrip(placed, 'l3-bar-m1', { wait, second })).find(Boolean)!;
    const swing = onM1.fork().go({}, [{ type: 'recall' }]);
    const reach: Record<string, number> = {};
    const probe = swing.fork();
    for (let f = 0; f < 300; f++) {
      for (const o of [0, 0.25, 0.5, 0.75, 1]) if (probe.m.surfaceRefusal('l3-bar-m2', o) === '') reach[o] = (reach[o] ?? 0) + 1;
      probe.go({ axis: Math.sign(probe.m.movement.swing!.omega) || 1 });
    }
    expect(Object.keys(reach).length).toBeGreaterThan(2);
    const toGrip: Record<string, number> = {}; const toLedge: Record<string, number> = {};
    for (const m2 of [0, 0.5, 1]) {
      const s = swing.fork();
      for (let f = 0; f < 200 && s.m.availableNails > 0; f++) {
        s.go({ axis: Math.sign(s.m.movement.swing!.omega) || 1 },
          s.m.surfaceRefusal('l3-bar-m2', m2) === '' ? [{ type: 'place-at', surfaceId: 'l3-bar-m2', offset: m2 }] : []);
      }
      const ok = grid3(PUMPS, ANGLES, JUMPS).map(([pump, angle, jump]) => swingRelease(s, { pump, angle, jump }, 'l3-bar-m2')).filter(Boolean);
      toGrip[m2] = ok.length;
      const freed = ok[0]!.fork().go({}, [{ type: 'recall' }]);
      toLedge[m2] = grid3(PUMPS, ANGLES, JUMPS).filter(([pump, angle, jump]) => !!swingRelease(freed, { pump, angle, jump })).length;
      expect(toGrip[m2]).toBeGreaterThan(10); expect(toLedge[m2]).toBeGreaterThan(10);
    }
    rows.m2 = { framesInReachDuringFirst5sOfSwing: reach, releaseToGripOptions: toGrip, releaseToLedgeOptions: toLedge,
      gridSize: PUMPS.length * ANGLES.length * JUMPS.length };
  }, 60_000);
});

describe('S4B bypass probes (geometry, not flags)', () => {
  it('no nails: running off the start falls into the glue and retries here', () => {
    const m = fresh(); tick(m);
    let f = 0;
    for (; f < 400 && m.recoveryRemaining <= 0; f++) tick(m, { axis: 1, jumpPressed: f % 30 === 0, jumpHeld: true });
    expect(m.cue).toBe('Glue! Quick retry.');
    for (let k = 0; k < 30; k++) tick(m);
    expect(m.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(m.completed).toBe(false);
  });

  it('without F, no ordinary jump from the start ground comes within grip reach of M1', () => {
    const r = Run.start(); r.go();
    const near = closestJump(r, sweep('l3-bar-m1'), [0, 6, 12, 18, 24, 30, 36]);
    expect(near.best).toBeGreaterThan(sketchTuning.gripRadius + 0.5);
    rows.groundToM1 = { closestCentre: +near.best.toFixed(2), gripRadius: sketchTuning.gripRadius, at: near.at };
  });

  it('from any F head, M2 is out of grip reach and the ledge is out of jump reach', () => {
    const results: Record<string, unknown> = {};
    for (const f of [0, 0.5, 1]) {
      const start = Run.start(); start.go();
      const onF = toFoothold(start, f)!;
      const near = closestJump(onF, sweep('l3-bar-m2'));
      expect(near.best).toBeGreaterThan(sketchTuning.gripRadius + 4);
      results[`F${f}`] = +near.best.toFixed(2);
    }
    // A head anywhere on F is far short of the ledge (x57): leapfrogging F
    // heads cannot cross, because footholds exist only on this short strip.
    const stripEnd = route.surfaces![0].to.x + route.mechanisms.find(m => m.id === 'l3-strip-f')!.centre.x;
    expect(ledge.x - stripEnd).toBeGreaterThan(11 + 6);
    rows.fToM2 = { closestCentre: results, stripRightEnd: stripEnd, ledgeLeft: ledge.x };
  });

  it('M1\'s best release cannot reach the end ledge directly; M2 is required', () => {
    let best = -Infinity; let attempts = 0;
    for (const m1 of [0, 0.25, 0.5]) {
      const placed = nailedM1(1, m1)!;
      const waits = gripWaits(placed, WAITS.filter(w => w % 24 === 0)).slice(0, 4);
      for (const wait of waits) {
        const onM1 = [8, 12, 16, 20, 24, 28, 999].map(second => leapToGrip(placed, 'l3-bar-m1', { wait, second })).find(Boolean)!;
        const freed = onM1.fork().go({}, [{ type: 'recall' }]);
        for (const [pump, angle, jump] of grid3([0, 45, 90, 150, 220], [0, 15, 30, 45, 60, 75, 90, 110], [1, 8, 16, 24, 999])) {
          // Held right, and let go after the release (the momentum coasts).
          for (const steer of [1, 0]) {
            attempts++;
            best = Math.max(best, releaseReach(freed, { pump, angle, jump, steer }, ledgeTop));
          }
        }
      }
    }
    expect(best).toBeLessThan(ledge.x - 1);
    rows.m1ToLedge = { attempts, furthestRightEdgeAtLedgeHeight: +best.toFixed(2), ledgeLeft: ledge.x, margin: +(ledge.x - best).toFixed(2) };
  }, 120_000);

  it('letting go after a swing release keeps the flight, never further than holding right', () => {
    const placed = nailedM1(1, 0)!;
    const wait = gripWaits(placed, [72, 80, 88, 96])[0];
    const onM1 = [8, 12, 16, 20, 24, 28, 999].map(second => leapToGrip(placed, 'l3-bar-m1', { wait, second })).find(Boolean)!;
    const freed = onM1.fork().go({}, [{ type: 'recall' }]);
    const coast: number[] = []; const held: number[] = [];
    for (const [pump, angle] of grid([20, 60, 120], [20, 40, 60])) {
      const top = ledgeTop - 6;
      coast.push(releaseReach(freed, { pump, angle, jump: 999, steer: 0 }, top));
      held.push(releaseReach(freed, { pump, angle, jump: 999, steer: 1 }, top));
    }
    // One release, then let go: the body keeps travelling right well past the
    // release point instead of stopping dead in the air.
    const r = freed.fork();
    for (let f = 0; f < 600 && !(r.m.movement.swing!.omega > 0 && r.m.move.swingAngle >= 40); f++) r.go({ axis: Math.sign(r.m.movement.swing!.omega) || 1 });
    r.go({ jumpPressed: true, jumpHeld: true });
    const vx0 = r.body.vx;
    for (let f = 0; f < 30; f++) r.go();
    expect(vx0).toBeGreaterThan(sketchTuning.swing.arm);
    expect(r.body.vx).toBeGreaterThan(Math.min(vx0, 6.8) - 0.01);
    for (let i = 0; i < coast.length; i++) expect(coast[i]).toBeLessThanOrEqual(held[i] + 1e-6);
    rows.releaseCoast = { vxAtRelease: +vx0.toFixed(2), vxHalfSecondLaterLetGo: +r.body.vx.toFixed(2),
      furthestLetGo: +Math.max(...coast).toFixed(2), furthestHeldRight: +Math.max(...held).toFixed(2) };
  });

  it('regripping M1 refreshes the air jump but never carries the player toward the ledge', () => {
    const placed = nailedM1(1, 0)!;
    const wait = gripWaits(placed, [72, 80, 88, 96])[0];
    let r = [8, 12, 16, 20, 24, 28, 999].map(second => leapToGrip(placed, 'l3-bar-m1', { wait, second })).find(Boolean)!;
    r = r.fork().go({}, [{ type: 'recall' }]);
    let furthest = -Infinity; let regrips = 0;
    // Each cycle searches waits/air-jump timings for a real E regrip of M1.
    for (let cycle = 0; cycle < 5; cycle++) {
      let next: Run | null = null;
      for (const [wait, jump] of grid([0, 6, 12, 18, 24, 30, 40, 50, 60], [1, 4, 8, 12, 999])) {
        const t = r.fork();
        for (let f = 0; f < wait; f++) t.go({ axis: Math.sign(t.m.movement.swing!.omega) || 1 });
        t.go({ jumpPressed: true, jumpHeld: true });
        for (let f = 1; f < 90 && t.m.move.state !== 'swing' && !t.failed; f++) {
          const g = t.grip('l3-bar-m1');
          const close = !!g && Math.hypot(t.cx - g.x, t.cy - g.y) <= 1.95;
          t.go({ axis: 1, jumpPressed: f === jump, jumpHeld: f >= jump && f < jump + 14, interactPressed: close });
          furthest = Math.max(furthest, t.body.x + t.body.width);
        }
        if (t.m.move.state === 'swing') { next = t; break; }
      }
      if (!next) break;
      r = next; regrips++;
    }
    expect(regrips).toBeGreaterThan(2);
    expect(r.m.completed).toBe(false);
    expect(furthest).toBeLessThan(ledge.x - 4);
    rows.regrip = { regrips, furthestRightEdge: +furthest.toFixed(2) };
  });

  it('recalling the current grip forces a detach with no new jump and a local retry', () => {
    const placed = nailedM1(1, 0)!;
    const wait = gripWaits(placed, [72, 80, 88, 96])[0];
    const onM1 = [8, 12, 16, 20, 24, 28, 999].map(second => leapToGrip(placed, 'l3-bar-m1', { wait, second })).find(Boolean)!;
    const r = onM1.fork().go({}, [{ type: 'recall' }]).go({}, [{ type: 'recall' }]);
    expect(r.m.move.state).toBe('normal'); expect(r.m.availableNails).toBe(2);
    expect(r.m.controller.airJumpAvailable).toBe(false);
    let frames = 0;
    while (r.m.recoveryRemaining <= 0 && frames < 300) { r.go(); frames++; }
    while (r.m.recoveryRemaining > 0) { r.go(); frames++; }
    expect(r.body).toMatchObject({ x: 17.2, y: 49.5 });
    rows.missedTransferRetry = { framesFromDetachToControl: frames, seconds: +(frames / 60).toFixed(2) };
  });
});

describe('S4B terminal ledge', () => {
  it('commits only on a grounded landing; R, falls and re-entry stay on the end ledge', () => {
    const m = fresh();
    m.controller.respawn(60, 54.2); m.controller.body.vy = 3; tick(m); expect(m.completed).toBe(false);
    m.controller.respawn(60, 54); tick(m);
    expect(m.stage).toBe('exit'); expect(m.completed).toBe(true); expect(m.availableNails).toBe(2);
    expect(m.surfaceRefusal('l3-bar-m2', 0.5)).toBe('Not part of this section.');
    m.enqueue({ type: 'place-at', surfaceId: 'l3-bar-m2', offset: 0.5 }); tick(m, { restartPressed: true });
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect(m.session.queue).toEqual([]);
    for (let f = 0; f < 200 && m.recoveryRemaining <= 0; f++) tick(m, { axis: 1 });
    for (let f = 0; f < 30; f++) tick(m);
    expect(m.controller.body.y).toBe(54); expect(m.completed).toBe(true);
    const n = fresh(); n.restoreSession(m.session); expect(n.completed).toBe(true); expect(n.controller.body).toMatchObject({ x: 59, y: 54 });
    n.restartAdventure(); expect(n.controller.body.x).toBe(17.2); expect(n.completed).toBe(false);
  });

  it('earlier presets keep marked targets and no surfaces', () => {
    expect(sketchLayerThreeWalls.surfaces).toBeUndefined();
    expect(sketchLayerThreeWalls.legs[0].surfaceIds).toBeUndefined();
    const walls = new SketchRouteModel(sketchLayerThreeWalls, sketchTuning); tick(walls);
    expect(walls.surfaceViews()).toEqual([]);
    expect(walls.hud().nearest).not.toContain('wood');
  });
});

