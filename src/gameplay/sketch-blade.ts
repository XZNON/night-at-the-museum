import type { Rect } from './collision';

/** SAT between the visible rotating blade and an axis-aligned player body. */
export function bladeContact(body: Rect, blade: { x: number; y: number; angle: number },
  length: number, thickness: number, margin = 0): boolean {
  const c = Math.cos(-blade.angle); const s = Math.sin(-blade.angle);
  const dx = body.x + body.width / 2 - blade.x;
  const dy = body.y + body.height / 2 - blade.y;
  const hw = length / 2 + margin; const hh = thickness / 2 + margin;
  const bw = body.width / 2; const bh = body.height / 2;
  return Math.abs(dx) <= bw + hw * Math.abs(c) + hh * Math.abs(s) &&
    Math.abs(dy) <= bh + hw * Math.abs(s) + hh * Math.abs(c) &&
    Math.abs(dx * c + dy * s) <= hw + bw * Math.abs(c) + bh * Math.abs(s) &&
    Math.abs(-dx * s + dy * c) <= hh + bw * Math.abs(s) + bh * Math.abs(c);
}

/** Sample at <= .04u relative travel, with .02u padding closing sample gaps. */
export function sweptBladeContact(from: Rect, to: Rect, startTime: number, dt: number,
  period: number, length: number, thickness: number,
  pose: (time: number) => { x: number; y: number; angle: number }): boolean {
  const travel = Math.hypot(to.x - from.x, to.y - from.y) +
    2 * Math.PI / period * (length + thickness / 2) * dt;
  const steps = Math.max(1, Math.ceil(travel / 0.04));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    if (bladeContact({ ...to, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k },
      pose(startTime + dt * k), length, thickness, 0.02)) return true;
  }
  return false;
}
