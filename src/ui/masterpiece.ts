import { runtimeAssets, runtimeAssetUrl } from '../assets/manifest';
export function masterpieceImage(restored: boolean): string {
  return runtimeAssetUrl(runtimeAssets[restored ? 'masterpiece.pear-restored' : 'masterpiece.damaged'].path);
}
