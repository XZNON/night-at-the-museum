import { expect, type Page } from '@playwright/test';

// Shared real-input Layer 3 controls (S4A climb, S4B crossing), extracted
// unchanged from the S4C joined spec; S4D reuses them. Debug state is read
// back for decisions and assertions, never written.
type Screen = { offset: number; x: number; y: number; visible: boolean; reason: string };
export type State = {
  body: { x: number; y: number; vx: number; vy: number; grounded: boolean; width: number; height: number };
  paused: boolean; updateCount: number; canvasCount: number; geometryCount: number; textureCount: number;
  sketch: {
    stage: string; leg: string; section: string; completed: boolean; recovering: boolean; available: number; budget: number;
    pickup: boolean; pickupOffered: boolean; reach: number; freePlacement: boolean; elapsed: number;
    queue: { targetId: string; surfaceId?: string; offset?: number }[];
    motion: { state: string; wall: string; wallTransfer: boolean; swingTarget: string; swingAngle: number };
    camera: { x: number; y: number; width: number; height: number };
    grips: { id: string; x: number; y: number; vx: number; vy: number }[];
    targets: { id: string; x: number; y: number; height: number; reason: string; occupiedBy: string | null; screen: { x: number; y: number; visible: boolean } }[];
    nailSurfaces: { id: string; screen: Screen[] }[];
  };
};
export const state = (page: Page) => page.evaluate(() => (window as unknown as { __curatorDebug: () => State }).__curatorDebug());
/** Records written by the importing spec after each test; it clears them per test. */
export const events: unknown[] = [];
/** Where captures go; each importing spec sets its own directory. */
export const evidence = { dir: 'docs/validation/sketch-s4/s4c' };
export async function record(page: Page, event: string) { events.push({ event, url: page.url(), size: page.viewportSize(), state: await state(page) }); }
export async function until(page: Page, predicate: (s: State) => boolean, label: string, ms = 10000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const s = await state(page); if (predicate(s)) return s; await page.waitForTimeout(8); }
  await record(page, `FAILED ${label}`);
  const s = await state(page);
  throw new Error(`Timeout ${label}: ${JSON.stringify({ body: s.body, leg: s.sketch.leg, stage: s.sketch.stage, motion: s.sketch.motion })}`);
}
export async function release(page: Page) { for (const key of ['Space', 'KeyA', 'KeyD', 'KeyE']) await page.keyboard.up(key); }
export async function reenter(page: Page) {
  await page.locator('[data-action="leave"]').click(); await page.locator('[data-action="start"]').click();
  await expect(page.locator('#sketch-hud')).toBeVisible(); await page.waitForTimeout(350);
}
export const HIDE_PAUSE = '#modal { visibility:hidden; } #sketch-hud[hidden] {display:block!important;}';
export async function capture(page: Page, label: string, pause = false) {
  if (pause) { await page.keyboard.press('Escape'); await expect(page.locator('#modal')).toBeVisible(); await page.waitForTimeout(40); }
  await shot(page, label, pause);
  if (pause) await page.locator('[data-action="resume"]').click();
}
/** Hide only the pause overlay for a capture of the frozen game; it has no input/state effect. */
export async function shot(page: Page, label: string, paused: boolean) {
  await record(page, label);
  await page.screenshot({ path: `${evidence.dir}/${label}-${page.viewportSize()!.width}.png`, ...(paused ? { style: HIDE_PAUSE } : {}) });
}
/** Neither the hint nor the status panel may cover a click spot. */
export async function clear(page: Page, x: number, y: number, what: string) {
  for (const selector of ['#sketch-hud .section-hint', '#sketch-hud .sketch-status']) {
    const rect = await page.locator(selector).boundingBox();
    expect(rect && x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height, `${what} is clickable outside ${selector}`).toBe(false);
  }
}
export const handedOver = (s: State) => s.sketch.leg === 'l3-swings';

