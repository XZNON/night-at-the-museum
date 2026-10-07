import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { traverseLayerOne, waitReachable } from './sketch-layer1-controls';
import { evidence, measurements, state, clickSocket, capture, leftEdge, transfer, throughA, layerTwo, reenter, ride, type State } from './sketch-layer2-controls';

test.use({ headless: false });

const DIR = process.env.SKETCH_EVIDENCE_DIR ?? 'docs/validation/sketch-s3/s3b';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2';
const SENTINEL = 's3a-save-sentinel-unchanged';
evidence.dir = DIR;
async function open(page: Page) {
  await page.goto(URL); await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(350);
}
for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  for (const joined of [false, true]) {
    test(`S3B ${joined ? 'joined both rides' : 'direct second ride'} and safe recovery ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size); const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
      await page.addInitScript(s => localStorage.setItem('last-curator.save.v1', s), SENTINEL);
      await page.goto(joined ? URL.replace('study=layer-2', 'study=layers-1-2') : URL);
      await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
      if (joined) {
        expect((await state(page)).sketch.lifts.map(l => [l.id, l.state])).toEqual([['l1-lift', 'bottom'], ['l2-lift', 'bottom']]);
        await traverseLayerOne(page); await ride(page, 'layer-1', size.width === 1280);
        await expect(page.locator('#sketch-endpoint')).toBeHidden();
        // Local fall and traversal re-entry retain the earlier cleared leg.
        await page.keyboard.down('KeyA'); await page.waitForTimeout(2000); await page.keyboard.up('KeyA');
        await expect.poll(async () => (await state(page)).body!.x).toBe(64.2);
        await reenter(page); expect((await state(page)).sketch.leg).toBe('layer-2');
        expect((await state(page)).body!.x).toBe(64.2); expect((await state(page)).sketch.elapsed).toBeLessThan(0.5);
      }
      await layerTwo(page); await ride(page, 'layer-2', size.width === 1280);
      await expect(page.locator('#sketch-endpoint')).toContainText('S3 endpoint');
      await page.keyboard.press('KeyR'); await page.waitForTimeout(120);
      expect((await state(page)).body!.x).toBe(4.2);
      await page.keyboard.down('KeyA'); await page.waitForTimeout(2100); await page.keyboard.up('KeyA');
      await expect.poll(async () => (await state(page)).body!.x).toBe(4.2);
      await reenter(page); expect((await state(page)).sketch.completed).toBe(true);
      await page.keyboard.press('Escape'); await page.locator('[data-action="replay"]').click();
      await expect(page.locator('#sketch-hud')).toBeVisible();
      expect((await state(page)).sketch.leg).toBe(joined ? 'layer-1' : 'layer-2');
      expect((await state(page)).body!.x).toBe(joined ? 1.5 : 64.2);
      expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
      expect(errors).toEqual([]);
    });
  }
  test(`S3B reduced motion complete joined traversal ${size.width}x${size.height}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize(size);
    await page.goto(URL.replace('study=layer-2', 'study=layers-1-2'));
    await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
    await traverseLayerOne(page); await ride(page, 'layer-1', false);
    await layerTwo(page); await ride(page, 'layer-2', false);
    await expect(page.locator('#sketch-endpoint')).toContainText('S3 endpoint');
    await capture(page, 'reduced-motion-final');
  });
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { measurements.length = 0; });
test.afterEach(({}, info) => {
  const name = info.title.replace(/[^a-zA-Z0-9]+/g, '-');
  writeFileSync(`${DIR}/observations-${name}.json`, JSON.stringify({ title: info.title, status: info.status, records: measurements }, null, 2));
});

