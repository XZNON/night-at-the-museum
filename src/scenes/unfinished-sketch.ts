import * as THREE from 'three';
import type { GameScene } from '../core/scenes';
import type { Rect } from '../gameplay/collision';
import type { Controls } from '../gameplay/controller';
import { SketchModel, SketchRouteModel } from '../gameplay/sketch-model';
import type { SketchHud, SketchRouteSession, SketchSession } from '../gameplay/sketch-model';
import type {
  SketchBay, SketchEscalator, SketchGuide, SketchMechanism, SketchPlayfieldData, SketchRoute, SketchTuning,
} from '../levels/unfinished-sketch';

// Fully cartoon placeholder presentation: flat colour areas, simple cel-style
// shading and bold outlines. No asset is generated or loaded here beyond the
// approved existing player picture, which stays readable in silhouette.

// Sketch is its own world and must not share the banquet's moody palette.
const C = {
  sky: 0x9ad7f0, cloud: 0xf2fbff, paper: 0xf6efdc, ink: 0x2b2440,
  ground: 0xc98a52, groundTop: 0xe8b06a, glue: 0x6fd4bd,
  wall: 0xa9a0c4, wallTop: 0xc4bcd8,
  goal: 0xffd86b, goalDone: 0x8ef0a8, board: 0xf4b9c6, boardEdge: 0xffffff,
  axe: 0xe0576b, handle: 0x9a7550, socket: 0xa88fd8, site: 0xc6bce0,
  nailShaft: 0xe6dfcc, nailHead: 0xf6c445, nailCap: 0xf25f5c, hand: 0xffe27a,
  // Route-only cartoon palette.
  rowA: 0xfbe6bb, rowB: 0xd7e9fb, rowC: 0xf7d8e6,
  guide: 0xb9aed6, guideEdge: 0x8d80b5, guideGlue: 0x9fd8cd,
  escalator: 0x8f9fd6, escalatorTop: 0xbcc9ec, rail: 0x6f7bb0,
  suspension: 0x8b7cae, bracket: 0x6d5f96,
} as const;

const KIND_COLORS: Record<string, number> = {
  'freeze-platform': 0x6fd0ff,
  foothold: 0xffd166,
  'fixed-swing': 0xff8fa3,
  'moving-swing': 0xc79bff,
};

const ROW_TONES = [C.rowA, C.rowB, C.rowC] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Smoothstep used only for camera reframe; transport stays linear. */
const smooth = (t: number) => t * t * (3 - 2 * t);

export type SketchSceneMode =
  | { kind: 'bay'; field: SketchBay; session: SketchSession | null }
  | { kind: 'route'; field: SketchRoute; session: SketchRouteSession | null };

export type AnySketchModel = SketchModel | SketchRouteModel;

export class UnfinishedSketchScene implements GameScene {
  readonly id = 'unfinished-sketch';
  readonly world = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
  readonly model: AnySketchModel;
  readonly field: SketchPlayfieldData;
  readonly debug = new THREE.Group();
  private readonly player = new THREE.Group();
  private readonly hand = new THREE.Group();
  private readonly rigs = new Map<string, THREE.Group>();
  private readonly inkPlatforms = new Map<string, { solid: THREE.Group; outline: THREE.Group }>();
  private readonly rings = new Map<string, THREE.Mesh>();
  private readonly heads = new Map<string, THREE.Group>();
  private readonly rods = new Map<string, THREE.Mesh>();
  private readonly glueBubbles: THREE.Mesh[] = [];
  private readonly resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  private readonly listeners = new AbortController();
  private readonly previous = new THREE.Vector2();
  private readonly cameraPosition = new THREE.Vector2();
  private readonly previousCamera = new THREE.Vector2();
  private goalMesh: THREE.Mesh | null = null;
  private pickup: THREE.Group | null = null;
  private readonly chevrons: THREE.Mesh[] = [];
  private readonly escalatorSteps = new Map<string, THREE.Group>();
  private readonly boardingPads = new Map<string, THREE.Mesh>();
  private readonly scratchFocus = new THREE.Vector3();
  private hovered: string | null = null;
  private elapsed = 0;
  private interactive = false;
  private interactFrom = 0;
  private aspect = 16 / 9;
  private viewHeight: number;
  private reducedMotion = false;

