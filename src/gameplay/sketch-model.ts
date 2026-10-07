import { CharacterController } from './controller';
import type { Controls } from './controller';
import { overlaps } from './collision';
import type { Collider, Rect } from './collision';
import { sweptBladeContact } from './sketch-blade';
import { SketchMovement } from './sketch-movement';
import type { GripSite, SketchMoveHud, SketchWorld } from './sketch-movement';
import type {
  SketchBay, SketchBayId, SketchLegSettings, SketchMechanism, SketchNailSurface, SketchPlayfieldData, SketchRoute,
  SketchRouteSection, SketchTarget, SketchTuning, TargetKind, SketchRouteLegId, SketchRouteId,
} from '../levels/unfinished-sketch';
import { sketchMovement } from '../levels/unfinished-sketch';

// No Three.js, DOM, storage or museum references live here. The scene turns
// pointer coordinates into a target ID; this model revalidates everything
// against the current transforms at the consuming simulation tick.

/**
 * One FIFO entry. A free placement on a nailable surface also records that
 * surface and its 0..1 offset; its target ID is unique to the placement.
 */
export interface NailPlacement { nailId: string; targetId: string; sequence: number; surfaceId?: string; offset?: number }

export type SketchCommand =
  | { type: 'place'; targetId: string }
  /** Free placement: the scene projects the cursor; the model revalidates. */
  | { type: 'place-at'; surfaceId: string; offset: number }
  | { type: 'recall' };

/** A nailable segment's live world ends, for drawing, picking and checks. */
export interface SurfaceView {
  id: string; kind: SketchNailSurface['kind']; label: string;
  from: { x: number; y: number }; to: { x: number; y: number };
}

/** Free placement head sizes, matching the reviewed S1 foothold and swing nails. */
const SURFACE_NAIL_SIZE = { foothold: { width: 1.9, height: 0.35 }, 'moving-swing': { width: 0.8, height: 0.8 } } as const;
/** Two free nails on one surface keep this much world distance apart. */
const SURFACE_SPACING = 1;

export interface MechanismView {
  id: string; kind: SketchMechanism['kind'];
  x: number; y: number; angle: number;
  vx: number; vy: number;
  width: number; height: number;
  pinned: boolean; hazard: boolean;
}

export interface TargetView {
  id: string; kind: TargetKind; label: string;
  x: number; y: number; width: number; height: number;
  occupiedBy: string | null;
  oldest: boolean;
  distance: number;
  reason: string;
}

export interface SketchHud {
  bay: string; bayName: string; hint: string; goal: string;
  nails: string; oldest: string; nearest: string;
  cue: string; motion: string; swing: string;
  completed: boolean; recovering: boolean; elapsed: number;
  /** Route-only fields; absent in the Slice 1 bay playground. */
  layer?: string; checkpoint?: string; prompt?: string; endpoint?: string;
}

export interface SketchSession {
  bayId: SketchBayId;
  elapsed: number;
  sequence: number;
  queue: NailPlacement[];
  /** Mechanism ID -> the exact motion phase captured when it was pinned. */
  frozen: Record<string, number>;
}

export const createSketchSession = (bayId: SketchBayId): SketchSession =>
  ({ bayId, elapsed: 0, sequence: 0, queue: [], frozen: {} });

/** Authored route progress. Held in memory only; never written to a save. */
export type SketchRouteStage = 'traversal' | 'exit' | 'transit' | 'arrival';

export interface SketchRouteSession {
  routeId?: SketchRouteId;
  entryLegId: SketchRouteLegId;
  legId: SketchRouteLegId;
  stage: SketchRouteStage;
  elapsed: number;
  sequence: number;
  queue: NailPlacement[];
  frozen: Record<string, number>;
}

export const createRouteSession = (entryLegId: SketchRouteLegId = 'layer-1'): SketchRouteSession =>
  ({ entryLegId, legId: entryLegId, stage: 'traversal', elapsed: 0, sequence: 0, queue: [], frozen: {} });

const VELOCITY_STEP = 1 / 240;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Everything a playable field of the Sketch shares: the two-nail ledger and
 * its strict FIFO queue, scripted mechanism phase capture/resume, the collision
 * world, the reviewed wall/swing movement states and recovery. A Slice 1 bay
 * and the S2 route differ only in what happens around those mechanics, which
 * the two subclasses own.
 */
export abstract class SketchPlayfield {
  readonly controller: CharacterController;
  readonly movement: SketchMovement;
  private commands: SketchCommand[] = [];
  /** Clear every queued place/recall command. Subclasses reuse this. */
  protected clearCommandQueue(): void { this.commands.length = 0; }
  protected placements: NailPlacement[] = [];
  protected pinnedAt = new Map<string, number>();
  protected elapsed = 0;
  private phaseOffsets = new Map<string, number>();
  protected sequence = 0;
  protected readonly solidsCache: Collider[] = [];
  protected readonly hazardsCache: Rect[] = [];
  protected readonly wallsCache: Collider[] = [];
  protected readonly gripsCache: GripSite[] = [];

  recoveryRemaining = 0;
  completed = false;
  cue = '';
  cueRemaining = 0;
  move: SketchMoveHud = { state: 'normal', wall: '', wallTransfer: true, swingTarget: '', swingAngle: 0 };

  constructor(readonly field: SketchPlayfieldData, protected readonly tuning: SketchTuning) {
    this.controller = new CharacterController(sketchMovement, field.spawn.x, field.spawn.y);
    this.movement = new SketchMovement(this.controller, this.movementTuning(field.wall));
    this.controller.airCoast = field.airCoast === true;
    this.notify(field.hint);
  }

