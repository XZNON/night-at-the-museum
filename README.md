# The Last Curator — M2 restoration study

Vanilla TypeScript, Vite and Three.js. One renderer, active scene and animation loop; fixed 60 Hz gameplay. All visuals are original geometric placeholders. No final art or DreamLayer generation requests are included. Audio/Howler integration is deferred to M3.

## Run

Requires Node 22.12+ (verified with 22.14.0 and npm 10.9.2).

```powershell
npm ci
npm run dev
npm run typecheck
npm run test
npm run build
npm run preview
```

Development: http://127.0.0.1:5173/. Production preview: http://127.0.0.1:4173/. Select **New Game** or **Continue**. The build uses relative asset paths and bundled dependencies, with no runtime CDN or generation service.

```powershell
npx playwright install chromium
npm run test:browser
```

Playwright starts dev/preview servers if needed; build first. Tests use real keyboard/mouse controls. Development snapshots are read-only; production traversal uses visible HUD/prompts, with no teleports, campaign setters or debug shortcuts. Save fixtures cover reloaded inventory and corruption. Screenshots/traces are kept in ignored `test-results/`.

## Museum and restoration

- WASD/arrows walk. Drag the view to look; **Mouse look** requests pointer lock. Click a nearby frame under the cursor (or under the centre reticle while locked). E is a keyboard alternative for the frame under the reticle. Frames require range and line of sight.
- Inspect the masterpiece to see the missing pear and its supper clue. Walk to the left frame and enter Royal Supper.
- Collect the pear, choose **Return to Museum**, then walk from the supper frame to the masterpiece. Unfinished adventures can also be left from Pause; their checkpoint/prop states remain in memory.
- Place by dragging the inventory pear onto the pear target, clicking the pear then its target, or selecting/activating the buttons with Tab/Enter. Wrong targets retain inventory. Escape closes inspection. Walking is paused during inspection.
- Restoration saves immediately, then the garden/tree regain colour. The next objective is the sun, whose adventure is still in development. There is no mountain door or campaign ending in M2.
- Escape pauses gameplay. Blur/hidden tab clears held input and requires explicit resume. Pointer lock is released for pause/inspection; reacquire it with an explicit click. Drag look works when pointer lock is denied.

## Supper controls and route

A/D or left/right move; Space jumps (hold for full height). E activates the nearest safe interaction. R restarts at the latest checkpoint, retaining prop states. Pause offers clean adventure restart, checkpoint restart and museum return. Clean restart preserves campaign pieces.

Jump from the basket across three bread steps to the dish, walk under the goblet, topple the fork and wait for it to settle. Cross the bridge, jump into the snuffer alcove, extinguish the candle and cross its top beneath the canopy. Jump across the desserts to the pear. Falls/flame recover at the last checkpoint without inventory loss. Replays cannot duplicate a collected/restored pear.

## Persistence and reset

Campaign progress/settings use `last-curator.save.v1`. Inventory, unlocks and completion are derived; no redundant flags are saved. Malformed/incompatible data falls back safely with a notice. Unknown/duplicate IDs and invalid restoration prefixes are repaired; unavailable future awards cannot bypass progression. Storage failure preserves play in memory and warns that reload will lose it.

Reload preserves collected/restored pieces and quality/volume settings; traversal/checkpoints restart after reload. **Reset progress** (Pause) or **New Game / reset progress** (menu) opens an explicit confirmation with **Keep progress** as the first/default focus. Confirmation clears only this game's save and session, and opens a fresh museum. Volume is saved for the future audio milestone; M2 is silent.

## Isolated development entry

- http://127.0.0.1:5173/?scene=royal-supper — direct isolated supper study, with blockout completion/replay menus. It never reads/writes/deletes campaign saves, including on quality/volume changes.
- Append `&debug=1`, or use F3, for collision/scene diagnostics.
- http://127.0.0.1:5173/?lane=movement — isolated movement tuning lane.
- Production ignores these queries, opens the campaign menu, and excludes debug hooks/controls.

Layout/tuning live in `src/levels/`; supper puzzle/controller/collision stay in `src/gameplay/`. `src/campaign/` owns stable stage definitions, validated persistence and command operations. Scenes own GPU resources and listeners, and dispose them on transition. `src/ui/` owns menus, inventory and accessible inspection. The masterpiece study is shared by its frame and close-up.

`.env` files are ignored. Never expose credentials through `VITE_` variables, client code or public assets. Verify DreamLayer access, credits and costs before an art batch.

## Reproducible manual checks

1. New Game: inspect the grey masterpiece, then approach/click Royal Supper. A distant click/E must not enter. Walk against each room wall and try drag and pointer-lock look.
2. Play the bread jumps and both gates. Attempt the fork gap before toppling and candle passage while lit; recover safely. Repeat E and R, leave during a prop action, and re-enter to check checkpoint/action retention.
3. Collect and return. Double-click Return; remain in the museum. Reload before placement and confirm the pear remains in inventory. Reload restarts the supper route, while owned/restored pieces persist.
4. Inspect: try a wrong drop/background drop and a sun-target click. The pear must remain. Repeat using drag, click and Tab/Enter on separate new runs. Confirm the tree/garden colour changes and inventory empties. Reload during the colour animation; restoration must already be saved.
5. Re-enter/replay supper after restoration. Collection must add no duplicate and preserve colour. Repeat entry/exit several times; one canvas should remain.
6. Cancel a reset and check saved progress. Confirm a reset and reload; the fresh game must remain. Other localStorage keys must survive. Test invalid save data/storage denial using a disposable browser profile.
7. Change quality/volume and reload. Pause while moving, switch browser tabs/apps, return and explicitly resume. Test 1280×720 and 960×540; inspect button focus/visibility. Pointer lock must release on pause/inspection and drag fallback must stay usable.
8. Repeat in production preview. Check the console and asset responses. Production must have no direct-level/debug hook. Test the isolated development query with an existing campaign save; its bytes must remain untouched.

Automated Chromium playtesting does not replace first-time human readability/difficulty review. Cross-browser/fullscreen/itch.io iframe tests, actual OS tab switching and representative integrated-GPU profiling remain release work. No 60 FPS device performance claim is made.
