import { describe, expect, it } from 'vitest';
import { moveBody } from '../src/gameplay/collision';
import type { Body } from '../src/gameplay/collision';
import { CharacterController, idleControls } from '../src/gameplay/controller';
import { royalSupper } from '../src/levels/royal-supper';

const dt = 1 / 60;
const floor = { id: 'floor', x: -20, y: -0.2, width: 40, height: 0.2 };
const body = (values: Partial<Body> = {}): Body => ({ x: 0, y: 2, width: 0.65, height: 1.25, vx: 0, vy: 0, grounded: false, ...values });

describe('swept kinematic collision', () => {
  it('catches a thin landing even when one step crosses the entire platform', () => {
    const b = body({ vy: -300 }); moveBody(b, [floor], dt);
    expect(b.y).toBe(0); expect(b.grounded).toBe(true); expect(b.vy).toBe(0);
  });
  it('catches side walls and ceilings at high speed in either direction', () => {
    const wall = { id: 'wall', x: 3, y: -5, width: 0.05, height: 10 };
    const b = body({ vx: 300 }); moveBody(b, [wall], dt);
    expect(b.x).toBeCloseTo(3 - b.width); expect(b.vx).toBe(0);
    b.x = 5; b.vx = -300; moveBody(b, [wall], dt); expect(b.x).toBeCloseTo(3.05);
    b.x = 0; b.y = 0; b.vy = 300;
    moveBody(b, [{ id: 'ceiling', x: -1, y: 3, width: 6, height: 0.1 }], dt);
    expect(b.y + b.height).toBeCloseTo(3); expect(b.vy).toBe(0);
  });
  it('does not catch feet against a platform side while walking across its top', () => {
    const b = body({ y: 0, vx: 6.8, vy: -1 }); moveBody(b, [floor], dt);
    expect(b.x).toBeCloseTo(6.8 * dt); expect(b.y).toBe(0);
  });
  it('reports only the resolved contact when a fast sweep crosses multiple walls', () => {
    const near = { id: 'near', x: 2, y: -5, width: 0.1, height: 10 };
    const far = { ...near, id: 'far', x: 4 };
    const b = body({ vx: 300 }); const contacts: typeof near[] = [];
    moveBody(b, [far, near], dt, contacts);
    expect(b.x + b.width).toBeCloseTo(near.x);
    expect(contacts.map(c => c.id)).toEqual(['near']);
  });
});

describe('forgiving jump control', () => {
  it('allows a coyote jump shortly after walking off a ledge, without a double jump', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 0);
    c.update(dt, idleControls(), [floor]); c.update(dt, idleControls(), []);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, []);
    expect(c.body.vy).toBeGreaterThan(9);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, []);
    expect(c.body.vy).toBeLessThan(10);
  });
  it('expires coyote time into one rescue jump and buffers a press after the air jump is spent', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 0);
    c.update(dt, idleControls(), [floor]);
    for (let i = 0; i < 10; i++) c.update(dt, idleControls(), []);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, []);
    expect(c.body.vy).toBeGreaterThan(9);
    c.body.y = 0.09; c.body.vy = -3;
    c.update(dt, idleControls(), [floor]);
    c.update(dt, { ...idleControls(), jumpPressed: true, jumpHeld: true }, [floor]);
    c.update(dt, { ...idleControls(), jumpHeld: true }, [floor]);
    c.update(dt, { ...idleControls(), jumpHeld: true }, [floor]);
    expect(c.body.vy).toBeGreaterThan(9);
  });
  it('measures the held jump envelope used to author the route', () => {
    const c = new CharacterController(royalSupper.tuning, 0, 0);
    c.update(dt, idleControls(), [floor]); c.body.vx = royalSupper.tuning.speed;
    let apex = 0; let frames = 0;
    do {
      c.update(dt, { ...idleControls(), axis: 1, jumpPressed: frames === 0, jumpHeld: true }, [floor]);
      apex = Math.max(apex, c.body.y); frames++;
    } while (!c.body.grounded && frames < 120);
    expect(apex).toBeGreaterThan(2.1); expect(apex).toBeLessThan(2.34);
    expect(c.body.x).toBeGreaterThan(5.6); expect(c.body.x).toBeLessThan(5.9);
    const bridge = royalSupper.platforms.find(p => p.id === 'fork-bridge')!;
    expect(bridge.width).toBeGreaterThan(c.body.x + c.body.width);
  });
});
