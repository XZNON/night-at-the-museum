import { RoyalSupperModel, createSupperSession } from '../src/gameplay/royal-supper-model';
import { royalSupper } from '../src/levels/royal-supper';
import { idleControls } from '../src/gameplay/controller';
import type { Controls } from '../src/gameplay/controller';
import { Progression } from '../src/campaign/progression';
export interface RouteAction { frames: number; axis: number; held: boolean; interact: boolean; restart: boolean }
export interface RouteStage { checkpoint: string; actions: RouteAction[]; seconds: number }
// Test-only route recorder: real movement/collision/timers, no teleports or
// progression setters. Its keyboard schedule also drives production Chromium.
export function recordRoute(): { stages: RouteStage[]; model: RoyalSupperModel } {
  const progression = new Progression();
  const m = new RoyalSupperModel(royalSupper, createSupperSession(), () => progression.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' }));
  const stages: RouteStage[] = []; let actions: RouteAction[] = []; let lastHeld = false;
  const tick = (axis = 0, held = false, interact = false, restart = false) => {
    const input: Controls = { ...idleControls(), axis, jumpHeld: held, jumpPressed: held && !lastHeld, interactPressed: interact, restartPressed: restart };
    m.update(1 / 60, input); lastHeld = held;
    if (m.recoveryRemaining > 0) throw new Error(`Route failure at ${m.controller.body.x.toFixed(2)},${m.controller.body.y.toFixed(2)}: ${m.cue}; clocks ${m.session.grapeElapsed},${m.session.candleElapsed},${m.session.dinerElapsed}`);
    const previous = actions.at(-1);
    if (previous && previous.axis === axis && previous.held === held && previous.interact === interact && previous.restart === restart) previous.frames++;
    else actions.push({ frames: 1, axis, held, interact, restart });
  };
  const idle = (frames: number) => { for (let i = 0; i < frames; i++) tick(); };
  const steer = (x: number): number => {
    const b = m.controller.body; const delta = x - b.x;
    if (!m.controller.slidingActive) return Math.abs(delta) < 0.12 ? 0 : Math.sign(delta);
    const acceleration = royalSupper.tuning.slideAcceleration;
    const stoppingDistance = b.vx * b.vx / (2 * acceleration);
    if (Math.sign(delta) === Math.sign(b.vx) && Math.abs(delta) <= stoppingDistance + 0.08) return -Math.sign(b.vx);
    return Math.abs(delta) < 0.08 && Math.abs(b.vx) < 0.4 ? 0 : Math.sign(delta);
  };
  const walk = (x: number) => {
    for (let f = 0; f < 1500; f++) {
      const b = m.controller.body;
      if (Math.abs(b.x - x) < 0.15 && (!m.controller.slidingActive || Math.abs(b.vx) < 0.4)) return;
      tick(steer(x));
    }
    throw new Error(`Walk blocked: ${m.controller.body.x} -> ${x}`);
  };
  const jump = (x: number, double = true, delay = 25, bounce = false) => {
    tick();
    for (let f = 0; f < 180; f++) {
      const b = m.controller.body;
      tick(steer(x), bounce ? f >= delay : (f < delay - 1 || (double && f >= delay)));
      if (!bounce && b.vy > 16.5) return;
      if (f > delay + 2 && b.grounded) { if (Math.abs(b.x - x) > 3) throw new Error(`Wrong landing: ${b.x} -> ${x}`); walk(x); idle(3); return; }
    }
    throw new Error(`Jump did not land: ${m.controller.body.x},${m.controller.body.y} -> ${x}`);
  };
  const end = (checkpoint: string) => {
    if (m.session.checkpointId !== checkpoint) throw new Error(`Expected ${checkpoint}, got ${m.session.checkpointId} at ${m.controller.body.x}`);
    stages.push({ checkpoint, actions, seconds: actions.reduce((n, a) => n + a.frames / 60, 0) }); actions = [];
    // Every stage starts from the safe, exact checkpoint pose, using the same
    // player-facing R action used in the browser schedule.
    tick(0, false, false, true); idle(6);
  };
  idle(6); walk(3.6); jump(8); walk(9); jump(14); walk(15); jump(20.5); walk(22); jump(27.5);
  walk(28.5); jump(34.5); walk(36); jump(41.5);
  for (let i = 0; i < 6; i++) { walk(i === 0 ? 42.5 : 47 + (i - 1) * 6.5 + 2.5); jump(47 + i * 6.5 + 1.5); }
  walk(82); jump(87.5); walk(96); end('before-butter');
  walk(102); jump(108.7); jump(114.5); jump(121.5);
  jump(128); walk(131); jump(142.5); jump(149); jump(158); jump(163); end('after-butter');
  walk(168);
  for (let i = 0; i < 6; i++) { jump(177 + i * 14 + 1.2); jump(177 + i * 14 + 8.5); }
  walk(262); end('before-fork');
  tick(0, false, true); idle(60); walk(284); end('after-fork');
  walk(294.8);
  while (!(m.candlePhase >= 2.05 && m.candlePhase < 2.10)) tick();
  jump(297.5, false, 60); jump(303.5, false, 60); jump(309.5, false, 60);
  jump(316, false, 60); end('after-candle');
  walk(321);
  for (const x of [334, 349.5, 372]) {
    while (!(m.dinerPhase === 'AWAY' && m.session.dinerElapsed % 5.25 < 0.05)) tick();
    walk(x);
  }
  end('after-diner');
  walk(374.5); jump(377.2, false);
  jump(388, true, 39, true);
  walk(389.3); jump(397); walk(398.8); jump(406, false);
  walk(409); jump(415, false); jump(425, true, 39, true);
  walk(426.3); jump(433.5); walk(435);
  if (!m.completed) throw new Error('Route reached pear without completing');
  stages.push({ checkpoint: 'pear', actions, seconds: actions.reduce((n, a) => n + a.frames / 60, 0) });
  return { stages, model: m };
}
