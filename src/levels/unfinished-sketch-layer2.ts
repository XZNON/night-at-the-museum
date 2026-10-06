import type { SketchMechanism, SketchRoute } from './unfinished-sketch';
import { sketchRoute } from './unfinished-sketch-route';

const board = (id: string, x: number, y: number, dx: number, dy: number,
  width: number, period: number, phase: number): SketchMechanism => ({
  id, kind: 'board', centre: { x, y }, travel: { x: dx, y: dy }, pivot: { x, y },
  length: 0, arc: 0, period, phase, size: { width, height: 0.55 },
  freezable: true, resumePhase: true, solidWhenPinned: true, climbable: false, hazard: false,
});
const axe = (id: string, x: number, y: number, length: number, period: number,
  phase: number): SketchMechanism => ({
  id, kind: 'axe', centre: { x, y }, pivot: { x, y }, travel: { x: 0, y: 0 },
  length, arc: 0, period, phase, size: { width: length, height: 0.65 },
  freezable: false, climbable: false, hazard: true, sweptBlade: true,
});

/** S3A difficulty review: pin to ink support; no joined entry or second escalator. */
export const sketchLayerTwo: SketchRoute = {
  ...sketchRoute,
  id: 'layer-2', name: 'Layer 2 · Boards & active axes',
  hint: 'Moving outlines cannot hold you. Pin A, then B. From B, Q recalls A to ink C. Narrow boards and fast axes demand a well-timed double jump.',
  goal: 'Reach the gold strip on the fixed ground to the left.',
  spawn: { x: 64.2, y: 15.2 }, deathY: 12.8,
  goalBounds: { x: 23, y: 16.3, width: 8, height: 2.4 },
  // Layer 1 remains physical context, but Layer 2's fall line fires above it.
  solids: [...sketchRoute.solids,
    { id: 'l2-exit', x: 23, y: 14.3, width: 8, height: 2 },
  ],
  mechanisms: [...sketchRoute.mechanisms,
    board('l2-board-a', 56, 15.5, 0, 1.5, 3.4, 2.4, 0),
    board('l2-board-b', 45.8, 16.4, 2.2, 0, 3, 2, 0.25),
    board('l2-board-c', 35.8, 15.6, 2.2, 1.2, 2.6, 1.7, 0.5),
    axe('l2-axe-a', 51.5, 20.9, 2.6, 2.6, 0),
    axe('l2-axe-b', 41.8, 21.5, 2.5, 2.2, 0.35),
  ],
  targets: [...sketchRoute.targets, ...['a', 'b', 'c'].map(letter => ({
    id: `l2-freeze-${letter}`, kind: 'freeze-platform' as const,
    mechanismId: `l2-board-${letter}`, offset: { x: 0, y: 0.275 },
    size: { width: 1.2, height: 0.5 }, label: `Board ${letter.toUpperCase()}`,
  }))],
  layers: sketchRoute.layers.map(l => ({ ...l, playable: l.layer < 3 })),
  // Replace obsolete Layer 2 challenge guides; Layer 3 stays reserved scenery.
  guides: sketchRoute.guides.filter(g => g.layer === 3),
  sections: { ...sketchRoute.sections,
    'layer-2': { id: 'layer-2', layer: 2, name: 'Layer 2',
      spawn: { x: 64.2, y: 15.2 }, deathY: 12.8, travelDirection: -1,
      focus: { viewHeight: 18, centreY: { min: 17, max: 18.8 } },
    },
  },
  sectionOrder: ['layer-2'],
  legs: [{ id: 'layer-2', sectionId: 'layer-2',
    targetIds: ['l2-freeze-a', 'l2-freeze-b', 'l2-freeze-c'],
    exitBounds: { x: 23, y: 16.3, width: 8, height: 2.4 },
    exitSpawn: { x: 27.5, y: 16.3 }, exitDeathY: 12.8,
    escalator: null, arrivalSectionId: null,
  }],
};
