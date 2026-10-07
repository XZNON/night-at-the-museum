import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.use({ headless: false });
const DIR = 'docs/validation/sketch-s4/s4b';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-swings';
type Screen = { offset: number; x: number; y: number; visible: boolean; reason: string };
type State = {
  body: { x: number; y: number; vx: number; vy: number; grounded: boolean; width: number; height: number };
  paused: boolean; updateCount: number; canvasCount: number; geometryCount: number; textureCount: number;
  sketch: {
    stage: string; completed: boolean; recovering: boolean; available: number; budget: number; elapsed: number;
    queue: { targetId: string; surfaceId?: string; offset?: number }[];
    motion: { state: string; swingTarget: string; swingAngle: number };
    camera: { x: number; y: number; width: number; height: number };
    grips: { id: string; x: number; y: number; vx: number; vy: number }[];
    targets: { id: string; x: number; y: number; height: number; occupiedBy: string | null }[];
    nailSurfaces: { id: string; screen: Screen[] }[];
  };
};
const state = (page: Page) => page.evaluate(() => (window as unknown as { __curatorDebug: () => State }).__curatorDebug());
let events: unknown[] = [];
async function record(page: Page, event: string) { events.push({ event, url: page.url(), size: page.viewportSize(), state: await state(page) }); }
async function until(page: Page, predicate: (s: State) => boolean, label: string, ms = 10000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const s = await state(page); if (predicate(s)) return s; await page.waitForTimeout(8); }
  await record(page, `FAILED ${label}`); throw new Error(`Timeout ${label}: ${JSON.stringify((await state(page)).sketch.motion)}`);
}
async function open(page: Page) { await page.goto(URL); await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350); }
async function release(page: Page) { for (const key of ['Space', 'KeyA', 'KeyD', 'KeyE']) await page.keyboard.up(key); }
const centre = (s: State) => ({ x: s.body.x + s.body.width / 2, y: s.body.y + s.body.height / 2 });
const nail = (s: State, surface: string) => {
  const p = [...s.sketch.queue].reverse().find(q => q.surfaceId === surface);
  return p ? s.sketch.grips.find(g => g.id === p.targetId) ?? null : null;
};
const spot = (s: State, surface: string, offset: number) => s.sketch.nailSurfaces.find(v => v.id === surface)!.screen.find(p => p.offset === offset)!;

/** Click wood at an offset once it is in reach and on screen; the queue gains that surface. */
async function nailAt(page: Page, surface: string, offset: number) {
  // Wait for the camera to settle so the projected spot is where the click lands.
  let last = { x: NaN, y: NaN };
  const s = await until(page, s => {
    const p = spot(s, surface, offset); const still = Math.abs(s.sketch.camera.x - last.x) < 0.01 && Math.abs(s.sketch.camera.y - last.y) < 0.01;
    last = { x: s.sketch.camera.x, y: s.sketch.camera.y };
    return p.reason === '' && p.visible && (still || s.sketch.motion.state === 'swing');
  }, `${surface} ${offset} in reach`);
  const before = s.sketch.queue.length; const p = spot(s, surface, offset);
  for (const selector of ['#sketch-hud .section-hint', '#sketch-hud .sketch-status']) {
    const rect = await page.locator(selector).boundingBox();
    expect(rect && p.x > rect.x && p.x < rect.x + rect.width && p.y > rect.y && p.y < rect.y + rect.height, `${surface} is clickable outside ${selector}`).toBe(false);
  }
  await page.mouse.click(p.x, p.y);
  const after = await until(page, s => s.sketch.queue.length === before + 1, `nailed ${surface}`);
  expect(after.sketch.queue.at(-1)!.surfaceId).toBe(surface);
  await record(page, `nailed ${surface} @${offset}`);
}

/** Stand on F's head: run, jump at the edge and let go of D over the head. */
async function toHead(page: Page) {
  const s0 = await state(page);
  const head = s0.sketch.targets.find(t => t.occupiedBy && t.id.startsWith('l3-strip-f'))!;
  await page.keyboard.down('KeyD');
  await until(page, s => s.body.x >= 21, 'ledge edge');
  await page.keyboard.down('Space');
  await until(page, s => centre(s).x >= head.x - 0.5, 'over the head');
  await page.keyboard.up('KeyD');
  const landed = await until(page, s => s.sketch.recovering || (s.body.grounded && Math.abs(s.body.y - (head.y + head.height / 2)) < 0.01), 'land on F');
  await release(page);
  expect(landed.sketch.recovering, 'landed on F head').toBe(false);
  await record(page, 'standing on F');
}

