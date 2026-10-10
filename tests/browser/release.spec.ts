import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, posix } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { KEY, PEAR_OWNED, PEAR_RESTORED, OPEN_PROMPT, PROD } from './campaign-controls';

// Release checks on the production build (dist/, run `npm run build` first).
// The itch-like case serves dist/ from a subfolder on another site and embeds it
// in an iframe the way an itch.io HTML game page does: a cross-site frame
// (localhost host page, 127.0.0.1 game), a fullscreen button on the host page
// and a resizable embed. Like itch.io's CDN (and unlike Windows), the game
// server matches file names case-sensitively. Evidence goes to EVIDENCE_DIR.
const EVIDENCE = process.env.EVIDENCE_DIR ?? 'test-results/release';
const DIST = join(process.cwd(), 'dist');
const GAME_PORT = 4180, HOST_PORT = 4181, PREFIX = '/html/1234567/';
const GAME_URL = `http://127.0.0.1:${GAME_PORT}${PREFIX}index.html`;
const HOST_URL = `http://localhost:${HOST_PORT}/`;
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.txt': 'text/plain', '.json': 'application/json' };
const HOST_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>itch embed mimic</title><style>
body { margin: 0; background: #2b2b2b; color: #ddd; font: 14px sans-serif; } header { height: 56px; padding: 18px 24px; box-sizing: border-box; }
#wrap { position: relative; width: 1280px; height: 720px; margin: 0 auto; background: #000; } iframe { display: block; width: 100%; height: 100%; border: 0; }
#fs { margin: 8px auto; display: block; }</style></head><body><header>Game page (itch.io embed mimic)</header>
<div id="wrap"><iframe id="game" src="${GAME_URL}" allow="autoplay; fullscreen *; gamepad" allowfullscreen scrolling="no"></iframe></div>
<button id="fs" onclick="document.getElementById('game').requestFullscreen()">Fullscreen</button></body></html>`;

/** The file only if every path segment matches a directory entry exactly, case included. */
async function exactCase(relative: string): Promise<string | null> {
  let dir = DIST;
  for (const segment of relative.split('/').filter(Boolean)) {
    if (!(await readdir(dir)).includes(segment)) return null;
    dir = join(dir, segment);
  }
  return dir;
}

let servers: Server[] = [];
test.beforeAll(async () => {
  const game = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
    if (!path.startsWith(PREFIX)) { response.writeHead(404).end(); return; }
    const file = await exactCase(posix.normalize(path.slice(PREFIX.length) || 'index.html'));
    if (!file) { response.writeHead(404).end(); return; }
    try { const body = await readFile(file); response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body); }
    catch { response.writeHead(404).end(); }
  });
  const host = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }).end(HOST_PAGE); });
  await Promise.all([new Promise<void>(done => game.listen(GAME_PORT, '127.0.0.1', done)), new Promise<void>(done => host.listen(HOST_PORT, 'localhost', done))]);
  servers = [game, host];
});
test.afterAll(async () => { await Promise.all(servers.map(server => new Promise(done => server.close(done)))); });

/** Console errors, uncaught errors and failed requests from every frame. */
function watch(page: Page) {
  const problems: string[] = []; const requests: string[] = [];
  page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', request => problems.push(`failed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) problems.push(`${response.status()}: ${response.url()}`); });
  page.on('request', request => requests.push(request.url()));
  return { problems, requests };
}

