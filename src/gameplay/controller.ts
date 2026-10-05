import { moveBody } from './collision';
import type { Body, Collider } from './collision';

export interface MovementTuning {
  width: number; height: number; speed: number; acceleration: number;
  braking: number; gravity: number; jumpSpeed: number; coyoteTime: number;
  jumpBuffer: number; releaseMultiplier: number; terminalSpeed: number;
  airJumpSpeed: number; bounceSpeed: number;
  slideAcceleration: number; slideBraking: number; slideSpeed: number;
}
export interface Controls {
  axis: number; jumpPressed: boolean; jumpHeld: boolean;
  interactPressed: boolean; restartPressed: boolean;
  jumpReleased?: boolean;
  forward?: number;
}
export const idleControls = (): Controls => ({ axis: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, restartPressed: false });

export class CharacterController {
  readonly body: Body;
  private coyote = 0;
  private buffer = 0;
  private wasJumpHeld = false;
  private airborneJump = true;
  private automaticLaunch = false;
  private sliding = false;
  readonly contacts: Collider[] = [];
  get airJumpAvailable(): boolean { return this.airborneJump; }
  get slidingActive(): boolean { return this.sliding; }

  constructor(readonly tuning: MovementTuning, x: number, y: number) {
    this.body = { x, y, width: tuning.width, height: tuning.height, vx: 0, vy: 0, grounded: false };
  }

  respawn(x: number, y: number): void {
    Object.assign(this.body, { x, y, vx: 0, vy: 0, grounded: false });
    this.coyote = this.buffer = 0;
    this.wasJumpHeld = false;
    this.airborneJump = true;
    this.automaticLaunch = false;
    this.sliding = false;
    this.contacts.length = 0;
  }

  update(dt: number, input: Controls, solids: readonly Collider[], surfaces: { butterIds?: readonly string[]; bounceIds?: readonly string[] } = {}): void {
    const t = this.tuning;
    const b = this.body;
    this.coyote = b.grounded ? t.coyoteTime : Math.max(0, this.coyote - dt);
    const freshPress = input.jumpPressed && (!this.wasJumpHeld || input.jumpReleased);
    this.buffer = freshPress ? t.jumpBuffer : Math.max(0, this.buffer - dt);
    if (b.grounded) this.sliding = solids.some(p => surfaces.butterIds?.includes(p.id) &&
      Math.abs(b.y - p.y - p.height) < 0.001 && b.x + b.width > p.x && b.x < p.x + p.width);
    const target = input.axis * (this.sliding ? t.slideSpeed : t.speed);
    // A butter takeoff carries its momentum until the next landing. Releasing
    // direction in the air must not silently apply dry-ground braking.
    const rate = (input.axis === 0 ? (this.sliding ? (b.grounded ? t.slideBraking : 0) : t.braking) : (this.sliding ? t.slideAcceleration : t.acceleration)) * dt;
    b.vx += Math.max(-rate, Math.min(rate, target - b.vx));
    if (this.buffer > 0 && this.coyote > 0) {
      b.vy = t.jumpSpeed;
      b.grounded = false;
      this.coyote = this.buffer = 0;
      this.automaticLaunch = false;
    } else if (freshPress && this.airborneJump) {
      b.vy = t.airJumpSpeed;
      this.airborneJump = false;
      this.automaticLaunch = false;
      this.coyote = this.buffer = 0;
    }
    if (!input.jumpHeld && this.wasJumpHeld && b.vy > 0 && !this.automaticLaunch) b.vy *= t.releaseMultiplier;
    this.wasJumpHeld = input.jumpHeld;
    b.vy = Math.max(-t.terminalSpeed, b.vy - t.gravity * dt);
    this.contacts.length = 0;
    const landing = moveBody(b, solids, dt, this.contacts);
    if (landing) {
      this.sliding = surfaces.butterIds?.includes(landing.id) ?? false;
      this.airborneJump = true;
      if (surfaces.bounceIds?.includes(landing.id)) {
        b.vy = t.bounceSpeed;
        b.grounded = false;
        this.coyote = this.buffer = 0;
        this.automaticLaunch = true;
      }
    }
  }
}
