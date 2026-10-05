export type ArtworkId = 'royal-supper' | 'sleeping-mountain';
export type PieceId = 'golden-pear' | 'sun-disc';

export interface CampaignStage {
  artworkId: ArtworkId;
  pieceId: PieceId;
  sceneId: ArtworkId;
  restorationRegionId: string;
  clue: string;
}

// Stage order describes the agreed campaign. Only implemented scenes are registered
// by the app; this definition never creates an enterable mountain door.
export const campaign = {
  id: 'garden-before-dawn',
  stages: [
    { artworkId: 'royal-supper', pieceId: 'golden-pear', sceneId: 'royal-supper',
      restorationRegionId: 'pear-tree', clue: 'The king has borrowed the golden pear.' },
    { artworkId: 'sleeping-mountain', pieceId: 'sun-disc', sceneId: 'sleeping-mountain',
      restorationRegionId: 'dawn-sky', clue: 'Wake the sun above the mountain.' },
  ] satisfies CampaignStage[],
};
