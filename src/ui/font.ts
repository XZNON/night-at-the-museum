/** The interface font (bundled Fredoka) for text drawn into canvases: museum plaques and Sketch letters. */
export const CANVAS_FONT = '"Fredoka Variable", "Segoe UI", sans-serif';

/** Resolves once the font can be drawn into a canvas; a canvas drawn earlier would fall back silently. */
export function uiFontReady(): Promise<void> {
  if (!document.fonts) return Promise.resolve();
  return document.fonts.load(`600 32px ${CANVAS_FONT}`).then(() => undefined, () => undefined);
}
