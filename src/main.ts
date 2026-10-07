import * as THREE from 'three';
import './style.css';
import { Progression } from './campaign/progression';
import { SaveStore, defaultSettings } from './campaign/save';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import { SceneManager, TRANSITION_INPUT_SETTLE_MS } from './core/scenes';
import { createSupperSession } from './gameplay/royal-supper-model';
import type { SketchRouteSession, SketchSession } from './gameplay/sketch-model';
import { movementLane, royalSupper } from './levels/royal-supper';
import { isSketchBayId, isSketchStudy, sketchBayIds, sketchBays, sketchTuning } from './levels/unfinished-sketch';
import type { SketchBayId, SketchStudy } from './levels/unfinished-sketch';
import { sketchRoute } from './levels/unfinished-sketch-route';
import { sketchJoinedRoute, sketchLayerTwo } from './levels/unfinished-sketch-layer2';
import { sketchAdventure, sketchLayerThree, sketchLayerThreeSwings, sketchLayerThreeWalls, sketchLayersOneToThree } from './levels/unfinished-sketch-layer3';
import { museum, type MuseumPose } from './levels/museum';
import { RoyalSupperScene } from './scenes/royal-supper';
import { UnfinishedSketchScene } from './scenes/unfinished-sketch';
import type { SketchSceneMode } from './scenes/unfinished-sketch';
import { MuseumScene } from './scenes/museum';
import { GameUi } from './ui/game-ui';
import { GameAudio } from './core/audio';
import { loadArtSet } from './assets/images';
import { supperArtIds, museumArtIds } from './assets/manifest';

