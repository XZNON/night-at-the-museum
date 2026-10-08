# S5C: the enchanted light's piece art, cut locally from the aligned complete
# masterpiece so the piece the player drags is the sun that appears in the sky.
# Writes only public/assets/restoration/light.png and its manifest entry.
# No generation; 0 credits. Do not rerun prepare-art.py for this.
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'asset-sources/manifest.json'
RESTORATION = ROOT / 'public/assets/restoration'
SIZE = 128

full = Image.open(RESTORATION / 'complete.webp').convert('RGB')
sun_mask = Image.open(RESTORATION / 'sun-mask.png').convert('L')
left, top, right, bottom = sun_mask.getbbox()
cx, cy = (left + right) / 2, (top + bottom) / 2
box = (round(cx - SIZE / 2), round(cy - SIZE / 2), round(cx - SIZE / 2) + SIZE, round(cy - SIZE / 2) + SIZE)

piece = full.crop(box).convert('RGBA')
mask = np.array(sun_mask.crop(box).filter(ImageFilter.MaxFilter(3)), dtype=float) / 255
# A soft warm halo around the painted disc, fading out before the crop edge.
radius = max(right - left, bottom - top) / 2
y, x = np.mgrid[0:SIZE, 0:SIZE]
distance = np.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2)
halo = np.clip(1 - (distance - radius) / (SIZE / 2 - radius - 2), 0, 1) ** 2 * 0.8
alpha = np.maximum(mask, halo)
rgb = np.array(piece, dtype=float)[:, :, :3]
# The halo carries the painting's warm light; the disc keeps its painted pixels.
warm = np.array([255, 226, 160], dtype=float)
glow = rgb * 0.45 + warm * 0.55
rgb = rgb * mask[..., None] + glow * (1 - mask[..., None])
out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype('uint8')
path = RESTORATION / 'light.png'
Image.fromarray(out, 'RGBA').save(path, optimize=True)

text = MANIFEST.read_text(encoding='utf-8')
m = json.loads(text)
entry = next((a for a in m['assets'] if a['id'] == 'restoration.light'), None)
if entry is None:
    entry = dict(id='restoration.light', world='masterpiece', provider='DreamLayer', operation='local_preparation',
                 referenceIds=['masterpiece.reference'], sourcePath='public/assets/restoration/complete.webp',
                 executionId=None, creditsSpent=0, approved=False)
    m['assets'].append(entry)
entry.update(status='prepared', runtimePath='public/assets/restoration/light.png',
             preparedPixelSize={'width': SIZE, 'height': SIZE}, cropBox=list(box),
             preparationNotes='Enchanted light piece (stage-2 piece sun-disc): the painted sun cut from the aligned complete.webp by sun-mask.png, '
                              'widened by a feathered warm halo. Same pixels as the restored sky; local script scripts/prepare-light.py, no generation.',
             runtimeSha256=hashlib.sha256(path.read_bytes()).hexdigest())
MANIFEST.write_text(json.dumps(m, indent=2) + '\n', encoding='utf-8')
print(box, path.stat().st_size, entry['runtimeSha256'])