/** Leap with an apex air jump and press E as soon as the nail is in reach. */
async function leapTo(page: Page, surface: string) {
  await page.keyboard.down('KeyD'); await page.keyboard.down('Space');
  const start = (await state(page)).updateCount; let second = false; let nextE = 0;
  for (;;) {
    const s = await state(page); const g = nail(s, surface);
    if (s.sketch.motion.state === 'swing') break;
    if (s.sketch.recovering || (s.body.grounded && s.updateCount > start + 8)) { await release(page); return false; }
    if (!second && s.updateCount > start + 4 && s.body.vy <= 1.5) { second = true; await page.keyboard.up('Space'); await page.keyboard.down('Space'); }
    // One E per press: a second E while already gripped would release.
    if (g && s.updateCount >= nextE && Math.hypot(centre(s).x - g.x, centre(s).y - g.y) <= 1.9) { await page.keyboard.press('KeyE'); nextE = s.updateCount + 3; }
    await page.waitForTimeout(4);
  }
  await release(page); return true;
}

/** Pump with A/D by the swing direction, release rising past `theta`, air jump at the apex, E for a target nail. */
async function swingOff(page: Page, theta: number, target?: string) {
  let prev = (await state(page)).sketch.motion.swingAngle; let dir = 1; let held = '';
  for (;;) {
    const s = await state(page);
    if (s.sketch.motion.state !== 'swing') { await release(page); return false; }
    const a = s.sketch.motion.swingAngle; if (a !== prev) dir = Math.sign(a - prev); prev = a;
    if (dir > 0 && a >= theta) break;
    const key = dir > 0 ? 'KeyD' : 'KeyA';
    if (held !== key) { if (held) await page.keyboard.up(held); await page.keyboard.down(key); held = key; }
    await page.waitForTimeout(4);
  }
  if (held !== 'KeyD') { if (held) await page.keyboard.up(held); await page.keyboard.down('KeyD'); }
  await page.keyboard.press('Space');
  const start = (await state(page)).updateCount; let second = false; let nextE = 0;
  for (;;) {
    const s = await state(page); const g = target ? nail(s, target) : null;
    if (target && s.sketch.motion.state === 'swing' && g && s.sketch.motion.swingTarget === g.id) break;
    if (!target && s.sketch.completed) break;
    if (s.sketch.recovering || (s.body.grounded && !s.sketch.completed)) { await release(page); return false; }
    // Air jump at the apex only while still below the target nail.
    if (!second && s.updateCount > start + 3 && s.body.vy <= 1 && (!g || centre(s).y < g.y - 1.4)) { second = true; await page.keyboard.down('Space'); }
    if (g && s.updateCount >= nextE && Math.hypot(centre(s).x - g.x, centre(s).y - g.y) <= 1.9) { await page.keyboard.press('KeyE'); nextE = s.updateCount + 3; }
    await page.waitForTimeout(4);
  }
  await release(page); return true;
}

async function capture(page: Page, label: string, pause = false) {
  if (pause) { await page.keyboard.press('Escape'); await expect(page.locator('#modal')).toBeVisible(); await page.waitForTimeout(40); }
  await record(page, label);
  await page.screenshot({ path: `${DIR}/${label}-${page.viewportSize()!.width}.png`, ...(pause ? { style: '#modal { visibility:hidden; } #sketch-hud[hidden] {display:block!important;}' } : {}) });
  if (pause) await page.locator('[data-action="resume"]').click();
}

/** One full attempt with the given choices; returns false on a glue retry. */
async function attempt(page: Page, o: { m1: number; m2: number; captures: boolean }) {
  await nailAt(page, 'l3-strip-f', 1);
  await toHead(page);
  await nailAt(page, 'l3-bar-m1', o.m1);
  if (o.captures) await capture(page, 'on-f', true);
  // Leap while M1 slides back toward the head.
  await until(page, s => (nail(s, 'l3-bar-m1')?.vx ?? 0) < -1, 'M1 returning');
  if (!await leapTo(page, 'l3-bar-m1')) return false;
  await record(page, 'gripped M1');
  await page.keyboard.press('KeyQ');
  await until(page, s => s.sketch.queue.length === 1 && s.sketch.queue[0].surfaceId === 'l3-bar-m1', 'Q frees F');
  if ((await state(page)).sketch.motion.state !== 'swing') return false;
  // Clicking a moving bar while swinging on another.
  await nailAt(page, 'l3-bar-m2', o.m2);
  if (o.captures) await capture(page, 'swinging-m1', true);
  // Hang until M2 is close and moving away, then pump and release.
  await until(page, s => { const a = nail(s, 'l3-bar-m1'); const b = nail(s, 'l3-bar-m2'); return !!a && !!b && b.x - a.x < 10.2 && b.vx > 0.8; }, 'M2 window', 12000);
  if (!await swingOff(page, 60, 'l3-bar-m2')) return false;
  await record(page, 'gripped M2');
  await page.keyboard.press('KeyQ');
  await until(page, s => s.sketch.queue.length === 1 && s.sketch.queue[0].surfaceId === 'l3-bar-m2', 'Q frees M1');
  if (o.captures) await capture(page, 'swinging-m2', true);
  if (!await swingOff(page, 40)) return false;
  return true;
}

