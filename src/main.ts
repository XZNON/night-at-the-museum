import * as THREE from 'three';
import './style.css';
import { Progression } from './campaign/progression';
import { SaveStore, defaultSettings } from './campaign/save';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import { SceneManager, TRANSITION_INPUT_SETTLE_MS } from './core/scenes';
import { createSupperSession } from './gameplay/royal-supper-model';
import { movementLane, royalSupper } from './levels/royal-supper';
import { museum, type MuseumPose } from './levels/museum';
import { RoyalSupperScene } from './scenes/royal-supper';
import { MuseumScene } from './scenes/museum';
import { GameUi } from './ui/game-ui';

const root = document.querySelector<HTMLElement>('#app')!;
const parameters = new URLSearchParams(location.search);
let lane = import.meta.env.DEV && parameters.get('lane') === 'movement';
const isolated = import.meta.env.DEV && (parameters.get('scene') === 'royal-supper' || lane);
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
const lifetime = new AbortController();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const input = new Input(() => togglePause(), () => toggleDebug());
const ui = new GameUi(root, {
  start: () => { void (isolated ? startSupper(false) : enterMuseum()); },
  replay: () => { void startSupper(true); }, resume, leave: () => { void leave(); }, pause: () => pause(),
  checkpoint: () => { const scene = activeSupper(); if (!scene || manager?.transitioning) return; scene.model.restartCheckpoint(); resume(); },
  quality: low => { settings.quality = low ? 'low' : 'normal'; resize(); persist(); },
  volume: value => { settings.masterVolume = value; persist(); },
  debug: toggleDebug, lane: () => { lane = true; void startSupper(true, true); },
  reset: requestReset, confirmReset, cancelReset, closeInspection, place,
  look: () => { ui.canvas.focus(); activeMuseum()?.requestLook(); },
}, isolated);
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
function persist(): void { store?.write(progression.snapshot, settings); }
function activeSupper(): RoyalSupperScene | null { return manager?.active instanceof RoyalSupperScene ? manager.active : null; }
function activeMuseum(): MuseumScene | null { return manager?.active instanceof MuseumScene ? manager.active : null; }
function setPaused(value: boolean): void {
  paused = value; input.clear(); input.enabled = !value; loop?.setPaused(value);
  if (value) activeMuseum()?.suspend();
}
function pause(reason = 'Take a moment. The gallery will wait.'): void {
  if (!manager?.active || manager.transitioning || paused) return;
  setPaused(true); overlay = 'pause'; ui.pause(settings.quality === 'low', reason, settings);
}
function resume(): void {
  if (!manager?.active || manager.transitioning || document.hidden || overlay === 'reset' || overlay === 'inspection') return;
  overlay = 'none'; ui.play(activeMuseum() ? 'museum' : 'supper'); setPaused(false);
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
  const scene = activeSupper(); if (scene) scene.debug.visible = debugEnabled;
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
        diagnosticTime = seconds; const body = activeSupper()?.model.controller.body;
        ui.diagnostics(`scene: ${manager?.active?.id ?? 'menu'}  ${paused ? 'PAUSED' : '60 Hz simulation'}\n${(1000 / Math.max(frameMs, 0.1)).toFixed(0)} FPS / ${frameMs.toFixed(2)} ms (this browser)\ncheckpoint: ${session.checkpointId}\nx: ${body?.x.toFixed(2)} feet y: ${body?.y.toFixed(2)} grounded: ${body?.grounded}\nrender calls: ${renderer?.info.render.calls} geometries: ${renderer?.info.memory.geometries}\nF3: collision view`);
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
  try {
    const changed = await manager.transition(() => new MuseumScene(ui.canvas, pose,
      progression.snapshot.restoredPieceIds.includes('golden-pear'),
      () => !paused && !manager?.transitioning && performance.now() >= inputReadyAt,
      id => { if (id === 'masterpiece') inspect(); else if (id === royalSupper.id) void startSupper(false); },
      text => ui.museumPrompt(text)));
    if (changed) { inputReadyAt = performance.now() + TRANSITION_INPUT_SETTLE_MS; remembered = true; ui.museumState(progression.snapshot); ui.museumPrompt(''); resume(); }
  } catch (error) { showError(error); }
}
async function startSupper(restart: boolean, preserveLane = false): Promise<void> {
  if (disposed || manager?.transitioning || !initializeRenderer() || !manager) return;
  setPaused(true); overlay = 'none';
  if (restart) { session = createSupperSession(); if (!preserveLane) lane = false; }
  try {
    const changed = await manager.transition(() => {
      const scene = new RoyalSupperScene(lane ? movementLane : royalSupper, session,
        () => { const result = progression.applyCampaignCommand({ action: 'collect', artworkId: royalSupper.id, pieceId: royalSupper.pieceId }); if (result.changed) persist(); return result; },
        state => ui.updateHud(state), result => { setPaused(true); overlay = 'success'; ui.success(result); }, reducedMotion);
      scene.debug.visible = debugEnabled; return scene;
    });
    if (changed) { inputReadyAt = performance.now() + TRANSITION_INPUT_SETTLE_MS; remembered = true; resume(); }
  } catch (error) { showError(error); }
}
async function leave(): Promise<void> {
  if (!manager || manager.transitioning) return;
  if (!isolated) { await enterMuseum(museum.returnPose); return; }
  const finished = activeSupper()?.model.completed ?? false;
  setPaused(true); overlay = 'menu';
  try { await manager.transition(() => null); ui.diagnostics(null); if (finished) ui.finished(); else ui.menu(remembered); }
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
  persist(); activeMuseum()?.restoreColour(); ui.museumState(progression.snapshot); ui.inspection(progression.snapshot, !reducedMotion);
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
  ui.notice(''); store?.reset(); progression = new Progression(); settings = defaultSettings(); session = createSupperSession(); remembered = false; resize();
  overlay = 'none'; void enterMuseum();
}
function showError(error: unknown): void { setPaused(true); overlay = 'menu'; ui.error(error instanceof Error ? error.message : String(error)); }
function resize(): void {
  renderer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'low' ? 1 : 1.5)); manager?.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize, { signal: lifetime.signal });
