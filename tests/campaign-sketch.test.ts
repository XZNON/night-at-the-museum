import { describe, expect, it } from 'vitest';
import { campaign } from '../src/campaign/definition';
import { Progression } from '../src/campaign/progression';
import { SAVE_KEY, SaveStore, defaultSettings, validateSave } from '../src/campaign/save';
import { museum } from '../src/levels/museum';

// S5B: stage 2 is the Unfinished Sketch. Its piece keeps the save identity
// `sun-disc` (the enchanted light, the masterpiece's future sun).
const light = { artworkId: 'unfinished-sketch', pieceId: 'sun-disc' } as const;
const pear = { artworkId: 'royal-supper', pieceId: 'golden-pear' } as const;
const raw = (collected: string[], restored: string[]) =>
  ({ schemaVersion: 1, campaignId: 'garden-before-dawn', collectedPieceIds: collected, restoredPieceIds: restored, settings: defaultSettings() });
const memoryStore = (initial?: unknown) => {
  const keys = new Map<string, string>(initial === undefined ? [] : [[SAVE_KEY, JSON.stringify(initial)]]);
  const notices: string[] = [];
  const store = new SaveStore({ getItem: k => keys.get(k) ?? null, setItem: (k, v) => { keys.set(k, v); }, removeItem: k => { keys.delete(k); } }, t => notices.push(t));
  return { keys, notices, store };
};
/** What `main.ts` does when the campaign Sketch reports the claim. */
const claim = (p: Progression, store: SaveStore) => {
  const result = p.applyCampaignCommand({ action: 'collect', ...light });
  if (result.changed) store.write(p.snapshot, defaultSettings());
  return result;
};