async function cross(page: Page, o: { m1: number; m2: number; captures: boolean }) {
  for (let tries = 1; tries <= 4; tries++) {
    if (await attempt(page, o)) { events.push({ event: 'crossed', tries }); return tries; }
    await record(page, `glue retry ${tries}`);
    await until(page, s => !s.sketch.recovering && s.body.grounded && s.body.x === 17.2, 'section retry');
    await page.waitForTimeout(100);
  }
  throw new Error('no crossing in four real-control attempts');
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events = []; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`, JSON.stringify({ status: info.status, events }, null, 2)));

for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  test(`S4B real crossing, endpoint and terminal recovery ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size); await page.addInitScript(() => localStorage.setItem('last-curator.save.v1', 's4b-sentinel'));
    await open(page); await capture(page, 'entrance');
    await cross(page, { m1: 0, m2: 0.5, captures: true });
    const s = await state(page);
    expect(s.sketch.stage).toBe('exit'); expect(s.sketch.available).toBe(2); expect(s.sketch.queue).toEqual([]); expect(s.body.y).toBe(54);
    await expect(page.locator('#sketch-endpoint')).toContainText('S4B endpoint');
    await capture(page, 'exit');
    await page.keyboard.press('KeyR'); await page.waitForTimeout(80); expect((await state(page)).body.y).toBe(54);
    await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'terminal fall'); await release(page);
    await until(page, s => !s.sketch.recovering, 'terminal recovery'); expect((await state(page)).body.y).toBe(54);
    await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click(); await page.locator('[data-action="start"]').click();
    await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
    expect((await state(page)).body.y).toBe(54); expect((await state(page)).canvasCount).toBe(1); await record(page, 'terminal re-entry');
    await page.keyboard.press('Escape'); await page.locator('[data-action="replay"]').click(); await page.waitForTimeout(350);
    expect((await state(page)).body.x).toBe(17.2); expect((await state(page)).sketch.completed).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe('s4b-sentinel'); await record(page, 'restart and save isolation');
  });
}

test('S4B other placement choices also cross (F far end, M1 0.25, M2 0)', async ({ page }) => {
  await open(page); await cross(page, { m1: 0.25, m2: 0, captures: false });
  expect((await state(page)).sketch.completed).toBe(true);
});

test('S4B preview and refusals: empty air, out of reach, full budget; the queue never changes', async ({ page }) => {
  await open(page);
  const s = await state(page); const m1 = spot(s, 'l3-bar-m1', 0);
  expect(m1.reason).toBe('Out of reach.');
  await page.mouse.move(m1.x, m1.y); await page.waitForTimeout(120);
  await expect(page.locator('#sketch-nearest')).toContainText('Bar M1 · Out of reach.');
  await capture(page, 'preview-out-of-reach');
  await page.mouse.click(m1.x, m1.y); await page.waitForTimeout(120); expect((await state(page)).sketch.queue).toEqual([]);
  const f = spot(s, 'l3-strip-f', 0.5);
  await page.mouse.move(f.x, f.y - 140); await page.waitForTimeout(120);
  await expect(page.locator('#sketch-nearest')).toContainText('Empty air');
  await capture(page, 'preview-empty-air');
  await page.mouse.click(f.x, f.y - 140); await page.waitForTimeout(120);
  expect((await state(page)).sketch.queue).toEqual([]); await expect(page.locator('#sketch-cue')).toContainText('Nails only go into wood');
  await page.mouse.move(f.x, f.y); await page.waitForTimeout(120);
  await expect(page.locator('#sketch-nearest')).toContainText('Click: nail Strip F here');
  await capture(page, 'preview-valid');
  await nailAt(page, 'l3-strip-f', 0); await nailAt(page, 'l3-strip-f', 1);
  const full = spot(await state(page), 'l3-strip-f', 0.5);
  expect(full.reason).toBe('Both nails are placed. Press Q.');
  await page.mouse.click(full.x, full.y); await page.waitForTimeout(120); expect((await state(page)).sketch.queue.length).toBe(2);
  await page.keyboard.press('KeyQ'); await until(page, s => s.sketch.queue.length === 1 && s.sketch.queue[0].offset === 1, 'FIFO frees the first');
  await record(page, 'refusals and FIFO');
});

