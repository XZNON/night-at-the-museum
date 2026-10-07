import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { observe, waitReachable, stepOntoLift } from './sketch-layer1-controls';

// Shared real-input Layer 2 and lift controls, extracted unchanged from the
// S3B spec (S4D reuses them); observations are read-only.
/** Records written by the importing spec after each test. */
export const measurements: unknown[] = [];
/** Where captures go; each importing spec sets its own directory. */
export const evidence = { dir: 'docs/validation/sketch-s3/s3b' };
type Base = Awaited<ReturnType<typeof observe>>;
export type State = Omit<Base, 'sketch'> & { sketch: Omit<NonNullable<Base['sketch']>, 'targets'> & {
  targets: (NonNullable<Base['sketch']>['targets'][number] & { x: number; y: number })[];
  leg: string; entryLeg: string; liftId: string;
  axes: { id: string; x: number; y: number; angle: number }[];
  dangerBounds: { x: number; y: number; width: number; height: number }[];
} };
export const state = (page: Page) => observe(page) as Promise<State>;

export async function clickSocket(page: Page, id: string) {
  if (id === 'l2-freeze-b' || id === 'l2-freeze-c') {
    await page.waitForFunction(({ id }) => {
      const t = (window as unknown as { __curatorDebug: () => State }).__curatorDebug().sketch.targets.find(t => t.id === id)!;
      const x = id === 'l2-freeze-b' ? 46.67 : 37.2;
      return Math.abs(t.x - x) < 0.09;
    }, { id });
  }
  const before = await state(page);
  const target = before.sketch.targets.find(t => t.id === id)!;
  measurements.push({ placement: id, width: page.viewportSize()!.width, url: page.url(),
    tick: before.updateCount, body: before.body, target: before.sketch.targets.find(t => t.id === id) });
  expect(target.reason).toBe(''); expect(target.screen?.visible).toBe(true);
  await page.mouse.click(target.screen!.x, target.screen!.y);
  await expect.poll(async () => (await state(page)).sketch.queue.some(p => p.targetId === id)).toBe(true);
}
export async function capture(page: Page, label: string) {
  const width = page.viewportSize()!.width;
  const study = (await state(page)).sketch.field;
  await page.screenshot({ path: `${evidence.dir}/${study}-${label}-${width}.png` });
  measurements.push({ label, width, url: page.url(), state: await state(page) });
}
export async function leftEdge(page: Page) {
  const s = await state(page); const b = s.body!;
  const support = s.sketch.surfaces.find(p => Math.abs(p.top - b.y) < 0.12 && b.x < p.right && b.x + 0.65 > p.left)!;
  expect(support, 'standing on a real surface').toBeTruthy();
  await page.keyboard.down('KeyA');
  for (let i = 0; i < 180; i++) {
    const now = (await state(page)).body!;
    if (now.x < support.left + 0.55) break;
    await page.waitForTimeout(20);
  }
  await page.keyboard.up('KeyA'); await page.waitForTimeout(130);
}
export async function transfer(page: Page, id: string, axe?: string) {
  if (axe) {
    // Observe a broad upper-sweep launch window; ordinary keys still own motion.
    await page.waitForFunction(({ axe }) => {
      const s = (window as unknown as { __curatorDebug: () => State }).__curatorDebug();
      const angle = s.sketch.axes.find(a => a.id === axe)!.angle % (2 * Math.PI);
      return angle > (axe === 'l2-axe-a' ? 1.65 : 1.4) && angle < (axe === 'l2-axe-a' ? 1.85 : 1.55);
    }, { axe }, { timeout: 15000 });
  }
  const start = await state(page);
  const dest = start.sketch.surfaces.find(s => s.id === id)!;
  const stopAt = (dest.left + dest.right) / 2 - 0.325;
  const startTick = start.updateCount;
  await page.keyboard.down('KeyA'); await page.keyboard.down('Space');
  let released = false; let airPressed = false; let moving = true; let airborne = false;
  const flight: unknown[] = [];
  for (let i = 0; i < 160; i++) {
    await page.waitForTimeout(18);
    const s = await state(page); const b = s.body!;
    const frames = s.updateCount - startTick;
    if (frames >= 14 && !released) { await page.keyboard.up('Space'); released = true; }
    if (frames >= 17 && released && !airPressed) { await page.keyboard.down('Space'); airPressed = true; }
    airborne ||= !b.grounded;
    if (moving && b.x < stopAt + 0.3) { await page.keyboard.up('KeyA'); moving = false; }
    flight.push({ tick: s.updateCount, body: b, axes: s.sketch.axes });
    if (s.sketch.recovering) break;
    if (airborne && b.grounded) {
      await page.keyboard.up('Space'); await page.keyboard.up('KeyA');
      measurements.push({ transfer: id, width: page.viewportSize()!.width, flight });
      expect(Math.abs(b.y - dest.top), `landed on ${id}`).toBeLessThan(0.15);
      return;
    }
  }
  await page.keyboard.up('Space'); await page.keyboard.up('KeyA');
  measurements.push({ failedTransfer: id, width: page.viewportSize()!.width, flight, end: await state(page) });
  throw new Error(`Missed ${id}: ${JSON.stringify(await state(page))}`);
}
export async function throughA(page: Page) {
  await leftEdge(page);
  // Pin the first fast outline low: a high pin changes the blade clearance.
  await page.waitForFunction(() => {
    const t = (window as unknown as { __curatorDebug: () => State }).__curatorDebug().sketch.targets.find(t => t.id === 'l2-freeze-a')!;
    const s = (window as unknown as { __curatorDebug: () => State }).__curatorDebug();
    return t.y > 16.15 && t.y < 16.23 && s.sketch.elapsed % 2.4 > 1.2;
  });
  await waitReachable(page, 'l2-freeze-a'); await clickSocket(page, 'l2-freeze-a');
  await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-a']);
  await transfer(page, 'l2-board-a');
}

