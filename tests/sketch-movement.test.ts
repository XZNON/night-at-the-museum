import { describe, expect, it } from 'vitest';
import { CharacterController, idleControls } from '../src/gameplay/controller';
import type { Controls } from '../src/gameplay/controller';
import { SketchModel } from '../src/gameplay/sketch-model';
import { SketchMovement } from '../src/gameplay/sketch-movement';
import type { SketchWorld } from '../src/gameplay/sketch-movement';
import { sketchBays, sketchMovement, sketchTuning } from '../src/levels/unfinished-sketch';
import type { SketchBayId, SketchTuning } from '../src/levels/unfinished-sketch';
import type { Collider } from '../src/gameplay/collision';
import { royalSupper } from '../src/levels/royal-supper';
import { SketchRouteModel } from '../src/gameplay/sketch-model';
import { sketchRoute } from '../src/levels/unfinished-sketch-route';
import { sketchJoinedRoute, sketchLayerTwo } from '../src/levels/unfinished-sketch-layer2';
import { sketchLayerThree, sketchLayerThreeSwings, sketchLayerThreeWalls } from '../src/levels/unfinished-sketch-layer3';

// Normal / wall-slide / nail-grip state transitions, anti-stacking and the
// measured movement envelopes. Royal Supper tuning is checked alongside so a
// Sketch change cannot silently alter the approved controller.

const dt = 1 / 60;
const keys = (o: Partial<Controls> = {}): Controls => ({ ...idleControls(), ...o });
const build = (bay: SketchBayId, tuning: SketchTuning = sketchTuning) =>
  new SketchModel(sketchBays[bay], tuning);
const run = (m: SketchModel, frames: number, input: Controls = keys()) => {
  for (let i = 0; i < frames; i++) m.update(dt, input);
};
const place = (m: SketchModel, targetId: string) => { m.enqueue({ type: 'place', targetId }); m.update(dt, keys()); };
const stand = (m: SketchModel, x: number, y: number) => m.controller.respawn(x, y);

/** Stand beside a mechanism's vertical face, just under its top. */
const beside = (m: SketchModel, mechanismId: string, side: -1 | 1) => {
  const rect = m.solids.find(s => s.id === mechanismId);
  if (!rect) throw new Error(`missing solid ${mechanismId}`);
  const x = side < 0 ? rect.x - m.controller.body.width - 0.01 : rect.x + rect.width + 0.01;
  m.controller.respawn(x, rect.y + rect.height - 1);
};
/** Stand within placement range of a socket, then pin it through the queue. */
const pinFrom = (m: SketchModel, targetId: string, x: number, y: number) => {
  stand(m, x, y); place(m, targetId); return m.isOccupied(targetId);
};
/** Stand within grip range of a placed swing nail. */
const standUnder = (m: SketchModel, targetId: string, dx = -1.5, dy = -1.2) => {
  const grip = m.targetPosition(targetId)!;
  m.controller.respawn(grip.x + dx, grip.y + dy);
};

/** Real controls: run off the launch ledge, jump to the nail and press E. */
const runOffAndGrip = (m: SketchModel, targetId = 'fixed-nail'): boolean => {
  let jumpAt = -1;
  for (let i = 0; i < 400; i++) {
    const b = m.controller.body;
    const t = i / 60;
    const wantJump = jumpAt < 0 && b.x > 12.7 && b.grounded;
    if (wantJump) jumpAt = t;
    const nail = m.targetPosition(targetId)!;
    const inReach = Math.hypot(b.x + b.width / 2 - nail.x, b.y + b.height / 2 - nail.y) <= sketchTuning.gripRadius;
    m.update(dt, keys({ axis: 1, jumpPressed: wantJump, jumpHeld: b.vy > 0 || wantJump, interactPressed: inReach }));
    if (m.move.state === 'swing') return true;
    if (m.recoveryRemaining > 0) return false;
  }
  return false;
};

