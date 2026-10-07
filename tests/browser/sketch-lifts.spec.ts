import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { observe, traverseLayerOne, stepOntoLift, stepOffLift } from './sketch-layer1-controls';

// S4L vertical lifts with real keys and clicks. The Layer 2 -> 3 lift, the
// joined route through both lifts and reduced motion through both are driven
// by the updated S3 spec (sketch-layer2.spec.ts) with its evidence moved here.
test.use({ headless: false });

const DIR = 'docs/validation/sketch-s4/s4l';
const BASE = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=';
const SENTINEL = 's4l-save-sentinel-unchanged';
const SIZES = [{ width: 1280, height: 720 }, { width: 960, height: 540 }];
let events: unknown[] = [];

type Obs = Awaited<ReturnType<typeof observe>>;
const lift = (s: Obs, id: string) => s.sketch!.lifts.find(l => l.id === id)!;
async function record(page: Page, event: string) {
  const s = await observe(page);
  events.push({ event, url: page.url(), size: page.viewportSize(), tick: s.updateCount, body: s.body,
    stage: s.sketch?.stage, leg: s.sketch?.leg, transit: s.sketch?.transit, ride: s.sketch?.ride, lifts: s.sketch?.lifts,
    camera: s.sketch?.camera, paused: s.paused, canvasCount: s.canvasCount });
}
async function capture(page: Page, label: string) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${DIR}/${label}-${page.viewportSize()!.width}.png` });
  await record(page, `capture ${label}`);
}
async function open(page: Page, study: string) {
  await page.goto(BASE + study); await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
}
/** Both directions, held jumps and air jumps while the cab rises; returns the rider's peak above the deck. */
async function tryToLeave(page: Page, id: string) {
  const deck = lift(await observe(page), id);
  let highest = 0;
  for (const key of ['KeyA', 'KeyD']) {
    await page.keyboard.down(key);
    for (let i = 0; i < 2; i++) {
      // A held jump, then the air jump: the highest the rider can reach. No
      // press is sent once the ride has ended.
      if ((await observe(page)).sketch!.stage !== 'transit') { await page.keyboard.up(key); return highest; }
      await page.keyboard.down('Space'); await page.waitForTimeout(140); await page.keyboard.up('Space');
      await page.waitForTimeout(40);
      if ((await observe(page)).sketch!.stage !== 'transit') { await page.keyboard.up(key); return highest; }
      await page.keyboard.down('Space');
      for (let k = 0; k < 8; k++) {
        await page.waitForTimeout(25);
        const s = await observe(page);
        if (s.sketch!.stage !== 'transit') { await page.keyboard.up('Space'); await page.keyboard.up(key); return highest; }
        expect(s.body!.x).toBeGreaterThanOrEqual(deck.left - 1e-6);
        expect(s.body!.x + 0.65).toBeLessThanOrEqual(deck.right + 1e-6);
        highest = Math.max(highest, s.body!.y - lift(s, id).top);
      }
      await page.keyboard.up('Space');
    }
    await page.keyboard.up(key);
  }
  return highest;
}
async function blurAway(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  // Playwright keeps pages focused by default; disable that so a real second
  // foreground tab fires the browser's own blur event.
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.bringToFront();
  await page.keyboard.down('KeyD');
  const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await expect.poll(async () => (await observe(page)).paused).toBe(true);
  return async () => { await other.close(); await page.bringToFront(); await page.keyboard.up('KeyD'); await cdp.detach(); };
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events = []; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`,
  JSON.stringify({ status: info.status, events }, null, 2)));

