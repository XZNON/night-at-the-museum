import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checkPlacement, isComplete, nextPlacement } from '../src/campaign/placement';
import { Progression, type CampaignState } from '../src/campaign/progression';
import { SAVE_KEY, SaveStore, defaultSettings, validateSave } from '../src/campaign/save';
import { masterpieceStageArt } from '../src/ui/masterpiece';
import { museumArtIds, runtimeAssets } from '../src/assets/manifest';
import type { PieceId } from '../src/campaign/definition';

// S5C: the enchanted light (`sun-disc`) placed in the dark sky becomes the
// masterpiece's sun; completion is derived from progression, never stored.
const state = (collected: PieceId[], restored: PieceId[]): CampaignState => ({ collectedPieceIds: collected, restoredPieceIds: restored });
const NEW = state([], []);
const PEAR_OWNED = state(['golden-pear'], []);
const PEAR_RESTORED = state(['golden-pear'], ['golden-pear']);
const LIGHT_OWNED = state(['golden-pear', 'sun-disc'], ['golden-pear']);
const COMPLETE = state(['golden-pear', 'sun-disc'], ['golden-pear', 'sun-disc']);
const raw = (s: CampaignState) => ({ schemaVersion: 1, campaignId: 'garden-before-dawn', ...s, settings: defaultSettings() });
/** What `main.ts` place() does: validate, restore through progression, persist before animating. */
function place(p: Progression, store: SaveStore, piece: string, target: string) {
  const check = checkPlacement(p.snapshot, piece, target);
  if (!check.ok) return { check, result: null };
  const result = p.applyCampaignCommand({ action: 'restore', artworkId: check.stage.artworkId, pieceId: check.stage.pieceId });
  if (result.changed) store.write(p.snapshot, defaultSettings());
  return { check, result };
}
const memoryStore = (initial?: unknown) => {
  const keys = new Map<string, string>(initial === undefined ? [] : [[SAVE_KEY, JSON.stringify(initial)]]);
  const store = new SaveStore({ getItem: k => keys.get(k) ?? null, setItem: (k, v) => { keys.set(k, v); }, removeItem: k => { keys.delete(k); } }, () => {});
  return { keys, store };
};

describe('S5C nextPlacement', () => {
  it('names the next stage and whether its piece is owned, in campaign order', () => {
    expect(nextPlacement(NEW)).toMatchObject({ stage: { pieceId: 'golden-pear' }, reason: 'not-owned' });
    expect(nextPlacement(PEAR_OWNED)).toMatchObject({ stage: { pieceId: 'golden-pear', artworkId: 'royal-supper' }, reason: null });
    expect(nextPlacement(PEAR_RESTORED)).toMatchObject({ stage: { pieceId: 'sun-disc' }, reason: 'not-owned' });
    expect(nextPlacement(LIGHT_OWNED)).toMatchObject({ stage: { pieceId: 'sun-disc', artworkId: 'unfinished-sketch', restorationRegionId: 'dawn-sky' }, reason: null });
    expect(nextPlacement(COMPLETE)).toEqual({ stage: null, reason: 'complete' });
    expect([NEW, PEAR_OWNED, PEAR_RESTORED, LIGHT_OWNED, COMPLETE].map(isComplete)).toEqual([false, false, false, false, true]);
  });
});

describe('S5C checkPlacement', () => {
  it('accepts only the next owned piece on its own target', () => {
    expect(checkPlacement(PEAR_OWNED, 'golden-pear', 'golden-pear')).toMatchObject({ ok: true, stage: { pieceId: 'golden-pear' } });
    expect(checkPlacement(LIGHT_OWNED, 'sun-disc', 'sun-disc')).toMatchObject({ ok: true, stage: { pieceId: 'sun-disc' } });
    // Out of order or not owned: never accepted, whatever the input claims.
    expect(checkPlacement(PEAR_OWNED, 'sun-disc', 'sun-disc').ok).toBe(false);
    expect(checkPlacement(PEAR_RESTORED, 'sun-disc', 'sun-disc').ok).toBe(false);
    expect(checkPlacement(COMPLETE, 'sun-disc', 'sun-disc').ok).toBe(false);
    expect(checkPlacement(COMPLETE, 'golden-pear', 'golden-pear').ok).toBe(false);
  });
  it('keeps the piece on wrong drops with a clear message', () => {
    const message = (s: CampaignState, piece: string, target: string) => { const c = checkPlacement(s, piece, target); return c.ok ? null : c.message; };
    expect(message(LIGHT_OWNED, 'sun-disc', 'golden-pear')).toBe('That is not the sky’s empty sun. The light stays in your inventory.');
    expect(message(LIGHT_OWNED, 'sun-disc', '')).toBe('That is not the sky’s empty sun. The light stays in your inventory.');
    expect(message(PEAR_OWNED, 'golden-pear', 'sun-disc')).toContain('stays in inventory');
    expect(message(PEAR_OWNED, 'golden-pear', '')).toContain('stays in inventory');
    // The sky before the pear, before the light, without a selection and after completion.
    expect(message(NEW, '', 'sun-disc')).toBe('The pear comes first: restore the golden pear.');
    expect(message(PEAR_OWNED, '', 'sun-disc')).toBe('The pear comes first: restore the golden pear.');
    expect(message(PEAR_RESTORED, '', 'sun-disc')).toBe('Claim the enchanted light in the Unfinished Sketch first.');
    expect(message(LIGHT_OWNED, '', 'sun-disc')).toContain('Choose the enchanted light');
    expect(message(COMPLETE, '', 'sun-disc')).toContain('already rises');
    expect(message(NEW, '', 'golden-pear')).toBe('Recover the golden pear from Royal Supper first.');
    expect(message(LIGHT_OWNED, '', 'golden-pear')).toBe('The golden pear is already home.');
  });
});