describe('the shared controller transition stays Royal-Supper equivalent', () => {
  it('a launch clears stale jump, buffer, coyote and slide state', () => {
    const c = new CharacterController(sketchMovement, 0, 0);
    c.update(dt, keys({ jumpPressed: true, jumpHeld: true }), [{ id: 'g', x: -5, y: -1, width: 20, height: 1 }]);
    expect(c.airJumpAvailable).toBe(false);
    c.launch(9, 4, { airJump: true });
    expect(c.body.vx).toBe(9); expect(c.body.vy).toBe(4); expect(c.body.grounded).toBe(false);
    expect(c.airJumpAvailable).toBe(true);
    expect(c.contacts).toHaveLength(0);
    // A Space release after the hand-off must not multiply the authored velocity.
    c.update(dt, keys(), []);
    expect(c.body.vy).toBeCloseTo(4 - sketchMovement.gravity * dt, 6);
  });

  it('an ordinary update is unchanged by the launch support being present', () => {
    const floor: Collider[] = [{ id: 'floor', x: -50, y: -0.5, width: 150, height: 0.5 }];
    const a = new CharacterController(sketchMovement, 0, 0);
    const b = new CharacterController(sketchMovement, 0, 0);
    const script = [keys(), keys({ axis: 1 }), keys({ axis: 1, jumpPressed: true, jumpHeld: true }),
      keys({ axis: 1, jumpHeld: true }), keys({ axis: 1, jumpReleased: true, jumpHeld: true }), keys({ axis: 1 }), keys()];
    for (const input of script) { a.update(dt, input, floor); b.update(dt, input, floor); }
    expect({ ...b.body }).toEqual({ ...a.body });
    // The momentum carry is inert unless launch() asked for it.
    expect(a.momentumCarry).toBe(0);
  });

  it('momentum carry raises the horizontal cap only while it lasts', () => {
    const c = new CharacterController(sketchMovement, 0, 0);
    c.launch(14, 0, { carrySpeed: 14, carrySeconds: 0.5 });
    for (let i = 0; i < 20; i++) c.update(dt, keys({ axis: 1 }), []);
    expect(c.body.vx).toBeGreaterThan(sketchMovement.speed + 1);
    for (let i = 0; i < 60; i++) c.update(dt, keys({ axis: 1 }), []);
    expect(c.momentumCarry).toBe(0);
    expect(c.body.vx).toBeCloseTo(sketchMovement.speed, 2);
  });
});

describe('pinned wall slide and kick', () => {
  it('only a pinned climb board accepts a slide, and it caps the fall', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    m.enqueue({ type: 'recall' });
    m.update(dt, keys());
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    expect(m.move.state).toBe('normal');
    expect(m.walls).toHaveLength(0);
    place(m, 'walls-freeze-a');
    expect(m.walls).toHaveLength(1);
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    expect(m.move.state).toBe('wall-slide');
    expect(m.move.wall).toBe('walls-board-a');
    expect(m.controller.body.vy).toBeGreaterThanOrEqual(-sketchTuning.wall.slideMaxFall - 0.001);
  });

  it('a fresh press kicks once, away from the wall, and cannot recharge', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    expect(m.move.state).toBe('wall-slide');
    expect(m.movement.wallDirection).toBe(-1);
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    expect(m.controller.body.vx).toBeCloseTo(-sketchTuning.wall.kickHorizontal, 5);
    expect(m.controller.body.vy).toBeCloseTo(sketchTuning.wall.kickVertical, 5);
    expect(m.controller.airJumpAvailable).toBe(false);
    expect(m.move.state).toBe('normal');
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    expect(m.move.state).toBe('wall-slide');
    expect(m.move.wallTransfer).toBe(false);
    const held = { vx: m.controller.body.vx, vy: m.controller.body.vy };
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    // A refused transfer produces no kick at all: the press simply lets go of
    // the wall, and the next ordinary tick owns the motion again.
    expect(m.move.state).toBe('normal');
    expect(m.controller.body.vx).toBeCloseTo(held.vx, 6);
    expect(m.controller.body.vy).toBeCloseTo(held.vy, 6);
  });

  it('a distinct pinned board or a valid landing renews the transfer', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    expect(pinFrom(m, 'walls-freeze-b', 19, 4.5)).toBe(true);
    expect(m.walls.map(w => w.id).sort()).toEqual(['walls-board-a', 'walls-board-b']);
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    expect(m.move.wallTransfer).toBe(false);
    beside(m, 'walls-board-b', -1);
    run(m, 8, keys({}));
    expect(m.move.wall).toBe('walls-board-b');
    expect(m.move.wallTransfer).toBe(true);
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    expect(m.move.wallTransfer).toBe(false);
    stand(m, 2, 0); run(m, 5, keys({}));
    expect(m.move.wallTransfer).toBe(true);
  });

  it('re-pinning the same board is not a new surface for jump credit', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    expect(m.move.wallTransfer).toBe(false);
    m.enqueue({ type: 'recall' });
    m.update(dt, keys());
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    expect(m.move.state).toBe('wall-slide');
    expect(m.move.wallTransfer).toBe(false);
  });

  it('held and repeated Space never produce a second kick in the air', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    beside(m, 'walls-board-a', -1);
    run(m, 8, keys({}));
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    const kicked = m.controller.body.vy;
    for (let i = 0; i < 30; i++) m.update(dt, keys({ jumpHeld: true }));
    expect(m.controller.body.vy).toBeLessThan(kicked);
    expect(m.controller.airJumpAvailable).toBe(false);
  });
});

