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
  /** Sketch-only remote FIFO recall. Optional so existing callers are unaffected. */
  recallPressed?: boolean;
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
  private carry = 0;
  private carrySpeed = 0;
  /** A released swing coasts with no input until it lands (Sketch only). */
  private coasting = false;
  readonly contacts: Collider[] = [];
  get airJumpAvailable(): boolean { return this.airborneJump; }
  get slidingActive(): boolean { return this.sliding; }
  /** Remaining seconds of carried release momentum, for observable state. */
  get momentumCarry(): number { return this.carry; }

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
    this.carry = this.carrySpeed = 0;
    this.coasting = false;
    this.contacts.length = 0;
  }

  /** A wall owns vertical motion while it holds the player: no air jump here. */
  consumeAirJump(): void { this.airborneJump = false; this.buffer = 0; this.coyote = 0; }

  /**
   * Explicit hand-off into externally driven motion (Sketch wall kick, swing
   * release, forced detach). Stale transient state is discarded so the next
   * ordinary update cannot replay a buffered press, reuse coyote time or carry
   * a slide mode across the transition. Additive: the Supper path is untouched.
   *
   * `carrySpeed` briefly raises the horizontal cap so a released arc keeps the
   * momentum it earned instead of braking to walking speed on the next tick.
   */
  launch(vx: number, vy: number, options: { airJump?: boolean; keepHeight?: boolean; carrySpeed?: number; carrySeconds?: number } = {}): void {
    const b = this.body;
    if (!options.keepHeight) b.grounded = false;
    b.vx = vx; b.vy = vy;
    this.coyote = this.buffer = 0;
    this.wasJumpHeld = false;
    this.airborneJump = options.airJump ?? true;
    // An authored launch owns its own velocity; a later Space release must not
    // multiply it down the way a held variable jump does.
    this.automaticLaunch = true;
    this.sliding = false;
    this.carrySpeed = Math.max(0, options.carrySpeed ?? 0);
    this.carry = this.carrySpeed > 0 ? (options.carrySeconds ?? 0.9) : 0;
    this.coasting = this.carrySpeed > 0;
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
    const cap = Math.max(t.speed, this.carry > 0 ? this.carrySpeed : 0);
    // Letting go of the direction after a released swing keeps its flight: it
    // slows only the way holding that direction would, never stops dead, and
    // so never reaches further than holding it. Opposite input still steers.
    if (b.grounded) this.coasting = false;
    const coast = this.coasting && input.axis === 0 && b.vx !== 0;
    const target = coast ? Math.sign(b.vx) * Math.min(Math.abs(b.vx), cap)
      : input.axis * (this.sliding ? t.slideSpeed : cap);
    // A butter takeoff carries its momentum until the next landing. Releasing
    // direction in the air must not silently apply dry-ground braking.
    const rate = (coast ? t.acceleration : input.axis === 0 ? (this.sliding ? (b.grounded ? t.slideBraking : 0) : t.braking) : (this.sliding ? t.slideAcceleration : t.acceleration)) * dt;
    b.vx += Math.max(-rate, Math.min(rate, target - b.vx));
    this.carry = Math.max(0, this.carry - dt);
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
      this.coasting = false;
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
