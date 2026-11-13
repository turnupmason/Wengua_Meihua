"""
Builds the clouds the 三清 sit on, so they can drift (2026-11-13), into public/art/entrance/:

  cloud-yuanshi-l.webp, cloud-yuanshi-r.webp
      the clouds left and right of 元始天尊's seat, lifted from his portrait (only the pale cloud
      pixels, feathered toward the seat). His dark robe lets them be lifted cleanly; 老君's and 灵宝's
      pale robes cannot be told from their clouds by colour, so these two drift over all three seats.

Run: python scripts/build-hall-clouds.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

APP = Path(__file__).resolve().parents[1]
OUT = APP / 'public/art/entrance'
PORTRAIT = APP / 'public/art/sanqing-yuanshi.webp'
# Pixels (x0, y0, x1, y1) of the portrait, left and right of the seat.
RECTS = {'l': (0, 1000, 300, 1215), 'r': (720, 1000, 1005, 1215)}


def cloud(side: str, rect: tuple) -> dict:
    src = Image.open(PORTRAIT).convert('RGBA')
    W, H = src.size
    x0, y0, x1, y1 = rect
    a = np.asarray(src.crop(rect), dtype=np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    lum = rgb.mean(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    # Pale, nearly grey-white: the clouds (the gold seat and the dark robe are left out).
    c = np.clip((lum - 0.62) / 0.16, 0, 1) * np.clip((0.34 - sat) / 0.14, 0, 1)
    # Feather toward the seat and top and bottom, so the drifting copy has no hard border.
    h, w = c.shape
    xs = np.linspace(0, 1, w)[None, :]
    ys = np.linspace(0, 1, h)[:, None]
    toward_seat = xs if side == 'l' else 1 - xs
    fx = np.clip((1 - toward_seat) / 0.35, 0, 1)
    fy = np.clip(ys / 0.2, 0, 1) * np.clip((1 - ys) / 0.15, 0, 1)
    m = Image.fromarray((c * fx * fy * alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.fromarray((rgb * 255).astype(np.uint8)).convert('RGBA')
    out.putalpha(m)
    out.save(OUT / f'cloud-yuanshi-{side}.webp', 'WEBP', quality=88, method=6)
    return {'left': round(x0 / W * 100, 2), 'top': round(y0 / H * 100, 2), 'width': round((x1 - x0) / W * 100, 2)}


if __name__ == '__main__':
    print(json.dumps({s: cloud(s, r) for s, r in RECTS.items()}))
