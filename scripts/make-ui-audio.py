"""Menu and interface sounds: original deterministic synthesis.

User request 2026-10-08: UI and menu sounds that are not ordinary clicks, with
a mystical feel. Everything is built from sine partials and filtered noise
(no recordings, samples or third-party material): inharmonic glass-bell
partials, a beating singing-bowl tone, reversed bells and airy shimmers, with
a small synthetic reverb. The menu "move" tink is played at pentatonic rates
by the game, so stepping through a menu climbs a little scale.

Writes public/assets/audio/ui-*.wav and their records in
asset-sources/audio-manifest.json; other audio is left untouched (do not rerun
make-audio.py or make-sketch-music.py for this).
"""
from pathlib import Path
import hashlib, json, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public/assets/audio'
MANIFEST = ROOT / 'asset-sources/audio-manifest.json'
RATE = 44100
rng = np.random.default_rng(20261008)

# Glass-bell partial ratios (inharmonic, like a struck crystal) and their weights.
BELL = [(1.0, 1.0), (2.76, 0.45), (5.40, 0.22), (8.93, 0.10)]


def silence(seconds):
    return np.zeros(round(seconds * RATE))


def times(n):
    return np.arange(n) / RATE


def bell(freq, seconds, decay=0.35, attack=0.002, partials=BELL, shimmer=0.0):
    n = round(seconds * RATE); t = times(n); out = np.zeros(n)
    for ratio, weight in partials:
        # Higher partials die faster; a slow vibrato on each gives a living, glassy ring.
        vib = 1 + shimmer * np.sin(2 * np.pi * (4.5 + ratio) * t)
        out += weight * np.sin(2 * np.pi * freq * ratio * t * vib) * np.exp(-t / (decay / ratio ** 0.6))
    return out * np.minimum(1, t / attack)


def bowl(freq, seconds):
    """A singing bowl: paired, slightly detuned partials that beat slowly."""
    n = round(seconds * RATE); t = times(n); out = np.zeros(n)
    for ratio, weight, beat in [(1.0, 1.0, 1.3), (2.71, 0.5, 2.1), (5.03, 0.22, 3.4)]:
        f = freq * ratio
        out += weight * (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + beat) * t)) / 2
    return out * np.minimum(1, t / 0.04) * np.exp(-t / (seconds * 0.45))


def onepole(x, cutoff, high=False):
    a = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return x - y if high else y


def air(seconds, low, high, rise=True):
    """Breathy band-limited noise whose band sweeps up (or down)."""
    n = round(seconds * RATE); noise = rng.standard_normal(n)
    band = onepole(onepole(noise, high), low, high=True)
    t = np.linspace(0, 1, n)
    shape = np.sin(np.pi * t) ** 2
    sweep = 0.4 + 0.6 * (t if rise else 1 - t)
    return band * shape * sweep


def comb(x, delay, gain):
    y = x.copy()
    for k in range(delay, len(y), delay):
        end = min(k + delay, len(y))
        y[k:end] += gain * y[k - delay:end - delay]
    return y


def allpass(x, delay, gain):
    y = np.zeros_like(x); buf = np.zeros(len(x) + delay)
    for i, v in enumerate(x):
        d = buf[i]
        w = v + gain * d
        y[i] = d - gain * w
        buf[i + delay] = w
    return y


def reverb(x, tail=1.2, wet=0.35):
    """Small Schroeder reverb: four combs then two allpasses."""
    padded = np.concatenate([x, silence(tail)])
    g = 10 ** (-3 * 0.035 / tail)
    combs = sum(comb(padded, round(RATE * d), g ** (d / 0.035)) for d in (0.0297, 0.0371, 0.0411, 0.0437)) / 4
    diffused = allpass(allpass(combs, round(RATE * 0.005), 0.7), round(RATE * 0.0017), 0.7)
    return padded * (1 - wet) + diffused * wet


def place(length, parts):
    out = silence(length)
    for start, signal, gain in parts:
        i = round(start * RATE); end = min(len(out), i + len(signal))
        out[i:end] += signal[:end - i] * gain
    return out


def fade_tail(x, seconds=0.05):
    n = min(len(x), round(seconds * RATE)); x = x.copy(); x[-n:] *= np.linspace(1, 0, n)
    return x


def normalise(x, peak=0.7):
    return x / max(1e-9, np.max(np.abs(x))) * peak


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    semis = names[name[0]] + (1 if '#' in name else 0) + 12 * (int(name[-1]) - 4)
    return 440 * 2 ** (semis / 12)


SOUNDS = {}

# Moving through a menu: one tiny crystal tink (the game shifts its pitch per step).
SOUNDS['ui-move'] = ('Tiny crystal tink for moving through menus; played at pentatonic rates so steps climb a scale',
                     lambda: normalise(reverb(bell(note('E6'), 0.32, decay=0.12), tail=0.45, wet=0.3), 0.45))

