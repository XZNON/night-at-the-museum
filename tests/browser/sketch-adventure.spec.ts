import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { traverseLayerOne } from './sketch-layer1-controls';
import { evidence as l2Evidence, measurements, layerTwo, ride } from './sketch-layer2-controls';
import { evidence, events, state, record, until, release, reenter, capture, shot, climb, cross, type State } from './sketch-layer3-controls';

// S5A: the sun on the end ledge of the full route, driven only by real keys
// and mouse clicks with the shared Layer 1/2/3 helpers. Debug state is read
// back for decisions and assertions, never written.
test.use({ headless: false });
const DIR = 'docs/validation/sketch-s5/s5a';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=adventure';
const SENTINEL = 's5a-save-sentinel';
evidence.dir = DIR; l2Evidence.dir = DIR;

type Sun = { x: number; y: number; width: number; height: number; collected: boolean; settled: boolean; view: { visible: boolean; scale: number; rays: number } | null };
type Extra = { sketch: { sun: Sun | null; boards: unknown[]; axes: { id: string; x: number; y: number; angle: number }[]; nailSurfaces: { id: string; from: unknown; to: unknown }[] } };
const extra = (page: Page) => page.evaluate(() => (window as unknown as { __curatorDebug: () => Extra }).__curatorDebug());
const sun = async (page: Page) => (await extra(page)).sketch.sun!;
/** Every mechanism's pose: boards/pendulums, axes and the crossing's bars. */
const pose = async (page: Page) => {
  const s = (await extra(page)).sketch;
  return JSON.stringify([s.boards, s.axes.map(a => [a.id, a.x, a.y, a.angle]), s.nailSurfaces.map(v => [v.id, v.from, v.to])]);
};
/** The ledge is reached (landed, or the sun taken in the air). */
const onLedge = (s: State) => s.sketch.stage === 'exit';
const layerOneStart = { x: 1.5, y: 0 };

async function open(page: Page) { await page.goto(URL); await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350); }
async function toEntrance(page: Page) {
  await page.keyboard.down('KeyD'); await until(page, s => s.body.x >= 4.2, 'climb entrance'); await page.keyboard.up('KeyD');
  await until(page, s => s.body.grounded && s.body.vx === 0, 'standing at the entrance');
}
/** Sample the sun's drawn pulse/rays a few times while it is visible. */
async function sunSamples(page: Page, n = 6) {
  const out: { scale: number; rays: number }[] = [];
  for (let i = 0; i < n; i++) { const v = (await sun(page)).view!; expect(v.visible).toBe(true); out.push({ scale: v.scale, rays: v.rays }); await page.waitForTimeout(90); }
  return out;
}

/** Layer 1 → lift → Layer 2 → lift → climb → crossing, with the shared helpers. */
async function toEndLedge(page: Page, captures: boolean) {
  let s = await state(page);
  expect(s.sketch).toMatchObject({ leg: 'layer-1', stage: 'traversal', reach: 10, pickupOffered: false, budget: 2 });
  expect(s.body).toMatchObject(layerOneStart);
  if (captures) await capture(page, 'layer-1-entrance');
  await traverseLayerOne(page);
  await ride(page, 'layer-1', false);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
  await layerTwo(page);
  await ride(page, 'layer-2', false, true);
  s = await state(page);
  expect(s.sketch).toMatchObject({ leg: 'l3-walls', stage: 'traversal', completed: false, budget: 2, pickupOffered: true, reach: 11 });
  await expect(page.locator('#sketch-cue')).toContainText('pick up the third');
  await expect(page.locator('#sketch-hud')).toHaveAttribute('data-layer', '3');
  await record(page, 'second arrival');
  await toEntrance(page);
  s = await climb(page, { captures: false });
  // The handoff, in the adventure's player-facing checkpoint words.
  expect(s.sketch).toMatchObject({ leg: 'l3-swings', stage: 'traversal', completed: false, budget: 2, available: 2, pickup: false, freePlacement: true });
  await expect(page.locator('#sketch-cue')).toContainText('third nail is taken back');
  await expect(page.locator('#sketch-goal')).toContainText('Layer 3 swings start');
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
  expect((await sun(page)).collected).toBe(false);
  if (captures) await capture(page, 'handoff', true);
  return cross(page, captures, onLedge);
}

/**
 * The sun is taken by walking from the ledge spawn when the swing landed
 * short of it, or it was already taken in the air by the release.
 */
