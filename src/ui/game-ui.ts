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
import type { UiSound } from '../core/audio';

export interface UiActions {
  start(): void; replay(): void; resume(): void; leave(): void;
  pause(): void; checkpoint(): void; quality(low: boolean): void;
  debug(): void; lane(): void;
  reset(): void; confirmReset(): void; cancelReset(): void;
  closeInspection(): void; place(piece: string, target: string): void;
  ending(): void; stay(): void;
  look(): void; volume(value: number): void;
  retry(): void; back(): void;
  /** Menu and interface sounds; `rate` shifts the pitch. */
  sound(kind: UiSound, rate?: number): void;
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
  private objectiveTimer = 0;
  private readonly flashTimers = new Map<string, number>();
  private lastHint = '';
  private pipsCache = '';
  private shownAt = 0;
  private lastFocus: Element | null = null;
  private lastTick = 0;
  private inventoryTimer = 0;
  private controlsTimer = 0;

  constructor(root: HTMLElement, private readonly actions: UiActions, private readonly direct: boolean,
    private readonly study: 'supper' | 'sketch' = 'supper', private sketchMode: SketchStudy = 'mechanics') {
    // Campaign HUDs carry no titles: the game's name lives on the title screen.
    // Dev studies keep their identifying header and tag.
    const devHeader = (eyebrow: string, title: string, nameId: string, eyebrowId?: string) => `<header class="dev-header" ${direct ? '' : 'hidden'}>
      <span ${eyebrowId ? `id="${eyebrowId}" ` : ''}class="eyebrow">${eyebrow}</span><h1>${title}</h1><span id="${nameId}" class="section-name"></span></header>`;
    const corner = (look: boolean) => `<div class="hud-corner">${look ? `<button data-action="look" class="icon-button" aria-label="Mouse look" title="Mouse look">${icons.mouse}</button>` : ''}
      <button data-action="pause" class="icon-button" aria-label="Pause" title="Pause · Esc">${icons.pause}</button></div>`;
    // Key glyphs and a short verb, no panel; they show on arrival, then fade out.
    const controls = (rows: [string[], string][]) => `<div class="controls">${rows.map(([keys, label]) =>
      `<span>${keys.map(k => k.startsWith('<svg') ? `<span class="key-icon">${k}</span>` : `<kbd>${k}</kbd>`).join('')} ${label}</span>`).join('')}</div>`;
    root.innerHTML = `
      <canvas id="world" tabindex="0" aria-label="Royal Supper. A or D to move, Space to jump, E to interact, R for checkpoint, Escape to pause."></canvas>
      <div class="vignette" aria-hidden="true"></div>
      <section id="hud" class="hud" hidden aria-label="Adventure status">
        ${devHeader('The Last Curator', 'Royal Supper', 'section-name')}${corner(false)}
        <div class="route-status"><span id="fork-state"></span><span id="candle-state"></span><span id="diner-state"></span><span id="jump-state"></span></div>
        <p id="section-hint" class="section-hint"></p>
        <div class="bottom-hud">${controls([[['A', 'D'], 'Move'], [['Space'], 'Jump ×2'], [['E'], 'Use'], [['R'], 'Checkpoint']])}
          <span id="checkpoint" class="checkpoint"></span></div>
        <div id="prompt" class="prompt" hidden></div><div id="prompt-view" class="prompt-view" aria-hidden="true" hidden></div><div id="cue" class="cue" role="status" aria-live="polite"></div>
      </section>
      <section id="sketch-hud" class="hud" hidden aria-label="Sketch status">
        ${devHeader('The Last Curator', 'Unfinished Sketch', 'sketch-bay-name', 'sketch-eyebrow')}${corner(false)}
        <div id="nail-pips" class="nail-pips" aria-hidden="true"></div>
        <div class="sketch-status"><span id="sketch-layer"></span><span id="sketch-nails"></span><span id="sketch-oldest"></span><span id="sketch-nearest"></span><span id="sketch-motion"></span></div>
        <p id="sketch-hint" class="section-hint"></p>
        <div id="sketch-bays" class="sketch-bays">${sketchBayList.map((bay, i) => `<button class="quiet" data-action="bay" data-bay="${bay.id}">${i + 1} ${bay.name.split(' · ')[1]}</button>`).join('')}</div>
        <div class="bottom-hud">${controls([[['A', 'D'], 'Move'], [['Space'], 'Jump'], [[icons.click], 'Nail'], [['Q'], 'Recall'], [['E'], 'Grab'], [['R'], 'Retry']])}<span id="sketch-goal" class="checkpoint"></span></div>
        <span id="sketch-endpoint" class="sketch-endpoint" hidden></span>
        <div id="sketch-prompt" class="prompt" hidden></div><div id="sketch-prompt-view" class="prompt-view" aria-hidden="true" hidden></div><div id="sketch-cue" class="cue" role="status" aria-live="polite"></div>
      </section>
      <section id="modal" class="modal" aria-label="Game menu"></section>
      <section id="museum-hud" class="hud" hidden aria-label="Museum status">
        <p id="objective" class="objective-banner" role="status"></p>${corner(true)}
        <div class="reticle" aria-hidden="true">+</div><div id="museum-prompt" class="prompt" hidden></div><div id="museum-prompt-view" class="prompt-view museum-prompt-view" aria-hidden="true" hidden></div>
        <div class="bottom-hud">${controls([[['W', 'A', 'S', 'D'], 'Walk'], [[icons.drag], 'Look'], [['E'], 'Use']])}<div id="inventory" class="inventory" aria-label="Inventory"></div></div>
      </section>
      <aside id="save-notice" class="save-notice" role="status" hidden></aside>
      <aside id="diagnostics" class="diagnostics" hidden></aside>
      ${direct ? `<span class="build-tag">${this.tagLabel()}</span>` : ''}`;
    this.canvas = root.querySelector<HTMLCanvasElement>('#world')!;
    this.modal = root.querySelector<HTMLElement>('#modal')!;
    this.hud = root.querySelector<HTMLElement>('#hud')!;
    root.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      this.clickSound(target);
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
        case 'pause-view': this.pauseView(target.dataset.view ?? 'main'); break;
      }
    }, { signal: this.controller.signal });
    root.addEventListener('change', event => {
      const target = event.target as HTMLInputElement;
      if (target.id === 'low-quality') { this.actions.quality(target.checked); this.actions.sound('toggle'); }
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
      if (this.mode !== 'pause' || event.key !== 'Escape') return;
      const main = this.modal.querySelector<HTMLElement>('.pause-panel[data-view="main"]');
      if (!main || !main.hidden) return;
      event.preventDefault(); event.stopPropagation(); this.actions.sound('back'); this.pauseView('main');
    }, { signal: this.controller.signal });
    // Moving between menu items rings a crystal tink that climbs a pentatonic scale down the list.
    root.addEventListener('focusin', event => {
      const el = event.target as HTMLElement;
      if (this.mode === 'none' || el === this.lastFocus || !this.modal.contains(el) || !el.matches('button, input')) return;
      this.lastFocus = el;
      if (performance.now() - this.shownAt < 150) return;
      const items = [...this.modal.querySelectorAll<HTMLElement>('button:not(:disabled), input')].filter(visible);
      this.actions.sound('move', PENTATONIC[Math.max(0, items.indexOf(el)) % PENTATONIC.length]);
    }, { signal: this.controller.signal });
    // The volume slider ticks at a pitch that follows its value.
    root.addEventListener('input', event => {
      const el = event.target as HTMLInputElement;
      if (el.id !== 'master-volume' || performance.now() - this.lastTick < 70) return;
      this.lastTick = performance.now(); this.actions.volume(Number(el.value)); this.actions.sound('move', 0.6 + Number(el.value) * 0.9);
    }, { signal: this.controller.signal });
    // Menus move with the arrow keys like a game menu; a range input keeps its arrows.
    root.addEventListener('keydown', event => {
      if (this.mode === 'none' || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
      if (document.activeElement instanceof HTMLInputElement) return;
      const buttons = [...this.modal.querySelectorAll<HTMLElement>('button:not(:disabled)')].filter(visible);
      if (!buttons.length) return;
      event.preventDefault();
      const index = buttons.indexOf(document.activeElement as HTMLElement);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      buttons[index < 0 ? 0 : (index + step + buttons.length) % buttons.length].focus();
    }, { signal: this.controller.signal });
    root.addEventListener('pointermove', event => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('.menu-button');
      if (button && this.modal.contains(button)) button.focus({ preventScroll: true });
    }, { signal: this.controller.signal });
    root.addEventListener('keydown', event => {
      if (this.mode === 'none' || event.key !== 'Tab') return;
      const focusable = [...this.modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')].filter(visible);
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
  private show(mode: typeof this.mode, content: string, variant: 'card' | 'title' | 'pause' | 'reward' | 'ending' | 'inspect' = 'card'): void {
    this.mode = mode;
    this.hud.hidden = true;
    document.getElementById('museum-hud')!.hidden = true;
    document.getElementById('sketch-hud')!.hidden = true;
    this.modal.classList.remove('inspection-modal', 'ending-modal', 'title-modal', 'pause-modal', 'reward-modal', 'inspect-modal');
    this.modal.hidden = false;
    if (variant !== 'card') this.modal.classList.add(`${variant}-modal`);
    this.modal.innerHTML = variant === 'card' ? `<div class="menu-card">${content}</div>` : `<div class="title-screen">${content}</div>`;
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.shownAt = performance.now(); this.lastFocus = null;
    this.modal.querySelector<HTMLElement>('button')?.focus();
  }
  /** Which sound a click makes: going back sounds like an in-breath, choosing like a chime. */
  private clickSound(target: HTMLElement): void {
    const action = target.dataset.action;
    if (action === 'start') this.actions.sound('start');
    else if (action === 'look') this.actions.sound('toggle');
    else if (action === 'close-inspection' || action === 'cancel-reset' || action === 'back' || action === 'stay'
      || (action === 'pause-view' && target.dataset.view === 'main')) this.actions.sound('back');
    // Pause and resume are voiced by the game; a placement attempt by its result.
    else if (action !== 'pause' && action !== 'resume' && action !== 'target' && action !== 'invalid-drop') this.actions.sound('select');
  }
  menu(remembered: boolean, complete = false): void {
    this.hud.hidden = true;
    document.getElementById('museum-hud')!.hidden = true;
    document.getElementById('sketch-hud')!.hidden = true;
    if (!this.direct) {
      const label = remembered ? 'Continue' : 'New Game';
      this.show('menu', `<div class="title-art" aria-hidden="true" style="background-image:url('${masterpieceImage(complete ? 2 : 0)}')"></div>
        <div class="title-block"><p class="title-kicker">${complete ? 'The Garden Before Dawn · restored' : 'The Garden Before Dawn'}</p>
        <h2 class="game-title">The Last <br>Curator</h2></div>
        <nav class="title-menu" aria-label="Main menu"><button class="menu-button" data-action="start" aria-label="${label}">${label}</button>
        ${remembered ? '<button class="menu-button" data-action="reset">New Game</button>' : ''}</nav>`, 'title');
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
  /** Called after a scene opens: its controls show for a few seconds, then the view is clear. */
  hintControls(): void {
    const hud = document.getElementById(this.context === 'museum' ? 'museum-hud' : this.context === 'sketch' ? 'sketch-hud' : 'hud')!;
    const row = hud.querySelector<HTMLElement>('.controls');
    if (!row) return;
    document.querySelectorAll('.controls.show').forEach(el => el.classList.remove('show'));
    row.classList.add('show');
    window.clearTimeout(this.controlsTimer);
    this.controlsTimer = window.setTimeout(() => row.classList.remove('show'), CONTROLS_MS);
    if (this.context !== 'museum') this.flash(this.context === 'sketch' ? 'sketch-hint' : 'section-hint', HINT_MS);
  }
  markSketch(mode: SketchStudy, bayId: SketchBayId, campaign = false): void {
    this.sketchMode = mode; this.sketchCampaign = campaign;
    document.getElementById('sketch-hud')!.dataset.study = mode;
    document.getElementById('sketch-hud')!.toggleAttribute('data-campaign', campaign);
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
    this.setPrompt('sketch-prompt', state.prompt ?? '');
    text('sketch-cue', state.cue); this.markBay(state.bay as SketchBayId);
    // A cue that repeats the hint on screen is left to the hint caption.
    document.getElementById('sketch-cue')!.classList.toggle('echo', state.cue === state.hint);
    if (state.hint !== this.lastHint) { this.lastHint = state.hint; this.flash('sketch-hint', HINT_MS); }
    const pips = `${state.nailsAvailable}/${state.nailBudget}`;
    if (pips !== this.pipsCache) {
      this.pipsCache = pips;
      document.getElementById('nail-pips')!.innerHTML = Array.from({ length: state.nailBudget },
        (_, i) => `<span class="nail-pip${i < state.nailsAvailable ? '' : ' used'}">${icons.nail}</span>`).join('');
    }
  }
  pause(lowQuality: boolean, reason: string, settings?: Settings): void {
    const sketch = this.context === 'sketch';
    const adventure = this.context === 'supper' || sketch;
    const route = sketch && this.sketchMode !== 'mechanics';
    const replay = route ? this.sketchCampaign ? 'Restart adventure' : this.sketchMode === 'adventure' ? 'Restart the Sketch'
      : `Restart ${this.sketchMode === 'layers-1-3' ? 'Layers 1–3' : this.sketchMode === 'layer-3' ? 'Layer 3' : this.sketchMode === 'layer-3-swings' ? 'swing crossing' : this.sketchMode === 'layer-3-walls' ? 'wall climb' : this.sketchMode === 'layers-1-2' ? 'Layers 1 &amp; 2' : this.sketchMode === 'layer-2' ? 'Layer 2' : 'Layer 1'}`
      : 'Restart adventure';
    const back = '<button class="menu-button back" data-action="pause-view" data-view="main">Back</button>';
    const key = (k: string) => k.startsWith('<svg') ? `<span class="key-icon">${k}</span>` : `<kbd>${k}</kbd>`;
    this.show('pause', `<div class="pause-panel" data-view="main"><h2 class="screen-title">Paused</h2>
        ${reason ? `<p class="screen-note">${reason}</p>` : ''}
        <nav class="title-menu" aria-label="Pause menu"><button class="menu-button" data-action="resume">Resume</button>
        ${adventure ? `<button class="menu-button" data-action="checkpoint">${sketch && !route ? 'Restart bay' : 'Restart from checkpoint'}</button>
        <button class="menu-button" data-action="replay">${replay}</button>` : ''}
        <button class="menu-button" data-action="pause-view" data-view="controls">Controls</button>
        <button class="menu-button" data-action="pause-view" data-view="settings">Settings</button>
        ${adventure ? `<button class="menu-button" data-action="leave">${this.direct ? 'Leave painting' : 'Return to Museum'}</button>` : ''}</nav></div>
      <div class="pause-panel" data-view="settings" hidden><h2 class="screen-title">Settings</h2>
        <label class="setting-row"><span>Volume</span><input id="master-volume" type="range" min="0" max="1" step="0.05" value="${settings?.masterVolume ?? 0.7}"></label>
        <label class="setting-row"><span>Low quality</span><input type="checkbox" class="toggle" id="low-quality" ${lowQuality ? 'checked' : ''}></label>
        <nav class="title-menu" aria-label="Settings">${!this.direct ? '<button class="menu-button danger" data-action="reset">Reset progress</button>' : ''}
        ${import.meta.env.DEV ? '<button class="menu-button" data-action="debug">Collision view (F3)</button>' : ''}${back}</nav></div>
      <div class="pause-panel" data-view="controls" hidden><h2 class="screen-title">Controls</h2>
        <dl class="controls-list">${this.controlRows().map(([keys, label]) => `<dt>${keys.map(key).join('')}</dt><dd>${label}</dd>`).join('')}</dl>
        <nav class="title-menu" aria-label="Controls">${back}</nav></div>`, 'pause');
  }
  /** The full control list for the pause menu's Controls page. */
  private controlRows(): [string[], string][] {
    if (this.context === 'museum') return [[['W', 'A', 'S', 'D'], 'Walk'], [[icons.drag], 'Drag to look around'], [[icons.mouse], 'Mouse look (top right)'], [['E', icons.click], 'Use a frame'], [['Esc'], 'Pause']];
    if (this.context === 'sketch') return [[['A', 'D'], 'Move · pump a swing'], [['Space'], 'Jump · kick off a wall · let go'], [[icons.click], 'Drive a nail'], [['Q'], 'Recall the oldest nail'], [['E'], 'Grab a nail'], [['R'], 'Retry from checkpoint'], [['Esc'], 'Pause']];
    return [[['A', 'D'], 'Move'], [['Space'], 'Jump · press again in the air'], [['E'], 'Use'], [['R'], 'Back to checkpoint'], [['Esc'], 'Pause']];
  }
  /** Pause menu pages; Escape on a sub-page goes back to the main page. */
  private pauseView(view: string): void {
    for (const panel of this.modal.querySelectorAll<HTMLElement>('.pause-panel')) panel.hidden = panel.dataset.view !== view;
    this.modal.querySelector<HTMLElement>(`.pause-panel[data-view="${view}"] button, .pause-panel[data-view="${view}"] input`)?.focus();
  }
  success(result: CampaignResult): void {
    this.collection = result;
    this.reward('restoration.pear', 'Golden Pear', result.changed ? 'The king’s dessert belongs in the masterpiece. The golden pear is now in your inventory.'
      : 'The golden pear is already yours; replay adds no duplicate.',
      `<button class="menu-button" data-action="leave" aria-label="${this.direct ? 'Finish blockout' : 'Return to Museum'}">${this.direct ? 'Finish blockout' : 'Return to Museum'}</button>
      <button class="menu-button" data-action="resume">Continue exploring</button>`,
      this.direct ? 'Isolated development session. Campaign saves are untouched.'
        : result.restoredPieceIds.includes('golden-pear') ? 'The golden pear already hangs in the masterpiece.' : '');
  }
  /**
   * The light is claimed. The isolated study (no result) has no campaign award
   * to report; the campaign reports whether the claim added the piece.
   */
  sketchSuccess(result?: CampaignResult): void {
    const fresh = !result || result.changed;
    this.reward('restoration.light', 'Enchanted Light', fresh ? 'The light leaves the torch and is yours. Carry it to the masterpiece’s dark sky.'
      : 'The enchanted light is already yours; replay adds no duplicate.',
      `<button class="menu-button" data-action="leave" aria-label="${result ? 'Return to Museum' : 'Return'}">${result ? 'Return to Museum' : 'Return'}</button>
      <button class="menu-button" data-action="resume">Keep exploring</button>`,
      result ? '' : 'Isolated study · Campaign saves are untouched.');
  }
  /** A recovered piece: its art held up in a warm glow, a short line and the way on. */
  private reward(art: ArtId, name: string, line: string, buttons: string, note: string): void {
    this.show('success', `<div class="reward-art" aria-hidden="true"><span class="reward-rays"></span><img src="${artUrl(art)}" alt=""></div>
      <p class="eyebrow title-kicker">A piece recovered</p><h2 class="screen-title">${name}</h2>
      <p class="screen-line">${line}</p><nav class="title-menu centred" aria-label="Next">${buttons}</nav>
      ${note ? `<p class="screen-small">${note}</p>` : ''}`, 'reward');
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
    this.show('menu', `<div class="pause-panel"><h2 class="screen-title">A blank canvas</h2><p class="screen-note">The painting could not open.</p>
      <p class="screen-line left" id="error-message"></p><nav class="title-menu" aria-label="Error">
      <button class="menu-button" data-action="retry">Retry</button><button class="menu-button" data-action="back">Back</button></nav></div>`, 'pause');
    this.modal.querySelector('#error-message')!.textContent = message;
  }
  loading(): void {
    // The next adventure shows its first hint again.
    this.lastHint = '';
    this.show('loading', `<div class="loading" role="status"><span class="sr-only">Preparing the artwork…</span>
      <span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>`, 'pause');
  }
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
    this.setPrompt('prompt', state.prompt);
    text('cue', state.cue);
    if (state.hint !== this.lastHint) { this.lastHint = state.hint; this.flash('section-hint', HINT_MS); }
  }
  diagnostics(text: string | null): void {
    const el = document.getElementById('diagnostics')!; el.hidden = text === null;
    if (text !== null) el.textContent = text;
  }
  notice(text: string): void { const el = document.getElementById('save-notice')!; el.textContent = text; el.hidden = !text; }
  /** `opened`: the masterpiece has been looked at, so Royal Supper is open. */
  museumState(state: CampaignState, opened: boolean): void {
    const restored = state.restoredPieceIds.includes('golden-pear');
    const owned = state.collectedPieceIds.includes('golden-pear') && !restored;
    const lightRestored = state.restoredPieceIds.includes('sun-disc');
    const light = state.collectedPieceIds.includes('sun-disc') && !lightRestored;
    // Player-facing: the stage-2 piece `sun-disc` is the enchanted light.
    const items: [string, ArtId][] = [];
    if (owned) items.push(['Golden pear', 'restoration.pear']);
    if (light) items.push(['Enchanted light', 'restoration.light']);
    const inventory = document.getElementById('inventory')!;
    const html = items.map(([name, art]) => `<span class="inv-item" tabindex="0" aria-label="${name}"><img class="piece-icon" src="${artUrl(art)}" alt=""><span class="inv-tip" aria-hidden="true">${name}</span></span>`).join('');
    if (inventory.innerHTML !== html) {
      // A newly held piece shows its name for a moment, then only the icon remains.
      const fresh = items.length > inventory.querySelectorAll('.inv-item').length;
      inventory.innerHTML = html;
      if (fresh) { inventory.classList.add('fresh'); window.clearTimeout(this.inventoryTimer); this.inventoryTimer = window.setTimeout(() => inventory.classList.remove('fresh'), FRESH_MS); }
    }
    const objective = document.getElementById('objective')!;
    objective.textContent = isComplete(state) ? 'The Garden Before Dawn is complete'
      : light ? 'Bring the light to the masterpiece'
      : restored ? 'Claim the enchanted light in the Unfinished Sketch'
      : owned ? 'Bring the golden pear to the masterpiece' : opened ? 'Find the golden pear in Royal Supper' : 'Inspect the masterpiece';
    // The objective shows for a few seconds on arrival and after each change, then the view is clear.
    objective.classList.add('show');
    window.clearTimeout(this.objectiveTimer);
    this.objectiveTimer = window.setTimeout(() => objective.classList.remove('show'), OBJECTIVE_MS);
  }
  museumPrompt(text: string): void { this.setPrompt('museum-prompt', text); }
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
    const centre = (t: typeof pear | typeof sun) => `left:${t.left + t.width / 2}%;top:${t.top + t.height / 2}%`;
    const piece = (id: string, art: ArtId, label: string) => `<button class="piece-button" data-action="piece" data-piece="${id}" draggable="true" aria-pressed="false" aria-label="${label}"><img class="inventory-art" src="${artUrl(art)}" alt="" draggable="false"><span class="inv-tip" aria-hidden="true">${label}</span></button>`;
    const message = complete ? 'The enchanted light rises as the garden’s sun. The Garden Before Dawn is complete.'
      : held === 'sun-disc' ? 'Drag the enchanted light into the dark sky.'
      : pearRestored ? 'Colour restored. Next: the Unfinished Sketch on the left wall holds an enchanted light.'
      : held === 'golden-pear' ? 'Drag the golden pear onto its place on the tree.'
      : 'The king has borrowed the golden pear. Look inside Royal Supper.';
    const alt = complete ? 'A traveller under a pear tree in a garden at dawn, its sun risen and every colour restored.'
      : `A traveller under a pear tree in a garden before dawn, its sky still waiting for light. ${pearRestored ? 'The tree and garden have regained colour.' : 'The pear and garden are grey.'}`;
    // The piece just placed bursts into sparks where it landed (never under reduced motion).
    const placed = animate ? lightRestored ? sun : pear : null;
    const sparks = placed ? `<span class="burst" aria-hidden="true" style="${centre(placed)}">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--d:${50 + (i % 3) * 22}px"></i>`).join('')}</span>` : '';
    this.show('inspection', `<h2 class="inspect-title">The Garden Before Dawn</h2>
      <div class="painting-study ${animate ? 'restoring' : ''} ${held ? 'armed' : ''}" data-action="invalid-drop"><img alt="${alt}" src="${masterpieceImage(count)}">
      ${animate && lightRestored ? `<span class="sun-glow" aria-hidden="true" style="${centre(sun)}"></span>` : ''}${sparks}
      <button id="pear-target" class="restoration-target ${pearRestored ? 'placed' : held === 'golden-pear' ? 'wanted' : ''}" data-action="target" data-target="golden-pear" style="${style(pear)}" aria-label="Pear silhouette" ${pearRestored ? 'disabled' : ''}><span class="sr-only">${pearRestored ? 'Pear restored' : 'Pear'}</span></button>
      <button id="sky-target" class="restoration-target sun-target ${lightRestored ? 'placed' : held === 'sun-disc' ? 'wanted' : ''}" data-action="target" data-target="sun-disc" style="${style(sun)}" aria-label="${lightRestored ? 'Sun restored' : 'Sky silhouette for the enchanted light'}" ${lightRestored ? 'disabled' : ''}><span class="sr-only">${lightRestored ? 'Sun restored' : 'Sky'}</span></button></div>
      <div class="inspect-bar"><div class="inspection-inventory" aria-label="Inventory">${held === 'golden-pear' ? piece('golden-pear', 'restoration.pear', 'Golden pear')
        : held === 'sun-disc' ? piece('sun-disc', 'restoration.light', 'Enchanted light') : ''}</div>
      <p id="placement-message" class="placement-message" role="status" aria-live="polite">${message}</p></div>
      <nav class="title-menu row" aria-label="Masterpiece">${complete ? '<button class="menu-button" data-action="see-ending">See the ending</button>' : ''}
      <button class="menu-button" data-action="close-inspection" aria-label="Back to Museum">Back <kbd>Esc</kbd></button></nav>`, 'inspect');
    this.modal.classList.add('inspection-modal');
    if (animate) this.modal.querySelector<HTMLElement>(complete ? '[data-action="see-ending"]' : '[data-action="close-inspection"]')?.focus();
  }
  /** S5C: the campaign ending, shown after the light is placed or from the complete inspection. */
  ending(): void {
    this.show('ending', `<img class="ending-art" src="${masterpieceImage(2)}" alt="The Garden Before Dawn, complete: the pear on its tree and the sun risen over the garden.">
      <span class="ending-motes" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53) % 100}%;--t:${6 + (i % 5) * 1.7}s;--w:${-(i * 0.9)}s"></i>`).join('')}</span>
      <div class="title-block"><p class="title-kicker">The Garden Before Dawn</p><h2 class="game-title">Restored.</h2>
      <p class="ending-lines">The golden pear, home from Royal Supper.<br>The enchanted light, carried out of the Unfinished Sketch, rises as the garden’s sun.</p></div>
      <nav class="title-menu" aria-label="Ending"><button class="menu-button" data-action="stay">Stay in the museum</button>
      <button class="menu-button" data-action="reset">New game (reset progress)</button></nav>`, 'title');
    this.modal.classList.add('ending-modal');
  }
  placementMessage(text: string): void { const el = document.getElementById('placement-message'); if (el) el.textContent = text; }
  resetConfirmation(): void {
    this.show('reset', `<div class="pause-panel"><h2 class="screen-title">Reset progress?</h2>
      <p class="screen-line left">This clears the pear, the light, the restored picture and your settings.</p>
      <nav class="title-menu" aria-label="Reset"><button class="menu-button" data-action="cancel-reset">Keep progress</button>
      <button class="menu-button danger" data-action="confirm-reset">Confirm reset / New Game</button></nav></div>`, 'pause');
  }
  dispose(): void { this.controller.abort(); window.clearTimeout(this.objectiveTimer); window.clearTimeout(this.inventoryTimer); window.clearTimeout(this.controlsTimer); this.flashTimers.forEach(t => window.clearTimeout(t)); }
  /** Shows a caption for a few seconds, then lets it fade. */
  private flash(id: string, ms: number): void {
    const el = document.getElementById(id);
    if (!el || !el.textContent) return;
    el.classList.add('show');
    window.clearTimeout(this.flashTimers.get(id));
    this.flashTimers.set(id, window.setTimeout(() => el.classList.remove('show'), ms));
  }
  /**
   * The accessible prompt text stays as written ("Click / E — Inspect the
   * masterpiece"); the visible copy draws its key as a glyph beside the verb.
   */
  private setPrompt(id: string, text: string): void {
    const el = document.getElementById(id)!; el.textContent = text; el.hidden = !text;
    const view = document.getElementById(`${id}-view`)!; view.hidden = !text;
    const match = /^(?:Click \/ )?([A-Z]) — (.+)$/.exec(text);
    const html = match ? `<kbd>${match[1]}</kbd><span>${escapeHtml(match[2])}</span>` : `<span>${escapeHtml(text)}</span>`;
    if (view.innerHTML !== html) view.innerHTML = html;
  }
}

const artUrl = (id: ArtId): string => runtimeAssetUrl(runtimeAssets[id].path);
const OBJECTIVE_MS = 5000;
const PENTATONIC = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
const visible = (el: HTMLElement): boolean => el.offsetParent !== null;
const HINT_MS = 7000;
const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const CONTROLS_MS = 9000;
const FRESH_MS = 3500;
const icons = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.6"/><rect x="14" y="5" width="4" height="14" rx="1.6"/></svg>',
  click: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v6a5.5 5.5 0 0 0 11 0V9A5.5 5.5 0 0 0 12 3.5Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5A5.5 5.5 0 0 0 6.5 9v1.5H12Z"/></svg>',
  drag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M3 12l3.5-3.5M3 12l3.5 3.5M21 12l-3.5-3.5M21 12l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  nail: '<svg viewBox="0 0 24 32" aria-hidden="true"><rect x="3" y="2" width="18" height="5.5" rx="2.2"/><path d="M9.3 7.5h5.4l-1.4 18.5L12 30.5l-1.3-4.5Z"/></svg>',
  mouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="3.5" width="11" height="17" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="7" width="2" height="4" rx="1"/></svg>',
};
