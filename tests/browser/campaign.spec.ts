import { expandedRoute, captureFrozenArt } from './expanded-route';
import { test, expect, type Page } from '@playwright/test';

const production = 'http://127.0.0.1:4173/';
const saveKey = 'last-curator.save.v1';
const collectedSave = { schemaVersion: 1, campaignId: 'garden-before-dawn', collectedPieceIds: ['golden-pear'], restoredPieceIds: [], settings: { masterVolume: 0.7, quality: 'normal' } };
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), saveKey);

async function walk(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(80);
}
async function newMuseum(page: Page, continueSave = false): Promise<void> {
  await page.getByRole('button', { name: continueSave ? 'Continue' : 'New Game', exact: true }).click();
  await expect(page.locator('#museum-hud')).toBeVisible();
}
async function approachSupper(page: Page): Promise<void> {
  await walk(page, 'KeyA', 800); await walk(page, 'KeyW', 1350);
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
}
async function inspectFromSpawn(page: Page): Promise<void> {
  await walk(page, 'KeyD', 740); await walk(page, 'KeyW', 1350);
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Inspect the masterpiece');
  await page.locator('#world').click({ position: { x: 640, y: 360 } });
  await expect(page.getByRole('button', { name: 'Pear silhouette' })).toBeVisible();
}
async function inspectFromReturn(page: Page): Promise<void> {
  await page.keyboard.down('KeyD');
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Inspect the masterpiece');
  await page.keyboard.up('KeyD');
  await page.locator('#world').click({ position: { x: 640, y: 360 } });
  await expect(page.getByRole('button', { name: 'Pear silhouette' })).toBeVisible();
}
async function supperRoute(page: Page): Promise<void> {
  await expandedRoute(page, async index => {
    if (index === 4) {
      await walk(page, 'KeyD', 800);
      await expect(page.locator('#diner-state')).toContainText('HIDDEN');
      await expect(page.locator('#diner-state')).toContainText('AWAY');
      await page.keyboard.press('Escape'); await captureFrozenArt(page, 'hidden-away');
      await page.getByRole('button', { name: 'Resume', exact: false }).click();
      await expect(page.locator('#diner-state')).toContainText('LOOK');
      await page.keyboard.press('Escape'); await captureFrozenArt(page, 'hidden-look');
      await page.getByRole('button', { name: 'Resume', exact: false }).click();
    }
    if (index === 5) {
      await page.keyboard.press('Escape'); await captureFrozenArt(page, 'dessert-approach');
      await page.getByRole('button', { name: 'Resume', exact: false }).click();
    }
    if (index === 6) await captureFrozenArt(page, 'pear-finale');
    if (index <= 2) {
      await page.keyboard.press('Escape');
      await captureFrozenArt(page, ['butter', 'grapes', 'fork'][index]);
      await page.getByRole('button', { name: 'Resume', exact: false }).click();
    }
    if (index === 2) {
      // Inspect the authored fork pivot mid-rotation through the normal E action.
      await page.keyboard.press('KeyE'); await page.waitForTimeout(350);
      await page.keyboard.press('Escape'); await captureFrozenArt(page, 'fork-rotating');
      await page.getByRole('button', { name: 'Resume', exact: false }).click();
    }
    if (index !== 3) return;
    await walk(page, 'KeyD', 1900);
    await page.keyboard.press('Escape');
    await captureFrozenArt(page, 'trident');
    await page.screenshot({ path: 'test-results/expanded-fan-observation.png' });
    await page.getByRole('button', { name: 'Resume', exact: false }).click();
    for (const candle of [1, 2, 3]) {
      await expect(page.locator('#candle-state')).toContainText(new RegExp(`${candle}: [0-9]`));
      await page.keyboard.press('Escape'); await captureFrozenArt(page, `trident-ember-${candle}`);
      await page.getByRole('button', { name: 'Resume', exact: false }).click();
    }
    await expect(page.locator('#candle-state')).toContainText('1: LIT · 2: LIT · 3: LIT');
    await page.keyboard.press('Escape'); await captureFrozenArt(page, 'trident-relit');
    await page.getByRole('button', { name: 'Resume', exact: false }).click();
    // The next recorded stage starts with R at the same safe checkpoint.
  });
}