async function takeSun(page: Page, captures: boolean) {
  const landed = await sun(page);
  const inFlight = landed.collected;
  events.push({ event: inFlight ? 'sun taken in the air by the last swing' : 'landed on the end ledge before the sun' });
  if (!inFlight) {
    let s = await state(page);
    expect(s.sketch).toMatchObject({ stage: 'exit', completed: false, leg: 'l3-swings' }); expect(s.body).toMatchObject({ x: 59, y: 54 });
    await expect(page.locator('#sketch-endpoint')).toBeHidden();
    await expect(page.locator('#sketch-hint')).toContainText('Walk right and take the sun');
    await expect(page.locator('#sketch-goal')).toContainText('the end ledge');
    if (captures) await capture(page, 'ledge-before-sun', true);
    // The ledge before the sun is a safe checkpoint: R keeps it, the sun stays.
    await page.keyboard.press('KeyR'); await page.waitForTimeout(120);
    s = await state(page); expect(s.body).toMatchObject({ x: 59, y: 54 }); expect(s.sketch.completed).toBe(false);
    expect((await sun(page)).collected).toBe(false); await record(page, 'R on the ledge before the sun');
    await page.keyboard.down('KeyD');
    await expect(page.locator('#modal')).toBeVisible({ timeout: 10000 });
    await release(page);
  }
  // Success screen, paused, everything settled.
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal .eyebrow')).toContainText('A piece recovered');
  await expect(page.locator('#modal')).toContainText('The sun is yours');
  await expect(page.locator('#modal')).toContainText('Isolated study · Campaign saves are untouched');
  await expect(page.locator('#modal [data-action="leave"]')).toContainText('Return');
  await expect(page.locator('#modal [data-action="resume"]')).toContainText('Keep exploring');
  const s = await state(page); const taken = await sun(page);
  expect(s.paused).toBe(true);
  expect(s.sketch).toMatchObject({ stage: 'exit', completed: true, leg: 'l3-swings' }); expect(s.sketch.queue).toEqual([]);
  expect([taken.collected, taken.settled, taken.view!.visible]).toEqual([true, true, false]);
  await record(page, 'success screen');
  if (captures) await shot(page, 'success', false);
  return inFlight;
}

