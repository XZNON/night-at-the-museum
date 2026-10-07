import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { evidence, events, state, record, until, release, reenter, capture, shot, entryA, climb, expectHandoff, nailAt, toHead, cross, glueFail, type State } from './sketch-layer3-controls';

// S4C: the accepted S4A climb and S4B crossing as one Layer 3, driven only by
// real keys and mouse clicks. Debug state is read back for decisions and
// assertions, never written. Helpers follow the accepted S4A/S4B specs.
test.use({ headless: false });
const DIR = 'docs/validation/sketch-s4/s4c';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3';
evidence.dir = DIR;
async function open(page: Page) { await page.goto(URL); await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350); }
test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events.length = 0; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`, JSON.stringify({ status: info.status, events }, null, 2)));

for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  test(`S4C full walls to swings route, endpoint and terminal recovery ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size); await page.addInitScript(() => localStorage.setItem('last-curator.save.v1', 's4c-sentinel'));
    await open(page);
    expect((await state(page)).sketch).toMatchObject({ leg: 'l3-walls', reach: 11, pickupOffered: true, freePlacement: false, budget: 2 });
    const handoff = await climb(page, { captures: true });
    await expectHandoff(page, handoff);
    await expect(page.locator('#sketch-cue')).toContainText('third nail is taken back');
    await capture(page, 'handoff', true);
    // The two camera bands blend over the ledge as the player walks it.
    await page.keyboard.down('KeyD'); await until(page, s => s.body.x >= 18.5, 'walk the ledge'); await page.keyboard.up('KeyD');
    await page.waitForTimeout(500); await capture(page, 'ledge');
    await page.keyboard.down('KeyA'); await until(page, s => s.body.x <= 15, 'back over the ledge'); await page.keyboard.up('KeyA');
    await page.waitForTimeout(300);
    const back = await state(page); expect(back.sketch.leg).toBe('l3-swings'); expect(back.sketch.budget).toBe(2); await record(page, 'backtrack on the ledge');
    await cross(page, true);
    const s = await state(page);
    expect(s.sketch.stage).toBe('exit'); expect(s.sketch.completed).toBe(true); expect(s.sketch.available).toBe(2); expect(s.sketch.queue).toEqual([]); expect(s.body.y).toBe(54);
    await expect(page.locator('#sketch-endpoint')).toContainText('S4C endpoint');
    await capture(page, 'exit');
    await page.keyboard.press('KeyR'); await page.waitForTimeout(80); expect((await state(page)).body.y).toBe(54);
    await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'terminal fall'); await release(page);
    await until(page, s => !s.sketch.recovering, 'terminal recovery'); expect((await state(page)).body.y).toBe(54);
    await page.waitForTimeout(80); const beforeResources = await state(page);
    await page.keyboard.press('Escape'); await reenter(page);
    let r = await state(page); expect(r.body.y).toBe(54); expect(r.sketch.completed).toBe(true); expect(r.canvasCount).toBe(1);
    expect(r.textureCount).toBeLessThanOrEqual(beforeResources.textureCount); expect(r.geometryCount).toBeLessThanOrEqual(beforeResources.geometryCount + 6);
    await record(page, 'terminal re-entry resources');
    await page.keyboard.press('Escape'); await expect(page.locator('[data-action="replay"]')).toContainText('Restart Layer 3');
    await page.locator('[data-action="replay"]').click(); await page.waitForTimeout(350);
    r = await state(page);
    expect(r.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(r.sketch).toMatchObject({ leg: 'l3-walls', completed: false, pickup: false, pickupOffered: true, reach: 11 });
    expect(r.canvasCount).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe('s4c-sentinel'); await record(page, 'restart and save isolation');
  });
}

