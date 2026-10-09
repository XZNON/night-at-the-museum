import { CharacterController } from './controller';
import type { Controls } from './controller';
import { overlaps } from './collision';
import type { Collider, Rect } from './collision';
import type { CheckpointId, ForkState, Gate, InteractionDefinition, RoyalSupperLevel } from '../levels/royal-supper';
import type { CampaignResult } from '../campaign/progression';

export interface SupperSession {
  artworkId: 'royal-supper'; checkpointId: CheckpointId; fork: ForkState; forkElapsed: number;
  grapeElapsed: number; candleElapsed: number; dinerElapsed: number;
  grapesStarted: boolean; candlesStarted: boolean; dinerStarted: boolean;
}
export const createSupperSession = (): SupperSession => ({
  artworkId: 'royal-supper', checkpointId: 'basket-start', fork: 'upright', forkElapsed: 0,
  grapeElapsed: 0, candleElapsed: 0, dinerElapsed: 0, grapesStarted: false, candlesStarted: false, dinerStarted: false,
});
// The grape stream is a pure function of its clock: `preroll` seconds have
// already rolled when the clock starts, so the whole run is full of pairs.
export function grapeRects(grapes: RoyalSupperLevel['grapes'], elapsed: number): Rect[] {
  const g = grapes; const time = elapsed + g.preroll;
  const lifetime = (g.startX - g.endX) / g.speed;
  const result: Rect[] = [];
  for (const offset of g.offsets) {
    for (let wave = Math.max(0, Math.ceil((time - offset - lifetime) / g.period)); wave * g.period + offset <= time; wave++) {
      const age = time - offset - wave * g.period;
      const y = g.y + Math.max(0, g.approachSeconds - age) / g.approachSeconds * g.approachHeight;
      result.push({ x: g.startX - age * g.speed - g.radius, y, width: g.radius * 2, height: g.radius * 2 });
    }
  }
  return result;
}
const contains = (cover: Rect, body: Rect): boolean => body.x >= cover.x - 0.001 && body.x + body.width <= cover.x + cover.width + 0.001 &&
  body.y >= cover.y - 0.001 && body.y + body.height <= cover.y + cover.height + 0.001;

export class RoyalSupperModel {
  readonly controller: CharacterController;
  recoveryRemaining = 0;
  completed = false;
  collection: CampaignResult | null = null;
  cue = 'Recover the golden pear. One ground jump, then one fresh air jump.';
  cueRemaining = 5;
  private readonly surfaceIds: { butterIds: string[]; bounceIds: string[] };