/** Resumed play after the sun: mechanisms hold still, and retries stay on the ledge with no second report. */
async function afterSun(page: Page, viaReturn: boolean, captures: boolean) {
  if (viaReturn) {
    // Return goes back to the study menu; entering again resumes on the ledge.
    await page.locator('#modal [data-action="leave"]').click();
    await expect(page.locator('#modal')).toContainText('Take back');
    await expect(page.locator('#modal [data-action="replay"]')).toContainText('Restart the Sketch');
    await page.locator('#modal [data-action="start"]').click();
    await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350);
    const s = await state(page); expect(s.body).toMatchObject({ x: 59, y: 54 }); await record(page, 'return and re-enter');
  } else {
    await page.locator('#modal [data-action="resume"]').click(); await page.waitForTimeout(200);
  }
  await expect(page.locator('#sketch-endpoint')).toContainText('The sun is yours');
  await expect(page.locator('#sketch-hint')).toContainText('Everything has settled');
  // Settled: the picture holds still while the player walks and jumps on the ledge.
  const before = await pose(page); const t0 = await state(page);
  // A short walk right, a stop, then a jump straight up: no fall, no retry.
  await page.keyboard.down('KeyD'); await page.waitForTimeout(150); await page.keyboard.up('KeyD');
  const stopped = await until(page, s => s.body.grounded && s.body.vx === 0, 'stopped on the ledge');
  expect(stopped.body.x).toBeGreaterThan(59.3);
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await until(page, s => s.body.grounded || s.sketch.recovering, 'landed after a jump on the ledge');
  const t1 = await state(page);
  expect(t1.body.x).toBeCloseTo(stopped.body.x, 5);
  expect(t1.updateCount).toBeGreaterThan(t0.updateCount + 30);
  expect(await pose(page)).toBe(before); expect(t1.sketch.elapsed).toBe(t0.sketch.elapsed);
  expect(t1.sketch.recovering).toBe(false); expect(t1.body.y).toBe(54);
  await record(page, 'settled while exploring');
  if (captures) await capture(page, 'settled', true);
  // R stays on the ledge with the sun taken; no second success screen.
  await page.keyboard.press('KeyR'); await page.waitForTimeout(300);
  let s = await state(page);
  expect(s.body).toMatchObject({ x: 59, y: 54 }); expect(s.sketch.completed).toBe(true); expect(s.paused).toBe(false);
  await expect(page.locator('#modal')).toBeHidden(); expect((await sun(page)).collected).toBe(true);
  expect(await pose(page)).toBe(before); await record(page, 'R after the sun');
  // Walking back over the sun's spot reports nothing again.
  await page.keyboard.down('KeyD'); await until(page, s => s.body.x > 63.5, 'over the sun spot'); await page.keyboard.up('KeyD');
  await page.waitForTimeout(200); expect((await state(page)).paused).toBe(false); await expect(page.locator('#modal')).toBeHidden();
  // A fall off the ledge's right end returns to the ledge.
  await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, 'fall after the sun'); await release(page);
  s = await until(page, s => !s.sketch.recovering && s.body.grounded, 'recovered after the sun');
  expect(s.body).toMatchObject({ x: 59, y: 54 }); expect(s.sketch.completed).toBe(true); await expect(page.locator('#modal')).toBeHidden();
  expect(await pose(page)).toBe(before); await record(page, 'fall after the sun');
  // Leave and re-enter: the same ledge, the sun taken, nothing reported.
  const resources = await state(page);
  await page.keyboard.press('Escape'); await reenter(page); await page.waitForTimeout(300);
  s = await state(page);
  expect(s.body).toMatchObject({ x: 59, y: 54 }); expect(s.sketch).toMatchObject({ stage: 'exit', completed: true, leg: 'l3-swings' });
  expect(s.paused).toBe(false); await expect(page.locator('#modal')).toBeHidden();
  const back = await sun(page); expect([back.collected, back.settled, back.view!.visible]).toEqual([true, true, false]);
  expect(await pose(page)).toBe(before);
  expect(s.canvasCount).toBe(1); expect(s.textureCount).toBeLessThanOrEqual(resources.textureCount);
  await record(page, 're-entry after the sun');
  // Restart the Sketch: Layer 1, the sun back, nothing settled.
  await page.keyboard.press('Escape'); await expect(page.locator('[data-action="replay"]')).toContainText('Restart the Sketch');
  await page.locator('[data-action="replay"]').click(); await page.waitForTimeout(400);
  s = await state(page); const fresh = await sun(page);
  expect(s.body).toMatchObject(layerOneStart); expect(s.sketch).toMatchObject({ leg: 'layer-1', stage: 'traversal', completed: false });
  expect([fresh.collected, fresh.settled, fresh.view!.visible]).toEqual([false, false, true]);
  expect(s.canvasCount).toBe(1); await record(page, 'restart the Sketch');
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events.length = 0; measurements.length = 0; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`,
  JSON.stringify({ status: info.status, duration: info.duration, events, layerTwo: measurements }, null, 2)));

for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
  const wide = size.width === 1280;
  test(`S5A full route to the sun with terminal retries ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size); const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(s => localStorage.setItem('last-curator.save.v1', s), SENTINEL);
    await open(page);
    await expect(page.locator('.build-tag')).toContainText('S5A');
    await expect(page.locator('#sketch-eyebrow')).toContainText('S5A');
    // The sun pulses and its rays turn with normal motion.
    const samples = await sunSamples(page);
    expect(new Set(samples.map(v => v.scale.toFixed(4))).size).toBeGreaterThan(1);
    events.push({ event: 'sun samples (normal motion)', samples });
    const tries = await toEndLedge(page, true);
    events.push({ event: 'crossing tries', tries });
    await capture(page, 'end-ledge');
    await takeSun(page, true);
    await afterSun(page, !wide, wide);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
    expect(errors).toEqual([]);
  });
}

test('S5A reduced motion: a still sun, taken at the end of the full route', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  const still = await sunSamples(page);
  expect(still.every(v => v.scale === 1 && v.rays === 0)).toBe(true);
  events.push({ event: 'sun samples (reduced motion)', samples: still });
  await toEndLedge(page, false);
  if (!(await sun(page)).collected) {
    const ledge = await sunSamples(page, 4);
    expect(ledge.every(v => v.scale === 1 && v.rays === 0)).toBe(true);
    await capture(page, 'reduced-motion-ledge');
  }
  await takeSun(page, false);
  await shot(page, 'reduced-motion-success', false);
});

test('S5A menu, denied storage and production isolation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }));
  await open(page);
  expect((await state(page)).sketch).toMatchObject({ stage: 'traversal', leg: 'layer-1' });
  expect((await sun(page))).toMatchObject({ x: 62, y: 54, width: 1.4, height: 1.6, collected: false, settled: false });
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-action="replay"]')).toContainText('Restart the Sketch');
  await page.locator('[data-action="leave"]').click();
  await expect(page.locator('#modal')).toContainText('Take back');
  await expect(page.locator('#modal')).toContainText('Campaign saves are untouched');
  await expect(page.locator('[data-action="replay"]')).toContainText('Restart the Sketch');
  // Production ignores the dev study entirely.
  await page.goto(URL.replace(':5173', ':4173')); await expect(page.locator('[data-action="start"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await expect(page.locator('#modal')).not.toContainText('Take back');
  await expect(page.locator('.build-tag')).not.toContainText('S5A');
  expect(await page.evaluate(() => ('__curatorDebug' in window))).toBe(false);
});