const root = document.querySelector<HTMLElement>('#app')!;
const parameters = new URLSearchParams(location.search);
let lane = import.meta.env.DEV && parameters.get('lane') === 'movement';
// The dev selector is resolved before any SaveStore access, so a direct entry
// never reads, writes or resets campaign data.
const sketchStudy = import.meta.env.DEV && parameters.get('scene') === 'unfinished-sketch';
const study: 'supper' | 'sketch' = sketchStudy ? 'sketch' : 'supper';
const isolated = import.meta.env.DEV && (parameters.get('scene') === 'royal-supper' || lane || sketchStudy);
// A missing or unknown study value keeps the Slice 1 playground, so the older
// entry keeps working and no unknown value can fail the launch.
let sketchMode: SketchStudy = isSketchStudy(parameters.get('study')) ? parameters.get('study') as SketchStudy : 'mechanics';
// An unknown bay value falls back safely instead of failing the entry.
let sketchBay: SketchBayId = isSketchBayId(parameters.get('bay')) ? parameters.get('bay') as SketchBayId : 'pins';
// Same-session leave/re-entry keeps each bay's traversal and the route's last
// safe checkpoint; a bay change, a mode change or an explicit restart resets it.
// Nothing here touches campaign storage.
const sketchSessions = new Map<SketchBayId, SketchSession>();
const routeSessions = new Map<SketchStudy, SketchRouteSession>();
let progression = new Progression();
let settings = defaultSettings();
let session = createSupperSession();
let paused = true;
type Overlay = 'menu' | 'none' | 'pause' | 'inspection' | 'success' | 'reset';
let overlay: Overlay = 'menu';
let beforeReset: Overlay = 'menu';
let debugEnabled = import.meta.env.DEV && parameters.get('debug') === '1';
let remembered = false;
let renderer: THREE.WebGLRenderer | null = null;
let manager: SceneManager | null = null;
let loop: GameLoop | null = null;
let disposed = false;
let renderCount = 0;
let updateCount = 0;
let diagnosticTime = 0;
let previousRenderSeconds = 0;
let frameMs = 16.67;
let inputReadyAt = 0;
let retryAction: (() => void) | null = null;
const lifetime = new AbortController();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const input = new Input(() => togglePause(), () => toggleDebug());
const ui = new GameUi(root, {
  start: () => { void (sketchStudy ? startSketch(false) : isolated ? startSupper(false) : enterMuseum()); },
  replay: () => { void (sketchStudy ? startSketch(true) : startSupper(true)); },
  resume, leave: () => { void leave(); }, pause: () => pause(),
  checkpoint: () => {
    if (manager?.transitioning) return;
    const sketch = activeSketch();
    if (sketch) { sketch.model.retry(); resume(); return; }
    const scene = activeSupper();
    if (!scene) return;
    scene.model.restartCheckpoint(); resume();
  },
  quality: low => { settings.quality = low ? 'low' : 'normal'; resize(); persist(); },
  volume: value => { settings.masterVolume = value; audio.volume(value); persist(); },
  debug: toggleDebug, lane: () => { lane = true; void startSupper(true, true); },
  sketchBay: bay => { void startSketch(true, bay); },
  reset: requestReset, confirmReset, cancelReset, closeInspection, place,
  look: () => { ui.canvas.focus(); activeMuseum()?.requestLook(); },
  retry: () => { if (retryAction) retryAction(); else void (sketchStudy ? startSketch(false) : isolated ? startSupper(false) : enterMuseum()); },
  back: () => { if (manager?.active) { overlay = 'none'; resume(); } else { overlay = 'menu'; ui.menu(remembered); } },
}, isolated, study, sketchMode);
const audio = new GameAudio(text => ui.notice(text));
window.addEventListener('pointerdown', event => { if (event.isTrusted) audio.activate(); }, { capture: true, signal: lifetime.signal });
window.addEventListener('keydown', event => { if (event.isTrusted) audio.activate(); }, { capture: true, signal: lifetime.signal });
// Isolated entry never reads localStorage. These wrappers also keep access to
// the storage property itself inside SaveStore's guarded operations.
const store = isolated ? null : new SaveStore({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
}, text => ui.notice(text));
if (store) {
  const loaded = store.load(); progression = new Progression(loaded.save); settings = loaded.save.settings;
  remembered = loaded.exists; ui.menu(remembered);
}
audio.volume(settings.masterVolume);
function persist(): void { store?.write(progression.snapshot, settings); }
function activeSupper(): RoyalSupperScene | null { return manager?.active instanceof RoyalSupperScene ? manager.active : null; }
function activeSketch(): UnfinishedSketchScene | null { return manager?.active instanceof UnfinishedSketchScene ? manager.active : null; }
function sketchAt(): UnfinishedSketchScene | null { return activeSketch(); }
function activeMuseum(): MuseumScene | null { return manager?.active instanceof MuseumScene ? manager.active : null; }
function setPaused(value: boolean): void {
  paused = value; input.clear(); input.enabled = !value; loop?.setPaused(value);
  audio.setPaused(value);
  activeMuseum()?.suspend();
  // Pause and blur clear queued Sketch commands as well as held keys, so a
  // placement or recall can never survive into the resumed frame.
  activeSketch()?.model.clearCommands();
  activeSketch()?.setInteractive(!value && performance.now() >= inputReadyAt);
}
function pause(reason = 'Take a moment. The gallery will wait.'): void {
  if (!manager?.active || manager.transitioning || paused) return;
  setPaused(true); overlay = 'pause'; ui.pause(settings.quality === 'low', reason, settings);
}
function resume(): void {
  if (!manager?.active || manager.transitioning || document.hidden || overlay === 'reset' || overlay === 'inspection') return;
  overlay = 'none';
  const museumActive = activeMuseum() !== null;
  ui.play(museumActive ? 'museum' : study === 'sketch' && activeSketch() ? 'sketch' : 'supper');
  setPaused(false);
}
function togglePause(): void {
  if (manager?.transitioning) return;
  if (overlay === 'reset') { cancelReset(); return; }
  if (overlay === 'inspection') { closeInspection(); return; }
  if (paused) resume(); else pause();
}
function toggleDebug(): void {
  if (!import.meta.env.DEV) return;
  debugEnabled = !debugEnabled;
  const supper = activeSupper();
  if (supper) supper.debug.visible = debugEnabled;
  const sketch = activeSketch();
  if (sketch) sketch.debug.visible = debugEnabled;
  if (!debugEnabled) ui.diagnostics(null);
}
function initializeRenderer(): boolean {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x241720); renderer.outputColorSpace = THREE.SRGBColorSpace;
    manager = new SceneManager(renderer, () => input.clear());
    loop = new GameLoop(dt => {
      if (!manager?.transitioning) { manager?.active?.fixedUpdate(dt, input.sample()); updateCount++; }
    }, (alpha, seconds) => {
      manager?.render(alpha, seconds); renderCount++;
      if (previousRenderSeconds) frameMs += ((seconds - previousRenderSeconds) * 1000 - frameMs) * 0.1;
      previousRenderSeconds = seconds;
      if (import.meta.env.DEV && debugEnabled && seconds - diagnosticTime > 0.2) {
        diagnosticTime = seconds;
        const body = (activeSupper() ?? activeSketch())?.model.controller.body;
        ui.diagnostics(`scene: ${manager?.active?.id ?? 'menu'}  ${paused ? 'PAUSED' : '60 Hz simulation'}\n${(1000 / Math.max(frameMs, 0.1)).toFixed(0)} FPS / ${frameMs.toFixed(2)} ms (this browser)\n${sketchAt() ? `study: ${sketchMode}${sketchMode === 'mechanics' ? ` / bay ${sketchBay}` : ''}${sketchAt()?.routeModel ? ` / ${sketchAt()!.routeModel!.stage}` : ''}\n` : `checkpoint: ${session.checkpointId}\n`}x: ${body?.x.toFixed(2)} feet y: ${body?.y.toFixed(2)} grounded: ${body?.grounded}\nrender calls: ${renderer?.info.render.calls} geometries: ${renderer?.info.memory.geometries}\nF3: collision view`);
      }
    });
    resize(); loop.start(); return true;
  } catch (error) {
    renderer?.dispose(); renderer = null;
    ui.error(`WebGL2 could not start. Use a desktop browser with graphics acceleration enabled. ${error instanceof Error ? error.message : ''}`);
    return false;
  }
}
async function enterMuseum(pose: MuseumPose = museum.spawn): Promise<void> {
  if (disposed || manager?.transitioning || !initializeRenderer() || !manager) return;
  setPaused(true); overlay = 'none';
  retryAction = () => { void enterMuseum(pose); };
  try {
    const changed = await manager.transition(async () => new MuseumScene(ui.canvas, pose,
      progression.snapshot.restoredPieceIds.includes('golden-pear'),
      () => !paused && !manager?.transitioning && performance.now() >= inputReadyAt,
      id => { if (id === 'masterpiece') inspect(); else if (id === royalSupper.id) void startSupper(false); },
      text => ui.museumPrompt(text), await loadArtSet(museumArtIds)));
    if (changed) { audio.setScene('museum'); inputReadyAt = performance.now() + TRANSITION_INPUT_SETTLE_MS; remembered = true; ui.museumState(progression.snapshot); ui.museumPrompt(''); resume(); }
  } catch (error) { showError(error); }
}
async function startSupper(restart: boolean, preserveLane = false): Promise<void> {
  if (disposed || manager?.transitioning || !initializeRenderer() || !manager) return;
  setPaused(true); overlay = 'none';
  retryAction = () => { void startSupper(restart, preserveLane); }; ui.loading();
  if (restart) { session = createSupperSession(); if (!preserveLane) lane = false; }
  try {
    const changed = await manager.transition(async () => {
      const art = await loadArtSet(supperArtIds);
      const scene = new RoyalSupperScene(lane ? movementLane : royalSupper, session,
        () => { const result = progression.applyCampaignCommand({ action: 'collect', artworkId: royalSupper.id, pieceId: royalSupper.pieceId }); if (result.changed) persist(); return result; },
        state => ui.updateHud(state), result => { setPaused(true); audio.play('collect', true); overlay = 'success'; ui.success(result); }, reducedMotion,
        cue => audio.play(cue), art);
      scene.debug.visible = debugEnabled; return scene;
    });
    if (changed) { audio.setScene('royal-supper'); inputReadyAt = performance.now() + TRANSITION_INPUT_SETTLE_MS; remembered = true; resume(); }
  } catch (error) { showError(error); }
}
/**
 * Launch one of the two save-isolated Sketch studies. `bayId` is accepted only
 * by the Slice 1 playground selector and forces that mode, so a bay button
 * can never open the route by accident.
 */
