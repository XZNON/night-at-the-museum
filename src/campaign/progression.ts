import { campaign } from './definition';
import type { PieceId } from './definition';

export interface CampaignState {
  collectedPieceIds: PieceId[];
  restoredPieceIds: PieceId[];
}

export interface CampaignCommand {
  action: 'collect' | 'restore';
  artworkId: string;
  pieceId: string;
}

type CampaignError = 'UNKNOWN_ID' | 'PIECE_ARTWORK_MISMATCH' | 'LOCKED_STAGE' | 'PIECE_NOT_OWNED';
export interface CampaignResult extends CampaignState {
  ok: boolean;
  changed: boolean;
  error: CampaignError | null;
  complete: boolean;
}

export const createCampaignState = (): CampaignState => ({ collectedPieceIds: [], restoredPieceIds: [] });

// This service is the only award/restore boundary. Loaded state is validated
// by the save boundary before it reaches this constructor.
export class Progression {
  private state: CampaignState;

  constructor(state: CampaignState = createCampaignState()) {
    this.state = { collectedPieceIds: [...state.collectedPieceIds], restoredPieceIds: [...state.restoredPieceIds] };
  }

  get snapshot(): CampaignState {
    return { collectedPieceIds: [...this.state.collectedPieceIds], restoredPieceIds: [...this.state.restoredPieceIds] };
  }

  applyCampaignCommand(command: CampaignCommand): CampaignResult {
    const result = (error: CampaignError | null = null, changed = false): CampaignResult => ({
      ...this.snapshot, ok: error === null, changed, error,
      complete: this.state.restoredPieceIds.length === campaign.stages.length,
    });
    const artwork = campaign.stages.find(stage => stage.artworkId === command.artworkId);
    const stage = campaign.stages.find(stage => stage.pieceId === command.pieceId);
    if (!artwork || !stage) return result('UNKNOWN_ID');
    if (stage.artworkId !== artwork.artworkId) return result('PIECE_ARTWORK_MISMATCH');
    const piece = stage.pieceId;
    if (this.state.restoredPieceIds.includes(piece) ||
        (command.action === 'collect' && this.state.collectedPieceIds.includes(piece))) return result();
    if (campaign.stages.indexOf(stage) !== this.state.restoredPieceIds.length) return result('LOCKED_STAGE');
    if (command.action === 'restore' && !this.state.collectedPieceIds.includes(piece)) return result('PIECE_NOT_OWNED');
    if (command.action === 'collect') this.state.collectedPieceIds.push(piece);
    else this.state.restoredPieceIds.push(piece);
    return result(null, true);
  }
}