  constructor(readonly mode: SketchSceneMode, tuning: SketchTuning, playerImage: HTMLImageElement,
    private readonly onHud: (hud: SketchHud) => void,
    private readonly onExit: (session: SketchSession | SketchRouteSession) => void,
    private readonly canvas?: HTMLCanvasElement,
    private readonly clearBoundaryInput: () => void = () => {}) {
    this.field = mode.field;
    this.model = mode.kind === 'bay'
      ? new SketchModel(mode.field, tuning)
      : new SketchRouteModel(mode.field, tuning);
    if (mode.session) {
      if (mode.kind === 'bay') (this.model as SketchModel).restoreSession(mode.session);
      else (this.model as SketchRouteModel).restoreSession(mode.session);
    }
    this.viewHeight = this.field.camera.viewHeight;
    this.world.background = new THREE.Color(C.sky);
    // Side-on orthographic view: Z is scenery depth only.
    this.camera.position.set(0, 6, 30);
    this.camera.lookAt(0, 6, 0);
    const sun = new THREE.Group(); sun.position.set(-30, 18, -9); this.world.add(sun);
    this.disc(6.5, 6.5, 1, 0xffe27a, sun);
    this.disc(8.4, 8.4, 1, 0xfff3b8, sun).position.set(-1.4, 1.4, -0.2);
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      cloud.position.set(-24 + i * 9.5, 9 + (i % 3) * 2.6, -8);
      for (let j = 0; j < 3; j++) {
        const puff = this.disc(2.4 + (j % 2) * 0.9, 1.9, 1, C.cloud, cloud);
        puff.position.set(j * 1.7 - 1.7, (j === 1 ? 0.55 : 0), 0);
      }
      this.world.add(cloud);
    }
    if (mode.kind === 'route') { this.buildLayerBands(); this.buildGuides(); }
    this.buildGround();
    this.buildMechanisms();
    this.buildTargets();
    this.buildPickup();
    this.buildPlayer(playerImage);
    if (mode.kind === 'route') {
      for (const leg of mode.field.legs) if (leg.escalator) this.buildEscalator(leg.escalator);
    }
    this.world.add(this.player, this.hand, this.debug);
    this.debug.visible = false;
    this.cameraPosition.set(this.model.controller.body.x + 3.2, this.model.controller.body.y + 3);
    this.previousCamera.copy(this.cameraPosition);
  }

  // --- cartoon primitives -------------------------------------------------
  private flat(color: number, opacity = 1): THREE.MeshBasicMaterial {
    const m = new THREE.MeshBasicMaterial({
      color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
    });
    this.resources.add(m); return m;
  }
  private disc(radius: number, tube: number, segments: number, color: number, parent: THREE.Object3D): THREE.Mesh {
    const g = new THREE.TorusGeometry(radius, tube, 8, segments); this.resources.add(g);
    const mesh = new THREE.Mesh(g, this.flat(color)); parent.add(mesh); return mesh;
  }
  private slab(w: number, h: number, d: number, color: number, parent: THREE.Object3D = this.world,
    opacity = 1, outlined = true): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d); this.resources.add(g);
    const mesh = new THREE.Mesh(g, this.flat(color, opacity)); parent.add(mesh);
    if (outlined) {
      const edges = new THREE.EdgesGeometry(g);
      const line = new THREE.LineBasicMaterial({ color: C.ink, transparent: opacity < 1, opacity }); this.resources.add(edges); this.resources.add(line);
      const outline = new THREE.LineSegments(edges, line);
      outline.scale.setScalar(1.04);
      mesh.add(outline);
    }
    return mesh;
  }
  private center(mesh: THREE.Mesh, rect: { x: number; y: number; width: number; height: number }, z = 0): void {
    mesh.position.set(rect.x + rect.width / 2, rect.y + rect.height / 2, z);
  }

  // --- connected stacked world -------------------------------------------
  /**
   * Three vertically stacked layer bands in one scene and canvas. They are
   * scenery only: a soft tint, dashed construction rules and pale background
   * props make a neighbouring row legible as part of the same unfinished
   * picture, never as a route map.
   */
  private buildLayerBands(): void {
    const route = this.mode.field as SketchRoute;
    for (const region of route.layers) {
      const tone = ROW_TONES[region.layer - 1];
      const band = this.slab(region.bounds.width + 8, region.bounds.height, 1, tone, this.world, 1, false);
      this.center(band, region.bounds, -6.5);
      this.dashedRule(region.bounds.x, region.bounds.y + region.bounds.height, region.bounds.width + 8, -6);
      this.dashedRule(region.bounds.x, region.bounds.y, region.bounds.width + 8, -6);
      this.backdropProps(region.bounds, region.layer);
    }
    // A soft haze between rows stops the pale paper of one layer bleeding into
    // the next, which is what made the stacks read as separate screens.
    for (const region of route.layers.slice(1)) {
      const haze = this.slab(region.bounds.width + 8, 1.1, 1, 0xb7c6d8, this.world, 0.5, false);
      haze.position.set(region.bounds.x + region.bounds.width / 2, region.bounds.y + 0.1, -6.2);
    }
  }

  /** A dashed construction rule, drawn flat like pencil guides. */
  private dashedRule(x: number, y: number, width: number, z: number): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z), new THREE.Vector3(x + width, y, z),
    ]);
    this.resources.add(geometry);
    const material = new THREE.LineDashedMaterial({
      color: C.guideEdge, dashSize: 1.4, gapSize: 1.1, transparent: true, opacity: 0.45,
    });
    this.resources.add(material);
    const rule = new THREE.Line(geometry, material);
    rule.computeLineDistances();
    this.world.add(rule);
  }

  /**
   * Pale cartoon tools left lying in the background of each row. They sit far
   * behind the play plane with no top lip and no outline weight, so they read
   * as depth and never as a landing surface.
   */
  private backdropProps(bounds: Rect, layer: 1 | 2 | 3): void {
    const kinds = ['eraser', 'pencil', 'pot', 'scrap'] as const;
    const tints = [0xe9d7ef, 0xf6e6bd, 0xd3e9ef, 0xf1d7d2];
    for (let i = 0; i < 6; i++) {
      const kind = kinds[(i + layer) % kinds.length];
      const x = bounds.x + 3 + i * ((bounds.width - 6) / 5);
      // Keep every prop inside its own row so a background tool from another
      // layer can never be mistaken for something in the active one.
      const rowHeight = bounds.height;
      const y = bounds.y + 1.1 + ((i * 5 + layer * 2) % 5) * Math.min(1.2, Math.max(0.4, rowHeight / 8));
      const group = new THREE.Group();
      group.position.set(x, y, -4.6);
      group.rotation.z = (i % 2 === 0 ? 1 : -1) * (0.12 + i * 0.05);
      const tint = tints[(i + layer) % tints.length];
      if (kind === 'eraser') {
        this.slab(4.2, 1.7, 1.4, tint, group, 0.55);
        const band = this.slab(4.3, 0.5, 1.5, C.guideEdge, group, 0.5, false);
        band.position.y = 0.3;
      } else if (kind === 'pencil') {
        this.slab(7.2, 1.1, 1.1, tint, group, 0.55);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.4, 4), this.flat(C.guideEdge, 0.5));
        this.resources.add(tip.geometry);
        tip.rotation.z = -Math.PI / 2;
        tip.position.set(4.3, 0, 0);
        group.add(tip);
      } else if (kind === 'pot') {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4, 12), this.flat(tint, 0.55));
        this.resources.add(pot.geometry);
        group.add(pot);
        const lid = this.slab(3.4, 0.4, 3.4, C.guideEdge, group, 0.5, false);
        lid.position.y = 1.4;
      } else {
        const scrap = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.2, 3), this.flat(tint, 0.5));
        this.resources.add(scrap.geometry);
        scrap.rotation.z = 0.5;
        group.add(scrap);
      }
      this.world.add(group);
    }
  }

  /** Reserved content: drawn, clearly under-drawing, and never collidable. */
  private buildGuides(): void {
    const route = this.mode.field as SketchRoute;
    const tone: Record<string, number> = {
      'row-floor': C.guide, 'row-ceiling': C.guide, board: C.guide, wall: C.guide,
      glue: C.guideGlue, socket: C.guide, stair: C.guide, rail: C.guideEdge,
    };
    for (const guide of route.guides) this.buildGuide(guide, tone);
  }

  private buildGuide(guide: SketchGuide, tone: Record<string, number>): void {
    const { rect } = guide;
    const color = tone[guide.kind] ?? C.guide;
    const mesh = this.slab(rect.width, rect.height, 1.4, color, this.world, 0.5, false);
    this.center(mesh, rect, -5.4);
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(rect.width, rect.height, 1.4));
    const line = new THREE.LineDashedMaterial({ color: C.guideEdge, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.9 });
    this.resources.add(edges); this.resources.add(line);
    const outline = new THREE.LineSegments(edges, line);
    outline.scale.setScalar(1.02);
    outline.position.copy(mesh.position);
    outline.computeLineDistances();
    this.world.add(outline);
    if (guide.kind === 'board' || guide.kind === 'socket') {
      // A pale suspension stub so reserved boards read as hanging pieces.
      const stub = this.slab(0.2, 2.4, 0.2, C.guideEdge, this.world, 0.45, false);
      stub.position.set(mesh.position.x, rect.y + rect.height + 1.2, -5.3);
    }
    if (guide.kind === 'stair') {
      for (let i = 0; i < 8; i++) {
        const step = this.slab(rect.width / 8, 0.2, 1.4, C.guideEdge, this.world, 0.5, false);
        step.position.set(rect.x + (i + 0.5) * (rect.width / 8), rect.y + (i + 1) * (rect.height / 9), -5.2);
      }
    }
    if (guide.kind === 'glue') {
      // A dashed surface line makes clear this pool is not walkable.
      this.dashedRule(rect.x, rect.y + rect.height, rect.width, -5.1);
    }
  }

  private buildGround(): void {
    const backdrop = this.slab(this.field.bounds.width + 40, 2, 1, C.paper);
    backdrop.position.set(this.field.bounds.x + this.field.bounds.width / 2,
      this.field.bounds.y + this.field.bounds.height - 3, -7);
    for (const s of this.field.solids) {
      // Bay bounds read as scenery walls so they never compete with platforms.
      const wall = /left|right|bound/.test(s.id);
      const mesh = this.slab(s.width, s.height, 2, wall ? C.wall : C.ground);
      this.center(mesh, s);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(s.width, 0.2, 2.2), this.flat(wall ? C.wallTop : C.groundTop));
      this.resources.add(lip.geometry);
      lip.position.set(0, s.height / 2, 0.08);
      mesh.add(lip);
    }
    for (const h of this.field.hazards) {
      const mesh = this.slab(h.width, h.height, 2, C.glue);
      this.center(mesh, h, 0.2);
      for (let i = 0; i < Math.max(3, Math.floor(h.width / 2.2)); i++) {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), this.flat(0xc8f6ea));
        this.resources.add(bubble.geometry);
        bubble.position.set(-h.width / 2 + (i + 0.5) * (h.width / Math.max(3, Math.floor(h.width / 2.2))), h.height / 2 + 0.12, 0.4);
        bubble.userData.phase = i * 0.7;
        mesh.add(bubble);
        this.glueBubbles.push(bubble);
      }
    }
    this.goalMesh = this.slab(this.field.goalBounds.width, 0.32, 2.2, C.goal);
    this.center(this.goalMesh, { ...this.field.goalBounds, y: this.field.goalBounds.y, height: 0.32 }, 0.6);
    if (this.mode.kind === 'route') for (const route of this.mode.field.legs) if (route.escalator) {
      // The Layer 2 endpoint marker: a chevron column beside the boarding pad.
      const pad = this.slab(route.escalator!.boarding.width, 0.24, 2.4, C.escalatorTop, this.world, 0.9);
      this.boardingPads.set(route.escalator!.id, pad);
      this.center(pad, { ...route.escalator!.boarding, y: route.escalator!.boarding.y, height: 0.24 }, 0.5);
      for (let i = 0; i < 3; i++) {
        const chevron = this.slab(1.5, 0.34, 0.3, C.escalatorTop, this.world, 0.85, false);
        chevron.position.set(route.escalator!.boarding.x + route.escalator!.boarding.width / 2,
          route.escalator!.boarding.y + 0.9 + i * 0.72, 0.8);
        chevron.rotation.z = Math.PI / 4;
        chevron.userData.escalatorId = route.escalator!.id;
        chevron.userData.phase = i * 0.9;
        chevron.userData.baseY = chevron.position.y;
        this.chevrons.push(chevron);
      }
    }
  }

  private buildMechanisms(): void {
    for (const m of this.field.mechanisms) {
      const rig = new THREE.Group(); this.world.add(rig); this.rigs.set(m.id, rig);
      if (m.kind === 'axe') {
        if (m.sweptBlade) {
          const mount = new THREE.Group(); mount.position.set(m.pivot.x, m.pivot.y, -0.6); this.world.add(mount);
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), this.flat(C.bracket));
          this.resources.add(cap.geometry); mount.add(cap);
          const post = this.slab(0.28, 2.2, 0.55, C.handle, mount); post.position.y = 1.1;
          const points = Array.from({ length: 65 }, (_, i) => new THREE.Vector3(
            Math.cos(i * Math.PI / 32) * m.length, Math.sin(i * Math.PI / 32) * m.length, -0.15));
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineDashedMaterial({ color: C.axe, transparent: true, opacity: 0.3, dashSize: 0.15, gapSize: 0.25 });
          this.resources.add(geometry); this.resources.add(material);
          const sweep = new THREE.Line(geometry, material); sweep.computeLineDistances(); mount.add(sweep);
        }
        const blade = this.slab(m.length, m.size.height, 0.5, C.axe, rig); void blade;
        const handle = this.slab(m.length, 0.32, 0.5, C.handle, rig);
        handle.position.set(0, m.size.height * 0.6, 0);
      } else if (m.kind === 'mount') {
        const ring = this.disc(0.5, 0.17, 18, C.socket, rig);
        void ring;
        const post = this.slab(0.16, 1.1, 0.16, C.handle, rig);
        post.position.set(0, -0.75, 0);
      } else if (m.kind === 'site') {
        this.slab(0.46, 0.46, 0.46, C.site, rig);
      } else {
        const solid = new THREE.Group(); rig.add(solid);
        const board = this.slab(m.size.width, m.size.height, 1.4, C.board, solid);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(m.size.width, 0.24, 1.6), this.flat(C.boardEdge));
        this.resources.add(lip.geometry);
        lip.position.set(0, m.size.height / 2, 0.06);
        board.add(lip);
        if (m.solidWhenPinned) {
          const outline = new THREE.Group(); rig.add(outline);
          // An empty dashed volume, with no landing lip, distinguishes a
          // moving sketch from the opaque, thick platform created by a nail.
          const box = new THREE.BoxGeometry(m.size.width, m.size.height, 1.4);
          const edges = new THREE.EdgesGeometry(box); box.dispose();
          const line = new THREE.LineDashedMaterial({ color: C.ink, dashSize: 0.3, gapSize: 0.2 });
          this.resources.add(edges); this.resources.add(line);
          const wire = new THREE.LineSegments(edges, line);
          wire.computeLineDistances(); outline.add(wire);
          solid.visible = this.model.isPinned(m.id);
          outline.visible = !solid.visible;
          this.inkPlatforms.set(m.id, { solid, outline });
        }
      }
      if (m.kind === 'pendulum') this.buildSuspension(m);
      if (this.field.id === 'layer-3-walls' && m.id.startsWith('l3-wall-')) {
        const label = document.createElement('canvas'); label.width = 128; label.height = 64;
        const ctx = label.getContext('2d')!;
        ctx.fillStyle = '#2b2440'; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(m.id.slice(-1).toUpperCase(), 64, 50);
        const texture = new THREE.CanvasTexture(label); this.resources.add(texture);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false }); this.resources.add(material);
        const text = new THREE.Sprite(material); text.scale.set(1.6, 0.8, 1); text.position.set(0, 1.05, 1.5); rig.add(text);
      }
    }
  }

  /**
   * Decorative suspension only. The rod and its ceiling bracket rotate
   * separately and never take part in collision, so the landing piece stays a
   * flat rectangle on the authored arc.
   */
  private buildSuspension(m: SketchMechanism): void {
    const bracket = this.slab(0.9, 0.5, 1.1, C.bracket, this.world);
    bracket.position.set(m.pivot.x, m.pivot.y + 0.35, -0.5);
    const rod = this.slab(0.16, m.length, 0.16, C.suspension, this.world);
    rod.position.z = -0.4;
    this.rods.set(m.id, rod);
  }

  private buildTargets(): void {
    for (const t of this.field.targets) {
      const ring = this.disc(0.56, 0.13, 20, KIND_COLORS[t.kind] ?? 0xffffff, this.world);
      this.rings.set(t.id, ring);
      const nail = this.nailRig(t.kind, t.size);
      this.world.add(nail);
      this.heads.set(t.id, nail);
      nail.visible = false;
    }
  }

  /**
   * Each placement target shows its nail the way that target actually uses
   * it, seen from the side. A clipped platform is pinned through its surface;
   * a swing is held from a nail driven into its socket; a foothold is a nail
   * driven straight down whose head is the platform you stand on.
   */
  private nailRig(kind: string, size: { width: number; height: number }): THREE.Group {
    const rig = new THREE.Group();
    if (kind === 'foothold') {
      // Driven in vertically: the shaft disappears into the marked site and
      // the wide head is the landable top surface.
      const head = this.slab(size.width, size.height, 1.6, C.nailHead, rig);
      head.position.y = -size.height / 2;
      const shaft = this.slab(0.24, 1.8, 0.24, C.nailShaft, rig);
      shaft.position.y = -size.height / 2 + 0.9;
    } else if (kind === 'fixed-swing' || kind === 'moving-swing') {
      // Driven in from the side: the head is the grab point at the pivot and
      // the shaft runs into the socket bracket behind it.
      this.slab(0.44, 0.44, 0.44, C.nailCap, rig);
      const shaft = this.slab(1.3, 0.17, 0.17, C.nailShaft, rig);
      shaft.position.set(0.85, 0, 0);
      const bracket = this.slab(0.3, 0.8, 0.8, C.socket, rig);
      bracket.position.set(1.5, 0, 0);
    } else {
      // Driven into the picture along Z: only the circular head faces the
      // camera, centered exactly on the clicked hole. No lateral shaft.
      const geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.18, 32);
      this.resources.add(geometry);
      const head = new THREE.Mesh(geometry, this.flat(C.nailCap));
      head.rotation.x = Math.PI / 2;
      rig.add(head);
      this.disc(0.4, 0.055, 32, C.ink, rig).position.z = 0.1;
      const face = new THREE.CircleGeometry(0.29, 32);
      this.resources.add(face);
      const inset = new THREE.Mesh(face, this.flat(C.nailHead));
      inset.position.z = 0.105;
      rig.add(inset);
    }
    return rig;
  }

  /** A loose cartoon nail lying in wait, side-on: shaft, head and a soft halo. */
  private buildPickup(): void {
    const p = this.field.nailPickup;
    if (!p) return;
    const rig = new THREE.Group();
    rig.position.set(p.x + p.width / 2, p.y + p.height / 2, 1.3);
    this.disc(0.5, 0.08, 28, C.goal, rig).position.z = -0.3;
    const shaft = this.slab(0.16, 0.8, 0.16, C.nailShaft, rig); shaft.position.y = -0.1;
    const head = this.slab(0.62, 0.18, 0.3, C.nailCap, rig); head.position.y = 0.36;
    rig.rotation.z = -0.35;
    rig.visible = !this.model.pickupCollected;
    this.world.add(rig);
    this.pickup = rig;
  }

  private buildPlayer(playerImage: HTMLImageElement): void {
    const texture = new THREE.Texture(playerImage);
    texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
    this.resources.add(texture);
    const geometry = new THREE.PlaneGeometry(1, 1); this.resources.add(geometry);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.03 });
    this.resources.add(material);
    const height = this.model.controller.body.height * 272 / 256;
    const sprite = new THREE.Mesh(geometry, material);
    sprite.scale.set(height * playerImage.width / playerImage.height, height, 1);
    sprite.position.set(0, height / 2, 1.4);
    this.player.add(sprite);
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(this.model.controller.body.width, height, 0.3));
    this.resources.add(edges);
    const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: C.ink }));
    this.resources.add(outline.material as THREE.Material);
    outline.position.set(0, height / 2, 0);
    this.player.add(outline);
    this.disc(0.3, 0.09, 14, C.hand, this.hand);
    this.hand.visible = false;
  }

  /**
   * The authored escalator, drawn as a cartoon stepped incline with two side
   * rails. Each tread is a real box with an outline so the ride reads clearly
   * from the Layer 1 exit ground, and one tread animates along the path.
   */
  private buildEscalator(escalator: SketchEscalator): void {
    const path = escalator.path;
    const body = new THREE.Group();
    this.world.add(body);
    // Solid incline under the treads, so the structure never reads as floating.
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]; const b = path[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const ramp = this.slab(length + 0.6, 1.1, 2.6, C.rail, body);
      ramp.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.6, -0.6);
      ramp.rotation.z = angle;
      // Individual treads on top of the incline.
      const treads = Math.max(2, Math.round(length / 1.1));
      for (let t = 0; t < treads; t++) {
        const k = (t + 0.5) / treads;
        const tread = this.slab(length / treads + 0.12, 0.3, 2.8, t % 2 ? C.escalator : C.escalatorTop, body);
        tread.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 0);
        tread.rotation.z = angle;
      }
      // Cartoon handrails on both sides.
      for (const side of [-1.5, 1.5]) {
        const rail = this.slab(length + 0.6, 0.24, 0.24, C.rail, body);
        rail.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 1.5, side);
        rail.rotation.z = angle;
        for (let p = 0; p <= 2; p++) {
          const post = this.slab(0.22, 1.5, 0.22, C.rail, body);
          post.position.set(a.x + (b.x - a.x) * (p / 2) + side * 0, a.y + (b.y - a.y) * (p / 2) + 0.75, side);
          post.rotation.z = angle;
        }
      }
    }
    // The single travelling tread that makes the ride visibly running.
    const step = new THREE.Group();
    this.escalatorSteps.set(escalator.id, step);
    const tread = this.slab(1.1, 0.34, 2.8, 0xfff0c2, step);
    tread.position.y = 0.2;
    step.add(tread);
    const chevron = this.slab(0.5, 0.34, 2.9, C.escalator, step, 1, false);
    chevron.position.set(0.1, 0.36, 0);
    step.add(chevron);
    step.position.set(path[0].x, path[0].y, 0.3);
    this.world.add(step);
  }

  // --- input --------------------------------------------------------------
  attachPointer(canvas: HTMLCanvasElement): void {
    const onDown = (event: PointerEvent): void => {
      if (!this.interactive || event.button !== 0) return;
      this.model.enqueue({ type: 'place', targetId: this.pick(event.clientX, event.clientY, canvas) ?? '' });
    };
    const onMove = (event: PointerEvent): void => {
      if (!this.interactive) return;
      this.hovered = this.pick(event.clientX, event.clientY, canvas);
    };
    const onLeave = (): void => { this.hovered = null; };
    canvas.addEventListener('pointerdown', onDown, { signal: this.listeners.signal });
    canvas.addEventListener('pointermove', onMove, { signal: this.listeners.signal });
    canvas.addEventListener('pointerleave', onLeave, { signal: this.listeners.signal });
  }

  /**
   * Generous screen-space hit area around a valid target. Picking is resolved
   * against the live camera, so a resize or reframe reprojects automatically.
   * Off-screen targets are refused outright, and two overlapping candidates are
   * separated by distance to the cursor rather than by row or draw order.
   */
  private pick(clientX: number, clientY: number, canvas: HTMLCanvasElement): string | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const cam = this.camera as THREE.OrthographicCamera;
    const worldX = cam.position.x + ((((clientX - rect.left) / rect.width) * 2) - 1) * (cam.right - cam.left) / 2;
    const worldY = cam.position.y + ((-((clientY - rect.top) / rect.height) * 2) + 1) * (cam.top - cam.bottom) / 2;
    const hit = this.model.targetHitPixels * ((cam.right - cam.left) / rect.width);
    const halfWidth = (cam.right - cam.left) / 2;
    const halfHeight = (cam.top - cam.bottom) / 2;
    let best: string | null = null; let bestDistance = Infinity;
    for (const view of this.model.targetViews()) {
      if (view.reason) continue;
      // Camera visibility never grants reach, but an off-screen mark must not
      // be clickable even when the world distance would allow it.
      if (Math.abs(view.x - cam.position.x) > halfWidth || Math.abs(view.y - cam.position.y) > halfHeight) continue;
      const d = Math.hypot(worldX - view.x, worldY - view.y);
      if (d > hit || d >= bestDistance) continue;
      bestDistance = d; best = view.id;
    }
    return best;
  }

  setInteractive(value: boolean): void {
    this.interactive = value;
    if (!value) this.hovered = null;
  }

  /** Reduced motion removes nonessential camera easing and zoom drift. */
  setReducedMotion(value: boolean): void { this.reducedMotion = value; }

  /**
   * Placement clicks stay refused until the transition input-settle time has
   * passed, so a click that dismissed a menu cannot immediately drive a nail.
   * Enabling happens on a rendered frame, which keeps ownership in the scene.
   */
  armInteraction(from: number): void { this.interactFrom = from; }

  /**
   * Read-only projection of a socket to CSS pixels, so a browser check can
   * click exactly where a player sees the marked ring. Never mutates anything.
   */
  targetScreen(targetId: string): { x: number; y: number; visible: boolean } | null {
    const view = this.model.targetViews().find(v => v.id === targetId);
    if (!view) return null;
    const cam = this.camera as THREE.OrthographicCamera;
    const canvas = this.canvas;
    if (!canvas) return { x: 0, y: 0, visible: false };
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0, visible: false };
    const nx = (view.x - cam.position.x) / ((cam.right - cam.left) / 2);
    const ny = (view.y - cam.position.y) / ((cam.top - cam.bottom) / 2);
    return {
      x: rect.left + (nx + 1) / 2 * rect.width,
      y: rect.top + (1 - ny) / 2 * rect.height,
      visible: Math.abs(nx) <= 1 && Math.abs(ny) <= 1,
    };
  }

  /** Read-only camera readback used by the review evidence. */
  cameraView(): { x: number; y: number; width: number; height: number } {
    const cam = this.camera as THREE.OrthographicCamera;
    return { x: cam.position.x, y: cam.position.y, width: cam.right - cam.left, height: cam.top - cam.bottom };
  }

  /** The route model when this scene is the S2 study, otherwise null. */
  get routeModel(): SketchRouteModel | null {
    return this.mode.kind === 'route' ? this.model as SketchRouteModel : null;
  }

  // --- lifecycle ----------------------------------------------------------
  enter(): void {
    const b = this.model.controller.body;
    this.previous.set(b.x, b.y);
    const focus = this.focusTarget();
    this.viewHeight = focus.z;
    this.applyProjection();
    this.cameraPosition.set(focus.x, focus.y);
    this.previousCamera.copy(this.cameraPosition);
    this.onHud(this.model.hud());
  }
  fixedUpdate(dt: number, input: Controls): void {
    const b = this.model.controller.body;
    this.previous.set(b.x, b.y);
    this.previousCamera.copy(this.cameraPosition);
    if (input.recallPressed) this.model.enqueue({ type: 'recall' });
    const boundary = `${this.routeModel?.legId}/${this.routeModel?.stage}`;
    const recovering = this.model.recoveryRemaining > 0;
    this.model.update(dt, input);
    if (this.routeModel && (boundary !== `${this.routeModel.legId}/${this.routeModel.stage}` ||
      input.restartPressed || recovering !== (this.model.recoveryRemaining > 0))) this.clearBoundaryInput();
    this.elapsed += dt;
    const focus = this.focusTarget();
    // Pause stops the fixed step entirely, so camera progression and the
    // escalator ride freeze with it. Reduced motion drops the easing but keeps
    // the essential transport and the readable reframe.
    const rate = this.reducedMotion ? 40 : this.field.camera.followRate;
    const blend = 1 - Math.exp(-rate * dt);
    this.cameraPosition.lerp(focus, blend);
    if (this.mode.kind === 'route') {
      // A slice-1 bay keeps its fixed ortho box and never re-zooms.
      this.viewHeight = this.reducedMotion ? focus.z : lerp(this.viewHeight, focus.z, blend);
      this.applyProjection();
    }
    this.onHud(this.model.hud());
  }
  render(alpha: number): void {
    if (!this.interactive && this.interactFrom > 0 && performance.now() >= this.interactFrom) this.setInteractive(true);
    const b = this.model.controller.body;
    this.player.position.set(THREE.MathUtils.lerp(this.previous.x, b.x, alpha) + b.width / 2,
      THREE.MathUtils.lerp(this.previous.y, b.y, alpha), 0);
    this.player.visible = this.model.recoveryRemaining <= 0;

    this.hand.visible = this.model.move.state === 'swing';
    if (this.hand.visible) {
      const grip = this.model.grips.find(g => g.id === this.model.move.swingTarget);
      if (grip) this.hand.position.set(grip.x, grip.y, 1.7);
    }

    const views = this.model.mechanismView();
    for (const view of views) {
      const rig = this.rigs.get(view.id);
      const m = this.model.mechanism(view.id);
      if (!rig || !m) continue;
      const ink = this.inkPlatforms.get(view.id);
      if (ink) { ink.solid.visible = view.pinned; ink.outline.visible = !view.pinned; }
      if (m.kind === 'axe') {
        // The blade pivots about the same radius the hazard rectangle uses.
        rig.position.set(m.pivot.x + (view.x - m.centre.x), m.pivot.y + (view.y - m.centre.y), 0);
        rig.rotation.z = -view.angle;
      } else {
        rig.position.set(view.x, view.y, 0);
      }
      if (m.kind === 'pendulum') {
        // The rod is pure decoration and rotates independently of the collider.
        const rod = this.rods.get(view.id);
        if (rod) {
          rod.position.set(m.pivot.x + Math.sin(view.angle) * m.length / 2,
            m.pivot.y - Math.cos(view.angle) * m.length / 2, -0.4);
          rod.rotation.z = view.angle;
        }
      }
    }

    for (const view of this.model.targetViews()) {
      const ring = this.rings.get(view.id);
      const head = this.heads.get(view.id);
      if (ring) {
        ring.position.set(view.x, view.y, 1.2);
        const scale = view.oldest ? 1.5 : view.reason ? 0.7 : this.hovered === view.id ? 1.25 : 1;
        ring.scale.setScalar(THREE.MathUtils.lerp(ring.scale.x, scale, 0.25));
        ring.rotation.z = this.elapsed * (view.oldest ? 1.8 : 0.5);
        ring.visible = !view.occupiedBy;
      }
      if (head) {
        head.visible = !!view.occupiedBy;
        // A foothold nail is driven down, so its head top is the standing
        // surface. Every other nail is anchored on the marked socket itself.
        const anchored = this.model.target(view.id)?.kind === 'foothold'
          ? view.y + view.height / 2 : view.y;
        head.position.set(view.x, anchored, 1.15);
        head.scale.setScalar(view.oldest ? 1.3 : 1);
      }
    }

    if (this.pickup && this.field.nailPickup) {
      this.pickup.visible = !this.model.pickupCollected;
      const p = this.field.nailPickup;
      this.pickup.position.y = p.y + p.height / 2 + (this.reducedMotion ? 0 : Math.sin(this.elapsed * 2.6) * 0.12);
    }
    for (const bubble of this.glueBubbles) {
      bubble.position.y = 0.12 + Math.sin(this.elapsed * 2.4 + Number(bubble.userData.phase)) * 0.09;
    }
    if (this.goalMesh) (this.goalMesh.material as THREE.MeshBasicMaterial).color.setHex(this.model.completed ? C.goalDone : C.goal);
    for (const chevron of this.chevrons) {
      chevron.position.y = Number(chevron.userData.baseY) + Math.sin(this.elapsed * 2 + Number(chevron.userData.phase)) * 0.18;
    }
    if (this.mode.kind === 'route') this.animateEscalator();

    this.camera.position.x = THREE.MathUtils.lerp(this.previousCamera.x, this.cameraPosition.x, alpha);
    this.camera.position.y = THREE.MathUtils.lerp(this.previousCamera.y, this.cameraPosition.y, alpha);
  }

  private animateEscalator(): void {
    const model = this.model as SketchRouteModel;
    for (const leg of model.route.legs) {
      const escalator = leg.escalator;
      if (!escalator) continue;
      const step = this.escalatorSteps.get(escalator.id)!;
      const active = model.legId === leg.id;
      const loop = active && model.inTransit ? model.transitProgress : (this.elapsed / escalator.duration) % 1;
      const at = model.escalatorPosition(loop, escalator);
      // Treads stay level underfoot, including the leftward second incline.
      step.position.set(at.x, at.y - 0.34, 0.2);
      const pad = this.boardingPads.get(escalator.id)!;
      (pad.material as THREE.MeshStandardMaterial).color.setHex(active && model.stage === 'exit' ? C.goal : C.escalatorTop);
    }
    for (const chevron of this.chevrons) {
      chevron.visible = chevron.userData.escalatorId === model.leg.escalator?.id && model.stage === 'exit';
    }
  }

  // --- active-layer framing ----------------------------------------------
  /**
   * Desired camera centre and view height. Slice 1 bays keep their original
   * follow behaviour exactly; the route frames the active layer moderately,
   * clamped so the player and the next landing stay inside the world bounds
   * while a neighbouring row stays in frame. z carries the view height.
   */
  private focusTarget(): THREE.Vector3 {
    const b = this.model.controller.body;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const camera = this.field.camera;
    if (this.mode.kind !== 'route') {
      return this.scratchFocus.set(cx + camera.lookAhead,
        Math.max(this.field.bounds.y + 5, cy + 2.4), camera.viewHeight);
    }
    const model = this.model as SketchRouteModel;
    let centreY: number; let viewHeight: number;
    let direction: number = model.section.travelDirection ?? 1;
    if (model.inTransit) {
      // Smooth reframe through the escalator; linear under reduced motion.
      const lower = model.route.sections[model.leg.sectionId].focus;
      const upper = model.route.sections[model.leg.arrivalSectionId!].focus;
      const k = this.reducedMotion ? model.transitProgress : smooth(model.transitProgress);
      centreY = lerp(lower.centreY.max, upper.centreY.min, k);
      viewHeight = lerp(lower.viewHeight, upper.viewHeight, k);
      direction = lerp(model.route.sections[model.leg.sectionId].travelDirection ?? 1,
        model.route.sections[model.leg.arrivalSectionId!].travelDirection ?? 1, k);
    } else {
      const section = model.section;
      centreY = clamp(cy + 2.4, section.focus.centreY.min, section.focus.centreY.max);
      viewHeight = section.focus.viewHeight;
    }
    const viewWidth = this.viewWidthFor(viewHeight);
    const minX = this.field.bounds.x + viewWidth / 2 - 4;
    const maxX = this.field.bounds.x + this.field.bounds.width - viewWidth / 2 + 4;
    const x = clamp(cx + (model.section.focus.lookAhead ?? camera.lookAhead) * direction, Math.min(minX, maxX), Math.max(minX, maxX));
    return this.scratchFocus.set(x, centreY, viewHeight);
  }

  private viewWidthFor(viewHeight: number): number {
    return Math.max(this.field.camera.minViewWidth, viewHeight * this.aspect);
  }

  /** Slice 1 keeps its fixed ortho box; the route animates between bands. */
  private applyProjection(): void {
    const viewWidth = this.viewWidthFor(this.viewHeight);
    const height = viewWidth / Math.max(0.1, this.aspect);
    const cam = this.camera as THREE.OrthographicCamera;
    cam.left = -viewWidth / 2; cam.right = viewWidth / 2;
    cam.top = height / 2; cam.bottom = -height / 2;
    cam.updateProjectionMatrix();
  }

  resize(width: number, height: number): void {
    // Only projection and UI framing change: world geometry, mechanism phase,
    // nails, player and colliders are all untouched by a resize.
    this.aspect = width / Math.max(1, height);
    this.viewHeight = this.focusTarget().z;
    this.applyProjection();
  }
  exit(): void {
    this.model.clearCommands();
    this.setInteractive(false);
    this.onExit(this.model.session);
  }
  dispose(): void {
    this.listeners.abort();
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
    this.rigs.clear(); this.rings.clear(); this.heads.clear(); this.rods.clear();
    this.inkPlatforms.clear();
    this.escalatorSteps.clear(); this.boardingPads.clear(); this.chevrons.length = 0;
    this.glueBubbles.length = 0;
    this.pickup = null;
    this.world.clear();
  }
}