export async function layerTwo(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { await layerTwoAttempt(page); return; }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('Missed ') || attempt === 3) throw error;
      measurements.push({ ordinaryChallengeRetry: attempt + 1, state: await state(page) });
      await page.keyboard.press('KeyR');
      await expect.poll(async () => (await state(page)).body!.x).toBe(64.2);
      await page.waitForTimeout(300);
      expect((await state(page)).sketch.leg).toBe('layer-2');
    }
  }
}

export async function layerTwoAttempt(page: Page) {
  await capture(page, 'l2-entrance'); await throughA(page); await capture(page, 'l2-board-a');
  await leftEdge(page); await waitReachable(page, 'l2-freeze-b'); await clickSocket(page, 'l2-freeze-b');
  await transfer(page, 'l2-board-b', 'l2-axe-a'); await capture(page, 'l2-board-b');
  await leftEdge(page);
  // Full clicks must not evict a nail or change order.
  const full = (await state(page)).sketch.queue;
  const c = (await state(page)).sketch.targets.find(t => t.id === 'l2-freeze-c')!;
  if (c.screen?.visible) await page.mouse.click(c.screen.x, c.screen.y);
  await page.waitForTimeout(80);
  expect((await state(page)).sketch.queue).toEqual(full);
  await page.keyboard.press('KeyQ'); await waitReachable(page, 'l2-freeze-c'); await clickSocket(page, 'l2-freeze-c');
  await expect.poll(async () => (await state(page)).sketch.queue.map(p => p.targetId)).toEqual(['l2-freeze-b', 'l2-freeze-c']);
  await capture(page, 'l2-fifo-c'); await transfer(page, 'l2-board-c', 'l2-axe-b'); await capture(page, 'l2-board-c');
  await leftEdge(page); await transfer(page, 'l2-exit');
  await expect.poll(async () => (await state(page)).sketch.stage).toBe('exit');
  expect((await state(page)).sketch.completed).toBe(false);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
}

export async function reenter(page: Page) {
  const before = await page.evaluate(() => {
    const s = (window as unknown as { __curatorDebug: () => { geometryCount: number; textureCount: number } }).__curatorDebug();
    return { geometryCount: s.geometryCount, textureCount: s.textureCount };
  });
  if (!(await state(page)).paused) await page.keyboard.press('Escape');
  await page.locator('[data-action="leave"]').click({ timeout: 8000 });
  await page.locator('[data-action="start"]').click(); await expect(page.locator('#sketch-hud')).toBeVisible();
  await page.waitForTimeout(300);
  expect((await state(page)).canvasCount).toBe(1);
  const after = await page.evaluate(() => {
    const s = (window as unknown as { __curatorDebug: () => { geometryCount: number; textureCount: number } }).__curatorDebug();
    return { geometryCount: s.geometryCount, textureCount: s.textureCount };
  });
  expect(after.textureCount).toBe(before.textureCount);
  // Geometry uploads are lazy/camera-dependent. Rebuilding at a checkpoint
  // must release the previous scene, rather than retain its visited geometry.
  expect(after.geometryCount).toBeLessThanOrEqual(before.geometryCount + 4);
  measurements.push({ reentryResources: { before, after } });
}