for (const size of SIZES) {
  test(`S4L layer-1 route, lift and Layer 2 landing endpoint ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(s => localStorage.setItem('last-curator.save.v1', s), SENTINEL);
    await open(page, 'layer-1');
    expect((await observe(page)).canvasCount).toBe(1);
    expect((await observe(page)).sketch!.lifts.map(l => [l.id, l.state])).toEqual([['l1-lift', 'bottom']]);
    await traverseLayerOne(page);
    // The exit spawn is off the deck: nothing starts by itself.
    await page.waitForTimeout(600);
    expect((await observe(page)).sketch!.stage).toBe('exit');
    expect((await observe(page)).body!.x).toBe(55.7);
    await expect(page.locator('#sketch-prompt')).toContainText('Walk right onto the lift');
    await capture(page, 'l1-lift-bottom');
    // E does nothing here; there is nothing to board.
    await page.keyboard.press('KeyE'); await page.waitForTimeout(150);
    expect((await observe(page)).sketch!.stage).toBe('exit');
    await stepOntoLift(page);
    await record(page, 'ride started by standing on the deck');
    expect(lift(await observe(page), 'l1-lift').walls).toBe(true);
    await expect(page.locator('#sketch-motion')).toContainText('Riding the lift');
    // Nail commands are refused in the cab.
    const before = (await observe(page)).sketch!.queue;
    await page.keyboard.press('KeyQ');
    const socket = (await observe(page)).sketch!.targets.find(t => t.screen?.visible);
    if (socket?.screen) await page.mouse.click(socket.screen.x, socket.screen.y);
    await page.waitForTimeout(100);
    expect((await observe(page)).sketch!.queue).toEqual(before);
    await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.4);
    await capture(page, 'l1-lift-mid');
    const highest = await tryToLeave(page, 'l1-lift');
    events.push({ triedToLeave: 'l1-lift', highestAboveDeck: highest });
    await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 10000 }).toBe('arrival');
    const arrived = await observe(page);
    expect(arrived.body!.y).toBe(15.2); expect(arrived.body!.vx).toBe(0);
    expect(arrived.body!.x).toBeGreaterThanOrEqual(63); expect(arrived.body!.x + 0.65).toBeLessThanOrEqual(66.5);
    expect(lift(arrived, 'l1-lift')).toMatchObject({ state: 'parked', walls: false });
    await page.waitForTimeout(200);
    await capture(page, 'l1-lift-arrival');
    await stepOffLift(page);
    await expect(page.locator('#sketch-endpoint')).toContainText('Slice 2 endpoint');
    await capture(page, 'l1-landing-endpoint');
    // The parked deck is fixed ground for good: walking back over it never rides.
    await page.keyboard.down('KeyA'); await page.waitForTimeout(250); await page.keyboard.up('KeyA'); await page.waitForTimeout(400);
    expect((await observe(page)).sketch!.stage).toBe('arrival');
    expect(lift(await observe(page), 'l1-lift').state).toBe('parked');
    expect((await observe(page)).canvasCount).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
    expect(errors).toEqual([]);
  });

  test(`S4L mid-ride R, pause, resize, actual blur and leave/re-entry ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
    await open(page, 'layer-1');
    await traverseLayerOne(page);
    const atExit = async (label: string) => {
      await expect.poll(async () => (await observe(page)).sketch!.stage).toBe('exit');
      const s = await observe(page);
      expect(s.body!.x).toBe(55.7); expect(lift(s, 'l1-lift')).toMatchObject({ state: 'bottom', progress: 0, walls: false });
      await page.waitForTimeout(500);
      expect((await observe(page)).sketch!.stage).toBe('exit');
      await record(page, label);
    };
    // R mid-ride.
    await stepOntoLift(page); await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.2);
    await page.keyboard.press('KeyR'); await atExit('R mid-ride returned to the exit');
    // Escape pause freezes the ride; resize while paused keeps it.
    await stepOntoLift(page); await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.25);
    await page.keyboard.press('Escape'); await expect.poll(async () => (await observe(page)).paused).toBe(true);
    await page.waitForTimeout(80);
    const paused = await observe(page); await page.waitForTimeout(400);
    expect((await observe(page)).sketch!.transit).toBe(paused.sketch!.transit);
    expect((await observe(page)).body).toEqual(paused.body);
    await page.setViewportSize(size.width === 1280 ? SIZES[1] : SIZES[0]); await page.waitForTimeout(150);
    expect((await observe(page)).sketch!.transit).toBe(paused.sketch!.transit);
    await capture(page, 'l1-paused-resized');
    await page.setViewportSize(size);
    await page.locator('[data-action="resume"]').click();
    await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(paused.sketch!.transit!);
    await record(page, 'resumed ride continues');
    // An actual blur returns to the departure exit with the deck reset.
    const restore = await blurAway(page);
    await page.waitForTimeout(100);
    const blurred = await observe(page);
    expect(blurred.sketch!.stage).toBe('exit'); expect(blurred.body!.x).toBe(55.7);
    expect(lift(blurred, 'l1-lift').state).toBe('bottom');
    await record(page, 'actual blur mid-ride');
    await restore();
    await page.locator('[data-action="resume"]').click();
    await atExit('blur recovery resumed at the exit');
    // Leave and re-enter mid-ride: the departure exit again.
    await stepOntoLift(page); await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.2);
    await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click();
    await page.locator('[data-action="start"]').click(); await expect(page.locator('#sketch-hud')).toBeVisible();
    await page.waitForTimeout(300);
    expect((await observe(page)).canvasCount).toBe(1);
    await atExit('re-entry after leaving mid-ride');
    // And the ride still completes afterwards.
    await stepOntoLift(page);
    await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 10000 }).toBe('arrival');
    await stepOffLift(page);
    await expect(page.locator('#sketch-endpoint')).toContainText('Slice 2 endpoint');
    expect(errors).toEqual([]);
  });
}

