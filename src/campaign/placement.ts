import { campaign, type CampaignStage, type PieceId } from './definition';
import type { CampaignState } from './progression';

/** The stage whose piece is placed next, or why nothing can be placed yet. */
export type NextPlacement =
  | { stage: CampaignStage; reason: null }
  | { stage: CampaignStage; reason: 'not-owned' }
  | { stage: null; reason: 'complete' };

export type PlacementCheck = { ok: true; stage: CampaignStage } | { ok: false; message: string };

export const isComplete = (state: CampaignState): boolean => state.restoredPieceIds.length === campaign.stages.length;

export function nextPlacement(state: CampaignState): NextPlacement {
  const stage = campaign.stages[state.restoredPieceIds.length];
  if (!stage) return { stage: null, reason: 'complete' };
  return state.collectedPieceIds.includes(stage.pieceId) ? { stage, reason: null } : { stage, reason: 'not-owned' };
}

/**
 * Validates one placement in the masterpiece (S5C, generalised from the pear):
 * only the next stage's owned piece on its own target may restore. Every other
 * combination keeps the piece and answers with a player-facing message. The
 * restore itself still goes through `Progression.applyCampaignCommand`.
 */
export function checkPlacement(state: CampaignState, piece: string, target: string): PlacementCheck {
  const next = nextPlacement(state);
  if (next.reason === null && piece === next.stage.pieceId) {
    if (target === piece) return { ok: true, stage: next.stage };
    return { ok: false, message: piece === 'sun-disc'
      ? 'That is not the sky’s empty sun. The light stays in your inventory.'
      : 'That is not the pear silhouette. Your piece stays in inventory.' };
  }
  const restored = (id: PieceId) => state.restoredPieceIds.includes(id);
  const owned = (id: PieceId) => state.collectedPieceIds.includes(id);
  if (target === 'sun-disc') {
    if (restored('sun-disc')) return { ok: false, message: 'The sun already rises over this garden.' };
    if (!restored('golden-pear')) return { ok: false, message: 'The pear comes first: restore the golden pear.' };
    if (!owned('sun-disc')) return { ok: false, message: 'Claim the enchanted light in the Unfinished Sketch first.' };
    return { ok: false, message: 'Choose the enchanted light, then the dark sky. The light stays in your inventory.' };
  }
  if (target === 'golden-pear') {
    if (restored('golden-pear')) return { ok: false, message: 'The golden pear is already home.' };
    if (!owned('golden-pear')) return { ok: false, message: 'Recover the golden pear from Royal Supper first.' };
    return { ok: false, message: 'Choose the golden pear and its matching silhouette. Your piece stays in inventory.' };
  }
  return { ok: false, message: next.reason === null
    ? 'Choose a piece from your inventory, then its place in the painting.'
    : 'Nothing in your inventory belongs there.' };
}
