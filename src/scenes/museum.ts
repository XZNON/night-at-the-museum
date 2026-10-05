import * as THREE from 'three';
import type { GameScene } from '../core/scenes';
import type { Controls } from '../gameplay/controller';
import { museum, type MuseumPose } from '../levels/museum';
import { masterpieceStudy } from '../ui/masterpiece';

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
  private masterpieceTexture: THREE.CanvasTexture | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, pose: MuseumPose, restored: boolean,
    private readonly enabled: () => boolean, private readonly activate: (id: string) => void,
    private readonly prompt: (text: string) => void) {
    this.yaw = pose.yaw;
    this.camera.position.set(pose.x, museum.eyeHeight, pose.z);
    this.camera.rotation.order = 'YXZ';
    this.world.background = new THREE.Color(0x291c24);
    this.world.add(new THREE.HemisphereLight(0xffdfac, 0x393440, 2.1));
    const light = new THREE.PointLight(0xffd8a0, 38, 15); light.position.set(0, 3.5, -3); this.world.add(light);
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
      box(art.width + 0.28, art.height + 0.28, 0.18, art.x, art.y, art.z - 0.06, 0xad8550);
      const g = new THREE.PlaneGeometry(art.width, art.height);
      const texture = new THREE.CanvasTexture(art.id === 'masterpiece' ? masterpieceStudy(restored) : this.supperStudy());
      texture.colorSpace = THREE.SRGBColorSpace;
      if (art.id === 'masterpiece') this.masterpieceTexture = texture;
      const m = new THREE.MeshBasicMaterial({ map: texture });
      this.resources.add(g); this.resources.add(m); this.resources.add(texture);
      const mesh = new THREE.Mesh(g, m); mesh.position.set(art.x, art.y, art.z + 0.04); mesh.userData.artworkId = art.id;
      this.world.add(mesh); this.solids.push(mesh);
      const label = document.createElement('canvas'); label.width = 768; label.height = 96;
      const ctx = label.getContext('2d')!; ctx.fillStyle = '#34252a'; ctx.fillRect(0, 0, 768, 96); ctx.fillStyle = '#e5cd9e'; ctx.textAlign = 'center'; ctx.font = '30px Georgia'; ctx.fillText(art.label, 384, 41); ctx.font = '18px sans-serif'; ctx.fillText(art.id === 'masterpiece' ? 'A garden waiting for its colour' : 'The king has borrowed the golden pear', 384, 74);
      const t = new THREE.CanvasTexture(label); t.colorSpace = THREE.SRGBColorSpace;
      const lg = new THREE.PlaneGeometry(art.width, 0.35); const lm = new THREE.MeshBasicMaterial({ map: t });
      this.resources.add(t); this.resources.add(lg); this.resources.add(lm);
      const plaque = new THREE.Mesh(lg, lm); plaque.position.set(art.x, art.y - art.height / 2 - 0.4, art.z + 0.06); this.world.add(plaque);
    }
  }
  private supperStudy(): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = 800; c.height = 500; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#442936'; ctx.fillRect(0, 0, 800, 500); ctx.fillStyle = '#8d4b43'; ctx.fillRect(0, 330, 800, 170);
    for (const x of [140, 370, 620]) { ctx.fillStyle = '#b7a68b'; ctx.beginPath(); ctx.ellipse(x, 360, 100, 23, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ccb990'; ctx.fillRect(365, 150, 23, 195); ctx.fillStyle = '#e4b857'; ctx.beginPath(); ctx.ellipse(375, 125, 13, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(620, 305, 35, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(620, 270, 20, 28, 0, 0, Math.PI * 2); ctx.fill(); return c;
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
    if (activate) this.activate(id);
    return id === 'masterpiece' ? 'Click / E — Inspect the masterpiece' : 'Click / E — Enter Royal Supper';
  }
  suspend(): void {
    if (this.pointerStart && this.canvas.hasPointerCapture(this.pointerStart.id)) this.canvas.releasePointerCapture(this.pointerStart.id);
    this.pointerStart = null;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
  restoreColour(): void {
    if (!this.masterpieceTexture) return;
    this.masterpieceTexture.image = masterpieceStudy(true); this.masterpieceTexture.needsUpdate = true;
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
  render(): void { this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); }
  resize(width: number, height: number): void { this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix(); }
  exit(): void {
    this.lifetime.abort(); this.suspend();
  }
  dispose(): void { this.exit(); for (const r of this.resources) r.dispose(); this.resources.clear(); this.world.clear(); }
}
