import { CharacterController } from './controller';
import type { Controls } from './controller';
import { overlaps } from './collision';
import type { Collider } from './collision';
import type { CandleState, CheckpointId, ForkState, Gate, InteractionDefinition, RoyalSupperLevel } from '../levels/royal-supper';
import type { CampaignResult } from '../campaign/progression';

export interface SupperSession {
  artworkId: 'royal-supper'; checkpointId: CheckpointId;
  fork: ForkState; candle: CandleState; forkElapsed: number; candleElapsed: number;
}
export const createSupperSession = (): SupperSession => ({
  artworkId: 'royal-supper', checkpointId: 'basket-start',
  fork: 'upright', candle: 'lit', forkElapsed: 0, candleElapsed: 0,
});

export class RoyalSupperModel {
  readonly controller: CharacterController;
  recoveryRemaining = 0;
  completed = false;
  collection: CampaignResult | null = null;
  cue = 'Recover the golden pear from the king’s plate.';
  cueRemaining = 5;

  constructor(readonly level: RoyalSupperLevel, readonly session: SupperSession,
    private readonly collect: () => CampaignResult) {
    const spawn = this.checkpoint.spawn;
    this.controller = new CharacterController(level.tuning, spawn.x, spawn.y);
  }

  get checkpoint() { return this.level.checkpoints.find(c => c.id === this.session.checkpointId) ?? this.level.checkpoints[0]; }
  gateOpen(gate: Gate): boolean { return gate === 'fork' ? this.session.fork === 'bridged' : this.session.candle === 'extinguished'; }
  get solids(): Collider[] { return this.level.platforms.filter(p => !p.gate || this.gateOpen(p.gate)); }
  get prompt(): InteractionDefinition | null {
    if (this.recoveryRemaining > 0 || !this.controller.body.grounded) return null;
    if (this.session.fork === 'upright' && overlaps(this.controller.body, this.level.fork.triggerBounds)) return this.level.fork;
    if (this.session.candle === 'lit' && overlaps(this.controller.body, this.level.candle.triggerBounds)) return this.level.candle;
    return null;
  }

  restartCheckpoint(): void {
    const spawn = this.checkpoint.spawn;
    this.controller.respawn(spawn.x, spawn.y);
    this.recoveryRemaining = 0;
  }

  private notify(text: string): void { this.cue = text; this.cueRemaining = 3; }

  update(dt: number, input: Controls): void {
    this.cueRemaining = Math.max(0, this.cueRemaining - dt);
    if (this.session.fork === 'toppling') {
      this.session.forkElapsed += dt;
      if (this.session.forkElapsed >= this.level.fork.duration) {
        this.session.fork = 'bridged'; this.notify('The fork is settled. Cross the bridge.');
      }
    }
    if (this.session.candle === 'extinguishing') {
      this.session.candleElapsed += dt;
      if (this.session.candleElapsed >= this.level.candle.duration) {
        this.session.candle = 'extinguished'; this.notify('The flame is out. The candle is safe to cross.');
      }
    }
    if (input.restartPressed) { this.restartCheckpoint(); this.notify('Back at your checkpoint.'); return; }
    if (this.recoveryRemaining > 0) {
      this.recoveryRemaining -= dt;
      if (this.recoveryRemaining <= 0) this.restartCheckpoint();
      return;
    }
    const prompt = this.prompt;
    if (input.interactPressed && prompt) {
      if (prompt.id === 'fork-bridge') { this.session.fork = 'toppling'; this.notify('Stand back — the fork is toppling…'); }
      else { this.session.candle = 'extinguishing'; this.notify('Lowering the snuffer…'); }
    }
    this.controller.update(dt, input, this.solids);
    const body = this.controller.body;
    const flameActive = this.session.candle !== 'extinguished';
    if (body.y < this.level.deathY || (flameActive && overlaps(body, this.level.candle.hazard))) {
      this.recoveryRemaining = this.level.recoverySeconds;
      this.notify(body.y < this.level.deathY ? 'A slip, not a setback. Returning to checkpoint…' : 'Too hot! Reach the snuffer before crossing.');
      return;
    }
    if (body.grounded) {
      const current = this.level.checkpoints.indexOf(this.checkpoint);
      for (let i = current + 1; i < this.level.checkpoints.length; i++) {
        const checkpoint = this.level.checkpoints[i];
        if ((!checkpoint.requires || this.gateOpen(checkpoint.requires)) && overlaps(body, checkpoint.trigger)) {
          this.session.checkpointId = checkpoint.id;
          this.notify('Checkpoint reached. Your path is remembered.');
        }
      }
    }
    if (!this.completed && this.gateOpen('fork') && this.gateOpen('candle') && overlaps(body, this.level.pear)) {
      this.collection = this.collect();
      if (this.collection.ok) { this.completed = true; this.notify('The golden pear is yours.'); }
      else this.notify(`Collection failed: ${this.collection.error}`);
    }
  }
}
