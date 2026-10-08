import * as THREE from 'three';
import type { GameScene } from '../core/scenes';
import type { Controls } from '../gameplay/controller';
import { museum, type MuseumPose } from '../levels/museum';
import type { ArtId } from '../assets/manifest';
import { masterpieceStageArt } from '../ui/masterpiece';
import type { StepSurface } from '../core/audio';

/**
 * What the museum shows of the campaign: restored pieces (0-2), whether the Sketch's light has left its torch,
 * whether the masterpiece has been opened (until then Royal Supper is dark and locked, and only its lamp is lit),
 * and the artwork to visit next (its frame shimmers; null when the garden is complete).
 */
export interface MuseumArtState { restored: number; lightTaken: boolean; opened: boolean; next: string | null }

export class MuseumScene implements GameScene {
  readonly id = museum.id;
  readonly world = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.05, 40);
  private readonly resources = new Set<{ dispose(): void }>();
  private readonly lifetime = new AbortController();
  private readonly ray = new THREE.Raycaster();
  private readonly solids: THREE.Object3D[] = [];
  // Walking is simulated at 60 Hz on `position`; each drawn frame places the camera
  // between `previous` and `position` by the loop's alpha, so walking stays smooth at any refresh rate.
  private readonly position = new THREE.Vector2();
  private readonly previous = new THREE.Vector2();
  private pitch = 0;
  // Distance walked toward the next footstep; starts part-way so the first step comes soon after setting off.
  private stride = STRIDE * 0.6;
  private yaw: number;
  private pointerStart: { x: number; y: number; moved: boolean; id: number } | null = null;
  private readonly cursor = new THREE.Vector2();
  private lastPrompt = '';
  private masterpieceTexture: THREE.Texture | null = null;
  // Locked side paintings, greyed out by artwork ID; the colour fades back in when one opens.
  private readonly locks = new Map<string, PaintingLock>();
  private sketchCanvas: HTMLCanvasElement | null = null;
  private sketchTexture: THREE.Texture | null = null;
  private drawSketchPlaque: ((line: string) => void) | null = null;
  private drawMasterpiecePlaque: ((line: string) => void) | null = null;
  private sketchUnlocked = false;
  private supperUnlocked = false;
  private art: MuseumArtState;
  // Restoration ambience: the room warms and the masterpiece is lit a little more with each restored piece.
  private readonly hemi: THREE.HemisphereLight;
  private readonly lamp: THREE.PointLight;
  private readonly spot: THREE.SpotLight;
  private readonly halo: THREE.MeshBasicMaterial;
  private readonly motes: THREE.Points;
  private readonly moteSpeeds: Float32Array;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private glow = -1;
  // Picture lamps by artwork ID: lit while that frame can be entered.
  private readonly lamps = new Map<string, PictureLamp>();
  // The shimmer on each frame; only the next one to visit is lit.
  private readonly shimmers = new Map<string, { mesh: THREE.Mesh; shimmer: Shimmer }>();
  private glowTarget = 0;
  private lastSeconds = 0;

  constructor(private readonly canvas: HTMLCanvasElement, pose: MuseumPose, art: MuseumArtState,
    private readonly enabled: () => boolean, private readonly activate: (id: string) => void,
    private readonly prompt: (text: string) => void, private readonly artImages: Partial<Record<ArtId, HTMLImageElement>>,
    private readonly step: (surface: StepSurface) => void = () => {}) {
    this.art = { ...art };
    this.yaw = pose.yaw;
    this.position.set(pose.x, pose.z); this.previous.copy(this.position);
    this.camera.position.set(pose.x, museum.eyeHeight, pose.z);
    this.camera.rotation.order = 'YXZ';
    this.world.background = new THREE.Color(0x291c24);
    this.hemi = new THREE.HemisphereLight(0xffdfac, 0x393440, 2.1); this.world.add(this.hemi);
    this.lamp = new THREE.PointLight(0xffd8a0, 38, 15); this.lamp.position.set(0, 3.5, -3); this.world.add(this.lamp);
    const centrepiece = museum.artworks.find(a => a.id === 'masterpiece')!;
    this.spot = new THREE.SpotLight(0xffd59a, 0, 12, 0.55, 0.65, 1.2);
    this.spot.position.set(centrepiece.x, museum.height - 0.25, centrepiece.z + 3.4);
    this.spot.target.position.set(centrepiece.x, centrepiece.y, centrepiece.z);
    this.world.add(this.spot, this.spot.target);
    // A warm halo on the wall behind the masterpiece's frame.
    const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 256;
    const hctx = haloCanvas.getContext('2d')!;
    const gradient = hctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255,214,140,0.9)'); gradient.addColorStop(0.45, 'rgba(255,190,110,0.35)'); gradient.addColorStop(1, 'rgba(255,180,100,0)');
    hctx.fillStyle = gradient; hctx.fillRect(0, 0, 256, 256);
    const haloTexture = new THREE.CanvasTexture(haloCanvas); haloTexture.colorSpace = THREE.SRGBColorSpace;
    const haloGeometry = new THREE.PlaneGeometry(centrepiece.width * 2, centrepiece.height * 2.2);
    this.halo = new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.resources.add(haloTexture); this.resources.add(haloGeometry); this.resources.add(this.halo);
    const halo = new THREE.Mesh(haloGeometry, this.halo); halo.position.set(centrepiece.x, centrepiece.y, centrepiece.z - 0.065); this.world.add(halo);
    // Gold motes drift up in front of the complete masterpiece.
    const count = 80; const positions = new Float32Array(count * 3); this.moteSpeeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = centrepiece.x + (Math.random() - 0.5) * centrepiece.width * 1.6;
      positions[i * 3 + 1] = 0.3 + Math.random() * 3.6;
      positions[i * 3 + 2] = centrepiece.z + 0.4 + Math.random() * 2.6;
      this.moteSpeeds[i] = 0.08 + Math.random() * 0.16;
    }
    const moteGeometry = new THREE.BufferGeometry(); moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Each mote is a soft round glow, not a square point.
    const dot = document.createElement('canvas'); dot.width = dot.height = 32;
    const dctx = dot.getContext('2d')!; const soft = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    soft.addColorStop(0, 'rgba(255,255,255,1)'); soft.addColorStop(0.4, 'rgba(255,240,200,0.6)'); soft.addColorStop(1, 'rgba(255,230,180,0)');
    dctx.fillStyle = soft; dctx.fillRect(0, 0, 32, 32);
    const dotTexture = new THREE.CanvasTexture(dot);
    const moteMaterial = new THREE.PointsMaterial({ color: 0xffe0a0, map: dotTexture, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.resources.add(moteGeometry); this.resources.add(moteMaterial); this.resources.add(dotTexture);
    this.motes = new THREE.Points(moteGeometry, moteMaterial); this.motes.visible = false; this.world.add(this.motes);
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, solid = false, map?: THREE.Texture) => {
      const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, map: map ?? null });
      this.resources.add(g); this.resources.add(m); const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); this.world.add(mesh);
      if (solid) this.solids.push(mesh); return mesh;
    };
    const { width, depth, height, wallThickness } = museum;
    box(width, 0.2, depth, 0, -0.1, 0, 0xffffff, false, floorPlanks(this.resources, width / FLOOR_TILE));
    // Red velvet runner from the entrance to the masterpiece, fringed at both ends.
    const runner = RUNNER;
    box(runner.width, 0.012, runner.length, 0, 0.015, 0, 0xffffff, false, runnerTexture(this.resources, runner.width, runner.length));
    const fringeMesh = runnerFringe(this.resources, runner.width);
    for (const end of [1, -1]) {
      const fringe = end > 0 ? fringeMesh : fringeMesh.clone(); fringe.position.set(0, 0.004, end * (runner.length / 2 + 0.045));
      if (end < 0) fringe.rotation.y = Math.PI; this.world.add(fringe);
    }
    const paper = wallpaper(this.resources);
    box(width + wallThickness, height, wallThickness, 0, height / 2, -depth / 2, 0x562b36, true, paper);
    box(width + wallThickness, height, wallThickness, 0, height / 2, depth / 2, 0x562b36, true, paper);
    box(wallThickness, height, depth, -width / 2, height / 2, 0, 0x482531, true, paper);
    box(wallThickness, height, depth, width / 2, height / 2, 0, 0x482531, true, paper);
    box(width, 0.15, depth, 0, height, 0, 0x302b2e);
    const gold = gildedMaterials(this.resources);
    const lampKit = lampParts(this.resources);
    for (const art of museum.artworks) {
      // Each frame hangs in its own group, turned to face into the room.
      const frame = new THREE.Group(); frame.position.set(art.x, art.y, art.z); frame.rotation.y = art.facing; this.world.add(frame);
      // The Sketch frame shows the generated garage painting (light peeking
      // out of the toolbox, or the shut toolbox once taken) when it is loaded.
      const painted = art.id === 'unfinished-sketch' && this.sketchPainting(this.art.lightTaken);
      const image: HTMLImageElement | HTMLCanvasElement = art.id === 'unfinished-sketch'
        ? painted || sketchPlaceholder(document.createElement('canvas'), !this.art.lightTaken)
        : artImages[art.id === 'masterpiece' ? masterpieceStageArt(this.art.restored) : 'royal-supper.entrance']!;
      const paintedHeight = Math.min(art.height, art.width * image.height / image.width);
      const g = new THREE.PlaneGeometry(art.width, paintedHeight);
      const border = art.id === 'masterpiece' ? 0.26 : 0.2;
      frame.add(gildedFrame(art.width, paintedHeight, border, gold, this.resources));
      const { group: lampGroup, lamp } = pictureLamp(art.width, paintedHeight, border, lampKit, this.resources);
      frame.add(lampGroup); this.lamps.set(art.id, lamp);
      const glint = frameShimmer(art.width, paintedHeight, border, this.reducedMotion, this.resources);
      frame.add(glint.mesh); this.shimmers.set(art.id, glint);
      const texture = art.id === 'unfinished-sketch' && !painted ? new THREE.CanvasTexture(image) : new THREE.Texture(image); texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      if (art.id === 'masterpiece') this.masterpieceTexture = texture;
      const m = new THREE.MeshBasicMaterial({ map: texture });
      if (art.id !== 'masterpiece') this.locks.set(art.id, paintingLock(m));
      if (art.id === 'unfinished-sketch') { this.sketchCanvas = painted ? null : image as HTMLCanvasElement; this.sketchTexture = texture; }
      this.resources.add(g); this.resources.add(m); this.resources.add(texture);
      const mesh = new THREE.Mesh(g, m); mesh.position.set(0, 0, 0.04); mesh.userData.artworkId = art.id;
      frame.add(mesh); this.solids.push(mesh);
      const label = document.createElement('canvas'); label.width = 768; label.height = 96;
      const t = new THREE.CanvasTexture(label); t.colorSpace = THREE.SRGBColorSpace;
      const lg = new THREE.PlaneGeometry(art.width, 0.35); const lm = new THREE.MeshBasicMaterial({ map: t });
      this.resources.add(t); this.resources.add(lg); this.resources.add(lm);
      const plaque = new THREE.Mesh(lg, lm); plaque.position.set(0, Math.min(-paintedHeight / 2 - border - 0.26, DADO.bottom - 0.2 - art.y), 0.06); frame.add(plaque);
      const drawPlaque = (line: string) => {
        const ctx = label.getContext('2d')!; ctx.fillStyle = '#34252a'; ctx.fillRect(0, 0, 768, 96); ctx.fillStyle = '#e5cd9e'; ctx.textAlign = 'center';
        ctx.font = '30px Georgia'; ctx.fillText(art.label, 384, 41); ctx.font = '18px sans-serif'; ctx.fillText(line, 384, 74); t.needsUpdate = true;
      };
      if (art.id === 'unfinished-sketch') this.drawSketchPlaque = drawPlaque;
      else if (art.id === 'masterpiece') this.drawMasterpiecePlaque = drawPlaque;
      else drawPlaque('The king has borrowed the golden pear');
    }
    this.world.add(wainscot(this.resources, gold));
    this.applyArt();
  }
  /** The garage painting for the light's state, or null to draw the placeholder. */
  private sketchPainting(lightTaken: boolean): HTMLImageElement | null {
    return this.artImages[lightTaken ? 'sketch.entrance-empty' : 'sketch.entrance'] ?? null;
  }
  /** The Sketch frame opens once the pear is restored; while locked it is dimmed and never enters. */
  get sketchOpen(): boolean { return this.sketchUnlocked; }
  /** Royal Supper opens once the masterpiece has been opened. */
  get supperOpen(): boolean { return this.supperUnlocked; }
  /** The artwork whose frame shimmers (the one to visit next), or null. */
  get nextFrame(): string | null { return this.art.next; }
  get restoredCount(): number { return this.art.restored; }
  private applyArt(): void {
    const { restored, lightTaken, opened } = this.art;
    this.glowTarget = Math.min(restored, 2) / 2;
    // The room opens at its current state; a restore during play eases in.
    if (this.glow < 0 || this.reducedMotion) this.applyGlow(this.glowTarget);
    this.motes.visible = restored >= 2;
    this.sketchUnlocked = restored >= 1;
    this.supperUnlocked = opened;
    // Only the masterpiece is lit until it has been opened; then both side frames light (the Sketch stays locked until the pear).
    for (const [id, lamp] of this.lamps) {
      lamp.target = id === 'masterpiece' || opened ? 1 : 0;
      // A lamp opens at its current state; one switched on during play fades up.
      if (lamp.level < 0 || this.reducedMotion) setLampLevel(lamp, lamp.target);
    }
    for (const [id, { mesh, shimmer }] of this.shimmers) {
      shimmer.target = id === this.art.next ? 1 : 0;
      if (shimmer.level < 0 || this.reducedMotion) setShimmerLevel(shimmer, shimmer.target);
      mesh.visible = shimmer.level > 0;
    }
    for (const [id, lock] of this.locks) {
      lock.target = (id === 'royal-supper' ? this.supperUnlocked : this.sketchUnlocked) ? 0 : 1;
      if (lock.level < 0 || this.reducedMotion) setLockLevel(lock, lock.target);
    }
    this.drawSketchPlaque?.(!this.sketchUnlocked ? 'Restore the golden pear first' : restored >= 2 ? 'Its light now rises over the garden'
      : lightTaken ? 'Its enchanted light is yours' : 'An enchanted light waits inside');
    this.drawMasterpiecePlaque?.(restored >= 2 ? 'The garden at dawn, restored' : 'A garden waiting for its colour');
  }
  /** S5C: show a new restored count (and the light's torch state) without rebuilding the room. */
  setRestored(art: MuseumArtState): void {
    if (this.masterpieceTexture && art.restored !== this.art.restored) {
      this.masterpieceTexture.image = this.artImages[masterpieceStageArt(art.restored)]!; this.masterpieceTexture.needsUpdate = true;
    }
    if (this.sketchTexture && art.lightTaken !== this.art.lightTaken) {
      const painted = this.sketchPainting(art.lightTaken);
      if (painted) this.sketchTexture.image = painted;
      else if (this.sketchCanvas) sketchPlaceholder(this.sketchCanvas, !art.lightTaken);
      this.sketchTexture.needsUpdate = true;
    }
    this.art = { ...art };
    this.applyArt();
  }
  enter(): void {
    const signal = this.lifetime.signal;
    this.canvas.addEventListener('pointerdown', e => {
      if (!this.enabled() || e.button !== 0) return;
      const r = this.canvas.getBoundingClientRect(); this.cursor.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      this.pointerStart = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
      if (document.pointerLockElement !== this.canvas) this.canvas.setPointerCapture(e.pointerId);
    }, { signal });
    this.canvas.addEventListener('pointermove', e => {
      const r = this.canvas.getBoundingClientRect(); this.cursor.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      if (!this.enabled()) { this.pointerStart = null; return; }
      const locked = document.pointerLockElement === this.canvas;
      if (!locked && !this.pointerStart) return;
      if (this.pointerStart && Math.hypot(e.clientX - this.pointerStart.x, e.clientY - this.pointerStart.y) > 4) this.pointerStart.moved = true;
      this.yaw -= e.movementX * museum.lookSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * museum.lookSensitivity, -1.1, 1.1);
    }, { signal });
    this.canvas.addEventListener('pointerup', e => {
      const start = this.pointerStart; this.pointerStart = null;
      if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      if (!this.enabled() || !start || start.moved) return;
      this.pick(document.pointerLockElement === this.canvas ? new THREE.Vector2() : this.cursor, true);
    }, { signal });
    this.canvas.addEventListener('pointercancel', () => { this.pointerStart = null; }, { signal });
    this.render();
  }
  requestLook(): void {
    if (!this.enabled()) return;
    try { const request = this.canvas.requestPointerLock(); request?.catch(() => this.prompt('Pointer lock unavailable. Drag the museum view to look.')); }
    catch { this.prompt('Drag the museum view to look.'); }
  }
  private pick(cursor: THREE.Vector2, activate = false): string {
    this.camera.updateMatrixWorld(); this.world.updateMatrixWorld(true);
    this.ray.setFromCamera(cursor, this.camera);
    const hit = this.ray.intersectObjects(this.solids, false)[0];
    const id = hit?.object.userData.artworkId as string | undefined;
    if (!id) return '';
    if (hit.distance > museum.interactionRange) return 'Walk closer to inspect this frame';
    // A locked frame never activates anything.
    if (id === 'unfinished-sketch' && !this.sketchUnlocked) return 'Restore the golden pear first';
    if (id === 'royal-supper' && !this.supperUnlocked) return 'Inspect the masterpiece first';
    if (activate) this.activate(id);
    return id === 'masterpiece' ? 'Click / E — Inspect the masterpiece' : id === 'unfinished-sketch' ? 'Click / E — Enter the Unfinished Sketch' : 'Click / E — Enter Royal Supper';
  }
  suspend(): void {
    if (this.pointerStart && this.canvas.hasPointerCapture(this.pointerStart.id)) this.canvas.releasePointerCapture(this.pointerStart.id);
    this.pointerStart = null;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
  fixedUpdate(dt: number, input: Controls): void {
    const forward = input.forward ?? 0; const length = Math.max(1, Math.hypot(input.axis, forward));
    this.previous.copy(this.position);
    this.position.x += (Math.cos(this.yaw) * input.axis - Math.sin(this.yaw) * forward) / length * museum.speed * dt;
    this.position.y += (-Math.sin(this.yaw) * input.axis - Math.cos(this.yaw) * forward) / length * museum.speed * dt;
    const margin = museum.radius + museum.wallThickness / 2;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -museum.width / 2 + margin, museum.width / 2 - margin);
    this.position.y = THREE.MathUtils.clamp(this.position.y, -museum.depth / 2 + margin, museum.depth / 2 - margin);
    // A footstep every stride actually walked (walking into a wall makes none): carpet on the runner, wood elsewhere.
    const moved = this.position.distanceTo(this.previous);
    if (moved > 1e-4) {
      this.stride += moved;
      if (this.stride >= STRIDE) {
        this.stride -= STRIDE;
        this.step(Math.abs(this.position.x) < RUNNER.width / 2 && Math.abs(this.position.y) < RUNNER.length / 2 ? 'carpet' : 'wood');
      }
    } else this.stride = STRIDE * 0.6;
    // Pick from the exact simulated position (alpha 1), not an interpolated one.
    this.render();
    const text = this.enabled() ? this.pick(new THREE.Vector2(), input.interactPressed) : '';
    if (text !== this.lastPrompt) { this.lastPrompt = text; this.prompt(text); }
  }
  render(alpha = 1, seconds = this.lastSeconds): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.position.set(THREE.MathUtils.lerp(this.previous.x, this.position.x, alpha), museum.eyeHeight,
      THREE.MathUtils.lerp(this.previous.y, this.position.y, alpha));
    const dt = Math.min(0.1, Math.max(0, seconds - this.lastSeconds)); this.lastSeconds = seconds;
    if (this.glow !== this.glowTarget) this.applyGlow(this.glow + Math.sign(this.glowTarget - this.glow) * Math.min(Math.abs(this.glowTarget - this.glow), dt / GLOW_SECONDS));
    for (const lamp of this.lamps.values()) {
      if (lamp.level !== lamp.target) setLampLevel(lamp, lamp.level + Math.sign(lamp.target - lamp.level) * Math.min(Math.abs(lamp.target - lamp.level), dt / LAMP_SECONDS));
    }
    for (const { mesh, shimmer } of this.shimmers.values()) {
      if (shimmer.level !== shimmer.target) setShimmerLevel(shimmer, shimmer.level + Math.sign(shimmer.target - shimmer.level) * Math.min(Math.abs(shimmer.target - shimmer.level), dt / SHIMMER_SECONDS));
      mesh.visible = shimmer.level > 0;
      if (mesh.visible && !this.reducedMotion) shimmer.material.uniforms.uTime.value = seconds;
    }
    for (const lock of this.locks.values()) {
      if (lock.level !== lock.target) setLockLevel(lock, lock.level + Math.sign(lock.target - lock.level) * Math.min(Math.abs(lock.target - lock.level), dt / LAMP_SECONDS));
    }
    if (this.motes.visible && !this.reducedMotion && dt > 0) {
      const positions = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) + this.moteSpeeds[i] * dt;
        if (y > 3.9) y = 0.3;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
  }
  /** 0 = damaged gallery, 0.5 = pear restored, 1 = complete: warmer, brighter, the masterpiece spotlit. */
  private applyGlow(level: number): void {
    this.glow = level;
    this.hemi.intensity = 2.1 + level * 0.7;
    this.lamp.intensity = 38 + level * 16;
    this.lamp.color.setHex(level >= 1 ? 0xffe2b0 : 0xffd8a0);
    this.spot.intensity = level * 60;
    this.halo.opacity = level * 0.75;
  }
  resize(width: number, height: number): void { this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix(); }
  exit(): void {
    this.lifetime.abort(); this.suspend();
  }
  dispose(): void { this.exit(); for (const r of this.resources) r.dispose(); this.resources.clear(); this.world.clear(); }
}