  constructor(readonly level: RoyalSupperLevel, readonly session: SupperSession, private readonly collect: () => CampaignResult) {
    const spawn = this.checkpoint.spawn;
    this.controller = new CharacterController(level.tuning, spawn.x, spawn.y);
    this.surfaceIds = { butterIds: level.platforms.filter(p => p.art === 'butter').map(p => p.id),
      bounceIds: level.platforms.filter(p => p.art === 'jelly').map(p => p.id) };
  }
  get checkpoint() { return this.level.checkpoints.find(c => c.id === this.session.checkpointId) ?? this.level.checkpoints[0]; }
  gateOpen(_gate: Gate): boolean { return this.session.fork === 'bridged'; }
  get solids(): Collider[] { return this.level.platforms.filter(p => !p.gate || this.gateOpen(p.gate)); }
  get section() { return [...this.level.sections].reverse().find(s => this.controller.body.x >= s.start) ?? this.level.sections[0]; }
  get prompt(): InteractionDefinition | null {
    return this.recoveryRemaining <= 0 && this.controller.body.grounded && this.session.fork === 'upright' &&
      overlaps(this.controller.body, this.level.fork.triggerBounds) ? this.level.fork : null;
  }
  get candlePhase(): number { return this.session.candleElapsed % this.level.candle.period; }
  flameLit(index: number): boolean {
    const flame = this.level.candle.flames[index];
    return !this.session.candlesStarted || this.candlePhase < flame.offAt || this.candlePhase >= flame.offAt + this.level.candle.safeSeconds;
  }
  flameRemaining(index: number): number {
    return this.flameLit(index) ? 0 : this.level.candle.flames[index].offAt + this.level.candle.safeSeconds - this.candlePhase;
  }
  get dinerPhase(): 'AWAY' | 'TURNING' | 'LOOK' {
    const d = this.level.diner;
    const phase = this.session.dinerElapsed % (d.away + d.warning + d.look);
    return phase < d.away ? 'AWAY' : phase < d.away + d.warning ? 'TURNING' : 'LOOK';
  }
  get hidden(): boolean { return this.level.diner.cover.some(c => contains(c, this.controller.body)); }
  get grapes(): Rect[] { return this.session.grapesStarted ? grapeRects(this.level.grapes, this.session.grapeElapsed) : []; }
  restartCheckpoint(): void {
    const spawn = this.checkpoint.spawn;
    this.controller.respawn(spawn.x, spawn.y);
    this.recoveryRemaining = 0;
    // Every attempt gets the same visible lead-in. Settled fork and awards survive.
    this.session.grapeElapsed = this.session.candleElapsed = this.session.dinerElapsed = 0;
    this.session.grapesStarted = this.session.candlesStarted = this.session.dinerStarted = false;
  }
  private notify(text: string): void { this.cue = text; this.cueRemaining = 3; }
  private recover(text: string): void { this.recoveryRemaining = this.level.recoverySeconds; this.notify(text); }
  update(dt: number, input: Controls): void {
    this.cueRemaining = Math.max(0, this.cueRemaining - dt);
    if (input.restartPressed) { this.restartCheckpoint(); this.notify('Back at your checkpoint.'); return; }
    if (this.recoveryRemaining > 0) {
      this.recoveryRemaining -= dt;
      if (this.recoveryRemaining <= 0) this.restartCheckpoint();
      return;
    }
    if (this.session.fork === 'toppling') {
      this.session.forkElapsed += dt;
      if (this.session.forkElapsed >= this.level.fork.duration) {
        this.session.fork = 'bridged'; this.notify('The fork is settled. Cross the bridge.');
      }
    }
    if (input.interactPressed && this.prompt) { this.session.fork = 'toppling'; this.notify('Stand back — the fork is toppling…'); }
    const x = this.controller.body.x;
    // The grape clock wakes out of sight of the run (from the butter on, or at
    // once on an after-butter retry), so the stream never pops into view.
    if (x >= this.level.grapes.wakeX) this.session.grapesStarted = true;
    if (x >= this.level.sections[4].start) this.session.candlesStarted = true;
    if (x >= this.level.sections[5].start) this.session.dinerStarted = true;
    if (this.session.grapesStarted) this.session.grapeElapsed += dt;
    if (this.session.candlesStarted) this.session.candleElapsed += dt;
    if (this.session.dinerStarted) this.session.dinerElapsed += dt;
    this.controller.update(dt, input, this.solids, this.surfaceIds);
    const b = this.controller.body;
    if (this.controller.contacts.some(c => this.level.platforms.some(p => p.id === c.id && p.art === 'crumb')) ||
      this.level.platforms.some(p => p.art === 'crumb' && overlaps(b, p))) {
      this.recover('Crumb collision! Keep your slide moving and jump clear.'); return;
    }
    if (b.y < this.level.deathY) { this.recover('A slip, not a setback. Returning to checkpoint…'); return; }
    if (this.level.candle.flames.some((h, i) => this.flameLit(i) && overlaps(b, h))) {
      this.recover('Too hot! Cross while the candles smoke.'); return;
    }
    if (this.grapes.some(g => overlaps(b, g))) { this.recover('A rolling grape! Watch the next pair before jumping.'); return; }
    if (this.dinerPhase === 'LOOK' && overlaps(b, this.level.diner.zone) && !this.hidden) {
      this.recover('Caught in the diner’s gaze. Keep your whole body inside cover.'); return;
    }
    // Only the next section-end checkpoint can advance the route. This also
    // prevents an accidental future high jump from skipping required sections.
    const next = this.level.checkpoints[this.level.checkpoints.indexOf(this.checkpoint) + 1];
    if (b.grounded && next && (!next.requires || this.gateOpen(next.requires)) && overlaps(b, next.trigger)) {
      this.session.checkpointId = next.id; this.notify('Checkpoint reached. Your path is remembered.');
    }
    if (!this.completed && this.session.checkpointId === 'after-diner' && this.gateOpen('fork') && overlaps(b, this.level.pear)) {
      this.collection = this.collect();
      if (this.collection.ok) { this.completed = true; this.notify('The golden pear is yours.'); }
      else this.notify(`Collection failed: ${this.collection.error}`);
    }
  }
}