describe('S5B campaign stage 2: the Unfinished Sketch', () => {
  it('renames stage 2 without touching piece, region, campaign or save identities', () => {
    expect(campaign.id).toBe('garden-before-dawn');
    expect(SAVE_KEY).toBe('last-curator.save.v1');
    expect(campaign.stages.map(s => [s.artworkId, s.sceneId, s.pieceId, s.restorationRegionId])).toEqual([
      ['royal-supper', 'royal-supper', 'golden-pear', 'pear-tree'],
      ['unfinished-sketch', 'unfinished-sketch', 'sun-disc', 'dawn-sky'],
    ]);
    expect(JSON.stringify(campaign)).not.toMatch(/mountain/i);
    // The retired artwork ID is no longer an award path.
    expect(new Progression().applyCampaignCommand({ action: 'collect', artworkId: 'sleeping-mountain', pieceId: 'sun-disc' }).error).toBe('UNKNOWN_ID');
    expect(new Progression().applyCampaignCommand({ action: 'collect', artworkId: 'unfinished-sketch', pieceId: 'golden-pear' }).error).toBe('PIECE_ARTWORK_MISMATCH');
  });

  it('pear-only save: the light stays locked and nothing is awarded or written', () => {
    for (const [collected, restored] of [[[], []], [['golden-pear'], []]] as const) {
      const { keys, store } = memoryStore(raw([...collected], [...restored]));
      const p = new Progression(store.load().save);
      const before = keys.get(SAVE_KEY);
      const result = claim(p, store);
      expect(result).toMatchObject({ ok: false, changed: false, error: 'LOCKED_STAGE', complete: false });
      expect(p.snapshot.collectedPieceIds).toEqual([...collected]);
      expect(keys.get(SAVE_KEY)).toBe(before);
    }
  });

  it('pear-restored save: the claim awards the light once and persists it; replay adds nothing', () => {
    const { keys, notices, store } = memoryStore(raw(['golden-pear'], ['golden-pear']));
    const p = new Progression(store.load().save);
    expect(claim(p, store)).toMatchObject({ ok: true, changed: true, error: null, complete: false });
    expect(JSON.parse(keys.get(SAVE_KEY)!)).toEqual(raw(['golden-pear', 'sun-disc'], ['golden-pear']));
    const written = keys.get(SAVE_KEY);
    // A replay claim ("already yours"): ok, unchanged, no write.
    expect(claim(p, store)).toMatchObject({ ok: true, changed: false, error: null });
    expect(keys.get(SAVE_KEY)).toBe(written);
    // Reload: the piece survives through validation, unrepaired.
    const reloaded = memoryStore(JSON.parse(written!));
    expect(reloaded.store.load().save).toEqual(raw(['golden-pear', 'sun-disc'], ['golden-pear']));
    expect(reloaded.notices).toEqual([]); expect(notices).toEqual([]);
  });

  it('light-owned save: loads unrepaired, claims add nothing, the pear stays restored', () => {
    const owned = raw(['golden-pear', 'sun-disc'], ['golden-pear']);
    expect(validateSave(owned)).toEqual({ save: owned, repaired: false });
    const { keys, store } = memoryStore(owned);
    const p = new Progression(store.load().save);
    const before = keys.get(SAVE_KEY);
    expect(claim(p, store)).toMatchObject({ ok: true, changed: false });
    expect(p.applyCampaignCommand({ action: 'collect', ...pear }).changed).toBe(false);
    expect(keys.get(SAVE_KEY)).toBe(before);
    expect(p.snapshot).toEqual({ collectedPieceIds: ['golden-pear', 'sun-disc'], restoredPieceIds: ['golden-pear'] });
    // Restoring the light (S5C) still goes through the same boundary.
    expect(p.applyCampaignCommand({ action: 'restore', ...light })).toMatchObject({ changed: true, complete: true });
  });

  it('hangs the Sketch frame on the left wall with a return pose in reach, facing it', () => {
    const frame = museum.artworks.find(a => a.id === 'unfinished-sketch')!;
    expect(frame).toMatchObject({ label: 'Unfinished Sketch', facing: Math.PI / 2 });
    expect(frame.x).toBeCloseTo(-museum.width / 2 + 0.18);
    expect(JSON.stringify(museum)).not.toMatch(/mountain/i);
    const pose = museum.sketchReturnPose;
    // The camera's forward vector at yaw θ is (−sin θ, −cos θ) in x/z.
    const forward = { x: -Math.sin(pose.yaw), z: -Math.cos(pose.yaw) };
    const toFrame = { x: frame.x - pose.x, z: frame.z - pose.z };
    const distance = Math.hypot(toFrame.x, toFrame.z);
    expect(distance).toBeLessThan(museum.interactionRange);
    expect((forward.x * toFrame.x + forward.z * toFrame.z) / distance).toBeCloseTo(1, 5);
    // The frame stays clear of the back-wall frames.
    expect(frame.z - frame.width / 2).toBeGreaterThan(-museum.depth / 2 + 0.5);
  });

  it('centres the masterpiece on the back wall and hangs Royal Supper on the right wall, its return pose facing it', () => {
    const masterpiece = museum.artworks.find(a => a.id === 'masterpiece')!;
    expect(masterpiece).toMatchObject({ x: 0, facing: 0 });
    expect(masterpiece.z).toBeCloseTo(-museum.depth / 2 + 0.18);
    const frame = museum.artworks.find(a => a.id === 'royal-supper')!;
    expect(frame).toMatchObject({ facing: -Math.PI / 2 });
    expect(frame.x).toBeCloseTo(museum.width / 2 - 0.18);
    const pose = museum.returnPose;
    const forward = { x: -Math.sin(pose.yaw), z: -Math.cos(pose.yaw) };
    const toFrame = { x: frame.x - pose.x, z: frame.z - pose.z };
    const distance = Math.hypot(toFrame.x, toFrame.z);
    expect(distance).toBeLessThan(museum.interactionRange);
    expect((forward.x * toFrame.x + forward.z * toFrame.z) / distance).toBeCloseTo(1, 5);
  });
});
