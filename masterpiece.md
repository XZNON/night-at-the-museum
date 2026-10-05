# The Last Curator — Masterpiece and progression

See DECISIONS.md for current scope and choices. The Garden Before Dawn is the working composition. Royal Supper and Sleeping Mountain are committed; the bird/Drowned Garden stage is optional. Finish after the sun in the two-stage version, or after the bird in the three-stage version. PLAN.md defines the build order; ROYAL_SUPPER.md defines the first adventure.

## Confirmed game structure

- A small, walkable museum with dim lighting, a predominantly red colour scheme, wooden floorboards, and a red carpet.
- The masterpiece is the centre of attention. Other artworks are discovered around the museum and entered by clicking them.
- Artworks contain 2.5D mini-games.
- Recovered pieces enter the player's inventory.
- The player returns to the masterpiece and drags each piece into its matching place.
- Each restoration fills a region with colour and reveals the next missing piece, unlocking further progression.
- The jam game contains one masterpiece and 2–3 playable artworks.

## Proposed masterpiece: The Garden Before Dawn

A large, ornate painting depicts a traveller beneath a pear tree in a walled garden. Beyond the wall are distant mountains. A bird belongs on a branch beside the traveller, and a low sun belongs above the mountains.

At first, most of the canvas is faded charcoal and muted pigment. Three objects have escaped: a golden pear, the sun, and a small blue bird. Their absences appear as intentional gaps in the composition. The painting is restored in three stages, each returning colour to a different region.

The final image is a luminous garden at sunrise: green foliage, golden fruit, a warm sky, and a blue bird beside the traveller. The final restoration brings subtle movement to the image, completing the game.

This masterpiece and sequence are working design defaults selected during handoff. Assets and stage count remain configurable; do not hardcode a three-piece ending.

## Proposed restoration sequence

### 1. The golden pear — Royal Supper

**Masterpiece location:** A clearly visible low branch of the pear tree.

**Where it went:** The pear has become the prized dessert on the king's plate inside the Royal Supper painting.

**Adventure:** Miniature tabletop parkour. Cross food and crockery, topple a fork to form a bridge, and extinguish a candle to make the route safe. Reach the king's plate and collect the pear.

**Restoration:** Place the pear on the branch. Colour spreads through the tree and the surrounding grass. This reveals the missing sun above the mountains.

**Unlock:** The Sleeping Mountain artwork becomes enterable.

### 2. The sun — Sleeping Mountain

**Masterpiece location:** A circular gap just above the distant mountain ridge.

**Where it went:** The sun is lodged at the summit inside a mountain landscape painting, held as a small radiant disc that the player can carry.

**Adventure:** Follow a compact mountain route using wind currents and movable stone bridges to reach the summit.

**Restoration:** Place the sun above the ridge. Warm colour spreads across the sky and distant landscape. The returning light makes the bird-shaped gap beside the traveller visible.

**Outcome:** In the committed two-stage version, finish restoration and play the ending. If the optional third stage is included, the Drowned Garden artwork becomes enterable instead.

### 3. The blue bird — Drowned Garden (optional)

**Masterpiece location:** A branch beside the traveller.

**Where it went:** The bird is trapped inside a glass fountain in a flooded garden painting.

**Adventure:** Redirect water to power a waterwheel, drain a courtyard, and reach the final valve. Empty the fountain and free the bird. Represent the recovered bird as an illustrated inventory piece.

**Restoration:** Place the bird on its branch. Colour returns to the traveller and remaining foreground. The bird flutters, the leaves stir, and light moves gently across the finished canvas.

**Ending:** Show the complete masterpiece and a short completion message. Let the player remain in the museum to admire it.

## Museum layout proposal

A compact room with a short circulation route around display partitions. The red carpet leads from the entrance to the masterpiece on the far wall. Its size, ornate frame, and dedicated light establish it as the focal point.

Royal Supper is discoverable nearby. The mountain and garden paintings are visible along the route before they unlock. Keep the path short: walking back after a mini-game should feel like returning with a reward, not a lengthy commute.

Locked paintings remain visible. A change in their spotlight or subtle movement inside the image indicates when they become enterable. A brief interaction message explains which restoration is needed while locked.

## Masterpiece interaction proposal

Clicking the masterpiece opens a close-up inspection view with inventory pieces beneath the canvas. Museum movement pauses during inspection.

- The current missing piece has a readable silhouette and a short clue pointing toward its artwork.
- Drag the recovered inventory piece onto the matching location.
- A correct placement snaps into place and starts the colour-restoration animation.
- An incorrect placement returns the piece to inventory without penalty.
- After restoration, reveal the next gap and show the newly unlocked artwork.
- Exiting inspection returns the player to the museum.

Use colour, shape, and a small animation together to communicate progress; colour alone should not carry the interaction.

## First prototype

Build only the first restoration loop before producing all final assets:

1. Walk through a placeholder museum.
2. Inspect the masterpiece and see the missing pear.
3. Click Royal Supper to enter its 2.5D level.
4. Cross the tabletop using the fork and candle interactions.
5. Collect the pear and return to the museum.
6. Open the masterpiece, drag the pear into place, and restore the tree region.
7. Reveal the sun gap and activate the mountain painting.

This proves the museum, transitions, movement, environmental interactions, inventory, placement, and progression in one complete playable slice.

## DreamLayer art workflow

- Establish one approved reference image for the masterpiece, then use it to maintain composition across any edits.
- Plan the three object positions and restoration regions before generating final artwork.
- Create clean inventory images of the pear, sun, and bird that match their appearance in the masterpiece and destination artworks.
- Generate the supper, mountain, and garden artwork in distinct styles while maintaining each world's internal consistency.
- Build colour restoration using aligned artwork layers and authored masks. Check that all restored regions and object placements match the approved composition.
- Retain reference images and before/after examples for the submission's explanation of DreamLayer usage.

## Scope reserve

Painted Siege and Clockmaker's Portrait remain available alternatives or future additions. Unfinished Sketch stays deferred. None is required for the proposed three-artwork jam version.

If time allows only two polished artworks, restore the masterpiece completely after the second piece and adapt the composition accordingly. The submitted version should have a complete restoration and ending.
