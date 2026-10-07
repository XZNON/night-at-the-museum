import { describe, expect, it } from 'vitest';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { SketchRouteModel, createRouteSession, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { sketchJoinedRoute, sketchLayerTwo } from '../src/levels/unfinished-sketch-layer2';
import { sketchRoute } from '../src/levels/unfinished-sketch-route';
import { sketchTuning } from '../src/levels/unfinished-sketch';

const tick = (m: SketchRouteModel, n = 1, input: Partial<Controls> = {}) => {
  for (let i = 0; i < n; i++) m.update(1 / 60, { ...idleControls(), ...input });
};
const joined = () => new SketchRouteModel(sketchJoinedRoute, sketchTuning);
// Unit fixtures exercise boundaries; browser traversal uses only real controls.
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
const firstArrival = (m: SketchRouteModel) => { exit(m); board(m); ride(m); };

describe('S3B linked legs and S4L lift rides', () => {
  it('normalizes malformed target/FIFO/frozen IDs without corrupting the preserved S2 snapshot', () => {
    const m = new SketchRouteModel(sketchRoute, sketchTuning);
    const session = createRouteSession();
    session.queue = [
      { nailId: 'one', targetId: 'l1-freeze-a', sequence: 0 },
      { nailId: 'two', targetId: 'l1-freeze-a', sequence: 1 },
      { nailId: 'one', targetId: 'l1-freeze-b', sequence: 2 },
      { nailId: 'three', targetId: 'unknown', sequence: 3 },
    ];
    session.frozen = { 'l1-pendulum-a': 1, unknown: 100 };
    session.elapsed = NaN; session.sequence = NaN;
    m.restoreSession(session);
    expect(m.session.queue).toEqual([session.queue[0]]);
    expect(m.session.frozen).toEqual({ 'l1-pendulum-a': 1 }); expect(m.routeTime).toBe(0);
    expect(m.session.sequence).toBe(1);
  });
  it('joins the exact reviewed challenge data, unique IDs and two separately identified rides', () => {
    expect(sketchJoinedRoute.mechanisms).toEqual(sketchLayerTwo.mechanisms);
    expect(sketchJoinedRoute.mechanisms.filter(m => m.id.startsWith('l1-'))).toEqual(sketchRoute.mechanisms);
    for (const list of [sketchJoinedRoute.solids, sketchJoinedRoute.targets, sketchJoinedRoute.mechanisms]) {
      expect(new Set(list.map(v => v.id)).size).toBe(list.length);
    }
    expect(sketchJoinedRoute.legs.map(l => l.lift!.id)).toEqual(['l1-lift', 'l2-lift']);
    expect(sketchJoinedRoute.parkedLifts).toBeUndefined();
    const l3 = sketchLayerTwo.solids.find(s => s.id === 'l3-arrival')!;
    // New support is out of the measured 4.479u double-jump ceiling from exit;
    // lift decks and cab walls are model-made, never authored solids.
    expect(l3.y + l3.height - sketchLayerTwo.legs[0].exitSpawn.y).toBeGreaterThan(4.479);
    expect(sketchLayerTwo.solids.some(s => s.id.includes('lift'))).toBe(false);
    const lift = sketchLayerTwo.legs[0].lift!;
    expect(lift.arrival).toEqual(sketchLayerTwo.sections['layer-3-landing'].spawn);
    expect(lift.deck.y + lift.deck.height + lift.rise).toBeCloseTo(l3.y + l3.height, 6);
    expect(lift.deck.x + lift.deck.width).toBeCloseTo(l3.x, 6);
  });

  it('advances once with empty FIFO, no phase offsets, no attachment or buffered actions and no endpoint', () => {
    const m = joined(); tick(m, 2); firstArrival(m);
    expect(m.legId).toBe('layer-2'); expect(m.stage).toBe('traversal'); expect(m.completed).toBe(false);
    expect(m.availableNails).toBe(2); expect(m.session.queue).toEqual([]); expect(m.session.frozen).toEqual({});
    // Arrival commits in place on the parked deck, straight above where they got on.
    expect(m.controller.body).toMatchObject({ y: 15.2, vx: 0, vy: 0 });
    expect(m.controller.body.x).toBeGreaterThanOrEqual(63); expect(m.controller.body.x + 0.65).toBeLessThanOrEqual(66.5);
    expect(m.liftViews().map(v => [v.id, v.state])).toEqual([['l1-lift', 'parked'], ['l2-lift', 'bottom']]);
    const fresh = new SketchRouteModel(sketchLayerTwo, sketchTuning);
    expect(m.mechanismView()).toEqual(fresh.mechanismView());
    expect(m.hud().endpoint).toBe(''); expect(m.section.travelDirection).toBe(-1);
    tick(m, 30); expect(m.legId).toBe('layer-2'); expect(m.stage).toBe('traversal');
    m.enqueue({ type: 'place', targetId: 'l1-freeze-d' }); tick(m);
    expect(m.session.queue).toEqual([]);
  });

  it('keeps isolated Layer 1 terminal behavior and separate entry factories', () => {
    const m = new SketchRouteModel(sketchRoute, sketchTuning); exit(m); board(m); ride(m);
    expect(m.stage).toBe('arrival'); for (let f = 0; f < 120 && !m.completed; f++) tick(m, 1, { axis: 1 });
    expect(m.legId).toBe('layer-1'); expect(m.stage).toBe('arrival'); expect(m.completed).toBe(true);
    expect(m.hud().endpoint).toContain('Slice 2 endpoint');
    const a = createRouteSession(); const b = createRouteSession('layer-2');
    expect(a.entryLegId).toBe('layer-1'); expect(b.entryLegId).toBe('layer-2'); expect(a.queue).not.toBe(b.queue);
  });

  it('R wins over the ride/place/recall and retries each ride from its own departure', () => {
    const m = joined(); exit(m); board(m);
    m.enqueue({ type: 'place', targetId: 'l1-freeze-d' }); m.enqueue({ type: 'recall' });
    tick(m, 1, { restartPressed: true, interactPressed: true, jumpPressed: true });
    expect(m.stage).toBe('exit'); expect(m.controller.body.x).toBe(55.7);
    expect(m.session.queue).toEqual([]);
    expect(m.liftViews()[0].state).toBe('bottom');
    board(m); ride(m); exit(m); board(m); tick(m, 80);
    const snapshot = m.session;
    const restored = joined(); restored.restoreSession(snapshot);
    expect(restored.legId).toBe('layer-2'); expect(restored.stage).toBe('exit'); expect(restored.controller.body.x).toBe(27.5);
    tick(m, 1, { restartPressed: true, interactPressed: true });
    expect(m.legId).toBe('layer-2'); expect(m.stage).toBe('exit'); expect(m.controller.body.x).toBe(27.5);
  });

  it('suppresses ride commands, commits safe Layer 3 once, and recovers there after R/fall/re-entry', () => {
    const m = new SketchRouteModel(sketchLayerTwo, sketchTuning); exit(m); board(m);
    let arrivals = 0;
    for (let f = 0; f < 900 && m.stage === 'transit'; f++) {
      m.enqueue({ type: 'place', targetId: 'l2-freeze-a' }); m.enqueue({ type: 'recall' });
      tick(m, 1, { axis: -1, jumpPressed: true, interactPressed: true });
      if ((m.stage as string) === 'arrival') arrivals++;
    }
    expect(arrivals).toBe(1);
    expect(m.stage).toBe('arrival'); expect(m.availableNails).toBe(2);
    expect(m.controller.body).toMatchObject({ x: -2.6, y: 24.4, vx: 0, vy: 0 });
    // Step off right onto the Layer 3 ground: the S3 endpoint.
    for (let f = 0; f < 120 && !m.completed; f++) tick(m, 1, { axis: 1 });
    expect(m.completed).toBe(true); expect(m.stage).toBe('arrival');
    expect(m.sectionId).toBe('layer-3-landing'); expect(m.hud().endpoint).toContain('S3 endpoint');
    tick(m, 1, { restartPressed: true }); expect(m.controller.body.x).toBe(4.2);
    m.controller.respawn(11, 21.8); tick(m); tick(m, 35);
    expect(m.stage).toBe('arrival'); expect(m.controller.body.x).toBe(4.2);
    const n = new SketchRouteModel(sketchLayerTwo, sketchTuning); n.restoreSession(m.session);
    expect(n.sectionId).toBe('layer-3-landing'); expect(n.completed).toBe(true);
    n.restartAdventure(); expect(n.legId).toBe('layer-2'); expect(n.stage).toBe('traversal');
  });

  it('restores reachable joined Layer 2 traversal deterministically; rejects unknown/inconsistent ownership', () => {
    const m = joined(); firstArrival(m);
    m.enqueue({ type: 'place', targetId: 'l2-freeze-a' }); tick(m, 20);
    const n = joined(); n.restoreSession(m.session);
    expect(n.legId).toBe('layer-2'); expect(n.controller.body.x).toBe(64.2); expect(n.routeTime).toBe(0);
    expect(n.session.queue).toEqual([]); expect(n.session.frozen).toEqual({});
    tick(n, 1, { restartPressed: true }); expect(n.legId).toBe('layer-2');
    n.restartAdventure(); expect(n.legId).toBe('layer-1'); expect(n.controller.body.x).toBe(1.5);
    for (const bad of [{ ...m.session, legId: 'bad' }, { ...m.session, stage: 'bad' }, { ...m.session, entryLegId: 'layer-2' }]) {
      n.restoreSession(bad as SketchRouteSession); expect(n.legId).toBe('layer-1'); expect(n.stage).toBe('traversal');
    }
    const direct = new SketchRouteModel(sketchLayerTwo, sketchTuning);
    direct.restoreSession(m.session); expect(direct.legId).toBe('layer-2'); expect(direct.routeTime).toBe(0);
  });
});
