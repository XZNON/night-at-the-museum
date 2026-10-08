import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { traverseLayerOne } from './sketch-layer1-controls';
import { evidence as l2Evidence, layerTwo, ride } from './sketch-layer2-controls';
import { evidence, events, state, until, capture, climb, cross } from './sketch-layer3-controls';

// Sketch art pass, part 1: the skins cut from the approved references, seen
// through the real camera. Static framings of every study and S1 bay, then the
// full adventure with real keys and clicks (shared helpers) to show the skins
// in play and that the route still completes unchanged.
const DIR = 'docs/validation/sketch-art/part1';
evidence.dir = DIR; l2Evidence.dir = DIR;
const DEV = 'http://127.0.0.1:5173/';
const STUDIES = ['layer-1', 'layer-2', 'layer-3-walls', 'layer-3-swings', 'adventure'] as const;
const BAYS = ['pins', 'walls', 'foothold', 'fixed-swing', 'moving-swing', 'combined'] as const;

type Debug = { textureCount: number; geometryCount: number };
const debug = (page: Page) => page.evaluate(() => (window as unknown as { __curatorDebug: () => Debug }).__curatorDebug());

async function open(page: Page, query: string) {
  await page.goto(`${DEV}?scene=unfinished-sketch&${query}`);
  await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(600);
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.afterEach(async ({}, info) => {
  writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`, JSON.stringify({ status: info.status, events }, null, 2));
  events.length = 0;
});

test('static framings of every study and bay at 1280 and 960', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  // A missing resource is judged by its URL (the console line has none);
  // the only known one is the pre-existing /favicon.ico.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const failed: string[] = [];
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) failed.push(`${r.status()} ${r.url()}`); });
  for (const width of [1280, 960]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 540 });
    for (const study of STUDIES) {
      await open(page, `study=${study}`);
      await page.screenshot({ path: `${DIR}/static-${study}-${width}.png` });
    }
    for (const bay of BAYS) {
      await open(page, `study=mechanics&bay=${bay}`);
      await page.screenshot({ path: `${DIR}/static-bay-${bay}-${width}.png` });
    }
  }
  const d = await debug(page);
  events.push({ event: 'static framings', errors, failed, textures: d.textureCount, geometries: d.geometryCount });
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test('full adventure with skins: real keys and clicks to the claimed light', async ({ page }) => {
  await open(page, 'study=adventure');
  await capture(page, 'layer-1-entrance');
  await traverseLayerOne(page);
  await capture(page, 'layer-1-cleared');
  await ride(page, 'layer-1', false);
  await capture(page, 'layer-2-arrival');
  await layerTwo(page);
  await capture(page, 'layer-2-cleared');
  await ride(page, 'layer-2', false, true);
  await capture(page, 'layer-3-arrival');
  await page.keyboard.down('KeyD'); await until(page, s => s.body.x >= 4.2, 'climb entrance'); await page.keyboard.up('KeyD');
  await until(page, s => s.body.grounded && s.body.vx === 0, 'standing at the entrance');
  let s = await climb(page, { captures: true });
  expect(s.sketch).toMatchObject({ leg: 'l3-swings', stage: 'traversal' });
  await capture(page, 'crossing-start');
  await cross(page, true, st => st.sketch.stage === 'exit');
  await capture(page, 'end-ledge');
  // Walk right to the torch unless the last swing already claimed the light;
  // the claim opens the success screen over the settled picture.
  const success = page.getByRole('heading', { name: 'The enchanted light.' });
  if (!(await success.isVisible())) {
    await page.keyboard.down('KeyD');
    await expect(success).toBeVisible({ timeout: 8000 });
    await page.keyboard.up('KeyD');
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/light-claimed-${page.viewportSize()!.width}.png` });
  s = await state(page);
  expect(s.sketch.completed).toBe(true);
  await page.locator('[data-action="resume"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/settled-ledge-${page.viewportSize()!.width}.png` });
});

test('moving mechanisms are drawn smoothly on every display frame', async ({ page }) => {
  // User review 2026-10-08: frames seemed to skip. Mechanisms are now drawn
  // between fixed steps with the loop's alpha, so a moving board advances on
  // every display frame instead of holding, then jumping a whole step.
  await open(page, 'study=layer-2');
  const r = await page.evaluate(() => new Promise<{ dx: number[]; ms: number[] }>(resolve => {
    const d = (window as unknown as { __curatorDebug: () => { sketch: { drawn: { id: string; x: number }[] } } }).__curatorDebug;
    const dx: number[] = []; const ms: number[] = [];
    let lastX: number | null = null; let lastT = 0;
    const tick = (now: number) => setTimeout(() => {
      const x = d().sketch.drawn.find(m => m.id === 'l2-board-b')!.x;
      if (lastX !== null) { dx.push(x - lastX); ms.push(now - lastT); }
      lastX = x; lastT = now;
      if (dx.length < 300) requestAnimationFrame(tick); else resolve({ dx, ms });
    }, 0);
    requestAnimationFrame(tick);
  }));
  const frozen = r.dx.filter(v => Math.abs(v) < 1e-9).length;
  const sorted = r.ms.slice().sort((a, b) => a - b);
  events.push({ event: 'board l2-board-b drawn per display frame', frames: r.dx.length, frozen,
    frameMs: { p50: sorted[150], max: sorted[sorted.length - 1] } });
  expect(frozen).toBeLessThanOrEqual(3);
});