test('S4C deliberate glue fail after the climb, R with queued input, leave/re-entry and recovery re-entry in the crossing', async ({ page }) => {
  await open(page); await expectHandoff(page, await climb(page));
  await glueFail(page, 'glue fail after the climb');
  // R with queued input: a nail placed, Space and D held, Q queued in the same moment.
  await nailAt(page, 'l3-strip-f', 1);
  await page.keyboard.down('KeyD'); await page.keyboard.down('Space'); await page.keyboard.press('KeyQ'); await page.keyboard.press('KeyR'); await release(page);
  await page.waitForTimeout(120);
  let s = await state(page);
  expect(s.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(s.sketch.queue).toEqual([]); expect(s.sketch.leg).toBe('l3-swings'); expect(s.sketch.budget).toBe(2);
  await record(page, 'R with queued input in the crossing');
  // The pause panel's checkpoint retry is the same action.
  await nailAt(page, 'l3-strip-f', 1);
  await page.keyboard.press('Escape'); await page.locator('[data-action="checkpoint"]').click(); await page.waitForTimeout(120);
  s = await state(page); expect(s.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(s.sketch.queue).toEqual([]); await record(page, 'checkpoint retry');
  // Leave/re-entry mid-crossing returns to the crossing start, not the climb.
  await nailAt(page, 'l3-strip-f', 1); await toHead(page);
  await page.keyboard.press('Escape'); await reenter(page);
  s = await state(page);
  expect(s.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(s.sketch).toMatchObject({ leg: 'l3-swings', stage: 'traversal', available: 2, budget: 2, reach: 10, pickupOffered: false, freePlacement: true });
  expect(s.sketch.queue).toEqual([]); expect(s.canvasCount).toBe(1); await record(page, 'crossing re-entry');
  await capture(page, 'crossing-reentry');
  // Leaving while the glue recovery runs also returns to the crossing start.
  await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'into the glue again'); await release(page);
  await page.keyboard.press('Escape'); await reenter(page);
  s = await state(page); expect(s.body).toMatchObject({ x: 17.2, y: 49.5 }); expect(s.sketch.leg).toBe('l3-swings'); expect(s.sketch.recovering).toBe(false);
  await record(page, 're-entry during crossing recovery');
  await glueFail(page, 'glue fail after re-entry');
});

test('S4C leave/re-entry during the climb restarts the climb with the pickup back', async ({ page }) => {
  await open(page); await entryA(page);
  await page.keyboard.press('Escape'); await reenter(page);
  let s = await state(page);
  expect(s.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(s.sketch).toMatchObject({ leg: 'l3-walls', budget: 2, pickup: false, pickupOffered: true, reach: 11, freePlacement: false });
  expect(s.sketch.queue).toEqual([]); await record(page, 'climb re-entry');
  // A fall during the climb (running off the arrival ground) names the pickup and restarts the climb.
  await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'climb fall'); await release(page);
  await expect(page.locator('#sketch-cue')).toContainText('pick up the third nail again');
  s = await until(page, s => !s.sketch.recovering, 'climb recovery');
  expect(s.body.x).toBe(4.2); expect(s.sketch.leg).toBe('l3-walls'); expect(s.sketch.budget).toBe(2); await record(page, 'climb fall');
  // Leaving during the climb's recovery also lands at the entrance.
  await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'climb fall again'); await release(page);
  await page.keyboard.press('Escape'); await reenter(page);
  s = await state(page); expect(s.body).toMatchObject({ x: 4.2, y: 24.4 }); expect(s.sketch.leg).toBe('l3-walls'); await record(page, 're-entry during climb recovery');
});

test('S4C pause and resize across the handoff, actual blur on the ledge', async ({ page }) => {
  await open(page);
  let paused: State | null = null;
  const handoff = await climb(page, {
    onLedge: async page => {
      // Airborne over the shared ledge, still on the climb: pause, resize, resume.
      await page.keyboard.press('Escape'); await page.waitForTimeout(70); paused = await state(page);
      expect(paused.sketch.leg).toBe('l3-walls');
      await page.setViewportSize({ width: 960, height: 540 }); await page.waitForTimeout(200);
      const after = await state(page); expect(after.body).toEqual(paused.body); expect(after.sketch.elapsed).toBe(paused.sketch.elapsed);
      await shot(page, 'resize-before-handoff', true);
      await page.locator('[data-action="resume"]').click();
      // Pause cleared the held keys; press D again so the landing is on the ledge.
      await page.keyboard.down('KeyD');
    },
  });
  expect(paused, 'paused in the air over the ledge').not.toBeNull();
  await expectHandoff(page, handoff);
  // Pause right after the handoff and resize back: the handoff never repeats.
  await page.keyboard.press('Escape'); await page.waitForTimeout(70); const after = await state(page);
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(200);
  expect((await state(page)).body).toEqual(after.body); expect((await state(page)).sketch.elapsed).toBe(after.sketch.elapsed);
  await shot(page, 'resize-after-handoff', true);
  await page.locator('[data-action="resume"]').click(); await page.waitForTimeout(100);
  // Actual blur while walking the ledge (the camera blend zone).
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }); await page.bringToFront();
  await page.keyboard.down('KeyA'); const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await until(page, s => s.paused, 'actual tab blur'); await page.waitForTimeout(80); const blur = await state(page); await page.waitForTimeout(180);
  expect((await state(page)).sketch.elapsed).toBe(blur.sketch.elapsed); expect((await state(page)).body).toEqual(blur.body);
  expect(blur.sketch.leg).toBe('l3-swings'); await record(page, 'actual blur frozen on the ledge');
  await other.close(); await page.bringToFront(); await release(page);
  await page.locator('[data-action="resume"]').click(); await page.waitForTimeout(200);
  const s = await state(page); expect(s.sketch.leg).toBe('l3-swings'); expect(s.sketch.budget).toBe(2); expect(s.sketch.queue).toEqual([]);
  await glueFail(page, 'glue fail after blur');
});

test('S4C reduced motion completes the joined route through real keys and clicks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await expectHandoff(page, await climb(page));
  await cross(page);
  expect((await state(page)).sketch.completed).toBe(true); await expect(page.locator('#sketch-endpoint')).toContainText('S4C endpoint');
  await record(page, 'reduced motion joined route');
});

test('S4C denied storage and production isolation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } })); await open(page);
  expect((await state(page)).sketch).toMatchObject({ stage: 'traversal', leg: 'l3-walls' });
  await page.goto(URL.replace(':5173', ':4173')); await expect(page.locator('[data-action="start"]')).toBeVisible();
  expect(await page.evaluate(() => ('__curatorDebug' in window))).toBe(false);
});