const GLOW_SECONDS = 2.4;
/** Metres walked per footstep (walking speed is 3.5 m/s, so about three steps a second). */
const STRIDE = 1.1;
/** The red runner from the entrance to the masterpiece, centred in the room. */
const RUNNER = { width: museum.width * 0.26, length: museum.depth * 0.88 } as const;

// Wainscot heights (m): the dado rail's top stays under the side frames' bottoms
// (about 0.85); the masterpiece hangs lower, so rail and panels stop around it.
const DADO = { bottom: 0.76, top: 0.82 } as const;
const SKIRTING = 0.16;
/** World size (m) of one floor texture tile. */
const FLOOR_TILE = 4;

/**
 * Wainscot on all four walls: a dark backing, raised panels, a dado rail with a
 * gilt bead and a skirting with a cap. Built from instanced unit boxes (one draw
 * call per material); decoration only, never solid or pickable.
 */
function wainscot(resources: Set<{ dispose(): void }>, gold: GildedMaterials): THREE.Group {
  const group = new THREE.Group();
  const inner = museum.width / 2 - museum.wallThickness / 2;
  const unit = new THREE.BoxGeometry(1, 1, 1); resources.add(unit);
  const material = (color: number, roughness: number) => { const m = new THREE.MeshStandardMaterial({ color, roughness }); resources.add(m); return m; };
  const backing = material(0x351c20, 0.8); const panel = material(0x55292b, 0.55); const rail = material(0x43231f, 0.5); const skirting = material(0x26141a, 0.7);
  const parts = new Map<THREE.Material, THREE.Matrix4[]>();
  // Each wall: origin on its inner face, turned like an artwork's `facing` (local +x along the wall, +z into the room).
  const walls = [
    { facing: 0, origin: new THREE.Vector3(0, 0, -inner) }, { facing: Math.PI, origin: new THREE.Vector3(0, 0, inner) },
    { facing: Math.PI / 2, origin: new THREE.Vector3(-inner, 0, 0) }, { facing: -Math.PI / 2, origin: new THREE.Vector3(inner, 0, 0) },
  ];
  const up = new THREE.Vector3(0, 1, 0);
  for (const wall of walls) {
    const turn = new THREE.Quaternion().setFromAxisAngle(up, wall.facing);
    const along = new THREE.Vector3(1, 0, 0).applyQuaternion(turn); const out = new THREE.Vector3(0, 0, 1).applyQuaternion(turn);
    const piece = (m: THREE.Material, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) => {
      const centre = wall.origin.clone().addScaledVector(along, (u0 + u1) / 2).addScaledVector(out, (d0 + d1) / 2).setY((y0 + y1) / 2);
      const list = parts.get(m) ?? []; parts.set(m, list);
      list.push(new THREE.Matrix4().compose(centre, turn, new THREE.Vector3(u1 - u0, y1 - y0, d1 - d0)));
    };
    // Frames on this wall whose bottom dips under the rail interrupt the rail and panels.
    const gaps = museum.artworks.filter(a => Math.abs(a.facing - wall.facing) < 1e-6 && a.y - a.height / 2 - 0.26 < DADO.top)
      .map(a => { const u = new THREE.Vector3(a.x, 0, a.z).sub(wall.origin).dot(along); return [u - a.width / 2 - 0.42, u + a.width / 2 + 0.42] as const; })
      .sort((a, b) => a[0] - b[0]);
    const segments: [number, number][] = []; let start = -inner;
    for (const [g0, g1] of gaps) { if (g0 > start) segments.push([start, g0]); start = Math.max(start, g1); }
    if (start < inner) segments.push([start, inner]);
    piece(backing, -inner, inner, 0, DADO.bottom, 0, 0.03);
    piece(skirting, -inner, inner, 0, SKIRTING, 0, 0.05);
    piece(skirting, -inner, inner, SKIRTING, SKIRTING + 0.025, 0, 0.038);
    // Cornice under the ceiling, with a gilt bead along its foot.
    const ceiling = museum.height - 0.075;
    piece(rail, -inner, inner, ceiling - 0.2, ceiling, 0, 0.1);
    piece(gold.bead, -inner, inner, ceiling - 0.22, ceiling - 0.19, 0.06, 0.11);
    for (const [u0, u1] of segments) {
      piece(rail, u0, u1, DADO.bottom, DADO.top, 0, 0.06);
      piece(gold.bead, u0, u1, DADO.top - 0.018, DADO.top + 0.008, 0.045, 0.068);
      // Raised panels between stiles, about 1.3 m each.
      const length = u1 - u0; const count = Math.max(1, Math.round(length / 1.3)); const stile = 0.14;
      const w = (length - stile * (count + 1)) / count;
      if (w < 0.3) continue;
      for (let i = 0; i < count; i++) {
        const p0 = u0 + stile + i * (w + stile);
        piece(panel, p0, p0 + w, SKIRTING + 0.11, DADO.bottom - 0.1, 0.03, 0.048);
      }
    }
  }
  for (const [m, list] of parts) {
    const mesh = new THREE.InstancedMesh(unit, m, list.length);
    list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    group.add(mesh);
  }
  return group;
}

