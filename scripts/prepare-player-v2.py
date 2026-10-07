"""Local cleanup/registration/export of the approved game-wide heroine cutouts.

Never generation. Inputs are the inspected DreamLayer background removals in
asset-sources/production/player-v2. Every pose uses one common scale, so the
drawn size stays consistent; grounded poses share the foot baseline y264 and
the head/torso is centred on the canvas, which is the collider centre.
"""
from collections import deque
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'asset-sources/manifest.json'
SRC = ROOT / 'asset-sources/production/player-v2'
OUT = ROOT / 'public/assets/player'
CANVAS = (224, 272)
BASELINE = 264      # foot baseline of grounded poses (unchanged from v1)
STAND_HEIGHT = 256  # idle figure height in canvas pixels (unchanged from v1)
POSES = ['idle', 'walk-a', 'walk-b', 'jump']
GROUNDED = {'idle', 'walk-a', 'walk-b'}


def components(mask: np.ndarray) -> np.ndarray:
    """8-connected labels of a boolean mask, computed at quarter scale."""
    # Max-pool 4x4 blocks so every masked pixel belongs to a labelled block.
    h4, w4 = -(-mask.shape[0] // 4), -(-mask.shape[1] // 4)
    padded = np.zeros((h4 * 4, w4 * 4), bool); padded[:mask.shape[0], :mask.shape[1]] = mask
    small = padded.reshape(h4, 4, w4, 4).any(axis=(1, 3))
    labels = np.zeros(small.shape, np.int32)
    h, w = small.shape
    current = 0
    for y, x in zip(*np.nonzero(small)):
        if labels[y, x]: continue
        current += 1; labels[y, x] = current; queue = deque([(y, x)])
        while queue:
            cy, cx = queue.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = current; queue.append((ny, nx))
    return np.kron(labels, np.ones((4, 4), np.int32))[:mask.shape[0], :mask.shape[1]]


def clean(im: Image.Image) -> tuple[Image.Image, str]:
    """Drop ground lines/shadows: components that sit in the lowest band and
    are much wider than tall. Hair wisps and the figure are kept."""
    alpha = np.array(im.getchannel('A'))
    mask = alpha > 16
    labels = components(mask)
    ids, sizes = np.unique(labels[labels > 0], return_counts=True)
    main = ids[np.argmax(sizes)]
    ys = np.nonzero(labels == main)[0]
    bottom = ys.max()
    removed = 0
    for i in ids:
        if i == main: continue
        cy, cx = np.nonzero(labels == i)
        flat = (cy.max() - cy.min() + 1) * 2 < (cx.max() - cx.min() + 1)
        if cy.min() > bottom - 160 and flat:
            alpha[labels == i] = 0; removed += 1
    out = im.copy(); out.putalpha(Image.fromarray(alpha))
    return out, f'Removed {removed} flat ground-line/shadow component(s) below the figure.'


def bbox(im: Image.Image):
    return im.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()


def torso_centre(im: Image.Image, box) -> float:
    """Alpha-weighted x centre of the head and upper body."""
    alpha = np.array(im.getchannel('A'), np.float64)
    top, bottom = box[1], box[1] + int((box[3] - box[1]) * 0.45)
    band = alpha[top:bottom]
    xs = np.arange(band.shape[1])
    return float((band.sum(axis=0) * xs).sum() / band.sum())


manifest = json.loads(MANIFEST.read_text())
cleaned = {}
notes = {}
for pose in POSES:
    cleaned[pose], notes[pose] = clean(Image.open(SRC / f'{pose}-cutout.png').convert('RGBA'))
idle_box = bbox(cleaned['idle'])
scale = STAND_HEIGHT / (idle_box[3] - idle_box[1])
frames = {}
for pose in POSES:
    im = cleaned[pose]
    box = bbox(im)
    centre = torso_centre(im, box)
    w, h = round(im.width * scale), round(im.height * scale)
    small = im.resize((w, h), Image.Resampling.LANCZOS)
    x = round(CANVAS[0] / 2 - centre * scale)
    if pose in GROUNDED:
        y = round(BASELINE - box[3] * scale)
    else:
        # Airborne: keep the idle head height so the jump stays registered.
        y = round(BASELINE - idle_box[3] * scale)
    frame = Image.new('RGBA', CANVAS)
    frame.alpha_composite(small, (x, y))
    fb = bbox(frame)
    if fb[0] <= 0 or fb[2] >= CANVAS[0] or fb[1] <= 0:
        raise ValueError(f'{pose}: figure clipped by the canvas {fb}')
    frames[pose] = frame
    path = OUT / f'{pose}.png'
    frame.save(path, optimize=True)
    asset_id = f'player-v2.{pose}'
    entry = next((a for a in manifest['assets'] if a['id'] == asset_id), None)
    if entry is None:
        entry = dict(id=asset_id, world='shared', provider='DreamLayer', operation='local_registration',
                     sourcePath=f'asset-sources/production/player-v2/{pose}-cutout.png',
                     referenceIds=[f'player-v2.{pose}.cutout'], executionId=None, creditsSpent=0)
        manifest['assets'].append(entry)
    entry.update(status='integrated', approved=True, runtimePath=path.relative_to(ROOT).as_posix(),
                 preparedPixelSize={'width': CANVAS[0], 'height': CANVAS[1]}, figureBox=list(fb),
                 runtimeSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                 preparationNotes=f'{notes[pose]} Common scale {scale:.5f} from the idle height; '
                 f'{CANVAS[0]}x{CANVAS[1]} canvas, head/torso centred, '
                 + ('foot baseline y264.' if pose in GROUNDED else 'airborne, idle head height.')
                 + ' Lanczos resize; source cutout preserved.')
    print(pose, '=>', path.relative_to(ROOT).as_posix(), fb)
# The v1 runtime frames are retired, not deleted: their sources stay recorded.
for a in manifest['assets']:
    if a['id'] in ('player.idle', 'player.walk-a', 'player.walk-b', 'player.jump'):
        a['status'] = 'rejected'
        a['preparationNotes'] = (a.get('preparationNotes') or '') + (
            ' Retired 2026-10-07: replaced game-wide by the user-selected heroine (player-v2.*);'
            ' v1 runtime copies are in asset-sources/production/player-v1-runtime.')
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

sheet = Image.new('RGB', (CANVAS[0] * 4 * 2, CANVAS[1] + 24), '#4c3037')
draw = ImageDraw.Draw(sheet)
for i, (pose, im) in enumerate(frames.items()):
    for j, bg in enumerate(['#4c3037', '#f3e3b0']):
        x = (j * 4 + i) * CANVAS[0]
        draw.rectangle((x, 24, x + CANVAS[0] - 1, 24 + CANVAS[1]), fill=bg)
        draw.line((x, 24 + BASELINE, x + CANVAS[0], 24 + BASELINE), fill='#ff4fa0')
        sheet.paste(im, (x, 24), im)
        draw.text((x + 6, 6), pose, fill='#ffe3bc')
sheet.save(ROOT / 'asset-sources/production/player-v2/pose-review.png')
