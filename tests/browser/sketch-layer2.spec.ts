import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { observe, waitReachable, traverseLayerOne, hopRight } from './sketch-layer1-controls';

test.use({ headless: false });

const DIR = process.env.SKETCH_EVIDENCE_DIR ?? 'docs/validation/sketch-s3/s3b';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-2';
const SENTINEL = 's3a-save-sentinel-unchanged';
const measurements: unknown[] = [];
type Base = Awaited<ReturnType<typeof observe>>;
type State = Omit<Base, 'sketch'> & { sketch: Omit<NonNullable<Base['sketch']>, 'targets'> & {
  targets: (NonNullable<Base['sketch']>['targets'][number] & { x: number; y: number })[];
  leg: string; entryLeg: string; transitId: string; escalators: string[];
  axes: { id: string; x: number; y: number; angle: number }[];
  dangerBounds: { x: number; y: number; width: number; height: number }[];
} };
const state = (page: Page) => observe(page) as Promise<State>;

async function clickSocket(page: Page, id: string) {
  if (id === 'l2-freeze-b' || id === 'l2-freeze-c') {
    await page.waitForFunction(({ id }) => {
      const t = (window as unknown as { __curatorDebug: () => State }).__curatorDebug().sketch.targets.find(t => t.id === id)!;
      const x = id === 'l2-freeze-b' ? 46.67 : 37.2;
      return Math.abs(t.x - x) < 0.09;
    }, { id });
  }
  const before = await state(page);
  const target = before.sketch.targets.find(t => t.id === id)!;
  measurements.push({ placement: id, width: page.viewportSize()!.width, url: page.url(),
    tick: before.updateCount, body: before.body, target: before.sketch.targets.find(t => t.id === id) });
  expect(target.reason).toBe(''); expect(target.screen?.visible).toBe(true);
  await page.mouse.click(target.screen!.x, target.screen!.y);
  await expect.poll(async () => (await state(page)).sketch.queue.some(p => p.targetId === id)).toBe(true);
}
async function open(page: Page) {
  await page.goto(URL); await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(350);
}
async function capture(page: Page, label: string) {
  const width = page.viewportSize()!.width;
  const study = (await state(page)).sketch.field;
  await page.screenshot({ path: `${DIR}/${study}-${label}-${width}.png` });
  measurements.push({ label, width, url: page.url(), state: await state(page) });
}
async function leftEdge(page: Page) {
  const s = await state(page); const b = s.body!;
  const support = s.sketch.surfaces.find(p => Math.abs(p.top - b.y) < 0.12 && b.x < p.right && b.x + 0.65 > p.left)!;
  expect(support, 'standing on a real surface').toBeTruthy();
  await page.keyboard.down('KeyA');
  for (let i = 0; i < 180; i++) {
    const now = (await state(page)).body!;
    if (now.x < support.left + 0.55) break;
    await page.waitForTimeout(20);
  }
  await page.keyboard.up('KeyA'); await page.waitForTimeout(130);
}
async function transfer(page: Page, id: string, axe?: string) {
  if (axe) {
    // Observe a broad upper-sweep launch window; ordinary keys still own motion.
    await page.waitForFunction(({ axe }) => {
      const s = (window as unknown as { __curatorDebug: () => State }).__curatorDebug();
      const angle = s.sketch.axes.find(a => a.id === axe)!.angle % (2 * Math.PI);
      return angle > (axe === 'l2-axe-a' ? 1.65 : 1.4) && angle < (axe === 'l2-axe-a' ? 1.85 : 1.55);
    }, { axe }, { timeout: 15000 });
  }
  const start = await state(page);
  const dest = start.sketch.surfaces.find(s => s.id === id)!;
  const stopAt = (dest.left + dest.right) / 2 - 0.325;
  const startTick = start.updateCount;
  await page.keyboard.down('KeyA'); await page.keyboard.down('Space');
  let released = false; let airPressed = false; let moving = true; let airborne = false;
  const flight: unknown[] = [];
  for (let i = 0; i < 160; i++) {
    await page.waitForTimeout(18);
    const s = await state(page); const b = s.body!;
    const frames = s.updateCount - startTick;
    if (frames >= 14 && !released) { await page.keyboard.up('Space'); released = true; }
    if (frames >= 17 && released && !airPressed) { await page.keyboard.down('Space'); airPressed = true; }
    airborne ||= !b.grounded;
    if (moving && b.x < stopAt + 0.3) { await page.keyboard.up('KeyA'); moving = false; }
    flight.push({ tick: s.updateCount, body: b, axes: s.sketch.axes });
    if (s.sketch.recovering) break;
    if (airborne && b.grounded) {
      await page.keyboard.up('Space'); await page.keyboard.up('KeyA');
      measurements.push({ transfer: id, width: page.viewportSize()!.width, flight });
      expect(Math.abs(b.y - dest.top), `landed on ${id}`).toBeLessThan(0.15);
      return;
    }
  }
  await page.keyboard.up('Space'); await page.keyboard.up('KeyA');
  measurements.push({ failedTransfer: id, width: page.viewportSize()!.width, flight, end: await state(page) });
  throw new Error(`Missed ${id}: ${JSON.stringify(await state(page))}`);
}
async function throughA(page: Page) {
  await leftEdge(page);
  // Pin the first fast outline low: a high pin changes the blade clearance.
  await page.waitForFunction(() => {
    const t = (window as unknown as { __curatorDebug: () => State }).__curatorDebug().sketch.targets.find(t => t.id === 'l2-freeze-a')!;
    const s = (window as unknown as { __curatorDebug: () => State }).__curatorDebug();
    return t.y > 16.15 && t.y < 16.23 && s.sketch.elapsed % 2.4 > 1.2;
  });
  await waitReachable(page, 'l2-freeze-a'); await clickSocket(page, 'l2-freeze-a');
  await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-a']);
  await transfer(page, 'l2-board-a');
}