/**
 * S4L: an actual window blur mid-ride pauses and returns the rider to the
 * departure exit with the deck back at the bottom (Escape only freezes).
 */
export async function blurRide(page: Page, spawn: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  await page.bringToFront();
  await page.keyboard.down('KeyD');
  const other = await page.context().newPage(); await other.goto('about:blank'); await other.bringToFront();
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.waitForTimeout(80); // allow the final rendered interpolation to settle
  const before = await state(page); await page.waitForTimeout(250);
  const after = await state(page);
  expect(after.body).toEqual(before.body); expect(after.sketch.stage).toBe('exit');
  expect(after.body!.x).toBe(spawn); expect(after.sketch.transit).toBe(0);
  expect(after.sketch.lifts.find(l => l.active)!.state).toBe('bottom');
  measurements.push({ blurMidRide: after });
  await other.close(); await page.bringToFront(); await page.keyboard.up('KeyD');
  await page.locator('[data-action="resume"]').click(); await cdp.detach();
  await page.waitForTimeout(250);
  expect((await state(page)).sketch.stage).toBe('exit');
}

/** Hold each direction and jump while the cab rises: the rider never leaves the deck. */
export async function tryToLeave(page: Page) {
  const lift = (await state(page)).sketch.lifts.find(l => l.active)!;
  let highest = 0; let samples = 0;
  for (const key of ['KeyA', 'KeyD']) {
    await page.keyboard.down(key);
    for (let i = 0; i < 3; i++) {
      // A held jump, then the air jump: the highest the rider can reach. No
      // press is sent once the ride has ended.
      if ((await state(page)).sketch.stage !== 'transit') { await page.keyboard.up(key); measurements.push({ triedToLeave: lift.id, highestAboveDeck: highest, samples }); return; }
      await page.keyboard.down('Space'); await page.waitForTimeout(140); await page.keyboard.up('Space');
      await page.waitForTimeout(40);
      if ((await state(page)).sketch.stage !== 'transit') { await page.keyboard.up(key); measurements.push({ triedToLeave: lift.id, highestAboveDeck: highest, samples }); return; }
      await page.keyboard.down('Space');
      for (let k = 0; k < 8; k++) {
        await page.waitForTimeout(25);
        const s = await state(page);
        if (s.sketch.stage !== 'transit') { await page.keyboard.up('Space'); await page.keyboard.up(key); measurements.push({ triedToLeave: lift.id, highestAboveDeck: highest, samples }); return; }
        const deck = s.sketch.lifts.find(l => l.id === lift.id)!;
        expect(s.body!.x).toBeGreaterThanOrEqual(lift.left - 1e-6);
        expect(s.body!.x + 0.65).toBeLessThanOrEqual(lift.right + 1e-6);
        highest = Math.max(highest, s.body!.y - deck.top); samples++;
      }
      await page.keyboard.up('Space');
    }
    await page.keyboard.up(key);
  }
  measurements.push({ triedToLeave: lift.id, highestAboveDeck: highest, samples });
}

/**
 * Ride the active lift. `intoClimb` (S4D): the second lift starts the Layer 3
 * climb on arrival instead of ending on safe ground with the S3 endpoint.
 */
