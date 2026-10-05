import { test, expect } from '@playwright/test';
test('isolated movement lane enforces fresh presses and one airborne jump', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('last-curator.save.v1', 'lane-save-sentinel'));
  await page.goto('http://127.0.0.1:5173/?lane=movement'); await expect(page.locator('#hud')).toBeVisible(); await page.waitForTimeout(150);
  const body = () => page.evaluate(() => (window as unknown as { __curatorDebug: () => { body: { y: number; vy: number; grounded: boolean } } }).__curatorDebug().body);
  await page.keyboard.down('Space'); await page.waitForTimeout(400);
  await page.keyboard.down('Space'); await page.waitForTimeout(100); expect((await body()).vy).toBeLessThan(0);
  await page.keyboard.up('Space'); await page.keyboard.down('Space'); await page.waitForTimeout(40);
  expect((await body()).vy).toBeGreaterThan(8);
  await page.keyboard.up('Space'); await page.waitForTimeout(40); await page.keyboard.down('Space'); await page.waitForTimeout(40);
  expect((await body()).vy).toBeLessThan(6); // Third fresh press cannot reset launch velocity.
  await page.keyboard.up('Space'); await page.waitForTimeout(1000); expect((await body()).grounded).toBe(true);
  expect(await page.locator('canvas').count()).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe('lane-save-sentinel');
});
