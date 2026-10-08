import type { CampaignResult } from '../campaign/progression';
import type { SupperHud } from '../scenes/royal-supper';
import type { CampaignState } from '../campaign/progression';
import type { Settings } from '../campaign/save';
import { masterpieceImage } from './masterpiece';
import { runtimeAssets, runtimeAssetUrl, type ArtId } from '../assets/manifest';
import { isComplete, nextPlacement } from '../campaign/placement';
import { museum } from '../levels/museum';
import type { SketchHud } from '../gameplay/sketch-model';
import type { SketchBayId, SketchStudy } from '../levels/unfinished-sketch';
import { sketchBayList } from '../levels/unfinished-sketch';

export interface UiActions {
  start(): void; replay(): void; resume(): void; leave(): void;
  pause(): void; checkpoint(): void; quality(low: boolean): void;
  debug(): void; lane(): void;
  reset(): void; confirmReset(): void; cancelReset(): void;
  closeInspection(): void; place(piece: string, target: string): void;
  ending(): void; stay(): void;
  look(): void; volume(value: number): void;
  retry(): void; back(): void;
  sketchBay(id: SketchBayId): void;
}

export class GameUi {
  readonly canvas: HTMLCanvasElement;
  private readonly modal: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly controller = new AbortController();
  private mode: 'menu' | 'pause' | 'success' | 'finished' | 'inspection' | 'ending' | 'reset' | 'none' | 'loading' = 'menu';
  private collection: CampaignResult | null = null;
  private hudCache = '';
  private sketchHudCache = '';
  private selectedPiece = '';
  private context: 'museum' | 'supper' | 'sketch' = 'supper';
  /** The Sketch is the campaign's second adventure (S5B), not a dev study. */
  private sketchCampaign = false;

