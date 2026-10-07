import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SketchRouteModel, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchJoinedRoute, sketchLayerTwo } from '../src/levels/unfinished-sketch-layer2';
import { sketchRoute } from '../src/levels/unfinished-sketch-route';
import { sketchLayerThree, sketchLayerThreeSwings, sketchLayerThreeWalls, sketchLayersOneToThree as route } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning, type SketchTuning } from '../src/levels/unfinished-sketch';
import { climb } from './sketch-layer3-climb';
import { Run, cross, tick as frame } from './sketch-layer3-swings-route';

// S4D: Layers 1-3 in one study. Layer 1/2 boundaries use the S3 fixture style
// (there is no input-only Layer 1/2 harness; the browser spec plays them with
// real keys). From the second arrival on, the climb and the crossing are the
// accepted input-only harnesses; nothing there edits the body.
const fresh = () => new SketchRouteModel(route, sketchTuning);
const tick = (m: SketchRouteModel, n = 1, input: Partial<Controls> = {}) => {
  for (let i = 0; i < n; i++) m.update(1 / 60, { ...idleControls(), ...input });
};
/** Read-only look at the movement tuning in force (private in the model). */
const feel = (m: SketchRouteModel) => (m.movement as unknown as { tuning: SketchTuning }).tuning;
const rows: Record<string, unknown> = {};
afterAll(() => {
  mkdirSync('docs/validation/sketch-s4/s4d', { recursive: true });
  writeFileSync('docs/validation/sketch-s4/s4d/unit-measurements.json', JSON.stringify(rows, null, 2));
});

// Fixture: place the body on the exit ground (as S3's joined tests do).
const exit = (m: SketchRouteModel) => {
  m.controller.respawn(m.leg.exitSpawn.x, m.leg.exitSpawn.y); tick(m, 2);
  expect(m.stage).toBe('exit');
};
/** Walk from the exit checkpoint onto the lift deck; standing on it starts the ride. */
const board = (m: SketchRouteModel) => {
  const deck = m.leg.lift!.deck;
  const axis = deck.x + deck.width / 2 > m.controller.body.x ? 1 : -1;
  for (let i = 0; i < 2400 && m.stage === 'exit'; i++) tick(m, 1, { axis });
  expect(m.inTransit).toBe(true);
};
const ride = (m: SketchRouteModel) => { for (let i = 0; i < 900 && m.inTransit; i++) tick(m); };
/** Both rides with fixtures on the Layer 1/2 exits; ends on the second arrival tick. */
const secondArrival = () => {
  const m = fresh(); tick(m, 2);
  exit(m); board(m); ride(m); expect(m.legId).toBe('layer-2');
  exit(m); board(m); ride(m); expect(m.legId).toBe('l3-walls');
  return m;
};
/** Walk right off the parked deck to the climb entrance and stand still. */
const toEntrance = (m: SketchRouteModel) => {
  for (let f = 0; f < 200 && m.controller.body.x < 4.2; f++) tick(m, 1, { axis: 1 });
  for (let f = 0; f < 10; f++) tick(m);
};

