"""Original deterministic synthesis; no recordings, samples or third-party composition."""
from pathlib import Path
import math, wave, struct, random, json, hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/audio'
OUT.mkdir(parents=True, exist_ok=True)
RATE = 22050
rng = random.Random(20261005)

def save(name, samples, description, loop=False):
    peak = max(abs(v) for v in samples) or 1
    gain = min(1, .72 / peak)
    data = b''.join(struct.pack('<h', round(max(-1, min(1, v * gain)) * 32767)) for v in samples)
    path = OUT / (name + '.wav')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(data)
    return dict(id=name, runtimePath=path.relative_to(ROOT).as_posix(), source='scripts/make-audio.py',
                creator='The Last Curator project — original procedural synthesis', license='Original project audio; no external samples',
                description=description, seconds=round(len(samples)/RATE, 3), sampleRate=RATE, loop=loop,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(), creditsSpent=0)

def effect(duration, tones, noise=0, sweep=0):
    samples=[]
    for i in range(round(duration*RATE)):
        t=i/RATE; u=t/duration
        env=min(1,t/.008)*((1-u)**2)
        value=sum(a*math.sin(2*math.pi*(f*t+sweep*t*t/2)) for f,a in tones)
        samples.append(env*(value + noise*rng.uniform(-1,1)))
    return samples

records=[]
specs = {
    'jump': (.18, [(480,.2),(720,.08)], 0, 1100, 'Soft ascending woodwind jump'),
    'bounce': (.3, [(180,.25),(360,.12)], 0, 1600, 'Elastic rising jelly pluck'),
    'slide': (.45, [(130,.035)], .065, 0, 'Short quiet butter brush'),
    'hazard': (.34, [(150,.2),(158,.12)], .025, -100, 'Gentle descending retry cue'),
    'attention': (.24, [(740,.12),(1110,.04)], 0, -500, 'Diner head-turn warning bell'),
    'fork': (.55, [(560,.12),(890,.09),(1340,.06)], .02, 0, 'Metallic fork settling resonance'),
    'fan': (.22, [(260,.035)], .08, 0, 'Soft fan extinguishing breath'),
    'return': (.65, [(330,.1),(440,.075),(660,.045)], 0, -90, 'Gallery transition chime'),
}
for name,(dur,tones,noise,sweep,desc) in specs.items(): records.append(save(name,effect(dur,tones,noise,sweep),desc))
for name,notes,desc in [('collect',[523.25,659.25,783.99,1046.5],'Original rising pear melody'),
                        ('restore',[392,523.25,659.25,783.99,1046.5],'Original garden restoration melody')]:
    samples=[0.0]*round(RATE*1.45)
    for n,f in enumerate(notes):
        start=round(n*.16*RATE)
        tone=effect(.75,[(f,.15),(f*2,.04)])
        for i,v in enumerate(tone):
            if start+i<len(samples): samples[start+i]+=v
    records.append(save(name,samples,desc))

# 24-second seamless original A-minor / C / F / E chamber bed.
# The continuous pad uses integer-period frequencies so its seam is exact.
for name,scale in [('supper',1),('museum',.75)]:
    duration=24; samples=[]
    for i in range(duration*RATE):
        t=i/RATE
        pad=sum(.018*math.sin(2*math.pi*f*t) for f in [110,165,220,330])
        samples.append(pad)
    chords=[(220,261.63,329.63),(261.63,329.63,392),(174.61,220,261.63),(164.81,207.65,246.94)]
    for beat in range(48):
        f=chords[(beat//12)%4][beat%3]*scale
        tone=effect(.46,[(f,.055),(f*2,.012)])
        start=round(beat*.5*RATE)
        for i,v in enumerate(tone): samples[start+i]+=v
    records.append(save(name,samples,'Original quiet repeating chamber arpeggio and seamless harmonic pad',True))
(ROOT/'asset-sources/audio-manifest.json').write_text(json.dumps(dict(schemaVersion=1,provider='Original authored synthesis',assets=records),indent=2)+'\n')
print(f'Prepared {len(records)} original WAV files; {sum((OUT/(r["id"]+".wav")).stat().st_size for r in records)} bytes.')