/**
 * The runner's top face, drawn at its exact aspect so the border stays even: red
 * velvet with a soft pile, a faint diamond lattice, and a gold border band of small
 * diamonds between thin gold lines.
 */
function runnerTexture(resources: Set<{ dispose(): void }>, width: number, length: number): THREE.Texture {
  const ppm = 160; const w = Math.round(width * ppm); const h = Math.round(length * ppm);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7c2233'; ctx.fillRect(0, 0, w, h);
  // Pile: fine speckle in lighter and darker reds.
  let seed = 23; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < w * h / 18; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(40,6,14,0.16)' : 'rgba(170,70,80,0.12)';
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
  const m = (metres: number) => metres * ppm;
  const band = m(0.2); const edge = m(0.05);
  // Faint diamond lattice in the field.
  ctx.save(); ctx.beginPath(); ctx.rect(edge + band, edge + band, w - 2 * (edge + band), h - 2 * (edge + band)); ctx.clip();
  ctx.strokeStyle = 'rgba(214,160,90,0.13)'; ctx.lineWidth = 2;
  const cell = m(0.5);
  for (let d = -h; d < w + h; d += cell) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - h, h); ctx.stroke();
  }
  ctx.restore();
  // Border: a darker red ground with a gold band of diamonds, framed by thin gold lines.
  const ring = (inset: number, thickness: number, colour: string) => {
    ctx.strokeStyle = colour; ctx.lineWidth = thickness;
    ctx.strokeRect(inset + thickness / 2, inset + thickness / 2, w - 2 * inset - thickness, h - 2 * inset - thickness);
  };
  ring(0, edge, '#4a1420');
  ring(edge, band, '#5a1823');
  ring(edge + m(0.02), m(0.018), '#d9a94e');
  ring(edge + band - m(0.038), m(0.018), '#d9a94e');
  ctx.fillStyle = '#e2b45a';
  const mid = edge + band / 2; const r = m(0.045); const step = m(0.16);
  const diamond = (x: number, y: number) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.fill(); };
  for (let y = mid; y <= h - mid + 1; y += (h - 2 * mid) / Math.round((h - 2 * mid) / step)) { diamond(mid, y); diamond(w - mid, y); }
  for (let x = mid; x <= w - mid + 1; x += (w - 2 * mid) / Math.round((w - 2 * mid) / step)) { diamond(x, mid); diamond(x, h - mid); }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  resources.add(texture); return texture;
}

