"""
Builds the painted walk-in plates from the art pack's keyframes (docs/art-reference/sanqing-entrance):
the moonlit courtyard and the open threshold, each with 「三清殿」 written on its blank plaque, and
the hall, given a plaque of the same kind on the wall above the 三清's seats. The writing is the app's
brush font (Ma Shan Zheng, OFL), in old gilt with a carved shadow. Output: WebP files in
public/art/entrance/. Run: python scripts/build-entrance-plates.py <path-to>/sanqing-entrance [<folder with library.png, records.png>]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

APP = Path(__file__).resolve().parents[1]
FONT = APP / 'node_modules/@expo-google-fonts/ma-shan-zheng/400Regular/MaShanZheng_400Regular.ttf'
OUT = APP / 'public/art/entrance'

# Plaque field (inner dark panel) in each 941×1672 keyframe, measured on the image. `board`: the
# picture has no plaque there, so one is drawn first (charcoal field, old-gilt frame).
PLATES = [
    ('keyframes/01-moonlit-courtyard.png', 'plate-courtyard.webp', (368, 782, 576, 834), False),
    ('keyframes/02-open-threshold.png', 'plate-threshold.webp', (215, 372, 728, 492), False),
    ('keyframes/03-hall-lighting.png', 'plate-hall.webp', (352, 372, 590, 428), True),
]
TEXT = '三清殿'


def board(img: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    """A carved board like the walk-in's: charcoal field in an old-gilt frame, softly lit from above."""
    x0, y0, x1, y1 = box
    pad = round((y1 - y0) * 0.24)
    out = img.convert('RGBA')
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Cast shadow on the wall.
    sh = Image.new('L', img.size, 0)
    ImageDraw.Draw(sh).rectangle((x0 - pad + 4, y0 - pad + 8, x1 + pad + 4, y1 + pad + 10), fill=150)
    out.paste((8, 5, 3, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(9)))
    # Frame: old gilt, darker toward the bottom; then the charcoal field.
    for i in range(pad):
        k = i / max(1, pad - 1)
        c = (round(150 - 50 * k), round(116 - 40 * k), round(68 - 26 * k), 255)
        d.rectangle((x0 - pad + i, y0 - pad + i, x1 + pad - i, y1 + pad - i), outline=c)
    d.rectangle((x0, y0, x1, y1), fill=(34, 31, 28, 255))
    d.rectangle((x0 - 2, y0 - 2, x1 + 2, y1 + 2), outline=(196, 160, 98, 255), width=2)
    out.alpha_composite(layer)
    # A little warm light from the hall's lamps across the top of the board.
    glow = Image.new('L', img.size, 0)
    ImageDraw.Draw(glow).rectangle((x0 - pad, y0 - pad, x1 + pad, y0 + (y1 - y0) // 3), fill=40)
    out.paste((255, 200, 140, 255), (0, 0), glow.filter(ImageFilter.GaussianBlur(14)))
    return out.convert('RGB')


def gilt_text(img: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    x0, y0, x1, y1 = box
    h = y1 - y0
    size = int(h * 0.78)
    font = ImageFont.truetype(str(FONT), size)
    step = size * 1.12
    total = step * (len(TEXT) - 1)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # Mask of the characters.
    mask = Image.new('L', img.size, 0)
    d = ImageDraw.Draw(mask)
    for i, ch in enumerate(TEXT):
        d.text((cx - total / 2 + i * step, cy + size * 0.02), ch, font=font, fill=255, anchor='mm')
    # Carved shadow: a dark, slightly soft offset below and right.
    shadow = mask.filter(ImageFilter.GaussianBlur(max(1, size * 0.03)))
    off = max(1, round(size * 0.035))
    dark = Image.new('RGB', img.size, (12, 8, 5))
    img = Image.composite(dark, img, shadow.transform(img.size, Image.AFFINE, (1, 0, -off, 0, 1, -off)).point(lambda v: v * 0.75))
    # Old gilt: warm highlight at the top of each stroke, deeper gold below (palette 旧金 / 香槟光).
    grad = Image.new('RGB', (1, 256))
    for yy in range(256):
        k = yy / 255
        top, mid, low = (226, 201, 142), (170, 131, 81), (110, 82, 40)
        c = [round(top[j] + (mid[j] - top[j]) * min(1, k / 0.5)) if k < 0.5 else round(mid[j] + (low[j] - mid[j]) * (k - 0.5) / 0.5) for j in range(3)]
        grad.putpixel((0, yy), tuple(c))
    gold = grad.resize((img.size[0], int(size * 1.05)))
    layer = Image.new('RGB', img.size)
    layer.paste(gold, (0, int(cy - size * 0.52)))
    soft = mask.filter(ImageFilter.GaussianBlur(0.6))
    return Image.composite(layer, img, soft)


def hall_wall(pack: Path) -> None:
    """The 3D hall's back wall during the ritual: keyframe 03 above the seats (its wood panels, warm
    light, brackets and lanterns), fading at the sides into the hall's dark walls."""
    img = Image.open(pack / 'keyframes/03-hall-lighting.png').convert('RGB').crop((0, 0, 941, 745))
    w, h = img.size
    dark = Image.new('RGB', img.size, (24, 17, 13))
    mask = Image.new('L', img.size, 255)
    px = mask.load()
    edge = round(w * 0.1)
    for x in range(w):
        k = min(1.0, min(x, w - 1 - x) / edge)
        for y in range(h):
            px[x, y] = round(255 * (k * k * (3 - 2 * k)))
    img = Image.composite(img, dark, mask)
    img.save(OUT / 'hall-wall.webp', 'WEBP', quality=84, method=6)
    print('hall-wall.webp', img.size, (OUT / 'hall-wall.webp').stat().st_size, 'bytes')


def main(pack: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    hall_wall(pack)
    for src, name, box, draw_board in PLATES:
        img = Image.open(pack / src).convert('RGB')
        if draw_board:
            img = board(img, box)
        img = gilt_text(img, box)
        img.save(OUT / name, 'WEBP', quality=84, method=6)
        print(name, img.size, (OUT / name).stat().st_size, 'bytes')


# 藏经阁 and 问事录: the user's pictures (4:3), shown as they are above each place's panel.
# By content: the bookshelves are 藏经阁, the writing desk 问事录. (In the user's folder of
# 2026-11-12 the two files are named the other way round: records.png is the shelves.)
PLACES = [('records', 'place-library.webp'), ('library', 'place-records.webp')]


def places(folder: Path) -> None:
    for stem, name in PLACES:
        src = next((folder / f'{stem}{ext}' for ext in ('.png', '.jpg', '.jpeg', '.webp') if (folder / f'{stem}{ext}').exists()), None)
        if src is None:
            print(f'{stem}: not found in {folder}')
            continue
        img = Image.open(src).convert('RGB')
        if img.width > 1448:
            img = img.resize((1448, round(img.height * 1448 / img.width)), Image.LANCZOS)
        img.save(OUT / name, 'WEBP', quality=84, method=6)
        print(name, img.size, (OUT / name).stat().st_size, 'bytes')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
    if len(sys.argv) > 2:
        places(Path(sys.argv[2]))
