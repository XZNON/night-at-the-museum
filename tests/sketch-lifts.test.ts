import { describe, expect, it } from 'vitest';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { overlaps } from '../src/gameplay/collision';
import { SketchRouteModel, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { LIFT_WALL_HEIGHT, sketchMovement, sketchTuning } from '../src/levels/unfinished-sketch';
import type { SketchRoute } from '../src/levels/unfinished-sketch';
import { l1Lift, sketchRoute } from '../src/levels/unfinished-sketch-route';
import { l2Lift, sketchJoinedRoute, sketchLayerTwo } from '../src/levels/unfinished-sketch-layer2';
import { sketchLayerThree, sketchLayerThreeSwings, sketchLayerThreeWalls } from '../src/levels/unfinished-sketch-layer3';

// S4L vertical lifts: start conditions, the cab holding the rider for the
// whole ride, refused nail commands, one arrival commit, recovery to the
// departure exit and parked context decks. Fixtures place the player only at
// boundaries; rides themselves run on ordinary fixed-step input.

const dt = 1 / 60;
const tick = (m: SketchRouteModel, n = 1, input: Partial<Controls> = {}) => {
  for (let i = 0; i < n; i++) m.update(dt, { ...idleControls(), ...input });
};
const model = (route: SketchRoute) => new SketchRouteModel(route, sketchTuning);
/** Commit the active leg's exit checkpoint by landing on its exit spawn. */
const exit = (m: SketchRouteModel) => {
  m.controller.respawn(m.leg.exitSpawn.x, m.leg.exitSpawn.y); tick(m, 2);
  expect(m.stage).toBe('exit');
};
/** Walk toward the deck until standing fully on it starts the ride. */
const stepOn = (m: SketchRouteModel) => {
  const deck = m.leg.lift!.deck;
  const axis = deck.x + deck.width / 2 > m.controller.body.x ? 1 : -1;
  for (let i = 0; i < 2400 && m.stage === 'exit'; i++) tick(m, 1, { axis });
  expect(m.stage).toBe('transit');
};
const ride = (m: SketchRouteModel) => { for (let i = 0; i < 900 && m.stage === 'transit'; i++) tick(m); };
const top = (r: { y: number; height: number }) => r.y + r.height;
/** Ordinary double jump: ~4.48u apex for the body's feet. */
const DOUBLE_JUMP = 2 * sketchMovement.jumpSpeed ** 2 / (2 * sketchMovement.gravity);

describe('S4L lift data and clearances', () => {
  it('replaces both escalators with two vertical lifts flush with their departure and arrival ground', () => {
    expect(sketchJoinedRoute.legs.map(l => l.lift?.id)).toEqual(['l1-lift', 'l2-lift']);
    const l1Exit = sketchRoute.solids.find(s => s.id === 'l1-exit')!;
    const landing = sketchRoute.solids.find(s => s.id === 'l2-landing')!;
    const walkway = sketchLayerTwo.solids.find(s => s.id === 'l2-walkway')!;
    const l2Exit = sketchLayerTwo.solids.find(s => s.id === 'l2-exit')!;
    const l3 = sketchLayerTwo.solids.find(s => s.id === 'l3-arrival')!;
    // Flush within float noise (the collision seam tolerance is 1e-5).
    expect(top(l1Lift.deck)).toBeCloseTo(top(l1Exit), 9);
    expect(top(l1Lift.deck) + l1Lift.rise).toBeCloseTo(top(landing), 9);
    expect(top(l2Lift.deck)).toBeCloseTo(top(walkway), 9);
    expect(top(l2Lift.deck) + l2Lift.rise).toBeCloseTo(top(l3), 9);
    // Straight up: the deck keeps its x; Layer 1's exit ground runs into it and
    // the parked deck restores the landing's accepted x63..77 exactly.
    expect(l1Lift.deck.x).toBe(l1Exit.x + l1Exit.width);
    expect([l1Lift.deck.x, l1Lift.deck.x + l1Lift.deck.width, landing.x + landing.width]).toEqual([63, landing.x, 77]);
    // The walkway is plain ground from the exit ground to the second deck.
    expect([walkway.x, walkway.x + walkway.width]).toEqual([l2Lift.deck.x + l2Lift.deck.width, l2Exit.x]);
    expect(l2Lift.deck.x + l2Lift.deck.width).toBe(l3.x);
    expect(l1Lift.exitSide).toBe(1); expect(l2Lift.exitSide).toBe(1);
    expect(l1Lift.windUp).toBeGreaterThan(0); expect(l2Lift.windUp).toBeGreaterThan(0);
  });

  it('keeps the exit spawns off the decks and the Layer 3 entrance exactly as accepted', () => {
    for (const leg of sketchJoinedRoute.legs) {
      const deck = leg.lift!.deck;
      expect(overlaps({ x: leg.exitSpawn.x, y: leg.exitSpawn.y, width: sketchMovement.width, height: sketchMovement.height },
        { ...deck, height: deck.height + 0.1 })).toBe(false);
    }
    for (const route of [sketchLayerTwo, sketchLayerThreeWalls, sketchLayerThreeSwings, sketchLayerThree]) {
      const l3 = route.solids.find(s => s.id === 'l3-arrival')!;
      expect([l3.x, l3.width, top(l3)]).toEqual([0, 10, 24.4]);
    }
    expect(sketchLayerThreeWalls.spawn).toEqual({ x: 4.2, y: 24.4 });
    expect(l2Lift.arrival).toEqual({ x: 4.2, y: 24.4 });
  });

  it('builds cab walls taller than any double jump and clear of Layer 1/2 challenges', () => {
    // The body's head never reaches the top of a wall from the deck.
    expect(DOUBLE_JUMP + sketchMovement.height).toBeLessThan(LIFT_WALL_HEIGHT);
    expect(LIFT_WALL_HEIGHT).toBeGreaterThanOrEqual(6);
    // Layer 2 board A (x54.3..57.7 across its travel) and both axes stay left of the first cab.
    const boardA = sketchLayerTwo.mechanisms.find(m => m.id === 'l2-board-a')!;
    expect(boardA.centre.x + boardA.size.width / 2).toBeLessThan(l1Lift.deck.x - 0.5);
    for (const axe of sketchLayerTwo.mechanisms.filter(m => m.kind === 'axe')) {
      expect(axe.pivot.x + axe.length).toBeLessThan(l1Lift.deck.x - 0.5);
    }
    // Layer 1's pendulum sweeps never reach the first cab either.
    for (const p of sketchRoute.mechanisms) expect(p.pivot.x + p.length * Math.sin(p.arc) + p.size.width / 2).toBeLessThan(l1Lift.deck.x - 0.5);
    // The walkway sits far above every Layer 1 jump envelope below it (terrace + double jump + body).
    const walkway = sketchLayerTwo.solids.find(s => s.id === 'l2-walkway')!;
    expect(walkway.y).toBeGreaterThan(1.6 + DOUBLE_JUMP + sketchMovement.height + 4);
    // No target, mechanism or hazard lives over the walkway or the second shaft.
    const span = { x: l2Lift.deck.x - 0.5, y: walkway.y, width: walkway.x + walkway.width - l2Lift.deck.x + 0.5, height: 24.4 - walkway.y };
    for (const m of sketchLayerTwo.mechanisms) expect(overlaps(span, { x: m.centre.x - m.size.width / 2, y: m.centre.y - m.size.height / 2, ...m.size })).toBe(false);
    expect(sketchLayerTwo.hazards).toEqual([]);
  });

  it('keeps S4A wall B uncatchable from the parked second deck', () => {
    const b = sketchLayerThreeWalls.mechanisms.find(m => m.id === 'l3-wall-b')!;
    // B's lowest face; the deck is left of the arrival ground at the same top.
    const face = b.centre.y - b.size.height / 2;
    expect(top(l2Lift.deck) + l2Lift.rise + DOUBLE_JUMP + sketchMovement.height).toBeLessThan(face);
    expect(l2Lift.deck.x + l2Lift.deck.width).toBeLessThanOrEqual(b.centre.x - b.size.width / 2);
  });
});

describe('S4L start conditions', () => {
  it('in traversal the deck is ordinary ground and never starts a ride', () => {
    const m = model(sketchRoute);
    m.controller.respawn(64, 11.9); tick(m, 90);
    expect(m.stage).toBe('traversal'); expect(m.controller.body.grounded).toBe(true);
    expect(m.liftViews()[0].state).toBe('bottom');
  });

  it('starts only grounded with the whole body on the deck: not straddling, not on a hop, not while recovering', () => {
    const m = model(sketchRoute); exit(m);
    // Straddling the deck's left edge.
    m.controller.respawn(62.7, 11.9); tick(m, 30);
    expect(m.controller.body.grounded).toBe(true); expect(m.stage).toBe('exit');
    expect(m.hud().prompt).toBe('Step fully onto the lift');
    // Airborne over the deck: nothing until the landing.
    m.controller.respawn(64.4, 13.4);
    let airborneTicks = 0;
    for (let i = 0; i < 60 && m.stage === 'exit'; i++) { if (!m.controller.body.grounded) airborneTicks++; tick(m); }
    expect(airborneTicks).toBeGreaterThan(5);
    expect(m.stage).toBe('transit');
    // A recovering body standing there is never ready.
    const n = model(sketchRoute); exit(n);
    n.controller.respawn(64.4, 11.9); n.recoveryRemaining = 0.3;
    expect(n.onLiftDeck()).toBe(false);
  });

  it('closes the walls, clears queued commands and holds a visible wind-up before rising', () => {
    const m = model(sketchRoute); exit(m);
    stepOn(m);
    const view = () => m.liftViews()[0];
    expect(view()).toMatchObject({ state: 'wind-up', walls: true, progress: 0 });
    expect(m.solids.map(s => s.id)).toEqual(expect.arrayContaining(['l1-lift-deck']));
    tick(m);
    expect(m.solids.map(s => s.id)).toEqual(expect.arrayContaining(['l1-lift-wall-left', 'l1-lift-wall-right']));
    expect(m.hud().prompt).toBe('The lift is closing…');
    tick(m, Math.round(l1Lift.windUp / dt) + 1);
    expect(view().state).toBe('rising'); expect(m.transitProgress).toBeGreaterThan(0);
    expect(m.hud().motion).toBe('Riding the lift');
  });
});

describe('S4L ride containment and arrival', () => {
  for (const [name, route] of [['layer-1', sketchRoute], ['layer-2', sketchLayerTwo]] as const) {
    it(`${name}: walls hold against held A/D, jumps and the air jump for the whole ride; arrival commits once`, () => {
      const m = model(route); exit(m); stepOn(m);
      const deck = m.leg.lift!.deck;
      let commits = 0; let peak = 0; let maxAbove = 0; let jumps = 0;
      for (let f = 0; f < 900 && m.stage === 'transit'; f++) {
        const axis = Math.floor(f / 40) % 2 ? -1 : 1;
        // Press, hold, release and press again in the air: ground and air jumps.
        const phase = f % 30;
        const before = m.stage;
        const wasGrounded = m.controller.body.grounded;
        tick(m, 1, { axis, jumpPressed: phase === 0 || phase === 12, jumpHeld: phase < 10 || (phase >= 12 && phase < 22), interactPressed: phase === 5 });
        if (wasGrounded && m.controller.body.vy > 5) jumps++;
        if (before === 'transit' && (m.stage as string) !== 'transit') commits++;
        const b = m.controller.body;
        const deckTop = m.liftViews().find(v => v.id === m.leg.lift?.id)?.deck;
        expect(b.x).toBeGreaterThanOrEqual(deck.x - 1e-6);
        expect(b.x + b.width).toBeLessThanOrEqual(deck.x + deck.width + 1e-6);
        if (deckTop && (m.stage as string) === 'transit') maxAbove = Math.max(maxAbove, b.y - top(deckTop));
        peak = Math.max(peak, b.y);
      }
      expect(commits).toBe(1);
      expect(jumps).toBeGreaterThan(3);
      // The head never got near the wall tops.
      expect(maxAbove + sketchMovement.height).toBeLessThan(LIFT_WALL_HEIGHT);
      expect(maxAbove).toBeGreaterThan(2.5);
      // In place: still over the deck, now flush with the next layer's ground.
      expect(m.controller.body.y).toBe(top(deck) + m.route.legs[0].lift!.rise);
      expect(m.stage).toBe('arrival');
      expect(m.liftViews().at(-1)).toMatchObject({ state: 'parked', walls: false, progress: 1 });
      // Standing on the parked deck never carries anyone down or restarts it.
      tick(m, 120);
      expect(m.solids.some(s => s.id.includes('-wall-'))).toBe(false);
      expect(m.stage).toBe('arrival'); expect(m.liftViews().at(-1)!.state).toBe('parked');
      // Step off the exit side onto the next layer's ground: the endpoint.
      for (let f = 0; f < 240 && !m.completed; f++) tick(m, 1, { axis: m.leg.lift!.exitSide });
      expect(m.completed).toBe(true);
    });
  }

  it('refuses nail commands and grips during the ride; Layer 1 keeps its explored nail as before', () => {
    const m = model(sketchRoute); exit(m);
    m.enqueue({ type: 'place', targetId: 'l1-freeze-d' }); tick(m);
    expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-d']);
    stepOn(m);
    for (let f = 0; f < 120; f++) {
      m.enqueue({ type: 'recall' }); m.enqueue({ type: 'place', targetId: 'l1-freeze-c' });
      tick(m, 1, { interactPressed: true });
      expect(m.session.queue.map(p => p.targetId)).toEqual(['l1-freeze-d']);
      expect(m.move.state).toBe('normal');
    }
  });

  it('the arrival commit waits for the rider to stand on the deck at the top', () => {
    const m = model(sketchLayerTwo); exit(m); stepOn(m);
    const total = Math.round((l2Lift.windUp + l2Lift.duration) / dt);
    tick(m, total - 5);
    // Jump just before the top: the deck parks under an airborne rider.
    tick(m, 1, { jumpPressed: true, jumpHeld: true }); tick(m, 8, { jumpHeld: true });
    expect(m.liftViews().find(v => v.id === 'l2-lift')!.state).toBe('arriving');
    expect(m.stage).toBe('transit'); expect(m.solids.some(s => s.id === 'l2-lift-wall-right')).toBe(true);
    ride(m);
    expect(m.stage).toBe('arrival');
    expect(m.controller.body.y).toBe(24.4);
  });
});

describe('S4L recovery and snapshots', () => {
  for (const [name, route] of [['layer-1', sketchRoute], ['layer-2', sketchLayerTwo], ['layers-1-2', sketchJoinedRoute]] as const) {
    it(`${name}: mid-ride R, snapshot and blur return to the departure exit with the deck reset and no auto-start`, () => {
      const start = () => { const m = model(route); exit(m); stepOn(m); tick(m, 90); expect(m.transitProgress).toBeGreaterThan(0); return m; };
      const check = (m: SketchRouteModel) => {
        expect(m.stage).toBe('exit');
        expect(m.controller.body.x).toBe(m.leg.exitSpawn.x);
        expect(m.liftViews().find(v => v.id === m.leg.lift!.id)).toMatchObject({ state: 'bottom', progress: 0, walls: false });
        tick(m, 90);
        expect(m.stage).toBe('exit'); expect(m.controller.body.grounded).toBe(true);
      };
      const r = start(); tick(r, 1, { restartPressed: true, axis: 1, jumpPressed: true }); check(r);
      const snapshot = JSON.parse(JSON.stringify(start().session)) as SketchRouteSession;
      expect(snapshot.stage).toBe('transit');
      const restored = model(route); restored.restoreSession(snapshot); check(restored);
      const blurred = start(); expect(blurred.cancelRide()).toBe(true); check(blurred);
      expect(blurred.cancelRide()).toBe(false);
    });
  }

  it('a defended fall during a ride recovers to the departure exit, never to the leg start', () => {
    const m = model(sketchRoute); exit(m); stepOn(m); tick(m, 40);
    m.controller.respawn(64, 6); tick(m, 2);
    expect(m.recoveryRemaining).toBeGreaterThan(0);
    tick(m, 40);
    expect(m.stage).toBe('exit'); expect(m.controller.body.x).toBe(55.7);
  });

  it('restores an arrival snapshot on the next layer with the deck parked', () => {
    const m = model(sketchLayerTwo); exit(m); stepOn(m); ride(m);
    const n = model(sketchLayerTwo); n.restoreSession(JSON.parse(JSON.stringify(m.session)));
    expect(n.stage).toBe('arrival'); expect(n.controller.body).toMatchObject({ x: 4.2, y: 24.4 });
    expect(n.liftViews().map(v => [v.id, v.state])).toEqual([['l1-lift', 'parked'], ['l2-lift', 'parked']]);
  });
});

describe('S4L parked decks and joined rides', () => {
  it('parks the first deck on the Layer 2 study landing so its spawn stands on fixed ground', () => {
    const m = model(sketchLayerTwo); tick(m, 2);
    expect(m.liftViews().map(v => [v.id, v.state])).toEqual([['l1-lift', 'parked'], ['l2-lift', 'bottom']]);
    expect(m.controller.body).toMatchObject({ x: 64.2, y: 15.2, grounded: true });
  });

  it('draws both earlier decks parked at the top in every Layer 3 study', () => {
    for (const route of [sketchLayerThreeWalls, sketchLayerThreeSwings, sketchLayerThree]) {
      const m = model(route); tick(m, 2);
      expect(m.liftViews().map(v => [v.id, v.state, top(v.deck)])).toEqual([['l1-lift', 'parked', 15.2], ['l2-lift', 'parked', 24.4]]);
      expect(m.solids.find(s => s.id === 'l2-lift-deck')).toMatchObject({ x: -2.6, width: 2.6 });
      expect(m.controller.body).toMatchObject({ y: route.spawn.y, grounded: true });
      expect(m.hud().prompt).toBe('');
    }
  });

  it('rides both lifts in sequence on the joined route, each parking behind the player', () => {
    const m = model(sketchJoinedRoute);
    exit(m); stepOn(m); ride(m);
    expect(m.legId).toBe('layer-2'); expect(m.stage).toBe('traversal');
    expect(m.liftViews().map(v => v.state)).toEqual(['parked', 'bottom']);
    exit(m); stepOn(m);
    expect(m.liftViews().map(v => v.state)).toEqual(['parked', 'wind-up']);
    ride(m);
    expect(m.stage).toBe('arrival'); expect(m.sectionId).toBe('layer-3-landing');
    expect(m.liftViews().map(v => v.state)).toEqual(['parked', 'parked']);
    m.restartAdventure();
    expect(m.liftViews().map(v => v.state)).toEqual(['bottom', 'bottom']);
  });
});
