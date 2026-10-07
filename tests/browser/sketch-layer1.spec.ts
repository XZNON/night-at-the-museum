import { test, expect } from '@playwright/test';
import { observe, body, SENTINEL, open, clickSocket, waitReachable, climbToTerrace, transferTo, traverseLayerOne, stepOntoLift, stepOffLift } from './sketch-layer1-controls';

test.describe('Sketch slice 2 Layer 1 route', () => {
  test('opens save-isolated with one canvas and reports the route state', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(sentinel => localStorage.setItem('last-curator.save.v1', sentinel as string), SENTINEL);
    await open(page);
    const state = await observe(page);
    expect(state.scene).toBe('unfinished-sketch');
    expect(state.canvasCount).toBe(1);
    expect(state.sketch!.mode).toBe('route');
    expect(state.sketch!.field).toBe('layer-1');
    expect(state.sketch!.stage).toBe('traversal');
    expect(state.sketch!.section).toBe('layer-1');
    expect(state.sketch!.nails).toBe(0);
    expect(state.sketch!.available).toBe(2);
    // Every target starts out of reach: the route begins from safe ground.
    expect(state.sketch!.targets.every(t => t.reason === 'Out of reach.')).toBe(true);
    await expect(page.locator('#sketch-eyebrow')).toContainText('Layer 1');
    await expect(page.locator('#sketch-layer')).toContainText('1 / 3');
    await expect(page.locator('#sketch-checkpoint, #sketch-goal')).toContainText('layer-1 start');
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
  });

  test('an unknown study value falls back to the mechanics playground', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=not-a-study');
    await expect(page.locator('#sketch-hud')).toBeVisible();
    await expect(page.locator('#sketch-bays')).toBeVisible();
    await expect.poll(async () => (await observe(page)).sketch!.bay).toBe('pins');
  });

  test('the active-layer view shows the next target and neighbouring rows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page);
    const start = (await observe(page)).sketch!.camera;
    // A moderate zoom: the player is 1.25 units tall in an 18-unit view.
    expect(start.height).toBeGreaterThan(14);
    expect(start.height).toBeLessThan(22);
    // Standing on the terrace, pendulum A's drawn ring is on screen before
    // any commitment, so the player can read the next transfer.
    expect(await climbToTerrace(page)).toBe(true);
    await expect.poll(async () => {
      const a = (await observe(page)).sketch!.targets.find(t => t.id === 'l1-freeze-a')!;
      return a.screen!.visible;
    }, { timeout: 10000 }).toBe(true);
    // The camera has re-framed toward the active layer rather than the spawn,
    // without changing the zoom level between layers.
    const framed = (await observe(page)).sketch!.camera;
    expect(framed.x).toBeGreaterThan(start.x);
    expect(framed.height).toBeCloseTo(start.height, 1);
  });

  test('every committed transfer shows the next target before it', async ({ page }) => {
    for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }]) {
      await page.setViewportSize(size);
      await open(page);
      expect(await climbToTerrace(page)).toBe(true);
      await waitReachable(page, 'l1-freeze-a');
      await clickSocket(page, 'l1-freeze-a');
      expect(await transferTo(page, 'l1-pendulum-a', false), 'on A').toBe(true);
      await waitReachable(page, 'l1-freeze-b');
      expect((await observe(page)).sketch!.targets.find(t => t.id === 'l1-freeze-b')!.screen!.visible,
        'B visible from A').toBe(true);
      await clickSocket(page, 'l1-freeze-b');
      expect(await transferTo(page, 'l1-pendulum-b', true), 'on B').toBe(true);
      await page.keyboard.press('KeyQ');
      await waitReachable(page, 'l1-freeze-c');
      expect((await observe(page)).sketch!.targets.find(t => t.id === 'l1-freeze-c')!.screen!.visible,
        'C visible from B').toBe(true);
      await clickSocket(page, 'l1-freeze-c');
      expect(await transferTo(page, 'l1-pendulum-c', true), 'on C').toBe(true);
      await page.keyboard.press('KeyQ');
      await waitReachable(page, 'l1-freeze-d');
      expect((await observe(page)).sketch!.targets.find(t => t.id === 'l1-freeze-d')!.screen!.visible, 'D visible from C').toBe(true);
      await clickSocket(page, 'l1-freeze-d');
      expect(await transferTo(page, 'l1-pendulum-d', true), 'on D').toBe(true);
      // From D the fixed exit ground and the lift at its right end are the
      // next decision, and both are inside the view before the last jump.
      const exitGround = (await observe(page)).sketch!.surfaces.find(s => s.id === 'l1-exit')!;
      const cam = (await observe(page)).sketch!.camera;
      expect(Math.abs((exitGround.left + exitGround.right) / 2 - cam.x), 'exit ground in frame')
        .toBeLessThan(cam.width / 2);
    }
  });

  test('two nails, FIFO reuse and the lift reach the Layer 2 endpoint', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(sentinel => localStorage.setItem('last-curator.save.v1', sentinel as string), SENTINEL);
    await open(page);
    await traverseLayerOne(page);

    const cleared = await observe(page);
    expect(cleared.sketch!.stage).toBe('exit');
    expect(cleared.sketch!.nails).toBe(0);
    expect(cleared.sketch!.available).toBe(2);
    await expect(page.locator('#sketch-goal')).toContainText('layer-1 clear');

    // The prompt points at the lift; standing fully on its deck starts it.
    await expect(page.locator('#sketch-prompt')).toContainText('onto the lift');
    await stepOntoLift(page);
    // The deck rises on schedule and the arrival commits once.
    await expect.poll(async () => (await observe(page)).sketch!.transit, { timeout: 10000 }).toBeGreaterThan(0.4);
    await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 15000 }).toBe('arrival');
    const arrived = await observe(page);
    expect(arrived.body!.vx).toBe(0);
    expect(arrived.body!.y).toBeCloseTo(15.2, 5);
    expect(arrived.sketch!.section).toBe('layer-2-landing');
    await stepOffLift(page);
    await expect(page.locator('#sketch-endpoint')).toContainText('Slice 2 endpoint');
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe(SENTINEL);
  });

  test('a moving outline cannot catch a jump that skips the third pin and FIFO recall', async ({ page }) => {
    await open(page);
    expect(await climbToTerrace(page)).toBe(true);
    await waitReachable(page, 'l1-freeze-a');
    await clickSocket(page, 'l1-freeze-a');
    expect(await transferTo(page, 'l1-pendulum-a', false)).toBe(true);
    await waitReachable(page, 'l1-freeze-b');
    await clickSocket(page, 'l1-freeze-b');
    expect(await transferTo(page, 'l1-pendulum-b', true)).toBe(true);
    expect((await observe(page)).sketch!.queue.map(p => p.targetId)).toEqual(['l1-freeze-a', 'l1-freeze-b']);
    await page.keyboard.down('KeyD');
    await page.keyboard.down('Space');
    await page.waitForTimeout(340);
    await page.keyboard.up('Space');
    await page.waitForTimeout(50);
    await page.keyboard.down('Space');
    await page.waitForTimeout(800);
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyD');
    await expect.poll(async () => {
      const s = await observe(page);
      return s.sketch!.stage === 'traversal' && s.sketch!.available === 2 && s.body!.x < 4 && s.body!.grounded;
    }, { timeout: 10000 }).toBe(true);
    expect((await observe(page)).sketch!.completed).toBe(false);
  });

  test('exit retry, mid-ride pause/retry and arrival recovery keep the correct checkpoint', async ({ page }) => {
    await open(page);
    await traverseLayerOne(page);
    await page.keyboard.press('KeyR');
    await expect.poll(async () => (await body(page))!.y).toBeCloseTo(11.9, 1);
    expect((await observe(page)).sketch!.stage).toBe('exit');
    // y was already 11.9 before R: let the retry tick consume R and clear its
    // boundary input before holding the next direction.
    await page.waitForTimeout(150);
    await stepOntoLift(page);
    await expect.poll(async () => (await observe(page)).sketch!.transit).toBeGreaterThan(0.2);
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal')).toBeVisible();
    const paused = await observe(page);
    await page.waitForTimeout(600);
    const frozen = await observe(page);
    expect(frozen.sketch!.transit).toBe(paused.sketch!.transit);
    expect(frozen.body).toEqual(paused.body);
    expect(frozen.sketch!.camera).toEqual(paused.sketch!.camera);
    await page.locator('[data-action="resume"]').click();
    await page.keyboard.press('KeyR');
    await expect.poll(async () => (await observe(page)).sketch!.stage).toBe('exit');
    expect((await body(page))!.y).toBeCloseTo(11.9, 1);
    await stepOntoLift(page);
    await expect.poll(async () => (await observe(page)).sketch!.stage, { timeout: 10000 }).toBe('arrival');
    await stepOffLift(page);
    await page.keyboard.press('KeyR');
    await expect.poll(async () => (await body(page))!.y).toBeCloseTo(15.2, 1);
    // y was already 15.2 before R. Wait for the retry tick to consume R and
    // clear its boundary input before issuing the next movement.
    await page.waitForTimeout(100);
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(550);
    await page.keyboard.up('KeyA');
    await expect.poll(async () => (await observe(page)).sketch!.recovering).toBe(true);
    await expect.poll(async () => {
      const s = await observe(page);
      return s.body!.grounded && Math.abs(s.body!.y - 15.2) < 0.1 && !s.sketch!.recovering;
    }).toBe(true);
    expect((await observe(page)).sketch!.completed).toBe(true);
  });

  test('a fall retries Layer 1 with two nails, and R returns to the checkpoint', async ({ page }) => {
    await open(page);
    expect(await climbToTerrace(page)).toBe(true);
    await waitReachable(page, 'l1-freeze-a');
    await clickSocket(page, 'l1-freeze-a');
    await expect.poll(async () => (await observe(page)).sketch!.nails).toBe(1);

    // Walk off the terrace's right edge into the empty gap below.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(900);
    await page.keyboard.up('KeyD');
    await expect.poll(async () => {
      const s = (await observe(page)).sketch!;
      return s.available === 2 && s.nails === 0 && s.stage === 'traversal';
    }, { timeout: 15000 }).toBe(true);
    const retried = await observe(page);
    expect(retried.sketch!.available).toBe(2);
    expect(retried.body!.x).toBeLessThan(4);
    expect(retried.body!.grounded).toBe(true);
    // Deterministic retry: mechanism time is back at zero.
    expect(retried.sketch!.elapsed).toBeLessThan(3);
    // Pendulum A is live again, exactly where a fresh attempt would find it.
    expect(retried.sketch!.boards.find(b => b.id === 'l1-pendulum-a')!.pinned).toBe(false);

    // R resets the same way from a normal standing state.
    await climbToTerrace(page);
    await page.keyboard.press('KeyR');
    await expect.poll(async () => (await observe(page)).sketch!.elapsed, { timeout: 8000 }).toBeLessThan(2);
    const after = await observe(page);
    expect(after.sketch!.available).toBe(2);
    expect(after.body!.x).toBeLessThan(4);
  });

  test('pause freezes motion, clears held input and resumes cleanly', async ({ page }) => {
    await open(page);
    // Pause mid-run with a key genuinely held by the harness.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal')).toBeVisible();
    const paused = await observe(page);
    expect(paused.paused).toBe(true);
    const x = paused.body!.x;
    const elapsed = paused.sketch!.elapsed;
    await page.waitForTimeout(700);
    const still = await observe(page);
    expect(still.body!.x).toBeCloseTo(x, 5);
    expect(still.sketch!.elapsed).toBeCloseTo(elapsed, 5);

    // Release the held key only after pausing, so the check isolates our own
    // clearing behaviour from the OS auto-repeat of a physically held key.
    await page.keyboard.up('KeyD');
    await page.locator('[data-action="resume"]').click();
    await page.waitForTimeout(700);
    const resumed = await observe(page);
    expect(resumed.body!.vx).toBeCloseTo(0, 3);
    const settled = (await observe(page)).body!.x;
    await page.waitForTimeout(400);
    expect((await observe(page)).body!.x).toBeCloseTo(settled, 5);
  });

  test('resize preserves geometry at both review sizes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await open(page);
    expect(await climbToTerrace(page)).toBe(true);
    for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(350);
      const state = await observe(page);
      expect(state.canvasCount).toBe(1);
      // A resize changes only projection: the body, nails and stage persist.
      expect(state.sketch!.stage).toBe('traversal');
      expect(state.body!.grounded).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test('leaving and re-entering resumes the remembered safe checkpoint', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await open(page);
    expect(await climbToTerrace(page)).toBe(true);
    await waitReachable(page, 'l1-freeze-a');
    await clickSocket(page, 'l1-freeze-a');
    await expect.poll(async () => (await observe(page)).sketch!.nails).toBe(1);
    // Mid-attempt, partway across the terrace rather than at a checkpoint.
    expect((await body(page))!.x).toBeGreaterThan(12);

    await page.keyboard.press('Escape');
    await page.locator('[data-action="leave"]').click();
    await expect(page.locator('#modal')).toContainText('Layer 1');
    await page.locator('[data-action="start"]').click();
    await expect(page.locator('#sketch-hud')).toBeVisible();
    await expect.poll(async () => (await observe(page)).sketch!.field).toBe('layer-1');
    const after = await observe(page);
    expect(after.canvasCount).toBe(1);
    // Re-entry resumes the remembered safe checkpoint on the ground, never
    // midair and never from wherever the player happened to leave.
    expect(after.body!.grounded).toBe(true);
    expect(after.body!.y).toBeCloseTo(0, 2);
    expect(after.body!.x).toBeLessThan(4);
    expect(after.sketch!.stage).toBe('traversal');
    expect(errors).toEqual([]);
  });

  test('production ignores the route entry and ships no inspection hook', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/?scene=unfinished-sketch&study=layer-1');
    await expect(page.locator('#hud')).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { __curatorDebug?: unknown }).__curatorDebug)).toBeUndefined();
    await expect(page.locator('#modal')).toContainText('The garden');
  });
});
