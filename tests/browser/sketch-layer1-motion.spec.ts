import { test, expect } from '@playwright/test';
import { observe, open, traverseLayerOne, stepOntoLift, stepOffLift } from './sketch-layer1-controls';

test.use({ reducedMotion: 'reduce' });

test('reduced motion keeps the full lift transport and reframe readable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await open(page);
  await traverseLayerOne(page);
  const exitCamera = (await observe(page)).sketch!.camera;
  await expect(page.locator('#sketch-prompt')).toContainText('onto the lift');
  await stepOntoLift(page);
  await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.4);
  const ride = await observe(page);
  expect(ride.sketch!.camera.y).toBeGreaterThan(exitCamera.y);
  expect(ride.sketch!.camera.height).toBeCloseTo(18, 1);
  expect(Math.abs(ride.body!.y + 0.625 - ride.sketch!.camera.y)).toBeLessThan(9);
  await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 10000 }).toBe('arrival');
  await stepOffLift(page);
  await expect(page.locator('#sketch-endpoint')).toContainText('Slice 2 endpoint');
  await expect.poll(async () => (await observe(page)).sketch!.camera.y).toBeGreaterThan(15);
  const arrived = await observe(page);
  expect(arrived.body!.grounded).toBe(true);
  expect(arrived.body!.y).toBeCloseTo(15.2, 1);
  expect(arrived.sketch!.completed).toBe(true);
  expect(arrived.canvasCount).toBe(1);
  expect(errors).toEqual([]);
});
