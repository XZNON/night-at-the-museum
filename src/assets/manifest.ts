// No generated art is present in M0–M2. Logical IDs and placeholder palettes
// are separate from layout. Prepared DreamLayer URLs can replace these later.
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

export const runtimeAssets: Record<string, { path: string; provider: 'DreamLayer' }> = {};
export const runtimeAssetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
