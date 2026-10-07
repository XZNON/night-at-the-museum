import type { Collider, Rect } from '../gameplay/collision';
import type { MovementTuning } from '../gameplay/controller';

// Typed authored data for the Sketch mechanics playground (Slice 1).
// Every ID here is stable so later layers can reuse names. This file holds no
// behaviour: mechanisms are evaluated in gameplay/sketch-model.ts.

export type SketchBayId = 'pins' | 'walls' | 'foothold' | 'fixed-swing' | 'moving-swing' | 'combined';

export const sketchBayIds: readonly SketchBayId[] =
  ['pins', 'walls', 'foothold', 'fixed-swing', 'moving-swing', 'combined'];

export const isSketchBayId = (value: string | null): value is SketchBayId =>
  !!value && (sketchBayIds as readonly string[]).includes(value);

/** Marked placement sites. Axes deliberately have no kind. */
export type TargetKind = 'freeze-platform' | 'foothold' | 'fixed-swing' | 'moving-swing';

export interface SketchTarget {
  id: string;
  kind: TargetKind;
  /** Mechanism whose transform the target follows. */
  mechanismId: string;
  /** Offset from that mechanism's current centre. */
  offset: { x: number; y: number };
  /** Size of the nail head produced when pinned. */
  size: { width: number; height: number };
  label: string;
}

/**
 * A nailable segment in its mechanism's local frame (S4B free placement). A
 * nail may go anywhere along it, never into empty air. The surface decides the
 * nail's role: a foothold strip grows a landable head, a swing bar a grip pivot
 * carried by the bar.
 */
export interface SketchNailSurface {
  id: string;
  kind: 'foothold' | 'moving-swing';
  mechanismId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
}

export type MechanismKind = 'site' | 'board' | 'mount' | 'pendulum' | 'axe';

export interface SketchMechanism {
  id: string;
  kind: MechanismKind;
  /** Shape centre at motion phase 0 (site: fixed anchor). */
  centre: { x: number; y: number };
  /** Board/mount travel from centre to centre + travel. */
  travel: { x: number; y: number };
  /** Pendulum/axe pivot. */
  pivot: { x: number; y: number };
  /** Pendulum bob distance, or axe blade length. */
  length: number;
  /** Pendulum half sweep in radians. */
  arc: number;
  period: number;
  phase: number;
  size: { width: number; height: number };
  /** Board/pendulum freeze when pinned. Mounts and axes never do. */
  freezable: boolean;
  /** Route outlines become solid only while pinned; omitted in reviewed S1 bays. */
  solidWhenPinned?: boolean;
  /** A pinned climbable board offers its sides for wall sliding. */
  climbable: boolean;
  hazard: boolean;
  /** Precise blade contact for the new route; reviewed S1 retains its bounds. */
  sweptBlade?: boolean;
  /** Layer 2 resumes a recalled board at its captured phase. */
  resumePhase?: boolean;
}

export interface SketchTuning {
  nailBudget: number;
  placementReach: number;
  /** Generous screen-space hit area around a valid target. */
  targetHitPixels: number;
  gripRadius: number;
  swing: {
    arm: number; pumpAccel: number; maxOmega: number; maxArc: number; damping: number; gravity: number;
    reattachCooldown: number; obstructionTolerance: number; momentumSeconds: number;
  };
  wall: {
    slideMaxFall: number; kickHorizontal: number; kickVertical: number;
    /** Seconds a kick holds horizontal input toward the far wall (0: none). */
    kickLock?: number;
    /** Seconds an early airborne Space is kept and fires as a kick on wall catch (0: none). */
    kickBuffer?: number;
    /** Seconds a fresh catch holds still before sliding (0: slides at once). */
    grip?: number;
  };
  recoverySeconds: number;
  cueSeconds: number;
}

export interface SketchCamera {
  /** World units of vertical view. Slice 1 bays frame one small play area. */
  viewHeight: number;
  minViewWidth: number;
  lookAhead: number;
  followRate: number;
}

/**
 * The authored shape every playable field shares. A Slice 1 bay and the S2
 * route differ only outside the nail ledger: a bay has one goal pad, the route
 * adds sections, checkpoints and a scripted escalator on top of this shape.
 */
