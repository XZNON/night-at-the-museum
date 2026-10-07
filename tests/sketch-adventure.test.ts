import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SketchRouteModel, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchJoinedRoute } from '../src/levels/unfinished-sketch-layer2';
import { sketchAdventure as route, sketchLayerThree, sketchLayersOneToThree } from '../src/levels/unfinished-sketch-layer3';
import { isSketchStudy, sketchStudies, sketchTuning } from '../src/levels/unfinished-sketch';
import { UnfinishedSketchScene } from '../src/scenes/unfinished-sketch';
import { climb } from './sketch-layer3-climb';
import { Run, cross, tick as frame } from './sketch-layer3-swings-route';

// S5A: the sun on the end ledge of the accepted full route. Layer 1/2
// boundaries use the S3/S4D fixture style; from the second arrival on, the
// accepted input-only climb and crossing play, and the last steps to the sun
// are plain walking. The crossing search runs on the S4D preset (its harness
// treats a non-completing landing as a failure) and its frames are replayed
// into the adventure, which behaves identically up to the ledge.
const fresh = (field = route) => new SketchRouteModel(field, sketchTuning);
const tick = (m: SketchRouteModel, n = 1, input: Partial<Controls> = {}) => {
  for (let i = 0; i < n; i++) m.update(1 / 60, { ...idleControls(), ...input });
};
const rows: Record<string, unknown> = {};
afterAll(() => {
  mkdirSync('docs/validation/sketch-s5/s5a', { recursive: true });
  writeFileSync('docs/validation/sketch-s5/s5a/unit-measurements.json', JSON.stringify(rows, null, 2));
});

const exit = (m: SketchRouteModel) => {
  m.controller.respawn(m.leg.exitSpawn.x, m.leg.exitSpawn.y); tick(m, 2);
  expect(m.stage).toBe('exit');
};
const board = (m: SketchRouteModel) => {
  const deck = m.leg.lift!.deck;
  const axis = deck.x + deck.width / 2 > m.controller.body.x ? 1 : -1;
  for (let i = 0; i < 2400 && m.stage === 'exit'; i++) tick(m, 1, { axis });
  expect(m.inTransit).toBe(true);
};
const ride = (m: SketchRouteModel) => { for (let i = 0; i < 900 && m.inTransit; i++) tick(m); };
const secondArrival = (field = route) => {
  const m = fresh(field); tick(m, 2);
  exit(m); board(m); ride(m); exit(m); board(m); ride(m);
  expect(m.legId).toBe('l3-walls');
  return m;
};
const onSwings = (field = route) => { const m = secondArrival(field); m.controller.respawn(16, 49.5); tick(m); expect(m.legId).toBe('l3-swings'); return m; };
/** Fixture: land on the end ledge (the checkpoint spawns at x 59). */
const onLedge = (field = route) => { const m = onSwings(field); m.controller.respawn(60, 54); tick(m); expect(m.stage).toBe('exit'); return m; };
/** Walk right from the ledge spawn until the sun is taken. */
const walkToSun = (m: SketchRouteModel) => {
  let frames = 0;
  for (; frames < 240 && !m.sunCollected; frames++) tick(m, 1, { axis: 1 });
  return frames;
};
const recover = (m: SketchRouteModel) => { for (let f = 0; f < 60 && m.recoveryRemaining > 0; f++) tick(m); };
const pose = (m: SketchRouteModel) => m.mechanismView().map(v => [v.id, +v.x.toFixed(6), +v.y.toFixed(6), +v.angle.toFixed(6), v.vx, v.vy]);

