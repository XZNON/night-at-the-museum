"""Selective local texture preparation for the accepted animated/painted direction.

No provider calls, new shapes, generated painting or alpha changes. Originals
remain at their M3 paths. A small edge-preserving Kuwahara pass suppresses
photographic microtexture while keeping broad material contours and colour.
Run with --pilot for bread/basket only; the default is the inspected final set.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse
import hashlib
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SET = {
    # Radius is in original prepared pixels, not screen/world coordinates.
    'bread': ('royal-supper.bread', 'public/assets/supper/bread.png', 5, .88),
    'basket': ('royal-supper.basket', 'public/assets/supper/props/basket.png', 3, .75),
    'crumb': ('royal-supper.crumb', 'public/assets/supper/props/crumb.png', 4, .85),
    'cake': ('royal-supper.cake', 'public/assets/supper/props/cake.png', 4, .85),
}


def painted_detail(im, radius, strength):
    rgb = np.asarray(im.convert('RGB'), dtype=np.float64)
    # Extrapolate colour into alpha margins before filtering to avoid dark
    # fringes. Restore the exact original alpha, dimensions and foot/surface box.
    if im.mode == 'RGBA':
        alpha = np.asarray(im.getchannel('A'))
        valid = alpha > 0
        for _ in range(radius * 2):
            count = np.zeros(valid.shape)
            total = np.zeros(rgb.shape)
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                shifted = np.roll(valid, (dy, dx), (0, 1))
                if dy: shifted[-1 if dy < 0 else 0, :] = False
                if dx: shifted[:, -1 if dx < 0 else 0] = False
                count += shifted
                total += np.roll(rgb, (dy, dx), (0, 1)) * shifted[:, :, None]
            fill = ~valid & (count > 0)
            rgb[fill] = total[fill] / count[fill, None]
            valid |= fill
    h, w = rgb.shape[:2]
    padded = np.pad(rgb, ((radius, radius), (radius, radius), (0, 0)), mode='edge')

    def integral(a):
        return np.pad(a.cumsum(0).cumsum(1), ((1, 0), (1, 0), (0, 0)))

    sums, squares = integral(padded), integral(padded * padded)
    means, variances = [], []
    size = radius + 1
    for y, x in [(0, 0), (0, radius), (radius, 0), (radius, radius)]:
        def region(a):
            return (a[y+size:y+size+h, x+size:x+size+w] - a[y:y+h, x+size:x+size+w]
                    - a[y+size:y+size+h, x:x+w] + a[y:y+h, x:x+w]) / size**2
        mean = region(sums)
        means.append(mean)
        variances.append(np.maximum(region(squares) - mean * mean, 0).sum(2))
    choice = np.argmin(variances, axis=0)
    selected = np.take_along_axis(np.stack(means), choice[None, :, :, None], axis=0)[0]
    out = Image.fromarray(np.clip(rgb * (1-strength) + selected * strength, 0, 255).round().astype('uint8'))
    if im.mode == 'RGBA': out.putalpha(im.getchannel('A'))
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pilot', action='store_true')
    args = parser.parse_args()
    manifest_path = ROOT / 'asset-sources/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    names = ['bread', 'basket'] if args.pilot else list(SET)
    review = Image.new('RGB', (1280, len(names) * 210), '#30212a')
    draw = ImageDraw.Draw(review)
    for row, name in enumerate(names):
        parent_id, source_path, radius, strength = SET[name]
        parent = next(a for a in manifest['assets'] if a['id'] == parent_id)
        source = Image.open(ROOT / source_path)
        result = painted_detail(source, radius, strength)
        runtime = f'public/assets/supper/cohesion-v1/{name}.png'
        output = ROOT / runtime
        output.parent.mkdir(parents=True, exist_ok=True)
        result.save(output, optimize=True)
        revision_id = parent_id + '.cohesion-v1'
        record = next((a for a in manifest['assets'] if a['id'] == revision_id), None)
        if record is None:
            record = {'id': revision_id}
            manifest['assets'].append(record)
        record.update(status=record.get('status') if record.get('status') == 'integrated' else 'prepared',
                      preparedAt='2026-10-06', world='royal-supper', purpose='Selective visual-cohesion texture preparation',
                      provider=parent['provider'], operation='local_texture_preparation', referenceIds=[parent_id],
                      sourcePath=source_path, sourceSha256=hashlib.sha256((ROOT / source_path).read_bytes()).hexdigest(),
                      runtimePath=runtime, runtimeSha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                      preparedPixelSize={'width': source.width, 'height': source.height},
                      executionId=None, promptPath=None, creditsSpent=0, approved=False,
                      creditEvidence='Offline pixel preparation only. No DreamLayer or ImageGen operation/billing in this pass; upstream unknown costs remain unchanged.',
                      preparationNotes=f'Edge-preserving Kuwahara radius {radius}, blend {strength}. Original prepared pixels/source preserved. Exact size and alpha retained; no invented pores/holes, palette substitution, shape or geometry changes. Reproduce with scripts/prepare-cohesion.py.')
        # Preserve the original's M3 integrated/approval/history fields while
        # making the currently selected prepared revision unambiguous.
        parent['activeRevisionId'] = revision_id
        for col, im in enumerate([source, result]):
            preview = im.copy()
            preview.thumbnail((620, 175))
            review.paste(preview, (col * 640 + 10, row * 210 + 27), preview if preview.mode == 'RGBA' else None)
            draw.text((col * 640 + 10, row * 210 + 8), name + (' / M3 original' if col == 0 else ' / cohesion v1'), fill='#ffe3bc')
        print(name, source.size, 'alpha preserved')
    review_path = ROOT / 'asset-sources/production/cohesion-v1'
    review_path.mkdir(parents=True, exist_ok=True)
    review.save(review_path / ('pilot-review.png' if args.pilot else 'review.png'))
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__': main()
