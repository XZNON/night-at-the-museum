import type { Collider } from '../gameplay/collision';
import type { SketchGuide, SketchGuideKind, SketchMechanism, SketchRoute } from './unfinished-sketch';

// Authored data for Sketch Slice 2: Layer 1 of the connected three-layer
// world plus the first scripted escalator. Behaviour lives in
// gameplay/sketch-model.ts; nothing here executes.
//
// Geometry is authored from the measured ordinary-jump envelope of the current
// controller (running at full speed with held input):
//   single jump  ~2.24 units high, ~5.32 units across
//   double jump  ~4.48 units high, ~10.76 units across
// Each transfer is placed inside that envelope with room to land.
// Non-adjacent transfers lie outside that envelope. Outlined pendulums
// solidify only while pinned, so four platforms require two FIFO recalls.

const solid = (id: string, x: number, top: number, width: number, height = 1): Collider =>
  ({ id, x, y: top - height, width, height });

const mechanism = (m: Pick<SketchMechanism, 'id' | 'kind' | 'centre'> & Partial<SketchMechanism>): SketchMechanism => ({
  travel: { x: 0, y: 0 }, pivot: { x: m.centre.x, y: m.centre.y }, length: 0, arc: 0,
  period: 6, phase: 0, size: { width: 3.4, height: 0.5 },
  freezable: false, climbable: false, hazard: false, ...m,
});

const guide = (id: string, kind: SketchGuideKind, layer: 1 | 2 | 3,
  x: number, top: number, width: number, height: number): SketchGuide =>
  ({ id, kind, layer, rect: { x, y: top - height, width, height } });