describe('S5A composition', () => {
  it('clones the accepted full route leg by leg and adds only texts and the sun', () => {
    expect(route.id).toBe('adventure');
    expect(sketchStudies).toEqual(['mechanics', 'layer-1', 'layer-2', 'layers-1-2', 'layer-3-walls', 'layer-3-swings', 'layer-3', 'layers-1-3', 'adventure']);
    expect(isSketchStudy('adventure')).toBe(true);
    // Same accepted challenge data; legs are copies with identical contents.
    for (const key of ['solids', 'mechanisms', 'targets', 'surfaces', 'hazards', 'sections', 'sectionOrder', 'layers', 'guides', 'entryLegId', 'deathY', 'hint', 'sectionBlend', 'camera', 'bounds', 'goalBounds'] as const) {
      expect(route[key], key).toEqual(sketchLayersOneToThree[key]);
    }
    expect(route.legs).toEqual(sketchLayersOneToThree.legs);
    route.legs.forEach((leg, i) => expect(leg).not.toBe(sketchLayersOneToThree.legs[i]));
    expect(route.spawn).not.toBe(sketchLayersOneToThree.spawn);
    // The older preset gains nothing and keeps its review texts.
    expect(sketchLayersOneToThree.sun).toBeUndefined();
    expect(sketchLayersOneToThree.id).toBe('layers-1-3');
    expect(sketchLayersOneToThree.goal).toContain('Stop for S4D review');
    expect([sketchLayerThree.sun, sketchJoinedRoute.sun]).toEqual([undefined, undefined]);
    // Player-facing texts only.
    const texts = [route.name, route.goal, route.hint, ...route.legs.flatMap(l => [l.hint ?? '', l.arrivalCue ?? '']),
      route.sun!.ledgeCue, route.sun!.ledgeHint, route.sun!.cue, route.sun!.doneHint, route.sun!.endpoint];
    for (const text of texts) expect(text).not.toMatch(/S[0-9][A-D]?\b|review|endpoint/i);
    // On the end ledge, toward its right end and clear of the ledge spawn.
    const ledge = route.solids.find(s => s.id === 'l3-swings-ledge')!;
    const sun = route.sun!; const terminal = route.legs.at(-1)!;
    expect([terminal.id, terminal.lift, terminal.nextLegId]).toEqual(['l3-swings', null, undefined]);
    expect(sun.y).toBe(ledge.y + ledge.height);
    expect(sun.x).toBeGreaterThanOrEqual(ledge.x); expect(sun.x + sun.width).toBeLessThanOrEqual(ledge.x + ledge.width);
    expect(sun.x).toBeGreaterThan(terminal.exitSpawn.x + 0.65 + 2);
    rows.sun = { rect: { x: sun.x, y: sun.y, width: sun.width, height: sun.height }, ledge: `x${ledge.x}..${ledge.x + ledge.width}, top ${ledge.y + ledge.height}`, spawn: terminal.exitSpawn };
  });
});

describe('S5A full route to the sun (input only from the second arrival)', () => {
  it('climbs and crosses with real inputs; the swing onto the end ledge takes the sun once', () => {
    // Search on the S4D preset, as S4D's own test does.
    const start = secondArrival(sketchLayersOneToThree);
    const prefix = new Run(start);
    for (let f = 0; f < 200 && prefix.body.x < 4.2; f++) prefix.go({ axis: 1 });
    for (let f = 0; f < 10; f++) prefix.go();
    const r = climb({ model: prefix.m });
    expect(r.log.at(-1), r.log.join(' ')).toBe('handoff');
    const run = new Run(r.m); run.frames.push(...prefix.frames, ...r.frames);
    while (run.body.x < 16.8) run.go({ axis: 1 });
    for (let f = 0; f < 10; f++) run.go();
    const result = cross({ f: 1, m1: 0, m2: 1, first: true }, run);
    expect(result.stage).toBe('done');
    // Replay into the adventure. This release coasts far enough right that the
    // player flies through the sun before touching down: taken in the air,
    // then the landing stays where it is (no snap to the ledge spawn).
    const m = secondArrival();
    let reports = 0; let taken: { frame: number; x: number; y: number; grounded: boolean; stage: string } | null = null;
    result.run!.frames.forEach((f, i) => {
      frame(m, f);
      if (m.consumeSunTouch()) { reports++; taken ??= { frame: i, x: +m.controller.body.x.toFixed(3), y: +m.controller.body.y.toFixed(3), grounded: m.controller.body.grounded, stage: m.stage }; }
    });
    expect(reports).toBe(1);
    expect(taken!.grounded).toBe(false);
    for (let f = 0; f < 60 && !m.controller.body.grounded; f++) tick(m);
    expect(m.controller.body.y).toBe(54);
    expect(m.controller.body.x).toBeGreaterThan(route.sun!.x - 0.65);
    tick(m, 120, { axis: -1 }); expect(m.consumeSunTouch()).toBe(false);
    expect([m.stage, m.completed, m.isSettled, m.placedCount, m.availableNails]).toEqual(['exit', true, true, 0, 2]);
    expect(m.cue).toBe(route.sun!.cue);
    const hud = m.hud();
    expect([hud.endpoint, hud.hint, hud.completed]).toEqual([route.sun!.endpoint, route.sun!.doneHint, true]);
    rows.fullRoute = {
      replayFrames: result.run!.frames.length, replaySeconds: +(result.run!.frames.length / 60).toFixed(2),
      takenInFlight: taken,
      climbLog: r.log, crossParams: (result as { params?: unknown }).params,
    };
  });
});