async function startSketch(restart: boolean, bayId?: SketchBayId): Promise<void> {
  if (disposed || manager?.transitioning || !initializeRenderer() || !manager) return;
  if (bayId) {
    if (bayId !== sketchBay) restart = true;
    sketchBay = bayId;
    sketchMode = 'mechanics';
  }
  setPaused(true); overlay = 'none';
  retryAction = () => { void startSketch(restart, bayId); };
  ui.loading();
  try {
    const created: { scene: UnfinishedSketchScene | null } = { scene: null };
    const changed = await manager.transition(async () => {
      // Only the approved existing player picture is reused. Sketch props are
      // cartoon placeholders; no new asset is generated or loaded here.
      const art = await loadArtSet(['player.idle']);
      const mode: SketchSceneMode = sketchMode !== 'mechanics'
        ? { kind: 'route', field: sketchMode === 'adventure' ? sketchAdventure : sketchMode === 'layers-1-3' ? sketchLayersOneToThree : sketchMode === 'layer-3' ? sketchLayerThree : sketchMode === 'layer-3-swings' ? sketchLayerThreeSwings : sketchMode === 'layer-3-walls' ? sketchLayerThreeWalls : sketchMode === 'layers-1-2' ? sketchJoinedRoute : sketchMode === 'layer-2' ? sketchLayerTwo : sketchRoute,
          session: restart ? null : routeSessions.get(sketchMode) ?? null }
        : { kind: 'bay', field: sketchBays[sketchBay],
          session: restart ? null : sketchSessions.get(sketchBay) ?? null };
      const scene = new UnfinishedSketchScene(mode, sketchTuning, art['player.idle']!, state => ui.updateSketchHud(state),
        snapshot => {
          if (mode.kind === 'route') routeSessions.set(mode.field.id, snapshot as SketchRouteSession);
          else sketchSessions.set(sketchBay, snapshot as SketchSession);
        }, ui.canvas, () => input.clear(),
        // S5A: the isolated study only shows the success screen; the campaign
        // award belongs to S5B and never runs from a dev study.
        () => { setPaused(true); audio.play('collect', true); overlay = 'success'; ui.sketchSuccess(); });
      created.scene = scene;
      scene.attachPointer(ui.canvas);
      scene.setReducedMotion(reducedMotion);
      scene.debug.visible = debugEnabled;
      return scene;
    });
    if (changed && created.scene) {
      audio.setScene('royal-supper');
      inputReadyAt = performance.now() + TRANSITION_INPUT_SETTLE_MS;
      // Placement clicks stay refused until the settle window has passed.
      created.scene.armInteraction(inputReadyAt);
      remembered = true; ui.markSketch(sketchMode, sketchBay); resume();
    }
  } catch (error) { showError(error); }
}
async function leave(): Promise<void> {
  if (!manager || manager.transitioning) return;
  if (!isolated) { await enterMuseum(museum.returnPose); audio.play('return', true); return; }
  const finished = activeSupper()?.model.completed ?? false;
  setPaused(true); overlay = 'menu';
  try { await manager.transition(() => null); audio.setScene(null); ui.diagnostics(null); if (finished) ui.finished(); else ui.menu(remembered); }
  catch (error) { showError(error); }
}
function inspect(): void {
  if (!activeMuseum() || paused || manager?.transitioning) return;
  setPaused(true); overlay = 'inspection'; ui.inspection(progression.snapshot);
}
function closeInspection(): void { if (overlay !== 'inspection') return; overlay = 'none'; resume(); }
function place(piece: string, target: string): void {
  if (overlay !== 'inspection' || manager?.transitioning) return;
  if (piece !== 'golden-pear' || target !== piece) { ui.placementMessage('Choose the golden pear and its matching silhouette. Your piece stays in inventory.'); return; }
  const result = progression.applyCampaignCommand({ action: 'restore', artworkId: royalSupper.id, pieceId: piece });
  if (!result.ok) { ui.placementMessage('Recover the golden pear from Royal Supper first.'); return; }
  if (!result.changed) return;
  persist(); audio.play('restore', true); activeMuseum()?.restoreColour(); ui.museumState(progression.snapshot); ui.inspection(progression.snapshot, !reducedMotion);
}
function requestReset(): void {
  if (isolated || manager?.transitioning || overlay === 'reset') return;
  beforeReset = overlay; setPaused(true); overlay = 'reset'; ui.resetConfirmation();
}
function cancelReset(): void {
  if (overlay !== 'reset') return;
  overlay = beforeReset;
  if (overlay === 'menu') ui.menu(remembered);
  else if (overlay === 'inspection') ui.inspection(progression.snapshot);
  else if (overlay === 'success') { overlay = 'pause'; ui.pause(settings.quality === 'low', 'Your progress is kept.', settings); }
  else if (overlay === 'pause') ui.pause(settings.quality === 'low', 'Your progress is kept.', settings);
  else resume();
}
function confirmReset(): void {
  if (overlay !== 'reset' || manager?.transitioning || isolated) return;
  ui.notice(''); store?.reset(); progression = new Progression(); settings = defaultSettings(); audio.volume(settings.masterVolume); session = createSupperSession(); remembered = false; resize();
  overlay = 'none'; void enterMuseum();
}
function showError(error: unknown): void { setPaused(true); overlay = 'menu'; ui.error(error instanceof Error ? error.message : String(error)); }
function resize(): void {
  renderer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'low' ? 1 : 1.5)); manager?.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize, { signal: lifetime.signal });