export async function ride(page: Page, leg: 'layer-1' | 'layer-2', recovery: boolean, intoClimb = false) {
  const first = leg === 'layer-1'; const spawn = first ? 55.7 : 27.5;
  const approach = async () => {
    await expect(page.locator('#sketch-prompt')).toContainText('onto the lift');
    expect((await state(page)).sketch.liftId).toBe(first ? 'l1-lift' : 'l2-lift');
  };
  await approach(); await capture(page, `${leg}-lift-bottom`);
  // Walk up to the waiting deck (not onto it) so the deck and shaft are framed.
  const deck = (await state(page)).sketch.lifts.find(l => l.active)!;
  const key = (deck.left + deck.right) / 2 > (await state(page)).body!.x ? 'KeyD' : 'KeyA';
  await page.keyboard.down(key);
  await expect.poll(async () => { const x = (await state(page)).body!.x; return key === 'KeyD' ? x + 0.65 > deck.left - 1.4 : x < deck.right + 1.4; }, { timeout: 10000 }).toBe(true);
  await page.keyboard.up(key); await page.waitForTimeout(350);
  expect((await state(page)).sketch.stage).toBe('exit');
  await capture(page, `${leg}-lift-waiting`);
  if (recovery) {
    await stepOntoLift(page);
    await page.waitForTimeout(150); await page.keyboard.press('KeyR');
    await expect.poll(async () => (await state(page)).sketch.stage).toBe('exit'); expect((await state(page)).body!.x).toBe(spawn);
    expect((await state(page)).sketch.lifts.find(l => l.active)!.state).toBe('bottom');
    await approach(); await stepOntoLift(page); await page.waitForTimeout(150);
    await reenter(page); expect((await state(page)).sketch.stage).toBe('exit'); expect((await state(page)).body!.x).toBe(spawn);
    expect((await state(page)).sketch.lifts.find(l => l.active)!.state).toBe('bottom');
    await approach();
  }
  await stepOntoLift(page);
  await expect.poll(async () => (await state(page)).sketch.transit).toBeGreaterThan(0.15);
  if (recovery) {
    await page.keyboard.press('Escape'); await expect.poll(async () => (await state(page)).paused).toBe(true);
    await page.waitForTimeout(80); const paused = await state(page); await page.waitForTimeout(250);
    expect((await state(page)).sketch.transit).toBe(paused.sketch.transit);
    expect((await state(page)).sketch.camera).toEqual(paused.sketch.camera);
    const original = page.viewportSize()!;
    await page.setViewportSize({ width: original.width === 1280 ? 960 : 1280, height: original.width === 1280 ? 540 : 720 });
    expect((await state(page)).sketch.queue).toEqual(paused.sketch.queue);
    expect((await state(page)).sketch.transit).toBe(paused.sketch.transit);
    await page.setViewportSize(original); await page.locator('[data-action="resume"]').click();
    await expect.poll(async () => (await state(page)).sketch.transit).toBeGreaterThan(paused.sketch.transit!);
    await blurRide(page, spawn);
    await stepOntoLift(page);
  }
  await expect.poll(async () => (await state(page)).sketch.transit).toBeGreaterThan(0.1);
  // Nail commands are refused inside the cab: Q and a socket click change nothing.
  await page.keyboard.press('KeyQ');
  const t = (await state(page)).sketch.targets.find(t => t.screen?.visible);
  if (t?.screen) await page.mouse.click(t.screen.x, t.screen.y);
  await expect.poll(async () => (await state(page)).sketch.transit).toBeGreaterThan(0.45);
  await capture(page, `${leg}-mid-ride`);
  await tryToLeave(page);
  await expect.poll(async () => (await state(page)).sketch.stage, { timeout: 10000 }).toBe(first || intoClimb ? 'traversal' : 'arrival');
  await expect.poll(async () => (await state(page)).body!.grounded).toBe(true);
  await page.waitForTimeout(200);
  const arrived = await state(page);
  expect(arrived.sketch.leg).toBe(intoClimb ? 'l3-walls' : 'layer-2'); expect(arrived.sketch.available).toBe(2);
  expect(arrived.body!.vx).toBe(0); expect(arrived.body!.grounded).toBe(true);
  expect(arrived.body!.y).toBe(first ? 15.2 : 24.4);
  expect(arrived.sketch.queue).toEqual([]);
  // The climb's band is taller (24u) than the S3 landing's (18u).
  if (intoClimb) await expect.poll(async () => (await state(page)).sketch.camera.height).toBeGreaterThan(23.9);
  else expect(arrived.sketch.camera.height).toBe(18);
  expect(Math.abs(arrived.body!.y + 0.625 - (await state(page)).sketch.camera.y)).toBeLessThan(intoClimb ? 12 : 9);
  expect(arrived.sketch.lifts.find(l => l.id === (first ? 'l1-lift' : 'l2-lift'))!.state).toBe('parked');
  await capture(page, first ? 'first-handoff' : 'layer-3-lift-arrival');
  if (!first && !intoClimb) {
    // Step off right onto the Layer 3 ground: the S3 endpoint.
    expect(arrived.sketch.completed).toBe(false);
    await page.keyboard.down('KeyD');
    await expect.poll(async () => (await state(page)).sketch.completed).toBe(true);
    await page.keyboard.up('KeyD'); await page.waitForTimeout(150);
    await capture(page, 'layer-3-arrival');
  }
}
