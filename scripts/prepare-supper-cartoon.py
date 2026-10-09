# Royal Supper cartoon rework (user, 2026-10-09): cut the DreamLayer references
# in asset-sources/references/supper/ into runtime art for the Supper scene.
# Local preparation only: no generation, 0 credits. Writes
# public/assets/supper/cartoon/*, a review board in
# asset-sources/production/supper-cartoon-v1/ and manifest entries.
#
# Keying follows scripts/prepare-sketch-skins.py: everything close to the flat
# sheet background, or pale and connected to the border (the diner edits have a
# faint paper texture), is transparent; ink outlines stop the flood. Parts are
# cropped from boxes measured on the 2026-10-09 references. Presentation only:
# collision, timing and level data never read these pixels.
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import numpy as np
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT / 'asset-sources/references/supper'
OUT = ROOT / 'public/assets/supper/cartoon'
REVIEW = ROOT / 'asset-sources/production/supper-cartoon-v1'
MANIFEST = ROOT / 'asset-sources/manifest.json'
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
outputs = {}


def cutout(name, key=48, flood=70, opening=5, fill_holes=True):
    """RGBA of a whole reference with its sheet background keyed out."""
    rgb = Image.open(REFS / f'{name}.png').convert('RGB')
    a = np.asarray(rgb).astype(int)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    distance = np.abs(a - np.median(border, 0)).sum(2)
    background = distance <= key
    if flood:
        pale = Image.new('L', (a.shape[1] + 2, a.shape[0] + 2), 255)
        pale.paste(Image.fromarray(((distance < flood) * 255).astype('uint8')), (1, 1))
        ImageDraw.floodfill(pale, (0, 0), 128)
        background |= np.asarray(pale)[1:-1, 1:-1] == 128
    raw = Image.fromarray((~background * 255).astype('uint8'))
    opened = raw.filter(ImageFilter.MinFilter(opening)).filter(ImageFilter.MaxFilter(opening))
    mask = np.minimum(np.asarray(raw), np.asarray(opened.filter(ImageFilter.MaxFilter(3))))
    if fill_holes:
        pad = Image.new('L', (mask.shape[1] + 2, mask.shape[0] + 2), 0)
        pad.paste(Image.fromarray(mask), (1, 1))
        ImageDraw.floodfill(pad, (0, 0), 128)
        mask = np.where(np.asarray(pad)[1:-1, 1:-1] == 128, 0, 255).astype('uint8')
    # Shrink by two pixels before the feather: the sheet colour bleeds into the
    # outermost ring of the ink line and reads as a pale halo on dark scenery.
    alpha = Image.fromarray(mask).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
    return np.dstack([np.asarray(rgb), np.asarray(alpha)])


def trim(rgba):
    ys, xs = np.where(rgba[:, :, 3] > 8)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def crop(rgba, box):
    x0, y0, x1, y1 = box
    return trim(rgba[y0:y1, x0:x1].copy())


# Same colour lift as the Sketch skins, so both worlds read equally poppy.
SATURATION, CONTRAST = 1.25, 1.06


def pop(image):
    rgb = ImageEnhance.Contrast(ImageEnhance.Color(image.convert('RGB')).enhance(SATURATION)).enhance(CONTRAST)
    if image.mode == 'RGBA':
        rgb.putalpha(image.getchannel('A'))
    return rgb


# WebP keeps the cutouts' alpha at a fraction of PNG's size (the diner poses
# were about 0.5 MB each as PNG).
def save(asset_id, image, reference, box, notes, max_side=512, fmt='webp', lift=True):
    if isinstance(image, np.ndarray):
        image = Image.fromarray(image.astype('uint8'), 'RGBA')
    if lift:
        image = pop(image)
    scale = min(1, max_side / max(image.size))
    if scale < 1:
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)
    path = OUT / f'{asset_id.split(".", 1)[1]}.{fmt}'
    if image.mode == 'RGBA':
        image.save(path, quality=88, alpha_quality=100, method=6)
    else:
        image.convert('RGB').save(path, quality=84, method=6)
    outputs[asset_id] = dict(path=path, reference=reference, box=box, notes=notes, size=image.size)
    return image


def strip(asset_id, rgba, left, mid, right, reference, box, notes, max_side=512):
    """A repeatable platform skin: left cap, a seamless middle tile, right cap.
    Fractions are of the trimmed width; the scene repeats only the middle."""
    w = rgba.shape[1]
    cut = lambda a, b: rgba[:, round(a * w):round(b * w)].copy()
    save(f'{asset_id}-left', cut(0, left), reference, box, f'{notes} Left cap.', max_side)
    save(asset_id, cut(*mid), reference, box, f'{notes} Seamless middle tile ({mid[0]:.2f}..{mid[1]:.2f}).', max_side)
    save(f'{asset_id}-right', cut(1 - right, 1), reference, box, f'{notes} Right cap.', max_side)


