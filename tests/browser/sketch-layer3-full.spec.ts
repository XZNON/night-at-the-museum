import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { traverseLayerOne, climbToTerrace, waitReachable, clickSocket as clickL1 } from './sketch-layer1-controls';
import { evidence as l2Evidence, measurements, layerTwo, ride } from './sketch-layer2-controls';
import { evidence, events, state, record, until, release, reenter, capture, shot, entryA, climb, expectHandoff, nailAt, toHead, cross, glueFail } from './sketch-layer3-controls';

// S4D: the full route so far, Layer 1 to the Layer 3 end ledge, driven only by
// real keys and mouse clicks with the shared Layer 1/2/3 helpers. Debug state
// is read back for decisions and assertions, never written.
test.use({ headless: false });
const DIR = 'docs/validation/sketch-s4/s4d';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layers-1-3';
const SENTINEL = 's4d-save-sentinel';
evidence.dir = DIR; l2Evidence.dir = DIR;

async function open(page: Page) { await page.goto(URL); await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350); }
/** Leave from the pause panel and enter again (pauses first if needed). */
async function leaveAndReturn(page: Page) {
  if (!(await state(page)).paused) await page.keyboard.press('Escape');
  await reenter(page);
  expect((await state(page)).canvasCount).toBe(1);
}
/** Walk right off the parked second deck to the climb entrance and stand still. */
async function toEntrance(page: Page) {
  await page.keyboard.down('KeyD'); await until(page, s => s.body.x >= 4.2, 'climb entrance'); await page.keyboard.up('KeyD');
  await until(page, s => s.body.grounded && s.body.vx === 0, 'standing at the entrance');
}
/** Hold a direction and Space, queue Q, then press R: the active section retries with nothing carried over. */
async function rWithQueuedInput(page: Page, key: 'KeyA' | 'KeyD') {
  await page.keyboard.down(key); await page.keyboard.down('Space'); await page.keyboard.press('KeyQ'); await page.keyboard.press('KeyR'); await release(page);
  await page.waitForTimeout(150);
}
const layerOneStart = { x: 1.5, y: 0 };
/**
 * The actual-blur checks switch off Playwright's focus emulation; switch it
 * back on afterwards so an unrelated OS focus change on the headed window
 * cannot pause a later section of this long run.
 */
async function restoreFocusEmulation(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }); await cdp.detach();
}

