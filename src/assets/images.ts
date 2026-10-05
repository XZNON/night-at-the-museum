import { runtimeAssets, runtimeAssetUrl, type ArtId } from './manifest';
const images = new Map<ArtId, Promise<HTMLImageElement>>();
export function loadArt(id: ArtId): Promise<HTMLImageElement> {
  let pending = images.get(id);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { images.delete(id); reject(new Error(`Required artwork failed to load: ${id}. Retry to reload it.`)); };
      image.src = runtimeAssetUrl(runtimeAssets[id].path);
    });
    images.set(id, pending);
  }
  return pending;
}
export async function loadArtSet(ids: readonly ArtId[]): Promise<Partial<Record<ArtId, HTMLImageElement>>> {
  return Object.fromEntries(await Promise.all(ids.map(async id => [id, await loadArt(id)])));
}
