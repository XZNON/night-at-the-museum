import type { Controls } from './controller';
import type { CharacterController } from './controller';
import { moveBody } from './collision';
import type { Collider } from './collision';
import type { SketchTuning } from '../levels/unfinished-sketch';

// Sketch-only movement. Three explicit states own motion while they are
// active: normal (the shared controller), wall-slide (a pinned climb board)
// and swing (a directly gripped nail). There is no rope, no tether length
// and no second character controller.

export type MotionState = 'normal' | 'wall-slide' | 'swing';

export interface GripSite {
  /** Target ID of the placed swing nail. */
  id: string;
  /** Live world position of the nail, including a moving mount's travel. */
  x: number; y: number;
  /** Authored velocity of that position, used at release. */
  vx: number; vy: number;
}

export interface SketchWorld {
  solids: readonly Collider[];
  /** Pinned climbable boards. Only their sides accept a wall slide. */
  walls: readonly Collider[];
  grips: readonly GripSite[];
}

export interface SwingState {
  targetId: string;
  /** Angle from straight down; positive rotates toward +x. */
  angle: number;
  omega: number;
  pivotVx: number;
  pivotVy: number;
}

export interface SketchMoveHud {
  state: MotionState;
  wall: string;
  wallTransfer: boolean;
  swingTarget: string;
  swingAngle: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const EMPTY_INPUT: Controls = { axis: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, restartPressed: false };
const TOUCH_EPSILON = 0.14;

export class SketchMovement {
  state: MotionState = 'normal';
  wallId = '';
  wallSide = 0;
  swing: SwingState | null = null;
  private wallTransfer = true;
  private lastKickWall = '';
  private kickAxis = 0;
  private kickLock = 0;
  private kickBufferUntil = -1;
  private wallTime = 0;
  private gripBlockId = '';
  private gripBlockUntil = 0;
  private elapsed = 0;
  /** One-off gameplay cue raised by the movement layer, drained by the model. */
  cue = '';

  constructor(readonly controller: CharacterController, private readonly tuning: SketchTuning) {}

  get swingTarget(): string { return this.swing?.targetId ?? ''; }
  get wallTransferAvailable(): boolean { return this.wallTransfer; }
  /** Direction a kick from the current wall would push. */
  get wallDirection(): number { return this.wallSide; }

  reset(): void {
    this.state = 'normal'; this.wallId = ''; this.wallSide = 0; this.swing = null;
    this.wallTransfer = true; this.lastKickWall = ''; this.kickAxis = 0; this.kickLock = 0; this.kickBufferUntil = -1;
    this.gripBlockId = ''; this.gripBlockUntil = 0; this.elapsed = 0; this.cue = '';
  }

  update(dt: number, input: Controls, world: SketchWorld): SketchMoveHud {
    this.elapsed += dt;
    const fresh = input.jumpPressed === true;
    if (this.state === 'swing') return this.tickSwing(dt, input, world, fresh || input.interactPressed === true);
    if (this.state === 'wall-slide') return this.tickWall(dt, world, fresh);
    // A locked kick keeps carrying toward the far wall even while the player
    // still holds the direction of the wall they just left.
    this.kickLock = Math.max(0, this.kickLock - dt);
    // An airborne press with no air jump left would otherwise do nothing. A
    // section may keep it briefly, so Space pressed on touching the next wall
    // (still rising, before the slide begins) kicks as soon as the slide starts.
    if (fresh && !this.controller.body.grounded && !this.controller.airJumpAvailable && (this.tuning.wall.kickBuffer ?? 0) > 0) {
      this.kickBufferUntil = this.elapsed + this.tuning.wall.kickBuffer!;
    }
    const steer = this.kickLock > 0 ? { ...input, axis: this.kickAxis } : input;
    this.controller.update(dt, steer, world.solids, { butterIds: [], bounceIds: [] });
    const body = this.controller.body;
    // The lock ends at the top of the arc: a kick that clears the far wall's
    // top lands under the player's own control instead of overshooting.
    if (body.vy <= 0) this.kickLock = 0;
    if (body.grounded) {
      // A valid landing is the only ordinary way to renew a wall transfer.
      this.wallTransfer = true;
      this.state = 'normal'; this.wallId = ''; this.wallSide = 0;
      this.kickBufferUntil = -1;
    } else if (input.interactPressed === true && this.tryGrip(world)) {
      // Attaching to a nail is always an explicit action: the player never
      // clips onto a swing by merely passing through its grip zone.
      return this.hud();
    } else {
      const wall = this.findWall(world);
      if (wall) {
        this.enterWall(wall);
        // Only a real transfer fires; a spent same-wall press keeps the slide.
        if (this.elapsed <= this.kickBufferUntil && this.wallTransfer) { this.kickBufferUntil = -1; this.kick(wall); }
      }
    }
    return this.hud();
  }

