import { beforeEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ sounds: [] as any[], volume: 0.7 }));
vi.mock('howler', () => ({
  Howler: { ctx: { resume: vi.fn(async () => {}) }, volume: vi.fn((value?: number) => value === undefined ? fake.volume : (fake.volume = value)) },
  Howl: class {
    ready = false; running = false; callbacks = new Map<string, () => void>();
    play = vi.fn(() => { this.running = true; return 1; });
    pause = vi.fn(() => { this.running = false; });
    stop = vi.fn(() => { this.running = false; });
    unload = vi.fn(() => { this.running = false; });
    constructor(readonly options: any) { fake.sounds.push(this); }
    once(event: string, callback: () => void) { this.callbacks.set(event, callback); }
    state() { return this.ready ? 'loaded' : 'loading'; }
    playing() { return this.running; }
    loaded() { this.ready = true; this.callbacks.get('load')?.(); }
  },
}));
import { GameAudio } from '../src/core/audio';
beforeEach(() => { fake.sounds.length = 0; fake.volume = 0.7; });
describe('audio activation and ownership', () => {
  it('waits for explicit activation and never starts delayed ambience during pause', () => {
    const audio = new GameAudio(vi.fn()); audio.setScene('royal-supper'); audio.setPaused(false);
    expect(fake.sounds).toHaveLength(0); audio.activate(); const ambient = fake.sounds[0];
    audio.setPaused(true); ambient.loaded(); expect(ambient.play).not.toHaveBeenCalled();
    audio.setPaused(false); expect(ambient.play).toHaveBeenCalledTimes(1);
    audio.setPaused(true); expect(ambient.running).toBe(false);
    audio.dispose();
  });
  it('drops unloaded gameplay cues, cancels delayed presentation and unloads every old scene sound', () => {
    const audio = new GameAudio(vi.fn()); audio.activate(); audio.setScene('royal-supper'); audio.setPaused(false);
    const jump = fake.sounds.find(s => s.options.src[0].endsWith('/jump.wav'));
    const collect = fake.sounds.find(s => s.options.src[0].endsWith('/collect.wav'));
    audio.play('jump'); jump.loaded(); expect(jump.play).not.toHaveBeenCalled();
    audio.play('collect', true); audio.setPaused(true); collect.loaded(); expect(collect.play).not.toHaveBeenCalled();
    const old = [...fake.sounds]; audio.setScene('museum');
    expect(old.every(s => s.unload.mock.calls.length === 1)).toBe(true);
    expect(audio.diagnostics.ownedSounds).toBe(11); audio.dispose(); expect(audio.diagnostics.ownedSounds).toBe(0);
    expect(fake.sounds.every(s => s.unload.mock.calls.length === 1)).toBe(true);
  });
  it('gives the Sketch its own rock/metallic loop, quieter than the banquet bed, and swaps it out cleanly', () => {
    const audio = new GameAudio(vi.fn()); audio.activate(); audio.setScene('sketch');
    const bed = fake.sounds.find(s => s.options.loop);
    expect(bed.options.src[0]).toMatch(/\/sketch\.wav$/); expect(bed.options.volume).toBeLessThan(0.3);
    audio.setScene('museum'); expect(bed.unload).toHaveBeenCalledTimes(1);
    expect(fake.sounds.filter(s => s.options.loop).at(-1).options.src[0]).toMatch(/\/museum\.wav$/);
    audio.dispose();
  });
  it('applies saved volume including mute and stops effects on pause', () => {
    const audio = new GameAudio(vi.fn()); audio.volume(0); expect(audio.diagnostics.volume).toBe(0);
    audio.activate(); audio.setScene('museum'); audio.setPaused(false);
    const restore = fake.sounds.find(s => s.options.src[0].endsWith('/restore.wav')); restore.loaded();
    audio.play('restore'); expect(restore.running).toBe(true); audio.setPaused(true); expect(restore.running).toBe(false);
    audio.volume(0.35); expect(audio.diagnostics.volume).toBe(0.35); audio.dispose();
  });
});
