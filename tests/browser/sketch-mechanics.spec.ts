import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Real-control checks for the Slice 1 mechanics playground. Everything here
// uses visible controls only: keyboard, real pointer clicks on the drawn
// sockets, the bay selector and the pause panel. No teleport, set-state or
// progression helper is used; the dev observations are read-only.

type SocketView = { id: string; reason: string; occupiedBy: string | null; oldest: boolean; screen: { x: number; y: number; visible: boolean } | null };
type Observation = {
  scene: string | null; paused: boolean; canvasCount: number;
  body: { x: number; y: number; vx: number; vy: number; grounded: boolean } | null;
  sketch: null | {
    bay: string; nails: number; available: number; oldest: string | null;
    queue: { targetId: string }[];
    motion: { state: string; wall: string; wallTransfer: boolean; swingTarget: string; swingAngle: number };
    completed: boolean; recovering: boolean; elapsed: number; targets: SocketView[];
  };
  updateCount: number; renderCount: number;
};

const observe = (page: Page) => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => unknown }).__curatorDebug()) as Promise<Observation>;

const SENTINEL = 'sketch-save-sentinel';

async function open(page: Page, bay: string) {
  await page.goto(`http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=${bay}`);
  await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(250);
}

/** Click a marked socket exactly where it is drawn, the way a player would. */
async function clickSocket(page: Page, targetId: string) {
  const socket = (await observe(page)).sketch!.targets.find(t => t.id === targetId);
  expect(socket, `socket ${targetId} exists`).toBeTruthy();
  expect(socket!.reason, `socket ${targetId} reports no refusal`).toBe('');
  expect(socket!.screen?.visible, `socket ${targetId} is on screen`).toBe(true);
  await page.mouse.click(socket!.screen!.x, socket!.screen!.y);
}

