import type { Controls } from '../gameplay/controller';

const gameplayKeys = new Set(['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyR']);
const isFormControl = (target: EventTarget | null): boolean => target instanceof HTMLElement &&
  (target.matches('button, input, select, textarea, a') || target.isContentEditable);

export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  enabled = false;

  constructor(private readonly onPause: () => void, private readonly onDebug: () => void) {
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
  }

  private keydown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); this.onPause(); return; }
    if (event.code === 'F3' && !event.repeat && import.meta.env.DEV) { event.preventDefault(); this.onDebug(); return; }
    if (!this.enabled || isFormControl(event.target) || !gameplayKeys.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) this.pressed.add(event.code);
    this.held.add(event.code);
  };
  private keyup = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
    if (this.enabled && gameplayKeys.has(event.code) && !isFormControl(event.target)) event.preventDefault();
  };
  sample(): Controls {
    const frame: Controls = {
      axis: Number(this.held.has('KeyD') || this.held.has('ArrowRight')) - Number(this.held.has('KeyA') || this.held.has('ArrowLeft')),
      jumpPressed: this.pressed.has('Space'), jumpHeld: this.held.has('Space'),
      interactPressed: this.pressed.has('KeyE'), restartPressed: this.pressed.has('KeyR'),
      forward: Number(this.held.has('KeyW') || this.held.has('ArrowUp')) - Number(this.held.has('KeyS') || this.held.has('ArrowDown')),
    };
    this.pressed.clear();
    return frame;
  }
  clear(): void { this.held.clear(); this.pressed.clear(); }
  dispose(): void {
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    this.clear();
  }
}
