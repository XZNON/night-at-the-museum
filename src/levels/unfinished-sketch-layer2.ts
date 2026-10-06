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

/** Reviewed hard S3A challenge, extended only by S3B's ride and safe arrival. */
export const sketchLayerTwo: SketchRoute = {
  ...sketchRoute,
  id: 'layer-2', entryLegId: 'layer-2', name: 'Layer 2 · Boards & active axes',
  hint: 'Moving outlines cannot hold you. Pin A, then B. From B, Q recalls A to ink C. Narrow boards and fast axes demand a well-timed double jump.',
  goal: 'Reach fixed ground on the left, then press E on its pad to ride to Layer 3.',
  spawn: { x: 64.2, y: 15.2 }, deathY: 12.8,
  goalBounds: { x: 0, y: 24.4, width: 10, height: 3.2 },
  // Layer 1 remains physical context, but Layer 2's fall line fires above it.
  solids: [...sketchRoute.solids,
    { id: 'l2-exit', x: 23, y: 14.3, width: 8, height: 2 },
    { id: 'l3-arrival', x: 0, y: 22.4, width: 10, height: 2 },
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
  guides: sketchRoute.guides.filter(g => g.layer === 3 && g.rect.x >= 10),
  sections: { ...sketchRoute.sections,
    'layer-3-landing': { id: 'layer-3-landing', layer: 3, name: 'Layer 3 landing',
      spawn: { x: 4.2, y: 24.4 }, deathY: 22,
      focus: { viewHeight: 18, centreY: { min: 24.6, max: 26 } }, travelDirection: 1,
    },
    'layer-2': { id: 'layer-2', layer: 2, name: 'Layer 2',
      spawn: { x: 64.2, y: 15.2 }, deathY: 12.8, travelDirection: -1,
      focus: { viewHeight: 18, centreY: { min: 17, max: 18.8 } },
    },
  },
  sectionOrder: ['layer-2', 'layer-3-landing'],
  legs: [{ id: 'layer-2', sectionId: 'layer-2',
    targetIds: ['l2-freeze-a', 'l2-freeze-b', 'l2-freeze-c'],
    exitBounds: { x: 23, y: 16.3, width: 8, height: 2.4 },
    exitSpawn: { x: 27.5, y: 16.3 }, exitDeathY: 12.8,
    escalator: { id: 'l2-escalator', duration: 4,
      boarding: { x: 24.4, y: 16.3, width: 3.6, height: 2.4 },
      path: [{ x: 26.2, y: 16.3 }, { x: 22, y: 17.8 }, { x: 18, y: 19.4 },
        { x: 14, y: 21 }, { x: 10, y: 22.7 }, { x: 6, y: 24.4 }, { x: 4.2, y: 24.4 }],
      arrival: { x: 4.2, y: 24.4 },
    }, arrivalSectionId: 'layer-3-landing',
  }],
};

/** One connected picture; shared challenge data retain their stable IDs. */
export const sketchJoinedRoute: SketchRoute = {
  ...sketchLayerTwo, id: 'layers-1-2', entryLegId: 'layer-1',
  name: 'Layers 1 & 2 · Two rides', hint: sketchRoute.hint,
  goal: 'Climb the pendulums, cross the boards and axes, then ride to safe Layer 3 ground.',
  spawn: { ...sketchRoute.spawn }, deathY: sketchRoute.deathY,
  sectionOrder: ['layer-1', 'layer-2', 'layer-3-landing'],
  legs: [{ ...sketchRoute.legs[0], nextLegId: 'layer-2', arrivalSectionId: 'layer-2' },
    ...sketchLayerTwo.legs],
};
