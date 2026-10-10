# itch.io page and jam submission text (v1)

Paste-ready text for the game page and the DreamLayer jam form. The play time
is the developer's own run (about 15 minutes, 2026-10-10); add anything the jam
form asks that is not covered here.

## Project settings

| Field | Value |
| --- | --- |
| Title | Night at the Museum (user, 2026-10-10) |
| Project URL | suggestion: `night-at-the-museum` (itch may append your username's page; any free slug works) |
| Short description / tagline | Step into a museum's paintings at night and bring a masterpiece's lost pieces home. |
| Classification | Games |
| Kind of project | HTML |
| Release status | Released |
| Pricing | No payments (or Free) |
| Upload | `night-at-the-museum-v1.zip` (see `release/` next to the repository root, not committed); tick **This file will be played in the browser** |
| Genre | Platformer |
| Tags | platformer, 2.5d, cartoon, museum, puzzle-platformer, short, singleplayer, three-js, ai-generated-art (if the jam asks for it) |
| Input | Keyboard, Mouse |
| Platforms | HTML5 (desktop browsers) |

**Embed options**

- Embed in page, **viewport 1280 × 720** (the game is laid out and tested at 1280 × 720 and 960 × 540; 960 × 540 also works if you prefer a smaller frame).
- **Fullscreen button: on.** Mobile friendly: off. Automatically start on page load: off (the player clicks Run game). Enable scrollbars: off. SharedArrayBuffer support: off.
- Cover image: **`docs/release/cover/cover-b.png`** (the user's pick, 2026-10-10: the curator leaping into the Royal Supper painting; `cover-b@2x.png` is 1260 × 1000). Other candidates A–F are kept in the same folder (630 × 500; `@2x` versions are 1260 × 1000). Screenshots: 3–5 of your own (you are taking them).

## Page text

**Night at the Museum**

*The museum is closed for the night, and its masterpiece, The Garden Before Dawn, has lost its pieces to the other paintings. Step into the frames, bring the pieces home and paint the dawn back in.*

You are the museum's curator. Walk the gallery in first person, inspect the damaged masterpiece, then step inside the paintings around it: each one is a short side-view adventure hiding a missing piece.

**Royal Supper** — The king has borrowed the golden pear for dessert. Sneak along the feast table: slide on butter, hop the rolling grapes, topple a fork into a bridge, time your jumps across the candles before their flames relight, hide under casserole covers while the giant diner looks your way, and bounce on jellies up to the pear.

**The Unfinished Sketch** — A toolbox world in three stacked layers. You carry two nails: drive one into a swinging board to freeze it into a platform, recall the oldest to use it again, slip past swinging axes, ride the hydraulic lifts, kick up criss-cross walls with a third nail and swing on your nails over the glue to the enchanted light waiting in a torch.

Carry each piece back and place it in the masterpiece to bring its colour back. Restore both, and the garden sees its sun.

- About 15 minutes to finish. Progress saves automatically in your browser.
- Desktop browser with keyboard and mouse. Click inside the game first so it receives your keys; clicking outside pauses it.

**Controls**

| Where | Keys |
| --- | --- |
| Museum | **W A S D** walk · **drag** to look (mouse look from the top-right button) · **E** or **click** use a frame · **Esc** pause |
| Royal Supper | **A D** move · **Space** jump, press again in the air for a second jump · **E** use · **R** back to checkpoint · **Esc** pause |
| Unfinished Sketch | **A D** move, pump a swing · **Space** jump, kick off a wall, let go · **click** drive a nail · **Q** recall the oldest nail · **E** grab a nail · **R** retry · **Esc** pause |
| Masterpiece | **drag** a piece onto its place, or click the piece then its place; **Tab / Enter** work too |

The pause menu lists the controls for the current scene and has volume and quality settings.

**Made with DreamLayer** — Every illustrated image in the game started as a DreamLayer generation: the masterpiece and its restoration states, the curator, the Royal Supper banquet and its giant diner, the toolbox world of the Unfinished Sketch and the paintings on the museum walls. Each was cut out and fitted locally into a Three.js scene whose collision and timing are authored in code. Music and sound are original procedural synthesis. Details: see the process note below.

**Credits** — Design, code and art direction: XZNON ([GitHub](https://github.com/XZNON) · [LinkedIn](https://www.linkedin.com/in/shivalik-solanki-2ab233207)). Built with Three.js, Howler.js and the Fredoka font (SIL OFL 1.1). Art generated with DreamLayer.

## Jam form: how DreamLayer was used (short answer)

DreamLayer produced every illustrated asset in the shipped game: 59 DreamLayer operations (28 text-to-image, 21 image-to-image, 4 edits, 4 background removals, 2 cutouts) for 56 credits of the 100 allocated, plus 6 more for this page's cover art. I generated reference sheets per world (the masterpiece, the curator, the Royal Supper banquet, the Unfinished Sketch toolbox), approved them, then cut them locally into 81 runtime images: sprites, platform skins, backdrops and the masterpiece's damaged, half-restored and complete states, all registered to the same painting so restoration lines up. Gameplay never depends on generated pixels: collision, hazards and timings are authored in code and the art is fitted to them. The full record (prompts, request IDs, hashes, credits per asset) is in the repository's `asset-sources/manifest.json`; see `docs/release/DREAMLAYER_PROCESS.md`.
