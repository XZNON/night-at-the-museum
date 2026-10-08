import { expect, type Page } from '@playwright/test';
import { traverseLayerOne } from './sketch-layer1-controls';
import { ride, layerTwo } from './sketch-layer2-controls';
import { events, state, record, until, release, climb, cross, type State } from './sketch-layer3-controls';

// Campaign helpers shared by the S5B and S5C specs (moved verbatim from
// sketch-campaign.spec.ts): seeded saves, museum walks with real keys and
// drags, the full Sketch route on the campaign entry and the light claim.
// Debug state (dev server) is read back, never written.
export const DEV = 'http://127.0.0.1:5173/';
export const PROD = 'http://127.0.0.1:4173/';
export const KEY = 'last-curator.save.v1';

export const settings = { masterVolume: 0.7, quality: 'normal' };
export const seed = (collected: string[], restored: string[]) =>
  ({ schemaVersion: 1, campaignId: 'garden-before-dawn', collectedPieceIds: collected, restoredPieceIds: restored, settings });
export const PEAR_OWNED = seed(['golden-pear'], []);
export const PEAR_RESTORED = seed(['golden-pear'], ['golden-pear']);
export const LIGHT_OWNED = seed(['golden-pear', 'sun-disc'], ['golden-pear']);
export const OPEN_PROMPT = 'Click / E — Enter the Unfinished Sketch';
export const LOCKED_PROMPT = 'Restore the golden pear first';
/** Development wording that must never reach the campaign's Sketch HUD or screens. */
export const DEV_WORDS = /\bS[1-5][A-D]?\b|review|endpoint|isolated|study|mountain/i;

export type Museum = { position: number[]; rotation: number[]; sketchOpen: boolean; restored?: number };
export type Debug = State & { scene: string | null; transitioning: boolean; overlay?: string; campaignComplete?: boolean; museum: Museum | null; campaign: { collectedPieceIds: string[]; restoredPieceIds: string[] };
  campaignSketch: { leg: string; light: boolean | null } | null;
  sketch: State['sketch'] & { study: string; light: { claimed: boolean; settled: boolean; view: { lit: boolean } | null } | null } };
export const debug = (page: Page) => page.evaluate(() => (window as unknown as { __curatorDebug: () => Debug }).__curatorDebug());
export const saved = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
export const savedJson = async (page: Page) => JSON.parse((await saved(page)) ?? 'null');

export async function seedAndOpen(page: Page, url: string, save: unknown) {
  await page.goto(url);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: save });
  await page.reload();
}
export async function newMuseum(page: Page, continueSave: boolean) {
  await page.getByRole('button', { name: continueSave ? 'Continue' : 'New Game', exact: true }).click();
  await expect(page.locator('#museum-hud')).toBeVisible(); await page.waitForTimeout(350);
}
export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(80);
}
/** A real left drag on the canvas turns the view; dx < 0 turns left. */
export async function drag(page: Page, dx: number) {
  const vp = page.viewportSize()!; const y = vp.height / 2; const x = dx < 0 ? vp.width - 60 : 60;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(60);
}
/** Dev: walk with held keys (read back the pose) to in front of the Sketch frame and turn to face it. */
export async function toSketchFrame(page: Page) {
  const pose = async () => (await debug(page)).museum!;
  const yaw = async () => (await pose()).rotation[1];
  // Face the back wall first so A/W/S map to −x/−z/+z.
  for (let i = 0; i < 6 && Math.abs(await yaw()) > 0.03; i++) await drag(page, Math.max(-500, Math.min(500, (await yaw()) / 0.003)));
  const walkUntil = async (key: string, done: (p: number[]) => boolean) => {
    if (done((await pose()).position)) return;
    await page.keyboard.down(key);
    await expect.poll(async () => done((await pose()).position), { timeout: 8000, intervals: [16] }).toBe(true);
    await page.keyboard.up(key); await page.waitForTimeout(60);
  };
  const p = (await pose()).position;
  await walkUntil(p[2] < -1.5 ? 'KeyS' : 'KeyW', q => p[2] < -1.5 ? q[2] >= -1.6 : q[2] <= -1.4);
  await walkUntil('KeyA', q => q[0] <= -2.5);
  for (let i = 0; i < 6 && Math.abs((await yaw()) - Math.PI / 2) > 0.03; i++) await drag(page, Math.max(-500, Math.min(500, ((await yaw()) - Math.PI / 2) / 0.003)));
}
/** Production: the same walk from the museum spawn by timing alone (no debug readback). */
export async function toSketchFrameBlind(page: Page) {
  // From the spawn near the entrance (z 4.6) up to the frame's depth (z −1.5).
  await hold(page, 'KeyA', 760); await hold(page, 'KeyW', 1740); await drag(page, -523);
}
/** A raw click at the view centre: no actionability wait, so it also lands during a transition. */
export const centreClick = (page: Page) => page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
export async function inspectFromSpawn(page: Page) {
  // The masterpiece is centred on the back wall, straight ahead of the spawn.
  await hold(page, 'KeyW', 2400);
  await expect(page.locator('#museum-prompt')).toHaveText('Click / E — Inspect the masterpiece');
  await page.locator('#world').click({ position: { x: page.viewportSize()!.width / 2, y: page.viewportSize()!.height / 2 } });
  await expect(page.getByRole('button', { name: 'Pear silhouette' })).toBeVisible();
}
export async function enterSketch(page: Page) {
  await expect(page.locator('#museum-prompt')).toHaveText(OPEN_PROMPT);
  await page.keyboard.press('KeyE');
  await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350);
}
export async function noDevWords(page: Page, where: string) {
  const text = await page.locator('#sketch-hud').innerText();
  expect(text, `campaign Sketch HUD at ${where}`).not.toMatch(DEV_WORDS);
  events.push({ event: `HUD text at ${where}`, text });
}
export const onLedge = (s: State) => s.sketch.stage === 'exit';
export const layerOneStart = { x: 1.5, y: 0 };