test('production museum → supper → pear → return → click placement → reload → replay → confirmed reset', async ({ page }) => {
  const errors: string[] = []; const failures: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto(production + '?scene=royal-supper&debug=1');
  expect(await page.evaluate(() => '__curatorDebug' in window)).toBe(false);
  await newMuseum(page);
  await page.screenshot({ path: 'test-results/museum-start.png' });
  // Distant frames do not activate, even with click/E.
  await page.locator('#world').click({ position: { x: 830, y: 338 } }); await page.keyboard.press('KeyE');
  await expect(page.locator('#museum-hud')).toBeVisible();
  await approachSupper(page);
  await page.locator('#world').click({ position: { x: 640, y: 360 } });
  await expect(page.locator('#hud')).toBeVisible();
  await supperRoute(page);
  expect((await saved(page)).collectedPieceIds).toEqual(['golden-pear']);
  expect((await saved(page)).restoredPieceIds).toEqual([]);
  const returnButton = await page.getByRole('button', { name: 'Return to Museum', exact: true }).boundingBox();
  if (!returnButton) throw new Error('Return button is missing');
  // A real double click keeps its screen coordinates after the first click
  // removes the button. Avoid locator retries against the departed scene.
  await page.mouse.click(returnButton.x + returnButton.width / 2, returnButton.y + returnButton.height / 2, { clickCount: 2 });
  await expect(page.locator('#inventory')).toHaveText('Inventory · Golden pear');
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
  await page.screenshot({ path: 'test-results/museum-return.png' });
  await inspectFromReturn(page);
  await page.reload(); await newMuseum(page, true);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Golden pear');
  await inspectFromSpawn(page);
  await page.getByRole('button', { name: 'Golden pear', exact: false }).click();
  await page.getByRole('button', { name: 'Sun silhouette' }).click();
  await expect(page.locator('#placement-message')).toContainText('stays in inventory');
  expect((await saved(page)).restoredPieceIds).toEqual([]);
  await page.getByRole('button', { name: 'Pear silhouette' }).click();
  await expect(page.locator('#placement-message')).toContainText('Colour restored');
  expect((await saved(page)).restoredPieceIds).toEqual(['golden-pear']);
  expect(await page.getByRole('button', { name: 'Golden pear', exact: false }).count()).toBe(0);
  await page.screenshot({ path: 'test-results/pear-restoration-production.png' });
  // Reload during the animation: restoration was saved synchronously.
  await page.reload(); await newMuseum(page, true);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Empty');
  await expect(page.locator('#objective')).toContainText('wake the sun');
  await expect(page.locator('#objective')).toContainText('in development');
  await inspectFromSpawn(page); await expect(page.locator('#pear-target')).toBeDisabled();
  await page.screenshot({ path: 'test-results/pear-restoration-production.png' });
  await page.keyboard.press('Escape');
  await walk(page, 'KeyA', 1540); await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
  await page.keyboard.press('KeyE'); await supperRoute(page);
  await expect(page.locator('#modal')).toContainText('replay adds no duplicate');
  expect((await saved(page)).collectedPieceIds).toEqual(['golden-pear']);
  expect((await saved(page)).restoredPieceIds).toEqual(['golden-pear']);
  await page.getByRole('button', { name: 'Return to Museum', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
    await page.keyboard.press('KeyE'); await expect(page.locator('#hud')).toBeVisible();
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Return to Museum', exact: true }).click();
    await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
  }
  await page.evaluate(() => localStorage.setItem('another-game', 'keep'));
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
  await page.getByRole('button', { name: 'Keep progress' }).click();
  expect((await saved(page)).restoredPieceIds).toEqual(['golden-pear']);
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset / New Game' }).click();
  await expect(page.locator('#inventory')).toHaveText('Inventory · Empty');
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('another-game'))).toBe('keep');
  await page.reload(); await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  expect(await page.locator('canvas').count()).toBe(1); expect(errors).toEqual([]); expect(failures).toEqual([]);
});

for (const mode of ['drag', 'keyboard'] as const) {
  test(`production ${mode} placement from reloaded inventory retains wrong drops`, async ({ page }) => {
    await page.goto(production);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: saveKey, value: collectedSave });
    await page.reload(); await newMuseum(page, true); await inspectFromSpawn(page);
    const piece = page.getByRole('button', { name: 'Golden pear', exact: false });
    const pear = page.getByRole('button', { name: 'Pear silhouette' });
    if (mode === 'drag') {
      await piece.dragTo(page.getByRole('button', { name: 'Sun silhouette' }));
      await expect(page.locator('#placement-message')).toContainText('stays in inventory');
      await expect(piece).toBeVisible(); expect((await saved(page)).restoredPieceIds).toEqual([]);
      await piece.dragTo(pear);
    } else {
      // The focus trap and native buttons provide a real Tab/Enter route.
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(piece).toBeFocused();
      await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      await expect(pear).toBeFocused(); await page.keyboard.press('Enter');
    }
    await expect(page.locator('#placement-message')).toContainText('Colour restored');
    expect((await saved(page)).restoredPieceIds).toEqual(['golden-pear']);
    await page.reload(); await newMuseum(page, true); await expect(page.locator('#objective')).toContainText('wake the sun');
  });
}