  /** Shared tuning with a field's (or section's) own wall feel merged in. */
  protected movementTuning(wall: SketchLegSettings['wall']): SketchTuning {
    return wall ? { ...this.tuning, wall: { ...this.tuning.wall, ...wall } } : this.tuning;
  }
  /** Wall feel, reach and pickup in force now. A joined route's leg overrides. */
  protected get fieldSettings(): SketchLegSettings { return this.field; }
  /** The extra nail on offer in the current section, if any. */
  get nailPickup(): SketchPlayfieldData['nailPickup'] { return this.fieldSettings.nailPickup; }
  /** Whether clicks in the current section drive free nails into wood (S4B). */
  get freePlacement(): boolean { return !!this.field.surfaces?.length; }

  // --- ledger -------------------------------------------------------------
  get availableNails(): number { return Math.max(0, this.nailBudget - this.placements.length); }
  /** True once this field's extra nail has been picked up (until it restarts). */
  pickupCollected = false;
  /** 'Both nails' / 'All three nails' for the current budget. */
  protected get allNailsText(): string { return this.nailBudget === 2 ? 'Both nails' : `All ${this.nailBudget} nails`; }
  /** Leg/bay reset wording for the base budget. */
  protected get resetNailsText(): string {
    return this.nailPickup ? 'Two nails; pick up the third at the start.' : 'Two nails available.';
  }
  get oldestPlacement(): NailPlacement | null { return this.placements[0] ?? null; }
  get placedCount(): number { return this.placements.length; }
  isOccupied(targetId: string): boolean { return this.placements.some(p => p.targetId === targetId); }
  /** The live FIFO queue, oldest first. */
  protected get queue(): NailPlacement[] { return this.placements; }
  /** Mechanism ID -> captured phase, for a same-session snapshot. */
  protected get frozenPhases(): Record<string, number> { return Object.fromEntries(this.pinnedAt); }

  enqueue(command: SketchCommand): void { this.commands.push(command); }
  clearCommands(): void { this.clearCommandQueue(); }

  /** The player-facing retry action: R and the pause panel both use this. */
  retry(): void { this.onRestart(); }

  protected resetLedger(): void {
    this.placements = []; this.pinnedAt.clear(); this.phaseOffsets.clear(); this.sequence = 0;
    this.pickupCollected = false;
  }

  // --- authored geometry --------------------------------------------------
  target(id: string): SketchTarget | null {
    const marked = this.field.targets.find(t => t.id === id);
    if (marked) return marked;
    // A placed free nail behaves exactly like a marked target while it exists.
    const placement = this.placements.find(p => p.targetId === id && p.surfaceId !== undefined);
    const surface = placement ? this.surface(placement.surfaceId!) : null;
    return surface ? this.surfaceTarget(surface, placement!.offset ?? 0, id) : null;
  }
  surface(id: string): SketchNailSurface | null { return this.field.surfaces?.find(s => s.id === id) ?? null; }
  private surfaceTarget(surface: SketchNailSurface, offset: number, id: string): SketchTarget {
    return {
      id, kind: surface.kind, mechanismId: surface.mechanismId,
      offset: { x: surface.from.x + (surface.to.x - surface.from.x) * offset, y: surface.from.y + (surface.to.y - surface.from.y) * offset },
      size: SURFACE_NAIL_SIZE[surface.kind], label: surface.label,
    };
  }
  mechanism(id: string): SketchMechanism | null { return this.field.mechanisms.find(m => m.id === id) ?? null; }
  isPinned(mechanismId: string): boolean { return this.pinnedAt.has(mechanismId); }
  mechanismTime(mechanism: SketchMechanism): number {
    const frozen = this.pinnedAt.get(mechanism.id);
    return frozen === undefined ? this.elapsed + (this.phaseOffsets.get(mechanism.id) ?? 0) : frozen;
  }

  private centreAt(mechanism: SketchMechanism, t: number): { x: number; y: number; angle: number } {
    const phase = 2 * Math.PI * (t / Math.max(0.001, mechanism.period) + mechanism.phase);
    switch (mechanism.kind) {
      case 'board':
      case 'mount': {
        const k = 0.5 - 0.5 * Math.cos(phase);
        return { x: mechanism.centre.x + mechanism.travel.x * k, y: mechanism.centre.y + mechanism.travel.y * k, angle: 0 };
      }
      case 'pendulum': {
        const a = mechanism.arc * Math.sin(phase);
        return { x: mechanism.pivot.x + mechanism.length * Math.sin(a), y: mechanism.pivot.y - mechanism.length * Math.cos(a), angle: a };
      }
      case 'axe': {
        const a = phase;
        return { x: mechanism.pivot.x + mechanism.length / 2 * Math.sin(a), y: mechanism.pivot.y - mechanism.length / 2 * Math.cos(a), angle: a };
      }
      case 'site':
      default:
        return { x: mechanism.centre.x, y: mechanism.centre.y, angle: 0 };
    }
  }

  mechanismView(): MechanismView[] {
    return this.field.mechanisms.map(m => {
      const t = this.mechanismTime(m);
      const now = this.centreAt(m, t);
      // A frozen mechanism holds one captured transform, so its authored
      // velocity is zero no matter how the phase is probed.
      if (this.pinnedAt.has(m.id)) {
        return {
          id: m.id, kind: m.kind, x: now.x, y: now.y, angle: now.angle,
          vx: 0, vy: 0, width: m.size.width, height: m.size.height, pinned: true, hazard: m.hazard,
        };
      }
      const before = this.centreAt(m, t - VELOCITY_STEP);
      const after = this.centreAt(m, t + VELOCITY_STEP);
      return {
        id: m.id, kind: m.kind, x: now.x, y: now.y, angle: now.angle,
        vx: (after.x - before.x) / (2 * VELOCITY_STEP), vy: (after.y - before.y) / (2 * VELOCITY_STEP),
        width: m.size.width, height: m.size.height, pinned: false, hazard: m.hazard,
      };
    });
  }

  targetPosition(id: string): { x: number; y: number } | null {
    const t = this.target(id);
    if (!t) return null;
    const m = this.mechanism(t.mechanismId);
    if (!m) return null;
    const view = this.centreAt(m, this.mechanismTime(m));
    return { x: view.x + t.offset.x, y: view.y + t.offset.y };
  }

