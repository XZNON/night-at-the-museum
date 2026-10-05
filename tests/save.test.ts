import { describe, expect, it } from 'vitest';
import { SAVE_KEY, SaveStore, defaultSettings, validateSave } from '../src/campaign/save';
import { campaign } from '../src/campaign/definition';
import { Progression } from '../src/campaign/progression';

const save = (collected: string[] = [], restored: string[] = []) => ({ schemaVersion: 1, campaignId: campaign.id, collectedPieceIds: collected, restoredPieceIds: restored, settings: defaultSettings() });
describe('validated campaign saves', () => {
  it('round-trips collection and restoration boundaries without trusting redundant completion flags', () => {
    for (const restored of [[], ['golden-pear']]) {
      const raw = save(['golden-pear'], restored);
      expect(validateSave(raw)).toEqual({ save: raw, repaired: false });
      const p = new Progression(validateSave(raw).save);
      expect(p.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' }).changed).toBe(false);
      expect(p.snapshot.restoredPieceIds).toEqual(restored);
    }
    const raw = { ...save(['golden-pear'], ['golden-pear']), complete: true, unlocked: ['everything'] };
    const p = new Progression(validateSave(raw).save);
    expect(p.applyCampaignCommand({ action: 'restore', artworkId: 'royal-supper', pieceId: 'golden-pear' }).complete).toBe(false);
    expect(validateSave({ settings: { quality: 'normal', masterVolume: 0.7 }, restoredPieceIds: [], collectedPieceIds: [], campaignId: campaign.id, schemaVersion: 1 }).repaired).toBe(false);
  });
  it('recovers the longest owned prefix, strips unknown and duplicate IDs, and rejects future collection', () => {
    expect(validateSave(save(['golden-pear', 'golden-pear', 'unknown', 'sun-disc'], ['sun-disc'])).save).toEqual(save(['golden-pear']));
    expect(validateSave(save(['golden-pear', 'sun-disc'], ['sun-disc', 'golden-pear'])).save).toEqual(save(['golden-pear', 'sun-disc'], ['golden-pear', 'sun-disc']));
    expect(validateSave(save(['sun-disc'], ['golden-pear', 'sun-disc'])).save).toEqual(save());
    expect(validateSave(save(['golden-pear'], ['golden-pear', 'unknown'])).save).toEqual(save(['golden-pear'], ['golden-pear']));
  });
  it('recovers malformed/incompatible data and clamps settings', () => {
    for (const raw of [null, [], 'bad', { ...save(), schemaVersion: 2 }, { ...save(), campaignId: 'other' }, { ...save(), collectedPieceIds: {} }]) expect(validateSave(raw)).toEqual({ save: save(), repaired: true });
    expect(validateSave({ ...save(), settings: { quality: 'low', masterVolume: 8 } }).save.settings).toEqual({ quality: 'low', masterVolume: 1 });
    expect(validateSave({ ...save(), settings: { quality: 'ultra', masterVolume: NaN } }).save.settings).toEqual(defaultSettings());
  });
  it('preserves in-memory commands when reads/writes/reset fail, and only resets this game key', () => {
    const messages: string[] = [];
    const denied = new SaveStore({ getItem() { throw Error('denied'); }, setItem() { throw Error('full'); }, removeItem() { throw Error('denied'); } }, text => messages.push(text));
    const p = new Progression(denied.load().save);
    p.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'golden-pear' });
    denied.write(p.snapshot, defaultSettings()); denied.reset();
    expect(p.snapshot.collectedPieceIds).toEqual(['golden-pear']); expect(messages).toHaveLength(3);
    const keys = new Map([[SAVE_KEY, JSON.stringify(save(['golden-pear']))], ['other-game', 'keep']]);
    const store = new SaveStore({ getItem: key => keys.get(key) ?? null, setItem: (key, value) => { keys.set(key, value); }, removeItem: key => { keys.delete(key); } }, () => {});
    expect(store.load().save.collectedPieceIds).toEqual(['golden-pear']); store.reset();
    expect([...keys]).toEqual([['other-game', 'keep']]);
  });
});