/** The full S5A route on the campaign entry; returns the bot's crossing tries. */
export async function toEndLedge(page: Page) {
  let s = await state(page);
  expect(s.sketch).toMatchObject({ leg: 'layer-1', stage: 'traversal', reach: 10, pickupOffered: false, budget: 2 });
  expect(s.body).toMatchObject(layerOneStart);
  await noDevWords(page, 'Layer 1 entrance');
  await traverseLayerOne(page);
  await ride(page, 'layer-1', false);
  await layerTwo(page);
  await ride(page, 'layer-2', false, true);
  await noDevWords(page, 'Layer 3 arrival');
  await page.keyboard.down('KeyD'); await until(page, s => s.body.x >= 4.2, 'climb entrance'); await page.keyboard.up('KeyD');
  await until(page, s => s.body.grounded && s.body.vx === 0, 'standing at the entrance');
  s = await climb(page, { captures: false });
  expect(s.sketch).toMatchObject({ leg: 'l3-swings', stage: 'traversal', completed: false });
  await expect(page.locator('#sketch-goal')).toContainText('Layer 3 swings start');
  await noDevWords(page, 'handoff');
  return cross(page, false, onLedge);
}
/** Walk to the torch if the swing landed short; then the campaign success screen. */
export async function claim(page: Page, changed: boolean) {
  const inAir = (await debug(page)).sketch.light!.claimed;
  events.push({ event: inAir ? 'light claimed in the air by the last swing' : 'landed on the end ledge before the light' });
  if (!inAir) {
    await noDevWords(page, 'end ledge before the light');
    await page.keyboard.down('KeyD'); await expect(page.locator('#modal')).toBeVisible({ timeout: 10000 }); await release(page);
  }
  await expect(page.locator('#modal')).toContainText('Enchanted Light');
  await expect(page.locator('#modal')).toContainText(changed ? 'The light leaves the torch and is yours' : 'already yours; replay adds no duplicate');
  await expect(page.locator('#modal [data-action="leave"]')).toHaveText(/Return to Museum/);
  await expect(page.locator('#modal [data-action="resume"]')).toHaveText('Keep exploring');
  expect(await page.locator('#modal').innerText()).not.toMatch(DEV_WORDS);
  const d = await debug(page);
  expect(d.paused).toBe(true); expect(d.sketch.study).toBe('campaign');
  expect(d.sketch).toMatchObject({ stage: 'exit', completed: true });
  expect([d.sketch.light!.claimed, d.sketch.light!.settled]).toEqual([true, true]);
  await record(page, changed ? 'claimed: success screen' : 'replay claim: already yours');
  return inAir;
}
export async function expectSketchReturn(page: Page) {
  await expect(page.locator('#museum-hud')).toBeVisible();
  await expect(page.locator('#museum-prompt')).toHaveText(OPEN_PROMPT);
  const m = (await debug(page)).museum!;
  expect(m.position[0]).toBeCloseTo(-2.7, 5); expect(m.position[2]).toBeCloseTo(-1.5, 5); expect(m.rotation[1]).toBeCloseTo(Math.PI / 2, 5);
}
