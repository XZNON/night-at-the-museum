import * as THREE from 'three';
import { placeholderArt } from '../assets/manifest';
import type { GameScene } from '../core/scenes';
import type { Controls } from '../gameplay/controller';
import { RoyalSupperModel } from '../gameplay/royal-supper-model';
import type { SupperSession } from '../gameplay/royal-supper-model';
import type { CampaignResult } from '../campaign/progression';
import type { Rect } from '../gameplay/collision';
import type { RoyalSupperLevel } from '../levels/royal-supper';

export interface SupperHud {
  checkpoint: string; section: string; prompt: string; cue: string;
  fork: string; candle: string; completed: boolean; progress: number;
}

export class RoyalSupperScene implements GameScene {
  readonly id = 'royal-supper';
  readonly world = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-12, 12, 6, -6, 0.1, 100);
  readonly model: RoyalSupperModel;
  readonly debug = new THREE.Group();
  private readonly player = new THREE.Group();
  private readonly fork = new THREE.Group();
  private readonly flame = new THREE.Group();
  private readonly snuffer = new THREE.Group();
  private readonly pear = new THREE.Group();
  private readonly debugBridge = new THREE.Group();
  private readonly debugFlame = new THREE.Group();
  private previous = new THREE.Vector2();
  private previousCameraX = 0;
  private cameraX = 0;
  private facing = 1;
  private elapsed = 0;
  private viewWidth = 24;
  private didComplete = false;
  private resources = new Set<THREE.BufferGeometry | THREE.Material>();

  constructor(readonly level: RoyalSupperLevel, session: SupperSession,
    collect: () => CampaignResult, private readonly onHud: (hud: SupperHud) => void,
    private readonly onComplete: (result: CampaignResult) => void,
    private readonly reducedMotion: boolean) {
    this.model = new RoyalSupperModel(level, session, collect);
    this.world.background = new THREE.Color(0x241720);
    this.world.add(new THREE.HemisphereLight(0xffe9cc, 0x382332, 2.2));
    const key = new THREE.DirectionalLight(0xffd2a0, 2.1);
    key.position.set(-8, 16, 14); this.world.add(key);
    this.camera.position.set(10, level.camera.y, 30);
    this.camera.lookAt(10, level.camera.y, 0);
    this.buildBackdrop();
    this.buildPlatforms();
    this.buildProps();
    this.buildPlayer();
    this.buildDebug();
    this.world.add(this.player, this.fork, this.flame, this.snuffer, this.pear, this.debug);
    this.debug.visible = false;
  }

  private material(color: number, metalness = 0): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.36 : 0.85, metalness });
    this.resources.add(material); return material;
  }
  private mesh(geometry: THREE.BufferGeometry, color: number, position: THREE.Vector3, parent: THREE.Object3D = this.world, metalness = 0): THREE.Mesh {
    this.resources.add(geometry);
    const mesh = new THREE.Mesh(geometry, this.material(color, metalness));
    mesh.position.copy(position); parent.add(mesh); return mesh;
  }
  private box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, parent: THREE.Object3D = this.world, metalness = 0): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), color, new THREE.Vector3(x, y, z), parent, metalness);
  }
  private sphere(x: number, y: number, z: number, radius: number, color: number, parent: THREE.Object3D = this.world): THREE.Mesh {
    return this.mesh(new THREE.SphereGeometry(radius, 16, 12), color, new THREE.Vector3(x, y, z), parent);
  }

  private buildBackdrop(): void {
    const l = this.level;
    this.box(33, 5, -9, 90, 25, 0.5, 0x2c1c27);
    // Oversized seated silhouettes establish the miniature scale. Deliberately
    // geometric placeholders, independent of every collision surface.
    for (let i = 0; i < 6; i++) {
      const x = 5 + i * 12;
      this.box(x, 6, -7, 5.8, 3.3, 1.3, i % 2 ? 0x4a2c34 : 0x39303b);
      this.sphere(x, 8.3, -7, 1.1, 0x7c574b);
      this.box(x, 7.2, -6.2, 1.1, 1.1, 0.2, 0x876d52);
    }
    // A crown beyond the dessert plate identifies the king without final art.
    for (let i = 0; i < 3; i++) {
      this.mesh(new THREE.ConeGeometry(0.4, 0.9, 4), 0xd6ab58, new THREE.Vector3(64.2 + i * 0.8, 9.5, -7));
    }
    this.box(33, -4.9, -2, 90, 3, 4, 0x53303a);
    this.box(33, -3.5, -1.7, 90, 0.2, 4, 0xa86c48);
    for (let i = 0; i < 24; i++) this.box(i * 3, -4.2, 0.6, 0.07, 1.2, 0.1, 0x9b694f);
    const start = l.checkpoints[0].spawn;
    this.cameraX = this.previousCameraX = start.x + 5;
  }

  private buildPlatforms(): void {
    for (const p of this.level.platforms) {
      if (p.art === 'bound' || p.gate) continue;
      const art = placeholderArt[p.art];
      this.box(p.x + p.width / 2, p.y + p.height / 2, 0, p.width, p.height, 1.6, art.color);
      this.box(p.x + p.width / 2, p.y + p.height - 0.07, 0.06, p.width, 0.14, 1.72, art.accent);
      if (p.art === 'bread') {
        for (let i = 0; i < 3; i++) {
          const score = this.box(p.x + 0.6 + i * 0.65, p.y + p.height - 0.1, 0.9, 0.1, 0.32, 0.04, 0x8b512c);
          score.rotation.z = -0.4;
        }
      }
      if (p.art === 'basket') {
        for (let i = 0; i < 10; i++) this.box(p.x + i * 0.4, p.y + p.height / 2, 0.9, 0.09, p.height, 0.08, art.accent);
      }
    }
  }

  private buildProps(): void {
    const l = this.level;
    this.fork.position.set(l.fork.pivot.x, l.fork.pivot.y - 0.125, 0.1);
    this.box(0, l.fork.length / 2, 0, 0.25, l.fork.length, 0.65, 0xbec6cb, this.fork, 0.65);
    this.box(0, l.fork.length - 0.8, 0, 1.2, 0.25, 0.65, 0xbec6cb, this.fork, 0.65);
    for (let i = 0; i < 4; i++) this.box(-0.45 + i * 0.3, l.fork.length - 0.35, 0, 0.13, 0.7, 0.6, 0xbec6cb, this.fork, 0.65);
    const h = l.candle.hazard;
    this.flame.position.set(h.x + h.width / 2, h.y, 0.25);
    const envelope = this.box(0, h.height / 2, 0, h.width, h.height, 1.3, 0xff9c44, this.flame);
    (envelope.material as THREE.MeshStandardMaterial).transparent = true;
    (envelope.material as THREE.MeshStandardMaterial).opacity = 0.2;
    const outer = this.mesh(new THREE.ConeGeometry(0.9, h.height, 16), 0xee7539, new THREE.Vector3(0, h.height / 2, 0), this.flame);
    (outer.material as THREE.MeshStandardMaterial).emissive.set(0xaa3d12);
    const inner = this.mesh(new THREE.ConeGeometry(0.42, h.height * 0.68, 12), 0xffd77b, new THREE.Vector3(0, h.height * 0.34, 0.5), this.flame);
    (inner.material as THREE.MeshStandardMaterial).emissive.set(0xd6aa3c);
    this.snuffer.position.set(h.x - 1, h.y + 1.5, 0.2);
    this.box(-0.5, 0.4, 0, 1.5, 0.13, 0.2, 0xc6a77a, this.snuffer, 0.55);
    this.mesh(new THREE.ConeGeometry(0.5, 0.6, 12, 1, true), 0xc6a77a, new THREE.Vector3(0, 0, 0), this.snuffer, 0.55);
    const p = l.pear;
    this.pear.position.set(p.x + p.width / 2, p.y, 0.3);
    const fruit = this.sphere(0, 0.55, 0, 0.6, 0xefbf54, this.pear); fruit.scale.set(1, 1.12, 0.8);
    this.sphere(0, 1.05, 0, 0.32, 0xefbf54, this.pear);
    const stem = this.box(0.03, 1.45, 0, 0.09, 0.4, 0.1, 0x6d4c32, this.pear); stem.rotation.z = -0.25;
    const leaf = this.sphere(0.22, 1.47, 0, 0.22, 0x779c66, this.pear); leaf.scale.set(1.4, 0.4, 0.35);
    const halo = this.mesh(new THREE.TorusGeometry(1.1, 0.02, 6, 48), 0xd4ab61, new THREE.Vector3(0, 0.7, -0.5), this.pear);
    (halo.material as THREE.MeshStandardMaterial).emissive.set(0x987844);
    this.pear.visible = p.x > 0;
    this.fork.visible = l.fork.triggerBounds.x > 0;
    this.snuffer.visible = h.x > 0;
  }

  private buildPlayer(): void {
    const t = this.level.tuning;
    this.box(t.width / 2, t.height * 0.4, 0.5, t.width * 0.72, t.height * 0.72, 0.55, 0x284447, this.player);
    this.sphere(t.width / 2, t.height * 0.82, 0.5, 0.23, 0xf2ddac, this.player);
    this.box(t.width / 2, t.height * 0.97, 0.5, t.width * 0.8, 0.11, 0.6, 0x21373e, this.player);
    this.box(t.width / 2, t.height * 0.58, 0.82, 0.52, 0.14, 0.08, 0xcba363, this.player);
    this.sphere(t.width * 0.58, t.height * 0.86, 0.72, 0.04, 0x25313b, this.player);
  }

  private debugRect(rect: Rect, color: number, parent: THREE.Object3D): void {
    const boxGeometry = new THREE.BoxGeometry(rect.width, rect.height, 0.05);
    const geometry = new THREE.EdgesGeometry(boxGeometry);
    boxGeometry.dispose();
    const material = new THREE.LineBasicMaterial({ color, depthTest: false });
    this.resources.add(geometry); this.resources.add(material);
    const lines = new THREE.LineSegments(geometry, material);
    lines.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2, 1.7);
    lines.renderOrder = 2; parent.add(lines);
  }
  private buildDebug(): void {
    for (const p of this.level.platforms) this.debugRect(p, 0x66d7ee, p.gate ? this.debugBridge : this.debug);
    for (const c of this.level.checkpoints) this.debugRect(c.trigger, 0x78ed91, this.debug);
    this.debugRect(this.level.fork.triggerBounds, 0xffff88, this.debug);
    this.debugRect(this.level.candle.triggerBounds, 0xffff88, this.debug);
    this.debugRect(this.level.candle.hazard, 0xff5555, this.debugFlame);
    this.debugRect(this.level.pear, 0xffcb64, this.debug);
    this.debug.add(this.debugBridge, this.debugFlame);
  }

  enter(): void {
    this.previous.set(this.model.controller.body.x, this.model.controller.body.y);
    this.updateHud();
  }
  fixedUpdate(dt: number, input: Controls): void {
    const body = this.model.controller.body;
    this.previous.set(body.x, body.y);
    this.previousCameraX = this.cameraX;
    this.model.update(dt, input);
    this.elapsed += dt;
    // Respawns snap interpolation; the camera returns promptly as well.
    if (Math.abs(body.x - this.previous.x) > this.level.tuning.speed * dt * 2 || Math.abs(body.y - this.previous.y) > 2) {
      this.previous.set(body.x, body.y);
      this.cameraX = this.previousCameraX = this.clampCamera(body.x + 3);
    }
    if (input.axis) this.facing = input.axis;
    const target = this.clampCamera(body.x + this.level.tuning.width / 2 + this.facing * this.level.camera.lookAhead);
    this.cameraX += (target - this.cameraX) * (this.reducedMotion ? 1 : 1 - Math.exp(-this.level.camera.followRate * dt));
    this.updateHud();
    if (this.model.completed && !this.didComplete && this.model.collection) {
      this.didComplete = true; this.onComplete(this.model.collection);
    }
  }
  private clampCamera(x: number): number {
    const left = this.level.bounds.x + this.viewWidth / 2;
    const right = this.level.bounds.x + this.level.bounds.width - this.viewWidth / 2;
    return right < left ? (left + right) / 2 : THREE.MathUtils.clamp(x, left, right);
  }
  private updateHud(): void {
    const x = this.model.controller.body.x;
    const section = x < 14.7 ? 'Bread basket' : x < 24 ? 'Crockery & cutlery' : x < 38.5 ? 'The fork bridge' : x < 48.5 ? 'The candle passage' : 'The king’s dessert';
    this.onHud({ checkpoint: this.model.session.checkpointId, section,
      prompt: this.model.prompt ? `E — ${this.model.prompt.label}` : '',
      cue: this.model.cueRemaining > 0 ? this.model.cue : '',
      fork: this.model.session.fork, candle: this.model.session.candle,
      completed: this.model.completed, progress: THREE.MathUtils.clamp(x / this.level.pear.x, 0, 1) });
  }
  render(alpha: number, _seconds: number): void {
    const b = this.model.controller.body;
    this.player.position.set(THREE.MathUtils.lerp(this.previous.x, b.x, alpha), THREE.MathUtils.lerp(this.previous.y, b.y, alpha), 0);
    this.player.visible = this.model.recoveryRemaining <= 0;
    const x = THREE.MathUtils.lerp(this.previousCameraX, this.cameraX, alpha);
    this.camera.position.x = x;
    const session = this.model.session;
    const forkProgress = session.fork === 'bridged' ? 1 : THREE.MathUtils.clamp(session.forkElapsed / this.level.fork.duration, 0, 1);
    this.fork.rotation.z = -Math.PI / 2 * (forkProgress * forkProgress * (3 - 2 * forkProgress));
    const h = this.level.candle.hazard;
    const candleProgress = THREE.MathUtils.clamp(session.candleElapsed / this.level.candle.duration, 0, 1);
    this.flame.visible = session.candle !== 'extinguished' && this.level.candle.hazard.x > 0;
    this.flame.scale.setScalar(1 - candleProgress * 0.6);
    // Hazard remains full size until the snuffing transition completes; the
    // visible envelope stays at full size so the unsafe passage stays clear.
    if (this.flame.children[0]) {
      this.flame.children[0].scale.setScalar(1 / this.flame.scale.x);
      this.flame.children[0].position.y = h.height / 2 / this.flame.scale.x;
    }
    this.snuffer.position.x = THREE.MathUtils.lerp(h.x - 1, h.x + h.width / 2, candleProgress);
    this.snuffer.position.y = THREE.MathUtils.lerp(h.y + 1.5, h.y + 0.3, candleProgress);
    this.pear.visible = !this.model.completed && this.level.pear.x > 0;
    this.pear.rotation.y = this.reducedMotion ? 0 : Math.sin(this.elapsed * 1.3) * 0.15;
    this.debugBridge.visible = session.fork === 'bridged';
    this.debugFlame.visible = session.candle !== 'extinguished';
  }
  resize(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    this.viewWidth = Math.max(this.level.camera.minViewWidth, this.level.camera.viewHeight * aspect);
    const viewHeight = this.viewWidth / aspect;
    this.camera.left = -this.viewWidth / 2; this.camera.right = this.viewWidth / 2;
    this.camera.top = viewHeight / 2; this.camera.bottom = -viewHeight / 2;
    this.camera.position.y = this.level.camera.y;
    this.camera.updateProjectionMatrix();
    this.cameraX = this.previousCameraX = this.clampCamera(this.cameraX);
  }
  exit(): void {}
  dispose(): void {
    for (const resource of this.resources) resource.dispose();
    this.resources.clear(); this.world.clear();
  }
}
