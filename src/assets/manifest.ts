// Prepared art uses logical IDs independently of collision/layout.
// ImageGen props are the user-authorized M3 exception to DreamLayer sourcing.
// cohesion-v1 is selective offline preparation; original M3 textures remain.
export const placeholderArt = {
  basket: { color: 0x9f613d, accent: 0xd79b58 },
  bread: { color: 0xcb8a47, accent: 0xffcf86 },
  plate: { color: 0xd7d5c6, accent: 0xb18a51 },
  goblet: { color: 0x759196, accent: 0xa8c8c4 },
  candle: { color: 0xe6c49b, accent: 0xffe2ae },
  bridge: { color: 0xbfc6cb, accent: 0xffe0a6 },
  ceiling: { color: 0x6a4540, accent: 0xc39862 },
  bound: { color: 0x000000, accent: 0x000000 },
  butter: { color: 0xe7bb38, accent: 0xffeb76 },
  crumb: { color: 0x925a2d, accent: 0xdca966 },
  jelly: { color: 0xa34796, accent: 0xf793dc },
} as const;

export const runtimeAssets = {
  'player.idle': { path: 'assets/player/idle.png', provider: 'DreamLayer' },
  'player.walk-a': { path: 'assets/player/walk-a.png', provider: 'DreamLayer' },
  'player.walk-b': { path: 'assets/player/walk-b.png', provider: 'DreamLayer' },
  'player.jump': { path: 'assets/player/jump.png', provider: 'DreamLayer' },
  'royal-supper.background': { path: 'assets/supper/background.webp', provider: 'DreamLayer' },
  'royal-supper.bread': { path: 'assets/supper/cohesion-v1/bread.png', provider: 'DreamLayer' },
  'royal-supper.entrance': { path: 'assets/supper/entrance.webp', provider: 'DreamLayer' },
  'royal-supper.basket': { path: 'assets/supper/cohesion-v1/basket.png', provider: 'OpenAI ImageGen' },
  'royal-supper.butter': { path: 'assets/supper/props/butter.png', provider: 'OpenAI ImageGen' },
  'royal-supper.crumb': { path: 'assets/supper/cohesion-v1/crumb.png', provider: 'OpenAI ImageGen' },
  'royal-supper.grape': { path: 'assets/supper/props/grape.png', provider: 'OpenAI ImageGen' },
  'royal-supper.jelly': { path: 'assets/supper/props/jelly.png', provider: 'OpenAI ImageGen' },
  'royal-supper.cake': { path: 'assets/supper/cohesion-v1/cake.png', provider: 'OpenAI ImageGen' },
  'royal-supper.plate': { path: 'assets/supper/props/plate.png', provider: 'OpenAI ImageGen' },
  'royal-supper.goblet': { path: 'assets/supper/props/goblet.png', provider: 'OpenAI ImageGen' },
  'royal-supper.cover': { path: 'assets/supper/props/cover.png', provider: 'OpenAI ImageGen' },
  'royal-supper.wax': { path: 'assets/supper/props/wax.png', provider: 'OpenAI ImageGen' },
  'royal-supper.fork': { path: 'assets/supper/props/fork.png', provider: 'OpenAI ImageGen' },
  'royal-supper.fan': { path: 'assets/supper/props/fan.png', provider: 'OpenAI ImageGen' },
  'royal-supper.holder': { path: 'assets/supper/props/holder.png', provider: 'OpenAI ImageGen' },
  'royal-supper.diner': { path: 'assets/supper/props/diner.png', provider: 'OpenAI ImageGen' },
  'restoration.pear': { path: 'assets/restoration/pear.png', provider: 'DreamLayer' },
  // S5C: the enchanted light, cut locally from the complete picture's sun.
  'restoration.light': { path: 'assets/restoration/light.png', provider: 'DreamLayer' },
  'masterpiece.damaged': { path: 'assets/restoration/damaged.webp', provider: 'DreamLayer' },
  'masterpiece.pear-restored': { path: 'assets/restoration/pear-restored.webp', provider: 'DreamLayer' },
  'masterpiece.complete': { path: 'assets/restoration/complete.webp', provider: 'DreamLayer' },
  // Sketch skins: local cutouts of the approved DreamLayer references.
  'sketch.plank': { path: 'assets/sketch/plank.png', provider: 'DreamLayer' },
  'sketch.board': { path: 'assets/sketch/board.png', provider: 'DreamLayer' },
  'sketch.ruler': { path: 'assets/sketch/ruler.png', provider: 'DreamLayer' },
  'sketch.ground-top': { path: 'assets/sketch/ground-top.png', provider: 'DreamLayer' },
  'sketch.axe-head': { path: 'assets/sketch/axe-head.png', provider: 'DreamLayer' },
  'sketch.axe-handle': { path: 'assets/sketch/axe-handle.png', provider: 'DreamLayer' },
  'sketch.axe-bolt': { path: 'assets/sketch/axe-bolt.png', provider: 'DreamLayer' },
  'sketch.lift-deck': { path: 'assets/sketch/lift-deck.png', provider: 'DreamLayer' },
  'sketch.lift-piston': { path: 'assets/sketch/lift-piston.png', provider: 'DreamLayer' },
  'sketch.lift-pump': { path: 'assets/sketch/lift-pump.png', provider: 'DreamLayer' },
  'sketch.yardstick': { path: 'assets/sketch/yardstick.png', provider: 'DreamLayer' },
  'sketch.dowel': { path: 'assets/sketch/dowel.png', provider: 'DreamLayer' },
  'sketch.trolley': { path: 'assets/sketch/trolley.png', provider: 'DreamLayer' },
  'sketch.rail': { path: 'assets/sketch/rail.png', provider: 'DreamLayer' },
  'sketch.glue-top': { path: 'assets/sketch/glue-top.png', provider: 'DreamLayer' },
  'sketch.glue-bottle': { path: 'assets/sketch/glue-bottle.png', provider: 'DreamLayer' },
  'sketch.nail-head': { path: 'assets/sketch/nail-head.png', provider: 'DreamLayer' },
  'sketch.nail-cap': { path: 'assets/sketch/nail-cap.png', provider: 'DreamLayer' },
  'sketch.nail-shaft': { path: 'assets/sketch/nail-shaft.png', provider: 'DreamLayer' },
  'sketch.nail-side': { path: 'assets/sketch/nail-side.png', provider: 'DreamLayer' },
  'sketch.nail-pickup': { path: 'assets/sketch/nail-pickup.png', provider: 'DreamLayer' },
  'sketch.decor-tin': { path: 'assets/sketch/decor-tin.png', provider: 'DreamLayer' },
  'sketch.decor-pencil': { path: 'assets/sketch/decor-pencil.png', provider: 'DreamLayer' },
  'sketch.decor-screwdriver': { path: 'assets/sketch/decor-screwdriver.png', provider: 'DreamLayer' },
  'sketch.decor-spanner': { path: 'assets/sketch/decor-spanner.png', provider: 'DreamLayer' },
  'sketch.decor-tape': { path: 'assets/sketch/decor-tape.png', provider: 'DreamLayer' },
  'sketch.decor-screws': { path: 'assets/sketch/decor-screws.png', provider: 'DreamLayer' },
  // Art pass part 2: inside the open toolbox, the torch and the museum painting.
  'sketch.toolbox': { path: 'assets/sketch/toolbox.webp', provider: 'DreamLayer' },
  'sketch.torch': { path: 'assets/sketch/torch.png', provider: 'DreamLayer' },
  'sketch.entrance': { path: 'assets/sketch/entrance.webp', provider: 'DreamLayer' },
  'sketch.entrance-empty': { path: 'assets/sketch/entrance-empty.webp', provider: 'DreamLayer' },
} as const;
export type ArtId = keyof typeof runtimeAssets;
export const supperArtIds = Object.keys(runtimeAssets).filter(id => id.startsWith('player.') ||
  (id.startsWith('royal-supper.') && id !== 'royal-supper.entrance') || id === 'restoration.pear') as ArtId[];
export const museumArtIds: ArtId[] = ['royal-supper.entrance', 'masterpiece.damaged', 'masterpiece.pear-restored', 'masterpiece.complete',
  'restoration.pear', 'restoration.light', 'sketch.entrance', 'sketch.entrance-empty'];
export const sketchArtIds = Object.keys(runtimeAssets).filter(id => id.startsWith('player.') ||
  (id.startsWith('sketch.') && !id.startsWith('sketch.entrance'))) as ArtId[];
export const runtimeAssetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
