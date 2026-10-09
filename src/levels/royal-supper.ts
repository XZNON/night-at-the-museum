import type { Collider, Rect } from '../gameplay/collision';
import type { MovementTuning } from '../gameplay/controller';

export type CheckpointId = 'basket-start' | 'before-butter' | 'after-butter' | 'before-fork' | 'after-fork' | 'after-candle' | 'after-diner';
export type ForkState = 'upright' | 'toppling' | 'bridged';
export type Gate = 'fork';
export type SurfaceArt = 'bread' | 'basket' | 'plate' | 'goblet' | 'candle' | 'bridge' | 'ceiling' | 'bound' | 'butter' | 'crumb' | 'jelly';
export interface PlatformDefinition extends Collider { art: SurfaceArt; gate?: Gate }
export interface Checkpoint { id: CheckpointId; spawn: { x: number; y: number }; trigger: Rect; requires?: Gate }
export interface InteractionDefinition { id: 'fork-bridge'; triggerBounds: Rect; duration: number; label: string }
export interface RoyalSupperLevel {
  id: 'royal-supper'; pieceId: 'golden-pear'; tuning: MovementTuning;
  bounds: Rect; deathY: number; recoverySeconds: number;
  camera: { minViewWidth: number; viewHeight: number; lookAhead: number; followRate: number; y: number };
  platforms: PlatformDefinition[]; checkpoints: Checkpoint[];
  sections: { start: number; name: string; hint: string }[];
  fork: InteractionDefinition & { pivot: { x: number; y: number }; length: number };
  candle: { id: 'candle-flame'; period: number; safeSeconds: number; flames: (Rect & { offAt: number })[]; fan: { x: number; y: number };
    holder: { baseY: number; crossbarY: number; waxBaseY: number } };
  grapes: { startX: number; endX: number; y: number; radius: number; speed: number; period: number; offsets: number[]; approachSeconds: number; approachHeight: number;
    wakeX: number; preroll: number };
  diner: { zone: Rect; cover: (Rect & { id: string })[]; away: number; warning: number; look: number };
  pear: Rect;
}
const platform = (id: string, x: number, top: number, width: number, art: SurfaceArt = 'plate', height = 0.6): PlatformDefinition =>
  ({ id, x, y: top - height, width, height, art });
const checkpoint = (id: CheckpointId, x: number, top = 2.4, requires?: Gate): Checkpoint =>
  ({ id, spawn: { x, y: top }, trigger: { x: x - 0.2, y: top - 0.1, width: 2.8, height: 1.8 }, requires });