/** A short cream fringe for one end of the runner: threads on a transparent ground, drawn flat on the floor. */
function runnerFringe(resources: Set<{ dispose(): void }>, width: number): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = 512; c.height = 24;
  const ctx = c.getContext('2d')!; ctx.strokeStyle = '#eadbb8'; ctx.lineWidth = 2.2;
  let seed = 5; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = 3; x < 512; x += 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rand() * 3 - 1.5, 16 + rand() * 7); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(width * 0.96, 0.09); geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.4, roughness: 0.9 });
  resources.add(texture); resources.add(geometry); resources.add(material);
  return new THREE.Mesh(geometry, material);
}

/** Floor planks for one FLOOR_TILE square (boards run front to back): varied tones, staggered joints, grain and dark gaps; wraps seamlessly. */
function floorPlanks(resources: Set<{ dispose(): void }>, repeat: number): THREE.Texture {
  const size = 1024; const planks = 16; const pw = size / planks;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  let seed = 11; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tones = ['#6b4f3e', '#705443', '#674c3c', '#745745', '#6a4e3d', '#634939'];
  for (let i = 0; i < planks; i++) {
    const x = i * pw;
    // One column of boards spanning exactly one tile from a random start, drawn twice so it wraps without a seam row.
    const column = document.createElement('canvas'); column.width = pw; column.height = size;
    const cc = column.getContext('2d')!;
    const start = -rand() * size * 0.6; let y = start;
    while (y < start + size) {
      let length = size * (0.3 + rand() * 0.35);
      if (start + size - (y + length) < size * 0.2) length = start + size - y;
      const tone = tones[Math.floor(rand() * tones.length)];
      const grain = Array.from({ length: 7 }, () => [rand() < 0.5, 0.08 + rand() * 0.1, 1 + rand() * 1.5, 4 + rand() * (pw - 8), rand() * 6 - 3, rand() * 6 - 3] as const);
      for (const shift of [0, size]) {
        const top = y + shift;
        cc.fillStyle = tone; cc.fillRect(0, top, pw, length);
        for (const [dark, alpha, lineWidth, gx, b1, b2] of grain) {
          cc.strokeStyle = `rgba(${dark ? '40,25,15' : '150,115,85'},${alpha})`; cc.lineWidth = lineWidth;
          cc.beginPath(); cc.moveTo(gx, top); cc.bezierCurveTo(gx + b1, top + length / 3, gx + b2, top + length * 2 / 3, gx, top + length); cc.stroke();
        }
        cc.fillStyle = '#2c201a'; cc.fillRect(0, top + length - 3, pw, 3);
      }
      y += length;
    }
    cc.fillStyle = '#2c201a'; cc.fillRect(0, 0, 3, size);
    ctx.drawImage(column, x, 0);
  }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = 8;
  resources.add(texture); return texture;
}

