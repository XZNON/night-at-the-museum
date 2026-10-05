import type { ArtId } from './manifest';
import type { SurfaceArt } from '../levels/royal-supper';

// Only presentation dimensions. All collision and timing stays in level/model.
export const supperPlatformArt: Partial<Record<SurfaceArt, { id: ArtId; lip: number; tileWidth?: number }>> = {
  basket: { id: 'royal-supper.basket', lip: 0xc89850 },
  bread: { id: 'royal-supper.bread', lip: 0xd8ac69 },
  plate: { id: 'royal-supper.plate', lip: 0xd9b979, tileWidth: 8 },
  goblet: { id: 'royal-supper.plate', lip: 0xcba254 },
  butter: { id: 'royal-supper.butter', lip: 0xffe18a, tileWidth: 6 },
  crumb: { id: 'royal-supper.crumb', lip: 0xb58243 },
  jelly: { id: 'royal-supper.jelly', lip: 0xeb83bd },
};
export const supperPlatformOverrides: Record<string, ArtId> = {
  'dessert-0': 'royal-supper.cake', 'dessert-1': 'royal-supper.cake', 'dessert-2': 'royal-supper.cake',
};
export const supperPropPresentation = {
  diner: { centreY: 8.7, height: 4.8, width: 7.08, eyeY: 0.78, eyeX: 0.38,
    gaze: { color: 0xffe7a0, opacity: 0.3, sourceWidth: 0.045, z: -0.8 } },
  fork: { width: 1.2 },
  fan: { diameter: 3.1 },
  holder: { widthPerCupSpan: 658 / 516 },
  gobletArch: { height: 4, width: 2.8 },
} as const;