  private hud(): SketchMoveHud {
    return {
      state: this.state, wall: this.wallId, wallTransfer: this.wallTransfer,
      swingTarget: this.swing?.targetId ?? '', swingAngle: this.swing ? this.swing.angle * 180 / Math.PI : 0,
    };
  }

  // --- pinned-wall slide and kick ----------------------------------------
  /** Side contact with a pinned climb board, within reach of its face. */
  private findWall(world: SketchWorld, only?: string): Collider | null {
    if (world.walls.length === 0 || this.controller.body.vy > 0.02) return null;
    const b = this.controller.body;
    let best: Collider | null = null; let bestGap = Infinity;
    for (const wall of world.walls) {
      if (only !== undefined && wall.id !== only) continue;
      // The body must span part of the board's height, not stand on it.
      if (b.y + b.height <= wall.y + 0.04 || b.y >= wall.y + wall.height - 0.04) continue;
      const gap = Math.min(Math.abs(b.x + b.width - wall.x), Math.abs(b.x - (wall.x + wall.width)));
      if (gap > TOUCH_EPSILON || gap >= bestGap) continue;
      bestGap = gap; best = wall;
    }
    return best;
  }

  private enterWall(wall: Collider): void {
    const b = this.controller.body;
    // Re-entering the same board still restores the slide; only the transfer
    // credit depends on which board it is.
    if (wall.id !== this.lastKickWall) this.wallTransfer = true;
    this.state = 'wall-slide';
    this.wallId = wall.id;
    this.wallSide = Math.abs(b.x + b.width - wall.x) <= Math.abs(b.x - (wall.x + wall.width)) ? -1 : 1;
    // A pinned wall owns vertical motion while it holds the player. Taking the
    // air jump away is what stops one wall being climbed by double-jumping it:
    // gaining height requires transferring to the opposite board.
    this.controller.consumeAirJump();
    this.kickLock = 0;
    this.wallTime = 0;
    b.vy = clamp(b.vy, -this.tuning.wall.slideMaxFall, 0);
    b.vx = 0;
  }

  private tickWall(dt: number, world: SketchWorld, fresh: boolean): SketchMoveHud {
    const body = this.controller.body;
    const contact = world.walls.some(w => w.id === this.wallId) ? this.findWall(world, this.wallId) : null;
    if (!contact || body.vy > 0.02) {
      this.state = 'normal'; this.wallId = '';
      return this.hud();
    }
    if (fresh) {
      // One authoritative wall-kick action for one fresh press. A press with
      // no transfer credit simply lets go: it never produces a kick.
      this.kick(contact);
      return this.hud();
    }
    body.vx = 0;
    // A section may hold a fresh catch still briefly before the slide starts.
    this.wallTime += dt;
    body.vy = this.wallTime <= (this.tuning.wall.grip ?? 0) ? 0
      : clamp(body.vy - this.tuning.swing.gravity * dt, -this.tuning.wall.slideMaxFall, 0);
    moveBody(body, world.solids, dt, this.controller.contacts);
    return this.hud();
  }

  private kick(contact: Collider): void {
    this.state = 'normal'; this.wallId = '';
    if (!this.wallTransfer) return;
    this.controller.launch(this.wallSide * this.tuning.wall.kickHorizontal,
      this.tuning.wall.kickVertical, { airJump: false });
    this.wallTransfer = false;
    this.lastKickWall = contact.id;
    this.kickAxis = this.wallSide; this.kickLock = this.tuning.wall.kickLock ?? 0;
  }

  // --- direct nail swing --------------------------------------------------
  private tryGrip(world: SketchWorld): boolean {
    const b = this.controller.body;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    let chosen: GripSite | null = null; let best = Infinity;
    for (const grip of world.grips) {
      if (grip.id === this.gripBlockId && this.elapsed < this.gripBlockUntil) continue;
      const d = Math.hypot(cx - grip.x, cy - grip.y);
      if (d > this.tuning.gripRadius) continue;
      if (d < best || (d === best && chosen !== null && grip.id < chosen.id)) { best = d; chosen = grip; }
    }
    if (!chosen) return false;
    const t = this.tuning.swing;
    // Capture the approach velocity before the hand is placed on the nail.
    const vx = b.vx; const vy = b.vy;
    const dx = cx - chosen.x;
    const dy = cy - chosen.y;
    const distance = Math.hypot(dx, dy);
    // Hands reach the nail; the body settles directly beneath it. Bounded by
    // the grip radius, so this can never become a distant pull or teleport.
    b.x = chosen.x - b.width / 2;
    b.y = chosen.y - t.arm - b.height / 2;
    b.vx = 0; b.vy = 0; b.grounded = false;
    const angle = distance < 0.05 ? 0 : Math.atan2(dx, -dy);
    // The approach velocity becomes angular momentum about the nail.
    const tangentSpeed = distance < 0.05 ? chosen.vx : vx * Math.cos(angle) + vy * Math.sin(angle);
    this.swing = {
      targetId: chosen.id, angle,
      omega: clamp(distance < 0.05 ? chosen.vx / t.arm : tangentSpeed / t.arm, -t.maxOmega, t.maxOmega),
      pivotVx: chosen.vx, pivotVy: chosen.vy,
    };
    this.state = 'swing';
    this.controller.contacts.length = 0;
    return true;
  }

