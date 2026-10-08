import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { expandedRoute } from './expanded-route';
import { evidence as l2Evidence, measurements } from './sketch-layer2-controls';
import { evidence, events, record, shot } from './sketch-layer3-controls';
import { DEV, PROD, KEY, LIGHT_OWNED, PEAR_OWNED, PEAR_RESTORED, OPEN_PROMPT, LOCKED_PROMPT, seed, debug, drag, hold, saved, savedJson,
  seedAndOpen, newMuseum, toSketchFrame, toSketchFrameBlind, inspectFromSpawn, enterSketch, toEndLedge, claim, expectSketchReturn } from './campaign-controls';

// S5C: the enchanted light placed in the dark sky becomes the garden's sun,
// the complete picture and the ending. Production cases use seeded saves and
// the UI alone; the dev case plays the whole campaign with real keys, drags
// and clicks from New Game, reading debug state back (never writing it).
test.use({ headless: false });
const DIR = 'docs/validation/sketch-s5/s5c';
evidence.dir = DIR; l2Evidence.dir = DIR;
const COMPLETE = seed(['golden-pear', 'sun-disc'], ['golden-pear', 'sun-disc']);
const SKY = 'Sky silhouette for the enchanted light';
const COMPLETE_OBJECTIVE = 'The Garden Before Dawn is complete';
const COMPLETE_NOTE = 'The Garden Before Dawn is complete. Both paintings stay open to replay.';
const sky = (page: Page) => page.getByRole('button', { name: SKY });
const light = (page: Page) => page.locator('[data-piece="sun-disc"]');
const ending = (page: Page) => page.getByRole('heading', { name: 'Restored.' });

/** Production: seeded save, Continue, walk to the masterpiece by timing and inspect it. */
async function inspectSeeded(page: Page, save: unknown) {
  await page.goto(PROD);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: save });
  await page.reload(); await newMuseum(page, true); await inspectFromSpawn(page);
}
/** Right after a light placement: saved at once, the complete picture, then the ending. */
async function expectPlaced(page: Page, label: string, viaTimer = true) {
  expect(JSON.parse((await saved(page))!)).toEqual(COMPLETE);
  if (viaTimer) {
    await expect(page.locator('.painting-study img')).toHaveAttribute('src', /complete\.webp$/);
    await expect(page.locator('#placement-message')).toContainText('The Garden Before Dawn is complete');
    await expect(page.locator('.sun-glow')).toHaveCount(1);
    await page.waitForTimeout(550);
    await page.screenshot({ path: `${DIR}/${label}-restoring.png` });
  }
  await expect(ending(page)).toBeVisible({ timeout: 4000 });
  await expectEnding(page);
  await page.screenshot({ path: `${DIR}/${label}-ending.png` });
  events.push({ event: `${label}: placed, saved complete, ending shown` });
}
async function expectEnding(page: Page) {
  const modal = page.locator('#modal');
  await expect(modal).toContainText('The Garden Before Dawn');
  await expect(modal).toContainText('The golden pear, home from Royal Supper.');
  await expect(modal).toContainText('The enchanted light, carried out of the Unfinished Sketch, rises as the garden’s sun.');
  await expect(page.locator('.ending-art')).toHaveAttribute('src', /complete\.webp$/);
  await expect(page.getByRole('button', { name: 'Stay in the museum' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'New game (reset progress)' })).toBeVisible();
  expect(await modal.innerText()).not.toMatch(/later update|mountain|S5/i);
}
/** After Stay or a reload of a complete save: the museum reads complete everywhere. */
async function expectCompleteMuseum(page: Page) {
  await expect(page.locator('#museum-hud')).toBeVisible();
  await expect(page.locator('#objective')).toHaveText(COMPLETE_OBJECTIVE);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Empty');
}
/** The complete inspection: both targets restored, no piece, See the ending. */
async function expectCompleteInspection(page: Page) {
  await expect(page.locator('.painting-study img')).toHaveAttribute('src', /complete\.webp$/);
  await expect(page.locator('#pear-target')).toBeDisabled();
  await expect(page.locator('#sky-target')).toBeDisabled();
  await expect(page.locator('#sky-target')).toHaveAttribute('aria-label', 'Sun restored');
  await expect(page.locator('.inspection-inventory')).toHaveText('Inventory · Empty');
  await expect(page.getByRole('button', { name: 'See the ending' })).toBeVisible();
  expect(await page.locator('#modal').innerText()).not.toMatch(/later update/i);
}