# Choosing: two glass bells a fifth apart over a rising breath of air.
SOUNDS['ui-select'] = ('Crystal two-bell chime over a rising airy shimmer for confirming a choice',
                       lambda: normalise(reverb(place(0.75, [(0, bell(note('A5'), 0.7, decay=0.3, shimmer=0.002), 0.8),
                                                             (0.045, bell(note('E6'), 0.7, decay=0.32, shimmer=0.002), 0.65),
                                                             (0, air(0.45, 2500, 9000), 0.12)]), tail=0.9, wet=0.38), 0.6))

# Going back: a reversed bell, an in-breath that stops short.
def _back():
    swell = bell(note('E5'), 0.42, decay=0.2)[::-1]
    return normalise(fade_tail(reverb(np.concatenate([swell, bell(note('B4'), 0.12, decay=0.03) * 0.5]), tail=0.4, wet=0.25)), 0.5)
SOUNDS['ui-back'] = ('Reversed glass bell, an in-breath that stops short, for going back', _back)

# Pausing: a low singing bowl and a falling glitter, as if time has stilled.
def _pause():
    glitter = [(0.06 + i * 0.07, bell(note(n), 0.5, decay=0.12), 0.22 - i * 0.02)
               for i, n in enumerate(['E7', 'B6', 'G#6', 'E6', 'B5', 'G#5'])]
    return normalise(reverb(place(1.6, [(0, bowl(note('A3'), 1.6), 0.9), *glitter, (0, air(0.6, 1500, 7000, rise=False), 0.08)]), tail=1.3, wet=0.4), 0.6)
SOUNDS['ui-pause'] = ('Low beating singing bowl under a falling crystal glitter, time stilling, for pausing', _pause)

# Resuming: a reversed shimmer that swells up into one bright tink.
def _resume():
    swell = reverb(air(0.5, 3000, 10000), tail=0.3, wet=0.5)[::-1][:round(0.5 * RATE)]
    return normalise(place(0.95, [(0, swell, 0.5), (0.47, reverb(bell(note('B6'), 0.4, decay=0.14), tail=0.4, wet=0.3), 0.55)]), 0.5)
SOUNDS['ui-resume'] = ('Reversed airy shimmer swelling into one bright crystal tink, for resuming', _resume)

# Switching a setting: two soft glass ticks.
SOUNDS['ui-toggle'] = ('Two soft glass ticks for switching a setting',
                       lambda: normalise(reverb(place(0.2, [(0, bell(note('C#7'), 0.12, decay=0.03), 0.6),
                                                            (0.055, bell(note('G#6'), 0.14, decay=0.04), 0.5)]), tail=0.3, wet=0.25), 0.45))

# Starting the game: a long reversed swell that blooms into a chord of bells and sparkles.
def _start():
    chord = ['D5', 'F#5', 'A5', 'E6', 'A6']
    bloom = sum(place(2.6, [(0.02 * i, bell(note(n), 2.4, decay=0.9, shimmer=0.0015), 0.5)]) for i, n in enumerate(chord))
    sparkles = [(0.25 + 0.11 * i, bell(note(n), 0.5, decay=0.1), 0.12) for i, n in enumerate(['A6', 'D7', 'F#7', 'A7', 'E7', 'D7'])]
    swell = reverb(air(0.9, 900, 8000), tail=0.4, wet=0.6)[::-1][:round(0.9 * RATE)]
    body = place(3.4, [(0, swell, 0.45), (0.85, bloom, 1.0), *[(0.85 + s, sig, g) for s, sig, g in sparkles], (0.85, bowl(note('D3'), 2.4), 0.4)])
    return normalise(fade_tail(reverb(body, tail=1.6, wet=0.4), 0.3), 0.65)
SOUNDS['ui-start'] = ('Reversed swell blooming into a shimmering chord of glass bells, for starting or continuing the game', _start)


def trim(signal, floor=0.0015):
    """Cuts the inaudible end of a reverb tail, with a short fade."""
    loud = np.nonzero(np.abs(signal) > floor)[0]
    end = min(len(signal), (loud[-1] if len(loud) else 0) + round(0.03 * RATE))
    return fade_tail(signal[:end], 0.03)


def write(path, signal):
    data = (np.clip(signal, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(data.tobytes())


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    records = {a['id']: a for a in manifest['assets']}
    for sound_id, (description, make) in SOUNDS.items():
        path = AUDIO / f'{sound_id}.wav'
        signal = trim(make())
        write(path, signal)
        records[sound_id] = {
            'id': sound_id, 'runtimePath': f'public/assets/audio/{sound_id}.wav', 'source': 'scripts/make-ui-audio.py',
            'creator': 'The Last Curator project — original procedural synthesis',
            'license': 'Original project audio; no external samples', 'description': description,
            'seconds': round(len(signal) / RATE, 3), 'sampleRate': RATE, 'loop': False,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'creditsSpent': 0,
        }
        print(f'{sound_id}: {len(signal) / RATE:.2f} s')
    manifest['assets'] = list(records.values())
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
