import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

interface Snapshot {
  scene: string | null; paused: boolean; transitioning: boolean; completed: boolean;
  body: { x: number; y: number; vx: number; vy: number; grounded: boolean } | null;
  session: { checkpointId: string; fork: string; candle: string };
  campaign: { collectedPieceIds: string[]; restoredPieceIds: string[] };
  canvasCount: number; geometryCount: number; updateCount: number;
  lowQuality: boolean; pixelRatio: number;
}
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => Snapshot }).__curatorDebug());

async function waitForBody(page: Page, predicate: (body: NonNullable<Snapshot['body']>) => boolean, description: string): Promise<void> {
  const until = Date.now() + 8000;
  while (Date.now() < until) {
    const state = await snapshot(page);
    if (state.body && predicate(state.body)) return;
    await page.waitForTimeout(15);
  }
  throw new Error(`${description}: ${JSON.stringify(await snapshot(page))}`);
}
async function moveTo(page: Page, x: number): Promise<void> {
  await page.keyboard.down('KeyD');
  await waitForBody(page, b => b.x >= x, `Walking to ${x}`);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(130);
}
async function jumpTo(page: Page, takeoff: number, landing: number): Promise<void> {
  await moveTo(page, takeoff);
  await page.keyboard.down('KeyD'); await page.keyboard.down('Space');
  await waitForBody(page, b => b.x >= landing, `Jumping to ${landing}`);
  await page.keyboard.up('KeyD');
  await waitForBody(page, b => b.grounded, `Landing at ${landing}`);
  await page.keyboard.up('Space');
  await page.waitForTimeout(120);
}

async function playRoute(page: Page): Promise<void> {
  // Real keyboard traversal. The development snapshot is read-only and is
  // used to wait for positions, never to teleport or modify puzzle state.
  await jumpTo(page, 3, 5.3);
  await jumpTo(page, 6.3, 8.9);
  await jumpTo(page, 9.7, 12.2);
  await jumpTo(page, 13.2, 15.3);
  await moveTo(page, 22);
  await expect(page.locator('#prompt')).toHaveText('E — Topple fork');
  await page.screenshot({ path: 'test-results/royal-supper-fork.png' });
  await page.keyboard.press('KeyE');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#fork-state')).toHaveText('Fork · bridge ready');
  await moveTo(page, 35);
  await expect(page.locator('#checkpoint')).toContainText('after fork');
  await jumpTo(page, 37.2, 39.2);
  await expect(page.locator('#prompt')).toHaveText('E — Extinguish candle');
  await page.screenshot({ path: 'test-results/royal-supper-candle.png' });
  await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE');
  await expect(page.locator('#candle-state')).toHaveText('Candle · safe');
  await jumpTo(page, 39.5, 41.8);
  await moveTo(page, 45.5);
  await expect(page.locator('#checkpoint')).toContainText('after candle');
  await jumpTo(page, 47.4, 50.2);
  await jumpTo(page, 51.3, 54.1);
  await jumpTo(page, 55.2, 58.2);
  await page.keyboard.down('KeyD');
  await expect(page.getByRole('button', { name: 'Finish blockout' })).toBeVisible();
  await page.keyboard.up('KeyD');
  await page.screenshot({ path: 'test-results/royal-supper-success.png' });
}

test('real browser route, award, pause, resize, quality, recovery and repeated scene entry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('last-curator.save.v1', 'campaign-save-sentinel'));
  await page.goto('http://127.0.0.1:5173/?scene=royal-supper');
  await expect(page.locator('#hud')).toBeVisible();
  await page.screenshot({ path: 'test-results/royal-supper-start.png' });
  const initial = await snapshot(page);
  expect(initial.canvasCount).toBe(1);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  const paused = await snapshot(page);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).body?.x).toBe(paused.body?.x);
  await page.getByLabel('Low rendering quality').check();
  expect((await snapshot(page)).pixelRatio).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyR'); await page.waitForTimeout(80);
  await page.setViewportSize({ width: 960, height: 540 });
  expect((await snapshot(page)).body?.x).toBeCloseTo(1.2);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.down('KeyD'); await page.waitForTimeout(80);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Paused.' })).toBeVisible();
  const blurred = await snapshot(page);
  await page.waitForTimeout(150); expect((await snapshot(page)).body?.x).toBe(blurred.body?.x);
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await page.keyboard.up('KeyD'); await page.waitForTimeout(150);
  expect((await snapshot(page)).body?.x).toBeLessThan((blurred.body?.x ?? 0) + 0.5);
  await page.keyboard.press('KeyR'); await page.waitForTimeout(80);
  await playRoute(page);
  expect((await snapshot(page)).campaign.collectedPieceIds).toEqual(['golden-pear']);
  expect((await snapshot(page)).campaign.restoredPieceIds).toEqual([]);
  await page.getByRole('button', { name: 'Finish blockout' }).click();
  await page.getByRole('button', { name: 'Re-enter at your checkpoint' }).click();
  const reentry = await snapshot(page);
  expect(reentry.session.checkpointId).toBe('after-candle');
  expect(reentry.session.fork).toBe('bridged'); expect(reentry.session.candle).toBe('extinguished');
  // Deliberately walk into the dessert gap, then recover at the last checkpoint.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(600); await page.keyboard.up('KeyD');
  await waitForBody(page, b => b.x < 47 && b.grounded, 'Recovery after candle');
  expect((await snapshot(page)).session.candle).toBe('extinguished');
  await page.keyboard.press('Escape');
  await page.getByLabel('Low rendering quality').uncheck();
  await page.getByRole('button', { name: 'Restart adventure', exact: true }).click();
  expect((await snapshot(page)).session.fork).toBe('upright');
  await playRoute(page);
  expect((await snapshot(page)).campaign.collectedPieceIds).toEqual(['golden-pear']);
  await expect(page.locator('#modal')).toContainText('replay adds no duplicate');
  await page.getByRole('button', { name: 'Finish blockout' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: i === 0 ? 'Replay the painting' : 'Continue the painting' }).click();
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Leave painting', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Continue the painting' }).click();
  expect((await snapshot(page)).canvasCount).toBe(1);
  expect((await snapshot(page)).geometryCount).toBe(initial.geometryCount);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe('campaign-save-sentinel');
});
