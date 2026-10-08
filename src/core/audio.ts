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
export class GameAudio {
  private activated = false;
  private paused = true;
  private disposed = false;
  private scene: AudioScene | null = null;
  private ambience: Howl | null = null;
  private ambienceId: number | undefined;
  private effects = new Map<AudioCue, Howl>();
  private warned = false;
  private stopSerial = 0;
  private playedCues: Partial<Record<AudioCue, number>> = {};
  constructor(private readonly notice: (message: string) => void) {}
  activate(): void {
    if (this.disposed || this.activated) return;
    this.activated = true;
    void Howler.ctx?.resume().catch(() => {});
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
  }
  setPaused(value: boolean): void {
    this.paused = value;
    if (value) { this.stopSerial++; for (const effect of this.effects.values()) effect.stop(); }
    this.sync();
  }
  private sync(): void {
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
  private unload(): void {
    this.ambience?.unload(); this.ambience = null; this.ambienceId = undefined;
    for (const effect of this.effects.values()) effect.unload(); this.effects.clear();
  }
  dispose(): void { this.disposed = true; this.unload(); this.scene = null; }
  get diagnostics() { return { activated: this.activated, paused: this.paused, scene: this.scene, ownedSounds: this.effects.size + Number(!!this.ambience), playing: this.ambience?.playing() ?? false, volume: Howler.volume(), playedCues: { ...this.playedCues } }; }
}
