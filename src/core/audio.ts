import { Howl, Howler } from 'howler';
import { runtimeAssetUrl } from '../assets/manifest';

/** Each scene's looping bed: file and volume. The Sketch's rock/metallic loop is louder at source, so it plays lower. */
export type AudioScene = 'museum' | 'royal-supper' | 'sketch';
const beds: Record<AudioScene, { file: string; volume: number }> = {
  museum: { file: 'museum', volume: 0.3 },
  'royal-supper': { file: 'supper', volume: 0.3 },
  sketch: { file: 'sketch', volume: 0.16 },
};
export type AudioCue = 'jump' | 'bounce' | 'slide' | 'hazard' | 'attention' | 'fork' | 'fan' | 'collect' | 'return' | 'restore';
const cues: AudioCue[] = ['jump', 'bounce', 'slide', 'hazard', 'attention', 'fork', 'fan', 'collect', 'return', 'restore'];
/** Museum footsteps (scripts/make-museum-audio.py): a few variants per floor surface, picked at random. */
export type StepSurface = 'wood' | 'carpet';
const steps: Record<StepSurface, { count: number; volume: number }> = { wood: { count: 4, volume: 0.32 }, carpet: { count: 3, volume: 0.36 } };
/** The museum's quiet room tone, looping under its bed. */
const ROOM_TONE_VOLUME = 0.22;
/** Menu and interface sounds (scripts/make-ui-audio.py): one bank for the whole session, independent of the scene and of pause. */
export type UiSound = 'move' | 'select' | 'back' | 'pause' | 'resume' | 'toggle' | 'start';
const uiSounds: Record<UiSound, number> = { move: 0.32, select: 0.5, back: 0.42, pause: 0.5, resume: 0.42, toggle: 0.4, start: 0.55 };
export class GameAudio {
  private ui = new Map<UiSound, Howl>();
  private playedUi: Partial<Record<UiSound, number>> = {};
  private activated = false;
  private paused = true;
  private disposed = false;
  private scene: AudioScene | null = null;
  private ambience: Howl | null = null;
  private ambienceId: number | undefined;
  private effects = new Map<AudioCue, Howl>();
  // Museum only: room tone and footsteps, owned with the scene bank.
  private roomTone: Howl | null = null;
  private roomToneId: number | undefined;
  private steps: { surface: StepSurface; howl: Howl }[] = [];
  private playedSteps = 0;
  private warned = false;
  private stopSerial = 0;
  private playedCues: Partial<Record<AudioCue, number>> = {};
  constructor(private readonly notice: (message: string) => void) {}
  activate(): void {
    if (this.disposed || this.activated) return;
    this.activated = true;
    void Howler.ctx?.resume().catch(() => {});
    for (const [sound, volume] of Object.entries(uiSounds) as [UiSound, number][]) {
      this.ui.set(sound, new Howl({ src: [runtimeAssetUrl(`assets/audio/ui-${sound}.wav`)], volume,
        onplay: () => { this.playedUi[sound] = (this.playedUi[sound] ?? 0) + 1; } }));
    }
    if (!this.ambience && this.scene) this.createBank();
    this.sync();
  }
  volume(value: number): void { Howler.volume(value); }
  setScene(scene: AudioScene | null): void {
    this.unload(); this.scene = scene;
    if (this.activated && scene && !this.disposed) this.createBank();
  }
  private createBank(): void {
    const error = () => { if (!this.disposed && !this.warned) { this.warned = true; this.notice('Sound could not load. Visual cues remain available.'); } };
    const bed = beds[this.scene ?? 'museum'];
    const ambience = new Howl({ src: [runtimeAssetUrl(`assets/audio/${bed.file}.wav`)],
      loop: true, volume: bed.volume, onloaderror: error });
    this.ambience = ambience;
    ambience.once('load', () => { if (this.ambience === ambience) this.sync(); });
    for (const cue of cues) this.effects.set(cue, new Howl({ src: [runtimeAssetUrl(`assets/audio/${cue}.wav`)],
      volume: cue === 'slide' || cue === 'fan' ? 0.35 : 0.65, onloaderror: error,
      onplay: () => { this.playedCues[cue] = (this.playedCues[cue] ?? 0) + 1; } }));
    if (this.scene === 'museum') {
      const room = new Howl({ src: [runtimeAssetUrl('assets/audio/room.wav')], loop: true, volume: ROOM_TONE_VOLUME, onloaderror: error });
      this.roomTone = room;
      room.once('load', () => { if (this.roomTone === room) this.sync(); });
      for (const [surface, { count, volume }] of Object.entries(steps) as [StepSurface, { count: number; volume: number }][]) {
        for (let i = 1; i <= count; i++) this.steps.push({ surface, howl: new Howl({ src: [runtimeAssetUrl(`assets/audio/step-${surface}-${i}.wav`)], volume, onloaderror: error }) });
      }
    }
  }
  setPaused(value: boolean): void {
    this.paused = value;
    if (value) { this.stopSerial++; for (const effect of this.effects.values()) effect.stop(); }
    this.sync();
  }
  private sync(): void {
    const room = this.roomTone;
    if (room?.state() === 'loaded') {
      if (this.paused || !this.activated) room.pause(this.roomToneId);
      else if (!room.playing(this.roomToneId)) this.roomToneId = room.play(this.roomToneId);
    }
    const ambient = this.ambience;
    if (!ambient || ambient.state() !== 'loaded') return;
    if (this.paused || !this.activated) ambient.pause(this.ambienceId);
    else if (!ambient.playing(this.ambienceId)) this.ambienceId = ambient.play(this.ambienceId);
  }
  play(cue: AudioCue, presentation = false): void {
    if (!this.activated || this.disposed || (this.paused && !presentation)) return;
    const effect = this.effects.get(cue);
    // Never queue stale simulation cues to play after loading or resume.
    if (effect?.state() === 'loaded') effect.play();
    else if (effect && presentation) {
      const serial = this.stopSerial;
      effect.once('load', () => {
        if (this.effects.get(cue) === effect && !this.disposed && serial === this.stopSerial) effect.play();
      });
    }
  }
  /** A museum footstep on the given surface: a random loaded variant with a slight pitch and level change. Never while paused. */
  footstep(surface: StepSurface): void {
    if (!this.activated || this.disposed || this.paused) return;
    const choices = this.steps.filter(s => s.surface === surface && s.howl.state() === 'loaded');
    if (!choices.length) return;
    const { howl } = choices[Math.floor(Math.random() * choices.length)];
    const id = howl.play(); howl.rate(0.92 + Math.random() * 0.16, id); howl.volume(howl.volume() * (0.85 + Math.random() * 0.15), id);
    this.playedSteps++;
  }
  /**
   * An interface sound, also while paused. `rate` shifts its pitch (menu steps
   * climb a scale). A sound still loading plays when ready, except the quick
   * menu tink, which would only arrive late.
   */
  uiSound(sound: UiSound, rate = 1): void {
    if (!this.activated || this.disposed) return;
    const howl = this.ui.get(sound);
    if (!howl) return;
    const start = () => { const id = howl.play(); howl.rate(rate, id); };
    if (howl.state() === 'loaded') start();
    else if (sound !== 'move') howl.once('load', () => { if (!this.disposed) start(); });
  }
  private unload(): void {
    this.ambience?.unload(); this.ambience = null; this.ambienceId = undefined;
    for (const effect of this.effects.values()) effect.unload(); this.effects.clear();
    this.roomTone?.unload(); this.roomTone = null; this.roomToneId = undefined;
    for (const { howl } of this.steps) howl.unload(); this.steps = [];
  }
  dispose(): void { this.disposed = true; this.unload(); for (const howl of this.ui.values()) howl.unload(); this.ui.clear(); this.scene = null; }
  get diagnostics() { return { activated: this.activated, paused: this.paused, scene: this.scene, ownedSounds: this.effects.size + Number(!!this.ambience), playing: this.ambience?.playing() ?? false, volume: Howler.volume(), playedCues: { ...this.playedCues }, uiSounds: this.ui.size, playedUi: { ...this.playedUi },
    museumSounds: this.steps.length + Number(!!this.roomTone), roomTone: this.roomTone?.playing() ?? false, playedSteps: this.playedSteps }; }
}
