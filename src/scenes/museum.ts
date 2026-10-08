import * as THREE from 'three';
import type { GameScene } from '../core/scenes';
import type { Controls } from '../gameplay/controller';
import { museum, type MuseumPose } from '../levels/museum';
import type { ArtId } from '../assets/manifest';
import { masterpieceStageArt } from '../ui/masterpiece';

/** What the museum shows of the campaign: restored pieces (0-2) and whether the Sketch's light has left its torch. */
export interface MuseumArtState { restored: number; lightTaken: boolean }

export class MuseumScene implements GameScene {
  readonly id = museum.id;
  readonly world = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.05, 40);
  private readonly resources = new Set<{ dispose(): void }>();
  private readonly lifetime = new AbortController();
  private readonly ray = new THREE.Raycaster();
  private readonly solids: THREE.Object3D[] = [];
  private pitch = 0;
  private yaw: number;
  private pointerStart: { x: number; y: number; moved: boolean; id: number } | null = null;
  private readonly cursor = new THREE.Vector2();
  private lastPrompt = '';
  private masterpieceTexture: THREE.Texture | null = null;
  private sketchMaterial: THREE.MeshBasicMaterial | null = null;
  private sketchCanvas: HTMLCanvasElement | null = null;
  private sketchTexture: THREE.Texture | null = null;
  private drawSketchPlaque: ((line: string) => void) | null = null;
  private drawMasterpiecePlaque: ((line: string) => void) | null = null;
  private sketchUnlocked = false;
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
  private glowTarget = 0;
  private lastSeconds = 0;

  constructor(private readonly canvas: HTMLCanvasElement, pose: MuseumPose, art: MuseumArtState,
    private readonly enabled: () => boolean, private readonly activate: (id: string) => void,
    private readonly prompt: (text: string) => void, private readonly artImages: Partial<Record<ArtId, HTMLImageElement>>) {
    this.art = { ...art };
    this.yaw = pose.yaw;
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
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: number, solid = false) => {
      const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      this.resources.add(g); this.resources.add(m); const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); this.world.add(mesh);
      if (solid) this.solids.push(mesh); return mesh;
    };
    const { width, depth, height, wallThickness } = museum;
    box(width, 0.2, depth, 0, -0.1, 0, 0x685040);
    for (let x = -width / 2 + 0.5; x < width / 2; x += 1) box(0.025, 0.005, depth, x, 0.004, 0, 0x332d2a);
    box(width * 0.26, 0.012, depth * 0.88, 0, 0.015, 0, 0x7a2c39);
    box(width + wallThickness, height, wallThickness, 0, height / 2, -depth / 2, 0x562b36, true);
    box(width + wallThickness, height, wallThickness, 0, height / 2, depth / 2, 0x562b36, true);
    box(wallThickness, height, depth, -width / 2, height / 2, 0, 0x482531, true);
    box(wallThickness, height, depth, width / 2, height / 2, 0, 0x482531, true);
    box(width, 0.15, depth, 0, height, 0, 0x302b2e);
    for (const art of museum.artworks) {
      // Each frame hangs in its own group, turned to face into the room.
      const frame = new THREE.Group(); frame.position.set(art.x, art.y, art.z); frame.rotation.y = art.facing; this.world.add(frame);
      frame.add(box(art.width + 0.28, art.height + 0.28, 0.18, 0, 0, -0.06, 0xad8550));
      // The Sketch frame shows the generated garage painting (light peeking
      // out of the toolbox, or the shut toolbox once taken) when it is loaded.
      const painted = art.id === 'unfinished-sketch' && this.sketchPainting(this.art.lightTaken);
      const image: HTMLImageElement | HTMLCanvasElement = art.id === 'unfinished-sketch'
        ? painted || sketchPlaceholder(document.createElement('canvas'), !this.art.lightTaken)
        : artImages[art.id === 'masterpiece' ? masterpieceStageArt(this.art.restored) : 'royal-supper.entrance']!;
      const g = new THREE.PlaneGeometry(art.width, Math.min(art.height, art.width * image.height / image.width));
      const texture = art.id === 'unfinished-sketch' && !painted ? new THREE.CanvasTexture(image) : new THREE.Texture(image); texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      if (art.id === 'masterpiece') this.masterpieceTexture = texture;
      const m = new THREE.MeshBasicMaterial({ map: texture });
      if (art.id === 'unfinished-sketch') { this.sketchMaterial = m; this.sketchCanvas = painted ? null : image as HTMLCanvasElement; this.sketchTexture = texture; }
      this.resources.add(g); this.resources.add(m); this.resources.add(texture);
      const mesh = new THREE.Mesh(g, m); mesh.position.set(0, 0, 0.04); mesh.userData.artworkId = art.id;
      frame.add(mesh); this.solids.push(mesh);
      const label = document.createElement('canvas'); label.width = 768; label.height = 96;
      const t = new THREE.CanvasTexture(label); t.colorSpace = THREE.SRGBColorSpace;
      const lg = new THREE.PlaneGeometry(art.width, 0.35); const lm = new THREE.MeshBasicMaterial({ map: t });
      this.resources.add(t); this.resources.add(lg); this.resources.add(lm);
      const plaque = new THREE.Mesh(lg, lm); plaque.position.set(0, -art.height / 2 - 0.4, 0.06); frame.add(plaque);
      const drawPlaque = (line: string) => {
        const ctx = label.getContext('2d')!; ctx.fillStyle = '#34252a'; ctx.fillRect(0, 0, 768, 96); ctx.fillStyle = '#e5cd9e'; ctx.textAlign = 'center';
        ctx.font = '30px Georgia'; ctx.fillText(art.label, 384, 41); ctx.font = '18px sans-serif'; ctx.fillText(line, 384, 74); t.needsUpdate = true;
      };
      if (art.id === 'unfinished-sketch') this.drawSketchPlaque = drawPlaque;
      else if (art.id === 'masterpiece') this.drawMasterpiecePlaque = drawPlaque;
      else drawPlaque('The king has borrowed the golden pear');
    }
    this.applyArt();
  }
  /** The garage painting for the light's state, or null to draw the placeholder. */
  private sketchPainting(lightTaken: boolean): HTMLImageElement | null {
    return this.artImages[lightTaken ? 'sketch.entrance-empty' : 'sketch.entrance'] ?? null;
  }
  /** The Sketch frame opens once the pear is restored; while locked it is dimmed and never enters. */
  get sketchOpen(): boolean { return this.sketchUnlocked; }
  get restoredCount(): number { return this.art.restored; }
  private applyArt(): void {
    const { restored, lightTaken } = this.art;
    this.glowTarget = Math.min(restored, 2) / 2;
    // The room opens at its current state; a restore during play eases in.
    if (this.glow < 0 || this.reducedMotion) this.applyGlow(this.glowTarget);
    this.motes.visible = restored >= 2;
    this.sketchUnlocked = restored >= 1;
    this.sketchMaterial?.color.set(this.sketchUnlocked ? 0xffffff : 0x5d5862);
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
    this.camera.position.x += (Math.cos(this.yaw) * input.axis - Math.sin(this.yaw) * forward) / length * museum.speed * dt;
    this.camera.position.z += (-Math.sin(this.yaw) * input.axis - Math.cos(this.yaw) * forward) / length * museum.speed * dt;
    const margin = museum.radius + museum.wallThickness / 2;
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -museum.width / 2 + margin, museum.width / 2 - margin);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -museum.depth / 2 + margin, museum.depth / 2 - margin);
    this.render();
    const text = this.enabled() ? this.pick(new THREE.Vector2(), input.interactPressed) : '';
    if (text !== this.lastPrompt) { this.lastPrompt = text; this.prompt(text); }
  }
  render(_alpha = 1, seconds = this.lastSeconds): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const dt = Math.min(0.1, Math.max(0, seconds - this.lastSeconds)); this.lastSeconds = seconds;
    if (this.glow !== this.glowTarget) this.applyGlow(this.glow + Math.sign(this.glowTarget - this.glow) * Math.min(Math.abs(this.glowTarget - this.glow), dt / GLOW_SECONDS));
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
