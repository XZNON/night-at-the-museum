"""Unfinished Sketch background music: original deterministic synthesis.

User request 2026-10-08: rock / metallic background music for the Sketch. A
seamless 8-bar loop at 140 BPM in E minor, built only from synthesized
oscillators and noise (no recordings, samples or third-party composition):
kick, snare, hats and crashes; a palm-muted, distorted power-chord riff; a
saw bass; and inharmonic anvil/wrench clangs with a ratchet fill, the toolbox
theme as percussion. Notes that ring past the loop's end are folded back onto
its start, so the seam is exact. Writes public/assets/audio/sketch.wav and its
record in asset-sources/audio-manifest.json; other audio is left untouched
(do not rerun make-audio.py for this).
"""
from pathlib import Path
import hashlib, json, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/audio/sketch.wav'
MANIFEST = ROOT / 'asset-sources/audio-manifest.json'
RATE = 22050
BPM = 140
BEAT = 60 / BPM
BARS = 8
LENGTH = round(BARS * 4 * BEAT * RATE)
rng = np.random.default_rng(20261008)
mix = np.zeros(LENGTH + RATE * 2)


def at(beat):
    return round(beat * BEAT * RATE)


def add(start, signal, gain=1.0):
    mix[start:start + len(signal)] += signal * gain


def env(n, attack=0.004, decay=0.2):
    t = np.arange(n) / RATE
    return np.minimum(1, t / attack) * np.exp(-t / decay)


def lowpass(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return y


def highpass(x):
    return np.diff(x, prepend=0.0)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / RATE
    return 2 * ((freq * (1 + detune) * t) % 1) - 1


# --- drums ----------------------------------------------------------------------
def kick():
    n = round(0.28 * RATE); t = np.arange(n) / RATE
    sweep = 45 + 85 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(sweep) / RATE) * env(n, 0.001, 0.12)
    click = rng.uniform(-1, 1, n) * env(n, 0.0005, 0.004)
    return body + 0.3 * click


def snare():
    n = round(0.22 * RATE); t = np.arange(n) / RATE
    noise = highpass(rng.uniform(-1, 1, n)) * env(n, 0.001, 0.07)
    tone = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.05)
    return noise * 0.9 + tone * 0.5


def hat(open_=False):
    n = round((0.3 if open_ else 0.05) * RATE)
    return highpass(highpass(rng.uniform(-1, 1, n))) * env(n, 0.0005, 0.12 if open_ else 0.015)


def crash():
    n = round(1.6 * RATE)
    return highpass(rng.uniform(-1, 1, n)) * env(n, 0.002, 0.5)


K, S, H = kick(), snare(), hat()
for bar in range(BARS):
    b = bar * 4
    # Driving rock beat with a pushed kick on the "and" of 3.
    for k in (0, 1.5, 2.5) if bar % 2 else (0, 0.5, 2, 2.5):
        add(at(b + k), K, 1.0)
    for s in (1, 3):
        add(at(b + s), S, 0.75)
    for e in range(8):
        add(at(b + e / 2), hat(open_=(e == 7 and bar % 2 == 1)) if e == 7 else H, 0.22 if e % 2 else 0.32)
    if bar in (0, 4):
        add(at(b), crash(), 0.35)
# Snare roll into the loop point.
for i in range(8):
    add(at(31 + i / 8), S, 0.25 + i * 0.05)

# --- bass and guitar --------------------------------------------------------------
E2, G2, A2, C3, B2, D3 = 82.41, 98.0, 110.0, 130.81, 123.47, 146.83
roots = [E2, E2, G2, A2, E2, E2, C3, B2]


def power_chord(root, seconds, muted):
    n = round(seconds * RATE)
    voice = (saw(root, n, -0.003) + saw(root, n, 0.004) + 0.8 * saw(root * 1.5, n, 0.002) + 0.5 * saw(root * 2, n))
    driven = np.tanh(voice * 3.5)
    shaped = lowpass(driven, 1700 if muted else 2600)
    return shaped * env(n, 0.003, 0.07 if muted else 0.55)


def bass_note(root, seconds):
    n = round(seconds * RATE)
    return lowpass(saw(root / 2, n) + 0.4 * saw(root, n), 600) * env(n, 0.003, 0.25)


for bar, root in enumerate(roots):
    b = bar * 4
    # Chug pattern: muted eighths with an open accent on 1 and the "and" of 2.
    for e in range(8):
        accent = e in (0, 3)
        add(at(b + e / 2), power_chord(root, BEAT * (1.4 if accent else 0.5), muted=not accent), 0.42 if accent else 0.3)
        add(at(b + e / 2), bass_note(root, BEAT * 0.5), 0.5)

# --- metallic toolbox percussion ----------------------------------------------------
def clang(freq, decay, partials=(1, 2.76, 5.4, 8.93, 13.34)):
    """Inharmonic struck metal: an anvil or a dropped wrench."""
    n = round(decay * 4 * RATE); t = np.arange(n) / RATE
    tone = sum(np.sin(2 * np.pi * freq * p * t) * np.exp(-t / (decay / (1 + i * 0.6))) / (1 + i)
               for i, p in enumerate(partials))
    return tone * np.minimum(1, t / 0.0008)


ANVIL, WRENCH = clang(620, 0.35), clang(1480, 0.12)
for bar in range(BARS):
    b = bar * 4
    if bar % 2 == 1:
        add(at(b + 3.5), ANVIL, 0.45)        # anvil hit on the "and" of 4 every two bars
    add(at(b + 1.75), WRENCH, 0.18)          # light wrench clink before the backbeat
# A ratchet fill (fast metallic ticks) leading into bar 5.
for i in range(12):
    add(at(15 + i / 12), clang(2200 + 40 * i, 0.03), 0.16)

# --- loop, normalise, write ---------------------------------------------------------
loop = mix[:LENGTH].copy()
loop[:len(mix) - LENGTH] += mix[LENGTH:]      # fold the ringing tail onto the start
loop = np.tanh(loop * 1.1)                      # gentle bus glue
loop *= 0.72 / np.max(np.abs(loop))
with wave.open(str(OUT), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes((loop * 32767).round().astype('<i2').tobytes())

record = dict(id='sketch', runtimePath=OUT.relative_to(ROOT).as_posix(), source='scripts/make-sketch-music.py',
              creator='The Last Curator project — original procedural synthesis', license='Original project audio; no external samples',
              description='Original rock/metallic loop for the Unfinished Sketch: drums, distorted power chords, bass and toolbox clangs (140 BPM, E minor, 8 bars)',
              seconds=round(LENGTH / RATE, 3), sampleRate=RATE, loop=True,
              sha256=hashlib.sha256(OUT.read_bytes()).hexdigest(), creditsSpent=0)
manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
manifest['assets'] = [a for a in manifest['assets'] if a['id'] != 'sketch'] + [record]
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(record['seconds'], 's', OUT.stat().st_size, 'bytes', record['sha256'][:12])