test('production malformed saves and denied storage stay playable; settings persist', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(production); await page.evaluate(key => localStorage.setItem(key, '{broken'), saveKey); await page.reload();
  await expect(page.locator('#save-notice')).toContainText('Safe progress'); await newMuseum(page, true);
  await page.keyboard.press('Escape'); await page.getByLabel('Low rendering quality').check();
  await page.getByLabel('Master volume').press('Home');
  for (let i = 0; i < 7; i++) await page.getByLabel('Master volume').press('ArrowRight');
  expect((await saved(page)).settings).toEqual({ quality: 'low', masterVolume: 0.35 });
  await page.reload(); await newMuseum(page, true); await page.keyboard.press('Escape');
  await expect(page.getByLabel('Low rendering quality')).toBeChecked(); await expect(page.getByLabel('Master volume')).toHaveValue('0.35');
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    Storage.prototype.removeItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
  });
  await page.reload(); await expect(page.locator('#save-notice')).toContainText('Storage is unavailable'); await newMuseum(page);
  await approachSupper(page); await page.keyboard.press('KeyE'); await supperRoute(page);
  await expect(page.locator('#save-notice')).toContainText('Progress remains in memory');
  await page.getByRole('button', { name: 'Return to Museum', exact: true }).click(); await inspectFromReturn(page);
  await page.getByRole('button', { name: 'Golden pear', exact: false }).click(); await page.getByRole('button', { name: 'Pear silhouette' }).click();
  await expect(page.locator('#placement-message')).toContainText('Colour restored'); expect(errors).toEqual([]);
});

test('museum input contexts, room bounds, drag look and pointer lock release/fallback', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/'); await newMuseum(page);
  await page.waitForTimeout(300);
  const pose = () => page.evaluate(() => (window as unknown as { __curatorDebug: () => { museum: { position: number[]; rotation: number[] }; paused: boolean; geometryCount: number; textureCount: number } }).__curatorDebug());
  const initial = await pose();
  await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(590, 360, { steps: 6 }); await page.mouse.up();
  expect((await pose()).museum.rotation[1]).not.toBe(initial.museum.rotation[1]);
  expect((await pose()).museum.position).toEqual(initial.museum.position);
  await page.mouse.down(); await page.mouse.move(640, 360, { steps: 6 }); await page.mouse.up();
  await walk(page, 'KeyW', 3000);
  expect((await pose()).museum.position[2]).toBeCloseTo(-5.6);
  await walk(page, 'KeyD', 5000);
  expect((await pose()).museum.position[0]).toBeCloseTo(5.6);
  await page.reload(); await newMuseum(page);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(120);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Paused.' })).toBeVisible();
  const blurred = await pose(); await page.waitForTimeout(150);
  expect((await pose()).museum.position).toEqual(blurred.museum.position);
  await page.getByRole('button', { name: 'Resume', exact: false }).click(); await page.keyboard.up('KeyW');
  await page.waitForTimeout(100); expect((await pose()).museum.position).toEqual(blurred.museum.position);
  await page.reload(); await newMuseum(page); await inspectFromSpawn(page);
  const inspected = await pose(); expect(inspected.paused).toBe(true);
  await walk(page, 'KeyW', 200); expect((await pose()).museum.position).toEqual(inspected.museum.position);
  await page.keyboard.press('Escape'); expect((await pose()).paused).toBe(false);
  await page.getByRole('button', { name: 'Mouse look', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.id)).toBe('world');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused.' })).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  // Simulate a browser/embedding permission denial; drag look stays usable.
  await page.evaluate(() => { document.querySelector<HTMLCanvasElement>('#world')!.requestPointerLock = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });
  await page.getByRole('button', { name: 'Mouse look', exact: true }).click();
  await expect(page.locator('#museum-prompt')).toContainText('Drag');
  const fallback = await pose(); await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(610, 360, { steps: 4 }); await page.mouse.up();
  expect((await pose()).museum.rotation[1]).not.toBe(fallback.museum.rotation[1]);
  await page.setViewportSize({ width: 960, height: 540 }); await page.screenshot({ path: 'test-results/museum-small.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload(); await newMuseum(page); await approachSupper(page);
  const initialResources = await pose();
  let returnResources: { geometryCount: number; textureCount: number } | null = null;
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('KeyE'); await expect(page.locator('#hud')).toBeVisible();
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Return to Museum', exact: true }).click();
    await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
    const returned = await pose();
    // Three uploads resources lazily. Compare repeated return views, rather
    // than the earlier spawn view that rendered more of the room.
    expect(returned.geometryCount).toBeLessThanOrEqual(initialResources.geometryCount);
    expect(returned.textureCount).toBeLessThanOrEqual(initialResources.textureCount);
    if (returnResources) {
      expect(returned.geometryCount).toBe(returnResources.geometryCount);
      expect(returned.textureCount).toBe(returnResources.textureCount);
    } else returnResources = returned;
  }
  expect(await page.locator('canvas').count()).toBe(1); expect(errors).toEqual([]);
});
