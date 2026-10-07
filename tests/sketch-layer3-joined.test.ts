import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SketchRouteModel, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchLayerThree as route, sketchLayerThreeSwings, sketchLayerThreeWalls } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning, type SketchTuning } from '../src/levels/unfinished-sketch';
import { climb } from './sketch-layer3-climb';
import { Run, cross, replay } from './sketch-layer3-swings-route';

// S4C: the accepted S4A climb and S4B crossing joined in one Layer 3. Route
// feasibility reuses the two input-only harnesses; nothing edits the body or
// movement state there. Boundary fixtures below say so where they place the body.
const fresh = () => new SketchRouteModel(route, sketchTuning);
const tick = (m: SketchRouteModel, input: Partial<Controls> = {}) => m.update(1 / 60, { ...idleControls(), ...input });
/** Read-only look at the movement tuning in force (private in the model). */
const feel = (m: SketchRouteModel) => (m.movement as unknown as { tuning: SketchTuning }).tuning;
const rows: Record<string, unknown> = {};
afterAll(() => {
  mkdirSync('docs/validation/sketch-s4/s4c', { recursive: true });
  writeFileSync('docs/validation/sketch-s4/s4c/unit-measurements.json', JSON.stringify(rows, null, 2));
});

/** The climb with real inputs, stopped on the handoff tick. */
const climbed = () => {
  const r = climb({ field: route });
  expect(r.log.at(-1), r.log.join(' ')).toBe('handoff');
  return r;
};

describe('S4C composition', () => {
  it('composes the accepted presets by stable IDs with no duplicate or stacked copies', () => {
    for (const list of [route.solids, route.mechanisms, route.targets, route.surfaces!, route.hazards, route.legs]) {
      const ids = list.map(x => x.id);
      expect(new Set(ids).size, ids.join(',')).toBe(ids.length);
    }
    // One shared ledge: the climb's exit collider is the crossing's start ground.
    expect(route.solids.filter(s => s.id === 'l3-walls-exit')).toHaveLength(1);
    const ledge = route.solids.find(s => s.id === 'l3-walls-exit')!;
    expect({ x: ledge.x, top: ledge.y + ledge.height, right: ledge.x + ledge.width }).toEqual({ x: 13.2, top: 49.5, right: 22 });
    expect(route.legs.map(l => [l.id, l.nextLegId ?? null, !!l.escalator])).toEqual([['l3-walls', 'l3-swings', false], ['l3-swings', null, false]]);
    expect(route.legs[0].exitBounds).toEqual(sketchLayerThreeWalls.legs[0].exitBounds);
    expect(route.legs[1].exitBounds).toEqual(sketchLayerThreeSwings.legs[0].exitBounds);
    expect(route.sections['l3-walls']).toEqual(sketchLayerThreeWalls.sections['l3-walls']);
    expect(route.sections['l3-swings']).toEqual(sketchLayerThreeSwings.sections['l3-swings']);
    // Field-level feel is empty; each section owns its accepted values.
    expect([route.wall, route.placementReach, route.nailPickup, route.airCoast]).toEqual([undefined, undefined, undefined, undefined]);
    expect(route.legs[0].settings).toEqual({ wall: sketchLayerThreeWalls.wall, placementReach: 11, nailPickup: sketchLayerThreeWalls.nailPickup, airCoast: true });
    expect(route.legs[1].settings).toEqual({ airCoast: true });
    // The isolated presets carry no leg overrides, so they keep their field values.
    expect([...sketchLayerThreeWalls.legs, ...sketchLayerThreeSwings.legs].every(l => !l.settings && !l.nextLegId)).toBe(true);
  });

  it('each section uses its own reach, wall feel, pickup and placement mode; isolated presets are unchanged', () => {
    const m = fresh(); tick(m);
    expect(m.controller.body).toMatchObject({ x: 4.2, y: 24.4 });
    expect([m.legId, m.placementReach, !!m.nailPickup, m.freePlacement, m.nailBudget]).toEqual(['l3-walls', 11, true, false, 2]);
    expect(feel(m).wall).toEqual({ ...sketchTuning.wall, ...sketchLayerThreeWalls.wall });
    expect(m.surfaceRefusal('l3-strip-f', 0.5)).toBe('Not part of this section.');
    expect(m.targetViews().find(v => v.id === 'l3-wall-a-pin')!.reason).toBe('');
    const walls = new SketchRouteModel(sketchLayerThreeWalls, sketchTuning); tick(walls);
    expect([walls.placementReach, !!walls.nailPickup, walls.freePlacement]).toEqual([11, true, false]);
    expect(feel(walls).wall).toEqual(feel(m).wall);
    const swings = new SketchRouteModel(sketchLayerThreeSwings, sketchTuning); tick(swings);
    expect([swings.placementReach, !!swings.nailPickup, swings.freePlacement]).toEqual([10, false, true]);
    expect(feel(swings)).toBe(sketchTuning);
    rows.sections = {
      walls: { reach: m.placementReach, wall: feel(m).wall, pickup: m.nailPickup },
      swings: { reach: swings.placementReach, wall: feel(swings).wall, pickup: null },
    };
  });
});