export interface SketchPlayfieldData {
  id: string;
  name: string;
  hint: string;
  goal: string;
  spawn: { x: number; y: number };
  goalBounds: Rect;
  bounds: Rect;
  deathY: number;
  solids: Collider[];
  /** Static lethal surfaces (glue pools, the swing pit). */
  hazards: (Rect & { id: string })[];
  mechanisms: SketchMechanism[];
  targets: SketchTarget[];
  camera: SketchCamera;
  /** Field-specific wall feel; absent keeps the shared S1 tuning. */
  wall?: Partial<SketchTuning['wall']>;
  /** Field-specific placement reach; absent keeps the shared tuning. */
  placementReach?: number;
  /** One collectible extra nail; it raises the budget until the field restarts. */
  nailPickup?: Rect & { id: string };
  /** Free-placement surfaces; absent everywhere marked targets are used. */
  surfaces?: SketchNailSurface[];
}

export interface SketchBay extends SketchPlayfieldData {
  id: SketchBayId;
}

/** Development entry values for the save-isolated Sketch scene. */
export type SketchRouteId = 'layer-1' | 'layer-2' | 'layers-1-2' | 'layer-3-walls' | 'layer-3-swings';
export type SketchStudy = 'mechanics' | SketchRouteId;

export const sketchStudies: readonly SketchStudy[] = ['mechanics', 'layer-1', 'layer-2', 'layers-1-2', 'layer-3-walls', 'layer-3-swings'];

export const isSketchStudy = (value: string | null | undefined): value is SketchStudy =>
  !!value && (sketchStudies as readonly string[]).includes(value);

/** One vertically stacked layer region of the connected three-layer world. */
export interface SketchLayerRegion {
  id: string;
  layer: 1 | 2 | 3;
  label: string;
  bounds: Rect;
  /** Only the Layer 1 transfer and the Layer 2 arrival ground are playable. */
  playable: boolean;
}

export type SketchGuideKind =
  | 'row-floor' | 'row-ceiling' | 'board' | 'wall' | 'glue' | 'socket' | 'stair' | 'rail';

/**
 * Non-playable scenery for reserved content. Guides never carry a target,
 * hazard, collider or trigger; they exist so later rows read as neighbouring
 * layers of the same connected picture rather than as separate screens.
 */
export interface SketchGuide {
  id: string;
  kind: SketchGuideKind;
  layer: 1 | 2 | 3;
  rect: Rect;
}

/** The scripted escalator between two layers. No physics, no scene change. */
export interface SketchEscalator {
  id: string;
  /** Standing volume on the lower ground where E starts the ride. */
  boarding: Rect;
  /** Authored world-space path; traversed once over `duration` seconds. */
  path: { x: number; y: number }[];
  duration: number;
  /** Fixed safe ground at the top of the ride. */
  arrival: { x: number; y: number };
}

/** One authored section of the route with its own fall line and camera band. */
export interface SketchRouteSection {
  id: string;
  layer: 1 | 2 | 3;
  name: string;
  spawn: { x: number; y: number };
  /** A fall here recovers to this section, never below the whole world. */
  deathY: number;
  /** Active-layer focus band, in world units. */
  focus: { viewHeight: number; centreY: { min: number; max: number }; lookAhead?: number };
  travelDirection?: 1 | -1;
}

export type SketchRouteLegId = 'layer-1' | 'layer-2' | 'l3-walls' | 'l3-swings';

export interface SketchRouteLeg {
  id: SketchRouteLegId;
  nextLegId?: SketchRouteLegId;
  sectionId: string;
  targetIds: string[];
  /** Nailable surfaces this leg owns (S4B); absent means none. */
  surfaceIds?: string[];
  exitBounds: Rect;
  exitSpawn: { x: number; y: number };
  exitDeathY: number;
  escalator: SketchEscalator | null;
  arrivalSectionId: string | null;
}

export interface SketchRoute extends SketchPlayfieldData {
  id: SketchRouteId;
  entryLegId: SketchRouteLegId;
  layers: SketchLayerRegion[];
  guides: SketchGuide[];
  sections: Record<string, SketchRouteSection>;
  sectionOrder: string[];
  legs: SketchRouteLeg[];
}

