import type { ArtId } from './manifest';
import type { SurfaceArt } from '../levels/royal-supper';

// Only presentation dimensions. All collision and timing stays in level/model.
export const supperPlatformArt: Partial<Record<SurfaceArt, { id: ArtId; lip: number }>> = {
  basket: { id: 'royal-supper.basket', lip: 0xe2b46e },
  bread: { id: 'royal-supper.bread', lip: 0xf3cf86 },
  plate: { id: 'royal-supper.plate', lip: 0xf1e6c8 },
  goblet: { id: 'royal-supper.plate', lip: 0xf1e6c8 },
  butter: { id: 'royal-supper.butter', lip: 0xfff0a8 },
  crumb: { id: 'royal-supper.crumb', lip: 0xf0c97a },
  jelly: { id: 'royal-supper.jelly', lip: 0xff8fa0 },
};
export const supperPlatformOverrides: Record<string, ArtId> = {
  'dessert-0': 'royal-supper.cake', 'dessert-1': 'royal-supper.cake', 'dessert-2': 'royal-supper.cake',
};
// Cartoon rework (2026-10-09). `strip` skins draw a left cap, a whole number of
// repeated middle tiles and a right cap (ids `<id>-left`/`<id>-right`); `depth`
// draws the picture deeper than its collider, hanging below the landing top.
export const supperSkins: Partial<Record<ArtId, { strip?: boolean; depth?: number; z?: number }>> = {
  'royal-supper.bread': { strip: true },
  'royal-supper.plate': { strip: true },
  'royal-supper.butter': { strip: true },
  'royal-supper.cake': { strip: true },
  'royal-supper.basket': { depth: 2.4 },
  // In front of its dish, a little deeper than the thin bounce collider.
  'royal-supper.jelly': { depth: 0.6, z: 0.97 },
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
  // A brass dish under each candle, posts to a crossbar and a centre stem
  // down to the drawn foot. Drawn behind the candles, never solid.
  holder: { dish: 0.28, dishOverhang: 0.25, footHeight: 0.95, arm: 0.24, brass: 0xd8a640, ink: 0x3a1626 },
  gobletArch: { height: 4 },
  // The fork is drawn slimmer than its picture's proportions; toppled, its
  // upper edge rises `top` above the bridge's landing top.
  fork: { width: 1.4, top: 0.05 },
  fan: { diameter: 3.1 },
  flame: { width: 0.95 },
  flag: { height: 1, x: -0.45 },
} as const;