  private tickSwing(dt: number, input: Controls, world: SketchWorld, fresh: boolean): SketchMoveHud {
    const swing = this.swing!;
    const t = this.tuning.swing;
    const grip = world.grips.find(g => g.id === swing.targetId);
    if (!grip) { this.release(false, ''); return this.hud(); } // the current nail was recalled
    // A/D pumps along the arc. Pumping only accelerates the direction already
    // being travelled (and may relaunch from rest at an apex), so holding the
    // opposite key can never stall the swing against gravity at the limit.
    const travel = Math.sign(swing.omega);
    const wanted = Math.sign(input.axis);
    // At rest (fresh grip or an apex) either key may relaunch; otherwise the
    // pump only accelerates the direction already being travelled.
    const axis = wanted !== 0 && (travel === 0 || travel === wanted) ? wanted : 0;
    // Never push outward into the authored arc limit: gravity always wins there.
    const outward = (swing.angle >= t.maxArc && axis > 0) || (swing.angle <= -t.maxArc && axis < 0);
    const gravity = (t.gravity / t.arm) * Math.sin(swing.angle);
    swing.omega += ((outward ? 0 : axis * t.pumpAccel) - gravity) * dt;
    swing.omega = clamp(swing.omega, -t.maxOmega, t.maxOmega);
    swing.omega *= Math.max(0, 1 - t.damping * dt);
    if (fresh) { this.release(true, ''); return this.hud(); }
    swing.angle += swing.omega * dt;
    // Bounded arc: the swing never loops over the nail and never gains energy
    // by rotating past the authored limit.
    if (swing.angle > t.maxArc) { swing.angle = t.maxArc; if (swing.omega > 0) swing.omega = 0; }
    else if (swing.angle < -t.maxArc) { swing.angle = -t.maxArc; if (swing.omega < 0) swing.omega = 0; }
    swing.pivotVx = grip.vx; swing.pivotVy = grip.vy;
    const targetX = grip.x + t.arm * Math.sin(swing.angle);
    const targetY = grip.y - t.arm * Math.cos(swing.angle);
    if (fresh) { this.release(true, ''); return this.hud(); }
    this.sweepTo(targetX, targetY, world, dt);
    return this.hud();
  }

  /** Sweep the arc displacement against authored solids; never pass through. */
  private sweepTo(x: number, y: number, world: SketchWorld, dt: number): void {
    const b = this.controller.body;
    const safe = dt > 1e-6 ? dt : 1 / 60;
    b.vx = (x - (b.x + b.width / 2)) / safe;
    b.vy = (y - (b.y + b.height / 2)) / safe;
    b.grounded = false;
    this.controller.contacts.length = 0;
    moveBody(b, world.solids, safe, this.controller.contacts);
    if (this.controller.contacts.length > 0) this.release(true, 'Swing obstructed — released with momentum.');
  }

  private release(withMomentum: boolean, cue: string): void {
    const swing = this.swing;
    if (!swing) return;
    const t = this.tuning.swing;
    this.state = 'normal';
    this.swing = null;
    this.gripBlockId = swing.targetId;
    this.gripBlockUntil = this.elapsed + t.reattachCooldown;
    // Tangential release velocity plus the mount's own motion. A forced detach
    // (the nail was recalled) keeps that arc momentum but grants no new jump.
    // It never uses the body's last per-tick displacement: on the tick after a
    // grip that still includes settling onto the arc, which flung the player.
    const tangent = { vx: t.arm * Math.cos(swing.angle) * swing.omega + swing.pivotVx, vy: t.arm * Math.sin(swing.angle) * swing.omega + swing.pivotVy };
    this.controller.launch(tangent.vx, tangent.vy, {
      airJump: withMomentum,
      carrySpeed: withMomentum ? Math.abs(tangent.vx) : 0,
      carrySeconds: t.momentumSeconds,
    });
    if (cue) this.cue = cue;
  }

  /** Drain the movement layer's one-off cue. */
  consumeCue(): string {
    const cue = this.cue;
    this.cue = '';
    return cue;
  }
  static readonly idle = EMPTY_INPUT;
}