/** Layer 1 → first lift → Layer 2 → second lift; ends on the second arrival. */
async function toLayerThree(page: Page, o: { recovery: boolean; firstRide: boolean; secondRide: boolean; captures: boolean }) {
  let s = await state(page);
  expect(s.sketch).toMatchObject({ leg: 'layer-1', stage: 'traversal', reach: 10, pickupOffered: false, freePlacement: false, budget: 2 });
  expect(s.body).toMatchObject(layerOneStart);
  if (o.captures) await capture(page, 'layer-1-entrance');
  if (o.recovery) {
    // Neighbouring layers are context: none of their marks is clickable here.
    expect(s.sketch.targets.filter(t => !t.id.startsWith('l1-')).every(t => t.reason === 'Another layer.')).toBe(true);
    // Layer 1: pin A, then R with queued input, then leave/re-entry with A pinned.
    expect(await climbToTerrace(page), 'reached the waiting terrace').toBe(true);
    await waitReachable(page, 'l1-freeze-a'); await clickL1(page, 'l1-freeze-a');
    await until(page, s => s.sketch.queue.length === 1, 'A pinned');
    await rWithQueuedInput(page, 'KeyD');
    s = await state(page); expect(s.body).toMatchObject(layerOneStart); expect(s.sketch.queue).toEqual([]); expect(s.sketch.leg).toBe('layer-1');
    await record(page, 'Layer 1 R with queued input');
    expect(await climbToTerrace(page)).toBe(true);
    await waitReachable(page, 'l1-freeze-a'); await clickL1(page, 'l1-freeze-a');
    await until(page, s => s.sketch.queue.length === 1, 'A pinned again');
    await leaveAndReturn(page);
    s = await state(page); expect(s.body).toMatchObject(layerOneStart); expect(s.sketch.leg).toBe('layer-1'); expect(s.sketch.queue).toEqual([]);
    await record(page, 'Layer 1 re-entry');
    // A fall from the terrace retries Layer 1 only.
    expect(await climbToTerrace(page)).toBe(true);
    await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'Layer 1 fall', 15000); await release(page);
    s = await until(page, s => !s.sketch.recovering, 'Layer 1 recovery');
    expect(s.body).toMatchObject(layerOneStart); expect(s.sketch.leg).toBe('layer-1'); await record(page, 'Layer 1 fall');
  }
  await traverseLayerOne(page);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
  await ride(page, 'layer-1', o.firstRide);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
  s = await state(page);
  expect(s.sketch).toMatchObject({ leg: 'layer-2', stage: 'traversal', reach: 10, pickupOffered: false, budget: 2 });
  if (o.recovery) {
    // Layer 2: a fall and re-entry keep Layer 1 cleared; R with queued input stays here.
    await page.keyboard.down('KeyA'); await until(page, s => s.sketch.recovering, 'Layer 2 fall'); await release(page);
    s = await until(page, s => !s.sketch.recovering && s.body.grounded, 'Layer 2 recovery');
    expect(s.body).toMatchObject({ x: 64.2, y: 15.2 }); expect(s.sketch.leg).toBe('layer-2'); await record(page, 'Layer 2 fall');
    await leaveAndReturn(page);
    s = await state(page); expect(s.body).toMatchObject({ x: 64.2, y: 15.2 }); expect(s.sketch.leg).toBe('layer-2'); expect(s.sketch.elapsed).toBeLessThan(0.5);
    await record(page, 'Layer 2 re-entry');
    await rWithQueuedInput(page, 'KeyA');
    s = await state(page); expect(s.body).toMatchObject({ x: 64.2, y: 15.2 }); expect(s.sketch.queue).toEqual([]); expect(s.sketch.leg).toBe('layer-2');
    await record(page, 'Layer 2 R with queued input');
  }
  if (o.firstRide) await restoreFocusEmulation(page);
  await layerTwo(page);
  await ride(page, 'layer-2', o.secondRide, true);
  if (o.secondRide) await restoreFocusEmulation(page);
  s = await state(page);
  // The second arrival starts the climb once: two nails, the third collectable, no S3 endpoint.
  expect(s.sketch).toMatchObject({ leg: 'l3-walls', section: 'l3-walls', stage: 'traversal', completed: false, budget: 2, available: 2, pickup: false, pickupOffered: true, reach: 11, freePlacement: false });
  expect(s.sketch.queue).toEqual([]); expect(s.body.y).toBe(24.4); expect(s.body.x).toBeLessThan(0);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
  await expect(page.locator('#sketch-layer')).toContainText('Layer 3 walls');
  await expect(page.locator('#sketch-hud')).toHaveAttribute('data-layer', '3');
  await record(page, 'second arrival');
}

