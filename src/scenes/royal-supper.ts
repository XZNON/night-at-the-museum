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
  checkpoint: string; section: string; prompt: string; cue: string; hint: string;
  fork: string; candle: string; diner: string; jump: string; completed: boolean;
}
export class RoyalSupperScene implements GameScene {
  readonly id = 'royal-supper';
  readonly world = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-12, 12, 6, -6, 0.1, 100);
  readonly model: RoyalSupperModel;
  readonly debug = new THREE.Group();
  private readonly player = new THREE.Group();
  private readonly fork = new THREE.Group();
  private readonly fan = new THREE.Group();
  private readonly pear = new THREE.Group();
  private readonly debugBridge = new THREE.Group();
  private readonly flames: THREE.Group[] = [];
  private readonly embers: THREE.Mesh[] = [];
  private readonly heads: THREE.Group[] = [];
  private readonly coverStrips: THREE.Mesh[] = [];
  private readonly grapeMeshes: THREE.Mesh[] = [];
  private previous = new THREE.Vector2();
  private previousCamera = new THREE.Vector2();
  private cameraPosition = new THREE.Vector2();
  private facing = 1;
  private elapsed = 0;
  private viewWidth = 24;
  private didComplete = false;
  private resources = new Set<THREE.BufferGeometry | THREE.Material>();

  constructor(readonly level: RoyalSupperLevel, session: SupperSession,
    collect: () => CampaignResult, private readonly onHud: (hud: SupperHud) => void,
    private readonly onComplete: (result: CampaignResult) => void, private readonly reducedMotion: boolean) {
    this.model = new RoyalSupperModel(level, session, collect);
    this.world.background = new THREE.Color(0x241720);
    this.world.add(new THREE.HemisphereLight(0xffe9cc, 0x382332, 2.2));
    const key = new THREE.DirectionalLight(0xffd2a0, 2.1); key.position.set(-8, 16, 14); this.world.add(key);
    this.camera.position.set(10, level.camera.y, 30); this.camera.lookAt(10, level.camera.y, 0);
    this.buildBackdrop(); this.buildPlatforms(); this.buildProps(); this.buildPlayer(); this.buildDebug();
    this.world.add(this.player, this.fork, this.fan, this.pear, this.debug); this.debug.visible = false;
    this.cameraPosition.set(this.clampCamera(this.model.controller.body.x + 5), level.camera.y);
    this.previousCamera.copy(this.cameraPosition);
  }
  private material(color: number, metalness = 0): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.36 : 0.85, metalness }); this.resources.add(m); return m;
  }
  private mesh(g: THREE.BufferGeometry, color: number, x: number, y: number, z: number, parent: THREE.Object3D = this.world, metalness = 0): THREE.Mesh {
    this.resources.add(g); const mesh = new THREE.Mesh(g, this.material(color, metalness)); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  private box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, parent: THREE.Object3D = this.world, metalness = 0): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent, metalness);
  }
  private sphere(x: number, y: number, z: number, radius: number, color: number, parent: THREE.Object3D = this.world): THREE.Mesh {
    return this.mesh(new THREE.SphereGeometry(radius, 12, 10), color, x, y, z, parent);
  }
  private translucent(mesh: THREE.Mesh, opacity: number): void {
    const m = mesh.material as THREE.MeshStandardMaterial; m.transparent = true; m.opacity = opacity; m.depthWrite = false;
  }
  private buildBackdrop(): void {
    const l = this.level; const length = l.bounds.width;
    this.box(length / 2, 15, -9, length + 20, 65, 0.5, 0x2c1c27);
    this.box(length / 2, -6.5, -2, length + 20, 3, 4, 0x53303a);
    const dinerPositions = l.diner.cover.map(c => c.x + c.width / 2);
    const backgroundPositions = Array.from({ length: Math.ceil(length / 24) }, (_, i) => 5 + i * 24)
      .filter(x => x < l.diner.zone.x - 8 || x > l.diner.zone.x + l.diner.zone.width + 8);
    for (const x of [...backgroundPositions, ...dinerPositions]) {
      this.box(x, 8, -7, 8, 5, 1.3, 0x4a2c34);
      const head = new THREE.Group(); head.position.set(x, 11, -7); this.world.add(head);
      this.sphere(0, 0, 0, 1.3, 0x7c574b, head);
      this.sphere(0.45, -0.2, 1.2, 0.16, 0xffdfa0, head);
      this.sphere(-0.45, -0.2, 1.2, 0.16, 0xffdfa0, head);
      if (dinerPositions.includes(x)) this.heads.push(head);
    }
    for (let i = 0; i < 3; i++) this.mesh(new THREE.ConeGeometry(0.4, 0.9, 4), 0xd6ab58, l.pear.x + i * 0.8, l.pear.y + 7, -7);
  }
  private buildPlatforms(): void {
    for (const p of this.level.platforms) {
      if (p.art === 'bound' || p.art === 'candle' || p.gate) continue;
      const a = placeholderArt[p.art];
      this.box(p.x + p.width / 2, p.y + p.height / 2, 0, p.width, p.height, 1.6, a.color);
      this.box(p.x + p.width / 2, p.y + p.height - 0.07, 0.06, p.width, 0.14, 1.72, a.accent);
    }
    for (const c of this.level.diner.cover) {
      this.translucent(this.box(c.x + c.width / 2, c.y + c.height / 2, -0.4, c.width, c.height, 0.15, 0x56bfd4), 0.35);
      this.box(c.x, c.y + c.height / 2, 0, 0.1, c.height, 0.4, 0x8ddbea);
      this.box(c.x + c.width, c.y + c.height / 2, 0, 0.1, c.height, 0.4, 0x8ddbea);
      this.box(c.x + c.width / 2, c.y + c.height, 0, c.width, 0.09, 0.4, 0x8ddbea);
      // The dish silhouette fills the protection volume. The inset floor strip
      // marks safe FOOT CENTRES, so a player at its edge still fits fully inside.
      this.box(c.x + c.width / 2, c.y + c.height / 2, -1.2, c.width, c.height, 0.3, 0x527b8b);
      this.coverStrips.push(this.box(c.x + c.width / 2, c.y + 0.035, 0.95,
        c.width - this.level.tuning.width, 0.07, 0.18, 0x8ddbea));
    }
    for (const c of this.level.checkpoints) {
      this.box(c.spawn.x - 0.25, c.spawn.y + 0.15, 1, 0.3, 0.3, 0.06, 0x8fd1a1);
    }
  }
  private buildProps(): void {
    const l = this.level;
    this.fork.position.set(l.fork.pivot.x, l.fork.pivot.y - 0.125, 0.1);
    this.box(0, l.fork.length / 2, 0, 0.25, l.fork.length, 0.65, 0xbec6cb, this.fork, 0.65);
    this.box(0, l.fork.length - 0.8, 0, 1.2, 0.25, 0.65, 0xbec6cb, this.fork, 0.65);
    for (let i = 0; i < 4; i++) this.box(-0.45 + i * 0.3, l.fork.length - 0.35, 0, 0.13, 0.7, 0.6, 0xbec6cb, this.fork, 0.65);
    this.fork.visible = l.fork.triggerBounds.x > 0;
    l.candle.flames.forEach(h => {
      const flame = new THREE.Group(); flame.position.set(h.x + h.width / 2, h.y, 0.3); this.world.add(flame); this.flames.push(flame);
      this.translucent(this.box(0, h.height / 2, 0, h.width, h.height, 1.3, 0xff9c44, flame), 0.24);
      const outer = this.mesh(new THREE.ConeGeometry(h.width / 2, h.height, 12), 0xee7539, 0, h.height / 2, 0, flame);
      (outer.material as THREE.MeshStandardMaterial).emissive.set(0xaa3d12);
      const ember = this.box(h.x + h.width / 2, h.y + 0.08, 0.9, h.width, 0.16, 0.1, 0x79d6d7); this.embers.push(ember);
    });
    if (l.candle.flames.length) {
      const first = l.candle.flames[0]; const last = l.candle.flames.at(-1)!;
      const centre = (first.x + last.x + last.width) / 2;
      const holder = l.candle.holder;
      const armSpan = last.x + last.width / 2 - first.x - first.width / 2;
      // One brass trident supports three separate wax tops. Its connecting
      // arms sit below the route and never provide a walkable bridge.
      this.box(centre, holder.baseY, -0.5, 5, 0.3, 1.4, 0xb38b43, this.world, 0.6);
      this.box(centre, (holder.baseY + holder.crossbarY) / 2, -0.5, 0.5,
        holder.crossbarY - holder.baseY, 0.6, 0xb38b43, this.world, 0.6);
      this.box(centre, holder.crossbarY, -0.5, armSpan, 0.3, 0.6, 0xb38b43, this.world, 0.6);
      l.candle.flames.forEach(h => {
        const x = h.x + h.width / 2;
        this.box(x, (holder.crossbarY + holder.waxBaseY) / 2, -0.5, 0.4,
          holder.waxBaseY - holder.crossbarY, 0.6, 0xb38b43, this.world, 0.6);
        this.box(x, holder.waxBaseY, 0, h.width + 0.25, 0.2, 1.6, 0xb38b43, this.world, 0.6);
        this.box(x, (holder.waxBaseY + h.y) / 2, 0, h.width, h.y - holder.waxBaseY, 1.6, 0xf0d4a0);
        this.box(x, h.y - 0.06, 0, h.width, 0.12, 1.7, 0xffe7bf);
      });
      this.fan.position.set(l.candle.fan.x, l.candle.fan.y, 1.4);
      for (let i = 0; i < 4; i++) { const blade = this.box(0, 0, 0, 2.6, 0.25, 0.15, 0x8abfc0, this.fan); blade.rotation.z = i * Math.PI / 4; }
      this.sphere(0, 0, 0.2, 0.28, 0xd3ae63, this.fan);
    }
    const g = l.grapes; const count = g.offsets.length * (Math.ceil((g.startX - g.endX) / g.speed / g.period) + 1);
    for (let i = 0; i < count; i++) { const grape = this.sphere(0, 0, 0.4, g.radius, 0x925ab8); grape.visible = false; this.grapeMeshes.push(grape); }
    const p = l.pear; this.pear.position.set(p.x + p.width / 2, p.y, 0.3);
    const fruit = this.sphere(0, 0.55, 0, 0.6, 0xefbf54, this.pear); fruit.scale.set(1, 1.12, 0.8);
    this.sphere(0, 1.05, 0, 0.32, 0xefbf54, this.pear);
    this.box(0.03, 1.45, 0, 0.09, 0.4, 0.1, 0x6d4c32, this.pear);
    const leaf = this.sphere(0.22, 1.47, 0, 0.22, 0x779c66, this.pear); leaf.scale.set(1.4, 0.4, 0.35);
  }
  private buildPlayer(): void {
    const t = this.level.tuning;
    this.box(t.width / 2, t.height * 0.4, 0.5, t.width * 0.72, t.height * 0.72, 0.55, 0x284447, this.player);
    this.sphere(t.width / 2, t.height * 0.82, 0.5, 0.23, 0xf2ddac, this.player);
    this.box(t.width / 2, t.height * 0.97, 0.5, t.width * 0.8, 0.11, 0.6, 0x21373e, this.player);
    this.box(t.width / 2, t.height * 0.58, 0.82, 0.52, 0.14, 0.08, 0xcba363, this.player);
    this.box(t.width / 2, 0.07, 0.95, 0.12, 0.14, 0.08, 0xf2ddac, this.player);
  }
  private debugRect(rect: Rect, color: number, parent: THREE.Object3D): void {
    const box = new THREE.BoxGeometry(rect.width, rect.height, 0.05); const g = new THREE.EdgesGeometry(box); box.dispose();
    const m = new THREE.LineBasicMaterial({ color, depthTest: false }); this.resources.add(g); this.resources.add(m);
    const lines = new THREE.LineSegments(g, m); lines.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2, 1.7); lines.renderOrder = 2; parent.add(lines);
  }
  private buildDebug(): void {
    for (const p of this.level.platforms) this.debugRect(p, 0x66d7ee, p.gate ? this.debugBridge : this.debug);
    for (const c of this.level.checkpoints) this.debugRect(c.trigger, 0x78ed91, this.debug);
    for (const h of this.level.candle.flames) this.debugRect(h, 0xff5555, this.debug);
    for (const c of this.level.diner.cover) this.debugRect(c, 0x5599ff, this.debug);
    this.debugRect(this.level.fork.triggerBounds, 0xffff88, this.debug); this.debug.add(this.debugBridge);
  }
  enter(): void { this.previous.set(this.model.controller.body.x, this.model.controller.body.y); this.updateHud(); }
  fixedUpdate(dt: number, input: Controls): void {
    const b = this.model.controller.body; this.previous.set(b.x, b.y); this.previousCamera.copy(this.cameraPosition);
    this.model.update(dt, input); this.elapsed += dt;
    if (input.axis) this.facing = input.axis;
    const target = new THREE.Vector2(this.clampCamera(b.x + b.width / 2 + this.facing * this.level.camera.lookAhead), Math.max(this.level.camera.y, b.y + 2.4));
    if (Math.abs(b.x - this.previous.x) > this.level.tuning.speed * dt * 2 || Math.abs(b.y - this.previous.y) > 2) {
      this.previous.set(b.x, b.y); this.cameraPosition.copy(target); this.previousCamera.copy(target);
    } else this.cameraPosition.lerp(target, this.reducedMotion ? 1 : 1 - Math.exp(-this.level.camera.followRate * dt));
    this.updateHud();
    if (this.model.completed && !this.didComplete && this.model.collection) { this.didComplete = true; this.onComplete(this.model.collection); }
  }
  private clampCamera(x: number): number {
    const left = this.level.bounds.x + this.viewWidth / 2; const right = this.level.bounds.x + this.level.bounds.width - this.viewWidth / 2;
    return right < left ? (left + right) / 2 : THREE.MathUtils.clamp(x, left, right);
  }
  private updateHud(): void {
    const m = this.model;
    const candle = this.level.candle.flames.map((_, i) => m.flameLit(i) ? `${i + 1}: LIT` : `${i + 1}: ${m.flameRemaining(i).toFixed(1)}s`).join(' · ');
    this.onHud({ checkpoint: m.session.checkpointId, section: m.section.name, hint: m.section.hint,
      prompt: m.prompt ? `E — ${m.prompt.label}` : '', cue: m.cueRemaining > 0 ? m.cue : '', fork: m.session.fork,
      candle, diner: `${m.dinerPhase}${m.hidden ? ' · HIDDEN' : ' · exposed'}`, jump: m.controller.airJumpAvailable ? 'Air jump ready' : 'Air jump spent', completed: m.completed });
  }
  render(alpha: number, _seconds: number): void {
    const b = this.model.controller.body;
    this.player.position.set(THREE.MathUtils.lerp(this.previous.x, b.x, alpha), THREE.MathUtils.lerp(this.previous.y, b.y, alpha), 0);
    this.player.visible = this.model.recoveryRemaining <= 0;
    this.camera.position.x = THREE.MathUtils.lerp(this.previousCamera.x, this.cameraPosition.x, alpha);
    this.camera.position.y = THREE.MathUtils.lerp(this.previousCamera.y, this.cameraPosition.y, alpha);
    const s = this.model.session;
    const t = s.fork === 'bridged' ? 1 : THREE.MathUtils.clamp(s.forkElapsed / this.level.fork.duration, 0, 1);
    this.fork.rotation.z = -Math.PI / 2 * (t * t * (3 - 2 * t));
    this.flames.forEach((flame, i) => { flame.visible = this.model.flameLit(i); this.embers[i].visible = !flame.visible;
      this.embers[i].scale.x = Math.max(0.05, this.model.flameRemaining(i) / this.level.candle.safeSeconds); });
    // Fan uses the same frozen gameplay clock as extinguishing, not render time.
    this.fan.rotation.z = -this.model.candlePhase / this.level.candle.period * Math.PI * 2;
    const grapes = this.model.grapes;
    this.grapeMeshes.forEach((mesh, i) => { const g = grapes[i]; mesh.visible = !!g; if (g) {
      mesh.position.set(g.x + g.width / 2, g.y + g.height / 2, 0.4); mesh.rotation.z = -g.x / this.level.grapes.radius; } });
    const headTilt = this.model.dinerPhase === 'LOOK' ? 0.5 : this.model.dinerPhase === 'TURNING' ? 0.25 : -0.25;
    this.heads.forEach(head => { head.rotation.x = headTilt; const eyeColor = this.model.dinerPhase === 'LOOK' ? 0xff5544 : 0xffdfa0;
      head.children.slice(1).forEach(eye => ((eye as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(eyeColor)); });
    this.coverStrips.forEach((strip, i) => {
      const c = this.level.diner.cover[i]; const centre = b.x + b.width / 2;
      const inside = this.model.hidden && centre >= c.x && centre <= c.x + c.width;
      (strip.material as THREE.MeshStandardMaterial).color.setHex(inside ? 0x71efa4 : 0x8ddbea);
    });
    this.pear.visible = !this.model.completed && this.level.pear.x > 0;
    this.pear.rotation.y = this.reducedMotion ? 0 : Math.sin(this.elapsed * 1.3) * 0.15;
    this.debugBridge.visible = s.fork === 'bridged';
  }
  resize(width: number, height: number): void {
    const aspect = width / Math.max(1, height); this.viewWidth = Math.max(this.level.camera.minViewWidth, this.level.camera.viewHeight * aspect);
    const viewHeight = this.viewWidth / aspect; this.camera.left = -this.viewWidth / 2; this.camera.right = this.viewWidth / 2;
    this.camera.top = viewHeight / 2; this.camera.bottom = -viewHeight / 2; this.camera.updateProjectionMatrix();
    this.cameraPosition.x = this.clampCamera(this.cameraPosition.x); this.previousCamera.copy(this.cameraPosition);
  }
  exit(): void {}
  dispose(): void { for (const resource of this.resources) resource.dispose(); this.resources.clear(); this.world.clear(); }
}