describe('S4D composition', () => {
  it('composes the accepted presets by stable IDs, four linked legs and cloned links only', () => {
    for (const list of [route.solids, route.mechanisms, route.targets, route.surfaces!, route.hazards, route.legs]) {
      const ids = list.map(x => x.id);
      expect(new Set(ids).size, ids.join(',')).toBe(ids.length);
    }
    expect(route.legs.map(l => [l.id, l.nextLegId ?? null, l.lift?.id ?? null, l.arrivalSectionId])).toEqual([
      ['layer-1', 'layer-2', 'l1-lift', 'layer-2'], ['layer-2', 'l3-walls', 'l2-lift', 'l3-walls'],
      ['l3-walls', 'l3-swings', null, null], ['l3-swings', null, null, null],
    ]);
    expect([route.entryLegId, route.spawn, route.deathY, route.parkedLifts]).toEqual(['layer-1', sketchRoute.spawn, sketchRoute.deathY, undefined]);
    expect(route.sectionOrder).toEqual(['layer-1', 'layer-2', 'l3-walls', 'l3-swings']);
    // Exact accepted challenge data: every mechanism, target, surface, solid and hazard.
    expect(route.mechanisms).toEqual(sketchLayerThree.mechanisms);
    expect(route.targets).toEqual(sketchLayerThree.targets);
    expect(route.surfaces).toEqual(sketchLayerThree.surfaces);
    expect(route.solids).toEqual(sketchLayerThree.solids);
    expect(route.hazards).toEqual(sketchLayerThree.hazards);
    expect(route.mechanisms.filter(m => !m.id.startsWith('l3-'))).toEqual(sketchJoinedRoute.mechanisms);
    for (const id of ['layer-1', 'layer-2', 'l3-walls', 'l3-swings']) {
      expect(route.sections[id]).toEqual({ ...sketchJoinedRoute.sections, ...sketchLayerThree.sections }[id]);
    }
    // Layers 1/2 keep the field's defaults; the Layer 3 legs keep S4C's.
    expect([route.wall, route.placementReach, route.nailPickup, route.airCoast]).toEqual([undefined, undefined, undefined, undefined]);
    expect(route.legs.map(l => l.settings?.airCoast ?? false)).toEqual([false, false, true, true]);
    expect(route.legs[0].settings).toBeUndefined(); expect(route.legs[1].settings).toBeUndefined();
    expect(route.legs[2].settings).toEqual(sketchLayerThree.legs[0].settings);
    expect(route.legs[3].settings).toEqual(sketchLayerThree.legs[1].settings);
    // Clones: the older studies keep their own links and endpoints.
    route.legs.forEach((leg, i) => expect(leg).not.toBe([...sketchJoinedRoute.legs, ...sketchLayerThree.legs][i]));
    expect(sketchJoinedRoute.legs[1]).toMatchObject({ arrivalSectionId: 'layer-3-landing' });
    expect(sketchJoinedRoute.legs[1].nextLegId).toBeUndefined();
    expect(sketchLayerTwo.legs[0].nextLegId).toBeUndefined();
    expect(sketchLayerThree.legs[0].arrivalCue).toBeUndefined();
    expect(sketchJoinedRoute.parkedLifts).toBeUndefined();
    expect(sketchLayerThree.parkedLifts!.map(l => l.id)).toEqual(['l1-lift', 'l2-lift']);
    // The second lift parks beside the climb's entrance ground.
    const arrival = route.solids.find(s => s.id === 'l3-arrival')!;
    const lift = route.legs[1].lift!;
    expect(lift.deck.y + lift.deck.height + lift.rise).toBeCloseTo(arrival.y + arrival.height, 6);
    expect(lift.deck.x + lift.deck.width).toBeCloseTo(arrival.x, 6);
    expect(route.sections['l3-walls'].spawn).toEqual(lift.arrival);
  });

  it('Layers 1/2 play with the field defaults; isolated studies are unchanged', () => {
    const m = fresh(); tick(m);
    expect([m.legId, m.placementReach, m.nailPickup, m.freePlacement, m.nailBudget, m.controller.airCoast]).toEqual(['layer-1', 10, undefined, false, 2, false]);
    expect(feel(m)).toBe(sketchTuning);
    expect(m.controller.body).toMatchObject({ x: 1.5, y: 0 });
    expect(m.hud().hint).toBe(sketchRoute.hint);
    // Only Layer 1's pendulums are clickable; Layer 2/3 are another layer.
    expect(m.targetViews().filter(v => v.id.startsWith('l1-')).map(v => v.reason)).toEqual(Array(4).fill('Out of reach.'));
    expect(m.targetViews().filter(v => !v.id.startsWith('l1-')).every(v => v.reason === 'Another layer.')).toBe(true);
    expect(m.surfaceRefusal('l3-strip-f', 0.5)).not.toBe('');
  });
});

