export type ArtworkId = 'royal-supper' | 'unfinished-sketch';
export type PieceId = 'golden-pear' | 'sun-disc';

export interface CampaignStage {
  artworkId: ArtworkId;
  pieceId: PieceId;
  sceneId: ArtworkId;
  restorationRegionId: string;
  clue: string;
}

// Stage order describes the agreed campaign. Piece, region and save identities
// are stable: stage 2's piece keeps the ID `sun-disc` although players know it
// as the enchanted light, which becomes the masterpiece's sun (S5B, 2026-10-07).
export const campaign = {
  id: 'garden-before-dawn',
  stages: [
    { artworkId: 'royal-supper', pieceId: 'golden-pear', sceneId: 'royal-supper',
      restorationRegionId: 'pear-tree', clue: 'The king has borrowed the golden pear.' },
    { artworkId: 'unfinished-sketch', pieceId: 'sun-disc', sceneId: 'unfinished-sketch',
      restorationRegionId: 'dawn-sky', clue: 'Climb the Unfinished Sketch and claim its enchanted light.' },
  ] satisfies CampaignStage[],
};
