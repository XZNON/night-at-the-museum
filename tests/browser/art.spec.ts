import { test, expect } from '@playwright/test';
import { expandedRoute } from './expanded-route';
test('prepared supper art renders at both sizes and reloads a failed required prop', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/assets/supper/props/fan.png', route => route.abort());
  await page.goto('http://127.0.0.1:5173/?scene=royal-supper');
  await expect(page.locator('#error-message')).toContainText('royal-supper.fan');
  await page.unroute('**/assets/supper/props/fan.png');
  await page.getByRole('button', { name: 'Retry', exact: false }).click();
  await expect(page.locator('#hud')).toBeVisible();
  await page.screenshot({ path: 'test-results/art-slice-1280.png' });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.screenshot({ path: 'test-results/art-slice-960.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expandedRoute(page, undefined, 0);
  await expect(page.locator('#checkpoint')).toContainText('before butter');
  expect(errors).toEqual([]);
});