  /** Every marked site, with its current validity and the reason it is refused. */
  protected targetEligible(_id: string): boolean { return true; }
  /** Read-only: whether the current section owns this target. */
  ownsTarget(id: string): boolean { return this.targetEligible(id); }

  targetViews(): TargetView[] {
    const b = this.controller.body;
    const cx = b.x + b.width / 2; const cy = b.y + b.height / 2;
    const oldest = this.placements[0]?.targetId ?? '';
    // Placed free nails join the marked sites so heads, the oldest marker and
    // the HUD treat them alike.
    const free = this.placements.flatMap(p => { const t = p.surfaceId === undefined ? null : this.target(p.targetId); return t ? [t] : []; });
    return [...this.field.targets, ...free].map(t => {
      const position = this.targetPosition(t.id)!;
      const distance = Math.hypot(cx - position.x, cy - position.y);
      const occupiedBy = this.placements.find(p => p.targetId === t.id)?.nailId ?? null;
      let reason = '';
      if (!this.targetEligible(t.id)) reason = 'Another layer.';
      else if (occupiedBy) reason = 'A nail is already here.';
      else if (this.availableNails <= 0) reason = `${this.allNailsText} are placed. Press Q.`;
      else if (distance > this.placementReach) reason = 'Out of reach.';
      return {
        id: t.id, kind: t.kind, label: t.label, x: position.x, y: position.y,
        width: t.size.width, height: t.size.height,
        occupiedBy, oldest: oldest === t.id, distance, reason,
      };
    });
  }

  // --- free placement on nailable surfaces (S4B) -------------------------
  protected surfaceEligible(_id: string): boolean { return true; }

  surfaceViews(): SurfaceView[] {
    return (this.field.surfaces ?? []).map(surface => {
      const m = this.mechanism(surface.mechanismId)!;
      const c = this.centreAt(m, this.mechanismTime(m));
      return { id: surface.id, kind: surface.kind, label: surface.label,
        from: { x: c.x + surface.from.x, y: c.y + surface.from.y }, to: { x: c.x + surface.to.x, y: c.y + surface.to.y } };
    });
  }

  /** Live world point at a 0..1 offset along a surface, or null if invalid. */
  surfacePoint(surfaceId: string, offset: number): { x: number; y: number } | null {
    const view = this.surfaceViews().find(v => v.id === surfaceId);
    if (!view || !Number.isFinite(offset) || offset < 0 || offset > 1) return null;
    return { x: view.from.x + (view.to.x - view.from.x) * offset, y: view.from.y + (view.to.y - view.from.y) * offset };
  }

  /** Why a free nail cannot go here right now; '' means it can. */
  surfaceRefusal(surfaceId: string, offset: number): string {
    const surface = this.surface(surfaceId);
    const point = this.surfacePoint(surfaceId, offset);
    if (!surface || !point) return 'Empty air. Nails only go into wood.';
    if (!this.surfaceEligible(surfaceId)) return 'Not part of this section.';
    if (this.availableNails <= 0) return `${this.allNailsText} are placed. Press Q.`;
    const b = this.controller.body;
    if (Math.hypot(b.x + b.width / 2 - point.x, b.y + b.height / 2 - point.y) > this.placementReach) return 'Out of reach.';
    if (this.placements.some(p => {
      if (p.surfaceId !== surfaceId) return false;
      const other = this.targetPosition(p.targetId);
      return !!other && Math.hypot(other.x - point.x, other.y - point.y) < SURFACE_SPACING;
    })) return 'Too close to another nail.';
    if (surface.kind === 'foothold') {
      const size = SURFACE_NAIL_SIZE.foothold;
      if (overlaps(b, { x: point.x - size.width / 2, y: point.y - size.height / 2, width: size.width, height: size.height })) return 'The head would hit you.';
    }
    return '';
  }

  /** Drive a free nail at the surface offset, revalidated at the consuming tick. */
  placeAt(surfaceId: string, offset: number): boolean {
    const reason = this.surfaceRefusal(surfaceId, offset);
    const surface = this.surface(surfaceId);
    if (reason) { this.notify(surface ? `${surface.label}: ${reason.toLowerCase()}` : reason); return false; }
    const nailId = `nail-${this.placements.length + 1}-${this.sequence}`;
    this.placements.push({ nailId, targetId: `${surfaceId}#${this.sequence}`, sequence: this.sequence++, surfaceId, offset });
    this.notify(surface!.kind === 'foothold' ? `Nail driven into ${surface!.label}. Its head is a step.`
      : `Nail driven into ${surface!.label}. Jump close and press E to grip; the bar carries it.`);
    return true;
  }

  nearestValidTarget(): TargetView | null {
    let best: TargetView | null = null;
    for (const view of this.targetViews()) {
      if (view.reason) continue;
      if (!best || view.distance < best.distance) best = view;
    }
    return best;
  }