# --- backdrop and museum painting ------------------------------------------
# The far side of the feast table, its guests and the hall. Pushed back for
# readability: softer colour, a dusk haze and a darker tablecloth drape below
# the far table edge so gaps in the route still read as drops.
hall = ImageEnhance.Color(Image.open(REFS / 'backdrop-v1.png').convert('RGB')).enhance(0.72)
a = np.asarray(hall).astype(float)
rows = np.linspace(0, 1, a.shape[0])[:, None, None]
a = a * 0.74 + np.array([58, 34, 50]) * 0.26
a = a * np.clip(1 - (rows - 0.77) * 2.6, 0.42, 1)
hall = Image.fromarray(a.clip(0, 255).astype('uint8')).resize((2048, 1152), Image.LANCZOS)
save('royal-supper.background', hall, 'supper.backdrop.reference-v1', None,
     'Whole hall at 2048x1152: saturation 0.72, 26% dusk haze, drape below the far table edge darkened to 42%. Mirrored tiling in the scene.',
     max_side=2048, lift=False)

# The second banquet edit came back square and re-framed, so it hangs in the
# museum instead: cropped to the side frames' 2.8 x 1.8 shape.
party = Image.open(REFS / 'backdrop-b-v1.png').convert('RGB')
y0 = 40
save('royal-supper.entrance', party.crop((0, y0, 2048, y0 + round(2048 * 1.8 / 2.8))).resize((1120, 720), Image.LANCZOS),
     'supper.backdrop-b.reference-v1', [0, y0, 2048, y0 + round(2048 * 1.8 / 2.8)],
     'Museum painting of the banquet: the second guest table, cropped to the 2.8 x 1.8 side frame.',
     max_side=1120, lift=False)

# --- food ----------------------------------------------------------------------
food = cutout('food-v1')
FOOD = dict(bread=(300, 180, 840, 650), butter=(1070, 300, 1650, 640), crumb=(1860, 350, 2260, 630),
            cake=(330, 800, 800, 1210), jelly=(1015, 860, 1690, 1210), grape=(1860, 820, 2240, 1220))
part = {k: crop(food, v) for k, v in FOOD.items()}
save('royal-supper.crumb', part['crumb'], 'supper.food.reference-v1', FOOD['crumb'], 'Crumb hazard.')
save('royal-supper.jelly', part['jelly'], 'supper.food.reference-v1', FOOD['jelly'], 'Jelly bounce pad; drawn deeper than its thin collider, sitting in its dish.')
save('royal-supper.grape', part['grape'], 'supper.food.reference-v1', FOOD['grape'], 'Rolling grape.')
strip('royal-supper.bread', part['bread'], 0.2, (0.3, 0.7), 0.24, 'supper.food.reference-v1', FOOD['bread'], 'Bread slice platform.')
strip('royal-supper.butter', part['butter'], 0.16, (0.34, 0.56), 0.24, 'supper.food.reference-v1', FOOD['butter'], 'Butter slide.')
strip('royal-supper.cake', part['cake'], 0.14, (0.30, 0.62), 0.14, 'supper.food.reference-v1', FOOD['cake'], 'Dessert cake shelf.')

# --- tableware -------------------------------------------------------------------
ware = cutout('tableware-v1')
WARE = dict(basket=(285, 330, 1015, 745), goblet=(1110, 100, 1465, 745), cover=(1480, 405, 2325, 740),
            plate=(320, 790, 2230, 925))
part = {k: crop(ware, v) for k, v in WARE.items()}
save('royal-supper.basket', part['basket'], 'supper.tableware.reference-v1', WARE['basket'], 'Start basket; drawn deeper than its collider.')
save('royal-supper.goblet', part['goblet'], 'supper.tableware.reference-v1', WARE['goblet'], 'Goblet arch under its plate.')
# The heroine's smock is teal: the casserole she hides behind turns plum-crimson
# (teal hues only; its gold trim and ink keep their colours).
hsv = np.asarray(Image.fromarray(part['cover'][:, :, :3].astype('uint8')).convert('HSV')).copy()
teal = (hsv[:, :, 0] > 100) & (hsv[:, :, 0] < 150) & (hsv[:, :, 1] > 40)
hsv[:, :, 0] = np.where(teal, (hsv[:, :, 0].astype(int) + 118) % 256, hsv[:, :, 0])
cover = np.dstack([np.asarray(Image.fromarray(hsv, 'HSV').convert('RGB')), part['cover'][:, :, 3]])
save('royal-supper.cover', cover, 'supper.tableware.reference-v1', WARE['cover'], 'Casserole cover against the diner, recoloured from teal to plum-crimson.')
strip('royal-supper.plate', part['plate'], 0.08, (0.40, 0.60), 0.08, 'supper.tableware.reference-v1', WARE['plate'],
      'Serving platter for plates and crockery.', max_side=768)