// --- the climb (S4A) -------------------------------------------------------
export async function pin(page: Page, id: string) {
  const s = await state(page); const t = s.sketch.targets.find(t => t.id === id)!;
  expect(t.reason).toBe(''); expect(t.screen.visible).toBe(true); await record(page, `pin ${id}`);
  await clear(page, t.screen.x, t.screen.y, id);
  await page.mouse.click(t.screen.x, t.screen.y);
  await until(page, s => s.sketch.queue.some(q => q.targetId === id), `placed ${id}`);
}
export async function entryA(page: Page) {
  await pin(page, 'l3-wall-a-pin'); await page.keyboard.down('KeyD');
  await until(page, s => s.body.x > 8.6, 'safe launch');
  const picked = await state(page); expect(picked.sketch.pickup).toBe(true); expect(picked.sketch.budget).toBe(3);
  await page.keyboard.down('Space');
  await until(page, s => s.sketch.motion.state === 'wall-slide', 'A contact'); await release(page);
  expect((await state(page)).sketch.motion.wall).toBe('l3-wall-a'); await record(page, 'A left-face contact');
}
const LETTERS = 'abcdef';
/** Off a board top: a held double jump toward the other column or the ledge. */
export async function hop(page: Page, key: 'KeyA' | 'KeyD', onLedge?: (page: Page) => Promise<void>) {
  const tick = (await state(page)).updateCount;
  await page.keyboard.down(key); await page.keyboard.down('Space');
  await until(page, s => s.updateCount > tick + 10 && s.body.vy <= 1.5, 'hop apex');
  await page.keyboard.up('Space'); await page.keyboard.down('Space');
  if (onLedge) {
    // Over the ledge, still airborne and still on the climb: the moment before the handoff.
    const s = await until(page, s => handedOver(s) || (!s.body.grounded && s.body.x > 13.3 && s.body.y > 49.6), 'airborne over the ledge');
    if (!handedOver(s)) await onLedge(page);
  }
  await until(page, s => handedOver(s) || s.sketch.recovering || s.sketch.motion.state === 'wall-slide' || (s.body.grounded && s.updateCount > tick + 30), 'hop landing');
  await release(page);
}
/** The accepted climb; returns the state on the handoff. */
export async function climb(page: Page, o: { captures?: boolean; onLedge?: (page: Page) => Promise<void> } = {}) {
  if (o.captures) await capture(page, 'entrance');
  await entryA(page);
  if (o.captures) await capture(page, 'on-a', true);
  await pin(page, 'l3-wall-b-pin');
  let reached = 0; const pinned = new Set(['a', 'b']); let onLedgeDone = false;
  for (let step = 0; step < 40; step++) {
    let s = await state(page);
    if (handedOver(s)) break;
    expect(s.sketch.recovering, 'no fall during the climb').toBe(false);
    if (s.sketch.motion.state === 'wall-slide') {
      const wall = s.sketch.motion.wall; reached = Math.max(reached, LETTERS.indexOf(wall.slice(-1)));
      const oldest = s.sketch.queue[0] ? LETTERS.indexOf(s.sketch.queue[0].targetId.split('-')[2]) : -1;
      if (s.sketch.available === 0 && oldest >= 0 && oldest < reached - 1) {
        await page.keyboard.press('KeyQ'); await until(page, s => s.sketch.available === 1, `recall ${LETTERS[oldest]}`); s = await state(page);
      }
      const ahead = [...LETTERS].find((l, i) => i > Math.max(1, reached) && !pinned.has(l));
      if (s.sketch.available > 0 && ahead && s.sketch.targets.find(t => t.id === `l3-wall-${ahead}-pin`)!.reason === '') {
        await pin(page, `l3-wall-${ahead}-pin`); pinned.add(ahead);
        if (o.captures && ahead === 'f') await capture(page, 'pinned-f', true);
      }
      await record(page, `kick from ${wall}`);
      await page.keyboard.press('Space');
      if (o.onLedge && wall === 'l3-wall-f' && !onLedgeDone) {
        // F's kick can carry straight onto the ledge: catch the moment before the handoff.
        const air = await until(page, s => handedOver(s) || s.sketch.recovering || s.body.grounded || (!s.body.grounded && s.body.x > 13.3 && s.body.y > 49.6), 'airborne over the ledge from F');
        if (!handedOver(air) && !air.body.grounded && !air.sketch.recovering) { onLedgeDone = true; await o.onLedge(page); }
      }
      await until(page, s => handedOver(s) || s.sketch.recovering || s.body.grounded || (s.sketch.motion.state === 'wall-slide' && s.sketch.motion.wall !== wall), `after kick from ${wall}`);
    } else if (s.body.grounded) {
      await record(page, 'board top');
      const toLedge = s.body.x < 9 || s.body.y > 49;
      await hop(page, toLedge ? 'KeyD' : 'KeyA', toLedge && s.body.y > 49 && !onLedgeDone ? o.onLedge : undefined);
    } else await page.waitForTimeout(12);
  }
  let s = await state(page);
  if (!handedOver(s)) { await page.keyboard.down('KeyD'); s = await until(page, handedOver, 'walk onto ledge'); await release(page); }
  expect([...pinned].sort().join('')).toBe('abcdef');
  await record(page, 'handoff');
  return s;
}
/** What the handoff must leave behind, read on its first observed frame. */
export async function expectHandoff(page: Page, s: State) {
  expect(s.sketch.leg).toBe('l3-swings'); expect(s.sketch.section).toBe('l3-swings'); expect(s.sketch.stage).toBe('traversal');
  expect(s.sketch.completed).toBe(false); expect(s.sketch.recovering).toBe(false);
  expect(s.sketch.budget).toBe(2); expect(s.sketch.available).toBe(2); expect(s.sketch.queue).toEqual([]); expect(s.sketch.pickup).toBe(false);
  expect([s.sketch.reach, s.sketch.pickupOffered, s.sketch.freePlacement]).toEqual([10, false, true]);
  // On the shared ledge, never moved across a gap.
  expect(s.body.x + s.body.width).toBeGreaterThan(13.2); expect(s.body.x).toBeLessThan(22); expect(s.body.y).toBeGreaterThanOrEqual(49.5);
  // The climb's rings belong to another section now.
  expect(s.sketch.targets.filter(t => t.id.startsWith('l3-wall-')).every(t => t.reason === 'Another layer.')).toBe(true);
  await expect(page.locator('#sketch-endpoint')).toBeHidden();
  await expect(page.locator('#sketch-layer')).toContainText('Layer 3 swings');
  await expect(page.locator('#sketch-goal')).toContainText('l3-swings start');
}

