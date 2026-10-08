"""Museum footsteps and room tone: original deterministic synthesis.

User request 2026-10-08 (museum polish pass): footsteps while walking the
museum and a quiet room tone under its music. Everything is built from sine
partials and filtered noise (no recordings, samples or third-party material):

- step-wood-1..4: a heel thump, a dry boot click and a short hollow board
  resonance, each variant slightly different;
- step-carpet-1..3: a muffled low thump with a soft brush of pile;
- room: a seamless loop of soft low air with a slow swell and a very faint
  distant hum, played quietly under the museum bed.

Writes public/assets/audio/step-*.wav and room.wav and their records in
asset-sources/audio-manifest.json; other audio is left untouched (do not rerun
make-audio.py, make-sketch-music.py or make-ui-audio.py for this).
"""
from pathlib import Path
import hashlib, json, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public/assets/audio'
MANIFEST = ROOT / 'asset-sources/audio-manifest.json'
STEP_RATE = 44100
ROOM_RATE = 22050
rng = np.random.default_rng(20261009)


def times(n, rate):
    return np.arange(n) / rate


def onepole(x, cutoff, rate, high=False):
    a = 1 - np.exp(-2 * np.pi * cutoff / rate)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return x - y if high else y


def band_noise(seconds, low, high, rate):
    noise = rng.standard_normal(round(seconds * rate))
    return onepole(onepole(noise, high, rate), low, rate, high=True)


def decay(n, rate, seconds, attack=0.001):
    t = times(n, rate)
    return np.minimum(1, t / attack) * np.exp(-t / seconds)


def small_room(x, rate, wet=0.18):
    """A few early reflections, enough to place the step in a wooden hall."""
    out = np.concatenate([x, np.zeros(round(0.12 * rate))])
    for delay, gain in ((0.011, 0.5), (0.019, 0.38), (0.031, 0.27), (0.047, 0.18), (0.071, 0.1)):
        d = round(delay * rate); out[d:d + len(x)] += x * gain * wet / 0.18 * 0.5
    return out


def fade_tail(x, seconds, rate):
    n = min(len(x), round(seconds * rate)); x = x.copy(); x[-n:] *= np.linspace(1, 0, n)
    return x


def normalise(x, peak):
    return x / max(1e-9, np.max(np.abs(x))) * peak


def wood_step(variant):
    rate = STEP_RATE; length = 0.32; n = round(length * rate); t = times(n, rate)
    pitch = [1.0, 0.93, 1.07, 0.97][variant]
    out = np.zeros(n)
    # Heel: a low thump with a little downward pitch drop.
    f = 105 * pitch * (1 + 0.5 * np.exp(-t / 0.01))
    out += 0.9 * np.sin(2 * np.pi * np.cumsum(f) / rate) * decay(n, rate, 0.035, 0.002)
    # Hollow board: two damped resonances.
    for freq, weight, life in ((380, 0.35, 0.045), (690, 0.2, 0.03), (1150, 0.08, 0.02)):
        out += weight * np.sin(2 * np.pi * freq * pitch * t) * decay(n, rate, life, 0.0015)
    # Boot click on the boards: a short band of noise.
    click = band_noise(length, 1400, 5200, rate) * decay(n, rate, 0.008, 0.0005)
    out += 0.55 * click / max(1e-9, np.max(np.abs(click)))
    # Toe: a softer second contact a moment later.
    toe = round((0.045 + 0.012 * variant) * rate)
    out[toe:] += 0.35 * out[:n - toe] * (0.6 + 0.1 * variant)
    return fade_tail(normalise(small_room(out, rate), 0.6)[:round(0.3 * rate)], 0.04, rate)


def carpet_step(variant):
    rate = STEP_RATE; length = 0.3; n = round(length * rate); t = times(n, rate)
    pitch = [1.0, 0.94, 1.06][variant]
    out = 0.8 * np.sin(2 * np.pi * 85 * pitch * t) * decay(n, rate, 0.04, 0.004)
    brush = band_noise(length, 180, 1100, rate)
    out += 0.45 * brush / max(1e-9, np.max(np.abs(brush))) * decay(n, rate, 0.05, 0.008)
    toe = round((0.05 + 0.01 * variant) * rate)
    out[toe:] += 0.3 * out[:n - toe]
    return fade_tail(normalise(out, 0.45), 0.05, rate)


def room_tone():
    rate = ROOM_RATE; seconds = 16.0; overlap = 2.0
    n = round((seconds + overlap) * rate); t = times(n, rate)
    # Soft low air: brown-ish noise kept under a few hundred hertz.
    low = onepole(onepole(rng.standard_normal(n), 260, rate), 30, rate, high=True)
    low = low / np.max(np.abs(low))
    # A thin, breathy upper band, much quieter.
    air = band_noise(seconds + overlap, 400, 1500, rate); air = air / np.max(np.abs(air))
    # Slow swells, as if air moved through a large room (periods divide the 16 s loop).
    swell = 0.8 + 0.2 * np.sin(2 * np.pi * t / 8.0) + 0.08 * np.sin(2 * np.pi * t / 4.0 + 1.3)
    # A very faint distant hum.
    hum = 0.035 * np.sin(2 * np.pi * 55 * t) + 0.015 * np.sin(2 * np.pi * 110 * t)
    signal = (0.75 * low + 0.12 * air) * swell + hum
    # Seamless loop: crossfade the overlap at the end into the start.
    m = round(overlap * rate); body = signal[:round(seconds * rate)].copy()
    ramp = np.linspace(0, 1, m)
    body[:m] = body[:m] * ramp + signal[-m:] * (1 - ramp)
    return normalise(body, 0.5), rate


def write(path, signal, rate):
    data = (np.clip(signal, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate); f.writeframes(data.tobytes())


def main():
    sounds = {}
    for v in range(4):
        sounds[f'step-wood-{v + 1}'] = (f'Footstep on the museum\'s wooden floor, variant {v + 1}: heel thump, boot click and hollow board',
                                        wood_step(v), STEP_RATE, False)
    for v in range(3):
        sounds[f'step-carpet-{v + 1}'] = (f'Footstep on the museum\'s carpet runner, variant {v + 1}: muffled thump and soft pile brush',
                                          carpet_step(v), STEP_RATE, False)
    room, rate = room_tone()
    sounds['room'] = ('Seamless museum room tone: soft low air with slow swells and a very faint distant hum', room, rate, True)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    records = {a['id']: a for a in manifest['assets']}
    for sound_id, (description, signal, rate, loop) in sounds.items():
        path = AUDIO / f'{sound_id}.wav'
        write(path, signal, rate)
        records[sound_id] = {
            'id': sound_id, 'runtimePath': f'public/assets/audio/{sound_id}.wav', 'source': 'scripts/make-museum-audio.py',
            'creator': 'The Last Curator project — original procedural synthesis',
            'license': 'Original project audio; no external samples', 'description': description,
            'seconds': round(len(signal) / rate, 3), 'sampleRate': rate, 'loop': loop,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'creditsSpent': 0,
        }
        print(f'{sound_id}: {len(signal) / rate:.2f} s')
    manifest['assets'] = list(records.values())
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
