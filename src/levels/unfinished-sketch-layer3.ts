import type { SketchMechanism, SketchRoute, SketchRouteLegId } from './unfinished-sketch';
import { l2Lift, sketchJoinedRoute, sketchLayerTwo } from './unfinished-sketch-layer2';
import { l1Lift, sketchRoute } from './unfinished-sketch-route';

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
  // Layer 3 only: letting go of A/D in the air keeps the jump's momentum.
  airCoast: true,
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
  // Context only: both earlier lifts wait at the top as fixed ground; the
  // Layer 2 deck sits beside the arrival ground, left of the entrance.
  parkedLifts: [l1Lift, l2Lift],
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
    lift: null, arrivalSectionId: null,
  }],
};

const bar = (id: string, x: number, y: number, travel: number, period: number, phase: number, width: number): SketchMechanism => ({
  id, kind: 'mount', centre: { x, y }, travel: { x: travel, y: 0 }, pivot: { x, y }, length: 0, arc: 0,
  period, phase, size: { width, height: 0.3 }, freezable: false, climbable: false, hazard: false,
});

/** S4A's fixed post-climb ledge is this section's start ground (top 49.5). */
const START = { x: RIGHT + 1.2, right: RIGHT + 10, top: 49.5 };

/**
 * S4B: free placement over a glue pool. No marked rings here: a nail goes
 * anywhere along wood. Strip F grows a step, bars M1 and M2 slide back and
 * forth and carry a grip nail. Two nails (the climb's third is taken back);
 * Q still frees the oldest. Every gap is measured so each support is needed.
 */
export const sketchLayerThreeSwings: SketchRoute = {
  ...sketchLayerThreeWalls, id: 'layer-3-swings', entryLegId: 'l3-swings',
  name: 'Layer 3 · Moving swings',
  hint: 'Nails go anywhere along wood, never into air. Nail strip F and stand on the head. Nail bar M1, jump close and press E. Q frees F; nail M2 while swinging, release and grip it. Swing onto the end ledge.',
  goal: 'Cross the glue on a step and two moving bars and land on the end ledge. Stop for S4B review.',
  spawn: { x: START.x + 4, y: START.top }, deathY: 46,
  bounds: { x: -6, y: -6, width: 86, height: 68 },
  goalBounds: { x: 57, y: 54, width: 8, height: 2.4 },
  wall: undefined, placementReach: undefined, nailPickup: undefined,
  solids: [...sketchLayerThreeWalls.solids,
    { id: 'l3-swings-ledge', x: 57, y: 52, width: 8, height: 2 },
  ],
  // Top 48.3: just under the start ground, so the pool stays in frame.
  hazards: [{ id: 'l3-swings-glue', x: START.right, y: 46.8, width: 57 - START.right, height: 1.5 }],
  mechanisms: [...sketchLayerThreeWalls.mechanisms,
    { id: 'l3-strip-f', kind: 'site', centre: { x: 25, y: 50.4 }, travel: { x: 0, y: 0 }, pivot: { x: 25, y: 50.4 },
      length: 0, arc: 0, period: 1, phase: 0, size: { width: 3.4, height: 0.3 }, freezable: false, climbable: false, hazard: false },
    bar('l3-bar-m1', 34.5, 55, 4, 5, 0, 3),
    bar('l3-bar-m2', 45.5, 56, 4, 4.4, 0.5, 3),
  ],
  surfaces: [
    { id: 'l3-strip-f', kind: 'foothold', mechanismId: 'l3-strip-f', from: { x: -1.6, y: -0.5 }, to: { x: 1.6, y: 0.5 }, label: 'Strip F' },
    { id: 'l3-bar-m1', kind: 'moving-swing', mechanismId: 'l3-bar-m1', from: { x: -1.5, y: 0 }, to: { x: 1.5, y: 0 }, label: 'Bar M1' },
    { id: 'l3-bar-m2', kind: 'moving-swing', mechanismId: 'l3-bar-m2', from: { x: -1.5, y: 0 }, to: { x: 1.5, y: 0 }, label: 'Bar M2' },
  ],
  // The bars hang near the top of Layer 3; its band grows to frame them.
  layers: sketchLayerThreeWalls.layers.map(l => l.layer === 3 ? { ...l, bounds: { ...l.bounds, height: 40 } } : l),
  sections: { ...sketchLayerThreeWalls.sections,
    'l3-swings': { id: 'l3-swings', layer: 3, name: 'Layer 3 swings',
      spawn: { x: START.x + 4, y: START.top }, deathY: 46, travelDirection: 1,
      focus: { viewHeight: 20, centreY: { min: 53, max: 54.5 }, lookAhead: 6 },
    },
  },
  sectionOrder: ['l3-swings'],
  legs: [{ id: 'l3-swings', sectionId: 'l3-swings', targetIds: [],
    surfaceIds: ['l3-strip-f', 'l3-bar-m1', 'l3-bar-m2'],
    exitBounds: { x: 57, y: 54, width: 8, height: 2.4 },
    exitSpawn: { x: 59, y: 54 }, exitDeathY: 49,
    lift: null, arrivalSectionId: null,
  }],
};