// --- the crossing (S4B) ----------------------------------------------------
const centre = (s: State) => ({ x: s.body.x + s.body.width / 2, y: s.body.y + s.body.height / 2 });
const nail = (s: State, surface: string) => {
  const p = [...s.sketch.queue].reverse().find(q => q.surfaceId === surface);
  return p ? s.sketch.grips.find(g => g.id === p.targetId) ?? null : null;
};
const spot = (s: State, surface: string, offset: number) => s.sketch.nailSurfaces.find(v => v.id === surface)!.screen.find(p => p.offset === offset)!;
export async function nailAt(page: Page, surface: string, offset: number) {
  // A click on a bar that moves under a swinging camera can miss; a miss is an
  // ordinary refused placement (queue unchanged), so the player simply re-aims.
  for (let aim = 1; aim <= 4; aim++) {
    let last = { x: NaN, y: NaN };
    const s = await until(page, s => {
      const p = spot(s, surface, offset); const still = Math.abs(s.sketch.camera.x - last.x) < 0.01 && Math.abs(s.sketch.camera.y - last.y) < 0.01;
      last = { x: s.sketch.camera.x, y: s.sketch.camera.y };
      return p.reason === '' && p.visible && (still || s.sketch.motion.state === 'swing');
    }, `${surface} ${offset} in reach`);
    const before = s.sketch.queue.length; const p = spot(s, surface, offset);
    await clear(page, p.x, p.y, surface);
    await page.mouse.click(p.x, p.y);
    const end = Date.now() + 600;
    while (Date.now() < end) {
      const after = await state(page);
      if (after.sketch.queue.length === before + 1) {
        expect(after.sketch.queue.at(-1)!.surfaceId).toBe(surface);
        await record(page, `nailed ${surface} @${offset}${aim > 1 ? ` (aim ${aim})` : ''}`); return;
      }
      await page.waitForTimeout(8);
    }
    const missed = await state(page); expect(missed.sketch.queue.length, 'a missed click never changes the queue').toBe(before);
    await record(page, `missed click on ${surface}, re-aim`);
  }
  throw new Error(`no placement on ${surface} after four clicks`);
}
export async function toHead(page: Page) {
  const s0 = await state(page);
  const head = s0.sketch.targets.find(t => t.occupiedBy && t.id.startsWith('l3-strip-f'))!;
  await page.keyboard.down('KeyD');
  await until(page, s => s.body.x >= 21, 'ledge edge');
  await page.keyboard.down('Space');
  await until(page, s => centre(s).x >= head.x - 0.5, 'over the head');
  await page.keyboard.up('KeyD');
  const landed = await until(page, s => s.sketch.recovering || (s.body.grounded && Math.abs(s.body.y - (head.y + head.height / 2)) < 0.01), 'land on F');
  await release(page);
  expect(landed.sketch.recovering, 'landed on F head').toBe(false);
  await record(page, 'standing on F');
}
export async function leapTo(page: Page, surface: string) {
  await page.keyboard.down('KeyD'); await page.keyboard.down('Space');
  const start = (await state(page)).updateCount; let second = false; let nextE = 0;
  for (;;) {
    const s = await state(page); const g = nail(s, surface);
    if (s.sketch.motion.state === 'swing') break;
    if (s.sketch.recovering || (s.body.grounded && s.updateCount > start + 8)) { await release(page); return false; }
    if (!second && s.updateCount > start + 4 && s.body.vy <= 1.5) { second = true; await page.keyboard.up('Space'); await page.keyboard.down('Space'); }
    if (g && s.updateCount >= nextE && Math.hypot(centre(s).x - g.x, centre(s).y - g.y) <= 1.9) { await page.keyboard.press('KeyE'); nextE = s.updateCount + 3; }
    await page.waitForTimeout(4);
  }
  await release(page); return true;
}
export async function swingOff(page: Page, theta: number, target?: string) {
  let prev = (await state(page)).sketch.motion.swingAngle; let dir = 1; let held = '';
  for (;;) {
    const s = await state(page);
    if (s.sketch.motion.state !== 'swing') { await release(page); return false; }
    const a = s.sketch.motion.swingAngle; if (a !== prev) dir = Math.sign(a - prev); prev = a;
    if (dir > 0 && a >= theta) break;
    const key = dir > 0 ? 'KeyD' : 'KeyA';
    if (held !== key) { if (held) await page.keyboard.up(held); await page.keyboard.down(key); held = key; }
    await page.waitForTimeout(4);
  }
  if (held !== 'KeyD') { if (held) await page.keyboard.up(held); await page.keyboard.down('KeyD'); }
  await page.keyboard.press('Space');
  const start = (await state(page)).updateCount; let second = false; let nextE = 0;
  for (;;) {
    const s = await state(page); const g = target ? nail(s, target) : null;
    if (target && s.sketch.motion.state === 'swing' && g && s.sketch.motion.swingTarget === g.id) break;
    if (!target && s.sketch.completed) break;
    if (s.sketch.recovering || (s.body.grounded && !s.sketch.completed)) { await release(page); return false; }
    if (!second && s.updateCount > start + 3 && s.body.vy <= 1 && (!g || centre(s).y < g.y - 1.4)) { second = true; await page.keyboard.down('Space'); }
    if (g && s.updateCount >= nextE && Math.hypot(centre(s).x - g.x, centre(s).y - g.y) <= 1.9) { await page.keyboard.press('KeyE'); nextE = s.updateCount + 3; }
    await page.waitForTimeout(4);
  }
  await release(page); return true;
}
/** Back toward the crossing start if the player stands well left of it (F's far end is then out of reach). */
export async function toStart(page: Page) {
  if ((await state(page)).body.x >= 16.8) return;
  await page.keyboard.down('KeyD'); await until(page, s => s.body.x >= 16.8, 'toward the crossing start'); await page.keyboard.up('KeyD');
  await page.waitForTimeout(150);
}
export async function attempt(page: Page, captures: boolean) {
  await toStart(page);
  await nailAt(page, 'l3-strip-f', 1);
  await toHead(page);
  await nailAt(page, 'l3-bar-m1', 0);
  if (captures) await capture(page, 'on-f', true);
  await until(page, s => (nail(s, 'l3-bar-m1')?.vx ?? 0) < -1, 'M1 returning');
  if (!await leapTo(page, 'l3-bar-m1')) return false;
  await record(page, 'gripped M1');
  await page.keyboard.press('KeyQ');
  await until(page, s => s.sketch.queue.length === 1 && s.sketch.queue[0].surfaceId === 'l3-bar-m1', 'Q frees F');
  if ((await state(page)).sketch.motion.state !== 'swing') return false;
  await nailAt(page, 'l3-bar-m2', 0.5);
  if (captures) await capture(page, 'swinging-m1', true);
  // The bars' periods (5 s, 4.4 s) beat over ~37 s: hang up to one whole cycle for a window.
  await until(page, s => { const a = nail(s, 'l3-bar-m1'); const b = nail(s, 'l3-bar-m2'); return !!a && !!b && b.x - a.x < 10.2 && b.vx > 0.8; }, 'M2 window', 40000);
  if (!await swingOff(page, 60, 'l3-bar-m2')) return false;
  await record(page, 'gripped M2');
  await page.keyboard.press('KeyQ');
  await until(page, s => s.sketch.queue.length === 1 && s.sketch.queue[0].surfaceId === 'l3-bar-m2', 'Q frees M1');
  if (!await swingOff(page, 40)) return false;
  return true;
}
/** Retries stay in the crossing: each glue retry is checked on the way. */
export async function cross(page: Page, captures = false) {
  for (let tries = 1; tries <= 4; tries++) {
    if (await attempt(page, captures)) { events.push({ event: 'crossed', tries }); return tries; }
    await record(page, `glue retry ${tries}`);
    const s = await until(page, s => !s.sketch.recovering && s.body.grounded && s.body.x === 17.2, 'crossing retry');
    expect([s.sketch.leg, s.sketch.budget, s.sketch.pickupOffered]).toEqual(['l3-swings', 2, false]);
    await page.waitForTimeout(100);
  }
  throw new Error('no crossing in four real-control attempts');
}
/** A free nail, then run off the ledge into the glue: the crossing retries, the climb stays clear. */
export async function glueFail(page: Page, label: string) {
  await toStart(page);
  await nailAt(page, 'l3-strip-f', 0.5);
  await page.keyboard.down('KeyD'); await until(page, s => s.sketch.recovering, `${label}: into the glue`); await release(page);
  await expect(page.locator('#sketch-cue')).toContainText('Glue');
  const s = await until(page, s => !s.sketch.recovering && s.body.grounded, `${label}: recovered`);
  expect(s.body).toMatchObject({ x: 17.2, y: 49.5 });
  expect([s.sketch.leg, s.sketch.stage, s.sketch.budget, s.sketch.available, s.sketch.pickupOffered, s.sketch.completed]).toEqual(['l3-swings', 'traversal', 2, 2, false, false]);
  await record(page, label);
}
