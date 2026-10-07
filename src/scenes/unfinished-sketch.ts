import * as THREE from 'three';
import type { GameScene } from '../core/scenes';
import type { Rect } from '../gameplay/collision';
import type { Controls } from '../gameplay/controller';
import { SketchModel, SketchRouteModel } from '../gameplay/sketch-model';
import type { SketchHud, SketchRouteSession, SketchSession } from '../gameplay/sketch-model';
import type {
  SketchBay, SketchGuide, SketchLift, SketchMechanism, SketchPlayfieldData, SketchRoute, SketchTuning,
} from '../levels/unfinished-sketch';
import { LIFT_WALL_HEIGHT, LIFT_WALL_THICKNESS } from '../levels/unfinished-sketch';

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
  lift: 0x8f9fd6, liftTop: 0xfff0c2, rail: 0x6f7bb0, cab: 0x5a7fd6,
  suspension: 0x8b7cae, bracket: 0x6d5f96,
  // S4B nailable wood and the free-placement ghost.
  wood: 0xd99a5b, woodGrain: 0xa86a3a, track: 0x7d6aa8, ghostOk: 0x5fd38d, ghostBad: 0xf25f5c,
  // S5A placeholder sun.
  sunCore: 0xffd23f, sunRay: 0xffa83a, sunGlow: 0xfff3b8,
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
  /** Last horizontal travel direction; the player picture faces it. */
  private facing: 1 | -1 = 1;
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
  /** The pickup this scene draws: the field's, or a joined route section's. */
  private pickupRect: SketchPlayfieldData['nailPickup'];
  /** S5A: the sun on the end ledge, and its rays (they turn unless reduced motion). */
  private sun: THREE.Group | null = null;
  private sunRays: THREE.Group | null = null;
  /** S4L lifts: the moving deck, its lamp and the faint cab outline. */
  private readonly lifts = new Map<string, { deck: THREE.Group; lamp: THREE.MeshBasicMaterial; cab: THREE.Group; cue: THREE.Group; was: string; flashUntil: number }>();
  private readonly scratchFocus = new THREE.Vector3();
  private hovered: string | null = null;
  /** S4B: last cursor position, re-projected each frame because bars move. */
  private pointer: { x: number; y: number } | null = null;
  private surfaceHover: { surfaceId: string; offset: number; x: number; y: number } | null = null;
  private readonly ghosts = new Map<string, THREE.Group>();
  private ghostMaterials: THREE.MeshBasicMaterial[] = [];
  private airMark: THREE.Group | null = null;
  /** Placed free nails, drawn from a small pool per surface kind. */
  private readonly freeHeads: { kind: string; rig: THREE.Group }[] = [];
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
    private readonly clearBoundaryInput: () => void = () => {},
    /** S5A: told once when the sun is taken. The owner decides what it means. */
    private readonly onSunCollected: () => void = () => {}) {
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
    this.buildSurfaces();
    this.buildPickup();
    if (mode.kind === 'route') this.buildSun(mode.field);
    this.buildPlayer(playerImage);
    if (mode.kind === 'route') {
      for (const lift of [...mode.field.parkedLifts ?? [], ...mode.field.legs.flatMap(l => l.lift ? [l.lift] : [])]) this.buildLift(lift);
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
  }

  private buildMechanisms(): void {
    const surfaceParents = new Set((this.field.surfaces ?? []).map(s => s.mechanismId));
    for (const m of this.field.mechanisms) {
      const rig = new THREE.Group(); this.world.add(rig); this.rigs.set(m.id, rig);
      // Nailable wood is drawn by buildSurfaces on this same moving rig.
      if (surfaceParents.has(m.id)) continue;
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
      // Lettered where a leg of this route climbs them (not as crossing context).
      if (this.mode.kind === 'route' && m.id.startsWith('l3-wall-') &&
        this.mode.field.legs.some(l => l.targetIds.includes(`${m.id}-pin`))) {
        this.letter(m.id.slice(-1).toUpperCase(), rig).position.set(0, 1.05, 1.5);
      }
    }
  }

  /** A small inked letter sprite that follows its rig. */
  private letter(text: string, parent: THREE.Object3D): THREE.Sprite {
    const label = document.createElement('canvas'); label.width = 128; label.height = 64;
    const ctx = label.getContext('2d')!;
    ctx.fillStyle = '#2b2440'; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, 64, 50);
    const texture = new THREE.CanvasTexture(label); this.resources.add(texture);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false }); this.resources.add(material);
    const sprite = new THREE.Sprite(material); sprite.scale.set(1.6, 0.8, 1); parent.add(sprite);
    return sprite;
  }

  /**
   * S4B nailable wood. A strip or bar is drawn as a wooden batten set just
   * behind the play plane with no landing lip: it never holds the player, only
   * a nail driven into it does. A moving bar hangs from a trolley on a ceiling
   * track that shows its whole back-and-forth travel.
   */
  private buildSurfaces(): void {
    for (const surface of this.field.surfaces ?? []) {
      const m = this.model.mechanism(surface.mechanismId);
      const rig = this.rigs.get(surface.mechanismId);
      if (!m || !rig) continue;
      const length = Math.hypot(surface.to.x - surface.from.x, surface.to.y - surface.from.y);
      const angle = Math.atan2(surface.to.y - surface.from.y, surface.to.x - surface.from.x);
      const mid = { x: (surface.from.x + surface.to.x) / 2, y: (surface.from.y + surface.to.y) / 2 };
      const plank = this.slab(length, 0.32, 0.7, C.wood, rig);
      plank.position.set(mid.x, mid.y, -0.45); plank.rotation.z = angle;
      const grains = Math.max(2, Math.round(length / 0.9));
      for (let i = 1; i < grains; i++) {
        const grain = this.slab(0.06, 0.2, 0.72, C.woodGrain, plank, 1, false);
        grain.position.set(-length / 2 + i * (length / grains), 0, 0.02);
      }
      if (surface.kind === 'moving-swing') {
        // Hangers to a ceiling trolley; the track spans the full travel.
        for (const end of [surface.from, surface.to]) {
          const hanger = this.slab(0.12, 1.1, 0.12, C.suspension, rig);
          hanger.position.set(end.x, end.y + 0.7, -0.6);
        }
        const trolley = this.slab(Math.abs(surface.to.x - surface.from.x) + 0.6, 0.36, 0.5, C.track, rig);
        trolley.position.set(mid.x, mid.y + 1.35, -0.6);
        const y = m.centre.y + mid.y + 1.55;
        const x0 = m.centre.x + Math.min(0, m.travel.x) + Math.min(surface.from.x, surface.to.x) - 0.5;
        const x1 = m.centre.x + Math.max(0, m.travel.x) + Math.max(surface.from.x, surface.to.x) + 0.5;
        const track = this.slab(x1 - x0, 0.16, 0.4, C.track, this.world, 0.85, false);
        track.position.set((x0 + x1) / 2, y, -0.7);
        for (const x of [x0, x1]) { const stop = this.slab(0.22, 0.6, 0.4, C.track, this.world, 0.85, false); stop.position.set(x, y, -0.7); }
      } else {
        // The strip is braced into the ledge edge it grows out of.
        const brace = this.slab(0.22, 1.4, 0.5, C.woodGrain, rig);
        brace.position.set(surface.from.x + 0.3, surface.from.y - 0.75, -0.55);
      }
      this.letter(surface.label.split(' ').pop()!, rig).position.set(mid.x, mid.y + (surface.kind === 'foothold' ? -0.85 : -0.7), 1.5);
    }
    if (!this.field.surfaces?.length) return;
    // Ghost nails: one per surface kind, tinted by validity at the cursor.
    for (const kind of ['foothold', 'moving-swing'] as const) {
      const ghost = new THREE.Group();
      const material = this.flat(C.ghostOk, 0.55); this.ghostMaterials.push(material);
      const g = kind === 'foothold' ? new THREE.BoxGeometry(1.9, 0.35, 1.6) : new THREE.SphereGeometry(0.34, 16, 12);
      this.resources.add(g);
      ghost.add(new THREE.Mesh(g, material));
      if (kind === 'foothold') {
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.22), material); this.resources.add(shaft.geometry);
        shaft.position.y = -0.6; ghost.add(shaft);
      }
      ghost.visible = false; this.world.add(ghost); this.ghosts.set(kind, ghost);
    }
    const air = new THREE.Group();
    const cross = this.flat(C.ghostBad, 0.75);
    for (const r of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.1), cross); this.resources.add(bar.geometry);
      bar.rotation.z = r; air.add(bar);
    }
    air.visible = false; this.world.add(air); this.airMark = air;
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

  /**
   * S4B free nails. A strip nail is driven down: its wide head is the step and
   * the shaft runs down into the wood. A bar nail is driven into the bar toward
   * the back, so only its round grip head faces the camera.
   */
  private freeNailRig(kind: string, size: { width: number; height: number }): THREE.Group {
    const rig = new THREE.Group();
    if (kind === 'foothold') {
      const head = this.slab(size.width, size.height, 1.6, C.nailHead, rig);
      head.position.y = -size.height / 2;
      const shaft = this.slab(0.22, 0.9, 0.22, C.nailShaft, rig);
      shaft.position.y = -size.height - 0.45;
      return rig;
    }
    const geometry = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 28); this.resources.add(geometry);
    const head = new THREE.Mesh(geometry, this.flat(C.nailCap));
    head.rotation.x = Math.PI / 2; rig.add(head);
    this.disc(0.36, 0.05, 28, C.ink, rig).position.z = 0.11;
    const face = new THREE.CircleGeometry(0.24, 28); this.resources.add(face);
    const inset = new THREE.Mesh(face, this.flat(C.nailHead)); inset.position.z = 0.115; rig.add(inset);
    return rig;
  }

  /** A loose cartoon nail lying in wait, side-on: shaft, head and a soft halo. */
  private buildPickup(): void {
    const p = this.field.nailPickup ??
      (this.mode.kind === 'route' ? this.mode.field.legs.find(l => l.settings?.nailPickup)?.settings?.nailPickup : undefined);
    this.pickupRect = p;
    if (!p) return;
    const rig = new THREE.Group();
    rig.position.set(p.x + p.width / 2, p.y + p.height / 2, 1.3);
    this.disc(0.5, 0.08, 28, C.goal, rig).position.z = -0.3;
    const shaft = this.slab(0.16, 0.8, 0.16, C.nailShaft, rig); shaft.position.y = -0.1;
    const head = this.slab(0.62, 0.18, 0.3, C.nailCap, rig); head.position.y = 0.36;
    rig.rotation.z = -0.35;
    rig.visible = this.model.nailPickup === p && !this.model.pickupCollected;
    this.world.add(rig);
    this.pickup = rig;
  }

  /**
   * S5A: a cartoon placeholder sun resting on the end ledge: a warm disc with
   * an ink rim, a soft highlight and a ring of short rays. Faceless, like
   * every Sketch gameplay asset. Final art is a later task; nothing is loaded
   * or generated here.
   */
  private buildSun(route: SketchRoute): void {
    const sun = route.sun;
    if (!sun) return;
    const rig = new THREE.Group();
    rig.position.set(sun.x + sun.width / 2, sun.y + sun.height / 2, 1.3);
    const rays = new THREE.Group(); rig.add(rays);
    for (let i = 0; i < 10; i++) {
      const ray = this.slab(0.14, 0.34, 0.12, C.sunRay, rays);
      const a = i / 10 * Math.PI * 2;
      ray.position.set(Math.sin(a) * 0.82, Math.cos(a) * 0.82, -0.1);
      ray.rotation.z = -a;
    }
    const face = new THREE.CircleGeometry(0.6, 32); this.resources.add(face);
    rig.add(new THREE.Mesh(face, this.flat(C.sunCore)));
    this.disc(0.6, 0.06, 32, C.ink, rig).position.z = 0.02;
    const glow = new THREE.CircleGeometry(0.26, 24); this.resources.add(glow);
    const highlight = new THREE.Mesh(glow, this.flat(C.sunGlow)); highlight.position.set(-0.17, 0.17, 0.04); rig.add(highlight);
    rig.visible = !(this.model as SketchRouteModel).sunCollected;
    this.world.add(rig);
    this.sun = rig; this.sunRays = rays;
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
   * An S4L vertical lift as a cartoon 2.5D placeholder: an open shaft frame
   * of two guide rails and a top beam reaching the next layer, a thick deck
   * with a bright edge and a lamp, and a faint ink cab outline that shows the
   * invisible walls only while they hold the rider. Collision lives in the
   * model; this only follows its live deck.
   */
  private buildLift(lift: SketchLift): void {
    const { deck } = lift;
    const bottom = deck.y - 0.5;
    // The frame clears a standing rider's head at the top.
    const top = deck.y + deck.height + lift.rise + 2.6;
    for (const x of [deck.x - 0.2, deck.x + deck.width + 0.2]) {
      const rail = this.slab(0.3, top - bottom, 0.4, C.rail, this.world);
      rail.position.set(x, (top + bottom) / 2, -0.9);
    }
    const beam = this.slab(deck.width + 0.9, 0.36, 0.5, C.rail, this.world);
    beam.position.set(deck.x + deck.width / 2, top, -0.9);
    // Rungs on the rails, so the shaft reads as built and not as a ladder.
    for (let y = bottom + 1.2; y < top - 0.6; y += 1.6) {
      const rung = this.slab(deck.width + 0.4, 0.1, 0.12, C.rail, this.world, 0.55, false);
      rung.position.set(deck.x + deck.width / 2, y, -1.05);
    }
    const group = new THREE.Group(); this.world.add(group);
    const slab = this.slab(deck.width, deck.height, 2.4, C.lift, group);
    slab.position.set(0, -deck.height / 2, 0);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(deck.width, 0.16, 2.5), this.flat(C.liftTop));
    this.resources.add(lip.geometry);
    lip.position.set(0, -0.08, 0.04);
    group.add(lip);
    const lampMaterial = this.flat(C.goal);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), lampMaterial);
    this.resources.add(lamp.geometry);
    lamp.position.set(0, -deck.height / 2, 1.3);
    group.add(lamp);
    // Faint ink cab: two posts and a top rail the height of the invisible walls.
    const cab = new THREE.Group(); group.add(cab);
    const ink = new THREE.LineBasicMaterial({ color: C.cab, transparent: true, opacity: 0.55 });
    this.resources.add(ink);
    const half = deck.width / 2 + LIFT_WALL_THICKNESS / 2;
    const outline = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-half, 0, 1), new THREE.Vector3(-half, LIFT_WALL_HEIGHT, 1),
      new THREE.Vector3(-half, LIFT_WALL_HEIGHT, 1), new THREE.Vector3(half, LIFT_WALL_HEIGHT, 1),
      new THREE.Vector3(half, LIFT_WALL_HEIGHT, 1), new THREE.Vector3(half, 0, 1),
    ]);
    this.resources.add(outline);
    cab.add(new THREE.LineSegments(outline, ink));
    const glass = this.slab(deck.width + LIFT_WALL_THICKNESS, LIFT_WALL_HEIGHT, 0.05, C.cab, cab, 0.08, false);
    glass.position.set(0, LIFT_WALL_HEIGHT / 2, 0.95);
    cab.visible = false;
    // Wind-up and arrival cue: a small arrow on the exit side of the deck.
    const cue = new THREE.Group(); group.add(cue);
    for (const r of [Math.PI / 4, -Math.PI / 4]) {
      const bar = this.slab(0.7, 0.18, 0.18, C.goal, cue, 1, false);
      bar.rotation.z = r; bar.position.set(-0.22, r > 0 ? 0.24 : -0.24, 0);
    }
    // Mirrored so the chevron points toward the exit side.
    cue.scale.x = -lift.exitSide;
    cue.position.set(lift.exitSide * (deck.width / 2 - 0.5), 0.9, 1.2);
    cue.visible = false;
    group.position.set(deck.x + deck.width / 2, deck.y + deck.height, 0);
    this.lifts.set(lift.id, { deck: group, lamp: lampMaterial, cab, cue, was: '', flashUntil: 0 });
  }

  // --- input --------------------------------------------------------------
  attachPointer(canvas: HTMLCanvasElement): void {
    const onDown = (event: PointerEvent): void => {
      if (!this.interactive || event.button !== 0) return;
      const marked = this.pick(event.clientX, event.clientY, canvas);
      if (marked || !this.model.freePlacement) { this.model.enqueue({ type: 'place', targetId: marked ?? '' }); return; }
      // Free placement: the projected spot, or empty air (refused, queue unchanged).
      const spot = this.pickSurface(event.clientX, event.clientY, canvas);
      this.model.enqueue({ type: 'place-at', surfaceId: spot?.surfaceId ?? '', offset: spot?.offset ?? 0 });
    };
    const onMove = (event: PointerEvent): void => {
      if (!this.interactive) return;
      this.hovered = this.pick(event.clientX, event.clientY, canvas);
      this.pointer = { x: event.clientX, y: event.clientY };
    };
    const onLeave = (): void => { this.hovered = null; this.pointer = null; };
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

  /** Cursor in world units for the live camera, or null with no canvas size. */
  private toWorld(clientX: number, clientY: number, canvas: HTMLCanvasElement): { x: number; y: number; perPixel: number } | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const cam = this.camera as THREE.OrthographicCamera;
    return {
      x: cam.position.x + ((((clientX - rect.left) / rect.width) * 2) - 1) * (cam.right - cam.left) / 2,
      y: cam.position.y + ((-((clientY - rect.top) / rect.height) * 2) + 1) * (cam.top - cam.bottom) / 2,
      perPixel: (cam.right - cam.left) / rect.width,
    };
  }

  /**
   * Project the cursor onto the nearest nailable surface within the generous
   * hit distance. The 0..1 offset is computed now; the model revalidates reach,
   * spacing and budget at the consuming tick, with the nail kept at that local
   * spot as its bar moves. Off-screen wood is never picked.
   */
  private pickSurface(clientX: number, clientY: number, canvas: HTMLCanvasElement): { surfaceId: string; offset: number; x: number; y: number } | null {
    const at = this.toWorld(clientX, clientY, canvas);
    if (!at) return null;
    const hit = this.model.targetHitPixels * at.perPixel;
    let best: { surfaceId: string; offset: number; x: number; y: number } | null = null; let bestDistance = Infinity;
    for (const view of this.model.surfaceViews()) {
      const dx = view.to.x - view.from.x; const dy = view.to.y - view.from.y;
      const offset = clamp(((at.x - view.from.x) * dx + (at.y - view.from.y) * dy) / Math.max(1e-6, dx * dx + dy * dy), 0, 1);
      const x = view.from.x + dx * offset; const y = view.from.y + dy * offset;
      const d = Math.hypot(at.x - x, at.y - y);
      if (d > hit || d >= bestDistance || !this.worldScreen(x, y).visible) continue;
      bestDistance = d; best = { surfaceId: view.id, offset, x, y };
    }
    return best;
  }

  setInteractive(value: boolean): void {
    this.interactive = value;
    if (!value) { this.hovered = null; this.pointer = null; }
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

  /** Read-only projection of a surface offset to CSS pixels, for browser checks. */
  surfaceScreen(surfaceId: string, offset: number): { x: number; y: number; visible: boolean } | null {
    const point = this.model.surfacePoint(surfaceId, offset);
    return point ? this.worldScreen(point.x, point.y) : null;
  }

  /** Read-only world-to-CSS-pixel projection for the live camera. */
  worldScreen(x: number, y: number): { x: number; y: number; visible: boolean } {
    const cam = this.camera as THREE.OrthographicCamera;
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0, visible: false };
    const nx = (x - cam.position.x) / ((cam.right - cam.left) / 2);
    const ny = (y - cam.position.y) / ((cam.top - cam.bottom) / 2);
    return { x: rect.left + (nx + 1) / 2 * rect.width, y: rect.top + (1 - ny) / 2 * rect.height, visible: Math.abs(nx) <= 1 && Math.abs(ny) <= 1 };
  }

  /** Read-only S5A sun readback (visibility, pulse scale, ray turn) for the review evidence. */
  sunView(): { visible: boolean; scale: number; rays: number } | null {
    return this.sun ? { visible: this.sun.visible, scale: this.sun.scale.x, rays: this.sunRays?.rotation.z ?? 0 } : null;
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
    this.onHud(this.hud());
  }
  /** The model HUD, with the S4B hover preview naming the spot or the refusal. */
  private hud(): SketchHud {
    const hud = this.model.hud();
    if (!this.model.freePlacement || !this.pointer || !this.interactive) return hud;
    const spot = this.surfaceHover;
    if (!spot) return { ...hud, nearest: 'Empty air · nails only go into wood' };
    const label = this.model.surface(spot.surfaceId)!.label;
    const reason = this.model.surfaceRefusal(spot.surfaceId, spot.offset);
    return { ...hud, nearest: reason ? `${label} · ${reason}` : `Click: nail ${label} here` };
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
    // The sun is reported once per scene life; a restored snapshot never reports.
    if (this.routeModel?.consumeSunTouch()) this.onSunCollected();
    this.elapsed += dt;
    const focus = this.focusTarget();
    // Pause stops the fixed step entirely, so camera progression and the
    // lift ride freeze with it. Reduced motion drops the easing but keeps
    // the essential transport and the readable reframe.
    const rate = this.reducedMotion ? 40 : this.field.camera.followRate;
    const blend = 1 - Math.exp(-rate * dt);
    this.cameraPosition.lerp(focus, blend);
    if (this.mode.kind === 'route') {
      // A slice-1 bay keeps its fixed ortho box and never re-zooms.
      this.viewHeight = this.reducedMotion ? focus.z : lerp(this.viewHeight, focus.z, blend);
      this.applyProjection();
    }
    this.refreshSurfaceHover();
    this.onHud(this.hud());
  }
  private refreshSurfaceHover(): void {
    this.surfaceHover = this.pointer && this.canvas && this.interactive && this.model.freePlacement
      ? this.pickSurface(this.pointer.x, this.pointer.y, this.canvas) : null;
  }
  render(alpha: number): void {
    if (!this.interactive && this.interactFrom > 0 && performance.now() >= this.interactFrom) this.setInteractive(true);
    const b = this.model.controller.body;
    this.player.position.set(THREE.MathUtils.lerp(this.previous.x, b.x, alpha) + b.width / 2,
      THREE.MathUtils.lerp(this.previous.y, b.y, alpha), 0);
    // Presentation only: mirror the picture toward travel so moving left never
    // reads as walking backwards. Collision and the outline are symmetric.
    if (Math.abs(b.vx) > 0.25) this.facing = b.vx > 0 ? 1 : -1;
    this.player.scale.x = this.facing;
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
        // The free-placement section shows no rings for other sections' marks.
        ring.visible = !view.occupiedBy && !(this.field.surfaces?.length && !this.model.ownsTarget(view.id));
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

    this.renderFreeNails();

    if (this.pickup && this.pickupRect) {
      // A joined route offers it only in its own section (the climb).
      this.pickup.visible = this.model.nailPickup === this.pickupRect && !this.model.pickupCollected;
      const p = this.pickupRect;
      this.pickup.position.y = p.y + p.height / 2 + (this.reducedMotion ? 0 : Math.sin(this.elapsed * 2.6) * 0.12);
    }
    if (this.sun) {
      this.sun.visible = !(this.model as SketchRouteModel).sunCollected;
      // A gentle pulse and turning rays; reduced motion keeps it still.
      this.sun.scale.setScalar(this.reducedMotion ? 1 : 1 + Math.sin(this.elapsed * 3) * 0.06);
      if (this.sunRays) this.sunRays.rotation.z = this.reducedMotion ? 0 : -this.elapsed * 0.6;
    }
    for (const bubble of this.glueBubbles) {
      bubble.position.y = 0.12 + Math.sin(this.elapsed * 2.4 + Number(bubble.userData.phase)) * 0.09;
    }
    if (this.goalMesh) (this.goalMesh.material as THREE.MeshBasicMaterial).color.setHex(this.model.completed ? C.goalDone : C.goal);
    if (this.mode.kind === 'route') this.animateLifts();

    this.camera.position.x = THREE.MathUtils.lerp(this.previousCamera.x, this.cameraPosition.x, alpha);
    this.camera.position.y = THREE.MathUtils.lerp(this.previousCamera.y, this.cameraPosition.y, alpha);
  }

  /** Placed free nails and the hover ghost (S4B only). */
  private renderFreeNails(): void {
    if (!this.field.surfaces?.length) return;
    const used = new Map<string, number>();
    for (const view of this.model.targetViews()) {
      const t = this.model.target(view.id);
      if (!t || this.field.targets.includes(t)) continue;
      const index = used.get(t.kind) ?? 0; used.set(t.kind, index + 1);
      let slot = this.freeHeads.filter(h => h.kind === t.kind)[index];
      if (!slot) { slot = { kind: t.kind, rig: this.freeNailRig(t.kind, t.size) }; this.world.add(slot.rig); this.freeHeads.push(slot); }
      slot.rig.visible = true;
      // A foothold head's top is the standing surface; a grip nail sits on its spot.
      slot.rig.position.set(view.x, t.kind === 'foothold' ? view.y + view.height / 2 : view.y, 1.15);
      slot.rig.scale.setScalar(view.oldest ? 1.3 : 1);
    }
    for (const kind of new Set(this.freeHeads.map(h => h.kind))) {
      this.freeHeads.filter(h => h.kind === kind).slice(used.get(kind) ?? 0).forEach(h => { h.rig.visible = false; });
    }
    this.refreshSurfaceHover();
    const spot = this.surfaceHover;
    const surface = spot ? this.model.surface(spot.surfaceId) : null;
    for (const [kind, ghost] of this.ghosts) {
      ghost.visible = !!surface && surface.kind === kind;
      if (ghost.visible) ghost.position.set(spot!.x, spot!.y, 1.3);
    }
    if (spot) {
      const ok = this.model.surfaceRefusal(spot.surfaceId, spot.offset) === '';
      for (const material of this.ghostMaterials) material.color.setHex(ok ? C.ghostOk : C.ghostBad);
    }
    if (this.airMark) {
      const at = !spot && this.pointer && this.canvas && this.interactive && this.model.freePlacement
        ? this.toWorld(this.pointer.x, this.pointer.y, this.canvas) : null;
      this.airMark.visible = !!at;
      if (at) this.airMark.position.set(at.x, at.y, 1.6);
    }
  }

  /** Follow each live deck; lamp, shudder, cab outline and exit cue. */
  private animateLifts(): void {
    const model = this.model as SketchRouteModel;
    for (const view of model.liftViews()) {
      const rig = this.lifts.get(view.id);
      if (!rig) continue;
      // Arrival cue: the exit-side arrow stays lit briefly after the deck parks.
      if (rig.was && rig.was !== 'parked' && view.state === 'parked') rig.flashUntil = this.elapsed + 1.4;
      rig.was = view.state;
      const flash = this.elapsed < rig.flashUntil;
      const shudder = view.state === 'wind-up' && !this.reducedMotion ? Math.sin(this.elapsed * 70) * 0.05 : 0;
      rig.deck.position.set(view.deck.x + view.deck.width / 2 + shudder, view.deck.y + view.deck.height, 0);
      rig.cab.visible = view.walls;
      const ready = view.active && model.stage === 'exit';
      const blink = (Math.sin(this.elapsed * (view.state === 'wind-up' ? 18 : 4)) + 1) / 2;
      rig.lamp.color.setHex(view.walls ? (view.state === 'wind-up' && blink > 0.5 ? C.goal : C.goalDone)
        : ready ? (blink > 0.35 || this.reducedMotion ? C.goal : C.liftTop) : flash ? C.goalDone : C.rail);
      rig.cue.visible = view.state === 'arriving' || flash;
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
      // Smooth reframe up the lift shaft; linear under reduced motion.
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
    let lookAhead = model.section.focus.lookAhead ?? camera.lookAhead;
    const blend = model.route.sectionBlend;
    if (!model.inTransit && blend && (model.sectionId === blend.from || model.sectionId === blend.to)) {
      // Joined Layer 3: the climb's band eases into the crossing's band as the
      // player walks the shared ledge. Position only; it never moves progress.
      const a = model.route.sections[blend.from]; const z = model.route.sections[blend.to];
      const k = smooth(clamp((cx - blend.x0) / (blend.x1 - blend.x0), 0, 1));
      centreY = lerp(clamp(cy + 2.4, a.focus.centreY.min, a.focus.centreY.max), clamp(cy + 2.4, z.focus.centreY.min, z.focus.centreY.max), k);
      viewHeight = lerp(a.focus.viewHeight, z.focus.viewHeight, k);
      lookAhead = lerp(a.focus.lookAhead ?? camera.lookAhead, z.focus.lookAhead ?? camera.lookAhead, k);
      direction = lerp(a.travelDirection ?? 1, z.travelDirection ?? 1, k);
    }
    const viewWidth = this.viewWidthFor(viewHeight);
    const minX = this.field.bounds.x + viewWidth / 2 - 4;
    const maxX = this.field.bounds.x + this.field.bounds.width - viewWidth / 2 + 4;
    const x = clamp(cx + lookAhead * direction, Math.min(minX, maxX), Math.max(minX, maxX));
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
    this.ghosts.clear(); this.ghostMaterials = []; this.freeHeads.length = 0; this.airMark = null;
    this.lifts.clear();
    this.glueBubbles.length = 0;
    this.pickup = null;
    this.sun = null; this.sunRays = null;
    this.world.clear();
  }
}