# The sheet's fork lost its tines; the fork comes from its own upright reference.
fork = trim(cutout('fork-v1'))
save('royal-supper.fork', fork, 'supper.fork.reference-v1', None, 'Upright fork that topples into the bridge.', max_side=768)

# --- candles, fan and checkpoint flag ---------------------------------------------
lights = cutout('candles-v1', flood=60)
LIGHT = dict(foot=(360, 540, 650, 695), wax=(1135, 232, 1440, 695),
             flame=(1890, 145, 2225, 700), ember=(430, 840, 575, 1295), fan=(1040, 815, 1535, 1315),
             flag=(1980, 840, 2180, 1295))
part = {k: crop(lights, v) for k, v in LIGHT.items()}
# The sheet's candelabrum is tall and its cups narrower than the route's
# 3-unit candles, 6 units apart: only its foot is used, under the centre stem;
# the scene draws the brass dishes and arms. The wax crop drops the wick (the
# ember has its own).
save('royal-supper.holder', part['foot'], 'supper.candles.reference-v1', LIGHT['foot'], 'Candelabrum foot under the centre stem.')
for k in ('wax', 'flame', 'ember', 'fan', 'flag'):
    save(f'royal-supper.{k}', part[k], 'supper.candles.reference-v1', LIGHT[k],
         dict(wax='Candle body.', flame='Lit flame (hazard drawn over its rect).', ember='Smoking wick while a flame is out.',
              fan='Fan rotor; its turn follows the candle clock.', flag='Checkpoint flag.')[k])

# --- the watchful diner ----------------------------------------------------------
# Three edits of one bust share the same framing; one union box keeps them
# registered so the scene swaps poses (eat / turn / look) without a jump.
poses = {p: cutout(n, flood=80) for p, n in (('eat', 'diner-eat-v1'), ('turn', 'diner-turn-v1'), ('look', 'diner-look-v1'))}
boxes = [np.where(r[:, :, 3] > 8) for r in poses.values()]
union = (min(int(xs.min()) for ys, xs in boxes), min(int(ys.min()) for ys, xs in boxes),
         max(int(xs.max()) for ys, xs in boxes) + 1, max(int(ys.max()) for ys, xs in boxes) + 1)
for pose, rgba in poses.items():
    asset = 'royal-supper.diner' if pose == 'eat' else f'royal-supper.diner-{pose}'
    x0, y0, x1, y1 = union
    save(asset, rgba[y0:y1, x0:x1], f'supper.diner-{pose}.reference-v1', list(union),
         f'Watchful diner, {pose} pose; common registration box across the three poses.', max_side=640)

# --- review board and manifest -------------------------------------------------
def board():
    items = [(k, Image.open(v['path']).convert('RGBA')) for k, v in outputs.items()]
    cell, cols = 260, 6
    rows_n = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows_n * (cell + 20)), (58, 40, 52))
    d = ImageDraw.Draw(sheet)
    for i, (k, im) in enumerate(items):
        im = im.copy(); im.thumbnail((cell - 12, cell - 12))
        x, y = (i % cols) * cell, (i // cols) * (cell + 20)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
        d.text((x + 6, y + cell + 2), k.split('.', 1)[1], fill=(240, 230, 220))
    sheet.save(REVIEW / 'runtime-board.png')


def manifest():
    m = json.loads(MANIFEST.read_text())
    keep = [a for a in m['assets'] if not (a['id'] in outputs and a.get('operation') == 'local_preparation')]
    for asset_id, o in outputs.items():
        data = o['path'].read_bytes()
        keep.append(dict(id=asset_id, world='royal-supper', provider='DreamLayer', operation='local_preparation',
                         referenceIds=[o['reference']], executionId=None, creditsSpent=0, approved=False, status='prepared',
                         sourcePath=f"asset-sources/references/supper/{o['reference'].split('.')[1]}-{o['reference'].rsplit('-', 1)[1]}.png",
                         runtimePath=str(o['path'].relative_to(ROOT)).replace('\\', '/'),
                         preparedPixelSize=dict(width=o['size'][0], height=o['size'][1]), cropBox=o['box'],
                         preparationNotes=f"{o['notes']} Local script scripts/prepare-supper-cartoon.py, 0 credits.",
                         sha256=hashlib.sha256(data).hexdigest()))
    m['assets'] = keep
    MANIFEST.write_text(json.dumps(m, indent=2) + '\n')


board()
manifest()
for k, o in outputs.items():
    print(k, o['size'], o['path'].stat().st_size)