  // --- collision world ----------------------------------------------------
  protected buildWorld(views = this.mechanismView()): SketchWorld {
    this.solidsCache.length = 0; this.hazardsCache.length = 0;
    this.wallsCache.length = 0; this.gripsCache.length = 0;
    for (const s of this.field.solids) this.solidsCache.push(s);
    for (const h of this.field.hazards) this.hazardsCache.push(h);
    for (const view of views) {
      const m = this.mechanism(view.id)!;
      if (view.hazard) {
        this.hazardsCache.push(m.kind === 'axe' ? this.axeHazard(m, view) :
          { x: view.x - view.width / 2, y: view.y - view.height / 2, width: view.width, height: view.height });
        continue;
      }
      if (m.kind !== 'board' && m.kind !== 'pendulum') continue;
      // These unfinished route platforms acquire physical support with ink.
      // S1 omits this authored flag and retains its moving solid platforms.
      if (m.solidWhenPinned && !view.pinned) continue;
      // A pendulum's landing piece is a flat rectangle that follows the
      // authored arc; its decorative suspension is never part of collision.
      const solid: Collider = { id: m.id, x: view.x - view.width / 2, y: view.y - view.height / 2, width: view.width, height: view.height };
      this.solidsCache.push(solid);
      // Only a pinned climb board offers its sides for a wall slide.
      if (m.climbable && this.isPinned(m.id)) this.wallsCache.push(solid);
    }
    for (const placement of this.placements) {
      const t = this.target(placement.targetId);
      if (!t) continue;
      const position = this.targetPosition(t.id)!;
      if (t.kind === 'foothold') {
        this.solidsCache.push({ id: `${t.id}-head`, x: position.x - t.size.width / 2, y: position.y - t.size.height / 2,
          width: t.size.width, height: t.size.height });
      } else if (t.kind === 'fixed-swing' || t.kind === 'moving-swing') {
        const view = views.find(v => v.id === t.mechanismId)!;
        this.gripsCache.push({ id: t.id, x: position.x, y: position.y, vx: view.vx, vy: view.vy });
      }
    }
    return { solids: this.solidsCache, walls: this.wallsCache, grips: this.gripsCache };
  }

  /**
   * A board or nail head can move out from under the player between ticks, and
   * swept axis-aligned resolution cannot express that on its own. Any real
   * overlap is resolved toward the nearest free face, preferring the top, so a
   * released support drops the player or carries it with a rising platform but
   * never traps them inside returning geometry.
   */
  private depenetrate(): void {
    const b = this.controller.body;
    for (const solid of this.solidsCache) {
      if (!overlaps(b, solid)) continue;
      const up = solid.y + solid.height - b.y;
      const down = b.y + b.height - solid.y;
      const left = solid.x + solid.width - b.x;
      const right = b.x + b.width - solid.x;
      const least = Math.min(up, down, left, right);
      if (least === up) { b.y = solid.y + solid.height; b.vy = 0; }
      else if (least === down) { b.y = solid.y - b.height; b.vy = 0; }
      else if (least === left) { b.x = solid.x - b.width; b.vx = 0; }
      else { b.x = solid.x + solid.width; b.vx = 0; }
    }
  }

  private axeHazard(m: SketchMechanism, view: MechanismView): Rect {
    // Axis-aligned bounds of the rotating blade, so swept body collision and
    // the visible blade agree without a new collision shape.
    const c = Math.abs(Math.cos(view.angle)); const s = Math.abs(Math.sin(view.angle));
    const width = m.length * c + m.size.height * s;
    const height = m.length * s + m.size.height * c;
    return { x: view.x - width / 2, y: view.y - height / 2, width, height };
  }

  get solids(): readonly Collider[] { return this.solidsCache; }
  get hazards(): readonly Rect[] { return this.hazardsCache; }
  get walls(): readonly Collider[] { return this.wallsCache; }
  get grips(): readonly GripSite[] { return this.gripsCache; }
  get nailBudget(): number { return this.tuning.nailBudget + (this.pickupCollected ? 1 : 0); }
  get placementReach(): number { return this.fieldSettings.placementReach ?? this.tuning.placementReach; }
  get targetHitPixels(): number { return this.tuning.targetHitPixels; }
  /** Seconds of authored mechanism time; deterministic on every retry. */
  get routeTime(): number { return this.elapsed; }

  // --- fixed-step transaction --------------------------------------------
  update(dt: number, input: Controls): void {
    // Restart wins over everything else in the tick, including an in-flight
    // escalator ride, and clears any other queued command.
    if (input.restartPressed) { this.onRestart(); return; }
    this.cueRemaining = Math.max(0, this.cueRemaining - dt);
    if (this.recoveryRemaining > 0) {
      this.recoveryRemaining -= dt;
      if (this.recoveryRemaining <= 0) this.onRecovered();
      return;
    }
    // A scripted transit owns the whole tick; nothing else may advance.
    if (!this.beforeStep(dt, input)) return;
    const beforeBody = { ...this.controller.body };
    this.elapsed += dt;
    this.drainCommands();
    const views = this.mechanismView();
    this.move = this.movement.update(dt, this.motionInput(input), this.buildWorld(views));
    this.depenetrate();
    const movementCue = this.movement.consumeCue();
    if (movementCue) this.notify(movementCue);
    if (this.recoveryRemaining > 0) return;
    const b = this.controller.body;
    if (b.y < this.deathY) { this.onFall(); return; }
    if (this.field.hazards.some(h => overlaps(b, h)) || views.some(view => {
      const m = this.mechanism(view.id)!;
      if (!m.hazard) return false;
      return m.sweptBlade ? sweptBladeContact(beforeBody, b, this.elapsed - dt, dt, m.period, m.length, m.size.height,
        time => this.centreAt(m, time)) : overlaps(b, m.kind === 'axe' ? this.axeHazard(m, view) :
          { x: view.x - view.width / 2, y: view.y - view.height / 2, width: view.width, height: view.height });
    })) {
      this.recover(this.field.hazards.length ? 'Glue! Quick retry.' : 'Caught by the axe. Watch its sweep.'); return;
    }
    const pickup = this.nailPickup;
    if (pickup && !this.pickupCollected && overlaps(b, pickup)) {
      this.pickupCollected = true;
      this.notify(`Third nail picked up. ${this.nailBudget} nails now; Q still recalls the oldest.`);
    }
    this.afterStep();
  }

  protected get deathY(): number { return this.field.deathY; }
  protected motionInput(input: Controls): Controls { return input; }
  protected beforeStep(_dt: number, _input: Controls): boolean { return true; }
  protected afterStep(): void {}
  protected abstract onRestart(): void;
  protected abstract onRecovered(): void;
  protected abstract onFall(): void;

  /** Recall is always consumed before placement, so reuse in one tick is legal. */
  private drainCommands(): void {
    if (this.commands.length === 0) return;
    const pending = this.commands.splice(0, this.commands.length);
    for (const command of pending) if (command.type === 'recall') this.recall();
    for (const command of pending) {
      if (command.type === 'place') this.place(command.targetId);
      else if (command.type === 'place-at') this.placeAt(command.surfaceId, command.offset);
    }
  }