/** Faint wallpaper for the upper walls: soft stripes with small diamonds, tinted by the wall colour. */
function wallpaper(resources: Set<{ dispose(): void }>): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, 40, 128);
  ctx.fillStyle = 'rgba(255,225,170,0.10)';
  for (const [x, y] of [[84, 32], [84, 96]]) { ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.fill(); }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(24, 8);
  resources.add(texture); return texture;
}

/** The glint on the frame to visit next; `level` 0..1 eases toward `target`. */
interface Shimmer { material: THREE.ShaderMaterial; level: number; target: number }
const SHIMMER_SECONDS = 0.8;

/**
 * An additive overlay on a frame's gilding (a flat ring from the canvas edge to the
 * outer lip, just in front of the moulding): a faint warm pulse and a diagonal glint
 * that sweeps across every few seconds. With reduced motion it is a still, soft glow.
 * Decoration only, never pickable.
 */
function frameShimmer(w: number, h: number, border: number, reducedMotion: boolean, resources: Set<{ dispose(): void }>): { mesh: THREE.Mesh; shimmer: Shimmer } {
  const ow = w / 2 + border + 0.035; const oh = h / 2 + border + 0.035;
  const shape = new THREE.Shape();
  shape.moveTo(-ow, -oh); shape.lineTo(ow, -oh); shape.lineTo(ow, oh); shape.lineTo(-ow, oh); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(-w / 2, -h / 2); hole.lineTo(-w / 2, h / 2); hole.lineTo(w / 2, h / 2); hole.lineTo(w / 2, -h / 2); hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uMotion: { value: reducedMotion ? 0 : 1 }, uHalf: { value: new THREE.Vector2(ow, oh) } },
    vertexShader: 'varying vec2 vPos; void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uTime; uniform float uStrength; uniform float uMotion; uniform vec2 uHalf; varying vec2 vPos;
      void main() {
        // Diagonal coordinate across the frame, about -1.6 (bottom left) to 1.6 (top right).
        float diag = vPos.x / uHalf.x + vPos.y / uHalf.y * 0.6;
        // Every 3.5 s a glint crosses in 1.4 s, then rests off the frame.
        float sweep = -2.2 + mod(uTime, 3.5) / 1.4 * 4.4;
        float band = exp(-pow((diag - sweep) * 6.0, 2.0)) * uMotion;
        float pulse = mix(0.14, 0.07 + 0.05 * sin(uTime * 2.2), uMotion);
        gl_FragColor = vec4(vec3(1.0, 0.84, 0.52) * (band * 1.1 + pulse) * uStrength, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  resources.add(geometry); resources.add(material);
  const mesh = new THREE.Mesh(geometry, material); mesh.position.z = 0.115;
  return { mesh, shimmer: { material, level: -1, target: 0 } };
}
function setShimmerLevel(shimmer: Shimmer, level: number): void {
  shimmer.level = level; shimmer.material.uniforms.uStrength.value = level;
}

/** A side painting's locked look: `level` 1 is fully greyed and darkened, 0 its own colours. */
interface PaintingLock { material: THREE.MeshBasicMaterial; grey: { value: number }; level: number; target: number }
const LOCKED_TINT = new THREE.Color(0x4a4a4e);
const UNLOCKED_TINT = new THREE.Color(0xffffff);
function paintingLock(material: THREE.MeshBasicMaterial): PaintingLock {
  const grey = { value: 0 };
  // Mix the painting toward its luminance after the map is sampled.
  material.onBeforeCompile = shader => {
    shader.uniforms.uGrey = grey;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGrey;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), uGrey);');
  };
  material.customProgramCacheKey = () => 'museum-painting-lock';
  return { material, grey, level: -1, target: 0 };
}
function setLockLevel(lock: PaintingLock, level: number): void {
  lock.level = level; lock.grey.value = level;
  lock.material.color.lerpColors(UNLOCKED_TINT, LOCKED_TINT, level);
}