export const sketchRoute = {
  id: 'layer-1',
  entryLegId: 'layer-1',
  name: 'Layer 1 · Four pendulum transfers',
  hint: 'Moving outlines cannot hold you. Pin A, land, then pin B and land. Q recalls A for C; from C, Q recalls B for D. Time the faster sweeps before pinning.',
  goal: 'Reach the escalator on the right-hand ground and press E to ride it to Layer 2.',
  spawn: { x: 1.5, y: 0 },
  // The review gate ends on the fixed Layer 2 arrival landing.
  goalBounds: { x: 63.8, y: 15.2, width: 8, height: 3.2 },
  bounds: { x: -6, y: -6, width: 86, height: 38 },
  // The shared-shape default. Every standing area overrides this with its own
  // section fall line; see `sections` and `exitDeathY` below.
  deathY: -4,
  camera: { viewHeight: 18, minViewWidth: 30, lookAhead: 7.5, followRate: 4.5 },

  solids: [
    solid('l1-ground', -2, 0, 18, 2),
    solid('l1-step', 11, 0.8, 1.8, 1.2),
    // The waiting terrace: safe ground from which pendulum A is the only
    // target in reach. B/C/D are beyond the 10-unit placement reach.
    solid('l1-terrace', 12.8, 1.6, 4.8, 2.6),
    solid('l1-left-bound', -3, 2, 1, 6),
    // C cannot reach the exit; D is required for the final transfer.
    solid('l1-exit', 55, 11.9, 8, 3.2),
    // Only the Layer 2 arrival ground is playable; nothing else up there is.
    solid('l2-landing', 63, 15.2, 14, 2.2),
    solid('l2-landing-bound', 77, 16.8, 1.2, 4.6),
  ],
  hazards: [],

  mechanisms: [
    // The broadest first landing hangs just above the waiting terrace;
    // a running single jump from the terrace edge reaches the pinned board.
    mechanism({
      id: 'l1-pendulum-a', kind: 'pendulum', centre: { x: 22.2, y: 2.3 },
      pivot: { x: 22.2, y: 5.9 }, length: 3.6, arc: 0.3, period: 3.4, phase: 0,
      size: { width: 4.6, height: 0.5 }, freezable: true, solidWhenPinned: true,
    }),
    // Different transfer: faster, higher and a wider sweep, so its useful pin
    // position is a genuinely different decision and it now needs the air jump.
    mechanism({
      id: 'l1-pendulum-b', kind: 'pendulum', centre: { x: 31.6, y: 5.95 },
      pivot: { x: 31.6, y: 10.25 }, length: 4.3, arc: 0.34, period: 2.8, phase: 1.9,
      size: { width: 4.2, height: 0.55 }, freezable: true, solidWhenPinned: true,
    }),
    // Third platform: faster and narrower; recall A before pinning C.
    mechanism({
      id: 'l1-pendulum-c', kind: 'pendulum', centre: { x: 39.6, y: 7.5 },
      pivot: { x: 39.6, y: 11.8 }, length: 4.3, arc: 0.26, period: 2.45, phase: 3.2,
      size: { width: 3.8, height: 0.5 }, freezable: true, solidWhenPinned: true,
    }),
    // Final quick, narrow transfer: recall B while standing on C to pin D.
    mechanism({
      id: 'l1-pendulum-d', kind: 'pendulum', centre: { x: 48.4, y: 9.1 },
      pivot: { x: 48.4, y: 13.4 }, length: 4.3, arc: 0.26, period: 2.1, phase: 0.8,
      size: { width: 3.4, height: 0.5 }, freezable: true, solidWhenPinned: true,
    }),
  ],

  targets: [
    {
      id: 'l1-freeze-a', kind: 'freeze-platform', mechanismId: 'l1-pendulum-a',
      offset: { x: 0, y: 0.25 }, size: { width: 1.2, height: 0.5 }, label: 'Pendulum A',
    },
    {
      id: 'l1-freeze-b', kind: 'freeze-platform', mechanismId: 'l1-pendulum-b',
      offset: { x: 0, y: 0.275 }, size: { width: 1.2, height: 0.5 }, label: 'Pendulum B',
    },
    {
      id: 'l1-freeze-c', kind: 'freeze-platform', mechanismId: 'l1-pendulum-c',
      offset: { x: 0, y: 0.25 }, size: { width: 1.2, height: 0.5 }, label: 'Pendulum C',
    },
    {
      id: 'l1-freeze-d', kind: 'freeze-platform', mechanismId: 'l1-pendulum-d',
      offset: { x: 0, y: 0.25 }, size: { width: 1.2, height: 0.5 }, label: 'Pendulum D',
    },
  ],

  layers: [
    { id: 'layer-1', layer: 1, label: 'Layer 1', bounds: { x: -4, y: -3, width: 72, height: 15.6 }, playable: true },
    { id: 'layer-2', layer: 2, label: 'Layer 2', bounds: { x: -4, y: 12.8, width: 84, height: 8.4 }, playable: false },
    { id: 'layer-3', layer: 3, label: 'Layer 3', bounds: { x: -4, y: 21.4, width: 84, height: 9 }, playable: false },
  ],

  // Reserved scenery only. Guides have no collider, hazard, target or trigger.
  guides: [
    guide('g2-floor', 'row-floor', 2, -4, 13.7, 67, 0.9),
    guide('g2-board-a', 'board', 2, 4, 16.2, 4.4, 0.55),
    guide('g2-board-b', 'board', 2, 12, 17.4, 4.4, 0.55),
    guide('g2-board-c', 'board', 2, 20, 16.2, 4.4, 0.55),
    guide('g2-axe-a', 'wall', 2, 28, 18.4, 0.5, 3.2),
    guide('g2-axe-b', 'wall', 2, 35, 18.4, 0.5, 3.2),
    guide('g2-stair', 'stair', 2, 40, 20.6, 9, 6.9),
    guide('g2-rail', 'rail', 2, 39.4, 21.2, 10.2, 0.4),
    guide('g3-floor', 'row-floor', 3, -4, 22.3, 76, 0.9),
    guide('g3-wall-a', 'wall', 3, 2, 29, 0.6, 6.7),
    guide('g3-wall-b', 'wall', 3, 9, 29, 0.6, 6.7),
    guide('g3-wall-c', 'wall', 3, 16, 29, 0.6, 6.7),
    guide('g3-wall-d', 'wall', 3, 23, 29, 0.6, 6.7),
    guide('g3-glue', 'glue', 3, 31, 23.5, 13, 1.2),
    guide('g3-socket-a', 'socket', 3, 48, 25.8, 1, 1),
    guide('g3-socket-b', 'socket', 3, 54, 27, 1, 1),
    guide('g3-ceiling', 'row-ceiling', 3, -4, 30, 76, 1.2),
  ],

  sections: {
    'layer-1': {
      id: 'layer-1', layer: 1, name: 'Layer 1',
      spawn: { x: 1.5, y: 0 }, deathY: -4,
      focus: { viewHeight: 18, centreY: { min: 5.5, max: 11.2 } },
    },
    'layer-2-landing': {
      id: 'layer-2-landing', layer: 2, name: 'Layer 2 landing',
      spawn: { x: 64.2, y: 15.2 }, deathY: 12.8,
      focus: { viewHeight: 18, centreY: { min: 13.7, max: 16.8 } },
    },
  },
  sectionOrder: ['layer-1', 'layer-2-landing'],

  legs: [{
    id: 'layer-1', sectionId: 'layer-1',
    targetIds: ['l1-freeze-a', 'l1-freeze-b', 'l1-freeze-c', 'l1-freeze-d'],
    arrivalSectionId: 'layer-2-landing',
  escalator: {
    id: 'l1-escalator',
    boarding: { x: 57.2, y: 11.9, width: 3.6, height: 2.4 },
    duration: 3.2,
    path: [
      { x: 57.2, y: 11.9 },
      { x: 58.6, y: 12.8 },
      { x: 60, y: 13.7 },
      { x: 61.4, y: 14.6 },
      { x: 62.8, y: 15.2 },
      { x: 64.2, y: 15.2 },
    ],
    arrival: { x: 64.2, y: 15.2 },
  },

  exitBounds: { x: 55, y: 11.9, width: 8, height: 1.8 },
  exitSpawn: { x: 55.7, y: 11.9 },
  // Standing at the Layer 1-clear checkpoint, a fall recovers from just below
  // the exit ground instead of dropping the whole height of the layer.
  exitDeathY: 7.5,
  }],
} satisfies SketchRoute;