describe('direct nail swing', () => {
  const world = (grips: SketchWorld['grips'], solids: Collider[] = []): SketchWorld =>
    ({ solids, walls: [], grips });

  it('never grips without an explicit press, and never from a distance', () => {
    const controller = new CharacterController(sketchMovement, 0, 0);
    const movement = new SketchMovement(controller, sketchTuning);
    const grip = world([{ id: 'nail', x: 10, y: 4, vx: 0, vy: 0 }]);
    // Passing straight through the grip zone must not clip the player on.
    controller.respawn(9.6, 4);
    for (let i = 0; i < 30; i++) {
      movement.update(dt, keys({}), grip);
      expect(movement.state).toBe('normal');
    }
    // Far away, a press still does nothing.
    controller.respawn(30, 12);
    movement.update(dt, keys({ interactPressed: true }), world([{ id: 'nail', x: 10, y: 4, vx: 0, vy: 0 }]));
    expect(movement.state).toBe('normal');
    // In reach, the press attaches.
    controller.respawn(9.6, 4);
    movement.update(dt, keys({ interactPressed: true }), grip);
    expect(movement.state).toBe('swing');
  });

  it('either Space or E lets go of the nail', () => {
    for (const release of ['jumpPressed', 'interactPressed']) {
      const m = build('fixed-swing');
      stand(m, 11, 2.2);
      place(m, 'fixed-nail');
      standUnder(m, 'fixed-nail');
      m.update(dt, keys({ interactPressed: true }));
      expect(m.move.state).toBe('swing');
      m.update(dt, keys({ [release]: true }));
      expect(m.move.state).toBe('normal');
      expect(m.controller.airJumpAvailable).toBe(true);
    }
  });

  it('hangs the body directly beneath the nail with no rope length', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    expect(m.move.state).toBe('swing');
    const body = m.controller.body;
    const grip = m.targetPosition('fixed-nail')!;
    expect(Math.hypot(body.x + body.width / 2 - grip.x, body.y + body.height / 2 - grip.y))
      .toBeCloseTo(sketchTuning.swing.arm, 6);
    expect(body.x + body.width / 2).toBeCloseTo(grip.x, 6);
  });

  it('A/D builds momentum inside the authored caps and the arc never loops', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    expect(m.move.state).toBe('swing');
    let peak = 0;
    for (let i = 0; i < 900; i++) {
      m.update(dt, keys({ axis: Math.sign(m.movement.swing?.omega ?? 0) }));
      if (m.move.state !== 'swing') break;
      peak = Math.max(peak, Math.abs(m.movement.swing!.omega));
      expect(Math.abs(m.movement.swing!.angle)).toBeLessThanOrEqual(sketchTuning.swing.maxArc + 1e-6);
    }
    expect(peak).toBeGreaterThan(sketchTuning.swing.maxOmega * 0.5);
    expect(peak).toBeLessThanOrEqual(sketchTuning.swing.maxOmega + 1e-9);
  });

  it('releasing the pump bleeds momentum instead of running away', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 200; i++) m.update(dt, keys({ axis: Math.sign(m.movement.swing?.omega ?? 0) }));
    const first = peakSpeed(m, 120);
    const later = peakSpeed(m, 120);
    expect(later).toBeLessThan(first);
  });

  it('a press cannot both release the swing and fire another jump', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
    expect(m.move.state).toBe('normal');
    const vy = m.controller.body.vy;
    for (let i = 0; i < 5; i++) m.update(dt, keys({ jumpHeld: true }));
    expect(m.controller.body.vy).toBeLessThan(vy);
    expect(m.controller.airJumpAvailable).toBe(true);
  });

  it('suppresses immediate same-nail reattachment, then allows it', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    m.update(dt, keys({ jumpPressed: true }));
    expect(m.move.state).toBe('normal');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    expect(m.move.state).toBe('normal');
    // Hold the body in the grip zone while the cooldown elapses, so it does
    // not fall into the pit and reset the bay mid-check.
    const grip = m.targetPosition('fixed-nail')!;
    for (let i = 0; i < Math.ceil(sketchTuning.swing.reattachCooldown / dt) + 6; i++) {
      m.controller.respawn(grip.x - 1.5, grip.y - 1.2);
      m.update(dt, keys({}));
    }
    m.controller.respawn(grip.x - 1.5, grip.y - 1.2);
    m.update(dt, keys({ interactPressed: true }));
    expect(m.move.state).toBe('swing');
  });

  it('recalling the gripped nail detaches, keeps momentum and grants no new jump', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    standUnder(m, 'fixed-nail');
    m.update(dt, keys({ interactPressed: true }));
    for (let i = 0; i < 30; i++) m.update(dt, keys({ axis: 1 }));
    expect(m.move.state).toBe('swing');
    const speed = Math.hypot(m.controller.body.vx, m.controller.body.vy);
    m.enqueue({ type: 'recall' });
    m.update(dt, keys({}));
    expect(m.move.state).toBe('normal');
    expect(Math.hypot(m.controller.body.vx, m.controller.body.vy)).toBeGreaterThan(speed * 0.3);
    expect(m.controller.airJumpAvailable).toBe(false);
    expect(m.placedCount).toBe(0);
  });

  it('recalling the nail on the tick after a side grip does not fling the player', () => {
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    // A side approach: the swing starts near horizontal while the body settles beneath.
    standUnder(m, 'fixed-nail', 1.4, -0.6);
    m.update(dt, keys({ interactPressed: true }));
    expect(m.move.state).toBe('swing');
    // The first swing tick moves the body from beneath the nail onto its arc.
    m.update(dt, keys({}));
    m.enqueue({ type: 'recall' });
    m.update(dt, keys({}));
    expect(m.move.state).toBe('normal');
    const arcLimit = sketchTuning.swing.arm * sketchTuning.swing.maxOmega;
    expect(Math.hypot(m.controller.body.vx, m.controller.body.vy)).toBeLessThanOrEqual(arcLimit + 1e-6);
    expect(m.controller.airJumpAvailable).toBe(false);
  });

  it('an obstructed arc detaches instead of passing through geometry', () => {
    const controller = new CharacterController(sketchMovement, 0, 0);
    const movement = new SketchMovement(controller, sketchTuning);
    controller.respawn(-2, 4);
    const grips = [{ id: 'nail', x: 0, y: 4, vx: 0, vy: 0 }];
    movement.update(dt, keys({ interactPressed: true }), world(grips));
    expect(movement.state).toBe('swing');
    const wall: Collider[] = [{ id: 'wall', x: 1.4, y: -2, width: 1, height: 14 }];
    let detached = false;
    for (let i = 0; i < 400 && !detached; i++) {
      movement.update(dt, keys({ axis: 1 }), world(grips, wall));
      if (movement.state !== 'swing') detached = true;
    }
    expect(detached).toBe(true);
    expect(controller.body.x + controller.body.width).toBeLessThanOrEqual(1.4 + 0.01);
  });

  it('a moving mount never freezes and its velocity enters the release', () => {
    const m = build('moving-swing');
    stand(m, 10, 4.2);
    place(m, 'moving-nail');
    expect(m.isOccupied('moving-nail')).toBe(true);
    expect(m.isPinned('moving-mount-a')).toBe(false);
    let gripped = false;
    for (let i = 0; i < 600 && !gripped; i++) {
      standUnder(m, 'moving-nail');
      m.update(dt, keys({ interactPressed: true }));
      gripped = m.move.state === 'swing';
      if (m.recoveryRemaining > 0) break;
    }
    expect(gripped).toBe(true);
    // While gripped the body is carried with the moving nail.
    for (let i = 0; i < 20; i++) m.update(dt, keys({ axis: Math.sign(m.movement.swing?.omega ?? 0) }));
    const grip = m.targetPosition('moving-nail')!;
    const angle = m.movement.swing!.angle;
    expect(m.controller.body.x + m.controller.body.width / 2)
      .toBeCloseTo(grip.x + sketchTuning.swing.arm * Math.sin(angle), 1);
    // Release inherits the mount's own velocity on top of the tangential speed.
    for (let i = 0; i < 120; i++) {
      if (m.movement.swing!.omega < 0 || m.movement.swing!.angle * 57.3 > 30) break;
      m.update(dt, keys({ axis: 1 }));
    }
    const swing = m.movement.swing!;
    expect(Math.abs(swing.pivotVx)).toBeGreaterThan(0.05);
    const predicted = sketchTuning.swing.arm * Math.cos(swing.angle) * swing.omega + swing.pivotVx;
    m.update(dt, keys({ jumpPressed: true }));
    expect(Math.abs(m.controller.body.vx - predicted)).toBeLessThan(0.35);
  });
});