const solid = (id: string, x: number, top: number, width: number, height = 1): Collider =>
  ({ id, x, y: top - height, width, height });
const bound = (id: string, x: number, top: number, width: number, height = 24): Collider =>
  ({ id, x, y: top - height, width, height });

const mechanism = (m: Partial<SketchMechanism> & Pick<SketchMechanism, 'id' | 'kind' | 'centre'>): SketchMechanism => ({
  travel: { x: 0, y: 0 }, pivot: { x: m.centre.x, y: m.centre.y }, length: 0, arc: 0,
  period: 6, phase: 0, size: { width: 3.4, height: 0.5 },
  freezable: false, climbable: false, hazard: false, ...m,
});

const target = (t: SketchTarget): SketchTarget => t;

export const sketchMovement: MovementTuning = {
  width: 0.65, height: 1.25, speed: 6.8, acceleration: 58, braking: 70,
  gravity: 25, jumpSpeed: 10.8, airJumpSpeed: 10.8, bounceSpeed: 17,
  slideAcceleration: 13, slideBraking: 2.2, slideSpeed: 9.2,
  coyoteTime: 0.1, jumpBuffer: 0.12, releaseMultiplier: 0.48, terminalSpeed: 28,
};

export const sketchTuning: SketchTuning = {
  nailBudget: 2,
  placementReach: 10,
  targetHitPixels: 46,
  gripRadius: 2,
  // The arc is bounded, as specified: no rope, no full rotation, no loop.
  swing: {
    arm: 1.6, pumpAccel: 20, maxOmega: 9, maxArc: 135 * Math.PI / 180,
    damping: 0.4, gravity: 25, reattachCooldown: 0.5, obstructionTolerance: 0.45, momentumSeconds: 1,
  },
  wall: { slideMaxFall: 4.2, kickHorizontal: 9, kickVertical: 11 },
  recoverySeconds: 0.35,
  cueSeconds: 3.2,
};

const camera = { viewHeight: 15, minViewWidth: 24, lookAhead: 3.5, followRate: 6 };

