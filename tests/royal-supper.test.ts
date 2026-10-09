import { describe, expect, it } from 'vitest';
import { CharacterController, idleControls } from '../src/gameplay/controller';
import { Progression } from '../src/campaign/progression';
import { createSupperSession, grapeRects, RoyalSupperModel } from '../src/gameplay/royal-supper-model';
import { royalSupper, movementLane } from '../src/levels/royal-supper';
import { FixedClock } from '../src/core/loop';
const dt = 1 / 60;
const create = () => {
  const progress = new Progression();
  return { progress, model: new RoyalSupperModel(royalSupper, createSupperSession(),
    () => progress.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' })) };
};
const run = (m: RoyalSupperModel, frames: number) => { for (let i = 0; i < frames; i++) m.update(dt, idleControls()); };
const floor = { id: 'floor', x: -50, y: -0.5, width: 150, height: 0.5 };
describe('guarded double jump and bounce', () => {
  it('accepts a genuine release and re-press between fixed ticks without allowing further launches', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 0); c.update(dt, idleControls(), [floor]);
    const jump = { ...idleControls(), jumpPressed: true, jumpHeld: true };
    c.update(dt, jump, [floor]);
    c.update(dt, { ...jump, jumpReleased: true }, [floor]);
    expect(c.airJumpAvailable).toBe(false); const secondVelocity = c.body.vy;
    c.update(dt, { ...jump, jumpReleased: true }, [floor]); expect(c.body.vy).toBeLessThan(secondVelocity);
  });
  it('requires release/fresh press, permits one air jump, and side/ceiling contact cannot recharge it', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 3); c.update(dt, idleControls(), [{ ...floor, y: 2.5 }]);
    const jump = { ...idleControls(), jumpPressed: true, jumpHeld: true };
    c.update(dt, jump, [floor]); const initial = c.body.vy;
    c.update(dt, jump, [floor]); expect(c.body.vy).toBeLessThan(initial); expect(c.airJumpAvailable).toBe(true);
    c.update(dt, idleControls(), [floor]); c.update(dt, jump, [floor]); expect(c.airJumpAvailable).toBe(false);
    const ceiling = { id: 'ceiling', x: -10, y: c.body.y + c.body.height + 0.01, width: 30, height: 1 };
    c.update(dt, { ...idleControls(), jumpHeld: true }, [ceiling]); expect(c.body.vy).toBe(0);
    c.update(dt, idleControls(), [ceiling]); c.update(dt, jump, [ceiling]); expect(c.body.vy).toBeLessThan(0); expect(c.airJumpAvailable).toBe(false);
  });
  it('a ledge fall gets one rescue jump and a valid landing restores it', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 3); c.update(dt, idleControls(), [{ ...floor, y: 2.5 }]);
    for (let i = 0; i < 10; i++) c.update(dt, idleControls(), []);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, []); expect(c.body.vy).toBeGreaterThan(9);
    c.update(dt, idleControls(), []); c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, []);
    expect(c.airJumpAvailable).toBe(false);
    for (let i = 0; i < 120; i++) c.update(dt, idleControls(), [floor]); expect(c.airJumpAvailable).toBe(true);
  });
  it('bounce occurs only on a downward landing, consumes buffered ground launch and permits one air jump', () => {
    const pad = { ...floor, id: 'pad' }; const c = new CharacterController(royalSupper.tuning, 0, 0.05); c.body.vy = -3;
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, [pad], { bounceIds: ['pad'] });
    // An air jump before contacting the pad leaves it; repeat with an exhausted allowance.
    c.respawn(0, 2); c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, []);
    c.body.y = 0.05; c.body.vy = -3; c.update(dt, idleControls(), [pad], { bounceIds: ['pad'] });
    expect(c.body.vy).toBe(17); expect(c.body.grounded).toBe(false);
    c.update(dt, idleControls(), [pad], { bounceIds: ['pad'] }); expect(c.body.vy).toBeLessThan(17);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, [pad], { bounceIds: ['pad'] });
    expect(c.body.vy).toBeCloseTo(10.8 - 25 * dt); expect(c.airJumpAvailable).toBe(false);
    c.update(dt, idleControls(), [pad], { bounceIds: ['pad'] }); c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, [], { bounceIds: ['pad'] });
    expect(c.airJumpAvailable).toBe(false);
    c.respawn(-1, -0.2); c.body.vx = 6.8; c.update(dt, idleControls(), [pad], { bounceIds: ['pad'] }); expect(c.body.vy).toBeLessThan(0);
  });
  it('butter retains momentum but braking and reversing remain possible', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 0); c.update(dt, idleControls(), [floor]); c.body.vx = 6.8;
    for (let i = 0; i < 30; i++) c.update(dt, idleControls(), [floor], { butterIds: ['floor'] });
    expect(c.body.vx).toBeCloseTo(5.7);
    for (let i = 0; i < 60; i++) c.update(dt, { ...idleControls(), axis: -1 }, [floor], { butterIds: ['floor'] });
    expect(c.body.vx).toBeLessThan(-6);
  });
  it('carries a faster butter slide through takeoff and landing without held direction, then clears it on dry ground or respawn', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 0);
    const surfaces = { butterIds: ['floor'] };
    c.update(dt, idleControls(), [floor], surfaces);
    for (let f = 0; f < 60; f++) c.update(dt, { ...idleControls(), axis: 1 }, [floor], surfaces);
    expect(c.body.vx).toBeCloseTo(9.2);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, [floor], surfaces);
    const takeoffSpeed = c.body.vx;
    for (let f = 0; f < 90 && !c.body.grounded; f++) c.update(dt, { ...idleControls(), jumpHeld: true }, [floor], surfaces);
    expect(c.body.grounded).toBe(true); expect(c.body.vx).toBeCloseTo(takeoffSpeed);
    c.update(dt, idleControls(), [floor], surfaces); expect(c.body.vx).toBeGreaterThan(9);
    const dryFloor = { ...floor, id: 'dry' };
    for (let f = 0; f < 12; f++) c.update(dt, idleControls(), [dryFloor], surfaces);
    expect(c.body.vx).toBe(0);
    c.respawn(0, 3); c.body.vx = 6.8;
    for (let f = 0; f < 10; f++) c.update(dt, idleControls(), [floor], surfaces);
    expect(c.body.vx).toBe(0);
  });
  it('measures full double-jump and bounce envelopes across every second-jump delay', () => {
    const measure = (bounce: boolean) => {
      let reach = 0; let height = 0;
      for (let delay = 2; delay <= 65; delay++) {
        const c = new CharacterController(royalSupper.tuning, 0, 0); c.update(dt, idleControls(), [floor], bounce ? { bounceIds: ['floor'] } : {});
        c.body.vx = 6.8;
        for (let f = 0; f < 180; f++) {
          c.update(dt, { ...idleControls(), axis: 1, jumpHeld: f !== delay - 1, jumpPressed: (!bounce && f === 0) || f === delay }, [floor]);
          height = Math.max(height, c.body.y); if (c.body.grounded) { reach = Math.max(reach, c.body.x); break; }
        }
      }
      return { reach, height };
    };
    const double = measure(false); const bounce = measure(true);
    expect(double.reach).toBeLessThan(12); expect(double.height).toBeLessThan(4.7);
    expect(bounce.height).toBeGreaterThan(7); expect(bounce.reach).toBeLessThan(17);
    console.info('Measured envelopes', { double, bounce });
  });
});
describe('required gates, cyclic hazards and recovery', () => {
  it('crumb side, top and underside contact recover even when swept collision leaves no overlap', () => {
    const crumb = royalSupper.platforms.find(p => p.art === 'crumb')!;
    for (const contact of ['side', 'top', 'underside'] as const) {
      const { model } = create(); model.session.checkpointId = 'before-butter'; model.session.fork = 'bridged';
      const b = model.controller.body;
      if (contact === 'side') { model.controller.respawn(crumb.x - b.width - 0.05, 2.4); b.vx = 9.2; }
      if (contact === 'top') { model.controller.respawn(crumb.x, crumb.y + crumb.height + 0.02); b.vy = -10; }
      if (contact === 'underside') { model.controller.respawn(crumb.x, crumb.y - b.height - 0.02); b.vy = 10; }
      model.update(dt, { ...idleControls(), axis: contact === 'side' ? 1 : 0 });
      expect(model.recoveryRemaining).toBeGreaterThan(0); expect(model.cue).toContain('Crumb');
      run(model, 23); expect(model.controller.body.x).toBe(96); expect(model.session.fork).toBe('bridged');
    }
  });
  it('all three cover strips protect both boundary poses throughout LOOK, while visible exposure is caught', () => {
    for (const c of royalSupper.diner.cover) {
      for (const x of [c.x, c.x + c.width - royalSupper.tuning.width]) {
        const { model } = create(); model.session.checkpointId = 'after-candle';
        model.controller.respawn(x, c.y); model.session.dinerStarted = true; model.session.dinerElapsed = 3.3;
        run(model, 90); expect(model.hidden).toBe(true); expect(model.recoveryRemaining).toBe(0);
      }
      const { model } = create(); model.session.checkpointId = 'after-candle';
      model.controller.respawn(c.x - 0.05, c.y); model.session.dinerElapsed = 3.3;
      run(model, 1); expect(model.recoveryRemaining).toBeGreaterThan(0);
    }
    expect(royalSupper.diner.cover).toHaveLength(3);
  });
  it('cannot bypass the 16-unit fork with any air-jump timing', () => {
    for (let delay = 2; delay < 90; delay++) {
      const { model } = create(); model.session.checkpointId = 'before-fork'; model.controller.respawn(265.3, 2.4); run(model, 1); model.controller.body.vx = 6.8;
      let crossed = false;
      for (let f = 0; f < 180; f++) {
        model.update(dt, { ...idleControls(), axis: 1, jumpHeld: f !== delay - 1, jumpPressed: f === 0 || f === delay });
        crossed ||= model.controller.body.x >= 281.35;
      }
      expect(crossed).toBe(false); expect(model.session.checkpointId).toBe('before-fork');
    }
    // The only production bounce pad lies after both mandatory gates.
    expect(royalSupper.platforms.filter(p => p.art === 'jelly').every(p => p.x > 315)).toBe(true);
  });
  it('repeat E cannot expose bridge collision before settling; action and checkpoint survive re-entry', () => {
    const { model, progress } = create(); model.session.checkpointId = 'before-fork'; model.restartCheckpoint(); run(model, 1);
    for (let f = 0; f < 10; f++) model.update(dt, { ...idleControls(), interactPressed: true });
    expect(model.session.fork).toBe('toppling'); expect(model.solids.some(p => p.id === 'fork-bridge')).toBe(false);
    const next = new RoyalSupperModel(royalSupper, model.session, () => progress.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' }));
    run(next, 60); expect(next.session.fork).toBe('bridged'); expect(next.solids.some(p => p.id === 'fork-bridge')).toBe(true);
    next.restartCheckpoint(); expect(next.session.fork).toBe('bridged'); expect(next.controller.body.x).toBe(262);
    expect(createSupperSession().fork).toBe('upright');
  });
  it('extinguishes sequentially, relights independently and slow traversal burns with a repeatable retry', () => {
    const { model } = create(); model.session.checkpointId = 'after-fork'; model.session.fork = 'bridged';
    model.session.candlesStarted = true; model.session.candleElapsed = 2.1;
    expect([0, 1, 2].map(i => model.flameLit(i))).toEqual([false, true, true]);
    model.session.candleElapsed = 3.15; expect([0, 1, 2].map(i => model.flameLit(i))).toEqual([false, false, true]);
    model.session.candleElapsed = 4.3; expect([0, 1, 2].map(i => model.flameLit(i))).toEqual([true, false, false]);
    model.controller.respawn(296.4, 3.2); run(model, 1); expect(model.recoveryRemaining).toBeGreaterThan(0);
    run(model, 23); expect(model.controller.body.x).toBe(283.5); expect(model.session.candleElapsed).toBe(0); expect(model.session.fork).toBe('bridged');
  });
  it('lit candle canopy blocks second-jump timings from both its entry and beneath it', () => {
    for (const startX of [290.8, 294.8]) {
    for (let delay = 2; delay < 55; delay++) {
      const { model } = create(); model.session.checkpointId = 'after-fork'; model.session.fork = 'bridged';
      model.controller.respawn(startX, 2.4); run(model, 1);
      // Fix the lit phase by resetting it each step; test geometry independent of natural windows.
      for (let f = 0; f < 80; f++) {
        model.session.candleElapsed = 0;
        model.update(dt, { ...idleControls(), axis: 1, jumpHeld: f !== delay - 1, jumpPressed: f === 0 || f === delay });
        expect(model.controller.body.x).toBeLessThan(298);
      }
    }
    }
  });
  it('walking between extinguished candle tops falls into a gap instead of crossing a hidden floor', () => {
    const { model } = create(); model.session.checkpointId = 'after-fork'; model.session.fork = 'bridged';
    model.session.candlesStarted = true; model.session.candleElapsed = 2.1;
    model.controller.respawn(297.5, 3.2); run(model, 1);
    let fell = false; let recovered = false;
    for (let f = 0; f < 180 && !recovered; f++) {
      // Keep whichever column we approach in its ember window. Even without
      // flame contact, walking cannot bridge the missing collision geometry.
      model.session.candlesStarted = true;
      model.session.candleElapsed = model.controller.body.x < 301 ? 2.1 : 3.2;
      model.update(dt, { ...idleControls(), axis: 1 });
      fell ||= model.controller.body.y < 2.4;
      recovered = model.recoveryRemaining > 0;
    }
    expect(fell).toBe(true); expect(recovered).toBe(true); expect(model.cue).toContain('slip');
    expect(model.session.checkpointId).toBe('after-fork');
  });
  it('detects still/airborne exposure while fully hidden bodies remain safe', () => {
    const { model } = create(); model.session.checkpointId = 'after-candle'; model.session.fork = 'bridged';
    model.session.dinerElapsed = 3.3; model.controller.respawn(321, 2.4); run(model, 1); expect(model.recoveryRemaining).toBe(0); expect(model.hidden).toBe(true);
    model.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true });
    for (let i = 0; i < 5; i++) model.update(dt, { ...idleControls(), jumpHeld: true });
    expect(model.recoveryRemaining).toBeGreaterThan(0);
    model.restartCheckpoint(); model.controller.respawn(327, 2.4); model.session.dinerElapsed = 3.3; run(model, 1);
    expect(model.recoveryRemaining).toBeGreaterThan(0);
  });
  it('grapes are repeatable, drop out of a collider-protected chute and cannot overlap checkpoint spawns', () => {
    const { model } = create(); model.session.grapesStarted = true; model.session.grapeElapsed = 0;
    const first = model.grapes; const g = royalSupper.grapes;
    // A pair's first grape appears at the chute, above the route, at this phase.
    model.session.grapeElapsed = g.period - g.preroll % g.period;
    const spawned = model.grapes.find(r => r.y > 5.9);
    expect(spawned?.y).toBeCloseTo(6); expect(spawned!.x + g.radius).toBeCloseTo(g.startX);
    for (let t = 0; t < 2 * g.period; t += 0.05) {
      model.session.grapeElapsed = t;
      for (const cp of royalSupper.checkpoints) expect(model.grapes.every(r => r.x + r.width < cp.spawn.x || r.x > cp.spawn.x + 0.65)).toBe(true);
    }
    model.restartCheckpoint(); model.session.grapesStarted = true; expect(model.grapes).toEqual(first);
  });
  it('the grape run is already full on arrival, a continuous stream of ground pairs that rolls off before the entry', () => {
    const g = royalSupper.grapes; const run = (t: number) => grapeRects(g, t).filter(r => r.y === g.y);
    // Full on arrival: grounded pairs from the entry to the chute.
    const arrival = run(0).map(r => r.x + g.radius);
    expect(arrival.length).toBeGreaterThanOrEqual(10);
    expect(Math.min(...arrival)).toBeLessThan(180); expect(Math.max(...arrival)).toBeGreaterThan(245);
    // On an after-butter retry the last pair has just rolled off the entry.
    expect(Math.min(...arrival)).toBeGreaterThan(g.endX + 8);
    for (let t = 0; t < 3 * g.period; t += 1 / 60) {
      const grapes = grapeRects(g, t);
      // Never past the entry, where the player waits (x <= 166.85 with its width).
      expect(grapes.every(r => r.x >= g.endX - g.radius - 1e-9)).toBe(true);
      // Still pairs on the ground: never more than two grapes within one pair's spread.
      for (const r of grapes) expect(grapes.filter(o => Math.abs(o.x - r.x) <= g.speed * g.offsets[1] + 1e-6).length).toBeLessThanOrEqual(2);
    }
  });
  it('the grape clock wakes at the butter, out of sight of the run', () => {
    const { model } = create(); model.session.checkpointId = 'before-butter'; model.restartCheckpoint(); run(model, 10);
    expect(model.session.grapesStarted).toBe(false);
    model.controller.respawn(royalSupper.grapes.wakeX + 0.5, 2.4); run(model, 1); expect(model.session.grapesStarted).toBe(true);
  });
  it('grape contact resets to the safe completed-section checkpoint and resets the rolling wave', () => {
    const { model } = create(); model.session.checkpointId = 'after-butter'; model.session.grapesStarted = true; model.session.grapeElapsed = 4;
    const grounded = model.grapes.find(r => r.y === royalSupper.grapes.y)!;
    model.controller.respawn(grounded.x, 2.4); run(model, 1); expect(model.recoveryRemaining).toBeGreaterThan(0);
    // Back at the checkpoint the clock restarts from the same readable phase.
    run(model, 23); expect(model.controller.body.x).toBe(163); expect(model.session.grapeElapsed).toBeLessThanOrEqual(2 * dt + 1e-9);
  });
  it('collection requires the completed route and is idempotent on replay', () => {
    const { model, progress } = create(); model.controller.respawn(435, 15.6); run(model, 1); expect(model.completed).toBe(false);
    model.session.checkpointId = 'after-diner'; model.session.fork = 'bridged'; run(model, 1); expect(model.collection?.changed).toBe(true);
    const replay = new RoyalSupperModel(royalSupper, model.session, () => progress.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' }));
    replay.controller.respawn(435, 15.6); run(replay, 1); expect(replay.collection?.changed).toBe(false);
    expect(progress.snapshot.collectedPieceIds).toEqual(['golden-pear']);
    expect(movementLane.pear.x).toBeLessThan(0);
  });
});
describe('one fixed-step clock', () => {
  it('caps catch-up and resets time on resume rather than simulating a hidden interval', () => {
    const clock = new FixedClock(); let steps = 0; clock.advance(0, () => steps++); clock.advance(10000, () => steps++); expect(steps).toBe(6);
    clock.reset(); clock.advance(50000, () => steps++); expect(steps).toBe(6); clock.advance(50017, () => steps++); expect(steps).toBe(7);
  });
});
