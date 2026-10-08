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
import type { ArtId } from '../assets/manifest';
import { sketchDecor, sketchSkin, sketchSupports, sketchToolbox as TB, sketchTorch, sketchSkinPalette as P, sketchSkinSize as S } from '../assets/sketch-skins';

// Fully cartoon presentation: flat colour areas, simple cel-style shading and
// bold outlines. Mechanisms, ground, glue, lifts and nails wear skins cut from
// the approved references when they are loaded; every skin is sized from the
// collider, and a missing one falls back to the code-drawn placeholder.
// Gameplay-state cues (dashed outlines, rings, ghosts, lamps) stay in code.

// Sketch is its own world and must not share the banquet's moody palette.
const C = {
  sky: 0x5bb8f0, cloud: 0xf2fbff, paper: 0xf6efdc, ink: 0x2b2440,
  ground: 0xc98a52, groundTop: 0xe8b06a, glue: 0x6fd4bd,
  wall: 0xa9a0c4, wallTop: 0xc4bcd8,
  goal: 0xffd86b, goalDone: 0x8ef0a8, board: 0xf4b9c6, boardEdge: 0xffffff,
  axe: 0xe0576b, handle: 0x9a7550, socket: 0xa88fd8, site: 0xc6bce0,
  nailShaft: 0xe6dfcc, nailHead: 0xf6c445, nailCap: 0xf25f5c, hand: 0xffe27a,
  // Route-only cartoon palette: saturated bands so the picture pops (user
  // review 2026-10-08), each chosen to contrast its layer's mechanisms
  // (honey planks on violet, pink boards and red axes on mint, yellow
  // rulers and green glue on pink). The final backdrop replaces them later.
  rowA: 0xb69cff, rowB: 0x8fe3b0, rowC: 0xff9fca,
  guide: 0xb9aed6, guideEdge: 0x8d80b5, guideGlue: 0x9fd8cd,
  lift: 0x8f9fd6, liftTop: 0xfff0c2, rail: 0x6f7bb0, cab: 0x5a7fd6,
  suspension: 0x8b7cae, bracket: 0x6d5f96,
  // S4B nailable wood and the free-placement ghost.
  wood: 0xd99a5b, woodGrain: 0xa86a3a, track: 0x7d6aa8, ghostOk: 0x5fd38d, ghostBad: 0xf25f5c,
  // S5A placeholder torch and its enchanted light.
  torchWood: 0xa86a3a, torchCup: 0x6d5f96, lightCore: 0xfff6c9, lightHalo: 0x9ff0ff, lightSparkle: 0xc9b6ff,
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

/** Player picture poses; all share one canvas and foot baseline. */
export type PlayerPose = 'idle' | 'walk-a' | 'walk-b' | 'jump';

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
  private readonly poseTextures = new Map<PlayerPose, THREE.Texture>();
  private playerMaterial!: THREE.MeshBasicMaterial;
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
  /** S5A: the torch's enchanted light and its sparkles (they pulse and circle unless reduced motion). */
  private torchLight: THREE.Group | null = null;
  private sparkles: THREE.Group | null = null;
  /** S4L lifts: the moving deck, its lamp and the faint cab outline. */
  private readonly lifts = new Map<string, { deck: THREE.Group; lamp: THREE.MeshBasicMaterial; cab: THREE.Group; cue: THREE.Group; was: string; flashUntil: number;
    /** Skinned lifts only: the piston shaft stretched from its base to the deck. */
    piston?: { shaft: THREE.Mesh; base: number } }>();
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
  /**
   * Poses at the start of the latest fixed step. Moving parts are drawn
   * between that pose and the current one with the loop's alpha, like the
   * player and camera, so mechanisms never judder when a display frame sees
   * zero or two simulation steps.
   */
  private readonly before = new Map<string, { x: number; y: number; angle: number }>();
  private alpha = 1;
  /** The toolbox backdrop, when loaded; the whole route sits inside it. */
  private stage: THREE.Mesh | null = null;
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
    /** S5A: told once when the light is claimed. The owner decides what it means. */
    private readonly onLightClaimed: () => void = () => {},
    /** Optional walk/jump pictures; a missing pose falls back to the idle picture. */
    playerPoses: Partial<Record<Exclude<PlayerPose, 'idle'>, HTMLImageElement>> = {},
    /** Optional Sketch skins; each missing one keeps its code placeholder. */
    private readonly art: Partial<Record<ArtId, HTMLImageElement>> = {}) {
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
    // Inside the toolbox there is no sky: no sun or clouds behind it.
    const enclosed = mode.kind === 'route' && this.has(TB.id);
    const sun = new THREE.Group(); sun.position.set(-30, 18, -9); if (!enclosed) this.world.add(sun);
    this.disc(6.5, 6.5, 1, 0xffe27a, sun);
    this.disc(8.4, 8.4, 1, 0xfff3b8, sun).position.set(-1.4, 1.4, -0.2);
    for (let i = 0; i < (enclosed ? 0 : 7); i++) {
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
    if (mode.kind === 'route') this.buildTorch(mode.field);
    this.buildPlayer(playerImage, playerPoses);
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

  /**
   * Inside the toolbox a raised ledge is mounted on the back wall, not
   * floating: a soft contact shadow on the wall and two plum brackets under
   * it. Blocks standing on the box floor or on another block get neither.
   * Presentation only; nothing here collides.
   */
  private mountOnWall(s: Rect): void {
    const resting = s.y <= TB.floorY + 0.05 || this.field.solids.some(o => o !== s &&
      o.y < s.y && o.y + o.height >= s.y - 0.05 && o.x < s.x + s.width && o.x + o.width > s.x);
    const { drop, opacity } = sketchSupports.shadow;
    const shadow = this.slab(s.width + 0.3, s.height + 0.2, 0.05, C.ink, this.world, opacity, false);
    shadow.position.set(s.x + s.width / 2 + 0.15, s.y + s.height / 2 - drop, -7.5);
    if (resting) return;
    const { width, height } = sketchSupports.bracket;
    const xs = s.width < 2.4 ? [s.x + s.width / 2] : [s.x + Math.min(1, s.width * 0.2), s.x + s.width - Math.min(1, s.width * 0.2)];
    for (const x of xs) {
      const bracket = this.slab(width, height, 0.4, C.bracket, this.world);
      bracket.position.set(x, s.y - height / 2 + 0.05, -0.6);
      this.disc(0.07, 0.04, 10, C.ink, bracket).position.set(0, -height / 4, 0.25);
    }
  }

  /**
   * A tight ink border for a skinned block: a dark plate a hair larger than
   * the body, just behind its front face. The scaled edge outline of `slab`
   * overhangs long blocks, which a skin's own ink line makes redundant.
   */
  private inkBacking(body: THREE.Mesh, width: number, height: number): void {
    const plate = this.slab(width + 0.1, height + 0.06, 1.9, C.ink, body, 1, false);
    plate.position.z = -0.08;
  }

  // --- skins ----------------------------------------------------------------
  private readonly textures = new Map<ArtId, THREE.Texture>();
  private texture(id: ArtId): THREE.Texture | null {
    let texture = this.textures.get(id);
    if (!texture) {
      const image = this.art[id];
      if (!image) return null;
      texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
      this.textures.set(id, texture); this.resources.add(texture);
    }
    return texture;
  }
  private has(id: ArtId): boolean { return !!this.art[id]; }
  /** Natural width/height ratio of a skin. */
  private aspectOf(id: ArtId): number {
    const image = this.art[id];
    return image ? image.width / Math.max(1, image.height) : 1;
  }
  private skinMaterial(id: ArtId, opacity = 1): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({ map: this.texture(id), transparent: true, opacity, alphaTest: 0.03 });
    this.resources.add(material); return material;
  }

  /**
   * A skin plane of exactly width x height. With `slice`, the two end caps keep
   * the picture's own proportions along that axis and only the plain middle
   * stretches, so a board of any length keeps its rounded, inked ends.
   */
  private skin(id: ArtId, width: number, height: number, parent: THREE.Object3D,
    slice: 'x' | 'y' | null = null, opacity = 1, uv: [number, number, number, number] = [0, 0, 1, 1]): THREE.Mesh {
    const cap = 0.22;
    const along = slice === 'y' ? height : width;
    const across = slice === 'y' ? width : height;
    const imageRatio = slice === 'y' ? 1 / this.aspectOf(id) : this.aspectOf(id);
    const naturalCap = cap * imageRatio * across;
    const capWorld = slice ? Math.min(along * 0.35, naturalCap) : 0;
    // Short spans take narrower slices (the outer end of each cap, the centre
    // of the middle) instead of squeezing them, which would make the GPU pick
    // a blurry mip. Long spans stretch only the plain middle.
    const capU = cap * Math.min(1, capWorld / Math.max(1e-6, naturalCap));
    const middle = Math.max(0, along - 2 * capWorld);
    const half = (0.5 - cap) * Math.min(1, middle / Math.max(1e-6, (1 - 2 * cap) * imageRatio * across));
    const stops = slice
      ? [[-along / 2, 0], [-along / 2 + capWorld, capU], [-along / 2 + capWorld, 0.5 - half],
        [along / 2 - capWorld, 0.5 + half], [along / 2 - capWorld, 1 - capU], [along / 2, 1]]
      : [[-along / 2, 0], [along / 2, 1]];
    const positions: number[] = []; const uvs: number[] = []; const index: number[] = [];
    const [u0, v0, u1, v1] = uv;
    for (const [s, t] of stops) {
      for (const side of [-1, 1]) {
        const a = side * across / 2; const b = side < 0 ? 0 : 1;
        if (slice === 'y') { positions.push(a, s, 0); uvs.push(u0 + (u1 - u0) * b, v0 + (v1 - v0) * t); }
        else { positions.push(s, a, 0); uvs.push(u0 + (u1 - u0) * t, v0 + (v1 - v0) * b); }
      }
    }
    for (let i = 0; i < stops.length - 1; i++) {
      const k = i * 2;
      if (slice === 'y') index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      else index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index); this.resources.add(geometry);
    const mesh = new THREE.Mesh(geometry, this.skinMaterial(id, opacity));
    parent.add(mesh); return mesh;
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
    if (this.has(TB.id)) this.stage = this.buildToolbox(route);
    for (const region of route.layers) {
      // The toolbox carries its own zone colours, one per layer.
      if (this.stage) continue;
      const tone = ROW_TONES[region.layer - 1];
      const band = this.slab(region.bounds.width + 8, region.bounds.height, 1, tone, this.world, 1, false);
      this.center(band, region.bounds, -6.5);
      this.dashedRule(region.bounds.x, region.bounds.y + region.bounds.height, region.bounds.width + 8, -6);
      this.dashedRule(region.bounds.x, region.bounds.y, region.bounds.width + 8, -6);
      this.backdropProps(region.bounds, region.layer);
    }
    // A soft haze between rows stops the pale paper of one layer bleeding into
    // the next, which is what made the stacks read as separate screens.
    for (const region of this.stage ? [] : route.layers.slice(1)) {
      const haze = this.slab(region.bounds.width + 8, 0.6, 1, C.ink, this.world, 0.18, false);
      haze.position.set(region.bounds.x + region.bounds.width / 2, region.bounds.y + 0.1, -6.2);
    }
  }

  /**
   * Inside the open toolbox, pinned to the world (art pass part 2): one mesh
   * of picture patches. Rows: the box floor under Layer 1's ground, the honey
   * zone stretched over Layer 1, blue over Layer 2, then rose rising through
   * Layer 3 (a plain strip repeats so rivets keep their shape) to the lid.
   * Columns: both tool-crowded ends at the picture's own scale, the plain
   * middle stretched to the route's width. Presentation only.
   */
  private buildToolbox(route: SketchRoute): THREE.Mesh {
    const { width: W, height: H, scale, rows, cols } = TB;
    const left = Math.min(...route.layers.map(l => l.bounds.x)) - TB.margin;
    const right = Math.max(...route.layers.map(l => l.bounds.x + l.bounds.width));
    const x0 = left - cols.wallLeft / scale;
    const x3 = right + (W - cols.wallRight) / scale;
    const columns: [number, number, number, number][] = [
      [0, cols.plainLeft, x0, x0 + cols.plainLeft / scale],
      [cols.plainLeft, cols.plainRight, x0 + cols.plainLeft / scale, x3 - (W - cols.plainRight) / scale],
      [cols.plainRight, W, x3 - (W - cols.plainRight) / scale, x3],
    ];
    const [l1, l2, l3] = route.layers;
    const top = l3.bounds.y + l3.bounds.height;
    const strip = (rows.roseRepeat[1] - rows.roseRepeat[0]) / scale;
    const lidBottom = top + 2;
    // [row from, row to (picture, top-down), world y bottom, world y top]
    const bands: [number, number, number, number][] = [
      [rows.floor, H, TB.floorY - (H - rows.floor) / scale, TB.floorY],
      [rows.honeyTop, rows.floor, TB.floorY, l2.bounds.y],
      [rows.blueTop, rows.honeyTop, l2.bounds.y, l3.bounds.y],
      [rows.roseRepeat[1], rows.blueTop, l3.bounds.y, l3.bounds.y + (rows.blueTop - rows.roseRepeat[1]) / scale],
    ];
    for (let y = bands[3][3]; y < lidBottom - 1e-3; y += strip) {
      const h = Math.min(strip, lidBottom - y);
      bands.push([rows.roseRepeat[1] - h * scale, rows.roseRepeat[1], y, y + h]);
    }
    bands.push([0, rows.lidPart, lidBottom, lidBottom + rows.lidPart / scale]);
    void l1;
    const positions: number[] = []; const uvs: number[] = []; const index: number[] = [];
    for (const [u0, u1, xa, xb] of columns) {
      for (const [r0, r1, ya, yb] of bands) {
        const k = positions.length / 3;
        positions.push(xa, ya, 0, xb, ya, 0, xa, yb, 0, xb, yb, 0);
        uvs.push(u0 / W, 1 - r1 / H, u1 / W, 1 - r1 / H, u0 / W, 1 - r0 / H, u1 / W, 1 - r0 / H);
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index); this.resources.add(geometry);
    const material = new THREE.MeshBasicMaterial({ map: this.texture(TB.id) }); this.resources.add(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -8; this.world.add(mesh);
    // Beyond the picture: the toolbox's own red, never a sky.
    this.world.background = new THREE.Color(0x8e2a36);
    return mesh;
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
    if (sketchDecor.every(id => this.has(id))) {
      // Toolbox props from the approved decor sheet, washed out far behind
      // the play plane and kept inside their own row.
      for (let i = 0; i < 6; i++) {
        const id = sketchDecor[(i + layer * 2) % sketchDecor.length];
        const width = S.decor.width * (0.8 + ((i + layer) % 3) * 0.15);
        const height = width / this.aspectOf(id);
        const x = bounds.x + 3 + i * ((bounds.width - 6) / 5);
        const y = bounds.y + 0.6 + height / 2 + ((i * 5 + layer * 2) % 5) * Math.min(1.2, Math.max(0.4, bounds.height / 8));
        const prop = this.skin(id, width, height, this.world, null, S.decor.opacity);
        prop.position.set(x, Math.min(y, bounds.y + bounds.height - height / 2 - 0.4), -4.6);
        prop.rotation.z = (i % 2 === 0 ? 1 : -1) * (0.06 + i * 0.03);
        (prop.material as THREE.MeshBasicMaterial).depthWrite = false;
      }
      return;
    }
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
    // The paper strip at the top belongs to the open-sky placeholder only.
    if (!this.stage) {
      const backdrop = this.slab(this.field.bounds.width + 40, 2, 1, C.paper);
      backdrop.position.set(this.field.bounds.x + this.field.bounds.width / 2,
        this.field.bounds.y + this.field.bounds.height - 3, -7);
    }
    for (const s of this.field.solids) {
      // Bay bounds read as scenery walls so they never compete with platforms.
      const wall = /left|right|bound/.test(s.id);
      const bench = !wall && this.has(sketchSkin.groundTop);
      const mesh = this.slab(s.width, s.height, 2, wall ? C.wall : bench ? P.groundBody : C.ground, this.world, 1, !bench);
      this.center(mesh, s);
      if (bench) {
        this.inkBacking(mesh, s.width, s.height);
        if (this.stage) this.mountOnWall(s);
        // Workbench top board on the exact landing edge; the flat body below
        // continues its apron colour so blocks of any height tile straight.
        const top = this.skin(sketchSkin.groundTop, s.width + 0.12, Math.min(S.groundTop, s.height), mesh, 'x');
        top.position.set(0, s.height / 2 - Math.min(S.groundTop, s.height) / 2, 1.05);
        continue;
      }
      const lip = new THREE.Mesh(new THREE.BoxGeometry(s.width, 0.2, 2.2), this.flat(wall ? C.wallTop : C.groundTop));
      this.resources.add(lip.geometry);
      lip.position.set(0, s.height / 2, 0.08);
      mesh.add(lip);
    }
    for (const h of this.field.hazards) {
      const glueArt = this.texture(sketchSkin.glueTop);
      const mesh = this.slab(h.width, h.height, 2, glueArt ? P.glueBody : C.glue, this.world, 1, !glueArt);
      this.center(mesh, h, 0.2);
      if (glueArt) {
        this.inkBacking(mesh, h.width, h.height);
        // The pool's dripping surface, tiled along its whole width.
        glueArt.wrapS = THREE.RepeatWrapping;
        const tile = S.glueBand * this.aspectOf(sketchSkin.glueTop);
        const band = this.skin(sketchSkin.glueTop, h.width, S.glueBand, mesh, null, 1, [0, 0, h.width / tile, 1]);
        band.position.set(0, h.height / 2 + S.glueRise - S.glueBand / 2, 1.05);
        if (h.width >= S.glueBottle.minPool && this.has(sketchSkin.glueBottle)) {
          // The tipped bottle at the far end, pouring back into the pool.
          const w = S.glueBottle.width; const bh = w / this.aspectOf(sketchSkin.glueBottle);
          const bottle = this.skin(sketchSkin.glueBottle, w, bh, this.world);
          bottle.position.set(h.x + h.width - w / 2 + 0.2, h.y + h.height + bh / 2 - 0.35, -0.8);
          bottle.scale.x = -1;
        }
        continue;
      }
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
      const axeArt = this.has(sketchSkin.axeHead) && this.has(sketchSkin.axeHandle) && this.has(sketchSkin.axeBolt);
      if (m.kind === 'axe') {
        if (m.sweptBlade) {
          const mount = new THREE.Group(); mount.position.set(m.pivot.x, m.pivot.y, -0.6); this.world.add(mount);
          if (!axeArt) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), this.flat(C.bracket));
            this.resources.add(cap.geometry); mount.add(cap);
          }
          const post = this.slab(0.28, 2.2, 0.55, axeArt ? P.rod : C.handle, mount); post.position.y = 1.1;
          const points = Array.from({ length: 65 }, (_, i) => new THREE.Vector3(
            Math.cos(i * Math.PI / 32) * m.length, Math.sin(i * Math.PI / 32) * m.length, -0.15));
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineDashedMaterial({ color: C.axe, transparent: true, opacity: 0.3, dashSize: 0.15, gapSize: 0.25 });
          this.resources.add(geometry); this.resources.add(material);
          const sweep = new THREE.Line(geometry, material); sweep.computeLineDistances(); mount.add(sweep);
        }
        if (axeArt) {
          // The rig sits on the blade collider's centre; the pivot is half a
          // length toward local +y. The double-bit head covers the blade
          // rectangle, the handle runs to the pivot and the bolt caps it.
          const radius = m.length / 2;
          const handle = this.skin(sketchSkin.axeHandle, S.axeHandle, radius + 0.2, rig);
          handle.position.set(0, radius / 2 + 0.1, 0.1);
          const head = this.skin(sketchSkin.axeHead, m.length * S.axeHead.length, m.size.height * S.axeHead.thickness, rig, 'x');
          head.position.z = 0.3;
          const bolt = this.skin(sketchSkin.axeBolt, S.axeBolt, S.axeBolt / this.aspectOf(sketchSkin.axeBolt), rig);
          bolt.position.set(0, radius, 0.4);
        } else {
          const blade = this.slab(m.length, m.size.height, 0.5, C.axe, rig); void blade;
          const handle = this.slab(m.length, 0.32, 0.5, C.handle, rig);
          handle.position.set(0, m.size.height * 0.6, 0);
        }
      } else if (m.kind === 'mount') {
        const ring = this.disc(0.5, 0.17, 18, C.socket, rig);
        void ring;
        const post = this.slab(0.16, 1.1, 0.16, C.handle, rig);
        post.position.set(0, -0.75, 0);
      } else if (m.kind === 'site') {
        this.slab(0.46, 0.46, 0.46, C.site, rig);
      } else {
        const solid = new THREE.Group(); rig.add(solid);
        // Tall climbable boards are rulers, pendulums planks, the rest boards.
        const skinId = m.climbable ? sketchSkin.ruler : m.kind === 'pendulum' ? sketchSkin.plank : sketchSkin.board;
        if (this.has(skinId)) {
          this.skin(skinId, m.size.width, m.size.height, solid, m.climbable ? 'y' : 'x').position.z = 0.7;
        } else {
          const board = this.slab(m.size.width, m.size.height, 1.4, C.board, solid);
          const lip = new THREE.Mesh(new THREE.BoxGeometry(m.size.width, 0.24, 1.6), this.flat(C.boardEdge));
          this.resources.add(lip.geometry);
          lip.position.set(0, m.size.height / 2, 0.06);
          board.add(lip);
        }
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
      // Strip F is a yardstick and the moving bars are dowels.
      const woodId = surface.kind === 'foothold' ? sketchSkin.yardstick : sketchSkin.dowel;
      const woodArt = this.has(woodId);
      if (woodArt) {
        const wood = this.skin(woodId, length, 0.32, rig, 'x');
        wood.position.set(mid.x, mid.y, -0.1); wood.rotation.z = angle;
      } else {
        const plank = this.slab(length, 0.32, 0.7, C.wood, rig);
        plank.position.set(mid.x, mid.y, -0.45); plank.rotation.z = angle;
        const grains = Math.max(2, Math.round(length / 0.9));
        for (let i = 1; i < grains; i++) {
          const grain = this.slab(0.06, 0.2, 0.72, C.woodGrain, plank, 1, false);
          grain.position.set(-length / 2 + i * (length / grains), 0, 0.02);
        }
      }
      if (surface.kind === 'moving-swing') {
        // Hangers to a ceiling trolley; the track spans the full travel.
        const rise = 1.55;
        for (const end of [surface.from, surface.to]) {
          const hanger = this.slab(0.12, woodArt ? rise : 1.1, 0.12, woodArt ? P.hanger : C.suspension, rig);
          hanger.position.set(end.x, end.y + (woodArt ? rise / 2 : 0.7), -0.6);
        }
        const trolleyArt = woodArt && this.has(sketchSkin.trolley);
        if (trolleyArt) {
          // The wheel rides the track; the picture's rail line sits on it.
          const trolley = this.skin(sketchSkin.trolley, S.trolley * this.aspectOf(sketchSkin.trolley), S.trolley, rig);
          trolley.position.set(mid.x, mid.y + rise - S.trolley * 0.06, -0.5);
        } else {
          const trolley = this.slab(Math.abs(surface.to.x - surface.from.x) + 0.6, 0.36, 0.5, C.track, rig);
          trolley.position.set(mid.x, mid.y + 1.35, -0.6);
        }
        const y = m.centre.y + mid.y + rise;
        const x0 = m.centre.x + Math.min(0, m.travel.x) + Math.min(surface.from.x, surface.to.x) - 0.5;
        const x1 = m.centre.x + Math.max(0, m.travel.x) + Math.max(surface.from.x, surface.to.x) + 0.5;
        if (trolleyArt && this.has(sketchSkin.rail)) {
          this.skin(sketchSkin.rail, x1 - x0, S.rail, this.world, 'x').position.set((x0 + x1) / 2, y, -0.7);
        } else {
          const track = this.slab(x1 - x0, 0.16, 0.4, C.track, this.world, 0.85, false);
          track.position.set((x0 + x1) / 2, y, -0.7);
        }
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
    const rod = this.slab(0.16, m.length, 0.16, this.has(sketchSkin.plank) ? P.rod : C.suspension, this.world);
    rod.position.z = -0.4;
    this.rods.set(m.id, rod);
  }

  private buildTargets(): void {
    for (const t of this.field.targets) {
      const ring = this.disc(0.56, 0.13, 20, KIND_COLORS[t.kind] ?? 0xffffff, this.world);
      // A dark ink edge keeps the ring readable on any band colour.
      this.disc(0.56, 0.21, 20, C.ink, ring).position.z = -0.3;
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
    if (kind === 'foothold' && this.footNail(rig, size, 1.4)) return rig;
    if ((kind === 'fixed-swing' || kind === 'moving-swing') && this.has(sketchSkin.nailSide)) {
      // Side view turned so the head is the grab point and the shaft runs
      // into the socket bracket behind it.
      const length = S.nailSide;
      const nail = this.skin(sketchSkin.nailSide, length * this.aspectOf(sketchSkin.nailSide), length, rig);
      nail.rotation.z = Math.PI / 2; nail.position.set(length / 2 - 0.2, 0, 0.1);
      const bracket = this.slab(0.3, 0.8, 0.8, C.socket, rig);
      bracket.position.set(1.5, 0, -0.3);
      return rig;
    }
    if (kind !== 'foothold' && kind !== 'fixed-swing' && kind !== 'moving-swing' && this.has(sketchSkin.nailHead)) {
      // Driven into the picture along Z: only the round head faces the camera.
      this.skin(sketchSkin.nailHead, S.nailHead, S.nailHead, rig).position.z = 0.1;
      return rig;
    }
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
    if (kind === 'foothold' && this.footNail(rig, size, 0.9)) return rig;
    if (kind !== 'foothold' && this.has(sketchSkin.nailHead)) {
      this.skin(sketchSkin.nailHead, S.gripHead, S.gripHead, rig).position.z = 0.1;
      return rig;
    }
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

  /**
   * A foothold nail driven straight down: the side-view head is the standing
   * top (its top edge is the rig origin) and the shaft runs down into the
   * wood. False when the skins are missing.
   */
  private footNail(rig: THREE.Group, size: { width: number; height: number }, shaft: number): boolean {
    if (!this.has(sketchSkin.nailCap) || !this.has(sketchSkin.nailShaft)) return false;
    this.skin(sketchSkin.nailCap, size.width, size.height, rig, 'x').position.set(0, -size.height / 2, 0.1);
    this.skin(sketchSkin.nailShaft, S.footShaft, shaft, rig).position.set(0, -size.height - shaft / 2 + 0.05, 0);
    return true;
  }

  /** A loose cartoon nail lying in wait, side-on: shaft, head and a soft halo. */
  private buildPickup(): void {
    const p = this.field.nailPickup ??
      (this.mode.kind === 'route' ? this.mode.field.legs.find(l => l.settings?.nailPickup)?.settings?.nailPickup : undefined);
    this.pickupRect = p;
    if (!p) return;
    const rig = new THREE.Group();
    rig.position.set(p.x + p.width / 2, p.y + p.height / 2, 1.3);
    if (this.has(sketchSkin.nailPickup)) {
      // The approved pickup already leans and carries its sparkles and halo.
      this.skin(sketchSkin.nailPickup, S.pickup * this.aspectOf(sketchSkin.nailPickup), S.pickup, rig);
      rig.visible = this.model.nailPickup === p && !this.model.pickupCollected;
      this.world.add(rig);
      this.pickup = rig;
      return;
    }
    this.disc(0.5, 0.08, 28, C.goal, rig).position.z = -0.3;
    const shaft = this.slab(0.16, 0.8, 0.16, C.nailShaft, rig); shaft.position.y = -0.1;
    const head = this.slab(0.62, 0.18, 0.3, C.nailCap, rig); head.position.y = 0.36;
    rig.rotation.z = -0.35;
    rig.visible = this.model.nailPickup === p && !this.model.pickupCollected;
    this.world.add(rig);
    this.pickup = rig;
  }

  /**
   * S5A: a cartoon placeholder torch standing on the end ledge, holding an
   * enchanted light: a wooden handle and cup with a glowing orb, a soft halo
   * and a few sparkles circling it. Claiming the light empties the torch; the
   * torch stays. Faceless, like every Sketch gameplay asset. Final art is a
   * later task; nothing is loaded or generated here.
   */
  private buildTorch(route: SketchRoute): void {
    const light = route.light;
    if (!light) return;
    const torch = new THREE.Group();
    torch.position.set(light.x + light.width / 2, light.y, 1.3);
    const glow = new THREE.Group(); torch.add(glow);
    if (this.has(sketchSkin.torch)) {
      // The generated torch, standing on the ledge; the light sits in its cup.
      const h = sketchTorch.height;
      this.skin(sketchSkin.torch, h * this.aspectOf(sketchSkin.torch), h, torch).position.set(0, h / 2, -0.1);
      glow.position.y = h * sketchTorch.cup;
    } else {
      this.slab(0.22, 1, 0.22, C.torchWood, torch).position.y = 0.5;
      this.slab(0.6, 0.24, 0.34, C.torchCup, torch).position.y = 1.08;
      glow.position.y = 1.52;
    }
    const halo = new THREE.CircleGeometry(0.52, 32); this.resources.add(halo);
    const haloMesh = new THREE.Mesh(halo, this.flat(C.lightHalo, 0.45)); haloMesh.position.z = -0.05; glow.add(haloMesh);
    const orb = new THREE.CircleGeometry(0.3, 32); this.resources.add(orb);
    glow.add(new THREE.Mesh(orb, this.flat(C.lightCore)));
    this.disc(0.3, 0.04, 32, C.ink, glow).position.z = 0.02;
    const sparkles = new THREE.Group(); glow.add(sparkles);
    for (let i = 0; i < 4; i++) {
      const sparkle = this.slab(0.12, 0.12, 0.05, C.lightSparkle, sparkles, 1, false);
      const a = i / 4 * Math.PI * 2;
      sparkle.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.06);
      sparkle.rotation.z = Math.PI / 4;
    }
    glow.visible = !(this.model as SketchRouteModel).lightClaimed;
    this.world.add(torch);
    this.torchLight = glow; this.sparkles = sparkles;
  }

  private buildPlayer(playerImage: HTMLImageElement,
    poses: Partial<Record<Exclude<PlayerPose, 'idle'>, HTMLImageElement>>): void {
    // Every pose shares the idle canvas size and foot baseline, so swapping
    // the map never moves the picture relative to the collider.
    for (const pose of ['idle', 'walk-a', 'walk-b', 'jump'] as const) {
      const image = pose === 'idle' ? playerImage : poses[pose];
      if (!image) continue;
      const texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
      this.resources.add(texture);
      this.poseTextures.set(pose, texture);
    }
    const geometry = new THREE.PlaneGeometry(1, 1); this.resources.add(geometry);
    const material = new THREE.MeshBasicMaterial({ map: this.poseTextures.get('idle')!, transparent: true, alphaTest: 0.03 });
    this.playerMaterial = material;
    this.resources.add(material);
    const height = this.model.controller.body.height * 272 / 256;
    const sprite = new THREE.Mesh(geometry, material);
    sprite.scale.set(height * playerImage.width / playerImage.height, height, 1);
    sprite.position.set(0, height / 2, 1.4);
    // No collider box is drawn around the heroine; the picture alone reads.
    this.player.add(sprite);
    this.disc(0.3, 0.09, 14, C.hand, this.hand);
    this.hand.visible = false;
  }

  /**
   * An S4L vertical lift: with skins, the striped car-lift deck on a piston
   * (placeholder: an open shaft frame of rails and a beam with a thick deck),
   * the state lamp, and a faint ink cab outline that shows the
   * invisible walls only while they hold the rider. Collision lives in the
   * model; this only follows its live deck.
   */
  private buildLift(lift: SketchLift): void {
    const { deck } = lift;
    // The skinned car lift has no shaft frame (user review 2026-10-08): the
    // piston carries the deck. The placeholder keeps its rails and beam.
    if (!this.has(sketchSkin.liftDeck)) {
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
    }
    const group = new THREE.Group(); this.world.add(group);
    let piston: { shaft: THREE.Mesh; base: number } | undefined;
    if (this.has(sketchSkin.liftDeck)) {
      // Hydraulic car lift: the striped deck, a chrome piston that stretches
      // with the rise and its pump, both below walking level in the shaft.
      this.skin(sketchSkin.liftDeck, deck.width, S.liftDeck, group, 'x').position.set(0, -S.liftDeck / 2, 0.9);
      if (this.has(sketchSkin.liftPiston)) {
        // Inside the toolbox the piston stands on whatever is below the deck
        // (another block or the box floor); otherwise a short stub.
        const cxDeck = deck.x + deck.width / 2;
        const below = this.field.solids.filter(o => o.x <= cxDeck && o.x + o.width >= cxDeck && o.y + o.height <= deck.y + 0.01)
          .map(o => o.y + o.height);
        const base = this.stage ? Math.max(TB.floorY, ...below) : deck.y - S.pistonBase;
        const cx = deck.x + deck.width / 2;
        const capHeight = S.liftPiston / this.aspectOf(sketchSkin.liftPiston) * 0.08;
        this.skin(sketchSkin.liftPiston, S.liftPiston, capHeight, this.world, null, 1, [0, 0, 1, 0.08])
          .position.set(cx, base + capHeight / 2, -0.8);
        const shaft = this.skin(sketchSkin.liftPiston, S.liftPiston, 1, this.world, null, 1, [0, 0.1, 1, 0.9]);
        const rest = Math.max(0.01, deck.y + deck.height - S.liftDeck + 0.1 - base - capHeight);
        shaft.scale.y = rest; shaft.position.set(cx, base + capHeight + rest / 2, -0.85);
        piston = { shaft, base: base + capHeight };
        if (this.has(sketchSkin.liftPump)) {
          const ph = S.liftPump; const pw = ph * this.aspectOf(sketchSkin.liftPump);
          this.skin(sketchSkin.liftPump, pw, ph, this.world).position.set(cx + S.liftPiston / 2 + pw / 2 + 0.05, base + ph / 2, -1.2);
        }
      }
    } else {
      const slab = this.slab(deck.width, deck.height, 2.4, C.lift, group);
      slab.position.set(0, -deck.height / 2, 0);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(deck.width, 0.16, 2.5), this.flat(C.liftTop));
      this.resources.add(lip.geometry);
      lip.position.set(0, -0.08, 0.04);
      group.add(lip);
    }
    const lampMaterial = this.flat(C.goal);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), lampMaterial);
    this.resources.add(lamp.geometry);
    // On a skinned deck the state lamp sits over the painted amber lamp.
    lamp.position.set(0, piston || this.has(sketchSkin.liftDeck) ? -S.liftDeck / 2 : -deck.height / 2, 1.3);
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
    this.lifts.set(lift.id, { deck: group, lamp: lampMaterial, cab, cue, was: '', flashUntil: 0, piston });
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

  /** Read-only S5A torch readback (light shown, pulse scale, sparkle turn) for the review evidence. */
  lightView(): { lit: boolean; scale: number; sparkles: number } | null {
    return this.torchLight ? { lit: this.torchLight.visible, scale: this.torchLight.scale.x, sparkles: this.sparkles?.rotation.z ?? 0 } : null;
  }

  /** Read-only drawn mechanism positions (after interpolation), for the smoothness evidence. */
  drawnMechanisms(): { id: string; x: number; y: number }[] {
    return [...this.rigs].map(([id, rig]) => ({ id, x: rig.position.x, y: rig.position.y }));
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
    this.snapshotMotion();
    if (input.recallPressed) this.model.enqueue({ type: 'recall' });
    const boundary = `${this.routeModel?.legId}/${this.routeModel?.stage}`;
    const recovering = this.model.recoveryRemaining > 0;
    this.model.update(dt, input);
    if (this.routeModel && (boundary !== `${this.routeModel.legId}/${this.routeModel.stage}` ||
      input.restartPressed || recovering !== (this.model.recoveryRemaining > 0))) this.clearBoundaryInput();
    // The claim is reported once per scene life; a restored snapshot never reports.
    if (this.routeModel?.consumeLightClaim()) this.onLightClaimed();
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
  private snapshotMotion(): void {
    const keep = (key: string, x: number, y: number, angle = 0): void => {
      const pose = this.before.get(key);
      if (pose) { pose.x = x; pose.y = y; pose.angle = angle; } else this.before.set(key, { x, y, angle });
    };
    for (const v of this.model.mechanismView()) keep(`m:${v.id}`, v.x, v.y, v.angle);
    for (const v of this.model.targetViews()) keep(`t:${v.id}`, v.x, v.y);
    for (const g of this.model.grips) keep(`g:${g.id}`, g.x, g.y);
    if (this.routeModel) for (const v of this.routeModel.liftViews()) keep(`l:${v.id}`, v.deck.x, v.deck.y);
  }
  /** The drawn pose: between the step's start and now, or now when unknown. */
  private blended(key: string, x: number, y: number, angle = 0): { x: number; y: number; angle: number } {
    const pose = this.before.get(key); const k = this.alpha;
    return pose ? { x: lerp(pose.x, x, k), y: lerp(pose.y, y, k), angle: lerp(pose.angle, angle, k) } : { x, y, angle };
  }

  private refreshSurfaceHover(): void {
    this.surfaceHover = this.pointer && this.canvas && this.interactive && this.model.freePlacement
      ? this.pickSurface(this.pointer.x, this.pointer.y, this.canvas) : null;
  }
  render(alpha: number): void {
    this.alpha = alpha;
    if (!this.interactive && this.interactFrom > 0 && performance.now() >= this.interactFrom) this.setInteractive(true);
    const b = this.model.controller.body;
    this.player.position.set(THREE.MathUtils.lerp(this.previous.x, b.x, alpha) + b.width / 2,
      THREE.MathUtils.lerp(this.previous.y, b.y, alpha), 0);
    // Presentation only: mirror the picture toward travel so moving left never
    // reads as walking backwards. Collision is symmetric.
    if (Math.abs(b.vx) > 0.25) this.facing = b.vx > 0 ? 1 : -1;
    this.player.scale.x = this.facing;
    // Same pose rule as Royal Supper: airborne (including swings) jumps,
    // grounded travel alternates the two walk frames, otherwise idle.
    const pose: PlayerPose = !b.grounded ? 'jump' : Math.abs(b.vx) > 0.25 && !this.reducedMotion
      ? (Math.floor(this.elapsed * 9) % 2 ? 'walk-a' : 'walk-b') : 'idle';
    this.playerMaterial.map = this.poseTextures.get(pose) ?? this.poseTextures.get('idle')!;
    this.player.visible = this.model.recoveryRemaining <= 0;

    this.hand.visible = this.model.move.state === 'swing';
    if (this.hand.visible) {
      const grip = this.model.grips.find(g => g.id === this.model.move.swingTarget);
      if (grip) { const at = this.blended(`g:${grip.id}`, grip.x, grip.y); this.hand.position.set(at.x, at.y, 1.7); }
    }

    const views = this.model.mechanismView();
    for (const live of views) {
      const rig = this.rigs.get(live.id);
      const m = this.model.mechanism(live.id);
      if (!rig || !m) continue;
      const view = { ...live, ...this.blended(`m:${live.id}`, live.x, live.y, live.angle) };
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

    for (const live of this.model.targetViews()) {
      const view = { ...live, ...this.blended(`t:${live.id}`, live.x, live.y) };
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
    if (this.torchLight) {
      // Claimed, the torch stands empty. A gentle pulse and circling
      // sparkles while it holds the light; reduced motion keeps it still.
      this.torchLight.visible = !(this.model as SketchRouteModel).lightClaimed;
      this.torchLight.scale.setScalar(this.reducedMotion ? 1 : 1 + Math.sin(this.elapsed * 3) * 0.08);
      if (this.sparkles) this.sparkles.rotation.z = this.reducedMotion ? 0 : this.elapsed * 1.2;
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
    for (const live of this.model.targetViews()) {
      const t = this.model.target(live.id);
      if (!t || this.field.targets.includes(t)) continue;
      const view = { ...live, ...this.blended(`t:${live.id}`, live.x, live.y) };
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
      const deck = this.blended(`l:${view.id}`, view.deck.x, view.deck.y);
      rig.deck.position.set(deck.x + view.deck.width / 2 + shudder, deck.y + view.deck.height, 0);
      if (rig.piston) {
        // Presentation only: the shaft reaches the underside of the deck art.
        const length = Math.max(0.01, deck.y + view.deck.height - S.liftDeck + 0.1 - rig.piston.base);
        rig.piston.shaft.scale.y = length;
        rig.piston.shaft.position.y = rig.piston.base + length / 2;
      }
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
    this.torchLight = null; this.sparkles = null;
    this.world.clear();
  }
}
