import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { evidence as l2Evidence, measurements } from './sketch-layer2-controls';
import { evidence, events, record, capture, shot } from './sketch-layer3-controls';
import { DEV, PROD, KEY, PEAR_OWNED, PEAR_RESTORED, LIGHT_OWNED, OPEN_PROMPT, LOCKED_PROMPT, DEV_WORDS, debug, saved, savedJson,
  seedAndOpen, newMuseum, toSketchFrame, toSketchFrameBlind, centreClick, inspectFromSpawn, enterSketch, noDevWords,
  layerOneStart, toEndLedge, claim, expectSketchReturn } from './campaign-controls';

// S5B: the Sketch as the campaign's second adventure, on the normal (non-study)
// entry with seeded saves and only real keys, mouse drags and clicks. The S5A
// helpers drive the route. Debug state (dev server) is read back for decisions
// and assertions, never written. Production checks use the UI alone.
// S5C updates: the sky target is "Sky silhouette for the enchanted light" and
// answers in placement words; the light's inventory icon is its piece art.
// Evidence goes to DIR; rerun outputs for S5C are moved out of s5b/ afterwards.
test.use({ headless: false });
const DIR = 'docs/validation/sketch-s5/s5b';
evidence.dir = DIR; l2Evidence.dir = DIR;
test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
test.beforeEach(() => { events.length = 0; measurements.length = 0; });
test.afterEach(({}, info) => writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`,
  JSON.stringify({ status: info.status, duration: info.duration, events, layerTwo: measurements }, null, 2)));

test('S5B locked frame, opening after the pear is restored, and transition spam', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  // New game: the frame hangs on the left wall, locked.
  await page.goto(DEV); await page.evaluate(() => localStorage.clear()); await page.reload();
  await expect(page.locator('#modal')).not.toContainText(/mountain/i);
  await newMuseum(page, false);
  await expect(page.locator('.build-tag')).toHaveText('THE LAST CURATOR');
  await expect(page.locator('#objective')).toHaveText('Inspect the masterpiece · Find its missing pear in Royal Supper');
  await toSketchFrame(page);
  await expect(page.locator('#museum-prompt')).toHaveText(LOCKED_PROMPT);
  expect((await debug(page)).museum!.sketchOpen).toBe(false);
  await shot(page, 'locked-frame', false);
  // Click and E, repeatedly: no scene ever opens while locked.
  for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyE'); await centreClick(page); }
  await page.waitForTimeout(400);
  let d = await debug(page);
  expect([d.scene, d.transitioning, d.sketch]).toEqual(['museum', false, null]);
  await expect(page.locator('#museum-hud')).toBeVisible();
  // The Slice 1 bay hotkeys no longer reach the campaign.
  await page.keyboard.press('Digit1'); await page.waitForTimeout(400);
  expect((await debug(page)).scene).toBe('museum');
  await record(page, 'locked frame refused click/E/Digit1');
  expect(await saved(page)).toBeNull();

  // Pear owned but not restored: still locked.
  await seedAndOpen(page, DEV, PEAR_OWNED); await newMuseum(page, true);
  await expect(page.locator('#objective')).toHaveText('Bring the golden pear to the masterpiece');
  await toSketchFrame(page); await expect(page.locator('#museum-prompt')).toHaveText(LOCKED_PROMPT);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(300); expect((await debug(page)).scene).toBe('museum');
  // Restore the pear by a real click placement; the frame opens in the same visit.
  await page.reload(); await newMuseum(page, true); await inspectFromSpawn(page);
  await page.getByRole('button', { name: 'Golden pear', exact: false }).click();
  await page.getByRole('button', { name: 'Pear silhouette' }).click();
  await expect(page.locator('#placement-message')).toContainText('Colour restored');
  await expect(page.locator('#placement-message')).toContainText('Unfinished Sketch');
  // S5C: the sky asks for the light first.
  await page.getByRole('button', { name: 'Sky silhouette for the enchanted light' }).click();
  await expect(page.locator('#placement-message')).toHaveText('Claim the enchanted light in the Unfinished Sketch first.');
  expect(await savedJson(page)).toMatchObject({ collectedPieceIds: ['golden-pear'], restoredPieceIds: ['golden-pear'] });
  await page.keyboard.press('Escape');
  await expect(page.locator('#objective')).toHaveText('Claim the enchanted light in the Unfinished Sketch');
  await toSketchFrame(page);
  await expect(page.locator('#museum-prompt')).toHaveText(OPEN_PROMPT);
  expect((await debug(page)).museum!.sketchOpen).toBe(true);
  await shot(page, 'open-frame', false);

  // Transition spam: E and clicks pressed together open exactly one Sketch.
  for (let i = 0; i < 5; i++) { await page.keyboard.press('KeyE'); await centreClick(page); }
  await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(500);
  d = await debug(page);
  expect([d.scene, d.sketch.study, d.canvasCount]).toEqual(['unfinished-sketch', 'campaign', 1]);
  expect(d.body).toMatchObject(layerOneStart);
  await expect(page.locator('#sketch-eyebrow')).toHaveText('The Last Curator');
  await expect(page.locator('.build-tag')).toHaveText('THE LAST CURATOR');
  await noDevWords(page, 'first entry');
  await capture(page, 'campaign-entry');
  // Pause menu in campaign words; a double click on Return lands once, in front of the frame.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-action="replay"]')).toHaveText('Restart adventure');
  await expect(page.locator('[data-action="leave"]')).toHaveText('Return to Museum');
  const box = await page.locator('[data-action="leave"]').boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, { clickCount: 2 });
  await expectSketchReturn(page);
  const resources: { geometryCount: number; textureCount: number }[] = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE');
    await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(300);
    expect((await debug(page)).canvasCount).toBe(1);
    await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click();
    await expectSketchReturn(page); await page.waitForTimeout(200);
    const r = await debug(page); resources.push({ geometryCount: r.geometryCount, textureCount: r.textureCount });
  }
  events.push({ event: 'museum resources after each Sketch round trip', resources });
  expect(new Set(resources.map(r => r.textureCount)).size).toBe(1);
  expect(new Set(resources.map(r => r.geometryCount)).size).toBe(1);
  expect(await savedJson(page)).toMatchObject({ collectedPieceIds: ['golden-pear'], restoredPieceIds: ['golden-pear'] });
  expect(errors).toEqual([]);
});

test('S5B campaign route: first claim, persistence, return, re-entry and reload 1280', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await seedAndOpen(page, DEV, PEAR_RESTORED); await newMuseum(page, true);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Empty');
  await toSketchFrame(page); await enterSketch(page);
  expect((await debug(page)).sketch.study).toBe('campaign');
  const tries = await toEndLedge(page);
  events.push({ event: 'crossing tries', tries });
  await capture(page, 'campaign-end-ledge');
  await claim(page, true);
  await shot(page, 'campaign-success', false);
  // Persisted at once: the light (`sun-disc`) is owned, nothing else changed.
  expect(await savedJson(page)).toEqual(LIGHT_OWNED);
  expect((await debug(page)).campaign).toEqual({ collectedPieceIds: ['golden-pear', 'sun-disc'], restoredPieceIds: ['golden-pear'] });
  // Keep exploring: settled, R keeps the ledge, no second report.
  await page.locator('#modal [data-action="resume"]').click(); await page.waitForTimeout(200);
  await noDevWords(page, 'after the claim');
  await page.keyboard.press('KeyR'); await page.waitForTimeout(300);
  let s = await debug(page);
  expect(s.body).toMatchObject({ x: 59, y: 54 }); expect(s.paused).toBe(false); await expect(page.locator('#modal')).toBeHidden();
  // Return to Museum: in front of the Sketch frame, the light in the inventory.
  await page.keyboard.press('Escape'); await page.locator('[data-action="leave"]').click();
  await expectSketchReturn(page);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Enchanted light');
  await expect(page.locator('#inventory .piece-icon')).toBeVisible();
  await expect(page.locator('#objective')).toHaveText('Bring the light to the masterpiece');
  expect((await debug(page)).campaignSketch).toEqual({ leg: 'l3-swings', light: true });
  await shot(page, 'return-pose', false);
  // Same-session re-entry resumes the ledge with the light taken; nothing is reported again.
  await enterSketch(page);
  s = await debug(page);
  expect(s.body).toMatchObject({ x: 59, y: 54 }); expect(s.sketch).toMatchObject({ stage: 'exit', completed: true, leg: 'l3-swings' });
  expect(s.sketch.light!.claimed).toBe(true); expect(s.paused).toBe(false); expect(s.canvasCount).toBe(1);
  await page.waitForTimeout(400); await expect(page.locator('#modal')).toBeHidden();
  expect(await savedJson(page)).toEqual(LIGHT_OWNED);
  await record(page, 're-entry after the claim');
  // Reload during the Sketch: Continue starts in the museum; the Sketch restarts at Layer 1; pieces intact.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await newMuseum(page, true);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Enchanted light');
  expect((await debug(page)).campaignSketch).toBeNull();
  await toSketchFrame(page); await enterSketch(page);
  s = await debug(page);
  expect(s.body).toMatchObject(layerOneStart); expect(s.sketch).toMatchObject({ leg: 'layer-1', stage: 'traversal', completed: false });
  expect([s.sketch.light!.claimed, s.sketch.light!.view!.lit]).toEqual([false, true]);
  expect(await savedJson(page)).toEqual(LIGHT_OWNED);
  await record(page, 'reload during the Sketch: Layer 1, pieces intact');
  expect(errors).toEqual([]);
});

test('S5B denied writes, first claim in memory, then a replay claim adds nothing 960', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await seedAndOpen(page, DEV, PEAR_RESTORED);
  // From now on every write fails; the stored pear-restored save stays readable.
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); }; });
  await page.reload(); await newMuseum(page, true);
  await toSketchFrame(page); await enterSketch(page);
  events.push({ event: 'first route', tries: await toEndLedge(page) });
  await claim(page, true);
  await expect(page.locator('#save-notice')).toContainText('Progress remains in memory');
  expect((await debug(page)).campaign.collectedPieceIds).toEqual(['golden-pear', 'sun-disc']);
  expect(await savedJson(page)).toEqual(PEAR_RESTORED);
  await page.locator('#modal [data-action="leave"]').click();
  await expectSketchReturn(page);
  await expect(page.locator('#inventory')).toHaveText('Inventory · Enchanted light');
  // Replay: Restart adventure from Layer 1 and claim again: "already yours", no duplicate.
  await enterSketch(page);
  await page.keyboard.press('Escape'); await page.locator('[data-action="replay"]').click();
  await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(400);
  let s = await debug(page);
  expect(s.body).toMatchObject(layerOneStart); expect(s.sketch.light!.claimed).toBe(false);
  events.push({ event: 'replay route', tries: await toEndLedge(page) });
  await claim(page, false);
  await shot(page, 'replay-already-yours', false);
  s = await debug(page);
  expect(s.campaign).toEqual({ collectedPieceIds: ['golden-pear', 'sun-disc'], restoredPieceIds: ['golden-pear'] });
  expect(await savedJson(page)).toEqual(PEAR_RESTORED);
  await page.locator('#modal [data-action="leave"]').click();
  await expectSketchReturn(page);
  await expect(page.locator('#objective')).toHaveText('Bring the light to the masterpiece');
  expect(errors).toEqual([]);
});

test('S5B fully denied storage keeps the museum playable and the frame locked', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    Storage.prototype.removeItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
  });
  await page.goto(DEV); await expect(page.locator('#save-notice')).toContainText('Storage is unavailable');
  await newMuseum(page, false);
  await toSketchFrame(page); await expect(page.locator('#museum-prompt')).toHaveText(LOCKED_PROMPT);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(300); expect((await debug(page)).scene).toBe('museum');
  expect(errors).toEqual([]);
});

test('S5B production: seeded saves show the frame state, objective and inventory; study= is ignored', async ({ page }) => {
  const errors: string[] = []; const failures: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  const cases = [
    { save: null, objective: 'Inspect the masterpiece · Find its missing pear in Royal Supper', inventory: 'Inventory · Empty', prompt: LOCKED_PROMPT },
    { save: PEAR_OWNED, objective: 'Bring the golden pear to the masterpiece', inventory: 'Inventory · Golden pear', prompt: LOCKED_PROMPT },
    { save: PEAR_RESTORED, objective: 'Claim the enchanted light in the Unfinished Sketch', inventory: 'Inventory · Empty', prompt: OPEN_PROMPT },
    { save: LIGHT_OWNED, objective: 'Bring the light to the masterpiece', inventory: 'Inventory · Enchanted light', prompt: OPEN_PROMPT },
  ];
  for (const c of cases) {
    await page.goto(PROD);
    await page.evaluate(({ key, value }) => { if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key); }, { key: KEY, value: c.save });
    // The dev study parameter is ignored in production.
    await page.goto(PROD + '?scene=unfinished-sketch&study=adventure');
    expect(await page.evaluate(() => '__curatorDebug' in window)).toBe(false);
    await expect(page.locator('#modal')).not.toContainText(/mountain|S5A|Claim the light/i);
    await expect(page.locator('#modal')).toContainText('Royal Supper and the Unfinished Sketch are playable');
    await expect(page.locator('.build-tag')).toHaveText('THE LAST CURATOR');
    await newMuseum(page, c.save !== null);
    await expect(page.locator('#objective')).toHaveText(c.objective);
    await expect(page.locator('#inventory')).toHaveText(c.inventory);
    await page.keyboard.press('Digit1'); await page.waitForTimeout(300);
    await expect(page.locator('#museum-hud')).toBeVisible();
    await toSketchFrameBlind(page);
    await expect(page.locator('#museum-prompt')).toHaveText(c.prompt);
    const tag = c.save === null ? 'new' : c.save === PEAR_OWNED ? 'pear-owned' : c.save === PEAR_RESTORED ? 'pear-restored' : 'light-owned';
    await page.screenshot({ path: `${DIR}/production-${tag}.png` });
    await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
    if (c.prompt === LOCKED_PROMPT) {
      await expect(page.locator('#museum-hud')).toBeVisible(); await expect(page.locator('#sketch-hud')).toBeHidden();
    } else {
      await expect(page.locator('#sketch-hud')).toBeVisible();
      await expect(page.locator('#sketch-eyebrow')).toHaveText('The Last Curator');
      expect(await page.locator('#sketch-hud').innerText()).not.toMatch(DEV_WORDS);
      await page.waitForTimeout(300); await page.keyboard.press('Escape');
      await expect(page.locator('[data-action="replay"]')).toHaveText('Restart adventure');
      await page.locator('[data-action="leave"]').click();
      await expect(page.locator('#museum-prompt')).toHaveText(OPEN_PROMPT);
    }
    if (c.save === LIGHT_OWNED) {
      await expect(page.locator('#inventory .piece-icon')).toBeVisible();
      // Inspection: the light is held; the sky without a selection keeps it (S5C places it).
      await page.reload(); await newMuseum(page, true); await inspectFromSpawn(page);
      await expect(page.locator('.inspection-inventory')).toHaveText('Enchanted light');
      await expect(page.locator('#pear-target')).toBeDisabled();
      expect(await page.locator('#modal').innerText()).not.toMatch(/mountain/i);
      await page.getByRole('button', { name: 'Sky silhouette for the enchanted light' }).click();
      await expect(page.locator('#placement-message')).toContainText('The light stays in your inventory');
      expect(JSON.parse((await saved(page))!)).toEqual(LIGHT_OWNED);
      await page.screenshot({ path: `${DIR}/production-light-inspection.png` });
    }
    events.push({ event: `production ${tag}`, objective: c.objective, inventory: c.inventory, prompt: c.prompt });
  }
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});