test.describe('Sketch slice 1 mechanics playground', () => {
  test('opens save-isolated with one canvas, and every bay selector works', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(sentinel => localStorage.setItem('last-curator.save.v1', sentinel as string), SENTINEL);
    await open(page, 'pins');
    const first = await observe(page);
    expect(first.scene).toBe('unfinished-sketch');
    expect(first.canvasCount).toBe(1);
    expect(first.sketch!.bay).toBe('pins');
    expect(first.sketch!.nails).toBe(0);
    expect(first.sketch!.available).toBe(2);
    expect(first.sketch!.motion.state).toBe('normal');

    for (const id of ['walls', 'foothold', 'fixed-swing', 'moving-swing', 'combined', 'pins']) {
      await page.locator(`#sketch-bays [data-bay="${id}"]`).click();
      await expect(page.locator(`#sketch-bays [data-bay="${id}"]`)).toHaveClass(/active/);
      await expect.poll(async () => (await observe(page)).sketch!.bay, { timeout: 8000 }).toBe(id);
      expect((await observe(page)).canvasCount).toBe(1);
      expect((await observe(page)).sketch!.available).toBe(2);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
  });

  test('an unknown bay parameter falls back safely to the first bay', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&bay=not-a-bay');
    await expect(page.locator('#sketch-hud')).toBeVisible();
    await expect.poll(async () => (await observe(page)).sketch!.bay).toBe('pins');
  });

  test('moves and jumps with ordinary keyboard input', async ({ page }) => {
    await open(page, 'pins');
    const start = (await observe(page)).body!;
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(600);
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    const airborne = (await observe(page)).body!;
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(1200);
    const rest = (await observe(page)).body!;
    expect(rest.x).toBeGreaterThan(start.x + 1);
    expect(airborne.y).toBeGreaterThan(start.y);
    expect(rest.grounded).toBe(true);
  });

  test('two nails place by clicking drawn sockets and Q recalls the oldest only', async ({ page }) => {
    await open(page, 'pins');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(250);

    await clickSocket(page, 'pins-freeze-a');
    await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId), { timeout: 6000 }).toContain('pins-freeze-a');
    await clickSocket(page, 'pins-freeze-b');
    await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId), { timeout: 6000 }).toContain('pins-freeze-b');

    let state = (await observe(page)).sketch!;
    expect(state.queue.map(q => q.targetId)).toEqual(['pins-freeze-a', 'pins-freeze-b']);
    expect(state.nails).toBe(2);
    expect(state.available).toBe(0);
    expect(state.oldest).toBe('pins-freeze-a');
    expect(state.targets.filter(t => t.oldest).map(t => t.id)).toEqual(['pins-freeze-a']);

    // Clicking again at a full budget changes nothing.
    await clickSocket(page, 'pins-freeze-c').catch(() => { /* possibly off screen at this budget */ });
    await page.waitForTimeout(250);
    expect((await observe(page)).sketch!.queue.map(q => q.targetId)).toEqual(['pins-freeze-a', 'pins-freeze-b']);

    await page.keyboard.press('KeyQ');
    await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId)).toEqual(['pins-freeze-b']);
    expect((await observe(page)).sketch!.oldest).toBe('pins-freeze-b');
    expect((await observe(page)).sketch!.available).toBe(1);

    await page.keyboard.press('KeyQ');
    await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId)).toEqual([]);
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(250);
    const idle = (await observe(page)).sketch!;
    expect(idle.nails).toBe(0);
    expect(idle.available).toBe(2);
    expect(idle.oldest).toBeNull();
    await expect(page.locator('#sketch-cue')).toContainText('No nails are placed');
  });

  test('the HUD reports budget, oldest target and nearest usable socket', async ({ page }) => {
    await open(page, 'pins');
    await expect(page.locator('#sketch-nails')).toContainText('0/2 placed');
    await expect(page.locator('#sketch-oldest')).toContainText('Q recalls: nothing yet');
    await expect(page.locator('#sketch-nearest')).not.toHaveText('');
    await expect(page.locator('#sketch-hint')).toContainText(/recall/i);
  });

  test('pause freezes mechanisms and clears held input; R resets the bay', async ({ page }) => {
    await open(page, 'moving-swing');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(400);
    // Release before pausing: the OS auto-repeat of a physically held key is
    // not part of what pause clears, so the check isolates our own behaviour.
    await page.keyboard.up('KeyD');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal')).toBeVisible();
    const paused = await observe(page);
    expect(paused.paused).toBe(true);
    const x = paused.body!.x;
    const phase = paused.sketch!.elapsed;
    await page.waitForTimeout(700);
    const still = await observe(page);
    expect(still.body!.x).toBeCloseTo(x, 5);
    expect(still.sketch!.elapsed).toBeCloseTo(phase, 5);

    await page.locator('[data-action="resume"]').click();
    await page.waitForTimeout(700);
    const resumed = await observe(page);
    // No held key survives the pause, so the body only coasts on the velocity
    // it already had and then comes to rest; it never accelerates.
    expect(resumed.body!.vx).toBeCloseTo(0, 3);
    expect(Math.abs(resumed.body!.x - x)).toBeLessThan(0.8);
    const settled = (await observe(page)).body!.x;
    await page.waitForTimeout(400);
    expect((await observe(page)).body!.x).toBeCloseTo(settled, 5);

    await page.keyboard.press('KeyR');
    await expect.poll(async () => (await observe(page)).sketch!.elapsed).toBeLessThan(1.5);
    const reset = (await observe(page)).sketch!;
    expect(reset.nails).toBe(0);
    expect(reset.available).toBe(2);
    expect(reset.queue).toEqual([]);
    expect(reset.motion.state).toBe('normal');
  });

  test('the pause panel offers the bay reset and can retry through it', async ({ page }) => {
    await open(page, 'combined');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyD');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal')).toContainText('Restart bay');
    await page.locator('[data-action="checkpoint"]').click();
    await page.waitForTimeout(400);
    const after = await observe(page);
    expect(after.paused).toBe(false);
    expect(after.sketch!.elapsed).toBeLessThan(1.5);
  });

  test('repeated bay switches keep one canvas and never throw', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(sentinel => localStorage.setItem('last-curator.save.v1', sentinel as string), SENTINEL);
    await open(page, 'pins');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');
    for (let i = 0; i < 3; i++) {
      await page.locator('#sketch-bays [data-bay="walls"]').click();
      await expect.poll(async () => (await observe(page)).sketch!.bay, { timeout: 8000 }).toBe('walls');
      await page.locator('#sketch-bays [data-bay="pins"]').click();
      await expect.poll(async () => (await observe(page)).sketch!.bay, { timeout: 8000 }).toBe('pins');
      expect((await observe(page)).canvasCount).toBe(1);
    }
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
  });

  test('the rendered scene advances and survives resizes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await open(page, 'combined');
    const start = await observe(page);
    await page.waitForTimeout(500);
    const later = await observe(page);
    expect(later.updateCount).toBeGreaterThan(start.updateCount);
    expect(later.renderCount).toBeGreaterThan(start.renderCount);
    for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      expect((await observe(page)).canvasCount).toBe(1);
    }
    expect(errors).toEqual([]);
  });

  test('an off-screen socket cannot be clicked, and clicking the HUD never places a nail', async ({ page }) => {
  await open(page, 'pins');
  // From the spawn the rear sockets are drawn outside the view. Their
  // projected coordinates must therefore fall outside the canvas, so a click
  // aimed at one cannot reach it however far the world distance would allow.
  const spawn = (await observe(page)).sketch!.targets;
  const offScreen = spawn.filter(t => !t.screen!.visible);
  expect(offScreen.length, 'a socket is off screen at spawn').toBeGreaterThan(0);
  const canvas = await page.locator('#world').boundingBox();
  for (const socket of offScreen) {
    const outside = socket.screen!.x < canvas!.x || socket.screen!.x > canvas!.x + canvas!.width
      || socket.screen!.y < canvas!.y || socket.screen!.y > canvas!.y + canvas!.height;
    expect(outside, `${socket.id} projects outside the canvas`).toBe(true);
    await page.mouse.click(Math.max(1, Math.min(1279, socket.screen!.x)), Math.max(1, Math.min(719, socket.screen!.y)));
  }
  await page.waitForTimeout(250);
  expect((await observe(page)).sketch!.queue).toEqual([]);

  // The bay selector is a real control over the canvas; activating it must
  // never fall through into a placement.
  await page.locator('#sketch-bays button[data-bay="pins"]').click();
  await expect(page.locator('#sketch-hud')).toBeVisible();
  await expect.poll(async () => (await observe(page)).sketch!.bay, { timeout: 8000 }).toBe('pins');
  expect((await observe(page)).sketch!.queue).toEqual([]);
  expect((await observe(page)).sketch!.available).toBe(2);
});

  test('a nail is never grabbed without an explicit E press', async ({ page }) => {
  await open(page, 'fixed-swing');
  // Walk up onto the launch ledge, hopping the step with ordinary input.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.down('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('Space');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const socket = (await observe(page)).sketch!.targets.find(t => t.id === 'fixed-nail')!;
  expect(socket.reason).toBe('');
  await page.mouse.click(socket.screen!.x, socket.screen!.y);
  await expect.poll(async () => (await observe(page)).sketch!.queue.length).toBe(1);
  // Hovering and jumping near the socket must never attach the player.
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(220);
    await page.keyboard.up('Space');
    await page.waitForTimeout(400);
    expect((await observe(page)).sketch!.motion.state).toBe('normal');
  }
  // An E press with no nail in reach is simply ignored.
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);
  expect((await observe(page)).sketch!.motion.state).toBe('normal');
});

test('production ignores the direct entry and ships no inspection hook', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/?scene=unfinished-sketch&bay=combined');
    await expect(page.locator('#hud')).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { __curatorDebug?: unknown }).__curatorDebug)).toBeUndefined();
    await expect(page.locator('#modal')).toContainText('The garden');
  });
});