  place(targetId: string): boolean {
    const t = this.target(targetId);
    if (!t) { this.notify('That is not a marked socket.'); return false; }
    if (this.isOccupied(targetId)) { this.notify(`${t.label} already holds a nail.`); return false; }
    if (this.availableNails <= 0) { this.notify(`${this.allNailsText} are placed. Press Q to recall the oldest.`); return false; }
    const view = this.targetViews().find(v => v.id === targetId)!;
    if (view.reason) { this.notify(`${t.label}: ${view.reason.toLowerCase()}`); return false; }
    const nailId = `nail-${this.placements.length + 1}-${this.sequence}`;
    this.placements.push({ nailId, targetId, sequence: this.sequence++ });
    const m = this.mechanism(t.mechanismId)!;
    if (m.freezable) {
      // Freezing captures the exact transform and motion phase for recall.
      this.pinnedAt.set(m.id, this.mechanismTime(m));
      this.notify(m.solidWhenPinned && m.climbable ? `${t.label} inked solid. Slide its side; Space kicks away.` : m.solidWhenPinned ? `${t.label} inked solid. Safe to land while pinned.`
        : `${t.label} pinned. It stays exactly there.`);
    } else if (t.kind === 'moving-swing') {
      this.notify(`${t.label} pinned. The mount carries it; it never freezes.`);
    } else {
      this.notify(`Nail placed on ${t.label}.`);
    }
    return true;
  }

  recall(): boolean {
    const oldest = this.placements[0];
    if (!oldest) { this.notify('No nails are placed. Nothing to recall.'); return false; }
    const t = this.target(oldest.targetId);
    this.placements.shift();
    if (t) {
      const m = this.mechanism(t.mechanismId);
      // Unfreezing resumes the captured phase; a mount or axis was never frozen.
      if (m?.freezable) {
        if (m.resumePhase) this.phaseOffsets.set(m.id, (this.pinnedAt.get(m.id) ?? this.elapsed) - this.elapsed);
        this.pinnedAt.delete(m.id);
      }
    }
    this.notify(`Recalled the oldest nail from ${t?.label ?? 'its socket'}.`);
    return true;
  }

  protected notify(text: string): void { this.cue = text; this.cueRemaining = this.tuning.cueSeconds; }
  protected recover(text: string): void { this.recoveryRemaining = this.tuning.recoverySeconds; this.notify(text); }

  protected motionText(): string {
    return this.move.state === 'swing' ? 'Swinging on the nail (no rope)' :
      this.move.state === 'wall-slide' ? `Wall slide · ${this.move.wallTransfer ? 'kick ready' : 'transfer spent'}` :
      this.move.wallTransfer ? 'Free to kick from a pinned wall' : 'Climbing';
  }

  protected baseHud(id: string, name: string, hint: string, goal: string): SketchHud {
    const oldest = this.placements[0];
    const oldestTarget = oldest ? this.target(oldest.targetId) : null;
    const nearest = this.nearestValidTarget();
    return {
      bay: id, bayName: name, hint, goal,
      nails: `${this.placements.length}/${this.nailBudget} placed · ${this.availableNails} available`,
      oldest: oldestTarget ? `Q recalls: ${oldestTarget.label}` : 'Q recalls: nothing yet',
      nearest: nearest ? `Click target: ${nearest.label} (${nearest.distance.toFixed(1)}u)`
        : this.freePlacement ? 'Click wood (strip or bar) to drive a nail' : 'No target in reach',
      cue: this.cueRemaining > 0 ? this.cue : '',
      motion: this.motionText(),
      swing: this.move.state === 'swing'
        ? `${this.target(this.move.swingTarget)?.label ?? 'nail'} · ${this.move.swingAngle.toFixed(0)}°` : '',
      completed: this.completed, recovering: this.recoveryRemaining > 0, elapsed: this.elapsed,
    };
  }
}

/** Slice 1: one independent bay with a single goal pad. */
export class SketchModel extends SketchPlayfield {
  constructor(readonly bay: SketchBay, tuning: SketchTuning) { super(bay, tuning); }

  /** Deterministic snapshot, used by same-session leave/re-entry. */
  get session(): SketchSession {
    return {
      bayId: this.bay.id, elapsed: this.elapsed, sequence: this.sequence,
      queue: this.queue.map(p => ({ ...p })), frozen: this.frozenPhases,
    };
  }
  restoreSession(session: SketchSession): void {
    if (session.bayId !== this.bay.id) return;
    this.placements = session.queue.filter(p => !!this.target(p.targetId)).map(p => ({ ...p }));
    this.sequence = session.sequence;
    this.elapsed = session.elapsed;
    // Each frozen mechanism resumes from the phase captured when it was pinned.
    this.pinnedAt = new Map(Object.entries(session.frozen));
  }

  /** Restart the bay: spawn, both nails available, empty queue, mechanisms live. */
  restartBay(): void {
    this.controller.respawn(this.bay.spawn.x, this.bay.spawn.y);
    this.movement.reset();
    this.resetLedger();
    this.elapsed = 0;
    this.recoveryRemaining = 0; this.completed = false;
    this.clearCommandQueue();
    this.notify('Bay reset. Two nails available, queue empty.');
  }

  /** Deterministic snapshot used by pause/retry and by bay changes. */
  takeSnapshot(): SketchSession { return this.session; }

  protected onRestart(): void { this.restartBay(); }
  protected onRecovered(): void { this.restartBay(); }
  protected onFall(): void { this.recover('Nothing under you. Back to the start…'); }

  protected afterStep(): void {
    if (!this.completed && overlaps(this.controller.body, this.bay.goalBounds)) {
      this.completed = true; this.notify('Bay goal reached. Press R to reset and try it again.');
    }
  }

