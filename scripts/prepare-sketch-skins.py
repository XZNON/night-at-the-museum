# Sketch art pass, part 1: cut the user-approved DreamLayer references in
# asset-sources/references/sketch/ into runtime skins for the Sketch scene.
# Local preparation only: no generation, 0 credits. Writes public/assets/sketch/*.png,
# a review board in asset-sources/production/sketch-v1/ and manifest entries.
#
# Each reference sits on a flat plain background. A colour key against that
# background, a morphological opening (drops thin pencil construction lines)
# and optional hole filling give the alpha; parts are then cropped from fixed
# boxes measured on the 2026-10-07 references. Presentation only: collision,
# timing and level data never read these pixels.
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import numpy as np
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / 'asset-sources/references/sketch'
OUT = ROOT / 'public/assets/sketch'
REVIEW = ROOT / 'asset-sources/production/sketch-v1'
MANIFEST = ROOT / 'asset-sources/manifest.json'
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)


def cutout(name, key=45, opening=11, fill_holes=True, shadow_key=None):
    """RGBA of a whole reference with its flat background keyed out.

    With `shadow_key`, everything pale enough (below that distance) that is
    connected to the border is background too: soft baked shadows go, while
    the ink outlines stop the flood so the object's own light areas stay.
    """
    rgb = Image.open(REFS / f'{name}.png').convert('RGB')
    a = np.asarray(rgb).astype(int)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    distance = np.abs(a - np.median(border, 0)).sum(2)
    background = distance <= key
    if shadow_key:
        pale = Image.new('L', (a.shape[1] + 2, a.shape[0] + 2), 255)
        pale.paste(Image.fromarray(((distance < shadow_key) * 255).astype('uint8')), (1, 1))
        ImageDraw.floodfill(pale, (0, 0), 128)
        background |= np.asarray(pale)[1:-1, 1:-1] == 128
    raw = Image.fromarray((~background * 255).astype('uint8'))
    opened = raw.filter(ImageFilter.MinFilter(opening)).filter(ImageFilter.MaxFilter(opening))
    mask = np.minimum(np.asarray(raw), np.asarray(opened.filter(ImageFilter.MaxFilter(5))))
    if fill_holes:
        pad = Image.new('L', (mask.shape[1] + 2, mask.shape[0] + 2), 0)
        pad.paste(Image.fromarray(mask), (1, 1))
        ImageDraw.floodfill(pad, (0, 0), 128)
        mask = np.where(np.asarray(pad)[1:-1, 1:-1] == 128, 0, 255).astype('uint8')
    # A one-pixel feather keeps the ink edge smooth when the skin is scaled.
    alpha = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(1.2))
    return np.dstack([np.asarray(rgb), np.asarray(alpha)])


def trim(rgba):
    ys, xs = np.where(rgba[:, :, 3] > 8)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def crop(rgba, box):
    x0, y0, x1, y1 = box
    return trim(rgba[y0:y1, x0:x1].copy())


def colour(name, x, y):
    a = np.asarray(Image.open(REFS / f'{name}.png').convert('RGB'))
    r, g, b = np.median(a[y - 4:y + 5, x - 4:x + 5].reshape(-1, 3), 0).astype('uint8')
    r, g, b = pop(Image.new('RGB', (1, 1), (int(r), int(g), int(b)))).getpixel((0, 0))
    return f'#{r:02x}{g:02x}{b:02x}'


outputs = {}

# User review 2026-10-08: the game should look poppy and colourful, not
# whitewashed. The approved pastel references get a saturation and contrast
# lift at preparation (sources unchanged).
SATURATION, CONTRAST = 1.45, 1.08


def pop(image):
    rgb = ImageEnhance.Contrast(ImageEnhance.Color(image.convert('RGB')).enhance(SATURATION)).enhance(CONTRAST)
    if image.mode == 'RGBA':
        rgb.putalpha(image.getchannel('A'))
    return rgb


def save(asset_id, rgba, reference, box, notes, max_side=512):
    image = pop(Image.fromarray(rgba.astype('uint8'), 'RGBA'))
    scale = min(1, max_side / max(image.size))
    if scale < 1:
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)
    path = OUT / f'{asset_id.split(".", 1)[1]}.png'
    image.save(path, optimize=True)
    outputs[asset_id] = dict(path=path, reference=reference, box=box, notes=notes, size=image.size)


