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
} as const satisfies Record<string, ArtId>;

/** Background toolbox props, scattered behind each layer band. */
export const sketchDecor: readonly ArtId[] = [
  'sketch.decor-tin', 'sketch.decor-pencil', 'sketch.decor-screwdriver',
  'sketch.decor-spanner', 'sketch.decor-tape', 'sketch.decor-screws',
];

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