  hud(): SketchHud { return this.baseHud(this.bay.id, this.bay.name, this.bay.hint, this.bay.goal); }
}

/**
 * Connected route presets: the preserved S2 leg and isolated S3A leg. It reuses the proven ledger,
 * mechanism and movement behaviour unchanged and adds only what the route
 * needs — section-local recovery, the Layer 1-clear checkpoint and the one
 * authored escalator to a fixed Layer 2 landing.
 */
export class SketchRouteModel extends SketchPlayfield {
  constructor(readonly route: SketchRoute, tuning: SketchTuning) {
    super(route, tuning); this.legId = route.entryLegId;
    // The entry leg's own feel, when a joined preset gives one.
    this.movement.retune(this.movementTuning(this.fieldSettings.wall));
    this.controller.airCoast = this.fieldSettings.airCoast === true;
  }

  legId: SketchRouteLegId;
  get leg() { return this.route.legs.find(l => l.id === this.legId)!; }
  protected override targetEligible(id: string): boolean {
    // Preserve S2's post-clear exploration; only the new S3A gate closes its
    // temporary targets. Visibility never grants another leg's ownership.
    if (this.placements.some(p => p.targetId === id && p.surfaceId !== undefined)) return true;
    return this.leg.targetIds.includes(id) && (this.route.id === 'layer-1' || this.stage === 'traversal');
  }
  protected override surfaceEligible(id: string): boolean {
    return !!this.leg.surfaceIds?.includes(id) && this.stage === 'traversal';
  }
  /** A joined preset's leg owns its feel; isolated presets keep the field's. */
  protected override get fieldSettings(): SketchLegSettings { return this.leg.settings ?? this.field; }
  override get freePlacement(): boolean { return !!this.leg.surfaceIds?.length; }
  /** Layer 3 sections (S4A walls, S4B swings, S4C joined) share entrance-only re-entry. */
  private get layerThree(): boolean {
    return this.route.id === 'layer-3-walls' || this.route.id === 'layer-3-swings' || this.route.id === 'layer-3';
  }
  /** A same-layer leg that hands over on its exit ground instead of ending (S4C). */
  private get continuesOnGround(): boolean { return !this.leg.escalator && !!this.leg.nextLegId; }
  /** True once the joined Layer 3 has moved past its entry leg. */
  private get laterSection(): boolean { return this.route.id === 'layer-3' && this.legId !== this.route.entryLegId; }

  stage: SketchRouteStage = 'traversal';
  private transitElapsed = 0;

  // --- route session (memory only, never a campaign save) -----------------
  get session(): SketchRouteSession {
    return {
      routeId: this.route.id, entryLegId: this.route.entryLegId, legId: this.legId, stage: this.stage, elapsed: this.elapsed, sequence: this.sequence,
      queue: this.queue.map(p => ({ ...p })), frozen: this.frozenPhases,
    };
  }

  /**
   * Same-session leave/re-entry resumes at the remembered safe checkpoint.
   * A snapshot taken mid-transit is deliberately downgraded to the checkpoint
   * the transit started from, so nobody re-enters in midair.
   */
  restoreSession(session: SketchRouteSession): void {
    if ((session.routeId !== undefined && session.routeId !== this.route.id) ||
      (this.layerThree && (session.routeId !== this.route.id ||
        !['traversal', 'exit'].includes(session.stage) || !Number.isFinite(session.elapsed) ||
        session.elapsed < 0 || !Number.isFinite(session.sequence)))) { this.restartAdventure(); return; }
    // S3A traversal re-entry is a deterministic entrance retry. Preserve the
    // reviewed S2 snapshot behavior while rejecting cross-study ownership.
    let reachable = this.route.entryLegId;
    const visited = new Set<SketchRouteLegId>();
    while (reachable !== session.legId && !visited.has(reachable)) {
      visited.add(reachable);
      const next = this.route.legs.find(l => l.id === reachable)?.nextLegId;
      if (!next) break;
      reachable = next;
    }
    if (session.entryLegId !== this.route.entryLegId || reachable !== session.legId ||
      !this.route.legs.some(l => l.id === reachable) ||
      !['traversal', 'exit', 'transit', 'arrival'].includes(session.stage)) { this.restartAdventure(); return; }
    // A leg that hands over on its own ground never rests at its exit.
    const owner = this.route.legs.find(l => l.id === reachable)!;
    if (!owner.escalator && owner.nextLegId && session.stage !== 'traversal') { this.restartAdventure(); return; }
    this.legId = reachable;
    this.restartLeg();
    const stage = session.stage === 'transit' ? 'exit' : session.stage;
    if (stage === 'arrival' && this.leg.escalator) { this.arrive(); return; }
    if (stage === 'exit') { this.enterExitCheckpoint(); return; }
    if (this.route.id === 'layer-1') {
      const targets = new Set<string>(); const nails = new Set<string>();
      this.placements = (Array.isArray(session.queue) ? session.queue : []).filter(p => {
        if (!this.leg.targetIds.includes(p.targetId) || targets.has(p.targetId) || nails.has(p.nailId) ||
          typeof p.nailId !== 'string' || !p.nailId || !Number.isFinite(p.sequence) ||
          !Number.isFinite(session.frozen?.[this.target(p.targetId)!.mechanismId])) return false;
        targets.add(p.targetId); nails.add(p.nailId); return true;
      }).slice(0, this.nailBudget).map(p => ({ ...p }));
      this.sequence = Math.max(0, Number.isFinite(session.sequence) ? session.sequence : 0,
        ...this.placements.map(p => p.sequence + 1));
      this.elapsed = Number.isFinite(session.elapsed) && session.elapsed >= 0 ? session.elapsed : 0;
      this.pinnedAt = new Map(Object.entries(session.frozen ?? {}).filter(([id]) =>
        this.placements.some(p => this.target(p.targetId)?.mechanismId === id)).filter(([, time]) => Number.isFinite(time)));
      const spawn = this.route.sections[this.leg.sectionId].spawn;
      this.controller.respawn(spawn.x, spawn.y); this.movement.reset();
    }
  }