/** Peak tangential speed over a window with no pump input. */
function peakSpeed(m: SketchModel, frames: number): number {
  let peak = 0;
  for (let i = 0; i < frames; i++) {
    m.update(dt, keys({}));
    if (m.move.state !== 'swing') break;
    peak = Math.max(peak, Math.abs(m.movement.swing!.omega));
  }
  return peak;
}

describe('player review fixes', () => {
  it('recalling a platform under the player never traps or phases them', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    const rect = m.solids.find(s => s.id === 'walls-board-a')!;
    stand(m, rect.x + rect.width / 2 - m.controller.body.width / 2, rect.y + rect.height);
    run(m, 2);
    expect(m.controller.body.grounded).toBe(true);
    const top = () => {
      const board = m.solids.find(s => s.id === 'walls-board-a')!;
      const b = m.controller.body;
      return board.y + board.height - b.y;
    };
    expect(top()).toBeCloseTo(0, 3);
    // Pull the nail out from under the player.
    m.enqueue({ type: 'recall' });
    m.update(dt, keys());
    let worst = 0;
    for (let i = 0; i < 90; i++) {
      m.update(dt, keys());
      const b = m.controller.body;
      const board = m.solids.find(s => s.id === 'walls-board-a')!;
      // Never inside the board, and never below its top by more than a body.
      worst = Math.max(worst, b.y - (board.y + board.height));
      expect(b.y + b.height).toBeGreaterThanOrEqual(board.y - 0.001);
      expect(b.y).toBeLessThanOrEqual(board.y + board.height + 0.001);
    }
    expect(worst, 'never sinks through a returning board').toBeLessThan(0.001);
    expect(m.recoveryRemaining).toBe(0);
    // The board really did resume, so the release had a visible consequence.
    expect(m.isPinned('walls-board-a')).toBe(false);
    expect(Math.abs(m.mechanismView().find(v => v.id === 'walls-board-a')!.vy)).toBeGreaterThan(0.05);
  });

  it('recalling a foothold head under the player simply drops them', () => {
    const m = build('foothold');
    expect(pinFrom(m, 'foothold-a', 11, 2.2)).toBe(true);
    const head = m.solids.find(s => s.id === 'foothold-a-head')!;
    stand(m, head.x + head.width / 2 - m.controller.body.width / 2, head.y + head.height);
    run(m, 2);
    expect(m.controller.body.grounded).toBe(true);
    const y = m.controller.body.y;
    m.enqueue({ type: 'recall' });
    m.update(dt, keys());
    expect(m.solids.some(s => s.id === 'foothold-a-head')).toBe(false);
    run(m, 12);
    expect(m.controller.body.y).toBeLessThan(y - 0.5);
    expect(m.recoveryRemaining).toBe(0);
  });

  it('a pinned wall owns vertical motion, so one wall cannot be climbed by jumping', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    const board = () => m.solids.find(s => s.id === 'walls-board-a')!;
    const cling = () => {
      stand(m, board().x - m.controller.body.width - 0.01, board().y + board().height - 1);
      run(m, 4);
      expect(m.move.state).toBe('wall-slide');
      // While the wall holds the player, the ordinary air jump is gone.
      expect(m.controller.airJumpAvailable).toBe(false);
    };
    // Free air away from the board keeps the ordinary air jump.
    stand(m, board().x - 3, board().y + board().height - 1);
    m.update(dt, keys());
    expect(m.move.state).toBe('normal');
    expect(m.controller.airJumpAvailable).toBe(true);

    cling();
    // Each fresh press performs the one legal kick or is refused. A wall never
    // also grants an airborne jump, so a single wall cannot be climbed.
    for (let round = 0; round < 6; round++) {
      m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
      expect(m.controller.body.vy).toBeLessThanOrEqual(sketchTuning.wall.kickVertical + 0.001);
      expect(m.controller.airJumpAvailable).toBe(false);
      cling();
    }
  });

  it('wall hops keep working while alternating between two pinned walls', () => {
    const m = build('walls');
    expect(pinFrom(m, 'walls-freeze-a', 13.5, 3)).toBe(true);
    expect(pinFrom(m, 'walls-freeze-b', 19, 4.5)).toBe(true);
    let kicks = 0;
    for (const id of ['walls-board-a', 'walls-board-b', 'walls-board-a', 'walls-board-b']) {
      const rect = m.solids.find(s => s.id === id)!;
      stand(m, rect.x - m.controller.body.width - 0.01, rect.y + rect.height - 1);
      run(m, 6);
      expect(m.move.state).toBe('wall-slide');
      expect(m.move.wallTransfer, `transfer available on ${id}`).toBe(true);
      const before = { ...m.controller.body };
      m.update(dt, keys({ jumpPressed: true, jumpHeld: true }));
      expect(m.controller.body.vy).toBeGreaterThan(before.vy);
      expect(m.move.wallTransfer, 'credit spent after the kick').toBe(false);
      kicks++;
    }
    expect(kicks).toBe(4);
  });
});

