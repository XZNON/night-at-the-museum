import type { Collider, Rect } from '../gameplay/collision';
import type { MovementTuning } from '../gameplay/controller';

export type CheckpointId = 'basket-start' | 'before-fork' | 'after-fork' | 'after-candle';
export type ForkState = 'upright' | 'toppling' | 'bridged';
export type CandleState = 'lit' | 'extinguishing' | 'extinguished';
export type Gate = 'fork' | 'candle';
export type SurfaceArt = 'bread' | 'basket' | 'plate' | 'goblet' | 'candle' | 'bridge' | 'ceiling' | 'bound';
export interface PlatformDefinition extends Collider { art: SurfaceArt; gate?: Gate }
export interface Checkpoint { id: CheckpointId; spawn: { x: number; y: number }; trigger: Rect; requires?: Gate }
export interface InteractionDefinition {
  id: 'fork-bridge' | 'candle-flame'; triggerBounds: Rect; duration: number; label: string;
}
export interface RoyalSupperLevel {
  id: 'royal-supper'; pieceId: 'golden-pear'; tuning: MovementTuning;
  bounds: Rect; deathY: number; recoverySeconds: number;
  camera: { minViewWidth: number; viewHeight: number; lookAhead: number; followRate: number; y: number };
  platforms: PlatformDefinition[]; checkpoints: Checkpoint[];
  fork: InteractionDefinition & { pivot: { x: number; y: number }; length: number };
  candle: InteractionDefinition & { hazard: Rect };
  pear: Rect;
}

export const royalSupper: RoyalSupperLevel = {
  id: 'royal-supper', pieceId: 'golden-pear',
  tuning: { width: 0.65, height: 1.25, speed: 6.8, acceleration: 58, braking: 70,
    gravity: 25, jumpSpeed: 10.8, coyoteTime: 0.1, jumpBuffer: 0.12,
    releaseMultiplier: 0.48, terminalSpeed: 28 },
  bounds: { x: -1, y: -4, width: 68, height: 15 }, deathY: -2.5, recoverySeconds: 0.35,
  camera: { minViewWidth: 18, viewHeight: 12, lookAhead: 2.4, followRate: 5.5, y: 3.1 },
  platforms: [
    { id: 'basket', x: 0, y: -0.6, width: 4, height: 0.6, art: 'basket' },
    { id: 'bread-one', x: 4.7, y: 0, width: 2.6, height: 0.7, art: 'bread' },
    { id: 'bread-two', x: 8.2, y: 0, width: 2.5, height: 1.4, art: 'bread' },
    { id: 'bread-three', x: 11.6, y: 0, width: 2.5, height: 2.1, art: 'bread' },
    { id: 'crockery', x: 14.7, y: 1.8, width: 9.3, height: 0.6, art: 'plate' },
    { id: 'goblet-arch', x: 16, y: 4.05, width: 3.5, height: 0.55, art: 'goblet' },
    { id: 'fork-bridge', x: 24, y: 2.15, width: 9, height: 0.25, art: 'bridge', gate: 'fork' },
    { id: 'far-dish', x: 33, y: 1.8, width: 5.5, height: 0.6, art: 'plate' },
    { id: 'snuffer-alcove', x: 38.5, y: 1.8, width: 2.5, height: 0.8, art: 'plate' },
    { id: 'candle-body', x: 41, y: -4, width: 3, height: 7.2, art: 'candle' },
    { id: 'candle-canopy', x: 38.5, y: 6, width: 8.5, height: 0.5, art: 'ceiling' },
    { id: 'after-candle-dish', x: 44, y: 1.8, width: 4.5, height: 0.8, art: 'plate' },
    { id: 'dessert-one', x: 49.5, y: 1.8, width: 2.8, height: 1.4, art: 'bread' },
    { id: 'dessert-two', x: 53.4, y: 1.8, width: 2.8, height: 2, art: 'bread' },
    { id: 'kings-plate', x: 57.5, y: 3, width: 8.5, height: 0.8, art: 'plate' },
    { id: 'left-bound', x: -2, y: -4, width: 2, height: 16, art: 'bound' },
    { id: 'right-bound', x: 66, y: -4, width: 2, height: 16, art: 'bound' },
  ],
  checkpoints: [
    { id: 'basket-start', spawn: { x: 1.2, y: 0 }, trigger: { x: 0, y: -0.1, width: 4, height: 2 } },
    { id: 'before-fork', spawn: { x: 21.3, y: 2.4 }, trigger: { x: 20, y: 2.3, width: 4, height: 1.8 } },
    { id: 'after-fork', spawn: { x: 34.2, y: 2.4 }, trigger: { x: 33.5, y: 2.3, width: 4, height: 1.8 }, requires: 'fork' },
    { id: 'after-candle', spawn: { x: 45.3, y: 2.6 }, trigger: { x: 44.5, y: 2.5, width: 4, height: 1.8 }, requires: 'candle' },
  ],
  fork: { id: 'fork-bridge', triggerBounds: { x: 21, y: 2.2, width: 3, height: 1.8 },
    duration: 0.85, label: 'Topple fork', pivot: { x: 24, y: 2.4 }, length: 9 },
  candle: { id: 'candle-flame', triggerBounds: { x: 38.5, y: 2.3, width: 2.25, height: 1.8 },
    duration: 0.6, label: 'Extinguish candle', hazard: { x: 41, y: 3.2, width: 3, height: 2.8 } },
  pear: { x: 62, y: 3.8, width: 1.25, height: 1.65 },
};

// Development-only controller lane: one safe floor and three modest ledges.
export const movementLane: RoyalSupperLevel = {
  ...royalSupper, bounds: { x: -1, y: -4, width: 30, height: 15 },
  platforms: [
    { id: 'lane-floor', x: 0, y: -0.6, width: 28, height: 0.6, art: 'plate' },
    { id: 'lane-step-one', x: 6, y: 0, width: 3, height: 0.7, art: 'bread' },
    { id: 'lane-step-two', x: 12, y: 0, width: 3, height: 1.4, art: 'bread' },
    { id: 'lane-step-three', x: 18, y: 0, width: 3, height: 2.1, art: 'bread' },
    { id: 'lane-left', x: -2, y: -4, width: 2, height: 16, art: 'bound' },
    { id: 'lane-right', x: 28, y: -4, width: 2, height: 16, art: 'bound' },
  ], checkpoints: [royalSupper.checkpoints[0]],
  fork: { ...royalSupper.fork, triggerBounds: { x: -100, y: 0, width: 1, height: 1 } },
  candle: { ...royalSupper.candle, hazard: { x: -100, y: 0, width: 1, height: 1 }, triggerBounds: { x: -100, y: 0, width: 1, height: 1 } },
  pear: { x: -100, y: 0, width: 1, height: 1 },
};
