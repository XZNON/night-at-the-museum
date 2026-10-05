import { moveBody } from './collision';
import type { Body, Collider } from './collision';

export interface MovementTuning {
  width: number; height: number; speed: number; acceleration: number;
  braking: number; gravity: number; jumpSpeed: number; coyoteTime: number;
  jumpBuffer: number; releaseMultiplier: number; terminalSpeed: number;
}
export interface Controls {
  axis: number; jumpPressed: boolean; jumpHeld: boolean;
  interactPressed: boolean; restartPressed: boolean;
  forward?: number;
}
export const idleControls = (): Controls => ({ axis: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, restartPressed: false });

export class CharacterController {
  readonly body: Body;
  private coyote = 0;
  private buffer = 0;
  private wasJumpHeld = false;

  constructor(readonly tuning: MovementTuning, x: number, y: number) {
    this.body = { x, y, width: tuning.width, height: tuning.height, vx: 0, vy: 0, grounded: false };
  }

  respawn(x: number, y: number): void {
    Object.assign(this.body, { x, y, vx: 0, vy: 0, grounded: false });
    this.coyote = this.buffer = 0;
    this.wasJumpHeld = false;
  }

  update(dt: number, input: Controls, solids: readonly Collider[]): void {
    const t = this.tuning;
    const b = this.body;
    this.coyote = b.grounded ? t.coyoteTime : Math.max(0, this.coyote - dt);
    this.buffer = input.jumpPressed ? t.jumpBuffer : Math.max(0, this.buffer - dt);
    const target = input.axis * t.speed;
    const rate = (input.axis === 0 ? t.braking : t.acceleration) * dt;
    b.vx += Math.max(-rate, Math.min(rate, target - b.vx));
    if (this.buffer > 0 && this.coyote > 0) {
      b.vy = t.jumpSpeed;
      b.grounded = false;
      this.coyote = this.buffer = 0;
    }
    if (!input.jumpHeld && this.wasJumpHeld && b.vy > 0) b.vy *= t.releaseMultiplier;
    this.wasJumpHeld = input.jumpHeld;
    b.vy = Math.max(-t.terminalSpeed, b.vy - t.gravity * dt);
    moveBody(b, solids, dt);
  }
}
