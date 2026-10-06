import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Shared real-input route controls; observations are read-only.
type SocketView = { id: string; reason: string; occupiedBy: string | null; oldest: boolean; screen: { x: number; y: number; visible: boolean } | null };
type Observation = {
  scene: string | null; paused: boolean; canvasCount: number;
  body: { x: number; y: number; vx: number; vy: number; grounded: boolean } | null;
  sketch: null | {
    mode: string; field: string; bay: string | null;
    stage: string | null; section: string | null; transit: number | null; boarding: boolean | null;
    camera: { x: number; y: number; width: number; height: number };
    nails: number; available: number; oldest: string | null;
    queue: { targetId: string }[];
    motion: { state: string; wall: string; wallTransfer: boolean; swingTarget: string; swingAngle: number };
    completed: boolean; recovering: boolean; elapsed: number; targets: SocketView[];
    boards: { id: string; x: number; left: number; right: number; top: number; pinned: boolean }[];
    surfaces: { id: string; left: number; right: number; top: number }[];
  };
  updateCount: number; renderCount: number;
};

export const observe = (page: Page) => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => unknown }).__curatorDebug()) as Promise<Observation>;

export const body = (page: Page) => page.evaluate(() =>
  (window as unknown as { __curatorDebug: () => { body: { x: number; y: number; grounded: boolean } } }).__curatorDebug().body);

export const SENTINEL = 'sketch-s2-save-sentinel';
export const ROUTE = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1';

export async function open(page: Page) {
  await page.goto(ROUTE);
  await expect(page.locator('#sketch-hud')).toBeVisible();
  // The bay selector belongs to the Slice 1 playground only.
  await expect(page.locator('#sketch-bays')).toBeHidden();
  await page.waitForTimeout(300);
}

/** Click a marked socket exactly where it is drawn, once it is in reach. */
export async function clickSocket(page: Page, targetId: string) {
  const socket = (await observe(page)).sketch!.targets.find(t => t.id === targetId);
  expect(socket, `socket ${targetId} exists`).toBeTruthy();
  expect(socket!.reason, `socket ${targetId} reports no refusal`).toBe('');
  expect(socket!.screen?.visible, `socket ${targetId} is on screen`).toBe(true);
  await page.mouse.click(socket!.screen!.x, socket!.screen!.y);
}

export async function waitReachable(page: Page, targetId: string, timeout = 20000) {
  await page.waitForFunction((id: string) => {
    const hook = (window as unknown as { __curatorDebug?: () => { sketch?: { targets?: { id: string; reason: string; screen: unknown }[] } } }).__curatorDebug;
    const target = (hook?.()?.sketch?.targets ?? []).find(t => t.id === id);
    return !!target && target.reason === '' && !!(target.screen as { visible?: boolean } | null)?.visible;
  }, targetId, { timeout });
}

export const TERRACE = { left: 12.8, right: 17.6, top: 1.6 };

/**
 * Climb the step and settle on the waiting terrace. The target is the terrace
 * surface itself, so the body is never walked off its far edge.
 */
export async function climbToTerrace(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await hopRight(page, TERRACE.right - 1.6);
    const here = (await body(page))!;
    if (here.grounded && Math.abs(here.y - TERRACE.top) < 0.3 && here.x < TERRACE.right - 0.7) return true;
    await page.keyboard.down('KeyD');
    await page.keyboard.down('Space');
    await page.waitForTimeout(420);
    await page.keyboard.up('Space');
    await page.waitForTimeout(650);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(400);
  }
  return false;
}

/**
 * Run right until the body passes `x`, hopping when progress stalls. This is
 * the same shape the Slice 1 checks use: real keys, no state mutation.
 */
export async function hopRight(page: Page, x: number, timeout = 25000): Promise<boolean> {
  const deadline = Date.now() + timeout;
  let lastX = -1; let stalled = 0;
  while (Date.now() < deadline) {
    const b = await body(page);
    if (!b) return false;
    if (b.x > x && b.grounded) { await page.keyboard.up('KeyD'); return true; }
    if (b.grounded) {
      if (b.x - lastX < 0.2) stalled++; else stalled = 0;
      if (stalled >= 3) {
        await page.keyboard.up('KeyD');
        await page.keyboard.down('Space');
        await page.waitForTimeout(260);
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(320);
        await page.keyboard.up('Space');
        await page.waitForTimeout(120);
        stalled = 0;
        lastX = (await body(page))!.x;
        continue;
      }
      await page.keyboard.down('KeyD');
    }
    lastX = b.x;
    await page.waitForTimeout(55);
  }
  await page.keyboard.up('KeyD');
  return false;
}

/**
 * Transfer onto a pinned board using real keys only. Walk to a run-up point,
 * then hold D and Space, adding one air jump when the transfer needs it, and
 * release D the moment the body touches the board. A miss is an ordinary fall
 * that recovers on its own, so the attempt simply retries.
 */
