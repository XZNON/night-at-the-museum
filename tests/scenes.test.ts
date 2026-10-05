import { describe, expect, it, vi } from 'vitest';
import type { Camera, Scene, WebGLRenderer } from 'three';
import { SceneManager } from '../src/core/scenes';
import type { GameScene } from '../src/core/scenes';

const fakeScene = (id: string): GameScene => ({
  id, world: {} as Scene, camera: {} as Camera, enter: vi.fn(), exit: vi.fn(),
  dispose: vi.fn(), resize: vi.fn(), fixedUpdate: vi.fn(), render: vi.fn(),
});
const createManager = () => new SceneManager({ setSize: vi.fn(), clear: vi.fn(), render: vi.fn() } as unknown as WebGLRenderer, vi.fn());

describe('serialized scene lifecycle', () => {
  it('ignores rapid entry/return activations and disposes the previous scene once', async () => {
    const manager = createManager(); const first = fakeScene('first'); const second = fakeScene('second');
    const enter = manager.transition(() => first);
    expect(await manager.transition(() => second)).toBe(false);
    expect(await enter).toBe(true); expect(manager.active).toBe(first);
    const returnToMenu = manager.transition(() => null);
    expect(await manager.transition(() => null)).toBe(false);
    await returnToMenu; expect(manager.active).toBeNull();
    expect(first.exit).toHaveBeenCalledTimes(1); expect(first.dispose).toHaveBeenCalledTimes(1);
  });
  it('preserves the active scene when constructing a replacement fails', async () => {
    const manager = createManager(); const first = fakeScene('first');
    await manager.transition(() => first);
    await expect(manager.transition(() => { throw new Error('Missing asset'); })).rejects.toThrow('Missing asset');
    expect(manager.active).toBe(first); expect(first.dispose).not.toHaveBeenCalled();
    expect(manager.transitioning).toBe(false);
  });
});
