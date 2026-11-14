"""
Builds the 摇签 art from the user's paintings (docs/art-reference/shake/, 2026-11-14) into
public/art/ritual/, used exactly as painted (cropped and scaled only):

  shake-holder.webp        the lacquered 签筒, whole
  shake-holder-front.webp  the same with its opening (and the back of the rim) cut away, laid over
                           the sticks so they rise out of the 筒 rather than stand in front of it
  shake-slip.webp          one bamboo 签, cinnabar foot down as painted

Run: python scripts/build-shake-art.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

APP = Path(__file__).resolve().parents[1]
REF = APP.parents[1] / 'docs/art-reference/shake'
OUT = APP / 'public/art/ritual'
HOLDER_W = 420  # 2x for about 210 CSS px
SLIP_H = 760    # 2x for about 380 CSS px

# The opening of the 筒, in the cropped painting's pixels: inner edge of the brass rim.
OPENING = {'cx': 310, 'cy': 44, 'rx': 284, 'ry': 37}


def solid(im: Image.Image) -> Image.Image:
    a = im.getchannel('A').point(lambda v: 255 if v > 60 else 0)
    return im.crop(a.getbbox())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    holder = solid(Image.open(REF / 'qian-tong.webp').convert('RGBA'))
    W, H = holder.size
    # The front: drop everything inside the opening and behind its centre line (the back of the rim).
    o = OPENING
    cut = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(cut)
    d.rectangle((0, 0, W, o['cy']), fill=255)
    d.ellipse((o['cx'] - o['rx'], o['cy'] - o['ry'], o['cx'] + o['rx'], o['cy'] + o['ry']), fill=255)
    cut = cut.filter(ImageFilter.GaussianBlur(1.2))
    front = holder.copy()
    alpha = front.getchannel('A')
    front.putalpha(Image.composite(Image.new('L', (W, H), 0), alpha, cut))
    scale = HOLDER_W / W
    size = (HOLDER_W, round(H * scale))
    holder.resize(size, Image.LANCZOS).save(OUT / 'shake-holder.webp', quality=90, method=6)
    front.resize(size, Image.LANCZOS).save(OUT / 'shake-holder-front.webp', quality=90, method=6)
    slip = solid(Image.open(REF / 'qian.png').convert('RGBA'))
    sw, sh = slip.size
    slip.resize((round(sw * SLIP_H / sh), SLIP_H), Image.LANCZOS).save(OUT / 'shake-slip.webp', quality=90, method=6)
    print('holder', size, 'opening (css @1x):', {k: round(v * scale / 2, 1) for k, v in o.items()}, 'slip', round(sw * SLIP_H / sh), SLIP_H)


if __name__ == '__main__':
    main()
