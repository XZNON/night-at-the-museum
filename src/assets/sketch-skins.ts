import type { ArtId } from './manifest';

// Sketch art pass, part 1: presentation only. Skins are cut locally from the
// user-approved DreamLayer references (scripts/prepare-sketch-skins.py) and are
// always sized from the typed level data; collision never reads their pixels.
// A missing skin falls back to the cartoon placeholder drawn in code.

/** Which skin draws each mechanism family. */
export const sketchSkin = {
  plank: 'sketch.plank',
  board: 'sketch.board',
  ruler: 'sketch.ruler',
  groundTop: 'sketch.ground-top',
  axeHead: 'sketch.axe-head',
  axeHandle: 'sketch.axe-handle',
  axeBolt: 'sketch.axe-bolt',
  liftDeck: 'sketch.lift-deck',
  liftPiston: 'sketch.lift-piston',
  liftPump: 'sketch.lift-pump',
  yardstick: 'sketch.yardstick',
  dowel: 'sketch.dowel',
  trolley: 'sketch.trolley',
  rail: 'sketch.rail',
  glueTop: 'sketch.glue-top',
  glueBottle: 'sketch.glue-bottle',
  nailHead: 'sketch.nail-head',
  nailCap: 'sketch.nail-cap',
  nailShaft: 'sketch.nail-shaft',
  nailSide: 'sketch.nail-side',
  nailPickup: 'sketch.nail-pickup',
  torch: 'sketch.torch',
} as const satisfies Record<string, ArtId>;

/** Background toolbox props, scattered behind each layer band. */
export const sketchDecor: readonly ArtId[] = [
  'sketch.decor-tin', 'sketch.decor-pencil', 'sketch.decor-screwdriver',
  'sketch.decor-spanner', 'sketch.decor-tape', 'sketch.decor-screws',
];

/**
 * Inside the open toolbox (2560 x 1440 picture). The whole route sits in it,
 * pinned to the world: the box floor under Layer 1's ground, the honey zone
 * behind Layer 1, blue behind Layer 2, rose behind Layer 3 and the lid above.
 * Picture rows/columns in pixels; `scale` is pixels per world unit for the
 * parts kept in proportion (the ends and the floor); the plain middle
 * stretches sideways and a plain rose strip repeats up the tall Layer 3.
 */
export const sketchToolbox = {
  id: 'sketch.toolbox' as ArtId, width: 2560, height: 1440, scale: 36,
  /** Floor ink line, zone changes, the lid line and the repeatable rose strip. */
  rows: { floor: 1266, honeyTop: 732, blueTop: 435, roseRepeat: [300, 420] as const, lidPart: 300 },
  /** Inner edges of the side walls and where the tool piles end. */
  cols: { wallLeft: 330, wallRight: 2233, plainLeft: 960, plainRight: 1740 },
  /** World y of the box floor (Layer 1's ground bottom) and the inner wall margin. */
  floorY: -2, margin: 1,
} as const;

/** Wall-mounted look for raised ledges: brackets and a soft contact shadow. */
export const sketchSupports = { bracket: { width: 0.28, height: 0.9 }, shadow: { drop: 0.3, opacity: 0.22 } } as const;

/** The torch picture's height in world units; the light sits over its cup. */
export const sketchTorch = { height: 1.7, cup: 0.86 } as const;

/** Flat colours sampled from the references for code-drawn continuations. */
export const sketchSkinPalette = {
  groundBody: 0xce7454,
  glueBody: 0x83d8b4,
  hanger: 0x8c6776,
  rod: 0xbd9ba9,
} as const;

/** World-unit presentation sizes; colliders keep their own level data. */
export const sketchSkinSize = {
  /** Workbench top board drawn over each ground block's top edge. */
  groundTop: 0.55,
  /** Glue surface band height and how far its drips rise above the pool top. */
  glueBand: 0.9, glueRise: 0.12,
  /** Bottle at the pool's far end, only beside a pool at least this wide. */
  glueBottle: { width: 3.2, minPool: 8 },
  /** Axe head drawn around the blade collider (factors of its length/thickness). */
  axeHead: { length: 1.05, thickness: 1.6 }, axeHandle: 0.34, axeBolt: 0.95,
  /** Lift deck art depth below the deck's top (the collider is 0.6). */
  liftDeck: 0.84, liftPiston: 0.42, pistonBase: 2.2, liftPump: 1.1,
  /** Nails: head-on pin, bar grip, side-view swing nail and pickup heights. */
  nailHead: 0.84, gripHead: 0.72, nailSide: 1.6, footShaft: 0.3, pickup: 1.5,
  /** Track and trolley above a moving bar. */
  rail: 0.22, trolley: 0.95,
  /** Background prop width range and opacity. */
  decor: { width: 3.2, opacity: 0.88 },
} as const;