/** The climb's own failures, then the climb and its handoff. */
async function layerThree(page: Page, o: { recovery: boolean; captures: boolean; onLedge?: (page: Page) => Promise<void> }) {
  await toEntrance(page);
  let s: Awaited<ReturnType<typeof state>>;
  if (o.recovery) {
    // A fall during the climb restarts the climb at its entrance with the pickup back.
    await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'climb fall'); await release(page);
    await expect(page.locator('#sketch-cue')).toContainText('pick up the third nail again');
    s = await until(page, s => !s.sketch.recovering, 'climb recovery');
    expect(s.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(s.sketch).toMatchObject({ leg: 'l3-walls', budget: 2, pickup: false, pickupOffered: true });
    await record(page, 'climb fall');
    // Leave/re-entry on A restarts the climb, never Layer 1/2.
    await entryA(page); await page.keyboard.press('Escape'); await reenter(page);
    s = await state(page);
    expect(s.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(s.sketch).toMatchObject({ leg: 'l3-walls', budget: 2, pickup: false, pickupOffered: true, reach: 11 });
    expect(s.sketch.queue).toEqual([]); expect(s.canvasCount).toBe(1); await record(page, 'climb re-entry');
    // R with queued input on the climb.
    const a = (await state(page)).sketch.targets.find(t => t.id === 'l3-wall-a-pin')!;
    await page.mouse.click(a.screen.x, a.screen.y); await until(page, s => s.sketch.queue.length === 1, 'A pinned');
    await rWithQueuedInput(page, 'KeyD');
    s = await state(page); expect(s.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(s.sketch.queue).toEqual([]); expect(s.sketch.leg).toBe('l3-walls');
    await record(page, 'climb R with queued input');
  }
  const handoff = await climb(page, { captures: o.captures, onLedge: o.onLedge });
  await expectHandoff(page, handoff);
  await expect(page.locator('#sketch-cue')).toContainText('third nail is taken back');
  if (o.captures) await capture(page, 'handoff', true);
}

/** Terminal R/fall/re-entry on the end ledge, then Restart Layers 1–3. */
async function terminal(page: Page) {
  let s = await state(page);
  expect(s.sketch).toMatchObject({ stage: 'exit', completed: true, available: 2, leg: 'l3-swings' }); expect(s.sketch.queue).toEqual([]); expect(s.body.y).toBe(54);
  await expect(page.locator('#sketch-endpoint')).toContainText('S4D endpoint reached · Layers 1–3 complete');
  await page.keyboard.press('KeyR'); await page.waitForTimeout(80); expect((await state(page)).body.y).toBe(54);
  await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'terminal fall'); await release(page);
  await until(page, s => !s.sketch.recovering, 'terminal recovery'); expect((await state(page)).body.y).toBe(54);
  await page.waitForTimeout(80); const before = await state(page);
  await page.keyboard.press('Escape'); await reenter(page);
  s = await state(page); expect(s.body.y).toBe(54); expect(s.sketch.completed).toBe(true); expect(s.canvasCount).toBe(1);
  expect(s.textureCount).toBeLessThanOrEqual(before.textureCount); expect(s.geometryCount).toBeLessThanOrEqual(before.geometryCount + 6);
  await record(page, 'terminal re-entry resources');
  await page.keyboard.press('Escape'); await expect(page.locator('[data-action="replay"]')).toContainText('Restart Layers 1–3');
  await page.locator('[data-action="replay"]').click(); await page.waitForTimeout(350);
  s = await state(page);
  expect(s.body).toMatchObject(layerOneStart);
  expect(s.sketch).toMatchObject({ leg: 'layer-1', stage: 'traversal', completed: false, pickupOffered: false, reach: 10, budget: 2 });
  const lifts = (await page.evaluate(() => (window as unknown as { __curatorDebug: () => { sketch: { lifts: { id: string; state: string }[] } } }).__curatorDebug().sketch.lifts));
  expect(lifts.map(l => [l.id, l.state])).toEqual([['l1-lift', 'bottom'], ['l2-lift', 'bottom']]);
  expect(s.canvasCount).toBe(1); await record(page, 'restart Layers 1–3');
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events.length = 0; measurements.length = 0; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`,
  JSON.stringify({ status: info.status, duration: info.duration, events, layerTwo: measurements }, null, 2)));

for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  const wide = size.width === 1280;
  test(`S4D full route Layer 1 to the end ledge with section recovery ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size); const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(s => localStorage.setItem('last-curator.save.v1', s), SENTINEL);
    await open(page);
    await expect(page.locator('.build-tag')).toContainText('S4D');
    // Each size exercises one lift's full ride recovery (R, re-entry, pause/resize, actual blur).
    await toLayerThree(page, { recovery: true, firstRide: wide, secondRide: !wide, captures: true });
    await capture(page, 'climb-arrival', true);
    let paused = false;
    await layerThree(page, {
      recovery: true, captures: true,
      // 1280: pause and resize while airborne over the shared ledge, before the handoff.
      onLedge: wide ? async page => {
        await page.keyboard.press('Escape'); await page.waitForTimeout(70); const p = await state(page);
        expect(p.sketch.leg).toBe('l3-walls');
        await page.setViewportSize({ width: 960, height: 540 }); await page.waitForTimeout(200);
        const after = await state(page); expect(after.body).toEqual(p.body); expect(after.sketch.elapsed).toBe(p.sketch.elapsed);
        await shot(page, 'resize-before-handoff', true);
        await page.setViewportSize(size); await page.waitForTimeout(150);
        await page.locator('[data-action="resume"]').click(); await page.keyboard.down('KeyD'); paused = true;
      } : undefined,
    });
    if (wide) expect(paused, 'paused in the air over the ledge').toBe(true);
    if (!wide) {
      // 960: an actual tab blur on the ledge right after the handoff freezes everything.
      const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }); await page.bringToFront();
      await page.keyboard.down('KeyA'); const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
      await until(page, s => s.paused, 'actual tab blur'); await page.waitForTimeout(80); const blur = await state(page); await page.waitForTimeout(180);
      expect((await state(page)).sketch.elapsed).toBe(blur.sketch.elapsed); expect((await state(page)).body).toEqual(blur.body);
      expect(blur.sketch.leg).toBe('l3-swings'); await record(page, 'actual blur frozen on the ledge');
      await other.close(); await page.bringToFront(); await release(page);
      await page.locator('[data-action="resume"]').click(); await page.waitForTimeout(200); await cdp.detach();
      await restoreFocusEmulation(page);
      expect((await state(page)).sketch).toMatchObject({ leg: 'l3-swings', budget: 2 });
    }
    // Crossing failures stay in the crossing; the climb stays clear.
    await glueFail(page, 'glue fail after the climb');
    await nailAt(page, 'l3-strip-f', 1);
    await rWithQueuedInput(page, 'KeyD');
    let s = await state(page);
    expect(s.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(s.sketch.queue).toEqual([]); expect(s.sketch.leg).toBe('l3-swings'); await record(page, 'crossing R with queued input');
    await nailAt(page, 'l3-strip-f', 1); await toHead(page);
    await page.keyboard.press('Escape'); await reenter(page);
    s = await state(page);
    expect(s.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(s.sketch).toMatchObject({ leg: 'l3-swings', stage: 'traversal', available: 2, budget: 2, reach: 10, pickupOffered: false, freePlacement: true });
    expect(s.canvasCount).toBe(1); await record(page, 'crossing re-entry');
    await cross(page, true);
    await capture(page, 'exit');
    await terminal(page);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
    expect(errors).toEqual([]);
  });
}

test('S4D reduced motion completes Layer 1 to the end ledge through real keys and clicks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await toLayerThree(page, { recovery: false, firstRide: false, secondRide: false, captures: false });
  await layerThree(page, { recovery: false, captures: false });
  await cross(page);
  expect((await state(page)).sketch.completed).toBe(true);
  await expect(page.locator('#sketch-endpoint')).toContainText('S4D endpoint');
  await capture(page, 'reduced-motion-final');
});

test('S4D menu, denied storage and production isolation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }));
  await open(page);
  expect((await state(page)).sketch).toMatchObject({ stage: 'traversal', leg: 'layer-1' });
  await expect(page.locator('#sketch-eyebrow')).toContainText('S4D');
  await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click();
  await expect(page.locator('#modal')).toContainText('The whole');
  await expect(page.locator('[data-action="replay"]')).toContainText('Restart Layers 1–3');
  await page.goto(URL.replace(':5173', ':4173')); await expect(page.locator('[data-action="start"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  expect(await page.evaluate(() => ('__curatorDebug' in window))).toBe(false);
});