export const sketchBays: Record<SketchBayId, SketchBay> = {
  // 1 — Ledger, FIFO recall, freeze platforms, a moving mount and an active axe.
  pins: {
    id: 'pins', name: 'Bay 1 · Two nails, FIFO recall',
    hint: 'Left click a marked socket to drive a nail. Q recalls the OLDEST nail only. A full budget, a repeat click or an unmarked axe never changes the queue.',
    goal: 'Walk to the lit goal pad after exercising place and recall.',
    spawn: { x: 1, y: 0 }, goalBounds: { x: 25.5, y: 2.4, width: 9, height: 3 },
    bounds: { x: -6, y: -8, width: 48, height: 26 }, deathY: -4.5,
    solids: [
      solid('pins-ground', -2, 0, 24.5),
      solid('pins-step', 22.5, 1.2, 3, 1.6),
      solid('pins-goal', 25.5, 2.4, 9),
      bound('pins-left', -4, -1, 2), bound('pins-right', 36, -1, 2),
    ],
    hazards: [],
    mechanisms: [
      mechanism({ id: 'pins-board-a', kind: 'board', centre: { x: 8, y: 2.8 }, travel: { x: 0, y: 1.8 }, period: 6, freezable: true }),
      mechanism({ id: 'pins-board-b', kind: 'board', centre: { x: 13.5, y: 3.2 }, travel: { x: 0, y: 1.8 }, period: 5, phase: 2, freezable: true }),
      mechanism({ id: 'pins-board-c', kind: 'board', centre: { x: 19, y: 2.6 }, travel: { x: 0, y: 1.8 }, period: 4, phase: 1, freezable: true }),
      mechanism({ id: 'pins-mount', kind: 'mount', centre: { x: 17, y: 6.2 }, travel: { x: 3, y: 0 }, period: 5, size: { width: 1, height: 1 } }),
      mechanism({ id: 'pins-axe', kind: 'axe', centre: { x: 30, y: 8.6 }, pivot: { x: 30, y: 8.6 }, length: 3.4, period: 4.4, hazard: true, size: { width: 3.4, height: 0.7 } }),
      mechanism({ id: 'pins-site', kind: 'site', centre: { x: 4, y: 5.2 }, size: { width: 0, height: 0 } }),
    ],
    targets: [
      target({ id: 'pins-freeze-a', kind: 'freeze-platform', mechanismId: 'pins-board-a', offset: { x: 0, y: 0.5 }, size: { width: 1.1, height: 0.5 }, label: 'Freeze socket A' }),
      target({ id: 'pins-freeze-b', kind: 'freeze-platform', mechanismId: 'pins-board-b', offset: { x: 0, y: 0.5 }, size: { width: 1.1, height: 0.5 }, label: 'Freeze socket B' }),
      target({ id: 'pins-freeze-c', kind: 'freeze-platform', mechanismId: 'pins-board-c', offset: { x: 0, y: 0.5 }, size: { width: 1.1, height: 0.5 }, label: 'Freeze socket C' }),
      target({ id: 'pins-foothold', kind: 'foothold', mechanismId: 'pins-site', offset: { x: 0, y: 0 }, size: { width: 1.9, height: 0.35 }, label: 'Foothold site' }),
      target({ id: 'pins-moving', kind: 'moving-swing', mechanismId: 'pins-mount', offset: { x: 0, y: 0 }, size: { width: 0.8, height: 0.8 }, label: 'Moving swing socket' }),
    ],
    camera,
  },

  // 2 — Pinned climb boards: wall slide, wall kick and FIFO reuse.
  walls: {
    id: 'walls', name: 'Bay 2 · Pinned walls & wall kicks',
    hint: 'Pinned boards stop moving and their sides become climb walls. A wall owns your height: no air jump while you cling, so climb by kicking back and forth between two boards. Kicking twice from the same board is refused until you touch another pinned board or land on ground.',
    goal: 'Climb A → B → C and reach the high ledge.',
    spawn: { x: 1, y: 0 }, goalBounds: { x: 28.5, y: 9.6, width: 9, height: 3 },
    bounds: { x: -6, y: -6, width: 46, height: 22 }, deathY: -3.5,
    solids: [
      solid('walls-ground', -2, 0, 14),
      solid('walls-step', 10, 2.2, 2.6, 2.4),
      solid('walls-goal', 28.5, 9.6, 9, 1.2),
      bound('walls-left', -4, -1, 2), bound('walls-right', 39, -1, 2),
    ],
    hazards: [],
    mechanisms: [
      mechanism({ id: 'walls-board-a', kind: 'board', centre: { x: 13.5, y: 2.6 }, travel: { x: 0, y: 4 }, period: 7, size: { width: 2.2, height: 4.4 }, freezable: true, climbable: true }),
      mechanism({ id: 'walls-board-b', kind: 'board', centre: { x: 19, y: 4 }, travel: { x: 0, y: 4 }, period: 6, phase: 3, size: { width: 2.2, height: 4.4 }, freezable: true, climbable: true }),
      mechanism({ id: 'walls-board-c', kind: 'board', centre: { x: 24.5, y: 5.4 }, travel: { x: 0, y: 4 }, period: 5, phase: 1.5, size: { width: 2.2, height: 4.4 }, freezable: true, climbable: true }),
    ],
    targets: [
      target({ id: 'walls-freeze-a', kind: 'freeze-platform', mechanismId: 'walls-board-a', offset: { x: 0, y: 2.2 }, size: { width: 1, height: 0.4 }, label: 'Climb board A' }),
      target({ id: 'walls-freeze-b', kind: 'freeze-platform', mechanismId: 'walls-board-b', offset: { x: 0, y: 2.2 }, size: { width: 1, height: 0.4 }, label: 'Climb board B' }),
      target({ id: 'walls-freeze-c', kind: 'freeze-platform', mechanismId: 'walls-board-c', offset: { x: 0, y: 2.2 }, size: { width: 1, height: 0.4 }, label: 'Climb board C' }),
    ],
    camera,
  },

  // 3 — Foothold nail heads above a glue pool.
  foothold: {
    id: 'foothold', name: 'Bay 3 · Foothold nail heads',
    hint: 'A foothold site grows a real, landable nail head. Touching glue retries the bay. Recall a nail and its head disappears with it — including from under you.',
    goal: 'Chain foothold A → B → C and drop onto the far ledge.',
    spawn: { x: 1, y: 0 }, goalBounds: { x: 32, y: 0.6, width: 9, height: 3 },
    bounds: { x: -6, y: -8, width: 50, height: 22 }, deathY: -2.4,
    solids: [
      solid('foothold-ground', -2, 0, 13),
      solid('foothold-step', 9.5, 2.2, 2.6, 2.4),
      solid('foothold-goal', 32, 0.6, 9),
      bound('foothold-left', -4, -1, 2), bound('foothold-right', 43, -1, 2),
    ],
    hazards: [{ id: 'foothold-glue', x: 12.6, y: -0.6, width: 18.8, height: 1.2 }],
    mechanisms: [
      mechanism({ id: 'foothold-site-a', kind: 'site', centre: { x: 17.5, y: 4.6 }, size: { width: 0, height: 0 } }),
      mechanism({ id: 'foothold-site-b', kind: 'site', centre: { x: 23.5, y: 5.2 }, size: { width: 0, height: 0 } }),
      mechanism({ id: 'foothold-site-c', kind: 'site', centre: { x: 28, y: 3.4 }, size: { width: 0, height: 0 } }),
    ],
    targets: [
      target({ id: 'foothold-a', kind: 'foothold', mechanismId: 'foothold-site-a', offset: { x: 0, y: 0 }, size: { width: 1.9, height: 0.35 }, label: 'Foothold A' }),
      target({ id: 'foothold-b', kind: 'foothold', mechanismId: 'foothold-site-b', offset: { x: 0, y: 0 }, size: { width: 1.9, height: 0.35 }, label: 'Foothold B' }),
      target({ id: 'foothold-c', kind: 'foothold', mechanismId: 'foothold-site-c', offset: { x: 0, y: 0 }, size: { width: 1.9, height: 0.35 }, label: 'Foothold C' }),
    ],
    camera,
  },

  // 4 — Direct swing on a fixed pivot. No rope.
  'fixed-swing': {
    id: 'fixed-swing', name: 'Bay 4 · Fixed-pivot nail swing',
    hint: 'Click the fixed socket, then run off the ledge and jump so your hands reach the nail, and press E to grab it. Hold A or D to build momentum on the arc. Space or E releases with that momentum. There is no rope.',
    goal: 'Release onto the far ledge, then again with the second socket.',
    spawn: { x: 1, y: 0 }, goalBounds: { x: 24, y: 4, width: 11, height: 3 },
    bounds: { x: -6, y: -8, width: 48, height: 26 }, deathY: -2.4,
    solids: [
      solid('fixed-ground', -2, 0, 11),
      solid('fixed-launch', 7, 2.2, 6.5, 2.4),
      solid('fixed-ledge', 24, 4, 11, 2),
      bound('fixed-left', -4, -1, 2), bound('fixed-right', 37, -1, 2),
    ],
    hazards: [{ id: 'fixed-pit', x: 13.5, y: -3, width: 10.5, height: 3.2 }],
    mechanisms: [
      mechanism({ id: 'fixed-socket', kind: 'site', centre: { x: 16.5, y: 5.2 }, size: { width: 0.8, height: 0.8 } }),
      mechanism({ id: 'fixed-socket-2', kind: 'site', centre: { x: 21, y: 6 }, size: { width: 0.8, height: 0.8 } }),
    ],
    targets: [
      target({ id: 'fixed-nail', kind: 'fixed-swing', mechanismId: 'fixed-socket', offset: { x: 0, y: 0 }, size: { width: 0.8, height: 0.8 }, label: 'Fixed swing socket' }),
      target({ id: 'fixed-nail-2', kind: 'fixed-swing', mechanismId: 'fixed-socket-2', offset: { x: 0, y: 0 }, size: { width: 0.8, height: 0.8 }, label: 'Second fixed socket' }),
    ],
    camera,
  },

  // 5 — Moving mount carries the nail; release inherits pivot velocity.
  'moving-swing': {
    id: 'moving-swing', name: 'Bay 5 · Moving-mount nail swing',
    hint: 'A moving swing socket never freezes and carries its nail along the authored path. Release velocity adds the mount’s own motion, so the timing of your release matters.',
    goal: 'Transfer between the two moving mounts and land on the far ledge.',
    spawn: { x: 1, y: 0 }, goalBounds: { x: 30, y: 4, width: 12, height: 3 },
    bounds: { x: -6, y: -8, width: 52, height: 26 }, deathY: -2.4,
    solids: [
      solid('moving-ground', -2, 0, 11),
      solid('moving-launch', 6, 2.2, 6.5, 2.4),
      solid('moving-ledge', 30, 4, 12, 2),
      bound('moving-left', -4, -1, 2), bound('moving-right', 44, -1, 2),
    ],
    hazards: [{ id: 'moving-pit', x: 12.5, y: -3, width: 17.5, height: 3.2 }],
    mechanisms: [
      mechanism({ id: 'moving-mount-a', kind: 'mount', centre: { x: 16.5, y: 5.2 }, travel: { x: 5, y: 0 }, period: 5, size: { width: 1, height: 1 } }),
      mechanism({ id: 'moving-mount-b', kind: 'mount', centre: { x: 24.5, y: 6 }, travel: { x: 4, y: 0 }, period: 4, phase: 2, size: { width: 1, height: 1 } }),
    ],
    targets: [
      target({ id: 'moving-nail', kind: 'moving-swing', mechanismId: 'moving-mount-a', offset: { x: 0, y: 0 }, size: { width: 0.8, height: 0.8 }, label: 'Moving socket A' }),
      target({ id: 'moving-nail-2', kind: 'moving-swing', mechanismId: 'moving-mount-b', offset: { x: 0, y: 0 }, size: { width: 0.8, height: 0.8 }, label: 'Moving socket B' }),
    ],
    camera,
  },

  // 6 — Two-nail demonstration: foothold → fixed swing → new foothold.
  combined: {
    id: 'combined', name: 'Bay 6 · Foothold → swing → foothold',
    hint: 'Two nails only. Nail 1 drives foothold A, nail 2 drives the fixed swing socket. Press E to grab it, then press Q: the OLDEST nail (the foothold) is recalled, freeing one to grow foothold B ahead. Release onto it.',
    goal: 'Release the swing onto foothold B and reach the goal pad.',
    spawn: { x: 1, y: 0 }, goalBounds: { x: 32, y: 0.4, width: 9, height: 3 },
    bounds: { x: -6, y: -8, width: 50, height: 24 }, deathY: -2.4,
    solids: [
      solid('combined-ground', -2, 0, 11),
      solid('combined-step', 8.5, 2.2, 3, 2.4),
      solid('combined-goal', 32, 0.4, 9),
      bound('combined-left', -4, -1, 2), bound('combined-right', 43, -1, 2),
    ],
    hazards: [{ id: 'combined-glue', x: 11.6, y: -0.6, width: 20.3, height: 1.2 }],
    mechanisms: [
      mechanism({ id: 'combined-site-a', kind: 'site', centre: { x: 15.5, y: 4.6 }, size: { width: 0, height: 0 } }),
      mechanism({ id: 'combined-socket', kind: 'site', centre: { x: 21, y: 8.4 }, size: { width: 0.8, height: 0.8 } }),
      mechanism({ id: 'combined-site-b', kind: 'site', centre: { x: 27, y: 4.2 }, size: { width: 0, height: 0 } }),
    ],
    targets: [
      target({ id: 'combined-foothold-a', kind: 'foothold', mechanismId: 'combined-site-a', offset: { x: 0, y: 0 }, size: { width: 1.9, height: 0.35 }, label: 'Foothold A' }),
      target({ id: 'combined-socket', kind: 'fixed-swing', mechanismId: 'combined-socket', offset: { x: 0, y: 0 }, size: { width: 0.8, height: 0.8 }, label: 'Fixed swing socket' }),
      target({ id: 'combined-foothold-b', kind: 'foothold', mechanismId: 'combined-site-b', offset: { x: 0, y: 0 }, size: { width: 1.9, height: 0.35 }, label: 'Foothold B' }),
    ],
    camera,
  },
};

export const sketchBayList: SketchBay[] = sketchBayIds.map(id => sketchBays[id]);
