import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { expandedRoute } from './expanded-route';

// Royal Supper cartoon rework evidence: the isolated dev route played with the
// recorded real-keyboard schedule, captured at every section end and during
// the candle and diner hazards. Presentation only; the route asserts gameplay.
const DIR = process.env.EVIDENCE_DIR ?? 'docs/validation/supper-cartoon';
const names = ['bread', 'butter', 'grapes', 'fork', 'candles', 'diner', 'pear'];

test('cartoon Royal Supper renders every section along the real route', async ({ page }) => {
  mkdirSync(DIR, { recursive: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const failed: string[] = []; page.on('requestfailed', r => failed.push(r.url()));
  await page.goto('http://127.0.0.1:5173/?scene=royal-supper');
  await expect(page.locator('#hud')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/start-1280.png` });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/start-960.png` });
  await page.setViewportSize({ width: 1280, height: 720 });
  const pending: Promise<unknown>[] = [];
  // Mid-hazard frames: taken while the next stage plays, without pausing it.
  const during = (name: string, delays: number[]) => delays.forEach((ms, i) => pending.push(
    new Promise(resolve => setTimeout(resolve, ms)).then(() => page.screenshot({ path: `${DIR}/${name}-${i + 1}.png` }))));
  // Review fixes: the floating bread on its goblet stands, and the grape run.
  during('bread-play', [4500, 9000]);
  await expandedRoute(page, async index => {
    await page.screenshot({ path: `${DIR}/end-${index}-${names[index] ?? index}.png` });
    if (index === 1) during('grapes-play', [300, 2500, 7000, 12000, 18000]);
    if (index === 2) during('fork-play', [1900, 2500]);
    if (index === 3) during('candles-play', [900, 2600, 4200]);
    if (index === 5) during('dessert-play', [1200, 3200, 5200, 7600]);
    if (index === 4) {
      // Review fix: the HIDDEN cue (casserole halo, shaded player) behind the
      // first cover while the diner looks. The next stage starts with R.
      await page.keyboard.down('KeyD');
      await expect.poll(() => page.evaluate(() => (window as unknown as { __curatorDebug: () => { body: { x: number } } }).__curatorDebug().body.x),
        { intervals: [16] }).toBeGreaterThan(321.4);
      await page.keyboard.up('KeyD');
      await expect(page.locator('#diner-state')).toContainText('LOOK', { timeout: 6000 });
      await expect(page.locator('#diner-state')).toContainText('HIDDEN');
      await page.screenshot({ path: `${DIR}/hidden-1280.png` });
      await page.setViewportSize({ width: 960, height: 540 });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.screenshot({ path: `${DIR}/hidden-960.png` });
      await page.setViewportSize({ width: 1280, height: 720 });
      during('diner-play', [1500, 2600, 3500, 4600, 6000]);
    }
  });
  await Promise.all(pending);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
