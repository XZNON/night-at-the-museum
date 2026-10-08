import { runtimeAssets, runtimeAssetUrl, type ArtId } from '../assets/manifest';

/** The masterpiece's picture for a restored-piece count: damaged, pear restored, complete. */
export function masterpieceStageArt(restoredCount: number): ArtId {
  return restoredCount >= 2 ? 'masterpiece.complete' : restoredCount === 1 ? 'masterpiece.pear-restored' : 'masterpiece.damaged';
}
export function masterpieceImage(restoredCount: number): string {
  return runtimeAssetUrl(runtimeAssets[masterpieceStageArt(restoredCount)].path);
}
