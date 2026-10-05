# The Last Curator — Mini-game ideas

This file preserves the idea discussion. See DECISIONS.md for current choices: Royal Supper is first, Sleeping Mountain is second, and Drowned Garden is an optional third. The other concepts are reserves. Earlier artifact examples below are not current campaign assignments.

## Core game and jam scope

Explore a museum containing one damaged masterpiece. Its missing pieces are hidden or held inside other artworks. Enter those artworks, complete their challenges, retrieve the pieces, and return them to the masterpiece. Restoring the masterpiece completes the jam game.

- Target: a browser game using Three.js with a 3D museum and 2.5D artwork worlds.
- Build a complete playable version in 2–3 days, then polish.
- Scope: one masterpiece; two committed mini artworks and a gated optional third, as defined in DECISIONS.md.
- Build one complete loop first: museum → artwork → challenge → retrieve piece → museum → restore piece.
- DreamLayer creates the paintings, illustrated environments, props, artifacts, and damaged/restored artwork states. Gameplay layouts and interactions are authored to match the art.
- More artworks and masterpieces can be added after the jam.

The artifact choices below are provisional examples, not final decisions.

## 1. The Painted Siege

**Setting:** A war painting. An army has taken possession of a missing piece, potentially a golden sun mounted on its battle standard.

**Challenge:** Enter the painting and defeat the army to reclaim the piece.

**Proposed jam implementation:** A small arena where the player dodges volleys and redirects cannon fire into three enemy formations. Banners, sound, and reactions convey the scale of a battle without requiring many independently simulated soldiers.

**Reward:** Reclaim the artifact from the battle standard and return it to the masterpiece.

## 2. The Sleeping Mountain

**Setting:** A landscape painting. A missing piece, potentially a silver moon, rests at a mountain summit or at the far end of the landscape.

**Challenge:** Explore the terrain and solve traversal puzzles to reach the piece.

**Proposed jam implementation:** A compact route with wind currents to activate and stone bridges to move. The player discovers how these mechanisms connect the path upward.

**Reward:** Retrieve the piece at the summit and return to the museum.

## 3. The Drowned Garden

**Setting:** An overgrown, flooded garden painting. A missing piece, potentially a bird, is trapped inside a glass fountain.

**Challenge:** Redirect water to change water levels, reveal paths, and reach new controls. Drain the fountain to recover the piece.

**Example sequence:**

1. Divert water to a waterwheel, opening the garden gate.
2. Drain a flooded courtyard to reveal stepping stones.
3. Reach the final valve and empty the glass fountain.

**Possible interactions:** Turn valves, rotate channels, and open sluice gates.

**Focus:** Exploration and environmental puzzles.

## 4. The Clockmaker’s Portrait

**Status:** Additional idea; not selected.

**Setting:** A portrait containing a clockwork workshop, pendulums, gears, and mechanical platforms. A golden eye is held inside the clockmaker’s mechanical owl.

**Challenge:** Freeze one mechanism at a time. Stop a pendulum to form a bridge, then release it to freeze a rotating platform farther along the route.

**Reward:** Restart the workshop, waking the owl so it returns the eye.

## 5. The Royal Supper

**Status:** Selected first adventure. See ROYAL_SUPPER.md for implementation requirements. Developed from the earlier “Feast of Shadows” suggestion. The current idea is tabletop parkour; shadow manipulation is not part of the current design.

**Setting:** A painting of people having supper at a royal table. Entering the painting places the player on the tabletop at miniature scale. Plates, food, candles, and cutlery become the world. The missing piece is on the king’s plate at the end.

**Challenge:** Cross the table through Mario-like platforming: jump, climb, pass beneath objects, and manipulate props to open the route.

**Example route:**

1. Climb from a bread basket onto the table.
2. Jump between bread pieces and plates.
3. Pass beneath an overturned goblet.
4. Topple a fork to create a bridge between dishes.
5. Extinguish a candle, making it safe to cross or climb over.
6. Reach the king’s plate and retrieve the missing piece.

**Presentation proposal:** Side-view 2.5D with depth in the scenery. Oversized diners loom in the background, while the playable route stays on the tabletop. DreamLayer artwork supplies the royal banquet, food, porcelain, cloth, and props.

**Controls:** Move, jump, and interact.

**Jam scope proposal:** One short level with two environmental interactions: the fork and candle. Nearby checkpoints recover the player after falls. Add alternate routes or moving hazards only if the basic course is already polished.

## 6. The Unfinished Sketch

**Status:** Deferred. Keep for a future expansion; do not build it for now.

**Setting:** An unfinished charcoal drawing. A missing piece, potentially a butterfly, is trapped beyond incomplete paths.

**Challenge:** Use a limited number of strokes to complete predefined shapes: a bridge, ladder, or circular stepping stone. Erase an earlier stroke to reuse it elsewhere.

**Implementation proposal:** Clickable drawing locations with animated strokes. The puzzle is choosing what to complete, rather than measuring freehand drawing accuracy.

**Reward:** Reach the butterfly, which brings colour into the sketch before following the player home.

## Current selection status

- Committed adventures: Royal Supper, then Sleeping Mountain.
- Drowned Garden is the optional third adventure after the two-artwork version is complete.
- Painted Siege and Clockmaker’s Portrait remain reserve ideas.
- Unfinished Sketch is reserved for later.
- Choose only 2–3 artworks for the jam; the shortlist is not a commitment to build every idea.
