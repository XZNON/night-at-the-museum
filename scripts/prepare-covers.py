"""itch.io cover candidates from the DreamLayer cover references (release v1).

Each 2048 x 2048 reference (asset-sources/references/cover/<name>-v1.png) is
cropped to itch's 630:500 cover ratio and titled locally in the game's bundled
Fredoka (the generated art has no lettering): a gold letter-spaced kicker and
the cream title with the title screen's dark shadow, over a soft darkening for
legibility. Writes docs/release/cover/cover-<letter>.png at 630 x 500 and
cover-<letter>@2x.png at 1260 x 1000. 0 credits.
Run: python scripts/prepare-covers.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'asset-sources' / 'references' / 'cover'
OUT = ROOT / 'docs' / 'release' / 'cover'
FONT = ROOT / 'node_modules' / '@fontsource-variable' / 'fredoka' / 'files' / 'fredoka-latin-wght-normal.woff2'
CREAM, GOLD, INK = (255, 241, 216), (242, 196, 109), (26, 16, 22)
W, H = 1260, 1000  # @2x of itch's 630 x 500

# name, letter, framing, title anchor, lines, title width share, title top (top anchors).
# Framing: a crop top in source pixels (full width), or 'fit' for the whole
# picture over a blurred, darkened extension of itself at the sides.
COVERS = [
    ('gallery', 'a', 170, 'top', ['Night at the Museum'], 0.86, 54),
    ('leap', 'b', 290, 'top', ['Night at the Museum'], 0.86, 54),
    ('restore', 'c', 330, 'bottom-right', ['Night at', 'the Museum'], 0.5, 54),
    ('alive', 'd', 'fit', 'top', ['Night at the Museum'], 0.54, 22),
    ('portrait', 'e', 0, 'top-left', ['Night at', 'the Museum'], 0.27, 40),
    ('moonlit', 'f', 'fit', 'top', ['Night at the Museum'], 0.8, 300),
]


def font(size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_axes([weight])
    return f


def frame(source: Image.Image, framing) -> Image.Image:
    """The art at W x H: cropped to the cover ratio, or fitted whole with soft extended sides."""
    if framing == 'fit':
        art = source.resize((round(source.width * H / source.height), H), Image.LANCZOS)
        back = source.resize((W, round(source.height * W / source.width)), Image.LANCZOS)
        top = (back.height - H) // 2
        back = ImageEnhance.Brightness(back.crop((0, top, W, top + H)).filter(ImageFilter.GaussianBlur(36))).enhance(0.5)
        mask = Image.new('L', art.size, 255); draw = ImageDraw.Draw(mask); edge = 70
        for i in range(edge):
            draw.line([(i, 0), (i, H)], fill=int(255 * i / edge)); draw.line([(art.width - 1 - i, 0), (art.width - 1 - i, H)], fill=int(255 * i / edge))
        back.paste(art, ((W - art.width) // 2, 0), mask)
        return back
    if source.width / source.height > W / H:  # wider than the cover: keep the left of it
        return source.crop((0, 0, round(source.height * W / H), source.height)).resize((W, H), Image.LANCZOS)
    height = round(source.width * H / W)
    top = min(framing, source.height - height)
    return source.crop((0, top, source.width, top + height)).resize((W, H), Image.LANCZOS)


def shade(image: Image.Image, anchor: str, top: int) -> Image.Image:
    """A soft dark wash behind the title so it reads on any art."""
    mask = Image.new('L', image.size, 0)
    draw = ImageDraw.Draw(mask)
    if anchor == 'top':
        band = H * 0.42
        for y in range(H):
            d = max(0.0, y - top) if y > top else 0.0
            value = int(205 * max(0.0, 1 - d / band) ** 1.6) if y >= max(0, top - 60) else int(205 * max(0, y - (top - 260)) / 200) if top > 100 else 0
            draw.line([(0, y), (W, y)], fill=max(0, min(205, value)))
    else:
        cx = W * (0.0 if anchor == 'top-left' else 1.0)
        cy = H * (0.05 if anchor.startswith('top') else 0.95)
        layer = Image.new('L', image.size, 0)
        ImageDraw.Draw(layer).ellipse([cx - W * 0.62, cy - H * 0.5, cx + W * 0.62, cy + H * 0.5], fill=215)
        mask = layer.filter(ImageFilter.GaussianBlur(110))
    dark = Image.new('RGB', image.size, INK)
    return Image.composite(dark, image, mask)


def title(image: Image.Image, anchor: str, lines: list[str], share: float, top: int) -> Image.Image:
    kicker_font = font(30, 600)
    # The largest size up to the design size whose longest line fits the cover's width.
    size = 118 if len(lines) == 1 else 132
    while max(font(size, 700).getlength(line) for line in lines) > W * share:
        size -= 2
    title_font = font(size, 700)
    kicker = 'THE GARDEN BEFORE DAWN'
    spacing = 9  # letter spacing for the kicker, like the title screen's .32em
    kicker_width = sum(kicker_font.getlength(c) + spacing for c in kicker) - spacing
    line_height = int(title_font.size * 0.95)
    widths = [title_font.getlength(line) for line in lines]
    block_width = max(widths + [kicker_width])
    margin = 64
    right = anchor.endswith('right')
    x = (W - block_width) / 2 if anchor == 'top' else margin if anchor == 'top-left' else W - margin - block_width
    y = top if anchor.startswith('top') else H - 52 - (52 + (len(lines) - 1) * line_height + int(title_font.size * 1.05))

    def place(draw: ImageDraw.ImageDraw, offset=(0, 0), fill=CREAM, kicker_fill=GOLD):
        kx = x if anchor != 'top' else (W - kicker_width) / 2
        if right:
            kx = W - margin - kicker_width
        for c in kicker:
            draw.text((kx + offset[0], y + offset[1]), c, font=kicker_font, fill=kicker_fill)
            kx += kicker_font.getlength(c) + spacing
        for i, line in enumerate(lines):
            lx = x if anchor == 'top-left' else (W - widths[i]) / 2 if anchor == 'top' else W - margin - widths[i]  # right-aligned
            draw.text((lx + offset[0], y + 52 + i * line_height + offset[1]), line, font=title_font, fill=fill)

    shadow = Image.new('RGBA', image.size, (0, 0, 0, 0))
    place(ImageDraw.Draw(shadow), (0, 6), fill=INK + (235,), kicker_fill=INK + (200,))
    glow = shadow.filter(ImageFilter.GaussianBlur(18))
    hard = Image.new('RGBA', image.size, (0, 0, 0, 0))
    place(ImageDraw.Draw(hard), (0, 5), fill=(122, 82, 46, 255), kicker_fill=(0, 0, 0, 0))
    out = Image.alpha_composite(image.convert('RGBA'), glow)
    out = Image.alpha_composite(out, glow)
    out = Image.alpha_composite(out, hard)
    place(ImageDraw.Draw(out))
    return out.convert('RGB')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, letter, framing, anchor, lines, share, top in COVERS:
        source = Image.open(SOURCE / f'{name}-v1.png').convert('RGB')
        cover = title(shade(frame(source, framing), anchor, top), anchor, lines, share, top)
        cover.save(OUT / f'cover-{letter}@2x.png', optimize=True)
        cover.resize((630, 500), Image.LANCZOS).save(OUT / f'cover-{letter}.png', optimize=True)
        print(f'cover-{letter}: {name}, framing {framing}, title {anchor}')


if __name__ == '__main__':
    main()
