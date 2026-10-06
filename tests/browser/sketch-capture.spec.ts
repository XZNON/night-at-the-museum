import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Real-camera review evidence for the Slice 1 gate. These capture what a
// player sees at both review sizes; they assert nothing about decoration.

type SocketView = { id: string; reason: string; screen: { x: number; y: number } | null };

const BAYS = ['pins', 'walls', 'foothold', 'fixed-swing', 'moving-swing', 'combined'];

const observe = (page: Page) => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => Record<string, never> }).__curatorDebug() as never);

const sockets = async (page: Page): Promise<SocketView[]> => {
  await page.waitForFunction(() => {
    const hook = (window as unknown as { __curatorDebug?: () => { sketch?: { targets?: unknown } } | null }).__curatorDebug;
    return Array.isArray(hook?.()?.sketch?.targets);
  }, undefined, { timeout: 20000 });
  return page.evaluate(() =>
    (window as unknown as { __curatorDebug: () => { sketch: { targets: SocketView[] } } }).__curatorDebug().sketch.targets);
};

const body = (page: Page) => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => { body: { x: number; y: number; grounded: boolean } } }).__curatorDebug().body);

const motion = (page: Page) => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => { sketch: { motion: { state: string } } } }).__curatorDebug().sketch.motion);

/** Click a socket exactly where it is drawn, once it is genuinely in reach. */
async function clickSocket(page: Page, targetId: string) {
  await page.waitForFunction((id: string) => {
    const hook = (window as unknown as { __curatorDebug?: () => { sketch?: { targets?: { id: string; reason: string; screen: unknown }[] } } | null }).__curatorDebug;
    const target = (hook?.()?.sketch?.targets ?? []).find(t => t.id === id);
    return !!target && target.reason === '' && !!target.screen;
  }, targetId, { timeout: 20000 });
  const socket = (await sockets(page)).find(t => t.id === targetId);
  if (!socket?.screen) throw new Error('no screen position for ' + targetId);
  await page.mouse.click(socket.screen.x, socket.screen.y);
  await page.waitForTimeout(200);
  const queue = await page.evaluate(() =>
    (window as unknown as { __curatorDebug: () => { sketch: { queue: { targetId: string }[] } } }).__curatorDebug().sketch.queue);
  if (!queue.some(q => q.targetId === targetId)) throw new Error('click did not pin ' + targetId);
}

/** Run right, hopping when progress stalls, until past `x` while grounded. */
async function hopRight(page: Page, x: number): Promise<boolean> {
  const deadline = Date.now() + 20000;
  let lastX = -1; let stalled = 0;
  while (Date.now() < deadline) {
    const b = await body(page);
    if (b.x > x && b.grounded) return true;
    if (b.grounded) {
      if (b.x - lastX < 0.2) stalled++; else stalled = 0;
      if (stalled >= 3) {
        // Clear the step: jump straight up (right into a wall cannot clear it),
        // then push right once above the lip. Space stays held past the apex so
        // the variable jump is not cut short.
        await page.keyboard.up('KeyD');
        await page.keyboard.down('Space');
        await page.waitForTimeout(260);
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(320);
        await page.keyboard.up('Space');
        await page.waitForTimeout(120);
        stalled = 0;
        lastX = (await body(page)).x;
        continue;
      }
      await page.keyboard.down('KeyD');
    }
    lastX = b.x;
    await page.waitForTimeout(55);
  }
  return false;
}

/** Run right and take off from the ledge edge, pressing E when in reach. */
async function takeoffAndGrab(page: Page): Promise<boolean> {
  await page.keyboard.down('KeyD');
  // Leave the ledge edge at full running speed, exactly as the measured route.
  for (let i = 0; i < 60; i++) {
    const b = await body(page);
    if (b.x > 12.7 && b.grounded) break;
    await page.waitForTimeout(16);
  }
  await page.keyboard.down('Space');
  // Keep tapping E through the flight; the press is checked by the simulation,
  // so no state round-trip is needed between taps.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('KeyE');
    if ((await motion(page)).state === 'swing') break;
  }
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');
  return (await motion(page)).state === 'swing';
}

for (const bay of BAYS) {
  test(`capture ${bay}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=${bay}`);
    await expect(page.locator('#sketch-hud')).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `docs/validation/sketch-s1/${bay}-1280.png` });
    await page.setViewportSize({ width: 960, height: 540 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `docs/validation/sketch-s1/${bay}-960.png` });
  });
}

test('capture the pin ledger with two nails and the oldest marker', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=pins');
  await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(400);
  // Walk right and pin each socket while still in reach, as a player would.
  await page.keyboard.down('KeyD');
  await clickSocket(page, 'pins-freeze-a');
  await page.waitForTimeout(120);
  await clickSocket(page, 'pins-freeze-b');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(250);
  const queue = await page.evaluate(() =>
    (window as unknown as { __curatorDebug: () => { sketch: { queue: { targetId: string }[] } } }).__curatorDebug().sketch.queue);
  expect(queue.map(q => q.targetId)).toEqual(['pins-freeze-a', 'pins-freeze-b']);
  await page.screenshot({ path: 'docs/validation/sketch-s1/pins-two-nails.png' });
  // Q recalls the oldest; the HUD and in-world marker must agree.
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/validation/sketch-s1/pins-after-recall.png' });
});

test('capture the foothold nail head that becomes the platform', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=foothold');
  await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.down('KeyD');
  await hopRight(page, 11.5);
  await clickSocket(page, 'foothold-a');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/validation/sketch-s1/nail-foothold.png' });
});

test('capture the swing nail driven into its socket, and a real grip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=fixed-swing');
  await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyD');
  await hopRight(page, 10.4);
  await clickSocket(page, 'fixed-nail');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/validation/sketch-s1/nail-swing-pinned.png' });

  // Retry the takeoff until the hands actually reach the nail.
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(250);
    await page.keyboard.down('KeyD');
    await hopRight(page, 10.4);
    const pinned = await clickSocket(page, 'fixed-nail').then(() => true).catch(() => false);
    if (!pinned) { await page.keyboard.up('KeyD'); break; }
    if (await takeoffAndGrab(page)) {
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(140);
      await page.screenshot({ path: 'docs/validation/sketch-s1/nail-swing-grip.png' });
      await page.waitForTimeout(280);
      await page.screenshot({ path: 'docs/validation/sketch-s1/fixed-swing-arc.png' });
      await page.keyboard.up('KeyD');
      return;
    }
    await page.waitForTimeout(150);
  }
  console.log('NOTE: scripted browser takeoff did not grip the nail; focused movement tests cover the swing.');
});

void observe;