/** A brass picture lamp; `level` 0..1 eases toward `target` (lit while its frame can be entered). */
interface PictureLamp { bulb: THREE.MeshBasicMaterial; wash: THREE.MeshBasicMaterial; glow: THREE.MeshBasicMaterial; level: number; target: number }
const LAMP_SECONDS = 0.8;
const LAMP_WASH = 0.4;
const LAMP_GLOW = 0.7;
const BULB_OFF = new THREE.Color(0x4a3a22);
const BULB_ON = new THREE.Color(0xffe9b8);

interface LampParts { brass: THREE.MeshStandardMaterial; washTexture: THREE.Texture; glowTexture: THREE.Texture }
function lampParts(resources: Set<{ dispose(): void }>): LampParts {
  const brass = new THREE.MeshStandardMaterial({ color: 0xbf8f3e, metalness: 0.55, roughness: 0.35, side: THREE.DoubleSide });
  // The wash: warm light strongest under the hood, fading down and toward the sides.
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, -30, 8, 128, -30, 290);
  g.addColorStop(0, 'rgba(255,228,172,1)'); g.addColorStop(0.45, 'rgba(255,212,150,0.38)'); g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const washTexture = new THREE.CanvasTexture(c); washTexture.colorSpace = THREE.SRGBColorSpace;
  // The glow round the bulb: a soft horizontal ellipse.
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 64;
  const gctx = gc.getContext('2d')!; gctx.scale(1, 0.25);
  const gg = gctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  gg.addColorStop(0, 'rgba(255,236,190,1)'); gg.addColorStop(0.35, 'rgba(255,214,150,0.4)'); gg.addColorStop(1, 'rgba(255,200,140,0)');
  gctx.fillStyle = gg; gctx.fillRect(0, 0, 256, 256);
  const glowTexture = new THREE.CanvasTexture(gc); glowTexture.colorSpace = THREE.SRGBColorSpace;
  resources.add(brass); resources.add(washTexture); resources.add(glowTexture);
  return { brass, washTexture, glowTexture };
}

