# UI leftovers: old-style screens brought to the v1 look (2026-10-09)

On the user's request ("see if any pause scene or minigame end screen or any screens are still on the old versions and update them"). Gameplay, collision, level data, saves and save IDs are unchanged; button labels and the DOM text the tests read are unchanged.

## Audit

Campaign screens already on the v1 look and left as they are: title, pause (main/Controls/Settings), piece recovered (pear and light), masterpiece close-up, ending, reset confirmation, error, loading.

Still on the old look, now updated:

| Where | Old | Now |
| --- | --- | --- |
| Museum plaques (campaign) | Flat dark strip, Georgia + generic sans, the masterpiece's text stretched 1.6× | Brass plate with a bevel and two screws, engraved Fredoka lettering, narrower than the frame, canvas sized to the plate |
| Save/sound notice (campaign) | Square box with a thin border, 12 px | Rounded dark line with a gold diamond, 15 px, fades after 8 s (text stays in the DOM) |
| Sketch Layer 3 wall letters (campaign) | Generic bold sans | Fredoka |
| Dev study menus, Royal Supper and all nine Sketch studies (dev server only) | Centred card, Georgia title, gold bar button | Title screen look over the study's painting: kicker, two-tone title, short lines, text menu, key glyphs, small note |
| Royal Supper study finish, "A path restored." (dev only) | Centred card ("Blockout complete") | Same title look ("Royal Supper · study complete") |
| Dev study header (dev only) | Georgia title at the top centre, overlapping the hint caption and the pause icon | Visually hidden like the other readouts; the build tag names the study |
| Sketch study endpoint line (dev only) | Green bar | Caption with a gold diamond |

Dead CSS for the old card (menu card, serif headings, gold bar buttons, small notes, unused route track) is removed. No serif face remains in the UI or the canvases.

## Screenshots (Chromium, dev server)

- Before: `before-supper-study-hud`, `before-sketch-study-hud`, `before-save-notice`, `before-masterpiece-plaque`.
- After: `after-supper-study-hud`, `after-sketch-study-hud`, `after-supper-study-menu` (+ `-960`), `after-sketch-study-menu`, `after-sketch-walls-menu-960` (description hidden at low height), `after-save-notice`, `after-save-notice-faded`, `after-masterpiece-plaque`, `after-sketch-plaque`, `after-sketch-wall-letters`.

The Supper study's finish screen was not captured; `blockout.spec.ts` drives through it.

## Regression (2026-10-09)

- Typecheck and production build pass (the chunk-size warning predates this pass); preview restarted after the build.
- Unit tests: 244/244 with `--testTimeout=30000`; `unit-measurements.json` unchanged.
- Browser (Chromium, dev 5173 and production preview 4173), all on the first run: `audio.spec.ts` 1/1; `blockout.spec.ts` 1/1 (drives the Supper study through "Finish blockout" and the new finish screen; its route bot took one butter retry inside the test); `campaign.spec.ts` 6/6 (includes the malformed/denied-storage notices); `sketch-campaign.spec.ts` 5/5; `sketch-ending.spec.ts` 5/5 (includes the full New Game → ending campaign with real controls); `art.spec.ts` 1/1.
- The first batch ran `sketch-campaign.spec.ts` without `EVIDENCE_DIR` (the `campaign.spec.ts` filter also matched it) and rewrote the accepted S5B captures; they were restored from git at once. The S5C run wrote to a scratch folder.

Not verified: the user's look at the new plaques/notice/study menus, other browsers, representative-machine performance.