/** Dev: walk with held keys (pose read back) to a museum point, facing the back wall. */
async function walkTo(page: Page, x: number, z: number) {
  const pose = async () => (await debug(page)).museum!;
  for (let i = 0; i < 6 && Math.abs((await pose()).rotation[1]) > 0.03; i++) await drag(page, Math.max(-500, Math.min(500, (await pose()).rotation[1] / 0.003)));
  const axis = async (key: string, done: (p: number[]) => boolean) => {
    if (done((await pose()).position)) return;
    await page.keyboard.down(key);
    await expect.poll(async () => done((await pose()).position), { timeout: 8000, intervals: [16] }).toBe(true);
    await page.keyboard.up(key); await page.waitForTimeout(60);
  };
  const p = (await pose()).position;
  await axis(p[2] > z ? 'KeyW' : 'KeyS', q => p[2] > z ? q[2] <= z : q[2] >= z);
  await axis(p[0] < x ? 'KeyD' : 'KeyA', q => p[0] < x ? q[0] >= x : q[0] <= x);
}
async function inspectMasterpieceDev(page: Page) {
  await walkTo(page, 2.6, -2.7);
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Inspect the masterpiece');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.painting-study')).toBeVisible();
}

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events.length = 0; measurements.length = 0; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`,
  JSON.stringify({ status: info.status, duration: info.duration, events, layerTwo: measurements }, null, 2)));

test('S5C production drag placement, wrong drops, ending, reload complete, Keep progress and Confirm reset', async ({ page }) => {
  const errors: string[] = []; const failures: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await inspectSeeded(page, LIGHT_OWNED);
  expect(await page.evaluate(() => '__curatorDebug' in window)).toBe(false);
  await expect(light(page)).toBeVisible();
  await expect(light(page).locator('img')).toHaveAttribute('src', /restoration\/light\.png$/);
  await expect(page.locator('#placement-message')).toContainText('Drag the enchanted light into the dark sky');
  await page.screenshot({ path: `${DIR}/production-light-owned-inspection.png` });
  // Wrong drops: elsewhere on the painting and onto the restored pear keep the light.
  await light(page).dragTo(page.locator('.painting-study img'), { targetPosition: { x: 60, y: 300 } });
  await expect(page.locator('#placement-message')).toHaveText('That is not the sky’s empty sun. The light stays in your inventory.');
  await page.locator('#placement-message').evaluate(el => { el.textContent = ''; });
  await light(page).dragTo(page.locator('#pear-target'), { force: true });
  await expect(page.locator('#placement-message')).toHaveText('That is not the sky’s empty sun. The light stays in your inventory.');
  await expect(light(page)).toBeVisible();
  expect(JSON.parse((await saved(page))!)).toEqual(LIGHT_OWNED);
  events.push({ event: 'wrong drops kept the light' });
  // The right drop.
  await light(page).dragTo(sky(page));
  await expectPlaced(page, 'production-drag');
  // Keep progress returns to the ending.
  await page.getByRole('button', { name: 'New game (reset progress)' }).click();
  await expect(page.getByRole('heading', { name: 'Reset progress?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep progress' }).click();
  await expect(ending(page)).toBeVisible(); await expectEnding(page);
  expect(JSON.parse((await saved(page))!)).toEqual(COMPLETE);
  // Stay in the museum: complete objective, empty inventory, the frame still opens.
  await page.getByRole('button', { name: 'Stay in the museum' }).click();
  await expectCompleteMuseum(page);
  await page.screenshot({ path: `${DIR}/production-complete-museum.png` });
  // Reload: the menu note, the museum and the inspection all read complete.
  await page.reload();
  await expect(page.locator('#modal')).toContainText(COMPLETE_NOTE);
  expect(await page.locator('#modal').innerText()).not.toMatch(/later update/i);
  await page.screenshot({ path: `${DIR}/production-complete-menu.png` });
  await newMuseum(page, true); await expectCompleteMuseum(page);
  await inspectFromSpawn(page); await expectCompleteInspection(page);
  await page.screenshot({ path: `${DIR}/production-complete-inspection.png` });
  // Clicking the restored sky or the painting changes nothing.
  await page.locator('.painting-study img').click({ position: { x: 60, y: 300 } });
  expect(JSON.parse((await saved(page))!)).toEqual(COMPLETE);
  await page.getByRole('button', { name: 'See the ending' }).click();
  await expect(ending(page)).toBeVisible(); await expectEnding(page);
  // Escape is Stay.
  await page.keyboard.press('Escape'); await expectCompleteMuseum(page);
  // The Sketch frame stays open after completion.
  await page.reload(); await newMuseum(page, true); await toSketchFrameBlind(page);
  await expect(page.locator('#museum-prompt')).toHaveText(OPEN_PROMPT);
  await page.screenshot({ path: `${DIR}/production-complete-sketch-frame.png` });
  // New game from the ending, confirmed: a fresh museum with the frame locked; other keys kept.
  await page.evaluate(() => localStorage.setItem('another-game', 'keep'));
  await page.reload(); await newMuseum(page, true); await inspectFromSpawn(page);
  await page.getByRole('button', { name: 'See the ending' }).click();
  await page.getByRole('button', { name: 'New game (reset progress)' }).click();
  await page.getByRole('button', { name: 'Confirm reset / New Game' }).click();
  await expect(page.locator('#museum-hud')).toBeVisible();
  await expect(page.locator('#objective')).toHaveText('Inspect the masterpiece · Find its missing pear in Royal Supper');
  await expect(page.locator('#inventory')).toHaveText('Inventory · Empty');
  expect(await saved(page)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('another-game'))).toBe('keep');
  await page.waitForTimeout(350); await toSketchFrameBlind(page);
  await expect(page.locator('#museum-prompt')).toHaveText(LOCKED_PROMPT);
  events.push({ event: 'confirmed reset from the ending: fresh museum, frame locked' });
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});

test('S5C production click placement and reload right after placement keeps it complete', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await inspectSeeded(page, LIGHT_OWNED);
  // The sky without a selection keeps the light; select it, then the sky.
  await sky(page).click();
  await expect(page.locator('#placement-message')).toContainText('The light stays in your inventory');
  await light(page).click();
  await expect(page.locator('#placement-message')).toHaveText('Enchanted light selected. Choose the dark sky’s empty sun.');
  await sky(page).click();
  // Reload during the restore animation: the save was written first.
  expect(JSON.parse((await saved(page))!)).toEqual(COMPLETE);
  await page.reload();
  await expect(page.locator('#modal')).toContainText(COMPLETE_NOTE);
  await newMuseum(page, true); await expectCompleteMuseum(page);
  await inspectFromSpawn(page); await expectCompleteInspection(page);
  events.push({ event: 'reload during the restore animation: complete' });
  expect(errors).toEqual([]);
});

test('S5C production keyboard placement; the sky before the pear and before the light; denied writes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  // Before the pear is restored, and before the light is owned.
  for (const [save, text] of [[PEAR_OWNED, 'The pear comes first: restore the golden pear.'], [PEAR_RESTORED, 'Claim the enchanted light in the Unfinished Sketch first.']] as const) {
    await inspectSeeded(page, save);
    await sky(page).click();
    await expect(page.locator('#placement-message')).toHaveText(text);
    expect(JSON.parse((await saved(page))!)).toEqual(save);
    events.push({ event: 'sky refused', save, text });
  }
  await page.screenshot({ path: `${DIR}/production-sky-before-light.png` });
  // Keyboard: Tab to the light, Enter, Tab to the sky, Enter.
  await inspectSeeded(page, LIGHT_OWNED);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(light(page)).toBeFocused();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(sky(page)).toBeFocused(); await page.keyboard.press('Enter');
  await expectPlaced(page, 'production-keyboard');
  // Denied writes: the placement happens in memory, with a notice; the stored save is unchanged.
  await seedAndOpen(page, PROD, LIGHT_OWNED);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); }; });
  await page.reload(); await newMuseum(page, true); await inspectFromSpawn(page);
  await light(page).click(); await sky(page).click();
  await expect(page.locator('#save-notice')).toContainText('Progress remains in memory');
  await expect(ending(page)).toBeVisible({ timeout: 4000 });
  expect(JSON.parse((await saved(page))!)).toEqual(LIGHT_OWNED);
  await page.getByRole('button', { name: 'Stay in the museum' }).click(); await expectCompleteMuseum(page);
  events.push({ event: 'denied writes: complete in memory, stored save unchanged' });
  expect(errors).toEqual([]);
});

test('S5C 960x540 keyboard placement and ending layout', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await inspectSeeded(page, LIGHT_OWNED);
  await page.screenshot({ path: `${DIR}/production-light-owned-inspection-960.png` });
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(light(page)).toBeFocused();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(sky(page)).toBeFocused(); await page.keyboard.press('Enter');
  await expectPlaced(page, 'production-960');
  for (const name of ['Stay in the museum', 'New game (reset progress)']) await expect(page.getByRole('button', { name })).toBeInViewport();
  await page.getByRole('button', { name: 'Stay in the museum' }).click(); await expectCompleteMuseum(page);
  // Stay leaves the curator in front of the masterpiece: inspect it again in place.
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Inspect the masterpiece');
  await page.keyboard.press('KeyE'); await expectCompleteInspection(page);
  await expect(page.getByRole('button', { name: 'See the ending' })).toBeInViewport();
  await page.screenshot({ path: `${DIR}/production-complete-inspection-960.png` });
  expect(errors).toEqual([]);
});

test('S5C full campaign from New Game to the ending with real controls 1280', async ({ page }) => {
  test.setTimeout(1_500_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  // The dev server may reload a freshly opened page once (run 1 lost its context here); settle first.
  await page.goto(DEV); await page.waitForLoadState('networkidle');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await newMuseum(page, false);
  // Royal Supper: the pear.
  await hold(page, 'KeyA', 800); await hold(page, 'KeyW', 1350);
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
  await page.keyboard.press('KeyE'); await expect(page.locator('#hud')).toBeVisible();
  const supperStart = Date.now();
  await expandedRoute(page);
  events.push({ event: 'Royal Supper route', seconds: (Date.now() - supperStart) / 1000 });
  await expect(page.locator('#modal')).toContainText('The golden pear is now in your inventory');
  expect(await savedJson(page)).toEqual(PEAR_OWNED);
  await page.getByRole('button', { name: 'Return to Museum', exact: true }).click();
  await expect(page.locator('#inventory')).toHaveText('Inventory · Golden pear');
  // The pear, by drag.
  await inspectMasterpieceDev(page);
  await page.locator('[data-piece="golden-pear"]').dragTo(page.getByRole('button', { name: 'Pear silhouette' }));
  await expect(page.locator('#placement-message')).toContainText('Colour restored');
  expect(await savedJson(page)).toEqual(PEAR_RESTORED);
  await page.keyboard.press('Escape');
  await expect(page.locator('#objective')).toHaveText('Claim the enchanted light in the Unfinished Sketch');
  await record(page, 'pear placed');
  // The Unfinished Sketch: the light.
  await toSketchFrame(page); await enterSketch(page);
  const sketchStart = Date.now();
  events.push({ event: 'first route', tries: await toEndLedge(page) });
  await claim(page, true);
  events.push({ event: 'Sketch route', seconds: (Date.now() - sketchStart) / 1000 });
  expect(await savedJson(page)).toEqual(LIGHT_OWNED);
  await page.locator('#modal [data-action="leave"]').click();
  await expectSketchReturn(page);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Enchanted light');
  await expect(page.locator('#objective')).toHaveText('Bring the light to the masterpiece');
  await shot(page, 'sketch-frame-empty-torch', false);
  // The light, by click, in the sky.
  await inspectMasterpieceDev(page);
  await light(page).click(); await sky(page).click();
  await expectPlaced(page, 'campaign');
  let d = await debug(page);
  expect([d.overlay, d.campaignComplete, d.museum!.restored]).toEqual(['ending', true, 2]);
  expect(d.campaign).toEqual({ collectedPieceIds: ['golden-pear', 'sun-disc'], restoredPieceIds: ['golden-pear', 'sun-disc'] });
  await page.getByRole('button', { name: 'Stay in the museum' }).click();
  await expectCompleteMuseum(page);
  expect((await debug(page)).paused).toBe(false);
  await shot(page, 'campaign-complete-museum', false);
  // Replay the Sketch after completion: "already yours", the save unchanged.
  const before = await saved(page);
  await toSketchFrame(page); await enterSketch(page);
  // Same-session re-entry resumes the end ledge with the light taken (S5B); Restart adventure replays from Layer 1.
  expect((await debug(page)).sketch).toMatchObject({ stage: 'exit', completed: true });
  await page.keyboard.press('Escape'); await page.locator('[data-action="replay"]').click();
  await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(400);
  events.push({ event: 'replay route', tries: await toEndLedge(page) });
  await claim(page, false);
  expect(await saved(page)).toBe(before);
  await page.locator('#modal [data-action="leave"]').click();
  await expectSketchReturn(page); await expectCompleteMuseum(page);
  // New game through the confirmation: a fresh museum, the frame locked.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset / New Game' }).click();
  await expect(page.locator('#museum-hud')).toBeVisible(); await page.waitForTimeout(350);
  await expect(page.locator('#objective')).toHaveText('Inspect the masterpiece · Find its missing pear in Royal Supper');
  expect(await saved(page)).toBeNull();
  d = await debug(page);
  expect([d.campaignComplete, d.museum!.restored, d.museum!.sketchOpen]).toEqual([false, 0, false]);
  await toSketchFrame(page); await expect(page.locator('#museum-prompt')).toHaveText(LOCKED_PROMPT);
  await record(page, 'new game after the ending');
  expect(errors).toEqual([]);
});
