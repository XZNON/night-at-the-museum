import { expect, type Page } from '@playwright/test';
import { recordRoute } from '../route-plan';

// Call while paused: resize/capture the actual renderer without advancing hazards.
// Hide only the pause dialog for these inspection images, then restore it.
export async function captureFrozenArt(page: Page, name: string): Promise<void> {
  await page.locator('#modal').evaluate(el => { el.style.visibility = 'hidden'; });
  try {
    for (const [width, height] of [[1280, 720], [960, 540]]) {
      await page.setViewportSize({ width, height });
      // Let the resize and a subsequent rendered frame settle at this size.
      // Software WebGL can need longer than a fixed 80 ms on a busy machine.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.screenshot({ path: `test-results/m3-props-${name}-${width}.png` });
    }
  } finally {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.locator('#modal').evaluate(el => { el.style.removeProperty('visibility'); });
  }
}

export async function expandedRoute(page: Page, onStage?: (index: number) => Promise<void>, endStage = Infinity): Promise<void> {
  const { stages } = recordRoute(); const began = Date.now(); let retries = 0;
  for (const [index, stage] of stages.entries()) {
    let reached = false;
    for (let attempt = 0; attempt < 4 && !reached; attempt++) {
      if (attempt) { retries++; await page.keyboard.press('KeyR'); await page.waitForTimeout(150); }
      let axis = 0; let held = false; let origin = Date.now(); let frames = 0;
      try {
        for (const action of stage.actions) {
          if (axis !== action.axis) {
            if (axis) await page.keyboard.up(axis > 0 ? 'KeyD' : 'KeyA');
            if (action.axis) await page.keyboard.down(action.axis > 0 ? 'KeyD' : 'KeyA');
            axis = action.axis;
          }
          if (held !== action.held) { await page.keyboard[action.held ? 'down' : 'up']('Space'); held = action.held; }
          if (action.interact) await page.keyboard.press('KeyE');
          if (action.restart) await page.keyboard.press('KeyR');
          frames += action.frames;
          await page.waitForTimeout(Math.max(0, origin + frames * 1000 / 60 - Date.now()));
        }
      } finally { await page.keyboard.up('KeyD'); await page.keyboard.up('KeyA'); await page.keyboard.up('Space'); }
      if (stage.checkpoint !== 'pear' && !(await page.locator('#checkpoint').textContent())?.includes(stage.checkpoint.replaceAll('-', ' '))) {
        // Wall-clock keyboard scheduling can end a fraction short of the flag
        // on a busy browser. Finish that safe section-end walk through real input.
        await page.keyboard.down('KeyD');
        try { await expect(page.locator('#checkpoint')).toContainText(stage.checkpoint.replaceAll('-', ' '), { timeout: 600 }); }
        catch { /* A real missed section still takes the ordinary retry below. */ }
        finally { await page.keyboard.up('KeyD'); }
      }
      reached = stage.checkpoint === 'pear' ? await page.getByRole('button', { name: /^(Return to Museum|Finish blockout)$/ }).isVisible() :
        (await page.locator('#checkpoint').textContent())?.includes(stage.checkpoint.replaceAll('-', ' ')) ?? false;
      if (!reached) {
        console.log('Retry stage', index, attempt, await page.locator('#checkpoint').textContent(), await page.locator('#cue').textContent());
        await page.screenshot({ path: `test-results/expanded-retry-${index}-${attempt}.png` });
      }
    }
    expect(reached, `Expanded section ${stage.checkpoint}`).toBe(true);
    console.log('Expanded section reached', stage.checkpoint, ((Date.now() - began) / 1000).toFixed(1));
    if (onStage) await onStage(index);
    if (index >= endStage) break;
    if (index === 4 || index === 5 || index === 6) await page.screenshot({ path: `test-results/expanded-${stage.checkpoint}.png` });
  }
  console.log('Expanded route elapsed seconds / retries', (Date.now() - began) / 1000, retries);
}