test('S4L reduced motion keeps the lift and its reframe linear', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 'layer-1');
  await traverseLayerOne(page);
  const exitCamera = (await observe(page)).sketch!.camera;
  await stepOntoLift(page);
  await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.4);
  const ride = await observe(page);
  expect(ride.sketch!.camera.y).toBeGreaterThan(exitCamera.y);
  expect(Math.abs(ride.body!.y + 0.625 - ride.sketch!.camera.y)).toBeLessThan(9);
  await capture(page, 'l1-reduced-motion-mid');
  await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 10000 }).toBe('arrival');
  await stepOffLift(page);
  await expect(page.locator('#sketch-endpoint')).toContainText('Slice 2 endpoint');
});

for (const size of SIZES) {
  test(`S4L parked decks in the Layer 2 and Layer 3 studies ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await open(page, 'layer-2');
    let s = await observe(page);
    expect(s.sketch!.lifts.map(l => [l.id, l.state])).toEqual([['l1-lift', 'parked'], ['l2-lift', 'bottom']]);
    expect(s.body).toMatchObject({ x: 64.2, y: 15.2, grounded: true });
    await capture(page, 'layer-2-entrance-parked-l1');
    for (const [study, spawn] of [['layer-3-walls', { x: 4.2, y: 24.4 }], ['layer-3-swings', { x: 17.2, y: 49.5 }], ['layer-3', { x: 4.2, y: 24.4 }]] as const) {
      await open(page, study);
      s = await observe(page);
      expect(s.sketch!.lifts.map(l => [l.id, l.state, l.top])).toEqual([['l1-lift', 'parked', 15.2], ['l2-lift', 'parked', 24.4]]);
      expect(s.body).toMatchObject({ ...spawn, grounded: true });
      expect(s.sketch!.surfaces.find(x => x.id === 'l2-lift-deck')).toMatchObject({ left: -2.6, right: 0, top: 24.4 });
      await expect(page.locator('#sketch-prompt')).toBeHidden();
      if (study !== 'layer-3-swings') await capture(page, `${study}-entrance-parked-l2`);
    }
  });
}

test('S4L production ignores every study and ships no inspection hook', async ({ page }) => {
  for (const study of ['layer-1', 'layer-2', 'layers-1-2']) {
    await page.goto(`http://127.0.0.1:4173/?scene=unfinished-sketch&study=${study}`);
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
    expect(await page.evaluate(() => '__curatorDebug' in window)).toBe(false);
  }
});