describe('S4D rides into Layer 3', () => {
  it('the first ride keeps the Layer 2 handoff and cue', () => {
    const m = fresh(); tick(m, 2); exit(m); board(m); ride(m);
    expect([m.legId, m.stage, m.completed]).toEqual(['layer-2', 'traversal', false]);
    expect(m.cue).toBe('Layer 2 reached. Three boards, two nails; the axes stay active.');
    expect(m.liftViews().map(v => [v.id, v.state])).toEqual([['l1-lift', 'parked'], ['l2-lift', 'bottom']]);
    expect(m.hud().endpoint).toBe(''); expect(m.placementReach).toBe(10); expect(m.controller.airCoast).toBe(false);
  });

  it('the second arrival starts the climb once: two nails, pickup offered, zero velocity, phase zero, no endpoint', () => {
    const m = fresh(); tick(m, 2); exit(m); board(m); ride(m); exit(m); board(m);
    let arrivals = 0;
    for (let f = 0; f < 900 && m.inTransit; f++) {
      // Commands and every button pressed throughout the ride never act.
      m.enqueue({ type: 'place', targetId: 'l2-freeze-a' }); m.enqueue({ type: 'recall' });
      m.enqueue({ type: 'place', targetId: 'l3-wall-a-pin' });
      tick(m, 1, { axis: 1, jumpPressed: f % 7 === 0, jumpHeld: true, interactPressed: true });
      if (m.legId === 'l3-walls') arrivals++;
    }
    expect(arrivals).toBe(1);
    expect([m.legId, m.stage, m.sectionId, m.completed]).toEqual(['l3-walls', 'traversal', 'l3-walls', false]);
    expect(m.controller.body).toMatchObject({ y: 24.4, vx: 0, vy: 0 });
    // In place on the parked deck, beside the climb's entrance ground.
    expect(m.controller.body.x).toBeGreaterThanOrEqual(-2.6); expect(m.controller.body.x + 0.65).toBeLessThanOrEqual(0.00001);
    expect([m.nailBudget, m.availableNails, m.pickupCollected, !!m.nailPickup]).toEqual([2, 2, false, true]);
    expect(m.session.queue).toEqual([]); expect(m.session.frozen).toEqual({}); expect(m.routeTime).toBe(0);
    expect(m.mechanismView()).toEqual(new SketchRouteModel(sketchLayerThree, sketchTuning).mechanismView());
    expect([m.placementReach, m.freePlacement, m.controller.airCoast]).toEqual([11, false, true]);
    expect(feel(m).wall).toEqual({ ...sketchTuning.wall, ...sketchLayerThreeWalls.wall });
    expect(m.move.state).toBe('normal'); expect(m.movement.swing).toBeNull();
    expect(m.cue).toBe('Layer 3 reached. Two nails; pick up the third on your way to the walls.');
    expect(m.liftViews().map(v => [v.id, v.state, v.walls])).toEqual([['l1-lift', 'parked', false], ['l2-lift', 'parked', false]]);
    const hud = m.hud();
    expect(hud.endpoint).toBe(''); expect(hud.layer).toBe('3 / 3 · Layer 3 walls'); expect(hud.checkpoint).toBe('Checkpoint / l3-walls start');
    expect(hud.prompt).toBe(''); expect(hud.hint).toBe(sketchLayerThree.legs[0].hint);
    // Held E/Space from the ride carry no press across: no jump, no grip.
    tick(m, 20, { jumpHeld: true });
    expect(m.controller.body.y).toBe(24.4); expect(m.controller.body.grounded).toBe(true);
    expect(m.legId).toBe('l3-walls'); expect(m.session.queue).toEqual([]);
    // No S3 endpoint anywhere on the arrival ground.
    toEntrance(m); for (let f = 0; f < 30; f++) tick(m, 1, { axis: 1 });
    expect(m.completed).toBe(false); expect(m.hud().endpoint).toBe('');
    const again = secondArrival();
    rows.secondArrival = { x: +again.controller.body.x.toFixed(3), y: again.controller.body.y, cue: again.cue, liftDeck: '-2.6..0' };
  });
});

