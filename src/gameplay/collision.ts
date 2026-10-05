export interface Rect { x: number; y: number; width: number; height: number }
export interface Collider extends Rect { id: string }

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

export interface Body extends Rect {
  vx: number;
  vy: number;
  grounded: boolean;
}

const EPSILON = 0.00001;
const intersectsAxis = (a: number, size: number, b: number, otherSize: number) =>
  a + size > b + EPSILON && a < b + otherSize - EPSILON;

// Axis-aligned swept resolution: consider the whole displacement, not just
// the final overlap. Thin dishes remain solid even at unusually high velocity.
export function moveBody(body: Body, solids: readonly Collider[], dt: number): void {
  const dx = body.vx * dt;
  let x = body.x + dx;
  for (const solid of solids) {
    if (!intersectsAxis(body.y, body.height, solid.y, solid.height)) continue;
    if (dx > 0 && body.x + body.width <= solid.x + EPSILON && x + body.width >= solid.x) {
      x = Math.min(x, solid.x - body.width);
    } else if (dx < 0 && body.x >= solid.x + solid.width - EPSILON && x <= solid.x + solid.width) {
      x = Math.max(x, solid.x + solid.width);
    }
  }
  if (x !== body.x + dx) body.vx = 0;
  body.x = x;

  const dy = body.vy * dt;
  let y = body.y + dy;
  body.grounded = false;
  for (const solid of solids) {
    if (!intersectsAxis(body.x, body.width, solid.x, solid.width)) continue;
    const top = solid.y + solid.height;
    if (dy <= 0 && body.y >= top - EPSILON && y <= top) {
      y = Math.max(y, top);
      body.grounded = true;
    } else if (dy > 0 && body.y + body.height <= solid.y + EPSILON && y + body.height >= solid.y) {
      y = Math.min(y, solid.y - body.height);
    }
  }
  if (y !== body.y + dy || body.grounded) body.vy = 0;
  body.y = y;
}