  get sectionId(): string {
    return this.stage === 'arrival' ? this.leg.arrivalSectionId! : this.leg.sectionId;
  }
  get section(): SketchRouteSection { return this.route.sections[this.sectionId]; }
  /** Each standing area has its own fall line, never the whole world height. */
  protected override get deathY(): number {
    if (this.stage === 'arrival') return this.section.deathY;
    if (this.stage === 'exit' || this.stage === 'transit') return this.leg.exitDeathY;
    return this.section.deathY;
  }
  /** 0 before boarding, then 0..1 along the authored escalator path. */
  get transitProgress(): number {
    return this.stage !== 'transit' ? (this.stage === 'arrival' ? 1 : 0) :
      clamp(this.transitElapsed / this.leg.escalator!.duration, 0, 1);
  }
  get inTransit(): boolean { return this.stage === 'transit'; }
  /** True while the player stands on the escalator's boarding pad. */
  boardingReady(): boolean {
    return this.stage === 'exit' && !!this.leg.escalator && overlaps(this.controller.body, this.leg.escalator.boarding);
  }

  enqueue(command: SketchCommand): void {
    // A scripted ride owns the player: place/recall/grip never accumulate.
    if (this.stage === 'transit') return;
    super.enqueue(command);
  }

  // --- authored checkpoint and transit -----------------------------------
  /** Retry the active leg: spawn, two available nails, empty queue, phase zero. */
  restartLeg(): void {
    const spawn = this.route.sections[this.leg.sectionId].spawn;
    this.controller.respawn(spawn.x, spawn.y);
    this.movement.reset();
    this.resetLedger();
    this.elapsed = 0;
    this.transitElapsed = 0;
    this.recoveryRemaining = 0; this.completed = false; this.stage = 'traversal';
    if (this.layerThree) this.move = { state: 'normal', wall: '', wallTransfer: true, swingTarget: '', swingAngle: 0 };
    this.movement.retune(this.movementTuning(this.fieldSettings.wall));
    this.controller.airCoast = this.fieldSettings.airCoast === true;
    this.clearCommandQueue();
    this.notify(this.laterSection ? `Swing crossing reset. ${this.resetNailsText} The climb stays clear.`
      : `Layer ${this.section.layer} reset. ${this.resetNailsText}`);
  }

  /**
   * S4C's same-layer handoff. The grounded landing on the climb's exit ledge,
   * which is also the crossing's start ground, starts the next leg where the
   * player stands: no ride, no teleport. The third nail is taken back with
   * the rest of the ledger; attachment, jump allowances, mechanism phases and
   * queued commands reset; nothing completes.
   */
  private continueOnGround(): void {
    const b = this.controller.body;
    const at = { x: b.x, y: b.y };
    this.legId = this.leg.nextLegId!;
    this.restartLeg();
    // Anchor in place on the shared ground; respawn clears coyote time, the
    // jump buffer and held allowances, so no press carries across.
    this.controller.respawn(at.x, at.y);
    this.notify('Wall climb clear. The third nail is taken back: two nails for the swing crossing.');
  }

  /** Restart adventure: back to the study entrance with no route completion kept. */
  restartAdventure(): void { this.legId = this.route.entryLegId; this.restartLeg(); }

  /**
   * The Layer 1-clear checkpoint. Reaching fixed exit ground ends the
   * challenge, so the temporary nails, the FIFO queue and local attachment or
   * jump state are cleared predictably and visibly.
   */
  private enterExitCheckpoint(): void {
    this.stage = 'exit';
    this.movement.reset();
    if (this.layerThree) this.move = { state: 'normal', wall: '', wallTransfer: true, swingTarget: '', swingAngle: 0 };
    this.resetLedger();
    this.clearCommandQueue();
    this.transitElapsed = 0;
    const spawn = this.leg.exitSpawn;
    this.controller.respawn(spawn.x, spawn.y);
    if (this.route.id !== 'layer-1') this.elapsed = 0;
    if (!this.leg.escalator) { this.completed = true; this.elapsed = 0; }
  }

  private boardEscalator(): void {
    this.stage = 'transit';
    this.transitElapsed = 0;
    this.movement.reset();
    this.clearCommandQueue();
    const b = this.controller.body;
    b.vx = 0; b.vy = 0; b.grounded = false;
    this.controller.contacts.length = 0;
    this.notify(`Boarding the escalator to Layer ${this.route.sections[this.leg.arrivalSectionId!].layer}…`);
  }

  private arrive(): void {
    if (this.leg.nextLegId) {
      this.legId = this.leg.nextLegId;
      this.restartLeg();
      this.notify(`Layer ${this.section.layer} reached. Three boards, two nails; the axes stay active.`);
      return;
    }
    this.stage = 'arrival';
    this.transitElapsed = 0;
    this.movement.reset();
    this.clearCommandQueue();
    if (this.route.id !== 'layer-1') { this.resetLedger(); this.elapsed = 0; }
    const arrival = this.leg.escalator!.arrival;
    // A respawn clears coyote time, the jump buffer and every held allowance,
    // so no held key or buffered press can launch the player on arrival.
    this.controller.respawn(arrival.x, arrival.y);
    // The endpoint is evaluated on arrival so the review marker shows at once.
    this.afterStep();
  }

  /** Position along the authored escalator path, eased by ride progress. */
  escalatorPosition(progress: number, escalator = this.leg.escalator!): { x: number; y: number } {
    const path = escalator.path;
    const clamped = clamp(progress, 0, 1);
    // Equal per-segment time keeps the drawn stairs moving with the rider.
    const scaled = clamped * (path.length - 1);
    const index = Math.min(path.length - 2, Math.floor(scaled));
    const k = scaled - index;
    return { x: path[index].x + (path[index + 1].x - path[index].x) * k,
      y: path[index].y + (path[index + 1].y - path[index].y) * k };
  }