describe('S4C grounded handoff', () => {
  it('the real climb hands over once on the ledge, in place, with two nails and nothing completed', () => {
    const r = climbed(); const m = r.m;
    const landing = { ...m.controller.body };
    expect(m.legId).toBe('l3-swings'); expect(m.stage).toBe('traversal'); expect(m.sectionId).toBe('l3-swings');
    expect(m.completed).toBe(false); expect(m.recoveryRemaining).toBe(0);
    expect(m.nailBudget).toBe(2); expect(m.pickupCollected).toBe(false); expect(m.availableNails).toBe(2); expect(m.session.queue).toEqual([]);
    expect(m.move.state).toBe('normal'); expect(m.movement.swing).toBeNull(); expect(m.routeTime).toBe(0);
    expect(landing.y).toBe(49.5); expect(landing.x).toBeGreaterThanOrEqual(13.2 - landing.width); expect(landing.x).toBeLessThanOrEqual(22);
    expect([landing.vx, landing.vy]).toEqual([0, 0]);
    expect(m.cue).toBe('Wall climb clear. The third nail is taken back: two nails for the swing crossing.');
    expect([m.placementReach, m.nailPickup, m.freePlacement]).toEqual([10, undefined, true]);
    expect(feel(m)).toBe(sketchTuning);
    // Ownership flips: the climb's rings are another section's now.
    expect(m.targetViews().filter(v => v.id.startsWith('l3-wall-')).every(v => v.reason === 'Another layer.')).toBe(true);
    expect(m.surfaceRefusal('l3-strip-f', 0.5)).not.toBe('Not part of this section.');
    const hud = m.hud();
    expect(hud.endpoint).toBe(''); expect(hud.layer).toBe('3 / 3 · Layer 3 swings'); expect(hud.checkpoint).toBe('Checkpoint / l3-swings start');
    expect(hud.hint).toBe(sketchLayerThreeSwings.hint);
    // Walking back over the ledge, jumping and landing again never recommits.
    for (let f = 0; f < 40; f++) tick(m, { axis: -1 });
    tick(m, { jumpPressed: true, jumpHeld: true }); for (let f = 0; f < 80 && !(m.controller.body.grounded && f > 5); f++) tick(m, { jumpHeld: f < 12 });
    for (let f = 0; f < 40; f++) tick(m, { axis: 1 });
    expect(m.legId).toBe('l3-swings'); expect(m.nailBudget).toBe(2); expect(m.completed).toBe(false);
    rows.handoff = { log: r.log, frames: r.frames.length, seconds: +(r.frames.length / 60).toFixed(2), landing: { x: landing.x, y: landing.y } };
  });

  it('the full joined route completes with real inputs and replays from a fresh model', () => {
    const r = climbed();
    const run = new Run(r.m); run.frames.push(...r.frames);
    // Walk toward the crossing start: F's far end is in reach from there.
    while (run.body.x < 16.8) run.go({ axis: 1 });
    for (let f = 0; f < 10; f++) run.go();
    const result = cross({ f: 1, m1: 0, m2: 1, first: true }, run);
    expect(result.stage).toBe('done');
    const m = replay(result.run!.frames, route);
    expect(m.completed).toBe(true); expect(m.stage).toBe('exit'); expect(m.legId).toBe('l3-swings');
    expect(m.availableNails).toBe(2); expect(m.session.queue).toEqual([]);
    expect(m.hud().endpoint).toBe('S4C endpoint reached · Wall climb and swing crossing clear · Stop for review');
    const climbOrder = r.frames.flatMap(f => f.cmds.map(c => c.type === 'recall' ? 'Q' : c.type === 'place' ? c.targetId.split('-')[2].toUpperCase() : '?'));
    const crossOrder = result.run!.frames.slice(r.frames.length).flatMap(f => f.cmds.map(c => c.type === 'recall' ? 'Q' : c.type === 'place-at' ? c.surfaceId.slice(-2).replace('-', '').toUpperCase() : '?'));
    expect(crossOrder).toEqual(['F', 'M1', 'Q', 'M2', 'Q']);
    rows.fullRoute = {
      frames: result.run!.frames.length, seconds: +(result.run!.frames.length / 60).toFixed(2),
      climbFrames: r.frames.length, crossParams: (result as { params?: unknown }).params, climbOrder, crossOrder,
    };
  });

  it('an airborne overlap never commits; a grounded landing commits where it lands (unit fixtures)', () => {
    // Fixtures place the body directly; they test the boundary, not the route.
    const m = fresh(); tick(m);
    m.controller.respawn(16, 49.6); m.controller.body.vy = 3; tick(m);
    expect(m.legId).toBe('l3-walls');
    const n = fresh(); tick(n); runPickup(n); expect(n.nailBudget).toBe(3);
    n.place('l3-wall-a-pin');
    n.controller.respawn(15.4, 49.5);
    // Commands queued for the landing tick drain first; nothing survives the handoff.
    n.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 1 }); n.enqueue({ type: 'recall' });
    tick(n, { axis: 1, jumpHeld: true });
    expect(n.legId).toBe('l3-swings'); expect(n.controller.body.x).toBeCloseTo(15.4, 0); expect(n.controller.body.y).toBe(49.5);
    expect(n.session.queue).toEqual([]); expect(n.nailBudget).toBe(2); expect(n.pickupCollected).toBe(false);
    // A held jump carries no press across the boundary.
    tick(n, { jumpHeld: true }); expect(n.controller.body.vy).toBeLessThanOrEqual(0); expect(n.controller.body.grounded).toBe(true);
  });
});