export async function transferTo(page: Page, boardId: string, airJump: boolean, attempts = 5): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const live = (await observe(page)).sketch!;
    const board = live.boards.find(b => b.id === boardId)
      ?? live.surfaces.map(s => ({ ...s, x: (s.left + s.right) / 2, pinned: false }))
        .find(s => s.id === boardId);
    const target = board!;
    expect(target, `surface ${boardId} exists`).toBeTruthy();
    // Stand back from the edge so the run-up has room to build speed.
    const here = (await body(page))!;
    const support = [...live.boards.filter(b => b.pinned), ...live.surfaces].find(s =>
      Math.abs(here.y - s.top) < 0.1 && here.x + 0.65 > s.left && here.x < s.right);
    // The destination can be far from a narrow/left-pinned support. Never
    // walk into the gap to reach a destination-relative run-up point.
    const standAt = Math.max(0.5, Math.min(target.left - 4, support ? support.right - 0.75 : here.x));
    if ((await body(page))!.x < standAt - 0.1) {
      await page.keyboard.down('KeyD');
      for (let i = 0; i < 300; i++) {
        const now = (await body(page))!;
        if (now.x >= standAt - 0.15 || !now.grounded) break;
        await page.waitForTimeout(45);
      }
      await page.keyboard.up('KeyD');
    }
    await page.keyboard.down('KeyD');
    await page.keyboard.down('Space');
    const started = Date.now();
    const airAt = boardId === 'l1-pendulum-c' || boardId === 'l1-pendulum-d' ? 230 : 390;
    let released = false; let airPressed = false; let moving = true; let airborne = false;
    for (let i = 0; i < 130; i++) {
      await page.waitForTimeout(25);
      const elapsed = Date.now() - started;
      if (airJump && !released && elapsed >= airAt - 45) {
        await page.keyboard.up('Space'); released = true;
      }
      if (airJump && released && !airPressed && elapsed >= airAt) {
        await page.keyboard.down('Space'); airPressed = true;
      }
      const now = (await body(page))!;
      airborne ||= !now.grounded;
      // Brake above the middle of the landing instead of running blindly
      // through a narrow board while holding a second jump.
      const stopAt = (target.left + target.right) / 2 - 0.65;
      if (moving && now.x >= stopAt) {
        await page.keyboard.up('KeyD'); moving = false;
      }
      if (airborne && now.grounded) {
        await page.keyboard.up('Space');
        await page.keyboard.up('KeyD');
        if (Math.abs(now.y - target.top) < 0.4 && now.x + 0.65 > target.left && now.x < target.right) return true;
        break;
      }
      if (now.y < -1 || (await observe(page)).sketch!.recovering) break;
    }
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyD');
    // An ordinary fall recovers by itself; wait for the section retry.
    await page.waitForTimeout(1100);
    if ((await observe(page)).sketch!.stage === 'exit') return true;
  }
  return false;
}

/** Four pinned transfers with FIFO recall of A, then B, and the fixed exit. */
export async function traverseLayerOne(page: Page) {
  expect(await climbToTerrace(page), 'reached the waiting terrace').toBe(true);

  await waitReachable(page, 'l1-freeze-a');
  await clickSocket(page, 'l1-freeze-a');
  await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId), { timeout: 6000 }).toContain('l1-freeze-a');

  await expect.poll(async () => (await observe(page)).sketch!.boards.find(b => b.id === 'l1-pendulum-a')!.pinned, { timeout: 6000 }).toBe(true);
  expect(await transferTo(page, 'l1-pendulum-a', false), 'reached pendulum A').toBe(true);

  await waitReachable(page, 'l1-freeze-b');
  await clickSocket(page, 'l1-freeze-b');
  await expect.poll(async () => (await observe(page)).sketch!.queue.length, { timeout: 6000 }).toBe(2);
  expect(await transferTo(page, 'l1-pendulum-b', true), 'reached pendulum B').toBe(true);

  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId), { timeout: 6000 }).toEqual(['l1-freeze-b']);
  await waitReachable(page, 'l1-freeze-c');
  await clickSocket(page, 'l1-freeze-c');
  await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId), { timeout: 6000 }).toEqual(['l1-freeze-b', 'l1-freeze-c']);
  expect(await transferTo(page, 'l1-pendulum-c', true), 'reached pendulum C').toBe(true);
  await page.keyboard.press('KeyQ');
  await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId)).toEqual(['l1-freeze-c']);
  await waitReachable(page, 'l1-freeze-d');
  await clickSocket(page, 'l1-freeze-d');
  await expect.poll(async () => (await observe(page)).sketch!.queue.map(q => q.targetId)).toEqual(['l1-freeze-c', 'l1-freeze-d']);
  expect(await transferTo(page, 'l1-pendulum-d', true), 'reached pendulum D').toBe(true);
  // D is required for the fixed exit ground.
  expect(await transferTo(page, 'l1-exit', true), 'reached the exit ground').toBe(true);
  await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 15000 }).toBe('exit');
}
