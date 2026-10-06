import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { observe as state, body, open, waitReachable, clickSocket, hopRight, climbToTerrace, transferTo } from './sketch-layer1-controls';

const DIR = 'docs/validation/sketch-s2/four-pendulums';

/** Capture at both review sizes so the framing evidence is comparable. */
async function captureBoth(page: Page, name: string) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/${name}-1280.png` });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/${name}-960.png` });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(400);
}

test.describe('Sketch slice 2 review captures', () => {
  test('capture all four pendulum transfers and the exit ground', async ({ page }) => {
    await open(page);
    await captureBoth(page, 'layer1-spawn');

    expect(await climbToTerrace(page), 'reached the waiting terrace').toBe(true);
    await captureBoth(page, 'layer1-terrace');

    await waitReachable(page, 'l1-freeze-a');
    await clickSocket(page, 'l1-freeze-a');
    await captureBoth(page, 'layer1-pendulum-a-pinned');
    expect(await transferTo(page, 'l1-pendulum-a', false), 'on A').toBe(true);
    await captureBoth(page, 'layer1-on-pendulum-a');

    await waitReachable(page, 'l1-freeze-b');
    await clickSocket(page, 'l1-freeze-b');
    expect(await transferTo(page, 'l1-pendulum-b', true), 'on B').toBe(true);
    await captureBoth(page, 'layer1-on-pendulum-b');

    await page.keyboard.press('KeyQ');
    await expect.poll(async () => (await state(page)).sketch!.queue.map(q => q.targetId), { timeout: 6000 }).toEqual(['l1-freeze-b']);
    await captureBoth(page, 'layer1-after-recall');

    await waitReachable(page, 'l1-freeze-c');
    await clickSocket(page, 'l1-freeze-c');
    expect(await transferTo(page, 'l1-pendulum-c', true), 'on C').toBe(true);
    await captureBoth(page, 'layer1-on-pendulum-c');

    await page.keyboard.press('KeyQ');
    await waitReachable(page, 'l1-freeze-d');
    await clickSocket(page, 'l1-freeze-d');
    expect(await transferTo(page, 'l1-pendulum-d', true), 'on D').toBe(true);
    await captureBoth(page, 'layer1-on-pendulum-d');

    expect(await transferTo(page, 'l1-exit', true), 'exit ground').toBe(true);
    await expect.poll(async () => (await state(page)).sketch!.stage, { timeout: 15000 }).toBe('exit');
    await captureBoth(page, 'layer1-exit-checkpoint');
  });

  test('capture the escalator, mid-transit and the Layer 2 arrival', async ({ page }) => {
    await open(page);
    // Reach the checkpoint through the same real-input route the checks use.
    expect(await climbToTerrace(page), 'reached the waiting terrace').toBe(true);
    await waitReachable(page, 'l1-freeze-a');
    await clickSocket(page, 'l1-freeze-a');
    expect(await transferTo(page, 'l1-pendulum-a', false), 'on A').toBe(true);
    await waitReachable(page, 'l1-freeze-b');
    await clickSocket(page, 'l1-freeze-b');
    expect(await transferTo(page, 'l1-pendulum-b', true), 'on B').toBe(true);
    await page.keyboard.press('KeyQ');
    await waitReachable(page, 'l1-freeze-c');
    await clickSocket(page, 'l1-freeze-c');
    expect(await transferTo(page, 'l1-pendulum-c', true), 'on C').toBe(true);
    await page.keyboard.press('KeyQ');
    await waitReachable(page, 'l1-freeze-d');
    await clickSocket(page, 'l1-freeze-d');
    expect(await transferTo(page, 'l1-pendulum-d', true), 'on D').toBe(true);
    await captureBoth(page, 'layer1-on-pendulum-d');

    expect(await transferTo(page, 'l1-exit', true), 'exit ground').toBe(true);
    await expect.poll(async () => (await state(page)).sketch!.stage, { timeout: 15000 }).toBe('exit');

    expect(await hopRight(page, 58.6)).toBe(true);
    await expect.poll(async () => (await state(page)).sketch!.boarding, { timeout: 8000 }).toBe(true);
    await captureBoth(page, 'layer1-escalator-prompt');

    await page.keyboard.press('KeyE');
    await expect.poll(async () => (await state(page)).sketch!.stage, { timeout: 8000 }).toBe('transit');
    // Capture the reframe while the camera is still moving between layers.
    await expect.poll(async () => (await state(page)).sketch!.transit, { timeout: 8000 }).toBeGreaterThan(0.35);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${DIR}/layer1-escalator-transit-1280.png` });
    await page.setViewportSize({ width: 960, height: 540 });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${DIR}/layer1-escalator-transit-960.png` });
    await page.setViewportSize({ width: 1280, height: 720 });

    await expect.poll(async () => (await state(page)).sketch!.stage, { timeout: 15000 }).toBe('arrival');
    await captureBoth(page, 'layer1-layer2-arrival');
    expect((await state(page)).sketch!.completed).toBe(true);
    // The arrival is on fixed Layer 2 ground with no leftover momentum.
    const landed = (await body(page))!;
    expect(landed.grounded).toBe(true);
    expect(landed.y).toBeCloseTo(15.2, 1);
  });
});