// A real blur mid-ride sends the Sketch rider back to the departure exit with
// the lift deck reset (S4L); an Escape pause only freezes the ride.
window.addEventListener('blur', () => { activeSketch()?.routeModel?.cancelRide(); input.clear(); audio.setPaused(true); pause('Focus was lost. Resume when you are ready.'); }, { signal: lifetime.signal });
document.addEventListener('visibilitychange', () => { if (document.hidden) { activeSketch()?.routeModel?.cancelRide(); input.clear(); audio.setPaused(true); pause('The game paused while this tab was hidden.'); } }, { signal: lifetime.signal });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && activeMuseum()) pause('Mouse look released. Resume to continue; dragging also works.'); }, { signal: lifetime.signal });
// Bay hotkeys are contextual to the isolated playground and reset through the
// same safe transition as the selector buttons.
window.addEventListener('keydown', event => {
  if (sketchMode !== 'mechanics' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.matches('button, input, select, textarea, a') || target.isContentEditable)) return;
  const bay = sketchBayIds[Number(event.code.replace('Digit', '')) - 1];
  if (!bay || !event.code.startsWith('Digit')) return;
  event.preventDefault();
  void startSketch(true, bay);
}, { signal: lifetime.signal });
ui.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); pause('Graphics context was lost. Reload if it cannot recover.'); }, { signal: lifetime.signal });
function dispose(): void {
  if (disposed) return;
  disposed = true; lifetime.abort(); loop?.dispose(); manager?.dispose(); audio.dispose(); input.dispose(); ui.dispose(); renderer?.dispose();
  if (import.meta.env.DEV) delete (window as Window & { __curatorDebug?: unknown }).__curatorDebug;
}
window.addEventListener('pagehide', event => { if (!(event as PageTransitionEvent).persisted) dispose(); else pause(); }, { signal: lifetime.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);
if (import.meta.env.DEV) {
  // Read-only observations for playtests, never mutations or shortcuts.
  (window as Window & { __curatorDebug?: unknown }).__curatorDebug = () => {
    const supper = activeSupper();
    const sketch = activeSketch();
    const body = (supper ?? sketch)?.model.controller.body ?? null;
    return {
      scene: manager?.active?.id ?? null, transitioning: manager?.transitioning ?? false, paused,
      body: body ? { ...body } : null,
      museum: activeMuseum() ? { position: activeMuseum()!.camera.position.toArray(), rotation: activeMuseum()!.camera.rotation.toArray() } : null,
      session: { ...session }, completed: supper?.model.completed ?? false, campaign: progression.snapshot, updateCount, renderCount,
      sketch: sketch ? {
        mode: sketch.mode.kind, field: sketch.field.id,
        bay: sketch.mode.kind === 'bay' ? sketch.field.id : null,
        study: sketchMode, entryLeg: sketch.routeModel?.route.entryLegId ?? null,
        liftId: sketch.routeModel?.leg.lift?.id ?? null,
        lifts: sketch.routeModel?.liftViews().map(v => ({ id: v.id, state: v.state, progress: v.progress, walls: v.walls, active: v.active,
          left: v.deck.x, right: v.deck.x + v.deck.width, top: v.deck.y + v.deck.height })) ?? [],
        leg: sketch.routeModel?.legId ?? null,
        stage: sketch.routeModel?.stage ?? null,
        section: sketch.routeModel?.sectionId ?? null,
        transit: sketch.routeModel?.transitProgress ?? null,
        onDeck: sketch.routeModel?.onLiftDeck() ?? null,
        ride: sketch.routeModel?.rideElapsed ?? null,
        camera: sketch.cameraView(),
        nails: sketch.model.placedCount, available: sketch.model.availableNails,
        budget: sketch.model.nailBudget, pickup: sketch.model.pickupCollected,
        pickupOffered: !!sketch.model.nailPickup, reach: sketch.model.placementReach, freePlacement: sketch.model.freePlacement,
        queue: sketch.model.session.queue, oldest: sketch.model.oldestPlacement?.targetId ?? null,
        motion: { ...sketch.model.move },
        completed: sketch.model.completed, elapsed: sketch.model.session.elapsed,
        sun: sketch.routeModel?.route.sun ? { x: sketch.routeModel.route.sun.x, y: sketch.routeModel.route.sun.y,
          width: sketch.routeModel.route.sun.width, height: sketch.routeModel.route.sun.height,
          collected: sketch.routeModel.sunCollected, settled: sketch.routeModel.isSettled, view: sketch.sunView() } : null,
        recovering: sketch.model.recoveryRemaining > 0,
        targets: sketch.model.targetViews().map(t => ({ ...t, screen: sketch.targetScreen(t.id) })),
        grips: sketch.model.grips.map(g => ({ ...g })),
        nailSurfaces: sketch.model.surfaceViews().map(v => ({ ...v,
          screen: [0, 0.25, 0.5, 0.75, 1].map(offset => ({ offset, ...sketch.surfaceScreen(v.id, offset)!,
            reason: sketch.model.surfaceRefusal(v.id, offset) })) })),
        boards: sketch.model.mechanismView()
          .filter(v => v.kind === 'pendulum' || v.kind === 'board')
          .map(v => ({ id: v.id, x: v.x, left: v.x - v.width / 2, right: v.x + v.width / 2, top: v.y + v.height / 2, bottom: v.y - v.height / 2, pinned: v.pinned })),
        axes: sketch.model.mechanismView().filter(v => v.kind === 'axe'),
        dangerBounds: sketch.model.hazards.map(h => ({ ...h })),
        surfaces: sketch.model.solids
          .filter(s => !/left|right|bound/.test(s.id))
          .map(s => ({ id: s.id, left: s.x, right: s.x + s.width, top: s.y + s.height })),
      } : null,
      geometryCount: renderer?.info.memory.geometries ?? 0, canvasCount: document.querySelectorAll('canvas').length,
      textureCount: renderer?.info.memory.textures ?? 0,
      lowQuality: settings.quality === 'low', pixelRatio: renderer?.getPixelRatio(),
      audio: audio.diagnostics,
    };
  };
}
if (sketchStudy) void startSketch(false);
else if (isolated) void startSupper(false);