async function layerTwo(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { await layerTwoAttempt(page); return; }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('Missed ') || attempt === 3) throw error;
      measurements.push({ ordinaryChallengeRetry: attempt + 1, state: await state(page) });
      await page.keyboard.press('KeyR');
      await expect.poll(async () => (await state(page)).body!.x).toBe(64.2);
      await page.waitForTimeout(300);
      expect((await state(page)).sketch.leg).toBe('layer-2');
    }
  }
}

async function layerTwoAttempt(page: Page) {
  await capture(page, 'l2-entrance'); await throughA(page); await capture(page, 'l2-board-a');
  await leftEdge(page); await waitReachable(page, 'l2-freeze-b'); await clickSocket(page, 'l2-freeze-b');
  await transfer(page, 'l2-board-b', 'l2-axe-a'); await capture(page, 'l2-board-b');
  await leftEdge(page);
  // Full clicks must not evict a nail or change order.
  const full = (await state(page)).sketch.queue;
  const c = (await state(page)).sketch.targets.find(t => t.id === 'l2-freeze-c')!;
  if (c.screen?.visible) await page.mouse.click(c.screen.x, c.screen.y);
  await page.waitForTimeout(80);
  expect((await state(page)).sketch.queue).toEqual(full);
  await page.keyboard.press('KeyQ'); await waitReachable(page, 'l2-freeze-c'); await clickSocket(page, 'l2-freeze-c');
  await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-b', 'l2-freeze-c']);
  await capture(page, 'l2-fifo-c'); await transfer(page, 'l2-board-c', 'l2-axe-b'); await capture(page, 'l2-board-c');
  await leftEdge(page); await transfer(page, 'l2-exit');
  await expect.poll(async () => (await state(page)).sketch.stage).toBe('exit');
  expect((await state(page)).sketch.completed).toBe(false);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
}

async function reenter(page: Page) {
  const before = await page.evaluate(() => {
    const s = (window as unknown as { __curatorDebug: () => { geometryCount: number; textureCount: number } }).__curatorDebug();
    return { geometryCount: s.geometryCount, textureCount: s.textureCount };
  });
  if (!(await state(page)).paused) await page.keyboard.press('Escape');
  await page.locator('[data-action="leave"]').click({ timeout: 8000 });
  await page.locator('[data-action="start"]').click(); await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(300);
  expect((await state(page)).canvasCount).toBe(1);
  const after = await page.evaluate(() => {
    const s = (window as unknown as { __curatorDebug: () => { geometryCount: number; textureCount: number } }).__curatorDebug();
    return { geometryCount: s.geometryCount, textureCount: s.textureCount };
  });
  expect(after.textureCount).toBe(before.textureCount);
  // Geometry uploads are lazy/camera-dependent. Rebuilding at a checkpoint
  // must release the previous scene, rather than retain its visited geometry.
  expect(after.geometryCount).toBeLessThanOrEqual(before.geometryCount + 4);
  measurements.push({ reentryResources: { before, after } });
}

