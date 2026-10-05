import type { Camera, Scene, WebGLRenderer } from 'three';
import type { Controls } from '../gameplay/controller';

export const TRANSITION_INPUT_SETTLE_MS = 250;

export interface GameScene {
  readonly id: string;
  readonly world: Scene;
  readonly camera: Camera;
  enter(): void;
  fixedUpdate(dt: number, input: Controls): void;
  render(alpha: number, seconds: number): void;
  resize(width: number, height: number): void;
  exit(): void;
  dispose(): void;
}

export class SceneManager {
  active: GameScene | null = null;
  transitioning = false;
  private width = 1;
  private height = 1;
  constructor(private readonly renderer: WebGLRenderer, private readonly clearInput: () => void) {}

  async transition(create: () => GameScene | null): Promise<boolean> {
    if (this.transitioning) return false;
    this.transitioning = true;
    this.clearInput();
    let next: GameScene | null = null;
    try {
      // Serialization stays active across the microtask even for placeholder
      // scenes. Rapid UI activations cannot create two scenes in one turn.
      await Promise.resolve();
      next = create();
      next?.resize(this.width, this.height);
      next?.enter();
      this.active?.exit();
      this.active?.dispose();
      this.active = next;
      return true;
    } catch (error) {
      next?.dispose();
      throw error;
    } finally { this.clearInput(); this.transitioning = false; }
  }
  resize(width: number, height: number): void {
    this.width = width; this.height = height;
    this.renderer.setSize(width, height);
    this.active?.resize(width, height);
  }
  render(alpha: number, seconds: number): void {
    if (!this.active) { this.renderer.clear(); return; }
    this.active.render(alpha, seconds);
    this.renderer.render(this.active.world, this.active.camera);
  }
  dispose(): void { this.active?.exit(); this.active?.dispose(); this.active = null; }
}