/**
 * A brass picture lamp above a w × h painting with the given frame border, in the
 * frame's local space (+z into the room): wall plate, curved arm, a half-round hood
 * tilted toward the painting with a bulb strip inside, and an additive wash over
 * the painting's upper part. Decoration only, never pickable.
 */
function pictureLamp(w: number, h: number, border: number, parts: LampParts, resources: Set<{ dispose(): void }>): { group: THREE.Group; lamp: PictureLamp } {
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => { resources.add(geometry); const mesh = new THREE.Mesh(geometry, material); group.add(mesh); return mesh; };
  const top = h / 2 + border + 0.055;
  const length = Math.min(w * 0.6, 1.8); const radius = 0.06; const hood = new THREE.Vector3(0, top + 0.15, 0.3);
  add(new THREE.BoxGeometry(0.16, 0.1, 0.03), parts.brass).position.set(0, top + 0.22, -0.065);
  const arm = new THREE.CubicBezierCurve3(new THREE.Vector3(0, top + 0.22, -0.05), new THREE.Vector3(0, top + 0.4, 0),
    new THREE.Vector3(0, top + 0.32, hood.z - 0.02), new THREE.Vector3(0, hood.y + radius * 0.6, hood.z));
  add(new THREE.TubeGeometry(arm, 16, 0.014, 6), parts.brass);
  // Half-round hood along x, its opening turned down and toward the wall.
  const shell = new THREE.CylinderGeometry(radius, radius, length, 18, 1, true, 0, Math.PI); shell.rotateZ(Math.PI / 2); shell.rotateX(0.6);
  add(shell, parts.brass).position.copy(hood);
  const cap = new THREE.CylinderGeometry(radius + 0.006, radius + 0.006, 0.012, 18); cap.rotateZ(Math.PI / 2); resources.add(cap);
  for (const side of [-1, 1]) { const mesh = new THREE.Mesh(cap, parts.brass); mesh.position.set(hood.x + side * length / 2, hood.y, hood.z); group.add(mesh); }
  const bulb = new THREE.MeshBasicMaterial({ color: BULB_OFF.clone() }); resources.add(bulb);
  const strip = new THREE.CylinderGeometry(0.016, 0.016, length * 0.94, 8); strip.rotateZ(Math.PI / 2);
  add(strip, bulb).position.set(hood.x, hood.y - 0.018, hood.z - 0.014);
  const washHeight = (h + border * 2) * 0.75;
  const wash = new THREE.MeshBasicMaterial({ map: parts.washTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  resources.add(wash);
  const washMesh = add(new THREE.PlaneGeometry(w + border * 2, washHeight), wash); washMesh.position.set(0, top - 0.055 - washHeight / 2, 0.12);
  const glow = new THREE.MeshBasicMaterial({ map: parts.glowTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  resources.add(glow);
  add(new THREE.PlaneGeometry(length * 1.5, 0.4), glow).position.set(hood.x, hood.y - 0.03, hood.z - 0.1);
  return { group, lamp: { bulb, wash, glow, level: -1, target: 0 } };
}

function setLampLevel(lamp: PictureLamp, level: number): void {
  lamp.level = level;
  lamp.bulb.color.lerpColors(BULB_OFF, BULB_ON, level);
  lamp.wash.opacity = level * LAMP_WASH;
  lamp.glow.opacity = level * LAMP_GLOW;
}

interface GildedMaterials { moulding: THREE.MeshStandardMaterial; bead: THREE.MeshStandardMaterial; lip: THREE.MeshStandardMaterial; sight: THREE.MeshStandardMaterial }
function gildedMaterials(resources: Set<{ dispose(): void }>): GildedMaterials {
  // Aged gilding: warm gold mottled with darker patina, tiled in world units by the extrusion's UVs.
  const patina = document.createElement('canvas'); patina.width = patina.height = 128;
  const pctx = patina.getContext('2d')!; pctx.fillStyle = '#ffffff'; pctx.fillRect(0, 0, 128, 128);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) {
    const x = rand() * 128; const y = rand() * 128; const r = 8 + rand() * 18;
    for (const [dx, dy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
      const g = pctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, `rgba(120,80,40,${0.05 + rand() * 0.07})`); g.addColorStop(1, 'rgba(120,80,40,0)');
      pctx.fillStyle = g; pctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }
  const patinaTexture = new THREE.CanvasTexture(patina); patinaTexture.colorSpace = THREE.SRGBColorSpace;
  patinaTexture.wrapS = patinaTexture.wrapT = THREE.RepeatWrapping; patinaTexture.repeat.set(2.2, 2.2);
  // Beading: a grid of round bumps, so the inner bead reads as carved under the lamps.
  const beads = document.createElement('canvas'); beads.width = beads.height = 32;
  const bctx = beads.getContext('2d')!; bctx.fillStyle = '#000'; bctx.fillRect(0, 0, 32, 32);
  const bump = bctx.createRadialGradient(16, 16, 0, 16, 16, 12); bump.addColorStop(0, '#fff'); bump.addColorStop(1, '#000');
  bctx.fillStyle = bump; bctx.fillRect(0, 0, 32, 32);
  const beadTexture = new THREE.CanvasTexture(beads); beadTexture.wrapS = beadTexture.wrapT = THREE.RepeatWrapping; beadTexture.repeat.set(26, 26);
  resources.add(patinaTexture); resources.add(beadTexture);
  const moulding = new THREE.MeshStandardMaterial({ color: 0xd2a24c, map: patinaTexture, metalness: 0.45, roughness: 0.42 });
  const bead = new THREE.MeshStandardMaterial({ color: 0xf0cd7a, metalness: 0.35, roughness: 0.3, emissive: 0x2a1a06, bumpMap: beadTexture, bumpScale: 1.6 });
  const lip = new THREE.MeshStandardMaterial({ color: 0x7a5426, map: patinaTexture, metalness: 0.4, roughness: 0.55 });
  const sight = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
  resources.add(moulding); resources.add(bead); resources.add(lip); resources.add(sight);
  return { moulding, bead, lip, sight };
}

/** A rectangular ring of the given outer size and border, extruded with rounded bevels so it reads as a moulding. */
function frameRing(outerW: number, outerH: number, border: number, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-outerW / 2, -outerH / 2); shape.lineTo(outerW / 2, -outerH / 2); shape.lineTo(outerW / 2, outerH / 2); shape.lineTo(-outerW / 2, outerH / 2); shape.closePath();
  const iw = outerW / 2 - border; const ih = outerH / 2 - border;
  const hole = new THREE.Path(); hole.moveTo(-iw, -ih); hole.lineTo(-iw, ih); hole.lineTo(iw, ih); hole.lineTo(iw, -ih); hole.closePath();
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 1 });
}

/**
 * A gilded frame around a w × h painting (painting plane at z 0.04): a broad
 * bevelled moulding, a bright inner bead that slightly overlaps the canvas
 * edge, a dark sight edge and four corner bosses. Decoration only: never in
 * the raycast solids, so it cannot block picking a painting.
 */
function gildedFrame(w: number, h: number, border: number, gold: GildedMaterials, resources: Set<{ dispose(): void }>): THREE.Group {
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, z: number) => {
    resources.add(geometry); const mesh = new THREE.Mesh(geometry, material); mesh.position.z = z; group.add(mesh); return mesh;
  };
  // Antique outer lip against the wall, a step behind the moulding.
  add(frameRing(w + border * 2 + 0.07, h + border * 2 + 0.07, 0.07, 0.04, 0.02), gold.lip, -0.07);
  // Broad outer moulding: back at the wall, front well proud of the canvas.
  add(frameRing(w + border * 2, h + border * 2, border * 0.82, 0.07, 0.035), gold.moulding, -0.05);
  // Dark sight edge just inside the moulding, so the canvas sits in a recess.
  add(frameRing(w + 0.05, h + 0.05, 0.045, 0.02, 0.008), gold.sight, 0.035);
  // Raised bright bead between moulding and canvas.
  const bw = border * 0.3;
  add(frameRing(w + bw * 2 + 0.03, h + bw * 2 + 0.03, bw, 0.03, 0.018), gold.bead, 0.05);
  // Corner bosses on the moulding, in the bead's gilding.
  const boss = new THREE.SphereGeometry(border * 0.3, 14, 8); boss.scale(1, 1, 0.55); resources.add(boss);
  const cx = w / 2 + border * 0.55; const cy = h / 2 + border * 0.55;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const mesh = new THREE.Mesh(boss, gold.bead); mesh.position.set(sx * cx, sy * cy, 0.06); group.add(mesh);
  }
  return group;
}