describe('measured envelopes', () => {
  it('a built swing clears the fixed-swing pit and lands on the far ledge', () => {
    // Real controls: run off the launch ledge and jump until the hands grip.
    const m = build('fixed-swing');
    stand(m, 11, 2.2);
    place(m, 'fixed-nail');
    expect(runOffAndGrip(m)).toBe(true);
    expect(m.move.state).toBe('swing');

    // A forward release after building momentum must clear the pit.
    const ledge = sketchBays['fixed-swing'].solids.find(s => s.id === 'fixed-ledge')!;
    let landedOnLedge = false; let peak = 0;
    for (let held = 30; held < 160 && !landedOnLedge; held += 2) {
      const probe = build('fixed-swing');
      stand(probe, 11, 2.2);
      place(probe, 'fixed-nail');
      if (!runOffAndGrip(probe)) continue;
      for (let i = 0; i < held; i++) {
        probe.update(dt, keys({ axis: Math.sign(probe.movement.swing?.omega ?? 0) }));
        if (probe.move.state !== 'swing') break;
      }
      if (probe.move.state !== 'swing' || probe.movement.swing!.omega <= 0) continue;
      peak = Math.max(peak, probe.movement.swing!.omega);
      probe.update(dt, keys({ axis: 1, jumpPressed: true }));
      for (let i = 0; i < 400; i++) {
        probe.update(dt, keys({ axis: 1 }));
        if (probe.controller.body.grounded || probe.recoveryRemaining > 0) break;
      }
      landedOnLedge = probe.recoveryRemaining === 0 && probe.controller.body.x >= ledge.x &&
        probe.controller.body.x + probe.controller.body.width <= ledge.x + ledge.width;
    }
    expect(landedOnLedge, 'a forward release clears the pit and lands on the far ledge').toBe(true);
    expect(peak).toBeGreaterThan(sketchTuning.swing.maxOmega * 0.5);
  });

  it('records the reachable gap so later layers can be authored from evidence', () => {
    let reach = 0;
    for (let held = 30; held < 200; held += 3) {
      const probe = build('fixed-swing');
      stand(probe, 11, 2.2);
      place(probe, 'fixed-nail');
      if (!runOffAndGrip(probe)) continue;
      for (let i = 0; i < held; i++) {
        probe.update(dt, keys({ axis: Math.sign(probe.movement.swing?.omega ?? 0) }));
        if (probe.move.state !== 'swing') break;
      }
      if (probe.move.state !== 'swing' || probe.movement.swing!.omega <= 0) continue;
      probe.update(dt, keys({ axis: 1, jumpPressed: true }));
      for (let i = 0; i < 400; i++) {
        probe.update(dt, keys({ axis: 1 }));
        if (probe.controller.body.grounded || probe.recoveryRemaining > 0) break;
      }
      if (probe.recoveryRemaining === 0) reach = Math.max(reach, probe.controller.body.x);
    }
    // A forward release lands well past the pit but inside the authored ledge.
    expect(reach).toBeGreaterThan(24);
    expect(reach).toBeLessThanOrEqual(35);
  });
});