# --- boards and ground -------------------------------------------------------
pend = cutout('pendulum-plank-v1')
plank = pend[1172:1392, 250:1795].copy()
# The approved plank's cap-and-rod read as a giant nail; the scene keeps its own
# suspension rod, so the rod and its hole are painted out from the plank.
x0, x1, shift, feather = 620, 900, 280, 40
patch = plank[:, x0 - shift:x1 - shift].astype(float)
k = np.ones(x1 - x0)
k[:feather] = np.linspace(0, 1, feather)
k[-feather:] = np.linspace(1, 0, feather)
k = k[None, :, None]
plank[:, x0:x1] = (plank[:, x0:x1] * (1 - k) + patch * k).astype('uint8')
save('sketch.plank', trim(plank), 'sketch.pendulum-plank.reference-v1', [250, 1172, 1795, 1392],
     'Layer 1 pendulum plank only; rod, cap and rod hole painted out from neighbouring plank columns.')

save('sketch.board', crop(cutout('moving-board-v1', opening=21), (660, 540, 1950, 820)),
     'sketch.moving-board.reference-v1', [660, 540, 1950, 820],
     'Layer 2 moving board; wider opening drops a stray construction stroke.')

save('sketch.ruler', crop(cutout('climb-board-v1'), (820, 320, 1230, 1690)),
     'sketch.climb-board.reference-v1', [820, 320, 1230, 1690], 'Upright ruler block for the Layer 3 walls.')

ground = cutout('ground-v1')
save('sketch.ground-top', crop(ground, (470, 680, 2100, 766)), 'sketch.ground.reference-v1', [470, 680, 2100, 766],
     'Workbench top board only; the inset apron is replaced by a flat body drawn in code so ground tiles straight.')

# --- axe ---------------------------------------------------------------------
axe = cutout('axe-v1')
save('sketch.axe-bolt', crop(axe, (780, 120, 1260, 325)), 'sketch.axe.reference-v1', [780, 120, 1260, 325],
     'Pivot bolt and bracket bar.', max_side=256)
save('sketch.axe-handle', crop(axe, (860, 300, 1100, 1440)), 'sketch.axe.reference-v1', [860, 300, 1100, 1440],
     'Handle rod between bolt and head.', max_side=512)
head = axe[1425:1860, 968:1312].copy()
# A double-bit head: the bit mirrored about the handle so both swing directions
# show the white danger edge (the single-edge note from the reference review).
double = trim(np.concatenate([head[:, ::-1], head], axis=1))
save('sketch.axe-head', double, 'sketch.axe.reference-v1', [968, 1425, 1312, 1860],
     'Double-bit head: the right half of the hatchet head mirrored about the handle centre.')

# --- lift ----------------------------------------------------------------------
lift = cutout('lift-v1')
save('sketch.lift-deck', crop(lift, (300, 600, 1080, 1250)), 'sketch.lift.reference-v1', [300, 600, 1080, 1250],
     'Hazard-striped deck with its amber lamp.')
save('sketch.lift-piston', crop(lift, (1440, 160, 1660, 1250)), 'sketch.lift.reference-v1', [1440, 160, 1660, 1250],
     'Chrome piston; the scene stretches its plain middle with the rise.')
save('sketch.lift-pump', crop(lift, (1860, 700, 2310, 1250)), 'sketch.lift.reference-v1', [1860, 700, 2310, 1250],
     'Pump housing with hose and gauge; scenery beside the piston base.', max_side=256)

# --- nailable wood -------------------------------------------------------------
strip = cutout('nailable-strip-v1', fill_holes=False)
save('sketch.yardstick', crop(strip, (240, 1060, 2370, 1200)), 'sketch.nailable-strip.reference-v1', [240, 1060, 2370, 1200],
     'Yardstick strip F.')
save('sketch.dowel', crop(strip, (900, 822, 1690, 895)), 'sketch.nailable-strip.reference-v1', [900, 822, 1690, 895],
     'Dowel bar for moving bars M1/M2 (hanger loops cropped off).')
save('sketch.trolley', crop(strip, (1170, 244, 1435, 445)), 'sketch.nailable-strip.reference-v1', [1170, 244, 1435, 445],
     'Wheel trolley with the rail section it rides on.', max_side=256)
