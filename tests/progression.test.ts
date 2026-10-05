import { describe, expect, it } from 'vitest';
import { Progression } from '../src/campaign/progression';

const pear = { artworkId: 'royal-supper', pieceId: 'golden-pear' };
const sun = { artworkId: 'sleeping-mountain', pieceId: 'sun-disc' };

describe('shared campaign commands', () => {
  it('awards a piece once, keeps it awarded after restoration, and derives completion from stage count', () => {
    const p = new Progression();
    expect(p.applyCampaignCommand({ action: 'collect', ...pear }).changed).toBe(true);
    expect(p.applyCampaignCommand({ action: 'collect', ...pear }).changed).toBe(false);
    expect(p.snapshot.collectedPieceIds).toEqual(['golden-pear']);
    expect(p.applyCampaignCommand({ action: 'restore', ...pear }).complete).toBe(false);
    expect(p.applyCampaignCommand({ action: 'collect', ...pear }).changed).toBe(false);
    expect(p.applyCampaignCommand({ action: 'collect', ...sun }).changed).toBe(true);
    expect(p.applyCampaignCommand({ action: 'restore', ...sun }).complete).toBe(true);
    expect(p.applyCampaignCommand({ action: 'restore', ...sun }).changed).toBe(false);
  });
  it('rejects invalid IDs, mismatches, locked stages and unowned restoration without changing state', () => {
    const p = new Progression();
    expect(p.applyCampaignCommand({ action: 'collect', ...sun }).error).toBe('LOCKED_STAGE');
    expect(p.applyCampaignCommand({ action: 'restore', ...pear }).error).toBe('PIECE_NOT_OWNED');
    expect(p.applyCampaignCommand({ action: 'collect', artworkId: 'missing', pieceId: 'golden-pear' }).error).toBe('UNKNOWN_ID');
    expect(p.applyCampaignCommand({ action: 'collect', artworkId: 'royal-supper', pieceId: 'sun-disc' }).error).toBe('PIECE_ARTWORK_MISMATCH');
    expect(p.snapshot).toEqual({ collectedPieceIds: [], restoredPieceIds: [] });
  });
  it('returns copies so callers cannot mutate inventory through a result', () => {
    const p = new Progression(); const result = p.applyCampaignCommand({ action: 'collect', ...pear });
    result.collectedPieceIds.length = 0; expect(p.snapshot.collectedPieceIds).toEqual(['golden-pear']);
  });
});