/**
 * S4C: the accepted climb and crossing as one Layer 3. The climb's exit ledge
 * is the crossing's start ground, so nothing new is built between them: a
 * grounded landing there hands over in place, takes the third nail back and
 * starts the crossing with two. Each section keeps its own accepted feel.
 */
export const sketchLayerThree: SketchRoute = {
  ...sketchLayerThreeSwings, id: 'layer-3', entryLegId: 'l3-walls',
  name: 'Layer 3 · Walls and swings',
  hint: sketchLayerThreeWalls.hint,
  goal: 'Climb six walls, then cross the glue on the moving swings and land on the end ledge. Stop for S4C review.',
  spawn: sketchLayerThreeWalls.spawn, deathY: sketchLayerThreeWalls.deathY,
  // Section-owned below; nothing is field-wide in the joined preset.
  wall: undefined, placementReach: undefined, nailPickup: undefined, airCoast: undefined,
  sectionOrder: ['l3-walls', 'l3-swings'],
  legs: [
    { ...sketchLayerThreeWalls.legs[0], nextLegId: 'l3-swings',
      hint: `${sketchLayerThreeWalls.hint} The swing crossing starts on that ledge.`,
      settings: { wall: sketchLayerThreeWalls.wall, placementReach: sketchLayerThreeWalls.placementReach, nailPickup: sketchLayerThreeWalls.nailPickup, airCoast: true } },
    { ...sketchLayerThreeSwings.legs[0], hint: sketchLayerThreeSwings.hint, settings: { airCoast: true } },
  ],
  // From the ledge's left edge to the crossing's start spot.
  sectionBlend: { from: 'l3-walls', to: 'l3-swings', x0: START.x, x1: sketchLayerThreeSwings.spawn.x },
};

/**
 * S4D: the whole picture so far. The accepted joined Layers 1/2 ride straight
 * into the accepted joined Layer 3: the second lift, which ends on safe
 * ground in the older studies, here starts the climb on arrival. Every leg is
 * a clone, so no older study's links, endpoints or data change. Layers 1/2
 * keep the field's defaults (no pickup, reach 10, air braking); the Layer 3
 * legs keep their S4C settings.
 */
export const sketchLayersOneToThree: SketchRoute = {
  ...sketchLayerThree, id: 'layers-1-3', entryLegId: 'layer-1',
  name: 'Layers 1–3 · The full route',
  hint: sketchRoute.hint,
  goal: 'Climb the pendulums, cross the boards and axes, ride up, climb the walls and cross the swings to the end ledge. Stop for S4D review.',
  spawn: { ...sketchRoute.spawn }, deathY: sketchRoute.deathY,
  // Both lifts are played here, so neither starts parked.
  parkedLifts: undefined,
  sectionOrder: ['layer-1', 'layer-2', 'l3-walls', 'l3-swings'],
  legs: [
    { ...sketchJoinedRoute.legs[0] },
    { ...sketchJoinedRoute.legs[1], nextLegId: 'l3-walls', arrivalSectionId: 'l3-walls' },
    { ...sketchLayerThree.legs[0],
      arrivalCue: 'Layer 3 reached. Two nails; pick up the third on your way to the walls.' },
    { ...sketchLayerThree.legs[1] },
  ],
};

/**
 * S5A: the adventure as a player meets it. The accepted full route, cloned
 * leg by leg (no older study's data, links or endpoints change), with
 * player-facing texts and a torch holding an enchanted light on the end ledge.
 * Landing on the ledge is a safe checkpoint; touching the torch claims the
 * light and ends the adventure. The torch stands toward the ledge's right
 * end, clear of its spawn (x 59), so the player walks to it.
 */
const ADVENTURE_HINTS: Partial<Record<SketchRouteLegId, string>> = {
  'layer-1': 'Nail the swinging boards still and climb across. Two nails: pull back the oldest to reuse it.',
  'layer-2': 'Nail the boards and time your jumps past the swinging axes.',
  'l3-walls': 'Pick up a spare nail, then climb by kicking between nailed boards.',
  'l3-swings': 'Swing on your nails across the glue to the end ledge.',
};

export const sketchAdventure: SketchRoute = {
  ...sketchLayersOneToThree, id: 'adventure',
  name: 'The Unfinished Sketch',
  goal: 'Climb the unfinished picture, layer by layer, and claim the enchanted light.',
  spawn: { ...sketchLayersOneToThree.spawn },
  // Release (user, 2026-10-10): a short goal per layer; the step tips say what to press.
  coach: true,
  legs: sketchLayersOneToThree.legs.map(leg => ({ ...leg, hint: ADVENTURE_HINTS[leg.id] ?? leg.hint })),
  // The torch and the enchanted light above it: x 62..63.4, up to y 56.
  light: {
    id: 'sketch-light', x: 62, y: 54, width: 1.4, height: 2,
    ledgeCue: 'The end ledge. Safe ground: walk right to the torch and claim the light.',
    ledgeHint: 'Safe on the end ledge. An enchanted light waits in the torch: walk right and claim it.',
    cue: 'The enchanted light is yours. The picture settles.',
    doneHint: 'The light is yours. Everything has settled; explore or leave when you are ready.',
    endpoint: 'The light is yours · The picture settles',
  },
};