test('S4B Q on the current head and on the current grip removes support and retries here', async ({ page }) => {
  await open(page); await nailAt(page, 'l3-strip-f', 1); await toHead(page);
  await page.keyboard.press('KeyQ'); await until(page, s => s.sketch.recovering, 'falls after Q on F');
  await expect(page.locator('#sketch-cue')).toContainText('Glue');
  await until(page, s => !s.sketch.recovering && s.body.x === 17.2, 'retry at start'); await record(page, 'Q on current head');
  await nailAt(page, 'l3-strip-f', 1); await toHead(page); await nailAt(page, 'l3-bar-m1', 0);
  await until(page, s => (nail(s, 'l3-bar-m1')?.vx ?? 0) < -1, 'M1 returning');
  expect(await leapTo(page, 'l3-bar-m1')).toBe(true);
  await page.keyboard.press('KeyQ'); await until(page, s => s.sketch.queue.length === 1, 'Q frees F');
  await page.keyboard.press('KeyQ'); const detached = await until(page, s => s.sketch.motion.state !== 'swing', 'Q on current grip');
  expect(detached.sketch.queue).toEqual([]); expect(Math.hypot(detached.body.vx, detached.body.vy)).toBeLessThan(15);
  await until(page, s => s.sketch.recovering, 'falls after Q on M1'); await until(page, s => !s.sketch.recovering && s.body.x === 17.2, 'retry');
  await record(page, 'Q on current grip');
});

test('S4B swing pause, actual blur, resize and re-entry keep section ownership', async ({ page }) => {
  await open(page); await nailAt(page, 'l3-strip-f', 1); await toHead(page); await nailAt(page, 'l3-bar-m1', 0);
  await until(page, s => (nail(s, 'l3-bar-m1')?.vx ?? 0) < -1, 'M1 returning'); expect(await leapTo(page, 'l3-bar-m1')).toBe(true);
  await expect(page.locator('#sketch-motion')).toContainText('Swing');
  await page.keyboard.press('Escape'); await page.waitForTimeout(70); const paused = await state(page);
  await page.setViewportSize({ width: 960, height: 540 }); await page.waitForTimeout(200);
  expect((await state(page)).body).toEqual(paused.body); expect((await state(page)).sketch.elapsed).toBe(paused.sketch.elapsed);
  await capture(page, 'resize-swing'); await page.locator('[data-action="resume"]').click();
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }); await page.bringToFront();
  await page.keyboard.down('KeyD'); const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await until(page, s => s.paused, 'actual tab blur'); await page.waitForTimeout(80); const blur = await state(page); await page.waitForTimeout(180);
  expect((await state(page)).sketch.elapsed).toBe(blur.sketch.elapsed); expect((await state(page)).body).toEqual(blur.body); await record(page, 'actual blur frozen');
  await other.close(); await page.bringToFront(); await release(page);
  await page.locator('[data-action="leave"]').click(); await page.locator('[data-action="start"]').click(); await page.waitForTimeout(350);
  const s = await state(page); expect(s.body.x).toBe(17.2); expect(s.sketch.available).toBe(2); expect(s.sketch.motion.state).toBe('normal'); expect(s.sketch.queue).toEqual([]);
  expect(s.canvasCount).toBe(1); await record(page, 'swing re-entry returns to the entrance');
});

test('S4B no-nail attempts fall locally; denied storage and production isolation', async ({ page }) => {
  for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
    await page.setViewportSize(size); await open(page); await page.keyboard.down('KeyD'); await page.keyboard.down('Space'); await page.waitForTimeout(400);
    await page.keyboard.up('Space'); await page.keyboard.down('Space'); await until(page, s => s.sketch.recovering, 'no-nail fall'); await release(page);
    await until(page, s => !s.sketch.recovering, 'local recovery'); expect((await state(page)).body.x).toBe(17.2); expect((await state(page)).sketch.available).toBe(2);
    await record(page, 'no-nail failure');
  }
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } })); await open(page);
  expect((await state(page)).sketch.stage).toBe('traversal');
  await page.goto(URL.replace(':5173', ':4173')); await expect(page.locator('[data-action="start"]')).toBeVisible();
  expect(await page.evaluate(() => ('__curatorDebug' in window))).toBe(false);
});

test('S4B reduced motion completes through real keys and clicks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await cross(page, { m1: 0, m2: 0.5, captures: false }); await record(page, 'reduced motion crossing');
});