// Each checkpoint ends a whole challenge. No mid-fan, watched-run or ascent save.
export const royalSupper: RoyalSupperLevel = {
  id: 'royal-supper', pieceId: 'golden-pear',
  tuning: { width: 0.65, height: 1.25, speed: 6.8, acceleration: 58, braking: 70,
    gravity: 25, jumpSpeed: 10.8, airJumpSpeed: 10.8, bounceSpeed: 17,
    slideAcceleration: 13, slideBraking: 2.2, slideSpeed: 9.2, coyoteTime: 0.1, jumpBuffer: 0.12,
    releaseMultiplier: 0.48, terminalSpeed: 28 },
  bounds: { x: -1, y: -10, width: 441, height: 70 }, deathY: -4, recoverySeconds: 0.35,
  camera: { minViewWidth: 21, viewHeight: 13, lookAhead: 4, followRate: 6, y: 4 },
  sections: [
    { start: 0, name: 'Bread basket & crockery', hint: 'Hold Space for height. Release and press again for one air jump.' },
    { start: 99, name: 'Butter & crumbs', hint: 'Faster slides carry through jumps. Touching a crumb retries this section.' },
    { start: 164, name: 'Rolling grapes', hint: 'Watch the regular pairs. Jump over grapes; the higher dishes are safe.' },
    { start: 260, name: 'The fork bridge', hint: 'The gap is too wide. E topples the fork; wait until it settles.' },
    { start: 285, name: 'Fan & three candles', hint: 'Follow the fan: hop onto each smoking candle before its wick flickers alight.' },
    { start: 317, name: 'The watchful diner', hint: 'Three crossings get longer. Hide fully behind a casserole; it glows while you are safe.' },
    { start: 374, name: 'Jelly & dessert ascent', hint: 'Bounce up, cross the cake shelf, then drop to the second jelly for the final rise.' },
  ],
  platforms: [
    platform('basket', 0, 0, 5, 'basket'),
    platform('bread-one', 6.5, 1.4, 3.5, 'bread', 1.4),
    platform('bread-two', 12.5, 4.2, 3.5, 'bread', 1.5),
    platform('bread-three', 19, 2.4, 4, 'bread', 1.4),
    platform('bread-four', 26, 5.3, 3.5, 'bread', 1.6),
    platform('bread-five', 33, 3.2, 4, 'bread', 1.4),
    platform('bread-six', 40, 6, 3.5, 'bread', 1.5),
    ...Array.from({ length: 6 }, (_, i) => platform(`bread-upper-${i}`, 47 + i * 6.5, [3.2, 6, 3.2, 6, 3.2, 6][i], 3.5, 'bread', 1.5)),
    platform('crockery', 86, 2.4, 13), platform('goblet-arch', 90, 4.5, 4, 'goblet'),
    platform('butter-intro', 99, 2.4, 17, 'butter'), platform('butter-middle', 119, 2.4, 19, 'butter'),
    platform('butter-end', 141, 2.4, 18, 'butter'),
    ...[{ x: 105, width: 1.1, height: 0.85 }, { x: 112, width: 1.3, height: 1.45 },
      { x: 124, width: 1.2, height: 1.1 }, { x: 134, width: 1.8, height: 0.7 },
      { x: 145, width: 1, height: 1.6 }, { x: 154, width: 1.5, height: 1 }]
      .map((c, i) => platform(`crumb-${i}`, c.x, 2.4 + c.height, c.width, 'crumb', c.height)),
    platform('butter-exit', 161, 2.4, 8), platform('grape-run', 168, 2.4, 92),
    ...[177, 191, 205, 219, 233, 247].map((x, i) => platform(`grape-dish-${i}`, x, 4.2 + (i % 2) * 0.8, 3.4)),
    platform('fork-bank', 260, 2.4, 6), platform('grape-chute', 258, 9, 2, 'goblet', 4.4),
    { ...platform('fork-bridge', 266, 2.4, 16, 'bridge', 0.25), gate: 'fork' },
    platform('fork-far-dish', 282, 2.4, 14),
    // Three separated tops: real pits between the arms require jumps. Deep
    // bodies block undercuts; the raised canopy permits jumps, not a roof route.
    ...[296, 302, 308].map((x, i) => platform(`candle-body-${i}`, x, 3.2, 3, 'candle', 13.2)),
    platform('candle-canopy', 292, 16, 23, 'ceiling', 9), platform('after-candle-dish', 315, 2.4, 59),
    platform('dessert-entry', 374, 2.4, 6), platform('jelly-launch', 376, 2.65, 3, 'jelly', 0.25),
    platform('dessert-0', 386, 8, 5, 'bread', 1.2),
    platform('dessert-1', 395, 10.8, 5, 'bread', 1.2),
    platform('dessert-shelf', 403, 10.8, 7, 'plate'),
    platform('dessert-drop', 412, 7.8, 6, 'plate'), platform('jelly-finale', 414, 8.05, 3, 'jelly', 0.25),
    platform('dessert-2', 423, 13.4, 5, 'bread', 1.2),
    platform('kings-plate', 432, 15.6, 6),
    { id: 'left-bound', x: -2, y: -10, width: 2, height: 70, art: 'bound' },
    { id: 'right-bound', x: 438, y: -10, width: 2, height: 70, art: 'bound' },
  ],
  checkpoints: [checkpoint('basket-start', 1.2, 0), checkpoint('before-butter', 96), checkpoint('after-butter', 163),
    checkpoint('before-fork', 262), checkpoint('after-fork', 283.5, 2.4, 'fork'), checkpoint('after-candle', 316), checkpoint('after-diner', 372)],
  fork: { id: 'fork-bridge', triggerBounds: { x: 262, y: 2.3, width: 4, height: 1.8 }, duration: 0.85,
    label: 'Topple fork', pivot: { x: 266, y: 2.4 }, length: 16 },
  candle: { id: 'candle-flame', period: 11, safeSeconds: 2,
    flames: [296, 302, 308].map((x, i) => ({ x, y: 3.2, width: 3, height: 3.8, offAt: 2 + i * 1.1 })), fan: { x: 292, y: 8.3 },
    holder: { baseY: -2.2, crossbarY: -0.4, waxBaseY: 0.4 } },
  // Grapes (user, review fixes 2026-10-09): a continuous, denser stream of
  // ground pairs, already rolling across the whole run when the player gets
  // there. The clock wakes at the butter (out of sight of the run) with
  // `preroll` seconds already rolled: on an after-butter retry the last pair
  // has just left the entry. Pairs still drop out of the chute and roll off
  // at the entry (endX), never reaching the checkpoint.
  grapes: { startX: 259, endX: 168, y: 2.4, radius: 0.55, speed: 4.2, period: 3.5, offsets: [0, 1.4], approachSeconds: 1.3, approachHeight: 3.6,
    wakeX: 99, preroll: 23.1 },
  diner: { zone: { x: 320, y: 2.4, width: 50, height: 30 }, away: 2.4, warning: 0.85, look: 2,
    cover: [{ id: 'cover-0', x: 320, y: 2.4, width: 4.8, height: 1.9 },
      { id: 'cover-1', x: 333, y: 2.4, width: 4.4, height: 1.9 },
      { id: 'cover-2', x: 348, y: 2.4, width: 4, height: 1.9 }] },
  pear: { x: 435, y: 15.6, width: 1.25, height: 1.65 },
};
export const movementLane: RoyalSupperLevel = {
  ...royalSupper, bounds: { x: -1, y: -4, width: 40, height: 20 },
  platforms: [platform('lane-floor', 0, 0, 38), platform('lane-high', 10, 4, 3, 'bread'),
    platform('lane-jelly', 20, 0.25, 3, 'jelly', 0.25), platform('lane-bounce-target', 29, 6, 5),
    { id: 'lane-left', x: -2, y: -4, width: 2, height: 25, art: 'bound' }, { id: 'lane-right', x: 38, y: -4, width: 2, height: 25, art: 'bound' }],
  checkpoints: [royalSupper.checkpoints[0]],
  fork: { ...royalSupper.fork, triggerBounds: { x: -100, y: 0, width: 1, height: 1 } },
  candle: { ...royalSupper.candle, flames: [] }, grapes: { ...royalSupper.grapes, offsets: [] },
  diner: { ...royalSupper.diner, zone: { x: -100, y: 0, width: 1, height: 1 }, cover: [] }, pear: { x: -100, y: 0, width: 1, height: 1 },
};
