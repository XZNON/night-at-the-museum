import { campaign, type PieceId } from './definition';
import { createCampaignState, type CampaignState } from './progression';

export const SAVE_KEY = 'last-curator.save.v1';
export interface Settings { masterVolume: number; quality: 'normal' | 'low' }
export interface SaveV1 extends CampaignState { schemaVersion: 1; campaignId: string; settings: Settings }
export const defaultSettings = (): Settings => ({ masterVolume: 0.7, quality: 'normal' });
const emptySave = (): SaveV1 => ({ schemaVersion: 1, campaignId: campaign.id, ...createCampaignState(), settings: defaultSettings() });

export function validateSave(value: unknown): { save: SaveV1; repaired: boolean } {
  const fallback = () => ({ save: emptySave(), repaired: true });
  if (!value || typeof value !== 'object') return fallback();
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1 || raw.campaignId !== campaign.id ||
      !Array.isArray(raw.collectedPieceIds) || !Array.isArray(raw.restoredPieceIds)) return fallback();
  const collected: PieceId[] = []; const restored: PieceId[] = [];
  for (const stage of campaign.stages) {
    if (raw.collectedPieceIds.includes(stage.pieceId)) collected.push(stage.pieceId);
    if (raw.restoredPieceIds.includes(stage.pieceId) && collected.includes(stage.pieceId) &&
        restored.length === campaign.stages.indexOf(stage)) restored.push(stage.pieceId);
  }
  // Keep only pieces eligible at the recovered prefix; corrupted future awards
  // cannot bypass the actual next adventure.
  const eligible = collected.filter(id => campaign.stages.findIndex(s => s.pieceId === id) <= restored.length);
  const settings = defaultSettings();
  if (raw.settings && typeof raw.settings === 'object') {
    const source = raw.settings as Record<string, unknown>;
    if (typeof source.masterVolume === 'number' && Number.isFinite(source.masterVolume)) settings.masterVolume = Math.max(0, Math.min(1, source.masterVolume));
    if (source.quality === 'low' || source.quality === 'normal') settings.quality = source.quality;
  }
  const save: SaveV1 = { schemaVersion: 1, campaignId: campaign.id, collectedPieceIds: eligible, restoredPieceIds: restored, settings };
  const sourceSettings = raw.settings as Record<string, unknown> | null | undefined;
  const repaired = JSON.stringify(raw.collectedPieceIds) !== JSON.stringify(eligible) ||
    JSON.stringify(raw.restoredPieceIds) !== JSON.stringify(restored) ||
    !sourceSettings || sourceSettings.masterVolume !== settings.masterVolume || sourceSettings.quality !== settings.quality ||
    Object.keys(sourceSettings).some(key => key !== 'masterVolume' && key !== 'quality') ||
    Object.keys(raw).some(key => !['schemaVersion', 'campaignId', 'collectedPieceIds', 'restoredPieceIds', 'settings'].includes(key));
  return { save, repaired: Boolean(repaired) };
}

export class SaveStore {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, private readonly notice: (text: string) => void) {}
  load(): { save: SaveV1; exists: boolean } {
    try {
      const text = this.storage.getItem(SAVE_KEY);
      if (text === null) return { save: emptySave(), exists: false };
      let value: unknown;
      try { value = JSON.parse(text); } catch { value = null; }
      const result = validateSave(value);
      if (result.repaired) this.notice('Stored progress was invalid or incompatible. Safe progress has been recovered.');
      return { save: result.save, exists: true };
    } catch { this.notice('Storage is unavailable. You can play, but progress will not persist.'); return { save: emptySave(), exists: false }; }
  }
  write(state: CampaignState, settings: Settings): void {
    try { this.storage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, campaignId: campaign.id, ...state, settings })); }
    catch { this.notice('Progress remains in memory. Storage failed; it will not persist after reload.'); }
  }
  reset(): void {
    try { this.storage.removeItem(SAVE_KEY); }
    catch { this.notice('Progress reset in memory. Storage failed; the old save may return after reload.'); }
  }
}
