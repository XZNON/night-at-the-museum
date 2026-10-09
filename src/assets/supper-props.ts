import type { ArtId } from './manifest';
import type { SurfaceArt } from '../levels/royal-supper';

// Only presentation dimensions. All collision and timing stays in level/model.
export const supperPlatformArt: Partial<Record<SurfaceArt, ArtId>> = {
  basket: 'royal-supper.basket', bread: 'royal-supper.bread', plate: 'royal-supper.plate', goblet: 'royal-supper.plate',
  butter: 'royal-supper.butter', crumb: 'royal-supper.crumb', jelly: 'royal-supper.jelly',
};
export const supperPlatformOverrides: Record<string, ArtId> = {
  'dessert-0': 'royal-supper.cake', 'dessert-1': 'royal-supper.cake', 'dessert-2': 'royal-supper.cake',
};
// Cartoon rework (2026-10-09). `strip` skins draw a left cap, a whole number of
// repeated middle tiles and a right cap (ids `<id>-left`/`<id>-right`); `depth`
// draws the picture deeper than its collider, hanging below the landing top.
// `surface` is the share of the picture's height drawn above the walking line,
// measured on the cutouts (review fix, 2026-10-09): the drawn top edge (cake
// frosting under its strawberries, basket rim) sits on the collider top, with
// no code-drawn landing line.
export const supperSkins: Partial<Record<ArtId, { strip?: boolean; depth?: number; z?: number; surface?: number; stack?: number }>> = {
  'royal-supper.bread': { strip: true, surface: 0.012 },
  // Raised dishes: a stack of plates `stack` thick each (the platter's own
  // proportions), filling the 0.6 collider (user, review fixes 2026-10-09).
  'royal-supper.plate': { strip: true, surface: 0.03, stack: 0.24 },
  'royal-supper.butter': { strip: true, surface: 0.013 },
  'royal-supper.cake': { strip: true, surface: 0.176 },
  'royal-supper.basket': { depth: 2.4, surface: 0.025 },
  // In front of its dish, a little deeper than the thin bounce collider.
  'royal-supper.jelly': { depth: 0.6, z: 0.97, surface: 0.012 },
};
export const supperDinerPoses = {
  AWAY: 'royal-supper.diner', TURNING: 'royal-supper.diner-turn', LOOK: 'royal-supper.diner-look',
} as const satisfies Record<'AWAY' | 'TURNING' | 'LOOK', ArtId>;
export const supperPropPresentation = {
  // A giant guest seated behind the far table edge (the bust's flat foot rests
  // on it). Width follows each pose's proportions. Eyes are measured on the
  // LOOK pose, relative to the picture centre, scaled to this height.
  diner: { centreY: 5.3, height: 6.2, eyeY: 0.51 * 6.2 / 4.6, eyes: [-0.42 * 6.2 / 4.6, 0.19 * 6.2 / 4.6],
    gaze: { color: 0xffe7a0, opacity: 0.3, sourceWidth: 0.045, z: -0.8 } },
  // The far table edge sits a little below the route's ground (top 2.4); the
  // fill matches the darkened drape at the picture's foot.
  backdrop: { width: 26, tableY: 2.1, tableEdge: 0.76, fill: 0x1d1115 },
  // A gilt dish under each candle, posts to a crossbar and a centre stem
  // down to the drawn foot. Drawn behind the candles, never solid. Bars use
  // the gilt trim; posts the goblet stem slice, whose stem fills `stemShare`
  // of the picture's width.
  holder: { dish: 0.32, dishOverhang: 0.25, footHeight: 0.95, arm: 0.3, stemShare: 0.14 },
  // The feast table (review fix, 2026-10-09): ground runs (plate and butter
  // platforms at `groundTop`) are tablecloth hanging to `hemY`, below every
  // view; `tile` is one cloth picture's width (mirrored repeat), `fold` an end
  // fold's width. Behind everything standing on the table.
  table: { groundTop: 2.4, hemY: -2.9, tile: 26, fold: 0.97, z: -1 },
  // Goblet stands under floating pieces: cup width as a share of the piece's
  // width (clamped), the rim tucked `tuck` under the piece, the stem repeated
  // down to `bottom`, below every view and the fall line.
  stand: { share: 0.45, min: 1.4, max: 2.4, tuck: 0.12, bottom: -4.6, z: -1.5 },
  // Velvet tile width and gilded trim height on the candle canopy.
  canopy: { velvet: 2.6, trim: 0.36, z: 0.8 },
  // Share of the wax picture above the candle's landing top (its melted rim).
  wax: { surface: 0.035 },
  // While a flame is out: the wick's glow grows toward relight, and the flame
  // flickers back for the last `flicker` seconds (steady under reduced motion).
  wick: { height: 0.95, glow: 0xff9a3c, flicker: 0.45 },
  // Casseroles stand on the floor in front of the floor art (z), behind the
  // player, over a soft contact shadow; `foot` lowers the picture by its
  // transparent bottom margin so the drawn base touches the walking line.
  // While the player is HIDDEN behind one, it gains a warm halo and the player
  // falls into its shadow.
  cover: { z: 0.96, foot: 0.04, halo: 0xffd27a, shade: 0x8a8fae, shadow: 0x1d1115 },
  // The fork is drawn slimmer than its picture's proportions. Once it starts
  // to fall (`swap` of the topple) it shows the straightened bridge picture,
  // whose top edge lies on the bridge's landing top.
  fork: { width: 1.4, swap: 0.5 },
  fan: { diameter: 3.1 },
  // The drawn flame's width share of its hazard rect, and the soft heat glow
  // around it (spread over the rect, additive).
  flame: { width: 0.95, heat: 0xff9c44, heatSpread: 1.6, heatOpacity: 0.3 },
  flag: { height: 1, x: -0.45 },
} as const;
