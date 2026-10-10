import { describe, expect, it } from 'vitest';
import { SketchRouteModel, type SketchTipPart } from '../src/gameplay/sketch-model';
import { idleControls } from '../src/gameplay/controller';
import { sketchAdventure, sketchLayerThreeSwings, sketchLayerThreeWalls } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning, type SketchRoute } from '../src/levels/unfinished-sketch';

// Release (user, 2026-10-10): the adventure tells the player what to press for
// the next step, from the live state. The isolated studies stay uncoached; the
// Layer 3 checks use coached copies of their studies.
const fresh = (route: SketchRoute) => { const m = new SketchRouteModel(route, sketchTuning); tick(m, 2); return m; };
const tick = (m: SketchRouteModel, n = 1) => { for (let i = 0; i < n; i++) m.update(1 / 60, idleControls()); };
const keys = (tip: SketchTipPart[]) => tip.map(p => `${p.keys.join('+')}:${p.text}`);
/** Put the player's centre at (x, y) without a step, so the tip reads that spot. */
const at = (m: SketchRouteModel, x: number, y: number) => {
  const b = m.controller.body; b.x = x - b.width / 2; b.y = y - b.height / 2;
};
const near = (m: SketchRouteModel, id: string, dx = -3) => { const p = m.targetPosition(id)!; at(m, p.x + dx, p.y); };
const place = (m: SketchRouteModel, id: string) => { near(m, id); m.enqueue({ type: 'place', targetId: id }); tick(m); expect(m.isOccupied(id)).toBe(true); };

describe('adventure step tips', () => {
  it('Layer 1: a ring in reach asks for a click; out of nails, Q', () => {
    const m = fresh(sketchAdventure);
    expect(m.coachTip()).toEqual([]);
    near(m, 'l1-freeze-a'); expect(keys(m.coachTip())).toEqual(['click:Click a ring to nail the board still']);
    place(m, 'l1-freeze-a'); place(m, 'l1-freeze-b');
    expect(m.availableNails).toBe(0);
    near(m, 'l1-freeze-c'); expect(keys(m.coachTip())).toEqual(['Q:Pull back your oldest nail to reuse it']);
    m.enqueue({ type: 'recall' }); tick(m); near(m, 'l1-freeze-c');
    expect(keys(m.coachTip())).toEqual(['click:Click a ring to nail the board still']);
    expect(m.hud().tip).toEqual(m.coachTip());
    expect(m.hud().hint).toContain('Nail the swinging boards still');
  });

  it('studies stay uncoached', () => {
    const m = fresh(sketchLayerThreeWalls);
    expect(m.coachTip()).toEqual([]);
    expect(m.hud().tip).toEqual([]);
  });

  it('Layer 3 walls: the spare nail first, then nailing and kicking between boards', () => {
    const m = fresh({ ...sketchLayerThreeWalls, coach: true });
    expect(keys(m.coachTip())).toEqual([':Walk into the spare nail to pick it up']);
    m.pickupCollected = true;
    near(m, 'l3-wall-a-pin');
    expect(keys(m.coachTip())).toEqual(['click:Click a ring to nail the board still']);
    place(m, 'l3-wall-a-pin');
    expect(keys(m.coachTip())).toContain('Space:Jump at a nailed board, then kick off it');
  });

  it('swing crossing: strip, bar, jump and grab, then swing, free a nail, let go', () => {
    const m = fresh({ ...sketchLayerThreeSwings, coach: true });
    expect(keys(m.coachTip())).toEqual(['click:Click the wooden strip to nail it, then stand on the nail']);
    const strip = m.surfacePoint('l3-strip-f', 0.5)!;
    at(m, strip.x - 2, strip.y + 1); expect(m.placeAt('l3-strip-f', 0.5)).toBe(true); tick(m);
    expect(keys(m.coachTip())).toEqual(['click:Click the moving bar to nail it']);
    const bar = m.surfacePoint('l3-bar-m1', 0.5)!;
    at(m, bar.x - 2, bar.y - 2); expect(m.placeAt('l3-bar-m1', 0.5)).toBe(true); tick(m);
    expect(m.grips.length).toBe(1);
    // In the air beside the nail: E now (and the in-world E key); far away: jump close first.
    const grip = m.grips[0];
    m.controller.body.grounded = false; at(m, grip.x, grip.y - 1.2);
    expect(keys(m.coachTip())).toEqual(['E:Grab the nail']);
    expect(m.gripHint()).toMatchObject({ id: grip.id, jumpFirst: false });
    at(m, grip.x + 12, grip.y - 1.2);
    expect(keys(m.coachTip())).toEqual(['Space:Jump close to the nail', 'E:Grab it']);
    expect(m.gripHint()).toBeNull();
    // Swinging on it with both nails placed: free the oldest (the strip), never the one held.
    at(m, grip.x, grip.y - 1.2); m.controller.body.grounded = false;
    m.update(1 / 60, { ...idleControls(), interactPressed: true });
    expect(m.move.state).toBe('swing');
    expect(keys(m.coachTip())).toEqual(['A+D:Swing', 'Q:Free your oldest nail']);
    m.enqueue({ type: 'recall' }); tick(m);
    expect(keys(m.coachTip())).toEqual(['A+D:Swing', 'click:Click the next bar to nail it']);
  });
});
