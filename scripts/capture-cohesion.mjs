// Real-input pilot capture; observations only, no body/phase/save mutations.
// node scripts/capture-cohesion.mjs before|after [URL] [1280|960]
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
const label = process.argv[2] ?? 'after';
const url = process.argv[3] ?? 'http://127.0.0.1:5173/?scene=royal-supper';
const controlWidth = Number(process.argv[4] ?? 1280);
if (![1280, 960].includes(controlWidth)) throw new Error('Pilot control width must be 1280 or 960');
const prefix = `${label}${controlWidth === 960 ? '-controls-960' : ''}`;
const dir = 'docs/validation/art-cohesion';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: controlWidth, height: controlWidth * 9 / 16 } });
  if (label === 'before') {
    // Load preserved M3 textures through the same logical IDs/camera/renderer.
    await page.route('**/assets/supper/cohesion-v1/*.png', async route => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      const original = name === 'bread.png' ? 'public/assets/supper/bread.png' : `public/assets/supper/props/${name}`;
      await route.fulfill({ body: await readFile(original), contentType: 'image/png' });
    });
  }
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.locator('#hud').waitFor({ state: 'visible' });
  const observe = () => page.evaluate(() => window.__curatorDebug().body);
  const waitBody = predicate => page.waitForFunction(predicate);
  async function capture(name) {
    await page.keyboard.press('Escape');
    await page.locator('#modal').evaluate(el => { el.style.visibility = 'hidden'; });
    for (const width of controlWidth === 960 ? [960] : [1280, 960]) {
      await page.setViewportSize({ width, height: width * 9 / 16 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: `${dir}/${prefix}-${name}-${width}.png` });
    }
    await page.setViewportSize({ width: controlWidth, height: controlWidth * 9 / 16 });
    await page.locator('#modal').evaluate(el => { el.style.removeProperty('visibility'); });
    await page.getByRole('button', { name: 'Resume', exact: false }).click();
  }
  await capture('start');
  await page.keyboard.down('KeyD');
  await waitBody(() => window.__curatorDebug().body.x >= 3.45);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(150);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Space');
  await page.waitForTimeout(340);
  await page.keyboard.up('KeyD');
  await capture('jump');
  await page.keyboard.up('Space');
  await page.waitForTimeout(25);
  await page.keyboard.down('Space');
  await page.keyboard.down('KeyD');
  await waitBody(() => window.__curatorDebug().body.x >= 7.8);
  await page.keyboard.up('KeyD');
  await waitBody(() => window.__curatorDebug().body.grounded);
  await page.keyboard.up('Space');
  const landing = await observe();
  if (landing.x < 6.5 || landing.x > 10 || Math.abs(landing.y - 1.4) > .01) throw new Error(`Wrong bread landing: ${JSON.stringify(landing)}`);
  await capture('landing');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(label, controlWidth, 'pilot ground/air pose and bread landing verified', landing.x.toFixed(2), landing.y);
} finally { await browser.close(); }