async function blurRide(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.bringToFront();
  await page.keyboard.down('KeyD');
  const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.waitForTimeout(80); // allow the final rendered interpolation to settle
  const before = await state(page); await page.waitForTimeout(250);
  const after = await state(page);
  expect(after.body).toEqual(before.body); expect(after.sketch.transit).toBe(before.sketch.transit);
  expect(after.sketch.camera).toEqual(before.sketch.camera);
  await other.close(); await page.bringToFront(); await page.keyboard.up('KeyD');
  await page.locator('[data-action="resume"]').click(); await cdp.detach();
}

async function ride(page: Page, leg: 'layer-1' | 'layer-2', recovery: boolean) {
  const first = leg === 'layer-1'; const spawn = first ? 55.7 : 27.5;
  const approach = async () => {
    if (first) expect(await hopRight(page, 58.6)).toBe(true);
    await expect(page.locator('#sketch-prompt')).toContainText('Press E');
    expect((await state(page)).sketch.transitId).toBe(first ? 'l1-escalator' : 'l2-escalator');
  };
  await approach(); await capture(page, `${leg}-boarding`);
  if (recovery) {
    await page.keyboard.press('KeyE'); await expect.poll(async () => (await state(page)).sketch.stage).toBe('transit');
    await page.waitForTimeout(150); await page.keyboard.press('KeyR');
    await expect.poll(async () => (await state(page)).sketch.stage).toBe('exit'); expect((await state(page)).body!.x).toBe(spawn);
    await approach(); await page.keyboard.press('KeyE'); await page.waitForTimeout(150);
    await reenter(page); expect((await state(page)).sketch.stage).toBe('exit'); expect((await state(page)).body!.x).toBe(spawn);
    await approach();
  }
  await page.keyboard.down('KeyE'); // held E cannot leak into the later boarding decision
  await expect.poll(async () => (await state(page)).sketch.stage).toBe('transit');
  await expect.poll(async () => (await state(page)).sketch.transit).toBeGreaterThan(0.15);
  if (recovery) {
    await page.keyboard.press('Escape'); await expect.poll(async () => (await state(page)).paused).toBe(true);
    await page.waitForTimeout(80); const paused = await state(page); await page.waitForTimeout(250);
    expect((await state(page)).sketch.transit).toBe(paused.sketch.transit);
    expect((await state(page)).sketch.camera).toEqual(paused.sketch.camera);
    const original = page.viewportSize()!;
    await page.setViewportSize({ width: original.width === 1280 ? 960 : 1280, height: original.width === 1280 ? 540 : 720 });
    expect((await state(page)).sketch.queue).toEqual(paused.sketch.queue);
    expect((await state(page)).sketch.transit).toBe(paused.sketch.transit);
    await page.setViewportSize(original); await page.locator('[data-action="resume"]').click();
    await blurRide(page);
  }
  await expect.poll(async () => (await state(page)).sketch.transit).toBeGreaterThan(0.45);
  await capture(page, `${leg}-mid-ride`);
  // Ride owns all movement and command input; socket clicks remain ordinary pointer actions.
  await page.keyboard.down('Space'); await page.keyboard.press('KeyQ');
  const t = (await state(page)).sketch.targets.find(t => t.screen?.visible);
  if (t?.screen) await page.mouse.click(t.screen.x, t.screen.y);
  await expect.poll(async () => (await state(page)).sketch.stage).toBe(first ? 'traversal' : 'arrival');
  await page.keyboard.up('Space'); await page.keyboard.up('KeyE');
  await page.waitForTimeout(200);
  const arrived = await state(page);
  expect(arrived.sketch.leg).toBe('layer-2'); expect(arrived.sketch.available).toBe(2);
  expect(arrived.body!.vx).toBe(0); expect(arrived.body!.vy).toBe(0); expect(arrived.body!.grounded).toBe(true);
  expect(arrived.sketch.queue).toEqual([]);
  expect(arrived.sketch.camera.height).toBe(18);
  expect(Math.abs(arrived.body!.y + 0.625 - arrived.sketch.camera.y)).toBeLessThan(9);
  expect(arrived.sketch.completed).toBe(!first);
  await capture(page, first ? 'first-handoff' : 'layer-3-arrival');
}

for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  for (const joined of [false, true]) {
    test(`S3B ${joined ? 'joined both rides' : 'direct second ride'} and safe recovery ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size); const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
      await page.addInitScript(s => localStorage.setItem('last-curator.save.v1', s), SENTINEL);
      await page.goto(joined ? URL.replace('study=layer-2', 'study=layers-1-2') : URL);
      await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
      if (joined) {
        expect((await state(page)).sketch.escalators).toEqual(['l1-escalator', 'l2-escalator']);
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
