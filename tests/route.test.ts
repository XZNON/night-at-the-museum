import { it, expect } from 'vitest';
import { recordRoute } from './route-plan';
it('traverses the whole expanded route with real controls and every section-end checkpoint', () => {
  const { stages, model } = recordRoute();
  console.info('Route stage seconds', stages.map(s => [s.checkpoint, s.seconds]));
  expect(model.completed).toBe(true);
  expect(stages.map(s => s.checkpoint)).toEqual(['before-butter', 'after-butter', 'before-fork', 'after-fork', 'after-candle', 'after-diner', 'pear']);
});
