import { test, expect, type Page } from '@playwright/test';
import { expandedRoute } from './expanded-route';
interface Snapshot {
  scene: string | null; paused: boolean; completed: boolean;
  body: { x: number; y: number; vx: number; vy: number; grounded: boolean } | null;
  session: { checkpointId: string; fork: string; grapeElapsed: number; candleElapsed: number; dinerElapsed: number };
  campaign: { collectedPieceIds: string[]; restoredPieceIds: string[] };
  canvasCount: number; geometryCount: number; updateCount: number; pixelRatio: number;
}
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => (window as unknown as { __curatorDebug: () => Snapshot }).__curatorDebug());
test('expanded isolated route, frozen timers, quality, recovery, replay and scene disposal', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('last-curator.save.v1', 'campaign-save-sentinel'));
  await page.goto('http://127.0.0.1:5173/?scene=royal-supper');
  await expect(page.locator('#hud')).toBeVisible();
  await page.screenshot({ path: 'test-results/expanded-start.png' });
  await page.keyboard.press('Escape'); await page.getByLabel('Low rendering quality').check();
  expect((await snapshot(page)).pixelRatio).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await page.setViewportSize({ width: 960, height: 540 }); await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press('KeyR');
  await expandedRoute(page, async index => {
    if (index === 3) {
      // Deliberately enter before the first ember window: real flame recovery.
      await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
      await page.keyboard.down('KeyD'); await page.waitForTimeout(1620);
      await page.keyboard.down('Space'); await page.waitForTimeout(450);
      await page.keyboard.up('Space'); await page.keyboard.up('KeyD');
      await expect(page.locator('#cue')).toContainText('Too hot'); await page.waitForTimeout(500);
      expect((await snapshot(page)).session.checkpointId).toBe('after-fork');
      expect((await snapshot(page)).session.fork).toBe('bridged');
    }
    if (index === 4) {
      // Full cover protects through LOOK; a jump exposes the body above it.
      await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
      await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.up('KeyD');
      await expect(page.locator('#diner-state')).toContainText('HIDDEN');
      await expect(page.locator('#diner-state')).toContainText('LOOK');
      await page.screenshot({ path: 'test-results/expanded-hidden-look.png' });
      await page.keyboard.down('Space'); await page.waitForTimeout(200); await page.keyboard.up('Space');
      await expect(page.locator('#cue')).toContainText('Caught'); await page.waitForTimeout(500);
      expect((await snapshot(page)).session.checkpointId).toBe('after-candle');
      // Standing still between the dishes also gets caught.
      await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
      await page.keyboard.down('KeyD'); await page.waitForTimeout(1450); await page.keyboard.up('KeyD');
      await expect(page.locator('#cue')).toContainText('Caught'); await page.waitForTimeout(500);
    }
    if (index !== 2 && index !== 4) return;
    await page.keyboard.down('KeyD'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.getByRole('heading', { name: 'Paused.' })).toBeVisible();
    const paused = await snapshot(page); await page.waitForTimeout(250); const frozen = await snapshot(page);
    expect(frozen.body).toEqual(paused.body); expect(frozen.session).toEqual(paused.session); expect(frozen.updateCount).toBe(paused.updateCount);
    await page.getByRole('button', { name: 'Resume', exact: false }).click(); await page.keyboard.up('KeyD');
    // Clearing held input does not erase physical velocity. Let ordinary
    // braking settle, then ensure the pre-blur D press cannot keep accelerating.
    await page.waitForTimeout(180); const stopped = await snapshot(page);
    expect(Math.abs(stopped.body!.vx)).toBeLessThan(0.05);
    await page.waitForTimeout(100); expect((await snapshot(page)).body?.x).toBeCloseTo(stopped.body!.x, 2);
  });
  expect((await snapshot(page)).campaign.collectedPieceIds).toEqual(['golden-pear']);
  await page.getByRole('button', { name: 'Finish blockout' }).click();
  await page.getByRole('button', { name: 'Re-enter at your checkpoint' }).click();
  expect((await snapshot(page)).session.checkpointId).toBe('after-diner'); expect((await snapshot(page)).session.fork).toBe('bridged');
  await page.keyboard.down('KeyD'); await page.keyboard.down('Space'); await page.waitForTimeout(2600); await page.keyboard.up('Space'); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyR'); await page.waitForTimeout(150); expect((await snapshot(page)).body?.x).toBeCloseTo(372);
  await page.keyboard.press('Escape'); await page.getByLabel('Low rendering quality').uncheck();
  await page.getByRole('button', { name: 'Restart adventure', exact: true }).click(); expect((await snapshot(page)).session.fork).toBe('upright');
  await expandedRoute(page); await expect(page.locator('#modal')).toContainText('replay adds no duplicate');
  expect((await snapshot(page)).campaign.collectedPieceIds).toEqual(['golden-pear']);
  await page.getByRole('button', { name: 'Finish blockout' }).click();
  let resources: number | undefined;
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: i === 0 ? 'Re-enter at your checkpoint' : 'Continue the painting' }).click();
    await page.waitForTimeout(150); const state = await snapshot(page);
    expect(state.canvasCount).toBe(1); if (resources !== undefined) expect(state.geometryCount).toBe(resources); resources = state.geometryCount;
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Leave painting', exact: true }).click();
  }
  expect(errors).toEqual([]); expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe('campaign-save-sentinel');
});