describe('Layer 3 air momentum when A/D is let go (user request 2026-10-07)', () => {
  const floor: Collider[] = [{ id: 'floor', x: -50, y: -1, width: 200, height: 1 }];
  /** Run right, jump, let go of D after `held` airborne ticks; report vx and distance at landing. */
  const flight = (tuning: typeof sketchMovement, held: number, coast: boolean) => {
    const c = new CharacterController(tuning, 0, 0); c.airCoast = coast;
    for (let f = 0; f < 40; f++) c.update(dt, { ...idleControls(), axis: 1 }, floor);
    const x0 = c.body.x;
    c.update(dt, { ...idleControls(), axis: 1, jumpPressed: true, jumpHeld: true }, floor);
    let vxAfterRelease = NaN;
    for (let f = 0; f < 200 && !c.body.grounded; f++) {
      c.update(dt, { ...idleControls(), axis: f < held ? 1 : 0, jumpHeld: true }, floor);
      if (f === held + 6) vxAfterRelease = c.body.vx;
    }
    return { vx: vxAfterRelease, distance: c.body.x - x0 };
  };

  it('with air coast a jump keeps its speed after letting go, never further than holding', () => {
    const letGo = flight(sketchMovement, 5, true); const holding = flight(sketchMovement, 999, true);
    expect(letGo.vx).toBeCloseTo(sketchMovement.speed, 5);
    expect(letGo.distance).toBeGreaterThan(holding.distance * 0.95);
    expect(letGo.distance).toBeLessThanOrEqual(holding.distance + 1e-9);
  });

  it('only Layer 3 presets coast; earlier Sketch layers, S1 bays and Royal Supper keep air braking', () => {
    expect(flight(sketchMovement, 5, false).vx).toBe(0);
    expect(flight(royalSupper.tuning, 5, false).vx).toBe(0);
    expect(new CharacterController(royalSupper.tuning, 0, 0).airCoast).toBe(false);
    for (const bay of Object.values(sketchBays)) expect(new SketchModel(bay, sketchTuning).controller.airCoast).toBe(false);
    expect([sketchLayerThreeWalls, sketchLayerThreeSwings].map(f => new SketchRouteModel(f, sketchTuning).controller.airCoast)).toEqual([true, true]);
    const joined = new SketchRouteModel(sketchLayerThree, sketchTuning); expect(joined.controller.airCoast).toBe(true);
    joined.controller.respawn(16, 49.5); joined.update(dt, idleControls()); expect(joined.legId).toBe('l3-swings'); expect(joined.controller.airCoast).toBe(true);
    for (const f of [sketchRoute, sketchLayerTwo, sketchJoinedRoute]) expect(new SketchRouteModel(f, sketchTuning).controller.airCoast).toBe(false);
  });
});
