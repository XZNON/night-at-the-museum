# The Last Curator — M3 mechanics blockout

Vanilla TypeScript, Vite and Three.js. One renderer, active scene and animation loop; fixed 60 Hz gameplay. Runtime visuals are original geometric placeholders. Existing DreamLayer references/tooling live outside the production bundle; this mechanics pass generated no production art. Audio/Howler integration is deferred to the remainder of M3.

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
- Restoration saves immediately, then the garden/tree regain colour. The next objective is the sun, whose adventure is still in development. There is no mountain door or campaign ending in this blockout.
- Escape pauses gameplay. Blur/hidden tab clears held input and requires explicit resume. Pointer lock is released for pause/inspection; reacquire it with an explicit click. Drag look works when pointer lock is denied.

## Supper controls and route

A/D or left/right move; hold Space for height, release and press again for one air jump. E topples the fork. R restarts at the latest section checkpoint, retaining the settled fork and resetting cyclic hazards. Pause offers clean adventure restart, checkpoint restart and museum return. Clean restart preserves campaign pieces.

Climb twelve bread landings, pass under the goblet, then slide faster across three varied butter patches. Momentum survives jumps; touching a crumb retries the section. Avoid predictable grape pairs, then topple the required fork. Observe the fan from safety and commit through three sequential ember windows before the flames return. Make three progressively longer cover crossings during AWAY. Keep your foot-centre marker inside the inset blue strip; green/HIDDEN confirms full-body protection during LOOK. Jumping above cover exposes you. Bounce from jelly, climb two cake rises, cross a flat shelf and drop to a second jelly for the final rise to the pear. A checkpoint follows each hard section, with none inside the fan, watched run or finale. Falls, crumbs, grapes, burns and detection recover in 0.35 seconds without inventory loss. Replays cannot duplicate a collected/restored pear. The camera follows horizontally and vertically; there is no route map.

## Persistence and reset

Campaign progress/settings use `last-curator.save.v1`. Inventory, unlocks and completion are derived; no redundant flags are saved. Malformed/incompatible data falls back safely with a notice. Unknown/duplicate IDs and invalid restoration prefixes are repaired; unavailable future awards cannot bypass progression. Storage failure preserves play in memory and warns that reload will lose it.

Reload preserves collected/restored pieces and quality/volume settings; traversal/checkpoints restart after reload. **Reset progress** (Pause) or **New Game / reset progress** (menu) opens an explicit confirmation with **Keep progress** as the first/default focus. Confirmation clears only this game's save and session, and opens a fresh museum. Volume is saved for the future audio milestone; The mechanics blockout is silent.

## Isolated development entry

- http://127.0.0.1:5173/?scene=royal-supper — direct isolated supper study, with blockout completion/replay menus. It never reads/writes/deletes campaign saves, including on quality/volume changes.
- Append `&debug=1`, or use F3, for collision/scene diagnostics.
- http://127.0.0.1:5173/?lane=movement — isolated movement tuning lane.
- Production ignores these queries, opens the campaign menu, and excludes debug hooks/controls.

Layout/tuning live in `src/levels/`; supper puzzle/controller/collision stay in `src/gameplay/`. `src/campaign/` owns stable stage definitions, validated persistence and command operations. Scenes own GPU resources and listeners, and dispose them on transition. `src/ui/` owns menus, inventory and accessible inspection. The masterpiece study is shared by its frame and close-up.

`.env` files are ignored. Never expose credentials through `VITE_` variables, client code or public assets. Verify DreamLayer access, credits and costs before an art batch.

## Reproducible manual checks

1. New Game: inspect the grey masterpiece, then approach/click Royal Supper. A distant click/E must not enter. Walk against each room wall and try drag and pointer-lock look.
2. Play every revised section. Hold/repeat Space and attempt a third airborne jump; only a valid landing may recharge it. On butter, release direction during a held jump: momentum must persist on landing; reverse to brake and touch a crumb to verify retry. Test both ends of every blue cover strip during LOOK, then move outside or jump above it to verify detection. Check that three crossings get harder and the two-bounce dessert route has readable landings. Try the fork gap before toppling and grape contact. At the trident holder, jump onto each of the three separated ember tops and across the gaps; walking off a top must fall, entering too early or lingering until relighting must burn. No floor or decorative brass arm may bridge the gaps. Each failure must recover safely. Repeat E/R, leave during fork toppling, and re-enter to check session retention. Pause at grapes/candles/diners: all motion/phases must freeze. Verify jelly side contact and held Space cannot chain extra launches. Time a fresh run with retries and review pacing; the original 5–7 minute target is provisional after shortening the repetitive sections.
3. Collect and return. Double-click Return; remain in the museum. Reload before placement and confirm the pear remains in inventory. Reload restarts the supper route, while owned/restored pieces persist.
4. Inspect: try a wrong drop/background drop and a sun-target click. The pear must remain. Repeat using drag, click and Tab/Enter on separate new runs. Confirm the tree/garden colour changes and inventory empties. Reload during the colour animation; restoration must already be saved.
5. Re-enter/replay supper after restoration. Collection must add no duplicate and preserve colour. Repeat entry/exit several times; one canvas should remain.
6. Cancel a reset and check saved progress. Confirm a reset and reload; the fresh game must remain. Other localStorage keys must survive. Test invalid save data/storage denial using a disposable browser profile.
7. Change quality/volume and reload. Pause while moving, switch browser tabs/apps, return and explicitly resume. Test 1280×720 and 960×540; inspect button focus/visibility. Pointer lock must release on pause/inspection and drag fallback must stay usable.
8. Repeat in production preview. Check the console and asset responses. Production must have no direct-level/debug hook. Test the isolated development query with an existing campaign save; its bytes must remain untouched.

Automated Chromium playtesting does not replace first-time human readability/difficulty review. Cross-browser/fullscreen/itch.io iframe tests, actual OS tab switching and representative integrated-GPU profiling remain release work. No 60 FPS device performance claim is made.