rail = np.concatenate([strip[304:360, 250:1150], strip[304:360, 1460:2356]], axis=1)
save('sketch.rail', trim(rail), 'sketch.nailable-strip.reference-v1', [250, 304, 2356, 360],
     'Ceiling rail with the trolley section removed, so it stretches cleanly.')

# --- glue ----------------------------------------------------------------------
glue = cutout('glue-v1')
save('sketch.glue-bottle', crop(glue, (160, 470, 1140, 1060)), 'sketch.glue.reference-v1', [160, 470, 1140, 1060],
     'Tipped glue bottle and spill; scenery at the pool edge.')
band = glue[566:800, 1275:2365].copy()
# Seamless horizontal tile across the whole pool surface: the last columns
# fade into the first ones, so the drips keep their natural spacing.
seam = 140
k = np.linspace(0, 1, seam)[None, :, None]
band[:, -seam:] = band[:, -seam:] * (1 - k) + band[:, :seam] * k
band = band[:, :-seam]
save('sketch.glue-top', band, 'sketch.glue.reference-v1', [1275, 566, 2365, 800],
     'Seamless tile of the pool surface and drips; the body below is a flat glue fill drawn in code.', max_side=768)

# --- nails ---------------------------------------------------------------------
nail = cutout('nail-v1')
save('sketch.nail-head', crop(nail, (1390, 450, 2010, 1030)), 'sketch.nail.reference-v1', [1390, 450, 2010, 1030],
     'Head-on nail head for pins driven into the picture.', max_side=256)
save('sketch.nail-cap', crop(nail, (585, 280, 1065, 446)), 'sketch.nail.reference-v1', [585, 280, 1065, 446],
     'Side-view head: the standing top of a foothold nail.', max_side=256)
save('sketch.nail-shaft', crop(nail, (680, 446, 970, 1215)), 'sketch.nail.reference-v1', [680, 446, 970, 1215],
     'Side-view shaft and tip below the head.', max_side=256)
save('sketch.nail-side', crop(nail, (585, 280, 1065, 1215)), 'sketch.nail.reference-v1', [585, 280, 1065, 1215],
     'Whole side-view nail for swing sockets.', max_side=256)
save('sketch.nail-pickup', trim(cutout('nail-pickup-v1', fill_holes=False)), 'sketch.nail-pickup.reference-v1', None,
     'Third-nail pickup with sparkles and halo ring.', max_side=256)

# --- background tools ----------------------------------------------------------
# A stronger key drops the pale baked shadows, which read as white smudges
# on the saturated layer bands.
decor = cutout('decor-v1', key=12, fill_holes=False, shadow_key=120)
cells = {'tin': (200, 220, 790, 630), 'pencil': (960, 220, 1560, 630), 'screwdriver': (1740, 220, 2350, 630),
         'spanner': (200, 800, 790, 1240), 'tape': (960, 800, 1560, 1240), 'screws': (1740, 800, 2350, 1240)}
for prop, box in cells.items():
    save(f'sketch.decor-{prop}', crop(decor, box), 'sketch.decor.reference-v1', list(box),
         f'Background toolbox prop ({prop}).', max_side=256)

# --- art pass part 2 (user, 2026-10-08): torch, museum painting, toolbox backdrop --
# Generated with DreamLayer for this pass (manifest sketch.*.reference-v1/v2).
# The v6 stage-backdrop trial is superseded by the toolbox enclosure below.
save('sketch.torch', trim(cutout('torch-v1')), 'sketch.torch.reference-v1', None,
     'Empty upright torch; the scene draws the enchanted light above its cup.', max_side=512)

# The museum frame is 14:9; both states share one crop so the light simply goes.
lit = Image.open(REFS / 'entrance-v1.png').convert('RGB').crop((160, 0, 2400, 1440)).resize((1120, 720), Image.LANCZOS)
path = OUT / 'entrance.webp'; lit.save(path, quality=90, method=6)
outputs['sketch.entrance'] = dict(path=path, reference='sketch.entrance.reference-v1', box=[160, 0, 2400, 1440], size=lit.size,
    notes='Museum Sketch frame: a car in a night garage, light peeking out of the toolbox. Centre crop to the 14:9 frame.')
