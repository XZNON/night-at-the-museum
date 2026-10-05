"""Crop/resize inspected ImageGen atlases for authored Royal Supper geometry.

No generation or creative repainting; full original sheets remain separate.
Does not re-prepare the existing DreamLayer slice or registered player poses.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'asset-sources/manifest.json'
m = json.loads(MANIFEST.read_text())
# Rectangular fronts are registered to collider bounds; cutouts retain alpha.
props = [
    ('basket', 'food', (70, 246, 567, 365), (640, 160), True),
    ('butter', 'food', (651, 292, 1100, 380), (640, 128), True),
    ('crumb', 'food', (1270, 120, 1585, 415), (192, 192), False),
    ('grape', 'food', (165, 608, 426, 865), (192, 192), False),
    ('jelly', 'food', (590, 756, 1082, 829), (640, 96), True),
    ('cake', 'food', (1164, 695, 1600, 830), (640, 200), True),
    ('plate', 'crockery', (136, 353, 972, 416), (768, 96), True),
    ('goblet', 'crockery', (1050, 35, 1395, 530), (256, 384), False),
    ('cover', 'crockery', (108, 709, 959, 917), (640, 256), True),
    ('wax', 'crockery', (1140, 668, 1382, 916), (256, 256), True),
    ('fork', 'mechanics', (366, 0, 461, 505), (128, 768), False),
    ('fan', 'mechanics', (956, 0, 1492, 493), (384, 384), False),
    ('holder', 'mechanics', (84, 567, 759, 924), (768, 384), False),
    ('diner', 'mechanics', (873, 493, 1555, 941), (640, 448), False),
]
review = Image.new('RGB', (1024, 4 * 200), '#30212a')
draw = ImageDraw.Draw(review)
for index, (name, sheet, box, size, rectangular) in enumerate(props):
    source_id = f'royal-supper.{sheet}-sheet.imagegen'
    source = next(a for a in m['assets'] if a['id'] == source_id)
    im = Image.open(ROOT / source['sourcePath']).convert('RGBA').crop(box)
    if rectangular:
        # Front-face crops are texture panels; source edges do not alter physics.
        im.putalpha(255)
        im = im.resize(size, Image.Resampling.LANCZOS)
    else:
        bbox = im.getchannel('A').point(lambda a: 255 if a > 80 else 0).getbbox()
        if not bbox:
            raise ValueError(f'Empty prop: {name}')
        im = im.crop(bbox)
        im.thumbnail(size, Image.Resampling.LANCZOS)
    output = ROOT / f'public/assets/supper/props/{name}.png'
    output.parent.mkdir(parents=True, exist_ok=True)
    im.save(output, optimize=True)
    asset_id = f'royal-supper.{name}'
    existing = next((a for a in m['assets'] if a['id'] == asset_id), None)
    if existing is None:
        existing = dict(id=asset_id, world='royal-supper', provider='OpenAI ImageGen',
                        operation='local_preparation', referenceIds=[source_id],
                        sourcePath=source['sourcePath'], executionId=None,
                        creditsSpent=None, approved=False,
                        creditEvidence='Local crop/resize of ImageGen source; no DreamLayer request.')
        m['assets'].append(existing)
    existing.update(status='prepared', runtimePath=output.relative_to(ROOT).as_posix(),
                    preparedPixelSize={'width': im.width, 'height': im.height},
                    cropBox=list(box),
                    runtimeSha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                    preparationNotes=('Inspected ImageGen sheet. ' +
                        ('Rectangular front-face crop registered to existing collider; alpha made opaque inside that panel. ' if rectangular else
                         'Alpha cutout trimmed at threshold 80; soft edge alpha preserved. ') +
                        'Local Lanczos resize. Original sheet preserved. No gameplay coordinate changes.'))
    preview = im.copy()
    preview.thumbnail((230, 165))
    x, y = (index % 4) * 256, (index // 4) * 200
    review.paste(preview, (x + (256-preview.width)//2, y + 25), preview)
    draw.text((x + 12, y + 6), name, fill='#ffe3bc')
    print(name, im.size)
review.save(ROOT / 'asset-sources/production/imagegen/prop-review.png')
MANIFEST.write_text(json.dumps(m, indent=2)+'\n')