describe('S4D full route from the second arrival (input only)', () => {
  it('climbs, hands over and crosses to the S4D endpoint; replays from the same arrival', () => {
    const start = secondArrival();
    const prefix = new Run(start);
    for (let f = 0; f < 200 && prefix.body.x < 4.2; f++) prefix.go({ axis: 1 });
    for (let f = 0; f < 10; f++) prefix.go();
    const r = climb({ model: prefix.m });
    expect(r.log.at(-1), r.log.join(' ')).toBe('handoff');
    expect(r.log).toContain('pickup');
    const m = r.m;
    expect([m.legId, m.nailBudget, m.pickupCollected, m.completed]).toEqual(['l3-swings', 2, false, false]);
    expect(m.cue).toBe('Wall climb clear. The third nail is taken back: two nails for the swing crossing.');
    expect([m.placementReach, m.freePlacement, m.controller.airCoast]).toEqual([10, true, true]);
    expect(feel(m)).toBe(sketchTuning);
    const run = new Run(m); run.frames.push(...prefix.frames, ...r.frames);
    while (run.body.x < 16.8) run.go({ axis: 1 });
    for (let f = 0; f < 10; f++) run.go();
    const result = cross({ f: 1, m1: 0, m2: 1, first: true }, run);
    expect(result.stage).toBe('done');
    const replayed = secondArrival();
    for (const f of result.run!.frames) frame(replayed, f);
    expect([replayed.completed, replayed.stage, replayed.legId]).toEqual([true, 'exit', 'l3-swings']);
    expect(replayed.availableNails).toBe(2); expect(replayed.session.queue).toEqual([]);
    expect(replayed.cue).toBe('S4D endpoint. Layers 1–3 complete: landed on the fixed end ledge.');
    expect(replayed.hud().endpoint).toBe('S4D endpoint reached · Layers 1–3 complete · Stop for review');
    const climbOrder = r.frames.flatMap(f => f.cmds.map(c => c.type === 'recall' ? 'Q' : c.type === 'place' ? c.targetId.split('-')[2].toUpperCase() : '?'));
    const crossOrder = result.run!.frames.slice(prefix.frames.length + r.frames.length).flatMap(f => f.cmds.map(c => c.type === 'recall' ? 'Q' : c.type === 'place-at' ? c.surfaceId.slice(-2).replace('-', '').toUpperCase() : '?'));
    expect(crossOrder).toEqual(['F', 'M1', 'Q', 'M2', 'Q']);
    rows.fromSecondArrival = {
      frames: result.run!.frames.length, seconds: +(result.run!.frames.length / 60).toFixed(2),
      walkFrames: prefix.frames.length, climbFrames: r.frames.length, climbLog: r.log, climbOrder, crossOrder,
      crossParams: (result as { params?: unknown }).params,
    };
  });
});

