"""Draw the favicon: a gilded frame holding a dawn sun over a dark hill.

Writes public/favicon.svg and a 64 px PNG fallback (public/favicon.png) from the
same geometry, in the UI palette (src/style.css). Original art, 0 credits.
Run: python scripts/make-favicon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'

# 64-unit design grid.
BACKGROUND = ('#1e151b', 0, 0, 64, 64, 12)
GILT = ('#f2c46d', 7, 7, 57, 57, 5)
BEVEL = ('#b08a5a', 10, 10, 54, 54, 3)
SKY = ('#2b1d38', 13, 13, 51, 51, 1)
GLOW = ('#f2c46d', 32, 36, 14, 0.28)
SUN = ('#ffe3a1', 32, 36, 9, 1.0)
HILL = ('#4a2f3a', 32, 58, 30, 15)


def svg() -> str:
    def rect(fill, x0, y0, x1, y1, r):
        return f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="{r}" fill="{fill}"/>'

    def circle(fill, cx, cy, r, opacity):
        return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" opacity="{opacity}"/>'

    fill, x0, y0, x1, y1, r = SKY
    hill_fill, hx, hy, hrx, hry = HILL
    return '\n'.join([
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
        f'<defs><clipPath id="sky"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="{r}"/></clipPath></defs>',
        rect(*BACKGROUND), rect(*GILT), rect(*BEVEL), rect(*SKY),
        '<g clip-path="url(#sky)">',
        circle(*GLOW), circle(*SUN),
        f'<ellipse cx="{hx}" cy="{hy}" rx="{hrx}" ry="{hry}" fill="{hill_fill}"/>',
        '</g>',
        '</svg>',
        '',
    ])


def png(size: int = 64, supersample: int = 8) -> Image.Image:
    scale = size * supersample / 64
    big = size * supersample

    def box(x0, y0, x1, y1):
        return [round(x0 * scale), round(y0 * scale), round(x1 * scale) - 1, round(y1 * scale) - 1]

    def hex_rgba(colour, alpha=1.0):
        return tuple(int(colour[i:i + 2], 16) for i in (1, 3, 5)) + (round(alpha * 255),)

    image = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for fill, x0, y0, x1, y1, r in (BACKGROUND, GILT, BEVEL, SKY):
        draw.rounded_rectangle(box(x0, y0, x1, y1), radius=round(r * scale), fill=hex_rgba(fill))

    scene = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    for fill, cx, cy, r, opacity in (GLOW, SUN):
        layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
        ImageDraw.Draw(layer).ellipse(box(cx - r, cy - r, cx + r, cy + r), fill=hex_rgba(fill, opacity))
        scene = Image.alpha_composite(scene, layer)
    hill_fill, hx, hy, hrx, hry = HILL
    ImageDraw.Draw(scene).ellipse(box(hx - hrx, hy - hry, hx + hrx, hy + hry), fill=hex_rgba(hill_fill))

    fill, x0, y0, x1, y1, r = SKY
    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box(x0, y0, x1, y1), radius=round(r * scale), fill=255)
    clipped = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    clipped.paste(scene, (0, 0), Image.composite(scene.getchannel('A'), mask, mask))
    image = Image.alpha_composite(image, clipped)
    return image.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    (PUBLIC / 'favicon.svg').write_text(svg(), encoding='utf-8', newline='\n')
    png().save(PUBLIC / 'favicon.png', optimize=True)
    print('wrote public/favicon.svg and public/favicon.png')