describe('S5A taking the sun', () => {
  it('settles every moving mechanism in place with zero velocity, and keeps it settled', () => {
    const m = onLedge(); tick(m, 37);
    // Mechanisms still move until the sun is taken.
    const moving = pose(m); tick(m, 10); expect(pose(m)).not.toEqual(moving);
    walkToSun(m);
    const settled = pose(m);
    expect(m.mechanismView().every(v => v.vx === 0 && v.vy === 0)).toBe(true);
    // Settling pins nothing: outlines stay outlines, only time stops.
    expect(m.mechanismView().some(v => v.pinned)).toBe(false);
    const time = m.routeTime;
    tick(m, 20, { axis: -1 }); tick(m, 30);
    tick(m, 1, { jumpPressed: true, jumpHeld: true }); tick(m, 20, { jumpHeld: true }); tick(m, 90);
    expect(pose(m)).toEqual(settled); expect(m.routeTime).toBe(time);
    // The ledge is fixed ground: walking and jumping on it never harm the player.
    expect(m.recoveryRemaining).toBe(0); expect(m.controller.body.y).toBe(54);
    rows.settle = { settledAt: +time.toFixed(4), mechanisms: settled.length, movingAfter: 0 };
  });

  it('clears attachments and commands; nails cannot be placed afterwards', () => {
    const m = onLedge();
    m.enqueue({ type: 'place-at', surfaceId: 'l3-bar-m2', offset: 0.5 }); m.enqueue({ type: 'recall' });
    walkToSun(m);
    expect(m.session.queue).toEqual([]); expect(m.move.state).toBe('normal'); expect(m.movement.swing).toBeNull();
    m.enqueue({ type: 'place-at', surfaceId: 'l3-bar-m2', offset: 0.5 }); m.enqueue({ type: 'place', targetId: 'l3-wall-f-pin' }); tick(m);
    expect(m.placedCount).toBe(0);
  });

  it('taken from the air, the end ledge rules apply at once and the player lands on the ledge', () => {
    const m = onSwings();
    const sun = route.sun!;
    // Fixture: drop the body through the sun from above while still crossing.
    m.controller.respawn(sun.x + 0.3, sun.y + 2.2);
    for (let f = 0; f < 60 && !m.sunCollected; f++) tick(m);
    expect(m.sunCollected).toBe(true);
    expect([m.stage, m.completed, m.consumeSunTouch()]).toEqual(['exit', true, true]);
    for (let f = 0; f < 60 && !m.controller.body.grounded; f++) tick(m);
    expect(m.controller.body.y).toBe(54); expect(m.consumeSunTouch()).toBe(false);
  });

  it('R, a fall and re-entry after the sun stay on the ledge with the sun taken; no second report', () => {
    const m = onLedge(); walkToSun(m); expect(m.consumeSunTouch()).toBe(true);
    const settled = pose(m);
    tick(m, 1, { restartPressed: true });
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect(m.cue).toBe('Back on the end ledge.');
    expect([m.sunCollected, m.completed, m.stage]).toEqual([true, true, 'exit']); expect(pose(m)).toEqual(settled);
    // Walking back over the sun's spot reports nothing again.
    walkToSun(m); for (let f = 0; f < 60; f++) tick(m, 1, { axis: 1 });
    expect(m.consumeSunTouch()).toBe(false);
    // Off the right end of the ledge: a fall returns to the ledge.
    for (let f = 0; f < 300 && m.recoveryRemaining <= 0; f++) tick(m, 1, { axis: 1 });
    expect(m.cue).toBe('Off the ledge. Back onto the end ledge…');
    recover(m); tick(m, 5);
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect([m.sunCollected, m.completed]).toEqual([true, true]);
    expect(pose(m)).toEqual(settled); expect(m.consumeSunTouch()).toBe(false);
    // Re-entry: same ledge, sun taken, same settled pose, no report.
    const snap = m.session;
    expect(snap).toMatchObject({ routeId: 'adventure', legId: 'l3-swings', stage: 'exit', sunCollected: true });
    const n = fresh(); n.restoreSession(snap);
    expect(n.controller.body).toMatchObject({ x: 59, y: 54 });
    expect([n.legId, n.stage, n.sunCollected, n.completed, n.isSettled]).toEqual(['l3-swings', 'exit', true, true, true]);
    expect(pose(n)).toEqual(settled); expect(n.consumeSunTouch()).toBe(false);
    walkToSun(n); tick(n, 60, { axis: 1 }); expect(n.consumeSunTouch()).toBe(false);
    expect(n.hud().endpoint).toBe(route.sun!.endpoint);
    // Restart the Sketch: a fresh model at Layer 1 with the sun back.
    n.restartAdventure();
    expect(n.controller.body).toMatchObject({ x: 1.5, y: 0 });
    expect([n.legId, n.stage, n.completed, n.sunCollected, n.isSettled]).toEqual(['layer-1', 'traversal', false, false, false]);
  });

  it('the ledge before the sun is a safe checkpoint: R, a fall and re-entry keep it', () => {
    const m = onLedge();
    expect([m.completed, m.sunCollected, m.consumeSunTouch()]).toEqual([false, false, false]);
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 });
    expect(m.cue).toBe(route.sun!.ledgeCue);
    const hud = m.hud();
    expect([hud.endpoint, hud.hint, hud.checkpoint]).toEqual(['', route.sun!.ledgeHint, 'Checkpoint / the end ledge']);
    tick(m, 1, { restartPressed: true }); expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect(m.stage).toBe('exit');
    for (let f = 0; f < 300 && m.recoveryRemaining <= 0; f++) tick(m, 1, { axis: -1 });
    recover(m); tick(m, 5);
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect([m.completed, m.sunCollected]).toEqual([false, false]);
    const n = fresh(); n.restoreSession(m.session);
    expect([n.legId, n.stage, n.completed, n.sunCollected, n.controller.body.x]).toEqual(['l3-swings', 'exit', false, false, 59]);
    const walk = walkToSun(n); expect([n.sunCollected, n.consumeSunTouch()]).toEqual([true, true]);
    rows.walkFromLedgeSpawn = { frames: walk, seconds: +(walk / 60).toFixed(2), takenAtX: +n.controller.body.x.toFixed(3) };
  });

  it('a scene reports the sun through its callback exactly once per scene life', () => {
    // The scene's wall letters draw into a 2D canvas; a no-op stand-in is enough here.
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const g = globalThis as { document?: unknown };
    const hadDocument = 'document' in g;
    if (!hadDocument) g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
    let reports = 0;
    const image = { width: 64, height: 68 } as HTMLImageElement;
    const ledge = onLedge().session;
    const scene = new UnfinishedSketchScene({ kind: 'route', field: route, session: ledge }, sketchTuning, image,
      () => {}, () => {}, undefined, () => {}, () => { reports++; });
    const step = (input: Partial<Controls> = {}) => scene.fixedUpdate(1 / 60, { ...idleControls(), ...input });
    for (let f = 0; f < 240 && reports === 0; f++) step({ axis: 1 });
    expect(reports).toBe(1);
    step({ restartPressed: true });
    for (let f = 0; f < 240; f++) step({ axis: f < 120 ? 1 : -1 });
    expect(reports).toBe(1);
    let saved: SketchRouteSession | null = null;
    const exiting = new UnfinishedSketchScene({ kind: 'route', field: route, session: scene.routeModel!.session }, sketchTuning, image,
      () => {}, s => { saved = s as SketchRouteSession; }, undefined, () => {}, () => { reports++; });
    for (let f = 0; f < 240; f++) exiting.fixedUpdate(1 / 60, { ...idleControls(), axis: 1 });
    exiting.exit();
    expect(reports).toBe(1); expect(saved).toMatchObject({ routeId: 'adventure', sunCollected: true });
    scene.dispose(); exiting.dispose();
    if (!hadDocument) delete g.document;
  });
});