/**
 * Cartoon placeholder for the Sketch frame, drawn in code until the art task
 * delivers `sketch.entrance`: a cream page with three pencilled layers, a
 * pendulum, a lift and a torch holding a pale glow (an empty torch once the
 * light is taken). Faceless, no generated art.
 */
function sketchPlaceholder(c: HTMLCanvasElement, lit: boolean): HTMLCanvasElement {
  c.width = 840; c.height = 540;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f3e9d2'; ctx.fillRect(0, 0, 840, 540);
  ctx.strokeStyle = '#d9cbb0'; ctx.lineWidth = 1;
  for (let y = 30; y < 540; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(840, y); ctx.stroke(); }
  const ink = '#3b3350';
  const board = (x: number, y: number, w: number, dashed = false) => {
    ctx.setLineDash(dashed ? [10, 8] : []); ctx.fillStyle = '#c98f5a';
    ctx.beginPath(); ctx.roundRect(x, y, w, 22, 8); if (!dashed) ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = ink; ctx.stroke(); ctx.setLineDash([]);
  };
  // Three stacked layers, some boards still unfinished outlines.
  board(40, 470, 330); board(470, 470, 300);
  board(120, 330, 220); board(420, 330, 160, true); board(640, 330, 130);
  board(60, 190, 180, true); board(300, 190, 160); board(560, 150, 210);
  // A pendulum on Layer 1.
  ctx.lineWidth = 4; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(420, 380); ctx.lineTo(395, 440); ctx.stroke();
  ctx.fillStyle = '#e0b16e'; ctx.beginPath(); ctx.roundRect(350, 438, 90, 16, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9c9aa6'; ctx.beginPath(); ctx.arc(420, 380, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // A lift shaft up the right side.
  ctx.setLineDash([6, 8]); ctx.lineWidth = 3; ctx.strokeRect(795, 180, 30, 290); ctx.setLineDash([]);
  ctx.fillStyle = '#7fb6c9'; ctx.fillRect(793, 300, 34, 14); ctx.strokeRect(793, 300, 34, 14);
  // The torch and its enchanted light on the top ledge.
  ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.roundRect(705, 88, 14, 62, 4); ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#b07a4c'; ctx.beginPath(); ctx.moveTo(692, 80); ctx.lineTo(732, 80); ctx.lineTo(722, 96); ctx.lineTo(702, 96); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (lit) {
    const glow = ctx.createRadialGradient(712, 62, 4, 712, 62, 62);
    glow.addColorStop(0, 'rgba(255,255,236,1)'); glow.addColorStop(0.35, 'rgba(176,236,255,0.75)'); glow.addColorStop(1, 'rgba(176,236,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(712, 62, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(712, 62, 15, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6fb7d6'; ctx.stroke();
  } else {
    // The light has gone: a pencilled wisp above an empty torch cup.
    ctx.strokeStyle = '#8b8296'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(712, 76); ctx.bezierCurveTo(700, 62, 724, 52, 712, 36); ctx.stroke(); ctx.setLineDash([]);
  }
  // Loose pencil scribbles: the picture is not finished.
  ctx.strokeStyle = '#8b8296'; ctx.lineWidth = 2;
  for (const [x, y] of [[90, 120], [250, 70], [470, 95], [580, 250]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 30, y - 20, x + 60, y + 20, x + 90, y); ctx.stroke();
  }
  return c;
}