empty = Image.open(REFS / 'entrance-empty-v2.png').convert('RGB')
k = empty.width / 2560   # edit of the lit painting padded to a 2560 square (rows 560..2000)
empty = empty.crop((round(160 * k), round(560 * k), round(2400 * k), round(2000 * k))).resize((1120, 720), Image.LANCZOS)
path = OUT / 'entrance-empty.webp'; empty.save(path, quality=90, method=6)
outputs['sketch.entrance-empty'] = dict(path=path, reference='sketch.entrance-empty.reference-v2', box=None, size=empty.size,
    notes='The same painting once the light is taken: lid shut, no glow; same crop as sketch.entrance.')

backdrop = Image.open(REFS / 'toolbox-backdrop-v1.png').convert('RGB')
# The upper zone came out salmon, nearly the box walls' red, so Layer 3 read as
# all red: on the back wall only, its reds shift toward the pink of the
# earlier bands (hue, lighter, softer); stickers and ink are untouched.
hsv = np.asarray(backdrop.convert('HSV')).astype(float)
zone = np.zeros(hsv.shape[:2], bool); zone[110:445, 330:2233] = True
reds = zone & ((hsv[..., 0] > 235) | (hsv[..., 0] < 12)) & (hsv[..., 1] > 70) & (hsv[..., 2] > 150)
hsv[..., 0] = np.where(reds, (hsv[..., 0] - 16) % 256, hsv[..., 0])
hsv[..., 1] = np.where(reds, hsv[..., 1] * 0.62, hsv[..., 1])
hsv[..., 2] = np.where(reds, np.minimum(255, hsv[..., 2] * 1.08), hsv[..., 2])
backdrop = Image.fromarray(hsv.astype('uint8'), 'HSV').convert('RGB')
backdrop = ImageEnhance.Color(backdrop).enhance(1.1)
path = OUT / 'toolbox.webp'; backdrop.save(path, quality=90, method=6)
outputs['sketch.toolbox'] = dict(path=path, reference='sketch.toolbox-backdrop.reference-v1', box=None, size=backdrop.size,
    notes='Inside the open toolbox: red riveted walls, floor and lid around honey/blue/rose zones; the scene maps each zone to its layer.')

# Flat colours sampled for the code-drawn bodies that continue a skin.
palette = {
    'groundBody': colour('ground-v1', 800, 795),
    'glueBody': colour('glue-v1', 1800, 900),
    'hanger': colour('nailable-strip-v1', 968, 600),
    'rod': colour('pendulum-plank-v1', 1024, 900),
}
print('palette', palette)

# --- review board ---------------------------------------------------------------
cols, cell = 6, 300
rows = (len(outputs) + cols - 1) // cols
board = Image.new('RGB', (cols * cell, rows * (cell + 24)), (58, 48, 78))
draw = ImageDraw.Draw(board)
for i, (asset_id, o) in enumerate(outputs.items()):
    im = Image.open(o['path']).convert('RGBA')
    im.thumbnail((cell - 20, cell - 20))
    x, y = (i % cols) * cell, (i // cols) * (cell + 24)
    board.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
    draw.text((x + 6, y + cell + 4), f'{asset_id} {o["size"][0]}x{o["size"][1]}', fill=(240, 236, 220))
board.save(REVIEW / 'skins-review.png')

# --- manifest -------------------------------------------------------------------
m = json.loads(MANIFEST.read_text(encoding='utf-8'))
for asset_id, o in outputs.items():
    entry = next((a for a in m['assets'] if a['id'] == asset_id), None)
    if entry is None:
        entry = dict(id=asset_id, world='unfinished-sketch', provider='DreamLayer', operation='local_preparation',
                     referenceIds=[o['reference']], executionId=None, creditsSpent=0, approved=False)
        m['assets'].append(entry)
    rel = o['path'].relative_to(ROOT).as_posix()
    version = o['reference'].rsplit('-', 1)[1]
    entry.update(status='prepared', sourcePath=f'asset-sources/references/sketch/{o["reference"].split(".")[1]}-{version}.png',
                 runtimePath=rel, preparedPixelSize={'width': o['size'][0], 'height': o['size'][1]}, cropBox=o['box'],
                 preparationNotes=o['notes'] + ' Local script scripts/prepare-sketch-skins.py, no generation.',
                 runtimeSha256=hashlib.sha256(o['path'].read_bytes()).hexdigest())
MANIFEST.write_text(json.dumps(m, indent=2) + '\n', encoding='utf-8')
print(len(outputs), 'skins written to', OUT.relative_to(ROOT).as_posix())