window.addEventListener('blur', () => { input.clear(); pause('Focus was lost. Resume when you are ready.'); }, { signal: lifetime.signal });
document.addEventListener('visibilitychange', () => { if (document.hidden) { input.clear(); pause('The game paused while this tab was hidden.'); } }, { signal: lifetime.signal });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && activeMuseum()) pause('Mouse look released. Resume to continue; dragging also works.'); }, { signal: lifetime.signal });
ui.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); pause('Graphics context was lost. Reload if it cannot recover.'); }, { signal: lifetime.signal });
function dispose(): void {
  if (disposed) return;
  disposed = true; lifetime.abort(); loop?.dispose(); manager?.dispose(); input.dispose(); ui.dispose(); renderer?.dispose();
  if (import.meta.env.DEV) delete (window as Window & { __curatorDebug?: unknown }).__curatorDebug;
}
window.addEventListener('pagehide', event => { if (!(event as PageTransitionEvent).persisted) dispose(); else pause(); }, { signal: lifetime.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);
if (import.meta.env.DEV) {
  // Read-only observations for playtests, never mutations or shortcuts.
  (window as Window & { __curatorDebug?: unknown }).__curatorDebug = () => ({
    scene: manager?.active?.id ?? null, transitioning: manager?.transitioning ?? false, paused,
    body: activeSupper() ? { ...activeSupper()!.model.controller.body } : null,
    museum: activeMuseum() ? { position: activeMuseum()!.camera.position.toArray(), rotation: activeMuseum()!.camera.rotation.toArray() } : null,
    session: { ...session }, completed: activeSupper()?.model.completed ?? false, campaign: progression.snapshot, updateCount, renderCount,
    geometryCount: renderer?.info.memory.geometries ?? 0, canvasCount: document.querySelectorAll('canvas').length,
    textureCount: renderer?.info.memory.textures ?? 0,
    lowQuality: settings.quality === 'low', pixelRatio: renderer?.getPixelRatio(),
  });
}
if (isolated) void startSupper(false);