describe('S5A ownership and older studies', () => {
  it('refuses foreign, impossible and malformed snapshots by restarting at Layer 1', () => {
    const ledge = onLedge().session; const crossing = onSwings().session;
    const s4d = onLedge(sketchLayersOneToThree).session;
    const bad = [
      s4d, { ...ledge, routeId: undefined }, { ...ledge, routeId: 'layers-1-3' },
      { ...crossing, sunCollected: true }, { ...ledge, legId: 'l3-walls', sunCollected: true },
      { ...ledge, stage: 'transit', sunCollected: true }, { ...ledge, sunCollected: 'yes' },
      { ...ledge, sunCollected: true, elapsed: Number.NaN },
    ];
    for (const s of bad) {
      const m = fresh(); m.restoreSession(s as unknown as SketchRouteSession);
      expect(m.controller.body, JSON.stringify(s)).toMatchObject({ x: 1.5, y: 0 });
      expect([m.legId, m.stage, m.sunCollected, m.isSettled]).toEqual(['layer-1', 'traversal', false, false]);
    }
    // The S4D study refuses an adventure snapshot, sun or not.
    const done = onLedge(); walkToSun(done);
    for (const s of [ledge, done.session]) {
      const m = fresh(sketchLayersOneToThree); m.restoreSession(s);
      expect([m.legId, m.controller.body.x]).toEqual(['layer-1', 1.5]);
    }
    // A crossing snapshot of the adventure itself restores at the swing start.
    const m = fresh(); m.restoreSession(crossing);
    expect([m.legId, m.stage, m.controller.body.x, m.controller.body.y]).toEqual(['l3-swings', 'traversal', 17.2, 49.5]);
    rows.refusedSnapshots = bad.length + 2;
  });

  it('the S4D study keeps its endpoint, texts and snapshot shape', () => {
    const m = onLedge(sketchLayersOneToThree);
    expect(m.completed).toBe(true);
    expect(m.cue).toBe('S4D endpoint. Layers 1–3 complete: landed on the fixed end ledge.');
    expect(m.hud().endpoint).toBe('S4D endpoint reached · Layers 1–3 complete · Stop for review');
    expect(m.hud().checkpoint).toBe('Checkpoint / l3-swings clear');
    expect('sunCollected' in m.session).toBe(false);
    // Walking over the adventure's sun spot does nothing here; mechanisms keep moving.
    for (let f = 0; f < 120; f++) tick(m, 1, { axis: 1 });
    expect([m.sunCollected, m.isSettled, m.consumeSunTouch()]).toEqual([false, false, false]);
    const before = pose(m); tick(m, 10); expect(pose(m)).not.toEqual(before);
    tick(m, 1, { restartPressed: true });
    expect(m.cue).toBe('Back at the safe exit checkpoint.');
  });
});
