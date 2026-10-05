export const FIXED_DT = 1 / 60;
const MAX_STEPS = 6;

// Kept independent of requestAnimationFrame so pause/catch-up behavior can
// be verified with controlled timestamps as well as in the browser.
export class FixedClock {
  private last: number | null = null;
  private accumulator = 0;
  reset(): void { this.last = null; this.accumulator = 0; }
  advance(now: number, simulate: (dt: number) => void): number {
    if (this.last === null) { this.last = now; return 0; }
    this.accumulator += Math.min(Math.max(0, (now - this.last) / 1000), FIXED_DT * MAX_STEPS);
    this.last = now;
    let steps = 0;
    while (this.accumulator + 1e-9 >= FIXED_DT && steps < MAX_STEPS) {
      simulate(FIXED_DT); this.accumulator -= FIXED_DT; steps++;
    }
    return Math.max(0, this.accumulator / FIXED_DT);
  }
}

export class GameLoop {
  private frame: number | null = null;
  private readonly clock = new FixedClock();
  paused = true;
  constructor(private readonly simulate: (dt: number) => void, private readonly render: (alpha: number, seconds: number) => void) {}
  start(): void { if (this.frame === null) this.frame = requestAnimationFrame(this.tick); }
  setPaused(paused: boolean): void { this.paused = paused; this.clock.reset(); }
  private tick = (now: number): void => {
    const alpha = this.paused ? 1 : this.clock.advance(now, this.simulate);
    this.render(alpha, now / 1000);
    this.frame = requestAnimationFrame(this.tick);
  };
  dispose(): void { if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null; this.clock.reset(); }
}
