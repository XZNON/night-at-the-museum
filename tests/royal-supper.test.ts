import { describe, expect, it } from 'vitest';
import { Progression } from '../src/campaign/progression';
import { idleControls } from '../src/gameplay/controller';
import type { Controls } from '../src/gameplay/controller';
import { createSupperSession, RoyalSupperModel } from '../src/gameplay/royal-supper-model';
import { royalSupper } from '../src/levels/royal-supper';
import { FixedClock } from '../src/core/loop';

const dt = 1 / 60;
const run = (model: RoyalSupperModel, frames: number, input: Partial<Controls> = {}) => {
  for (let i = 0; i < frames; i++) model.update(dt, { ...idleControls(), ...input });
};
const create = () => {
  const progress = new Progression();
  return { progress, model: new RoyalSupperModel(royalSupper, createSupperSession(),
    () => progress.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' })) };
};

describe('Royal Supper gates and recovery', () => {
  it('cannot jump the fork gap without its settled bridge', () => {
    const { model } = create(); model.controller.respawn(23.2, 2.4); run(model, 1);
    model.controller.body.vx = royalSupper.tuning.speed;
    run(model, 1, { axis: 1, jumpPressed: true, jumpHeld: true });
    let farthest = 0;
    for (let i = 0; i < 130; i++) { run(model, 1, { axis: 1, jumpHeld: true }); farthest = Math.max(farthest, model.controller.body.x); }
    expect(farthest).toBeLessThan(33 - royalSupper.tuning.width);
    expect(model.session.checkpointId).toBe('before-fork');
    expect(model.solids.some(p => p.id === 'fork-bridge')).toBe(false);
  });
  it('ignores repeated fork activation; bridge collision appears only when settled and survives re-entry', () => {
    const { model, progress } = create(); model.controller.respawn(22, 2.4); run(model, 1);
    expect(model.prompt?.id).toBe('fork-bridge');
    run(model, 10, { interactPressed: true });
    expect(model.session.fork).toBe('toppling'); expect(model.solids.some(p => p.id === 'fork-bridge')).toBe(false);
    run(model, 55, { interactPressed: true });
    expect(model.session.fork).toBe('bridged'); expect(model.solids.some(p => p.id === 'fork-bridge')).toBe(true);
    run(model, 1, { restartPressed: true }); expect(model.session.fork).toBe('bridged');
    const reentry = new RoyalSupperModel(royalSupper, model.session,
      () => progress.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' }));
    expect(reentry.session.fork).toBe('bridged'); expect(reentry.controller.body.x).toBe(21.3);
  });
  it('recovers flame contact in under one second and keeps completed prop states', () => {
    const { model } = create(); model.session.fork = 'bridged'; model.session.checkpointId = 'after-fork';
    model.controller.respawn(41.2, 3.2); run(model, 1);
    expect(model.recoveryRemaining).toBeGreaterThan(0);
    run(model, 23); expect(model.controller.body.x).toBe(34.2);
    expect(model.session.fork).toBe('bridged'); expect(model.session.candle).toBe('lit');
    model.controller.respawn(39.2, 2.6); run(model, 1);
    expect(model.prompt?.id).toBe('candle-flame');
    run(model, 1, { interactPressed: true }); run(model, 40, { interactPressed: true });
    expect(model.session.candle).toBe('extinguished');
    model.controller.respawn(41.2, 3.2); run(model, 1);
    expect(model.recoveryRemaining).toBe(0);
    model.controller.respawn(46, 2.6); run(model, 1);
    expect(model.session.checkpointId).toBe('after-candle');
    model.controller.respawn(47, -3); run(model, 24);
    expect(model.controller.body.x).toBe(45.3); expect(model.session.candle).toBe('extinguished');
  });
  it('prevents jumping over the lit candle under the canopy', () => {
    const { model } = create(); model.session.fork = 'bridged'; model.session.checkpointId = 'after-fork';
    model.controller.respawn(39.5, 2.6); run(model, 1); model.controller.body.vx = royalSupper.tuning.speed;
    run(model, 1, { axis: 1, jumpPressed: true, jumpHeld: true });
    let crossed = false;
    for (let i = 0; i < 120; i++) { run(model, 1, { axis: 1, jumpHeld: true }); if (model.controller.body.x > 44) crossed = true; }
    expect(crossed).toBe(false); expect(model.session.checkpointId).toBe('after-fork');
  });
  it('remembers an in-flight action across exit and restarts cleanly with a new session', () => {
    const { model } = create(); model.controller.respawn(22, 2.4); run(model, 1);
    run(model, 1, { interactPressed: true }); run(model, 12);
    const reentry = new RoyalSupperModel(royalSupper, model.session, () => { throw new Error('Unexpected collection'); });
    run(reentry, 60); expect(reentry.session.fork).toBe('bridged');
    const fresh = new RoyalSupperModel(royalSupper, createSupperSession(), () => { throw new Error('Unexpected collection'); });
    expect(fresh.session.fork).toBe('upright'); expect(fresh.session.checkpointId).toBe('basket-start');
  });
  it('reports collection once per run and replay does not duplicate the inventory', () => {
    const { model, progress } = create(); model.session.fork = 'bridged'; model.session.candle = 'extinguished';
    model.controller.respawn(62, 3.8); run(model, 20);
    expect(model.completed).toBe(true); expect(model.collection?.changed).toBe(true);
    const replay = new RoyalSupperModel(royalSupper, model.session,
      () => progress.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' }));
    replay.controller.respawn(62, 3.8); run(replay, 20);
    expect(replay.collection?.changed).toBe(false); expect(progress.snapshot.collectedPieceIds).toEqual(['golden-pear']);
  });
});

describe('one fixed-step clock', () => {
  it('caps catch-up and resets time on resume instead of simulating a hidden tab interval', () => {
    const clock = new FixedClock(); let steps = 0;
    clock.advance(0, () => steps++); clock.advance(10000, () => steps++); expect(steps).toBe(6);
    clock.reset(); clock.advance(50000, () => steps++); expect(steps).toBe(6);
    clock.advance(50017, () => steps++); expect(steps).toBe(7);
  });
});