describe('S5C restore through progression and the save', () => {
  it('light placement completes the campaign once, persists it and reloads as complete', () => {
    const { keys, store } = memoryStore(raw(LIGHT_OWNED));
    const p = new Progression(store.load().save);
    expect(place(p, store, 'sun-disc', 'golden-pear').result).toBeNull();
    expect(keys.get(SAVE_KEY)).toBe(JSON.stringify(raw(LIGHT_OWNED)));
    const { result } = place(p, store, 'sun-disc', 'sun-disc');
    expect(result).toMatchObject({ ok: true, changed: true, complete: true });
    // Persisted at once, with no completion flag: complete is derived.
    expect(JSON.parse(keys.get(SAVE_KEY)!)).toEqual(raw(COMPLETE));
    const reloaded = new Progression(memoryStore(JSON.parse(keys.get(SAVE_KEY)!)).store.load().save);
    expect(isComplete(reloaded.snapshot)).toBe(true);
    expect(nextPlacement(reloaded.snapshot).reason).toBe('complete');
  });
  it('replays and forced placements after completion change nothing', () => {
    const { keys, store } = memoryStore(raw(COMPLETE));
    const p = new Progression(store.load().save);
    const before = keys.get(SAVE_KEY);
    expect(place(p, store, 'sun-disc', 'sun-disc').result).toBeNull();
    for (const command of [
      { action: 'restore', artworkId: 'unfinished-sketch', pieceId: 'sun-disc' },
      { action: 'collect', artworkId: 'unfinished-sketch', pieceId: 'sun-disc' },
      { action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' },
    ] as const) expect(p.applyCampaignCommand(command)).toMatchObject({ ok: true, changed: false, complete: true });
    expect(p.snapshot).toEqual(COMPLETE);
    expect(keys.get(SAVE_KEY)).toBe(before);
  });
  it('the pear placement still works and does not complete the campaign', () => {
    const { keys, store } = memoryStore(raw(PEAR_OWNED));
    const p = new Progression(store.load().save);
    expect(place(p, store, 'golden-pear', 'golden-pear').result).toMatchObject({ changed: true, complete: false });
    expect(JSON.parse(keys.get(SAVE_KEY)!)).toEqual(raw(PEAR_RESTORED));
  });
  it('a corrupted save claiming the sun without the pear is repaired, not complete', () => {
    const repaired = validateSave(raw(state(['golden-pear', 'sun-disc'], ['sun-disc']))).save;
    expect(isComplete(repaired)).toBe(false);
    expect(repaired.restoredPieceIds).toEqual([]);
  });
});

describe('S5C masterpiece art', () => {
  it('picks damaged / pear-restored / complete from the restored count', () => {
    expect([0, 1, 2].map(masterpieceStageArt)).toEqual(['masterpiece.damaged', 'masterpiece.pear-restored', 'masterpiece.complete']);
  });
  it('loads the complete picture and the light in the museum, with a recorded local light cutout', () => {
    expect(museumArtIds).toEqual(expect.arrayContaining(['masterpiece.damaged', 'masterpiece.pear-restored', 'masterpiece.complete', 'restoration.pear', 'restoration.light']));
    expect(runtimeAssets['restoration.light'].path).toBe('assets/restoration/light.png');
    const manifest = JSON.parse(readFileSync('asset-sources/manifest.json', 'utf8')) as { assets: { id: string; runtimeSha256: string; creditsSpent: number; operation: string }[] };
    const light = manifest.assets.find(a => a.id === 'restoration.light')!;
    expect(light).toMatchObject({ creditsSpent: 0, operation: 'local_preparation' });
    expect(createHash('sha256').update(readFileSync('public/assets/restoration/light.png')).digest('hex')).toBe(light.runtimeSha256);
  });
});