test('production entry: no dev hooks or direct levels, favicon and meta, clean console', async ({ page }) => {
  const { problems, requests } = watch(page);
  await page.goto(PROD + '?scene=royal-supper&study=adventure&lane=movement&debug=1');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  expect(await page.evaluate(() => '__curatorDebug' in window)).toBe(false);
  await expect(page).toHaveTitle('Night at the Museum · The Garden Before Dawn');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /museum/);
  expect(requests.some(url => url.endsWith('/favicon.svg'))).toBe(true);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('#museum-hud')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${EVIDENCE}/production-museum-1280.png` });
  expect(problems).toEqual([]);
});

test('itch-like embed: subfolder, cross-site iframe, focus, saves, blur pause, fullscreen and resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { problems, requests } = watch(page);
  await page.goto(HOST_URL);
  const game = page.frameLocator('#game');
  await expect(game.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/embed-title-1280.png` });

  // A click into the frame gives it keyboard focus: walk up to the masterpiece and inspect it with E.
  await game.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(game.locator('#museum-hud')).toBeVisible(); await page.waitForTimeout(350);
  await page.keyboard.down('KeyW');
  await expect(game.locator('#museum-prompt')).toHaveText('Click / E — Inspect the masterpiece', { timeout: 6000 });
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  await expect(game.getByRole('button', { name: 'Pear silhouette' })).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/embed-inspection-1280.png` });
  await page.keyboard.press('Escape');
  await expect(game.locator('#objective')).toHaveText('Find the golden pear in Royal Supper');

  // Clicking the host page blurs the game, which pauses; Resume returns control.
  await page.mouse.click(40, 30);
  await expect(game.getByRole('button', { name: 'Resume', exact: false })).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/embed-blur-pause.png` });
  await game.getByRole('button', { name: 'Resume', exact: false }).click();
  await expect(game.locator('#museum-hud')).toBeVisible();

  // Saves persist in the cross-site frame across a reload of the host page.
  const gameFrame = () => page.frames().find(frame => frame.url().startsWith(GAME_URL))!;
  await gameFrame().evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: PEAR_OWNED });
  await page.reload();
  await game.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(game.locator('#inventory')).toHaveText('Golden pear');

  // The host page's fullscreen button fills the screen with the frame; the canvas follows it in and out.
  const canvasSize = () => gameFrame()
    .evaluate(() => { const canvas = document.querySelector('canvas')!; return [canvas.clientWidth, canvas.clientHeight, innerWidth, innerHeight]; });
  await page.locator('#fs').click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id ?? '')).toBe('game');
  await expect.poll(async () => (await canvasSize()).slice(0, 2)).toEqual([1440, 900]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${EVIDENCE}/embed-fullscreen.png` });
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(async () => (await canvasSize()).slice(0, 2)).toEqual([1280, 720]);

  // An embed resized to 960x540 keeps the canvas filling the frame.
  await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '960px'; wrap.style.height = '540px'; });
  await expect.poll(async () => (await canvasSize()).slice(0, 2)).toEqual([960, 540]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${EVIDENCE}/embed-960.png` });

  // Every game request stayed inside the subfolder (relative paths).
  const gameRequests = requests.filter(url => url.startsWith(`http://127.0.0.1:${GAME_PORT}`));
  expect(gameRequests.length).toBeGreaterThan(20);
  expect(gameRequests.filter(url => !new URL(url).pathname.startsWith(PREFIX))).toEqual([]);
  expect(problems).toEqual([]);
});

/** A real left drag inside the game frame; dx > 0 turns right. */
async function dragInFrame(page: Page, dx: number) {
  const box = (await page.locator('#game').boundingBox())!; const y = box.y + box.height / 2; const x = dx < 0 ? box.x + box.width - 60 : box.x + 60;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(60);
}
async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(80);
}

test('itch-like embed: Royal Supper and the Sketch load every asset from the case-sensitive host', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { problems, requests } = watch(page);
  await page.goto(HOST_URL);
  const game = page.frameLocator('#game');
  await expect(game.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await page.frames().find(frame => frame.url().startsWith(GAME_URL))!
    .evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: PEAR_RESTORED });
  await page.reload();

  // Royal Supper hangs on the right wall: strafe right, walk up the room and turn to face it.
  await game.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(game.locator('#museum-hud')).toBeVisible(); await page.waitForTimeout(350);
  await hold(page, 'KeyD', 760); await hold(page, 'KeyW', 1740); await dragInFrame(page, 523);
  await expect(game.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');
  await page.keyboard.press('KeyE');
  await expect(game.locator('#hud')).toBeVisible(); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${EVIDENCE}/embed-supper.png` });
  await page.keyboard.press('Escape'); await game.getByRole('button', { name: 'Return to Museum', exact: true }).click();
  await expect(game.locator('#museum-prompt')).toHaveText('Click / E — Enter Royal Supper');

  // The Sketch hangs on the left wall: from the spawn, strafe left, walk up and turn to face it.
  await page.reload();
  await game.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(game.locator('#museum-hud')).toBeVisible(); await page.waitForTimeout(350);
  await hold(page, 'KeyA', 760); await hold(page, 'KeyW', 1740); await dragInFrame(page, -523);
  await expect(game.locator('#museum-prompt')).toHaveText(OPEN_PROMPT);
  await page.keyboard.press('KeyE');
  await expect(game.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${EVIDENCE}/embed-sketch.png` });

  const gameRequests = requests.filter(url => url.startsWith(`http://127.0.0.1:${GAME_PORT}`));
  for (const folder of ['assets/supper/cartoon/', 'assets/sketch/', 'assets/audio/', 'assets/player/'])
    expect(gameRequests.some(url => url.includes(PREFIX + folder)), folder).toBe(true);
  expect(problems).toEqual([]);
});
