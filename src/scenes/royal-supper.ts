import * as THREE from 'three';
import { placeholderArt, type ArtId } from '../assets/manifest';
import { supperDinerPoses, supperPlatformArt, supperPlatformOverrides, supperPropPresentation, supperSkins } from '../assets/supper-props';
import type { GameScene } from '../core/scenes';
import type { Controls } from '../gameplay/controller';
import { RoyalSupperModel } from '../gameplay/royal-supper-model';
import type { SupperSession } from '../gameplay/royal-supper-model';
import type { CampaignResult } from '../campaign/progression';
import type { Rect } from '../gameplay/collision';
import type { RoyalSupperLevel } from '../levels/royal-supper';
import type { AudioCue } from '../core/audio';

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
  private playerPicture!: THREE.Mesh;
  private readonly textures = new Map<ArtId, THREE.Texture>();
  private readonly fork = new THREE.Group();
  private readonly fan = new THREE.Group();
  private readonly pear = new THREE.Group();
  private readonly debugBridge = new THREE.Group();
  private readonly flames: THREE.Group[] = [];
  private readonly embers: THREE.Mesh[] = [];
  private readonly heads: THREE.Group[] = [];
  private readonly dinerPictures: THREE.Mesh[] = [];
  private readonly wicks: THREE.Mesh[] = [];
  private readonly flags: THREE.Group[] = [];
  private readonly jellies: { group: THREE.Group; left: number; right: number }[] = [];
  private bounce = { x: 0, at: -10 };
  private readonly backdrop = new THREE.Group();
  private readonly gaze = new THREE.Group();
  private readonly gazeRays: { mesh: THREE.Mesh; head: THREE.Group; eyeX: number }[] = [];
  private readonly coverStrips: THREE.Mesh[] = [];
  private readonly grapeMeshes: THREE.Mesh[] = [];
  private forkLanding!: THREE.Mesh;
  private previous = new THREE.Vector2();
  private previousCamera = new THREE.Vector2();
  private cameraPosition = new THREE.Vector2();
  private facing = 1;
  private elapsed = 0;
  private viewWidth = 24;
  private didComplete = false;
  private slideSoundTime = 0;
  private resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();

  constructor(readonly level: RoyalSupperLevel, session: SupperSession,
    collect: () => CampaignResult, private readonly onHud: (hud: SupperHud) => void,
    private readonly onComplete: (result: CampaignResult) => void, private readonly reducedMotion: boolean,
    private readonly sound: (cue: AudioCue) => void, private readonly art: Partial<Record<ArtId, HTMLImageElement>>) {
    this.model = new RoyalSupperModel(level, session, collect);
    this.world.background = new THREE.Color(supperPropPresentation.backdrop.fill);
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
  private translucent(mesh: THREE.Mesh, opacity: number): void {
    const m = mesh.material as THREE.MeshStandardMaterial; m.transparent = true; m.opacity = opacity; m.depthWrite = false;
  }
  private picture(id: ArtId, x: number, y: number, width: number, height: number, z: number,
    parent: THREE.Object3D = this.world, tint = 0xffffff, repeat = 1): THREE.Mesh {
    const texture = this.texture(id);
    const geometry = new THREE.PlaneGeometry(width, height);
    if (repeat > 1) {
      texture.wrapS = THREE.RepeatWrapping;
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repeat);
    }
    const material = new THREE.MeshBasicMaterial({ map: texture, color: tint, transparent: true, alphaTest: 0.03 });
    this.resources.add(geometry); this.resources.add(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  private texture(id: ArtId): THREE.Texture {
    let texture = this.textures.get(id);
    if (!texture) {
      const image = this.art[id]; if (!image) throw new Error(`Missing prepared artwork: ${id}`);
      texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
      this.textures.set(id, texture); this.resources.add(texture);
    }
    return texture;
  }
  private aspect(id: ArtId): number { const image = this.art[id]!; return image.width / image.height; }
  private buildBackdrop(): void {
    const l = this.level; const length = l.bounds.width; const b = supperPropPresentation.backdrop;
    // The whole hall fits the view; its far table edge sits just below the
    // route's ground. Mirrored neighbours meet edge to edge without a seam.
    const height = b.width / this.aspect('royal-supper.background');
    const centreY = b.tableY + b.tableEdge * height - height / 2;
    this.world.add(this.backdrop);
    for (let x = l.bounds.x - b.width, index = 0; x < l.bounds.x + length + b.width; x += b.width, index++) {
      const scenic = this.picture('royal-supper.background', x + b.width / 2, centreY, b.width, height, -9, this.backdrop);
      if (index % 2) scenic.scale.x = -1;
    }
    this.box(length / 2, -6.5, -2, length + 20, 3, 4, 0x53303a);
    const dinerPositions = l.diner.cover.map(c => c.x + c.width / 2);
    for (const x of dinerPositions) {
      const d = supperPropPresentation.diner;
      const head = new THREE.Group(); head.position.set(x, d.centreY, -7); this.world.add(head);
      // The three poses share one registration; render swaps the texture.
      this.dinerPictures.push(this.picture('royal-supper.diner', 0, 0, d.height * this.aspect('royal-supper.diner'), d.height, 0, head, 0xf0e6de));
      this.heads.push(head);
    }
    this.buildGaze();
    for (let i = 0; i < 3; i++) this.mesh(new THREE.ConeGeometry(0.4, 0.9, 4), 0xd6ab58, l.pear.x + i * 0.8, l.pear.y + 7, -7);
  }
  private buildGaze(): void {
    const d = supperPropPresentation.diner; const zone = this.level.diner.zone;
    // Illustrated props are unlit planes. An additive shaft makes the gaze
    // visible on them without adding lights that cannot illuminate their art.
    const material = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(d.gaze.color) }, opacity: { value: d.gaze.opacity } },
      vertexShader: `varying vec2 beamUv;
        void main() { beamUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 color; uniform float opacity; varying vec2 beamUv;
        void main() {
          float edge = pow(max(0.0, 4.0 * beamUv.x * (1.0 - beamUv.x)), 1.2);
          float strength = mix(1.0, 0.35, beamUv.y);
          gl_FragColor = vec4(color, opacity * edge * strength);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.resources.add(material);
    this.heads.forEach((head, i) => {
      const left = i === 0 ? zone.x : (this.heads[i - 1].position.x + head.position.x) / 2;
      const right = i === this.heads.length - 1 ? zone.x + zone.width : (head.position.x + this.heads[i + 1].position.x) / 2;
      for (const eyeX of d.eyes) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
          -d.gaze.sourceWidth, 0, 0, d.gaze.sourceWidth, 0, 0,
          left - head.position.x - eyeX, zone.y - d.centreY - d.eyeY, 0,
          right - head.position.x - eyeX, zone.y - d.centreY - d.eyeY, 0,
        ], 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
        geometry.setIndex([0, 2, 1, 1, 2, 3]); this.resources.add(geometry);
        const mesh = new THREE.Mesh(geometry, material); this.gaze.add(mesh);
        this.gazeRays.push({ mesh, head, eyeX });
      }
    });
    this.gaze.visible = false; this.world.add(this.gaze);
  }
  private buildPlatforms(): void {
    for (const p of this.level.platforms) {
      if (p.art === 'bound' || p.art === 'candle') continue;
      if (p.gate) {
        this.forkLanding = this.box(p.x + p.width / 2, p.y + p.height - 0.025, 1, p.width, 0.05, 0.03, 0xe7d5a6);
        this.forkLanding.visible = false;
        continue;
      }
      const imageArt = supperPlatformArt[p.art];
      if (imageArt) {
        const id = supperPlatformOverrides[p.id] ?? imageArt.id; const skin = supperSkins[id] ?? {};
        const top = p.y + p.height; const height = skin.depth ?? p.height; const z = skin.z ?? 0.95;
        // A tall goblet block (the grape chute) is the goblet itself.
        if (p.art === 'goblet' && p.height > 1.5) this.picture('royal-supper.goblet', p.x + p.width / 2, p.y + p.height / 2, p.width, p.height, z);
        else if (skin.strip) this.strip(id, p.x, top - height / 2, p.width, height, z);
        else if (p.art === 'jelly') {
          // Pivot at the foot so a bounce squashes the jelly down into its dish.
          const group = new THREE.Group(); group.position.set(p.x + p.width / 2, top - height, z); this.world.add(group);
          this.picture(id, 0, height / 2, p.width, height, 0, group);
          this.jellies.push({ group, left: p.x, right: p.x + p.width });
        } else this.picture(id, p.x + p.width / 2, top - height / 2, p.width, height, z);
        // Exact landing edge; generated pixels never define the platform height.
        this.box(p.x + p.width / 2, top - 0.025, 0.98, p.width, 0.05, 0.03, imageArt.lip);
        if (p.art === 'goblet' && p.height <= 1.5) {
          const height = Math.max(p.height, supperPropPresentation.gobletArch.height);
          this.picture('royal-supper.goblet', p.x + p.width / 2, top - height / 2,
            height * this.aspect('royal-supper.goblet'), height, -1.5);
        }
        continue;
      }
      if (p.art === 'ceiling') { this.canopy(p); continue; }
      const a = placeholderArt[p.art];
      this.box(p.x + p.width / 2, p.y + p.height / 2, 0, p.width, p.height, 1.6, a.color);
      this.box(p.x + p.width / 2, p.y + p.height - 0.07, 0.06, p.width, 0.14, 1.72, a.accent);
    }
    for (const c of this.level.diner.cover) {
      this.picture('royal-supper.cover', c.x + c.width / 2, c.y + c.height / 2, c.width, c.height, -0.4);
      // The dish silhouette fills the protection volume. The inset floor strip
      // marks safe FOOT CENTRES, so a player at its edge still fits fully inside.
      this.coverStrips.push(this.box(c.x + c.width / 2, c.y + 0.035, 0.95,
        c.width - this.level.tuning.width, 0.07, 0.18, 0x8ddbea));
    }
    const f = supperPropPresentation.flag;
    for (const c of this.level.checkpoints) {
      // Pivot at the foot of the pole so reached flags can wave.
      const flag = new THREE.Group(); flag.position.set(c.spawn.x + f.x, c.spawn.y, 0.9); this.world.add(flag);
      this.picture('royal-supper.flag', 0, f.height / 2, f.height * this.aspect('royal-supper.flag'), f.height, 0, flag);
      this.flags.push(flag);
    }
  }
  // Caps keep their drawn proportions at this height; the middle tile repeats
  // a whole number of times across the rest, slightly under the caps.
  private strip(id: ArtId, x: number, y: number, width: number, height: number, z: number): void {
    const left = `${id}-left` as ArtId; const right = `${id}-right` as ArtId;
    const fit = Math.min(1, width * 0.45 / (height * (this.aspect(left) + this.aspect(right))));
    const lw = height * this.aspect(left) * fit; const rw = height * this.aspect(right) * fit; const mid = width - lw - rw;
    this.picture(id, x + lw + mid / 2, y, mid + 0.04, height, z, this.world, 0xffffff,
      Math.max(1, Math.round(mid / (height * this.aspect(id)))));
    this.picture(left, x + lw / 2, y, lw, height, z + 0.002);
    this.picture(right, x + width - rw / 2, y, rw, height, z + 0.002);
  }
  // The candle canopy keeps its collider; a velvet valance with a gold band
  // marks its underside, the only edge the route meets.
  private canopy(p: Rect): void {
    const x = p.x + p.width / 2; const a = placeholderArt.ceiling;
    this.box(x, p.y + p.height / 2, 0, p.width, p.height, 1.6, a.color);
    this.box(x, p.y + 0.24, 0.84, p.width, 0.44, 0.06, a.accent);
    this.box(x, p.y + 0.03, 0.86, p.width, 0.06, 0.06, supperPropPresentation.holder.ink);
  }
  private buildProps(): void {
    const l = this.level;
    this.fork.position.set(l.fork.pivot.x, l.fork.pivot.y - 0.125, 0.1);
    // Toppled, the fork's local left side becomes its top (local x maps to -y):
    // shift it so that side rests just above the bridge's landing top.
    const fork = supperPropPresentation.fork;
    this.picture('royal-supper.fork', fork.width / 2 - 0.125 - fork.top, l.fork.length / 2, fork.width,
      l.fork.length, 0.9, this.fork);
    this.fork.visible = l.fork.triggerBounds.x > 0;
    l.candle.flames.forEach(h => {
      // Pivot at the wick so the flicker grows from the candle top. A faint
      // glow keeps the whole hazard rect readable around the drawn flame.
      const flame = new THREE.Group(); flame.position.set(h.x + h.width / 2, h.y, 0.3); this.world.add(flame); this.flames.push(flame);
      this.translucent(this.box(0, h.height / 2, -0.7, h.width, h.height, 0.05, 0xff9c44, flame), 0.14);
      this.picture('royal-supper.flame', 0, h.height / 2, h.width * supperPropPresentation.flame.width, h.height, 0, flame);
      // While out: a smoking wick, and the ember bar shrinking until relight.
      const wick = 0.95;
      this.wicks.push(this.picture('royal-supper.ember', h.x + h.width / 2, h.y + wick / 2, wick * this.aspect('royal-supper.ember'), wick, 0.85));
      const ember = this.box(h.x + h.width / 2, h.y + 0.08, 0.9, h.width, 0.16, 0.1, 0xff9a3c); this.embers.push(ember);
      (ember.material as THREE.MeshStandardMaterial).emissive.set(0xb4461a);
    });
    if (l.candle.flames.length) {
      const first = l.candle.flames[0]; const last = l.candle.flames.at(-1)!;
      const centre = (first.x + last.x + last.width) / 2;
      const holder = l.candle.holder;
      const armSpan = last.x + last.width / 2 - first.x - first.width / 2;
      // A dish under each wax centre, posts to a crossbar, a centre stem and
      // the drawn foot. Decoration below the route, with no collision floor.
      const hp = supperPropPresentation.holder;
      const brass = (x: number, y: number, w: number, h: number, z: number) => {
        this.box(x, y, z - 0.02, w + 0.1, h + 0.1, 0.04, hp.ink); this.box(x, y, z, w, h, 0.04, hp.brass, this.world, 0.3);
      };
      const footTop = holder.baseY + hp.footHeight;
      brass(centre, holder.crossbarY, armSpan + hp.arm, hp.arm, -0.5);
      brass(centre, (holder.crossbarY + footTop) / 2, hp.arm * 1.5, holder.crossbarY - footTop, -0.5);
      this.picture('royal-supper.holder', centre, holder.baseY + hp.footHeight / 2,
        hp.footHeight * this.aspect('royal-supper.holder'), hp.footHeight, -0.45);
      l.candle.flames.forEach(h => {
        const x = h.x + h.width / 2;
        brass(x, (holder.crossbarY + holder.waxBaseY) / 2, hp.arm, holder.waxBaseY - holder.crossbarY, -0.5);
        brass(x, holder.waxBaseY - hp.dish / 2, h.width + 2 * hp.dishOverhang, hp.dish, 0.88);
        this.picture('royal-supper.wax', x, (holder.waxBaseY + h.y) / 2, h.width, h.y - holder.waxBaseY, 0.9);
        this.box(x, h.y - 0.06, 0, h.width, 0.12, 1.7, 0xffe7bf);
      });
      this.fan.position.set(l.candle.fan.x, l.candle.fan.y, 1.4);
      const diameter = supperPropPresentation.fan.diameter;
      this.picture('royal-supper.fan', 0, 0, diameter, diameter, 0, this.fan);
    }
    const g = l.grapes; const count = g.offsets.length * (Math.ceil((g.startX - g.endX) / g.speed / g.period) + 1);
    for (let i = 0; i < count; i++) {
      const grape = this.picture('royal-supper.grape', 0, 0, g.radius * 2, g.radius * 2, 0.4);
      grape.visible = false; this.grapeMeshes.push(grape);
    }
    const p = l.pear; this.pear.position.set(p.x + p.width / 2, p.y, 0.3);
    this.picture('restoration.pear', 0, p.height / 2, p.width, p.height, 0.9, this.pear);
  }
  private buildPlayer(): void {
    const t = this.level.tuning;
    const image = this.art['player.idle']!;
    const height = t.height * 272 / 256;
    this.playerPicture = this.picture('player.idle', 0, t.height / 2, height * image.width / image.height, height, 1.35, this.player);
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
    const oldVy = b.vy; const wasGrounded = b.grounded; const airReady = this.model.controller.airJumpAvailable;
    const wasRecovering = this.model.recoveryRemaining > 0;
    const oldFork = this.model.session.fork; const oldAttention = this.model.dinerPhase;
    const lit = this.level.candle.flames.map((_, i) => this.model.flameLit(i));
    this.model.update(dt, input); this.elapsed += dt;
    if (!wasRecovering && this.model.recoveryRemaining > 0) this.sound('hazard');
    else if (!wasRecovering && !input.restartPressed) {
      if (b.vy === this.level.tuning.bounceSpeed && oldVy < 0) { this.sound('bounce'); this.bounce = { x: b.x + b.width / 2, at: this.elapsed }; }
      else if (b.vy > 0 && ((wasGrounded && !b.grounded) || (airReady && !this.model.controller.airJumpAvailable) || oldVy <= 0)) this.sound('jump');
      if (oldFork !== 'bridged' && this.model.session.fork === 'bridged') this.sound('fork');
      if (oldAttention !== 'TURNING' && this.model.dinerPhase === 'TURNING' && b.x >= this.level.sections[5].start && b.x < this.level.sections[6].start) this.sound('attention');
      if (lit.some((wasLit, i) => wasLit && !this.model.flameLit(i)) && b.x >= this.level.sections[4].start && b.x < this.level.sections[5].start) this.sound('fan');
      this.slideSoundTime = Math.max(0, this.slideSoundTime - dt);
      if (this.model.controller.slidingActive && b.grounded && Math.abs(b.vx) > 1 && this.slideSoundTime === 0) {
        this.sound('slide'); this.slideSoundTime = 0.4;
      }
    }
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
    this.player.position.set(THREE.MathUtils.lerp(this.previous.x, b.x, alpha) + b.width / 2, THREE.MathUtils.lerp(this.previous.y, b.y, alpha), 0);
    this.player.scale.x = this.facing;
    const pose: ArtId = !b.grounded ? 'player.jump' : Math.abs(b.vx) > 0.25 && !this.reducedMotion ?
      (Math.floor(this.elapsed * 9) % 2 ? 'player.walk-a' : 'player.walk-b') : 'player.idle';
    (this.playerPicture.material as THREE.MeshBasicMaterial).map = this.texture(pose);
    this.player.visible = this.model.recoveryRemaining <= 0;
    this.camera.position.x = THREE.MathUtils.lerp(this.previousCamera.x, this.cameraPosition.x, alpha);
    this.camera.position.y = THREE.MathUtils.lerp(this.previousCamera.y, this.cameraPosition.y, alpha);
    // Keep the distant palace in view above the high dessert platforms.
    // Foreground props, painted watchers and collision remain in world space.
    this.backdrop.position.y = Math.max(0, this.camera.position.y - this.level.camera.y);
    const s = this.model.session;
    const t = s.fork === 'bridged' ? 1 : THREE.MathUtils.clamp(s.forkElapsed / this.level.fork.duration, 0, 1);
    this.fork.rotation.z = -Math.PI / 2 * (t * t * (3 - 2 * t));
    if (this.forkLanding) this.forkLanding.visible = s.fork === 'bridged';
    // Presentation clocks follow the fixed-step time, so they freeze with pause.
    const clock = this.reducedMotion ? 0 : this.elapsed;
    this.flames.forEach((flame, i) => { flame.visible = this.model.flameLit(i); this.embers[i].visible = this.wicks[i].visible = !flame.visible;
      flame.scale.set(1 + Math.sin(clock * 11 + i * 2) * 0.04, 1 + Math.sin(clock * 7.3 + i) * 0.06, 1);
      this.embers[i].scale.x = Math.max(0.05, this.model.flameRemaining(i) / this.level.candle.safeSeconds); });
    // Fan uses the same frozen gameplay clock as extinguishing, not render time.
    this.fan.rotation.z = -this.model.candlePhase / this.level.candle.period * Math.PI * 2;
    const grapes = this.model.grapes;
    this.grapeMeshes.forEach((mesh, i) => { const g = grapes[i]; mesh.visible = !!g; if (g) {
      mesh.position.set(g.x + g.width / 2, g.y + g.height / 2, 0.4); mesh.rotation.z = -g.x / this.level.grapes.radius; } });
    // Pose frames follow the attention phase: a chewing bob while away, a
    // small lean-in while looking.
    const phase = this.model.dinerPhase; const diner = supperPropPresentation.diner;
    const dinerPose = this.texture(supperDinerPoses[phase]);
    this.heads.forEach((head, i) => {
      (this.dinerPictures[i].material as THREE.MeshBasicMaterial).map = dinerPose;
      head.position.y = diner.centreY + (phase === 'AWAY' ? Math.abs(Math.sin(clock * 5 + i)) * 0.08 : 0);
      head.scale.setScalar(phase === 'LOOK' && !this.reducedMotion ? 1.04 : 1);
    });
    this.gaze.visible = phase === 'LOOK';
    this.gazeRays.forEach(({ mesh, head, eyeX }) => {
      // Start at the drawn eye; the shaft stays behind the player and cover so
      // their silhouettes remain readable.
      mesh.position.set(head.position.x + eyeX * head.scale.x, head.position.y + diner.eyeY * head.scale.y, diner.gaze.z);
    });
    const since = this.elapsed - this.bounce.at;
    this.jellies.forEach(j => {
      const hit = !this.reducedMotion && since < 0.6 && this.bounce.x >= j.left - 0.5 && this.bounce.x <= j.right + 0.5;
      const k = hit ? Math.exp(-since * 7) * Math.cos(since * 28) : 0;
      j.group.scale.set(1 + k * 0.12, 1 - k * 0.3, 1);
    });
    const reached = this.level.checkpoints.findIndex(c => c.id === s.checkpointId);
    this.flags.forEach((flag, i) => {
      (flag.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.color.setHex(i <= reached ? 0xffffff : 0x8d8794);
      flag.rotation.z = i <= reached ? Math.sin(clock * 2.4 + i) * 0.06 : 0;
    });
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
  dispose(): void { for (const resource of this.resources) resource.dispose(); this.resources.clear(); this.textures.clear(); this.world.clear(); }
}