  // --- fixed-step hooks ---------------------------------------------------
  protected override beforeStep(dt: number, input: Controls): boolean {
    const b = this.controller.body;
    if (this.stage === 'transit') {
      this.transitElapsed += dt;
      const progress = this.transitProgress;
      const at = this.escalatorPosition(progress);
      b.x = at.x - b.width / 2; b.y = at.y;
      b.vx = 0; b.vy = 0; b.grounded = false;
      this.controller.contacts.length = 0;
      if (this.transitElapsed >= this.leg.escalator!.duration) {
        this.arrive();
      }
      return false;
    }
    if (this.stage === 'exit' && input.interactPressed === true && this.boardingReady()) {
      // One fresh E starts the ride and is consumed here, so it can never also
      // grip a nail or trigger another interaction in the same tick.
      this.boardEscalator();
      return false;
    }
    return true;
  }

  protected override afterStep(): void {
    const b = this.controller.body;
    // Commit an actual landing on fixed exit ground, rather than catching an
    // airborne body as soon as it overlaps the checkpoint volume.
    if (this.stage === 'traversal' && b.grounded &&
      Math.abs(b.y - this.leg.exitBounds.y) < 0.00001 && overlaps(b, this.leg.exitBounds)) {
      if (this.continuesOnGround) { this.continueOnGround(); return; }
      this.enterExitCheckpoint();
      this.notify(this.leg.escalator ? `Layer ${this.section.layer} clear. Safe checkpoint reached — walk onto the escalator and press E.` :
        this.route.id === 'layer-3-walls' ? 'S4A endpoint. Fixed post-climb ground reached.'
          : this.route.id === 'layer-3-swings' ? 'S4B endpoint. Landed on the fixed end ledge.'
          : this.route.id === 'layer-3' ? 'S4C endpoint. Layer 3 crossed: landed on the fixed end ledge.' : 'Layer 2 clear. S3A endpoint reached on fixed ground.');
    }
    if (!this.completed && this.stage === 'arrival' && overlaps(this.controller.body, this.route.goalBounds)) {
      this.completed = true;
      this.notify(this.section.layer === 3 ? 'S3 endpoint. Safe Layer 3 ground reached.' : 'Slice 2 endpoint. Layer 2 content arrives in the next slice.');
    }
  }

  protected override onRestart(): void {
    this.recoveryRemaining = 0;
    this.clearCommandQueue();
    if (this.stage === 'traversal') { this.restartLeg(); return; }
    if (this.stage === 'exit' || this.stage === 'transit') {
      this.stage = 'exit';
      this.transitElapsed = 0;
      this.enterExitCheckpoint();
      this.notify('Back at the safe exit checkpoint.');
      return;
    }
    // At a committed checkpoint there is nothing left to retry: re-anchor on
    // the same safe ground with every transient cleared.
    const spawn = this.section.spawn;
    this.controller.respawn(spawn.x, spawn.y);
    this.movement.reset();
    if (this.route.id !== 'layer-1') { this.resetLedger(); this.elapsed = 0; }
    this.notify(this.stage === 'arrival' ? `Back on the Layer ${this.section.layer} landing.` : 'Back at the safe exit checkpoint.');
  }

  protected override onRecovered(): void {
    if (this.stage === 'arrival') { this.arrive(); this.notify(`Back on the Layer ${this.section.layer} landing.`); return; }
    if (this.stage === 'exit') { this.enterExitCheckpoint(); return; }
    this.restartLeg();
  }

  protected override onFall(): void {
    if (this.stage === 'arrival') { this.recover('Off the landing. Back to the top of the escalator…'); return; }
    if (this.stage === 'exit') { this.recover('Back to the safe exit checkpoint…'); return; }
    this.recover(this.nailPickup ? `Nothing under you. Layer ${this.section.layer} restarts; pick up the third nail again…`
      : this.laterSection ? 'Nothing under you. The swing crossing restarts with two nails; the climb stays clear…'
      : `Nothing under you. Layer ${this.section.layer} restarts with two nails…`);
  }

  hud(): SketchHud {
    const hint = this.stage === 'arrival' && this.section.layer === 3
      ? 'Safe ground reached. Explore the landing or press R to return here.'
      : this.stage === 'transit' ? `Riding to Layer ${this.route.sections[this.leg.arrivalSectionId!].layer}.`
      : this.legId === 'layer-2' ? 'Pin A, then B. From B, Q recalls A for C. Time both active axes.' : this.leg.hint ?? this.route.hint;
    const hud = this.baseHud(this.route.id, this.route.id === 'layer-1' ? this.route.name : this.section.name, hint, this.route.goal);
    const checkpoint = this.stage === 'arrival' ? this.section.name.toLowerCase()
      : this.stage === 'traversal' ? `${this.legId} start` : `${this.legId} clear`;
    return {
      ...hud,
      motion: this.route.id === 'layer-1' || (this.layerThree && this.move.state !== 'normal') ? hud.motion : this.inTransit ? 'Riding escalator'
        : this.controller.body.grounded ? 'Grounded' : 'In the air',
      layer: `${this.section.layer} / 3 · ${this.section.name}`,
      checkpoint: `Checkpoint / ${checkpoint}`,
      prompt: this.boardingReady() ? 'Press E to board the escalator' : '',
      endpoint: this.completed ? (this.route.id === 'layer-3-walls' ? 'S4A endpoint reached · Wall climb clear · Stop for review'
        : this.route.id === 'layer-3-swings' ? 'S4B endpoint reached · Swing crossing clear · Stop for review'
        : this.route.id === 'layer-3' ? 'S4C endpoint reached · Wall climb and swing crossing clear · Stop for review' : this.section.layer === 3 ? 'S3 endpoint reached · Safe Layer 3 ground · Stop for review' : this.leg.escalator ? 'Slice 2 endpoint reached · Layer 2 content follows in S3' :
        'S3A endpoint reached · Layer 2 clear') : '',
    };
  }
}