  constructor(root: HTMLElement, private readonly actions: UiActions, private readonly direct: boolean,
    private readonly study: 'supper' | 'sketch' = 'supper', private sketchMode: SketchStudy = 'mechanics') {
    root.innerHTML = `
      <canvas id="world" tabindex="0" aria-label="Royal Supper. A or D to move, Space to jump, E to interact, R for checkpoint, Escape to pause."></canvas>
      <div class="vignette" aria-hidden="true"></div>
      <section id="hud" class="hud" hidden aria-label="Adventure status">
        <header class="hud-top"><div><span class="eyebrow">The Last Curator</span><h1>Royal Supper</h1><span id="section-name" class="section-name"></span></div>
          <button data-action="pause" class="quiet">Pause <kbd>Esc</kbd></button></header>
        <div class="route-status"><span id="fork-state"></span><span id="candle-state"></span><span id="diner-state"></span><span id="jump-state"></span></div>
        <p id="section-hint" class="section-hint"></p>
        <div class="bottom-hud"><div class="controls"><span><kbd>A</kbd><kbd>D</kbd> move</span><span><kbd>Space</kbd> jump ×2</span><span><kbd>E</kbd> interact</span><span><kbd>R</kbd> checkpoint</span></div>
          <span id="checkpoint" class="checkpoint"></span></div>
        <div id="prompt" class="prompt" hidden></div><div id="cue" class="cue" role="status" aria-live="polite"></div>
      </section>
      <section id="sketch-hud" class="hud" hidden aria-label="Sketch status">
        <header class="hud-top"><div><span id="sketch-eyebrow" class="eyebrow">The Last Curator</span><h1>Unfinished Sketch</h1><span id="sketch-bay-name" class="section-name"></span></div><button data-action="pause" class="quiet">Pause <kbd>Esc</kbd></button></header>
        <div class="sketch-status"><span id="sketch-layer"></span><span id="sketch-nails"></span><span id="sketch-oldest"></span><span id="sketch-nearest"></span><span id="sketch-motion"></span></div>
        <p id="sketch-hint" class="section-hint"></p>
        <div id="sketch-bays" class="sketch-bays">${sketchBayList.map((bay, i) => `<button class="quiet" data-action="bay" data-bay="${bay.id}">${i + 1} ${bay.name.split(' · ')[1]}</button>`).join('')}</div>
        <div class="bottom-hud"><div class="controls"><span><kbd>A</kbd><kbd>D</kbd> move / pump</span><span><kbd>Space</kbd> jump · kick · release</span><span>Left click pins a nail</span><span><kbd>Q</kbd> recall oldest</span><span><kbd>E</kbd> grab a nail</span><span><kbd>R</kbd> retry</span></div><span id="sketch-goal" class="checkpoint"></span></div>
        <span id="sketch-endpoint" class="sketch-endpoint" hidden></span>
        <div id="sketch-prompt" class="prompt" hidden></div><div id="sketch-cue" class="cue" role="status" aria-live="polite"></div>
      </section>
      <section id="modal" class="modal" aria-label="Game menu"></section>
      <section id="museum-hud" class="hud" hidden aria-label="Museum status">
        <header class="hud-top"><div><span class="eyebrow">The Last Curator</span><h1>The quiet gallery</h1><span id="objective" class="section-name"></span></div><div><button data-action="look" class="quiet">Mouse look</button><button data-action="pause" class="quiet">Pause <kbd>Esc</kbd></button></div></header>
        <div class="reticle" aria-hidden="true">+</div><div id="museum-prompt" class="prompt" hidden></div>
        <div class="bottom-hud"><div class="controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk</span><span>Drag to look · Click / <kbd>E</kbd> frame</span></div><span id="inventory" class="inventory"></span></div>
      </section>
      <aside id="save-notice" class="save-notice" role="status" hidden></aside>
      <aside id="diagnostics" class="diagnostics" hidden></aside>
      <span class="build-tag">${this.tagLabel()}</span>`;
    this.canvas = root.querySelector<HTMLCanvasElement>('#world')!;
    this.modal = root.querySelector<HTMLElement>('#modal')!;
    this.hud = root.querySelector<HTMLElement>('#hud')!;
    root.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      switch (target.dataset.action) {
        case 'bay': this.actions.sketchBay(target.dataset.bay as SketchBayId); break;
        case 'start': this.actions.start(); break;
        case 'retry': this.actions.retry(); break;
        case 'back': this.actions.back(); break;
        case 'replay': this.actions.replay(); break;
        case 'resume': this.actions.resume(); break;
        case 'leave': this.actions.leave(); break;
        case 'pause': this.actions.pause(); break;
        case 'checkpoint': this.actions.checkpoint(); break;
        case 'debug': this.actions.debug(); break;
        case 'lane': this.actions.lane(); break;
        case 'reset': this.actions.reset(); break;
        case 'confirm-reset': this.actions.confirmReset(); break;
        case 'cancel-reset': this.actions.cancelReset(); break;
        case 'close-inspection': this.actions.closeInspection(); break;
        case 'look': this.actions.look(); break;
        case 'piece': this.selectedPiece = target.dataset.piece ?? ''; target.setAttribute('aria-pressed', 'true');
          this.placementMessage(this.selectedPiece === 'sun-disc' ? 'Enchanted light selected. Choose the dark sky’s empty sun.' : 'Golden pear selected. Choose the pear silhouette.'); break;
        case 'target': this.actions.place(this.selectedPiece, target.dataset.target ?? ''); break;
        // A click elsewhere on the painting with a piece selected keeps the piece.
        case 'invalid-drop': if (this.selectedPiece) this.actions.place(this.selectedPiece, ''); break;
        case 'see-ending': this.actions.ending(); break;
        case 'stay': this.actions.stay(); break;
      }
    }, { signal: this.controller.signal });
    root.addEventListener('change', event => {
      const target = event.target as HTMLInputElement;
      if (target.id === 'low-quality') this.actions.quality(target.checked);
      if (target.id === 'master-volume') this.actions.volume(Number(target.value));
    }, { signal: this.controller.signal });
    root.addEventListener('dragstart', event => {
      const piece = (event.target as HTMLElement).closest<HTMLElement>('[data-piece]');
      if (!piece || !event.dataTransfer) return;
      this.selectedPiece = piece.dataset.piece ?? '';
      event.dataTransfer.setData('text/plain', this.selectedPiece); event.dataTransfer.effectAllowed = 'move';
    }, { signal: this.controller.signal });
    root.addEventListener('dragover', event => { if ((event.target as HTMLElement).closest('.painting-study')) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; } }, { signal: this.controller.signal });
    root.addEventListener('drop', event => {
      const painting = (event.target as HTMLElement).closest('.painting-study'); if (!painting) return;
      event.preventDefault();
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-target]');
      this.actions.place(event.dataTransfer?.getData('text/plain') ?? '', target?.dataset.target ?? '');
    }, { signal: this.controller.signal });
    root.addEventListener('keydown', event => {
      if (this.mode === 'none' || event.key !== 'Tab') return;
      const focusable = [...this.modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !this.modal.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !this.modal.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }, { signal: this.controller.signal });
    this.menu(false);
  }

  private tagLabel(): string {
    // The campaign never shows study tags, also while it plays the Sketch.
    if (!this.direct) return 'THE LAST CURATOR';
    const base = this.study !== 'sketch' ? 'ROYAL SUPPER STUDY'
      : this.sketchMode === 'adventure' ? 'UNFINISHED SKETCH / S5A / THE LIGHT'
      : this.sketchMode === 'layers-1-3' ? 'UNFINISHED SKETCH / S4D / LAYERS 1–3'
      : this.sketchMode === 'layer-3' ? 'UNFINISHED SKETCH / S4C / JOINED LAYER 3'
      : this.sketchMode === 'layer-3-swings' ? 'UNFINISHED SKETCH / S4B / MOVING SWINGS'
      : this.sketchMode === 'layer-3-walls' ? 'UNFINISHED SKETCH / S4A / WALL CLIMB'
      : this.sketchMode === 'layers-1-2' ? 'UNFINISHED SKETCH / JOINED LAYERS (S3)'
      : this.sketchMode === 'layer-2' ? 'UNFINISHED SKETCH · LAYER 2 (S3)'
      : this.sketchMode === 'layer-1' ? 'UNFINISHED SKETCH · LAYER 1 (SLICE 2)' : 'UNFINISHED SKETCH · SLICE 1 PLAYGROUND';
    return `${base}${this.direct ? ' · ISOLATED DEV SESSION' : ''}`;
  }
  private show(mode: typeof this.mode, content: string): void {
    this.mode = mode;
    this.hud.hidden = true;
    document.getElementById('museum-hud')!.hidden = true;
    document.getElementById('sketch-hud')!.hidden = true;
    this.modal.classList.remove('inspection-modal', 'ending-modal');
    this.modal.hidden = false;
    this.modal.innerHTML = `<div class="menu-card">${content}</div>`;
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.querySelector<HTMLElement>('button')?.focus();
  }
  menu(remembered: boolean, complete = false): void {
    this.hud.hidden = true;
    document.getElementById('museum-hud')!.hidden = true;
    document.getElementById('sketch-hud')!.hidden = true;
    if (!this.direct) {
      this.show('menu', `<div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">The Last Curator / A restoration study</p><h2>The garden<br><em>before dawn.</em></h2><p class="intro">A quiet museum.<br>A borrowed golden pear.<br>A garden waiting for colour.</p><p class="menu-description">Walk to the frames, step into the paintings and bring the missing pieces home.</p><button class="primary" data-action="start" aria-label="${remembered ? 'Continue' : 'New Game'}">${remembered ? 'Continue' : 'New Game'} <span>→</span></button>${remembered ? '<button class="quiet" data-action="reset">New Game / reset progress</button>' : ''}<div class="menu-controls"><kbd>WASD</kbd> Walk · Drag to look · Click frame</div><p class="small-note">${complete ? 'The Garden Before Dawn is complete. Both paintings stay open to replay.' : 'Royal Supper and the Unfinished Sketch are playable.<br>Restore the masterpiece to reach the ending.'}</p>`);
      return;
    }
    if (this.study === 'sketch') {
      if (this.sketchMode === 'adventure') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">The Last Curator / S5A / Unfinished Sketch</p>
        <h2>Claim<br><em>the light.</em></h2><p class="intro">An unfinished picture.<br>Three layers to climb.<br>An enchanted light waits in a torch.</p>
        <p class="menu-description">Pin the swinging pendulums and ride the lift. Cross the boards past the axes and ride up again. Pick up a third nail, climb the criss-cross walls, then nail wood and swing over the glue. On the end ledge, walk to the torch and claim its enchanted light. A fall only sends you back to the start of the part you are in.</p>
        <button class="primary" data-action="start">Enter the picture</button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart the Sketch</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move / pump · <kbd>Space</kbd> Jump ×2 / kick / release · <kbd>E</kbd> Grip · Click pin or wood · <kbd>Q</kbd> Recall · <kbd>R</kbd> Retry</div>
        <p class="small-note">Isolated study · Campaign saves are untouched.</p>`);
        return;
      }
      if (this.sketchMode === 'layers-1-3') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">The Last Curator / S4D / Layers 1–3</p>
        <h2>The whole<br><em>picture.</em></h2><p class="intro">Four pendulums. Boards and axes.<br>Two lifts. Six walls.<br>Two moving swings.</p>
        <p class="menu-description">Climb Layer 1 and step onto its lift. Cross Layer 2 to the left, walk to the far end and ride the second lift. On Layer 3, pick up the third nail and climb the criss-cross walls; landing on the high ledge takes it back. Then nail wood anywhere and swing over the glue onto the end ledge. A fall retries only the section you are in.</p>
        <button class="primary" data-action="start">Enter the picture</button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart Layers 1–3</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move / pump · <kbd>Space</kbd> Jump ×2 / kick / release · <kbd>E</kbd> Grip · Click pin or wood · <kbd>Q</kbd> Recall · <kbd>R</kbd> Retry</div>
        <p class="small-note">Campaign saves are untouched. Stop at the fixed end ledge for S4D review.</p>`);
        return;
      }
      if (this.sketchMode === 'layer-3') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">The Last Curator / S4C / Joined Layer 3</p>
        <h2>Walls, then<br><em>swings.</em></h2><p class="intro">Six walls to climb.<br>A glue pool to cross.<br>One Layer 3.</p>
        <p class="menu-description">Pick up the third nail and climb the criss-cross walls: pin ahead, kick across, Q frees the oldest. From F, kick right over E onto the ledge. Landing there clears the climb and takes the third nail back. Then nail wood anywhere: strip F for a step, bar M1 and bar M2 for grips, and swing onto the end ledge. A fall during the crossing keeps the climb clear.</p>
        <button class="primary" data-action="start">Enter Layer 3</button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart Layer 3</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move / pump · <kbd>Space</kbd> Jump / kick / release · <kbd>E</kbd> Grip · Click pin or wood · <kbd>Q</kbd> Recall · <kbd>R</kbd> Retry</div>
        <p class="small-note">Campaign saves are untouched. Stop at the fixed end ledge for S4C review.</p>`);
        return;
      }
      if (this.sketchMode === 'layer-3-swings') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">The Last Curator / S4B / Layer 3 swings</p>
        <h2>Moving<br><em>swings.</em></h2><p class="intro">Glue below.<br>Two sliding bars.<br>Two nails, anywhere on wood.</p>
        <p class="menu-description">No marked rings here: click anywhere along a wooden strip or bar to drive a nail, never into air. A nail in strip F grows a step. A nail in a bar is a grip the bar carries. Nail F and stand on it, nail M1, jump close and press E. While swinging, Q frees F so you can nail M2. Release, grip M2, then swing onto the end ledge. Where you nail decides what you can reach.</p>
        <button class="primary" data-action="start">Enter the swing crossing</button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart swing crossing</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move / pump · <kbd>Space</kbd> Jump / release · <kbd>E</kbd> Grip / release · Click wood · <kbd>Q</kbd> Recall</div>
        <p class="small-note">Campaign saves are untouched. Stop at the fixed S4B end ledge for review.</p>`);
        return;
      }
      if (this.sketchMode === 'layer-3-walls') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">The Last Curator / S4A / Layer 3 walls</p>
        <h2>Criss-cross<br><em>walls.</em></h2><p class="intro">Six moving outlines.<br>A third nail on the way.<br>Kick from wall to wall.</p>
        <p class="menu-description">Pin A and B, pick up the third nail as you run right, and jump onto A. Space kicks you across to the opposite wall. A catch holds you for a moment, then you slide fast, so keep kicking. Keep the board ahead pinned: Q frees the oldest nail and you click the next board up. From F, kick right over E onto the ledge. Outlines cannot hold you.</p>
        <button class="primary" data-action="start">Enter the wall climb</button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart wall climb</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move · <kbd>Space</kbd> Jump / kick · Click pin · <kbd>Q</kbd> Recall · <kbd>R</kbd> Retry</div>
        <p class="small-note">Campaign saves are untouched. Stop at the fixed S4A endpoint for review.</p>`);
        return;
      }
      if (this.sketchMode === 'layers-1-2') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">The Last Curator / S3 / Joined layers</p>
        <h2>One picture.<br><em>Two lifts.</em></h2><p class="intro">Four pendulums.<br>Three boards and two axes.<br>Two nails to reuse.</p>
        <p class="menu-description">Climb Layer 1 and step onto its lift. Cross Layer 2 to the left, walk to the far end and ride the second lift to safe Layer 3 ground. Falling retries your current layer.</p>
        <button class="primary" data-action="start">Continue the picture</button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart Layers 1 &amp; 2</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move / <kbd>Space</kbd> Jump x2 / Click pin / <kbd>Q</kbd> Recall / <kbd>R</kbd> Retry</div>
        <p class="small-note">Campaign saves are untouched. Stop on safe Layer 3 ground for review.</p>`);
        return;
      }
      if (this.sketchMode === 'layer-2') {
        this.show('menu', `<div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">The Last Curator / S3 · Layer 2</p>
        <h2>Boards &amp;<br><em>axes.</em></h2><p class="intro">Three moving boards.<br>Two nails.<br>Axes that keep turning.</p>
        <p class="menu-description">Moving outlines cannot hold you. Pin A and B, then recall A with Q to ink C. Narrow landings and fast red blades demand timed double jumps. Reach fixed ground, then walk left to the lift and step on to ride to Layer 3.</p>
        <button class="primary" data-action="start">Enter Layer 2 <span>←</span></button>
        ${remembered ? '<button class="quiet" data-action="replay">Restart Layer 2</button>' : ''}
        <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move · <kbd>Space</kbd> Jump ×2 · Left click pin · <kbd>Q</kbd> Recall · <kbd>R</kbd> Retry</div>
        <p class="small-note">Campaign saves are untouched. This study ends on safe Layer 3 ground.</p>`);
        return;
      }
      if (this.sketchMode === 'layer-1') {
        this.show('menu', `
      <div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">The Last Curator / Slice 2 · Layer 1</p>
      <h2>Four<br><em>pendulums.</em></h2><p class="intro">One unfinished picture.<br>Two nails.<br>Three layers to climb.</p>
      <p class="menu-description">Start at the bottom left. Pin a pendulum, land on it, pin the next, then press Q so the oldest nail frees one for the third. Each target is only in reach from the platform you just reached, so the reuse cannot be skipped. The lift at the right end of the exit ground carries you up to a safe Layer 2 landing.</p>
      <button class="primary" data-action="start">Enter Layer 1 <span>→</span></button>
      ${remembered ? '<button class="quiet" data-action="replay">Restart the route</button>' : ''}
      <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move <span>·</span> <kbd>Space</kbd> Jump ×2 <span>·</span> Left click pin <span>·</span> <kbd>Q</kbd> Recall <span>·</span> <kbd>R</kbd> Retry</div>
      <p class="small-note">Isolated development route · Campaign saves are untouched.<br>Layer 2's challenge, the second lift and Layer 3 are scenery only in this study.</p>`);
        return;
      }
      this.show('menu', `
      <div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">The Last Curator / Slice 1 · mechanics playground</p>
      <h2>Unfinished<br><em>Sketch.</em></h2><p class="intro">Two nails.<br>One picture still deciding<br>where its pieces go.</p>
      <p class="menu-description">Six independent bays prove the FIFO nail ledger, frozen boards, active axes, pinned-wall slides, foothold nail heads and direct nail swinging — with no rope anywhere.</p>
      <button class="primary" data-action="start">Enter the playground <span>→</span></button>
      ${remembered ? '<button class="quiet" data-action="replay">Restart adventure</button>' : ''}
      <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move / pump · <kbd>Space</kbd> Jump / release · <kbd>E</kbd> Grip / release · Click pin · <kbd>Q</kbd> Recall</div>
      <p class="small-note">Isolated development study · Campaign saves are untouched.</p>`);
      return;
    }
    this.show('menu', `
      <div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">The Last Curator / Study No. 01</p>
      <h2>Royal<br><em>Supper.</em></h2><p class="intro">A small restorer.<br>A very grand table.<br>One missing golden pear.</p>
      <p class="menu-description">Double jump across a long banquet. Slide over butter, dodge grapes, follow the fan’s three ember windows, hide from diners and bounce up to the pear.</p>
      <button class="primary" data-action="start">${remembered ? 'Continue the painting' : 'Enter the painting'} <span>→</span></button>
      ${remembered ? '<button class="quiet" data-action="replay">Restart adventure</button>' : ''}
      <div class="menu-controls"><kbd>A</kbd><kbd>D</kbd> Move <span>·</span> <kbd>Space</kbd> Jump <span>·</span> <kbd>E</kbd> Interact</div>
      <p class="small-note">Isolated development study · Campaign saves are untouched.<br>Open the normal entry for the museum/restoration loop.</p>
      ${import.meta.env.DEV ? '<div class="dev-actions"><button class="quiet" data-action="lane">Movement test lane</button></div>' : ''}`);
  }
  play(context: 'museum' | 'supper' | 'sketch' = 'supper'): void {
    this.context = context;
    this.mode = 'none'; this.modal.hidden = true; this.hud.hidden = context !== 'supper';
    document.getElementById('museum-hud')!.hidden = context !== 'museum';
    document.getElementById('sketch-hud')!.hidden = context !== 'sketch';
    this.canvas.setAttribute('aria-label', context === 'museum' ? 'Museum. WASD to walk, drag to look, click or E on a nearby frame, Escape to pause.' : context === 'sketch' ? 'Unfinished Sketch. A/D move or pump, Space jump or release, E grip or board, click pin, Q recalls oldest, R retry, Escape pause.' : 'Royal Supper. A or D to move, Space to jump, E to interact, R for checkpoint, Escape to pause.');
    this.canvas.focus({ preventScroll: true });
  }
  markSketch(mode: SketchStudy, bayId: SketchBayId, campaign = false): void {
    this.sketchMode = mode; this.sketchCampaign = campaign;
    document.getElementById('sketch-hud')!.dataset.study = mode;
    document.getElementById('sketch-eyebrow')!.textContent = campaign ? 'The Last Curator' : mode === 'adventure' ? 'Unfinished Sketch / S5A / The light' : mode === 'layers-1-3' ? 'Unfinished Sketch / S4D / Layers 1–3' : mode === 'layer-3' ? 'Unfinished Sketch / S4C / Joined Layer 3' : mode === 'layer-3-swings' ? 'Unfinished Sketch / S4B / Layer 3 swings' : mode === 'layer-3-walls' ? 'Unfinished Sketch / S4A / Layer 3 walls' : mode === 'layers-1-2' ? 'Unfinished Sketch / S3 / Joined layers' : mode === 'layer-2' ? 'Unfinished Sketch / S3 · Layer 2' : mode === 'layer-1'
      ? 'The Last Curator · Slice 2 · Layer 1 of the unfinished picture' : 'The Last Curator · Slice 1 mechanics playground';
    document.getElementById('sketch-bays')!.hidden = mode !== 'mechanics';
    const tag = document.querySelector<HTMLElement>('.build-tag');
    if (tag) tag.textContent = this.tagLabel();
    if (mode === 'mechanics') this.markBay(bayId);
  }
  markBay(bayId: SketchBayId): void {
    if (this.sketchMode !== 'mechanics') return;
    for (const button of document.querySelectorAll<HTMLElement>('#sketch-bays [data-bay]')) {
      button.classList.toggle('active', button.dataset.bay === bayId);
    }
  }
  updateSketchHud(state: SketchHud): void {
    const serialized = JSON.stringify(state);
    if (serialized === this.sketchHudCache) return;
    this.sketchHudCache = serialized;
    const text = (id: string, value: string) => { const el = document.getElementById(id)!; if (el.textContent !== value) el.textContent = value; };
    text('sketch-bay-name', state.bayName); text('sketch-hint', state.hint);
    text('sketch-nails', `Nails · ${state.nails}`); text('sketch-oldest', state.oldest);
    text('sketch-nearest', state.nearest); text('sketch-motion', state.swing ? `Swing · ${state.swing}` : `Motion · ${state.motion}`);
    text('sketch-goal', state.checkpoint ?? (state.completed ? 'Goal reached · press R to retry' : state.goal));
    text('sketch-layer', state.layer ?? ''); document.getElementById('sketch-layer')!.hidden = !state.layer;
    // The full route switches to the compact Layer 3 layout once it gets there.
    document.getElementById('sketch-hud')!.dataset.layer = state.layer?.charAt(0) ?? '';
    text('sketch-endpoint', state.endpoint ?? ''); document.getElementById('sketch-endpoint')!.hidden = !state.endpoint;
    text('sketch-prompt', state.prompt ?? ''); document.getElementById('sketch-prompt')!.hidden = !state.prompt;
    text('sketch-cue', state.cue); this.markBay(state.bay as SketchBayId);
  }
  pause(lowQuality: boolean, reason: string, settings?: Settings): void {
    const sketch = this.context === 'sketch';
    const adventure = this.context === 'supper' || sketch;
    const route = sketch && this.sketchMode !== 'mechanics';
    this.show('pause', `<p class="eyebrow">A moment between brushstrokes</p><h2 class="compact">Paused.</h2>
      <p class="menu-description">${reason}</p><button class="primary" data-action="resume">Resume <span>→</span></button>
      ${adventure ? `<button class="secondary" data-action="checkpoint">${route ? 'Back to the last safe checkpoint' : sketch ? 'Restart bay' : 'Restart from checkpoint'}</button>
      <button class="quiet" data-action="replay">${route ? this.sketchCampaign ? 'Restart adventure' : this.sketchMode === 'adventure' ? 'Restart the Sketch' : `Restart ${this.sketchMode === 'layers-1-3' ? 'Layers 1–3' : this.sketchMode === 'layer-3' ? 'Layer 3' : this.sketchMode === 'layer-3-swings' ? 'swing crossing' : this.sketchMode === 'layer-3-walls' ? 'wall climb' : this.sketchMode === 'layers-1-2' ? 'Layers 1 &amp; 2' : this.sketchMode === 'layer-2' ? 'Layer 2' : 'Layer 1'}` : 'Restart adventure'}</button><button class="quiet" data-action="leave">${this.direct ? 'Leave painting' : 'Return to Museum'}</button>` : ''}
      <label class="setting"><input type="checkbox" id="low-quality" ${lowQuality ? 'checked' : ''}> Low rendering quality</label>
      <label class="setting">Master volume <input id="master-volume" type="range" min="0" max="1" step="0.05" value="${settings?.masterVolume ?? 0.7}"></label>
      ${!this.direct ? '<button class="quiet" data-action="reset">Reset progress</button>' : ''}
      ${import.meta.env.DEV ? '<button class="quiet" data-action="debug">Toggle collision view · F3</button>' : ''}
      <p class="small-note">${route ? 'Retries are unlimited. Falling or R returns to the last safe checkpoint. Leaving and re-entering resumes that checkpoint; reloading restarts the route.' : sketch ? 'Every retry resets the current bay to two available nails and an empty queue.' : this.context === 'supper' ? 'Unlimited retries. Each hard section ends at a checkpoint. Falls keep the fork; timed hazards restart. Restart adventure preserves your pear.' : 'Drag to look or use Mouse look for pointer lock.'}<br>Sound follows Master volume. Visual cues work with sound muted.</p>`);
  }
  success(result: CampaignResult): void {
    this.collection = result;
    this.show('success', `<div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">A piece recovered</p><h2 class="compact">The golden<br><em>pear.</em></h2>
      <p class="menu-description">${result.changed ? 'The king’s dessert belongs in the masterpiece. The golden pear is now in your inventory.' : 'A lovely return visit. The golden pear is already yours; replay adds no duplicate.'}</p>
      <button class="primary" data-action="leave" aria-label="${this.direct ? 'Finish blockout' : 'Return to Museum'}">${this.direct ? 'Finish blockout' : 'Return to Museum'} <span>→</span></button>
      <button class="secondary" data-action="resume">Continue exploring</button><p class="small-note">${this.direct ? 'Isolated development session. Campaign saves are untouched.'
        : result.restoredPieceIds.includes('golden-pear') ? 'The golden pear already hangs in the masterpiece.' : 'Your pear is in inventory. Walk to the masterpiece to place it.'}</p>`);
  }
  /**
   * The light is claimed. The isolated study (no result) has no campaign award
   * to report; the campaign reports whether the claim added the piece.
   */
  sketchSuccess(result?: CampaignResult): void {
    if (result) {
      this.show('success', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">A piece recovered</p><h2 class="compact">The enchanted<br><em>light.</em></h2>
      <p class="menu-description">${result.changed ? 'The light leaves the torch and is yours. Carry it to the masterpiece: it will light the garden’s dawn sky.' : 'A lovely return visit. The enchanted light is already yours; replay adds no duplicate.'}</p>
      <button class="primary" data-action="leave" aria-label="Return to Museum">Return to Museum <span>→</span></button>
      <button class="secondary" data-action="resume">Keep exploring</button><p class="small-note">${result.changed ? 'The enchanted light is in your inventory.' : 'Nothing new was added to your inventory.'}</p>`);
      return;
    }
    this.show('success', `<div class="menu-mark" aria-hidden="true">*</div><p class="eyebrow">A piece recovered</p><h2 class="compact">The enchanted<br><em>light.</em></h2>
      <p class="menu-description">The light leaves the torch and is yours. The unfinished picture settles.</p>
      <button class="primary" data-action="leave" aria-label="Return">Return <span>→</span></button>
      <button class="secondary" data-action="resume">Keep exploring</button><p class="small-note">Isolated study · Campaign saves are untouched.</p>`);
  }
  finished(): void {
    this.hud.hidden = true;
    this.show('finished', `<div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">Royal Supper / Blockout complete</p>
      <h2 class="compact">A path<br><em>restored.</em></h2><p class="menu-description">Fork bridged. Three timed flames crossed. Diner evaded. Golden pear recovered${this.collection?.changed === false ? ' again' : ''}.</p>
      <button class="primary" data-action="replay">Replay the painting <span>→</span></button><button class="quiet" data-action="start">Re-enter at your checkpoint</button>
      <p class="small-note">Open the normal entry for the museum/restoration loop.<br>This isolated study keeps progress in memory until reload.</p>`);
  }
  error(message: string): void {
    this.hud.hidden = true;
    this.show('menu', '<p class="eyebrow">The painting could not open</p><h2 class="compact">A blank canvas.</h2><p class="menu-description" id="error-message"></p><button class="primary" data-action="retry">Retry <span>→</span></button><button class="secondary" data-action="back">Back</button>');
    this.modal.querySelector('#error-message')!.textContent = message;
  }
  loading(): void { this.show('loading', '<p class="eyebrow">Opening a painting</p><h2 class="compact">Between<br><em>brushstrokes.</em></h2><p class="menu-description" role="status">Preparing the artwork…</p>'); }
  updateHud(state: SupperHud): void {
    const serialized = JSON.stringify(state);
    if (serialized === this.hudCache) return;
    this.hudCache = serialized;
    const text = (id: string, value: string) => { const el = document.getElementById(id)!; if (el.textContent !== value) el.textContent = value; };
    text('section-name', state.section);
    text('fork-state', `Fork · ${state.fork === 'bridged' ? 'bridge ready' : state.fork === 'toppling' ? 'toppling…' : 'upright'}`);
    text('candle-state', `Candles · ${state.candle}`);
    text('diner-state', `Diner · ${state.diner}`);
    text('jump-state', state.jump);
    text('section-hint', state.hint);
    document.getElementById('fork-state')!.hidden = !state.section.includes('fork');
    document.getElementById('candle-state')!.hidden = !state.section.includes('candles');
    document.getElementById('diner-state')!.hidden = !state.section.includes('diner');
    text('checkpoint', `Checkpoint / ${state.checkpoint.replaceAll('-', ' ')}`);
    text('prompt', state.prompt); document.getElementById('prompt')!.hidden = !state.prompt;
    text('cue', state.cue);
  }
  diagnostics(text: string | null): void {
    const el = document.getElementById('diagnostics')!; el.hidden = text === null;
    if (text !== null) el.textContent = text;
  }
  notice(text: string): void { const el = document.getElementById('save-notice')!; el.textContent = text; el.hidden = !text; }
  museumState(state: CampaignState): void {
    const restored = state.restoredPieceIds.includes('golden-pear');
    const owned = state.collectedPieceIds.includes('golden-pear') && !restored;
    const lightRestored = state.restoredPieceIds.includes('sun-disc');
    const light = state.collectedPieceIds.includes('sun-disc') && !lightRestored;
    // Player-facing: the stage-2 piece `sun-disc` is the enchanted light.
    const items = [owned ? 'Golden pear' : '', light ? `<img class="piece-icon" src="${artUrl('restoration.light')}" alt="">Enchanted light` : ''].filter(Boolean);
    document.getElementById('inventory')!.innerHTML = `Inventory · ${items.length ? items.join(' · ') : 'Empty'}`;
    document.getElementById('objective')!.textContent = isComplete(state) ? 'The Garden Before Dawn is complete'
      : light ? 'Bring the light to the masterpiece'
      : restored ? 'Claim the enchanted light in the Unfinished Sketch'
      : owned ? 'Bring the golden pear to the masterpiece' : 'Inspect the masterpiece · Find its missing pear in Royal Supper';
  }
  museumPrompt(text: string): void { const el = document.getElementById('museum-prompt')!; el.textContent = text; el.hidden = !text; }
  /**
   * The masterpiece up close for every campaign state. Only the next stage's
   * owned piece is offered; `animate` plays the colour restore (never under
   * reduced motion), with a warm glow from the sun when the light was placed.
   */
  inspection(state: CampaignState, animate = false): void {
    this.selectedPiece = '';
    const count = state.restoredPieceIds.length;
    const complete = isComplete(state);
    const pearRestored = state.restoredPieceIds.includes('golden-pear');
    const lightRestored = state.restoredPieceIds.includes('sun-disc');
    const next = nextPlacement(state);
    const held = next.reason === null ? next.stage.pieceId : null;
    const pear = museum.targets.pear; const sun = museum.targets.sun;
    const style = (t: typeof pear | typeof sun) => `left:${t.left}%;top:${t.top}%;width:${t.width}%;height:${t.height}%`;
    const piece = (id: string, art: ArtId, label: string) => `<button class="piece-button" data-action="piece" data-piece="${id}" draggable="true" aria-pressed="false"><img class="inventory-art" src="${artUrl(art)}" alt="" draggable="false"> ${label}</button>`;
    const message = complete ? 'The enchanted light rises as the garden’s sun. The Garden Before Dawn is complete.'
      : held === 'sun-disc' ? 'Drag the enchanted light into the dark sky, or select it and activate the sky. Tab / Enter also works.'
      : pearRestored ? 'Colour restored. Next: climb the Unfinished Sketch on the left wall and claim its enchanted light.'
      : held === 'golden-pear' ? 'Drag the pear onto its silhouette, or select it and activate the target. Tab / Enter also works.'
      : 'The king has borrowed the golden pear. Look inside Royal Supper.';
    const alt = complete ? 'A traveller under a pear tree in a garden at dawn, its sun risen and every colour restored.'
      : `A traveller under a pear tree in a garden before dawn, its sky still waiting for light. ${pearRestored ? 'The tree and garden have regained colour.' : 'The pear and garden are grey.'}`;
    this.show('inspection', `<p class="eyebrow">Masterpiece / Close inspection</p><h2 class="compact">The Garden Before Dawn</h2>
      <div class="painting-study ${animate ? 'restoring' : ''}" data-action="invalid-drop"><img alt="${alt}" src="${masterpieceImage(count)}">
      ${animate && lightRestored ? `<span class="sun-glow" aria-hidden="true" style="left:${sun.left + sun.width / 2}%;top:${sun.top + sun.height / 2}%"></span>` : ''}
      <button id="pear-target" class="restoration-target ${pearRestored ? 'placed' : ''}" data-action="target" data-target="golden-pear" style="${style(pear)}" aria-label="Pear silhouette" ${pearRestored ? 'disabled' : ''}>${pearRestored ? 'Pear restored' : 'Pear'}</button>
      <button id="sky-target" class="restoration-target sun-target ${lightRestored ? 'placed' : ''}" data-action="target" data-target="sun-disc" style="${style(sun)}" aria-label="${lightRestored ? 'Sun restored' : 'Sky silhouette for the enchanted light'}" ${lightRestored ? 'disabled' : ''}>${lightRestored ? 'Sun restored' : 'Sky'}</button></div>
      <div class="inspection-inventory" aria-label="Inventory">${held === 'golden-pear' ? piece('golden-pear', 'restoration.pear', 'Golden pear')
        : held === 'sun-disc' ? piece('sun-disc', 'restoration.light', 'Enchanted light') : '<span>Inventory · Empty</span>'}</div>
      <p id="placement-message" class="placement-message" role="status" aria-live="polite">${message}</p>
      ${complete ? '<button class="primary" data-action="see-ending">See the ending <span>→</span></button>' : ''}
      <button class="secondary" data-action="close-inspection">Back to Museum <kbd>Esc</kbd></button>`);
    this.modal.classList.add('inspection-modal');
    if (animate) this.modal.querySelector<HTMLElement>(complete ? '[data-action="see-ending"]' : '[data-action="close-inspection"]')?.focus();
  }
  /** S5C: the campaign ending, shown after the light is placed or from the complete inspection. */
  ending(): void {
    this.show('ending', `<div class="menu-mark" aria-hidden="true">✦</div><p class="eyebrow">The Garden Before Dawn</p><h2 class="compact">Restored.</h2>
      <img class="ending-art" src="${masterpieceImage(2)}" alt="The Garden Before Dawn, complete: the pear on its tree and the sun risen over the garden.">
      <p class="menu-description">The golden pear, home from Royal Supper.<br>The enchanted light, carried out of the Unfinished Sketch, rises as the garden’s sun.</p>
      <p class="ending-close">The gallery is quiet again. The garden has its dawn.</p>
      <button class="primary" data-action="stay">Stay in the museum <span>→</span></button>
      <button class="quiet" data-action="reset">New game (reset progress)</button>
      <p class="small-note">Royal Supper and the Unfinished Sketch stay open to replay.</p>`);
    this.modal.classList.add('ending-modal');
  }
  placementMessage(text: string): void { const el = document.getElementById('placement-message'); if (el) el.textContent = text; }
  resetConfirmation(): void {
    this.show('reset', '<p class="eyebrow">Start again</p><h2 class="compact">Reset progress?</h2><p class="menu-description">This clears this game’s pear, restoration, settings and current adventure. Other stored data is kept.</p><button class="secondary" data-action="cancel-reset">Keep progress</button><button class="primary" data-action="confirm-reset">Confirm reset / New Game</button>');
  }
  dispose(): void { this.controller.abort(); }
}

const artUrl = (id: ArtId): string => runtimeAssetUrl(runtimeAssets[id].path);