for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  test(`S3B real FIFO route, captures and exit lifecycle at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.addInitScript(s => localStorage.setItem('last-curator.save.v1', s), SENTINEL);
    const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
    await open(page); await capture(page, 'entrance');
    expect((await state(page)).sketch.camera.height).toBe(18);
    expect((await state(page)).sketch.targets.filter(t => t.id.startsWith('l1-')).every(t => t.reason === 'Another layer.')).toBe(true);
    await throughA(page); await capture(page, 'on-board-a');
    const held = (await state(page)).sketch.boards.find(b => b.id === 'l2-board-a')!;
    const axeAngle = (await state(page)).sketch.axes[0].angle;
    await page.waitForTimeout(500);
    expect((await state(page)).sketch.boards.find(b => b.id === 'l2-board-a')!.top).toBe(held.top);
    expect((await state(page)).sketch.axes[0].angle).toBeGreaterThan(axeAngle);
    await leftEdge(page); await waitReachable(page, 'l2-freeze-b'); await clickSocket(page, 'l2-freeze-b');
    await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-a', 'l2-freeze-b']);
    await transfer(page, 'l2-board-b', 'l2-axe-a'); await capture(page, 'on-board-b');
    await leftEdge(page); await page.keyboard.press('KeyQ');
    await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-b']);
    await waitReachable(page, 'l2-freeze-c'); await clickSocket(page, 'l2-freeze-c');
    await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-b', 'l2-freeze-c']);
    await capture(page, 'fifo-c-pinned');
    await transfer(page, 'l2-board-c', 'l2-axe-b'); await capture(page, 'on-board-c');
    await leftEdge(page); await transfer(page, 'l2-exit');
    await expect.poll(async () => (await state(page)).sketch.stage).toBe('exit');
    await expect(page.locator('#sketch-endpoint')).toBeHidden();
    expect((await state(page)).sketch.available).toBe(2); await capture(page, 'exit');
    await page.keyboard.press('KeyR'); await page.waitForTimeout(150);
    expect((await state(page)).body!.x).toBe(27.5);
    // A held direction from the exit jump was cleared at checkpoint commit.
    await page.waitForTimeout(350); expect((await state(page)).body!.x).toBe(27.5);
    await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click();
    await page.locator('[data-action="start"]').click(); await expect(page.locator('#sketch-hud')).toBeVisible();
    expect((await state(page)).sketch.completed).toBe(false); expect((await state(page)).canvasCount).toBe(1);
    await page.keyboard.press('Escape'); await page.locator('[data-action="replay"]').click();
    await expect(page.locator('#sketch-hud')).toBeVisible();
    expect((await state(page)).body!.x).toBe(64.2); expect((await state(page)).sketch.stage).toBe('traversal');
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
    expect(errors).toEqual([]);
  });
}

test('S3B moving outlines cannot be ridden without nails at either size', async ({ page }) => {
  for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
    await page.setViewportSize(size); await open(page); await leftEdge(page);
    expect((await state(page)).sketch.surfaces.filter(s => s.id.startsWith('l2-board'))).toEqual([]);
    await page.keyboard.down('KeyA'); await page.keyboard.down('Space');
    await page.waitForTimeout(240); await page.keyboard.up('Space');
    await page.waitForTimeout(45); await page.keyboard.down('Space');
    await expect(page.locator('#sketch-cue')).toContainText('Nothing under you', { timeout: 4000 });
    await page.keyboard.up('Space'); await page.keyboard.up('KeyA');
    await expect.poll(async () => (await state(page)).body!.x).toBe(64.2);
    expect((await state(page)).sketch.available).toBe(2);
    measurements.push({ noNailRetry: await state(page), width: size.width, url: page.url() });
    await capture(page, 'no-nail-retry');
  }
});

test('S3B pause/resize, support recall, fall/R and traversal re-entry stay local', async ({ page }) => {
  await open(page); await throughA(page);
  await page.keyboard.press('Escape');
  const before = await state(page); await page.waitForTimeout(500); expect((await state(page)).sketch.elapsed).toBe(before.sketch.elapsed);
  await page.setViewportSize({ width: 960, height: 540 });
  expect((await state(page)).sketch.queue).toEqual(before.sketch.queue);
  await page.locator('[data-action="resume"]').click(); await page.waitForTimeout(250);
  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await state(page)).sketch.available).toBe(2);
  await page.waitForTimeout(500); await capture(page, 'recalled-support');
  await page.keyboard.press('KeyR'); await page.waitForTimeout(200);
  expect((await state(page)).body!.x).toBe(64.2);
  await page.keyboard.down('KeyA'); await page.waitForTimeout(1000); await page.keyboard.up('KeyA');
  await expect.poll(async () => (await state(page)).sketch.available).toBe(2);
  await page.waitForTimeout(800); expect((await state(page)).body!.x).toBe(64.2);
  await throughA(page);
  await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click();
  await page.locator('[data-action="start"]').click(); await expect(page.locator('#sketch-hud')).toBeVisible();
  expect((await state(page)).body!.x).toBe(64.2); expect((await state(page)).sketch.available).toBe(2);
  expect((await state(page)).sketch.elapsed).toBeLessThan(0.5); expect((await state(page)).canvasCount).toBe(1);
});

test('S3B unsafe blade crossing recovers locally; blur clears held controls and phase time', async ({ page }) => {
  await open(page); await throughA(page); await leftEdge(page);
  await waitReachable(page, 'l2-freeze-b'); await clickSocket(page, 'l2-freeze-b');
  await page.waitForFunction(() => {
    const s = (window as unknown as { __curatorDebug: () => State }).__curatorDebug();
    const angle = s.sketch.axes[0].angle % (Math.PI * 2);
    return angle > 4.4 && angle < 4.7;
  });
  await page.keyboard.down('KeyA'); await page.keyboard.down('Space');
  await page.waitForTimeout(230); await page.keyboard.up('Space'); await page.waitForTimeout(45); await page.keyboard.down('Space');
  await expect(page.locator('#sketch-cue')).toContainText('Caught by the axe', { timeout: 4000 });
  measurements.push({ hazardRecovery: await state(page) });
  await page.keyboard.up('Space'); await page.keyboard.up('KeyA');
  await expect.poll(async () => (await state(page)).body!.x).toBe(64.2);
  await expect.poll(async () => (await state(page)).sketch.available).toBe(2);
  const cdp = await page.context().newCDPSession(page);
  // Playwright normally forces every page to stay focused. Disable that
  // automation feature so actual foreground-tab switching emits blur.
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.bringToFront(); await page.locator('#world').click({ position: { x: 900, y: 550 } });
  await page.keyboard.down('KeyD');
  // An actual second foreground tab causes the browser's blur event.
  const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  const held = await state(page); await page.waitForTimeout(400);
  expect((await state(page)).sketch.elapsed).toBe(held.sketch.elapsed);
  await other.close(); await page.bringToFront(); await page.keyboard.up('KeyD');
  await page.locator('[data-action="resume"]').click(); await page.waitForTimeout(400);
  expect((await state(page)).body!.vx).toBe(0); expect((await state(page)).sketch.queue).toEqual([]);
});

test('S3B production ignores entry, denied storage works, joined study works without campaign storage', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?scene=unfinished-sketch&study=layer-2');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  expect(await page.evaluate(() => '__curatorDebug' in window)).toBe(false);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  await open(page); expect((await state(page)).sketch.available).toBe(2);
  await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-2');
  await expect(page.locator('#sketch-bays')).toBeHidden();
  expect((await state(page)).sketch.leg).toBe('layer-1');
});

test('affected S2 route and centered nail heads retain real traversal with new evidence', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1');
  await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
  await traverseLayerOne(page); await capture(page, 's2-exit-regression');
  await page.setViewportSize({ width: 960, height: 540 }); await page.waitForTimeout(300); await capture(page, 's2-exit-regression');
  expect((await state(page)).sketch.stage).toBe('exit');
});

test('affected S1 pins, active axe and FIFO retain real controls at both review sizes', async ({ page }) => {
  for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
    await page.setViewportSize(size);
    await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=pins');
    await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
    await page.keyboard.down('KeyD'); await page.waitForTimeout(1350); await page.keyboard.up('KeyD');
    await waitReachable(page, 'pins-freeze-a'); await clickSocket(page, 'pins-freeze-a');
    await waitReachable(page, 'pins-freeze-b'); await clickSocket(page, 'pins-freeze-b');
    await expect.poll(async () => (await state(page)).sketch.queue.length).toBe(2);
    await capture(page, 's1-pins-regression');
    await page.keyboard.press('KeyQ');
    await expect.poll(async () => (await state(page)).sketch.queue.map(q => q.targetId)).toEqual(['pins-freeze-b']);
    expect((await state(page)).sketch.axes[0].angle).toBeGreaterThan(0);
  }
});
