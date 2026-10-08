# v1 polish — UI, museum layout, restoration ambience and UI sounds (2026-10-08)

On the user's requests in the v1 polish session, before the DreamLayer jam submission. Gameplay, collision, level data, saves and save identities are unchanged.

## What changed

1. **Title screen and a clean game screen.** The game's name lives on a new title screen (the masterpiece drifting behind "The Last Curator"; Continue / New Game as a text menu). Campaign HUDs show no titles, section names or build tag; Pause and Mouse look are round icons; the objective shows for 5 s on arrival and after each restore. Dev studies keep their header and tag.
2. **Controls and inventory.** Controls are key glyphs with one verb, no panel, shown for 9 s per scene and listed on the pause menu's Controls page. The inventory is the piece's icon only; its name shows on hover/focus or for 3.5 s when newly held. The close-up's piece is the same icon.
3. **No status text.** Supper fork/candle/diner/air-jump readouts, the Sketch status bar, checkpoint labels and the campaign endpoint bar are visually hidden (kept in the DOM for screen readers and tests). Hints are fading captions, cues short lines, prompts a key glyph and verb; the Sketch's nails are icons.
4. **Pause.** Frozen game blurred behind; chunky "Paused" and a text menu; Controls and Settings pages (Volume, Low quality, Reset progress); Esc on a page goes back.
5. **Restoration screens.** Gilded close-up with pulsing targets and no labels, sparks on placement; "piece recovered" with the piece in turning rays; full-screen restored ending with rising motes; three-dot loading; reset/error in the pause style.
6. **Museum layout.** Masterpiece centred on the back wall (larger), Sketch on the left wall, Royal Supper on the right wall; spawn near the entrance so all three are in view.
7. **Restoration ambience.** The room warms per restored piece (light, spotlight and halo on the masterpiece; gold motes when complete).
8. **UI sounds.** `scripts/make-ui-audio.py` (original procedural synthesis, 0 credits): glass-bell menu steps on a pentatonic scale, select chime, reversed-bell back, singing-bowl pause, shimmer resume, toggle ticks, slider tick and a start bloom. Recorded in `asset-sources/audio-manifest.json`; no existing audio file changed.

Font: Fredoka (OFL) via `@fontsource-variable/fredoka` 5.3.0, bundled; licence in `public/assets/THIRD_PARTY_NOTICES.txt`.

## Screenshots (Chromium, 1280×720, dev server)

`title-screen`, `museum-arrival`, `museum-layout`, `supper-hud`, `sketch-hud`, `pause`, `pause-controls`, `pause-settings`, `inspection`, `placement-sparks`, `ending`, `reset-confirmation`, and `museum-glow-0/1/2` (nothing restored, pear, complete).

## Regression (2026-10-08)

- Typecheck and production build pass (the chunk-size warning predates this pass).
- Unit tests: 241/241 with `--testTimeout=30000`. Two audio tests were updated for the session-wide interface bank and one test was added for it.
- Browser (Chromium, dev 5173 and a freshly restarted production preview 4173):
  - `audio.spec.ts`: pass. Updated for the Settings page and the "Volume" label.
  - `campaign.spec.ts`: 5/5. Updated for the new layout (Royal Supper on the right wall, spawn near the entrance), the icon-only inventory, Reset progress on Settings and the "Paused" heading. One helper race was fixed: it turned before the museum took input after Return to Museum.
  - `sketch-campaign.spec.ts` (S5B): 5/5 across reruns. Real mismatches found and fixed: the Layer 3 hint caption covered a climb pin (it is back in the accepted left column), the claim helper's text, and the title text. The 960 denied-writes case then failed three times at a different Sketch bot step each time (lift transit, crossing attempts, a swing-bar reach timeout) before passing on run 4.
  - `sketch-ending.spec.ts` (S5C): 5/5. The ending line was restored to the accepted wording. The full campaign New Game → ending with real controls failed twice at the Royal Supper butter section, then passed on run 3 (butter needed 2 retries).
  - `sketch-art.spec.ts`: 5/5 on the first run.
- **Bot flakes, not regressions.** No Supper or Sketch gameplay code changed: the only gameplay-side diffs are two HUD number fields on the Sketch status and the museum layout data. The Supper butter section needed retries on a clean HEAD build too (2 retries in 2 of 3 probe runs). On unchanged code, the direct-entry probe passed 3/3 at one point and failed later; frame timing was identical between the builds (about 144 fps, no mid-route stalls). Memory pressure on the machine (Claude Code stopped background shells twice for low memory) coincided with the worst runs.
- Outputs from this pass are in `regression/` (captures converted to webp, logs per run). The accepted S5B, S5C and art-pass folders were not rewritten: the specs now accept `EVIDENCE_DIR`.

Not verified: human play of the new UI and layout by the user beyond the per-change reviews, representative-machine performance, other browsers, the itch.io iframe.
