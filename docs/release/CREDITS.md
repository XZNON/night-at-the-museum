# Credits and licences (v1)

## The game

Night at the Museum — design, code and art direction by XZNON
([GitHub](https://github.com/XZNON),
[LinkedIn](https://www.linkedin.com/in/shivalik-solanki-2ab233207)).
Made for the DreamLayer jam.

## Bundled in the build

| Component | Version | Licence | Notice in the build |
| --- | --- | --- | --- |
| Three.js | 0.186.1 | MIT | `assets/THIRD_PARTY_NOTICES.txt` |
| Howler.js | 2.2.4 | MIT | `assets/THIRD_PARTY_NOTICES.txt` |
| Fredoka (variable), via @fontsource-variable/fredoka | 5.3.0 | SIL Open Font License 1.1 | `assets/THIRD_PARTY_NOTICES.txt` |

## Art and audio

- **Illustrations**: generated with DreamLayer and prepared locally; see
  `DREAMLAYER_PROCESS.md` and `assets/ART_PROVENANCE.txt` in the build.
- **Favicon**: original, drawn in code (`scripts/make-favicon.py`).
- **Music and sound**: original procedural synthesis, no samples; see
  `assets/audio/NOTICE.txt` in the build.

## Tools (not shipped)

TypeScript, Vite, Vitest and Playwright for building and testing; Python with
Pillow and NumPy for the art and audio preparation scripts; Node scripts for
the DreamLayer API calls.
