import type { SketchMechanism, SketchRoute } from './unfinished-sketch';
import { sketchLayerTwo } from './unfinished-sketch-layer2';

const wall = (letter: string, x: number, y: number, period: number, height = 6.3): SketchMechanism => ({
  id: `l3-wall-${letter}`, kind: 'board', centre: { x, y }, travel: { x: 0, y: 0.5 },
  pivot: { x, y }, length: 0, arc: 0, period, phase: 0,
  size: { width: 2.2, height }, freezable: true, climbable: true,
  solidWhenPinned: true, resumePhase: true, hazard: false,
});

const letters = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

/** Column centres; the shaft between their faces is 3.3u wide. */
const LEFT = 6.5;
const RIGHT = 12;

/**
 * S4A: two opposing columns of tall boards, each 3.5u above the last, so a
 * pinned pair overlaps and can be bounced before the next board is needed.
 * A third nail waits on the arrival ground, so the board ahead can be inked
 * a wall early and Q can wait. A catch holds still briefly, then slides
 * quickly: the climb keeps a rhythm without asking for a frame-perfect kick.
 */
export const sketchLayerThreeWalls: SketchRoute = {
  ...sketchLayerTwo, id: 'layer-3-walls', entryLegId: 'l3-walls',
  name: 'Layer 3 · Criss-cross walls',
  hint: 'Pick up the third nail on your way. Pin A and B, jump onto A and press Space to kick across. A catch holds you for a moment, then you slide fast: keep kicking. Keep the board ahead pinned; Q frees the oldest nail. From F, kick right over E onto the ledge.',
  goal: 'Climb six walls with three nails and land on the high ledge. Stop for S4A review.',
  spawn: { x: 4.2, y: 24.4 }, deathY: 22,
  bounds: { x: -6, y: -6, width: 86, height: 66 },
  goalBounds: { x: RIGHT + 1.2, y: 49.5, width: 8.8, height: 2.4 },
  // Section-only feel: a kick carries to the far wall, an early press is kept
  // until the catch, and a catch holds still before a quick slide.
  wall: { slideMaxFall: 2, kickVertical: 14.5, kickLock: 0.8, kickBuffer: 0.3, grip: 0.9 },
  // Lets the board after the next one be inked from the current wall.
  placementReach: 11,
  // On the arrival ground, between the spawn and the edge toward A.
  nailPickup: { id: 'l3-nail-pickup', x: 7, y: 24.4, width: 0.8, height: 1.2 },
  // Earlier layers remain physical context, below the local fall line.
  solids: [...sketchLayerTwo.solids,
    // Flush with E's top: only the kick from F reaches this height.
    { id: 'l3-walls-exit', x: RIGHT + 1.2, y: 47.5, width: 8.8, height: 2 },
  ],
  mechanisms: [...sketchLayerTwo.mechanisms,
    // A reaches down beside the arrival edge so the first jump finds its face;
    // B's face starts above the double-jump reach from the arrival ground.
    wall('a', RIGHT, 29.2, 7, 7.8), wall('b', LEFT, 33.6, 6.5),
    wall('c', RIGHT, 37.1, 6), wall('d', LEFT, 40.6, 5.5),
    // E extends higher: only a kick from F clears its top; D's wall kick and
    // double jump both stay below it. F is a tall final wall nothing clears.
    wall('e', RIGHT, 45.225, 5, 8.55), wall('f', LEFT, 49.6, 4.5, 10.3),
  ],
  targets: [...sketchLayerTwo.targets, ...letters.map(letter => ({
    id: `l3-wall-${letter}-pin`, mechanismId: `l3-wall-${letter}`, kind: 'freeze-platform' as const,
    offset: { x: 0, y: 0 }, size: { width: 1, height: 0.4 }, label: `Wall ${letter.toUpperCase()}`,
  }))],
  layers: sketchLayerTwo.layers.map(l => l.layer === 3
    ? { ...l, playable: true, bounds: { ...l.bounds, height: 36 } } : l),
  guides: sketchLayerTwo.guides.filter(g => g.layer !== 3),
  sections: { ...sketchLayerTwo.sections,
    'l3-walls': { id: 'l3-walls', layer: 3, name: 'Layer 3 walls',
      spawn: { x: 4.2, y: 24.4 }, deathY: 22, travelDirection: 1,
      focus: { viewHeight: 24, centreY: { min: 29.5, max: 46 }, lookAhead: 0 },
    },
  },
  sectionOrder: ['l3-walls'],
  legs: [{ id: 'l3-walls', sectionId: 'l3-walls',
    targetIds: letters.map(letter => `l3-wall-${letter}-pin`),
    exitBounds: { x: RIGHT + 1.2, y: 49.5, width: 8.8, height: 2.4 },
    exitSpawn: { x: RIGHT + 5, y: 49.5 }, exitDeathY: 45,
    escalator: null, arrivalSectionId: null,
  }],
};
