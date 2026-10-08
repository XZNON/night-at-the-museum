import type { Camera, Mesh, MeshBasicMaterial, Object3D, Scene, Texture, WebGLRenderer } from 'three';
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
  private disposed = false;
  constructor(private readonly renderer: WebGLRenderer, private readonly clearInput: () => void) {}

  async transition(create: () => GameScene | null | Promise<GameScene | null>): Promise<boolean> {
    if (this.transitioning || this.disposed) return false;
    this.transitioning = true;
    this.clearInput();
    let next: GameScene | null = null;
    try {
      // Serialization stays active across the microtask even for placeholder
      // scenes. Rapid UI activations cannot create two scenes in one turn.
      await Promise.resolve();
      next = await create();
      if (this.disposed) { next?.dispose(); next = null; return false; }
      next?.resize(this.width, this.height);
      next?.enter();
      if (next) this.prewarm(next);
      this.active?.exit();
      this.active?.dispose();
      this.active = next;
      return true;
    } catch (error) {
      next?.dispose();
      throw error;
    } finally { this.clearInput(); this.transitioning = false; }
  }
  /**
   * Compile every material and upload every texture while the transition is
   * still on screen, hidden objects included (`compile` alone skips them), so
   * the first pin, nail or pickup never stalls a frame mid-play.
   */
  private prewarm(scene: GameScene): void {
    const hidden: Object3D[] = [];
    scene.world.traverse(object => { if (!object.visible) { hidden.push(object); object.visible = true; } });
    try {
      this.renderer.compile(scene.world, scene.camera);
      const seen = new Set<Texture>();
      scene.world.traverse(object => {
        const material = (object as Mesh).material;
        for (const m of Array.isArray(material) ? material : material ? [material] : []) {
          const map = (m as MeshBasicMaterial).map;
          if (map && !seen.has(map)) { seen.add(map); this.renderer.initTexture(map); }
        }
      });
    } finally { for (const object of hidden) object.visible = false; }
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
  dispose(): void { if (this.disposed) return; this.disposed = true; this.active?.exit(); this.active?.dispose(); this.active = null; }
}