/** Run over the third-nail pickup and stop. */
function runPickup(m: SketchRouteModel) { for (let f = 0; f < 200 && m.controller.body.x < 8.6; f++) tick(m, { axis: 1 }); for (let f = 0; f < 20; f++) tick(m); }

describe('S4C section recovery', () => {
  const onSwings = () => { const m = fresh(); tick(m); m.controller.respawn(16, 49.5); tick(m); expect(m.legId).toBe('l3-swings'); return m; };

  it('glue during the crossing returns to the swing start with two nails and the climb kept', () => {
    const m = onSwings();
    let frames = 0;
    while (m.recoveryRemaining <= 0 && frames < 300) { tick(m, { axis: 1 }); frames++; }
    expect(m.cue).toBe('Glue! Quick retry.');
    while (m.recoveryRemaining > 0) tick(m);
    expect(m.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(m.legId).toBe('l3-swings');
    expect(m.nailBudget).toBe(2); expect(m.session.queue).toEqual([]); expect(m.completed).toBe(false);
    expect(m.cue).toBe('Swing crossing reset. Two nails available. The climb stays clear.');
    rows.glueRetry = { framesToGlue: frames };
  });

  it('R with queued commands retries the crossing; Restart returns to the Layer 3 entrance with the pickup back', () => {
    const m = onSwings();
    m.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 }); tick(m); expect(m.placedCount).toBe(1);
    m.enqueue({ type: 'recall' }); m.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 });
    tick(m, { restartPressed: true, jumpPressed: true, axis: 1 });
    expect(m.controller.body).toMatchObject({ x: 17.2, y: 49.5, vx: 0, vy: 0 }); expect(m.session.queue).toEqual([]);
    expect(m.legId).toBe('l3-swings'); expect(m.routeTime).toBe(0);
    m.restartAdventure();
    expect(m.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(m.legId).toBe('l3-walls');
    expect(!!m.nailPickup && !m.pickupCollected).toBe(true); expect(m.placementReach).toBe(11);
    expect(feel(m).wall.grip).toBe(0.9);
  });

  it('a fall during the climb restarts the climb and names the pickup', () => {
    const m = fresh(); tick(m); runPickup(m);
    for (let f = 0; f < 240 && m.recoveryRemaining <= 0; f++) tick(m, { axis: 1 });
    expect(m.cue).toBe('Nothing under you. Layer 3 restarts; pick up the third nail again…');
    while (m.recoveryRemaining > 0) tick(m);
    expect(m.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(m.nailBudget).toBe(2); expect(m.legId).toBe('l3-walls');
  });

  it('leave/re-entry: climb snapshots restart the climb, crossing snapshots restart the crossing', () => {
    const climbing = fresh(); tick(climbing); runPickup(climbing); climbing.place('l3-wall-a-pin');
    const a = fresh(); a.restoreSession(climbing.session);
    expect(a.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(a.legId).toBe('l3-walls'); expect(a.nailBudget).toBe(2); expect(a.session.queue).toEqual([]);
    const crossing = onSwings(); crossing.place('l3-wall-a-pin');
    crossing.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 }); tick(crossing); expect(crossing.placedCount).toBe(1);
    const b = fresh(); b.restoreSession(crossing.session);
    expect(b.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(b.legId).toBe('l3-swings'); expect(b.session.queue).toEqual([]);
    expect([b.placementReach, b.nailPickup, b.freePlacement, b.completed]).toEqual([10, undefined, true, false]);
    expect(feel(b)).toBe(sketchTuning);
  });

  it('refuses foreign, malformed and impossible snapshots by restarting at the entrance', () => {
    const crossing = onSwings().session;
    const bad = [
      { ...crossing, routeId: 'layer-3-swings' }, { ...crossing, routeId: 'layer-3-walls' }, { ...crossing, routeId: undefined },
      { ...crossing, entryLegId: 'l3-swings' }, { ...crossing, legId: 'layer-2' }, { ...crossing, stage: 'transit' },
      { ...crossing, stage: 'arrival' }, { ...crossing, elapsed: Number.NaN }, { ...crossing, sequence: Number.POSITIVE_INFINITY },
      // The climb never rests at its exit in the joined preset.
      { ...crossing, legId: 'l3-walls', stage: 'exit' },
    ];
    for (const s of bad) {
      const m = fresh(); m.restoreSession(s as SketchRouteSession);
      expect(m.controller.body, JSON.stringify(s)).toMatchObject({ x: 4.2, y: 24.4 }); expect(m.legId).toBe('l3-walls'); expect(m.stage).toBe('traversal');
    }
    // Isolated studies keep their own rules for a joined snapshot.
    const walls = new SketchRouteModel(sketchLayerThreeWalls, sketchTuning); walls.restoreSession(crossing);
    expect(walls.controller.body).toMatchObject({ x: 4.2, y: 24.4 });
    const swings = new SketchRouteModel(sketchLayerThreeSwings, sketchTuning); swings.restoreSession(crossing);
    expect(swings.controller.body).toMatchObject({ x: 17.2, y: 49.5 });
    const swingsSnap = new SketchRouteModel(sketchLayerThreeSwings, sketchTuning).session;
    const m = fresh(); m.restoreSession(swingsSnap); expect(m.controller.body).toMatchObject({ x: 4.2, y: 24.4 });
  });

  it('the end ledge is terminal: R, a fall and re-entry stay there; Restart goes to the entrance (unit fixture)', () => {
    const m = onSwings();
    m.controller.respawn(60, 54.2); m.controller.body.vy = 3; tick(m); expect(m.completed).toBe(false);
    m.controller.respawn(60, 54); tick(m);
    expect(m.stage).toBe('exit'); expect(m.completed).toBe(true);
    expect(m.cue).toBe('S4C endpoint. Layer 3 crossed: landed on the fixed end ledge.');
    m.enqueue({ type: 'place-at', surfaceId: 'l3-bar-m2', offset: 0.5 }); tick(m, { restartPressed: true });
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect(m.session.queue).toEqual([]);
    for (let f = 0; f < 200 && m.recoveryRemaining <= 0; f++) tick(m, { axis: 1 });
    for (let f = 0; f < 30; f++) tick(m);
    expect(m.controller.body.y).toBe(54); expect(m.completed).toBe(true);
    const n = fresh(); n.restoreSession(m.session);
    expect(n.completed).toBe(true); expect(n.controller.body).toMatchObject({ x: 59, y: 54 }); expect(n.legId).toBe('l3-swings');
    n.restartAdventure(); expect(n.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(n.completed).toBe(false);
  });
});
