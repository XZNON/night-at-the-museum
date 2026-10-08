import { test, expect } from '@playwright/test';
test('sound requires a gesture, pauses, follows volume and unloads on isolated scene exit', async ({ page }) => {
  const errors: string[] = []; const failures: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.addInitScript(() => localStorage.setItem('last-curator.save.v1', 'audio-isolation-sentinel'));
  await page.goto('http://127.0.0.1:5173/?scene=royal-supper');
  const audio = () => page.evaluate(() => (window as any).__curatorDebug().audio);
  await expect(page.locator('#hud')).toBeVisible();
  expect((await audio()).activated).toBe(false); expect((await audio()).ownedSounds).toBe(0);
  await page.locator('#world').click();
  await expect.poll(async () => (await audio()).playing).toBe(true);
  await page.keyboard.down('Space'); await page.waitForTimeout(180); await page.keyboard.up('Space');
  await expect.poll(async () => (await audio()).playedCues.jump ?? 0).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); expect((await audio()).playing).toBe(false);
  await page.getByRole('button', { name: 'Settings' }).click(); await page.getByLabel('Volume').press('Home'); expect((await audio()).volume).toBe(0);
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Resume', exact: false }).click();
  await expect.poll(async () => (await audio()).playing).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); expect((await audio()).playing).toBe(false);
  await page.getByRole('button', { name: 'Leave painting', exact: true }).click(); expect((await audio()).ownedSounds).toBe(0);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Continue the painting' }).click();
    await expect.poll(async () => (await audio()).playing).toBe(true); expect((await audio()).ownedSounds).toBe(11);
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Leave painting', exact: true }).click();
    expect((await audio()).ownedSounds).toBe(0);
  }
  expect(await page.evaluate(() => localStorage.getItem('last-curator.save.v1'))).toBe('audio-isolation-sentinel');
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});