describe('S4D recovery and ownership', () => {
  const recover = (m: SketchRouteModel) => { for (let f = 0; f < 60 && m.recoveryRemaining > 0; f++) tick(m); };
  const fallFrom = (m: SketchRouteModel, x: number, y: number) => {
    m.controller.respawn(x, y); for (let f = 0; f < 300 && m.recoveryRemaining <= 0; f++) tick(m);
    expect(m.recoveryRemaining).toBeGreaterThan(0); recover(m);
  };
  const onLayerTwo = () => { const m = fresh(); tick(m, 2); exit(m); board(m); ride(m); return m; };
  const onClimb = () => secondArrival();
  const onSwings = () => { const m = secondArrival(); m.controller.respawn(16, 49.5); tick(m); expect(m.legId).toBe('l3-swings'); return m; };
  const onEnd = () => { const m = onSwings(); m.controller.respawn(60, 54); tick(m); expect(m.completed).toBe(true); return m; };

  it('Layer 1: fall, R and re-entry return to the Layer 1 start', () => {
    const m = fresh(); tick(m); m.place('l1-freeze-a'); fallFrom(m, 20, -1);
    expect(m.controller.body).toMatchObject({ x: 1.5, y: 0 }); expect(m.legId).toBe('layer-1'); expect(m.session.queue).toEqual([]);
    m.place('l1-freeze-a'); tick(m, 1, { restartPressed: true }); expect(m.controller.body).toMatchObject({ x: 1.5, y: 0 }); expect(m.session.queue).toEqual([]);
    m.place('l1-freeze-a'); const n = fresh(); n.restoreSession(m.session);
    expect([n.legId, n.stage, n.controller.body.x, n.session.queue.length]).toEqual(['layer-1', 'traversal', 1.5, 0]);
  });

  it('first ride: R, actual blur, a mid-ride snapshot and an exit fall return to the Layer 1 exit', () => {
    const m = fresh(); tick(m, 2); exit(m); board(m); tick(m, 60);
    const snap = m.session; expect(snap.stage).toBe('transit');
    tick(m, 1, { restartPressed: true, interactPressed: true });
    expect([m.legId, m.stage, m.controller.body.x]).toEqual(['layer-1', 'exit', 55.7]);
    expect(m.liftViews()[0].state).toBe('bottom');
    board(m); tick(m, 60); expect(m.cancelRide()).toBe(true); expect([m.stage, m.controller.body.x]).toEqual(['exit', 55.7]);
    const n = fresh(); n.restoreSession(snap); expect([n.legId, n.stage, n.controller.body.x]).toEqual(['layer-1', 'exit', 55.7]);
    fallFrom(n, 58, 9); expect([n.stage, n.controller.body.x]).toEqual(['exit', 55.7]);
  });

  it('Layer 2: fall and R return to (64.2, 15.2); re-entry too; an axe hit is named as the axe', () => {
    const m = onLayerTwo(); m.place('l2-freeze-a'); fallFrom(m, 50, 13.5);
    expect(m.controller.body).toMatchObject({ x: 64.2, y: 15.2 }); expect(m.legId).toBe('layer-2'); expect(m.session.queue).toEqual([]);
    expect(m.cue).toBe('Layer 2 reset. Two nails available.');
    tick(m, 1, { restartPressed: true }); expect(m.controller.body).toMatchObject({ x: 64.2, y: 15.2 });
    const n = fresh(); n.restoreSession(m.session); expect([n.legId, n.stage, n.controller.body.x]).toEqual(['layer-2', 'traversal', 64.2]);
    // Fixture: hold the body at the spinning blade's hub; the glue elsewhere must not rename it.
    const axe = route.mechanisms.find(v => v.id === 'l2-axe-a')!;
    for (let f = 0; f < 60 && m.recoveryRemaining <= 0; f++) { m.controller.respawn(axe.pivot.x - 0.325, axe.pivot.y - 0.6); tick(m); }
    expect(m.cue).toBe('Caught by the axe. Watch its sweep.');
    recover(m); expect(m.controller.body).toMatchObject({ x: 64.2, y: 15.2 });
  });

  it('second ride: R, actual blur, a mid-ride snapshot and an exit fall return to the Layer 2 exit', () => {
    const m = onLayerTwo(); exit(m); board(m); tick(m, 90);
    const snap = m.session; expect([snap.legId, snap.stage]).toEqual(['layer-2', 'transit']);
    tick(m, 1, { restartPressed: true, jumpPressed: true }); expect([m.legId, m.stage, m.controller.body.x]).toEqual(['layer-2', 'exit', 27.5]);
    board(m); tick(m, 90); expect(m.cancelRide()).toBe(true); expect([m.stage, m.controller.body.x]).toEqual(['exit', 27.5]);
    const n = fresh(); n.restoreSession(snap); expect([n.legId, n.stage, n.controller.body.x]).toEqual(['layer-2', 'exit', 27.5]);
    expect(n.liftViews().map(v => v.state)).toEqual(['parked', 'bottom']);
    fallFrom(n, 25, 13); expect([n.stage, n.controller.body.x]).toEqual(['exit', 27.5]);
  });

  it('climb: fall, R and re-entry return to the climb entrance (4.2, 24.4) with the pickup back', () => {
    const m = onClimb(); toEntrance(m); for (let f = 0; f < 40 && m.controller.body.x < 8.4; f++) tick(m, 1, { axis: 1 });
    expect(m.pickupCollected).toBe(true); m.place('l3-wall-a-pin');
    for (let f = 0; f < 240 && m.recoveryRemaining <= 0; f++) tick(m, 1, { axis: 1 });
    expect(m.cue).toBe('Nothing under you. Layer 3 restarts; pick up the third nail again…');
    recover(m);
    expect(m.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect([m.legId, m.nailBudget, m.pickupCollected]).toEqual(['l3-walls', 2, false]);
    m.place('l3-wall-a-pin'); tick(m, 1, { restartPressed: true, jumpPressed: true });
    expect(m.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(m.session.queue).toEqual([]);
    m.place('l3-wall-a-pin'); const n = fresh(); n.restoreSession(m.session);
    expect(n.controller.body).toMatchObject({ x: 4.2, y: 24.4 }); expect([n.legId, n.nailBudget, n.placementReach, n.session.queue.length]).toEqual(['l3-walls', 2, 11, 0]);
    expect(feel(n).wall.grip).toBe(0.9); expect(n.controller.airCoast).toBe(true);
  });

  it('crossing: glue, R and re-entry return to the swing start (17.2, 49.5) with the climb kept', () => {
    const m = onSwings(); m.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 }); tick(m); expect(m.placedCount).toBe(1);
    for (let f = 0; f < 300 && m.recoveryRemaining <= 0; f++) tick(m, 1, { axis: 1 });
    expect(m.cue).toBe('Glue! Quick retry.');
    recover(m);
    expect(m.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect([m.legId, m.nailBudget, m.completed]).toEqual(['l3-swings', 2, false]);
    expect(m.cue).toBe('Swing crossing reset. Two nails available. The climb stays clear.');
    m.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 }); m.enqueue({ type: 'recall' });
    tick(m, 1, { restartPressed: true, axis: 1 }); expect(m.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(m.session.queue).toEqual([]);
    m.enqueue({ type: 'place-at', surfaceId: 'l3-strip-f', offset: 0.5 }); tick(m);
    const n = fresh(); n.restoreSession(m.session);
    expect(n.controller.body).toMatchObject({ x: 17.2, y: 49.5 }); expect([n.legId, n.session.queue.length, n.placementReach, n.freePlacement]).toEqual(['l3-swings', 0, 10, true]);
  });

  it('end ledge is terminal: R, a fall and re-entry stay there; Restart Layers 1–3 returns to the Layer 1 start', () => {
    const m = onEnd();
    expect(m.cue).toBe('S4D endpoint. Layers 1–3 complete: landed on the fixed end ledge.');
    expect(m.hud().endpoint).toBe('S4D endpoint reached · Layers 1–3 complete · Stop for review');
    m.enqueue({ type: 'place-at', surfaceId: 'l3-bar-m2', offset: 0.5 }); tick(m, 1, { restartPressed: true });
    expect(m.controller.body).toMatchObject({ x: 59, y: 54 }); expect(m.session.queue).toEqual([]);
    for (let f = 0; f < 200 && m.recoveryRemaining <= 0; f++) tick(m, 1, { axis: 1 });
    recover(m); tick(m, 5);
    expect(m.controller.body.y).toBe(54); expect(m.completed).toBe(true);
    const n = fresh(); n.restoreSession(m.session);
    expect([n.completed, n.legId, n.stage]).toEqual([true, 'l3-swings', 'exit']); expect(n.controller.body).toMatchObject({ x: 59, y: 54 });
    n.restartAdventure();
    expect(n.controller.body).toMatchObject({ x: 1.5, y: 0 }); expect([n.legId, n.stage, n.completed, n.placementReach, n.controller.airCoast]).toEqual(['layer-1', 'traversal', false, 10, false]);
    expect(feel(n)).toBe(sketchTuning); expect(n.nailPickup).toBeUndefined();
    expect(n.liftViews().map(v => v.state)).toEqual(['bottom', 'bottom']);
  });

  it('refuses foreign, malformed and impossible snapshots by restarting at Layer 1', () => {
    const crossing = onSwings().session; const climbing = onClimb().session;
    const joined12 = new SketchRouteModel(sketchJoinedRoute, sketchTuning); tick(joined12, 2); exit(joined12);
    const layer3 = new SketchRouteModel(sketchLayerThree, sketchTuning); layer3.controller.respawn(16, 49.5); tick(layer3, 2);
    const bad = [
      joined12.session, layer3.session, { ...crossing, routeId: undefined }, { ...crossing, routeId: 'layer-3' },
      { ...crossing, entryLegId: 'l3-walls' }, { ...crossing, legId: 'bad' }, { ...crossing, stage: 'transit' },
      { ...crossing, stage: 'arrival' }, { ...crossing, elapsed: Number.NaN }, { ...crossing, sequence: Number.POSITIVE_INFINITY },
      { ...climbing, stage: 'exit' }, { ...climbing, stage: 'transit' }, { ...crossing, stage: 'bad' },
    ];
    for (const s of bad) {
      const m = fresh(); m.restoreSession(s as SketchRouteSession);
      expect(m.controller.body, JSON.stringify(s)).toMatchObject({ x: 1.5, y: 0 }); expect(m.legId).toBe('layer-1'); expect(m.stage).toBe('traversal');
    }
    // Older studies keep their own rules for a full-route snapshot.
    const j = new SketchRouteModel(sketchJoinedRoute, sketchTuning); j.restoreSession(crossing);
    expect([j.legId, j.controller.body.x]).toEqual(['layer-1', 1.5]);
    const l3 = new SketchRouteModel(sketchLayerThree, sketchTuning); l3.restoreSession(crossing);
    expect([l3.legId, l3.controller.body.x]).toEqual(['l3-walls', 4.2]);
    const sw = new SketchRouteModel(sketchLayerThreeSwings, sketchTuning); sw.restoreSession(crossing);
    expect([sw.legId, sw.controller.body.x]).toEqual(['l3-swings', 17.2]);
    rows.recovery = {
      'layer-1': 'Layer 1 start (1.5, 0)', 'first ride': 'Layer 1 exit (55.7, 11.9)', 'layer-2': 'Layer 2 start (64.2, 15.2)',
      'second ride': 'Layer 2 exit (27.5, 16.3)', climb: 'climb entrance (4.2, 24.4), pickup back', crossing: 'swing start (17.2, 49.5), climb kept',
      'end ledge': 'end ledge (59, 54)', restart: 'Layer 1 start', refusedSnapshots: bad.length,
    };
  });
});
