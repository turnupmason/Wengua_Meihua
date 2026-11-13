"""
Builds the stone textures from the user's two swatches (2026-11-13), into public/art/entrance/materials/:

  table-stone.webp         the stone table's colour (top, edge, legs, stools): the dark stone swatch,
                           made seamless (its middle kept as drawn) so the 2×2 repeat on the frame
                           and stools shows no join
  floor-tiles.webp         the hall and forecourt paving's colour: the running-bond stone tiles, as given
                           (already seamless)
  floor-tiles-normal.webp  a shallow relief from that same tile picture: the joints sink, the slab faces
                           keep a little of their own unevenness (tangent-space normal map, tiles too)

Run: python scripts/build-stone-maps.py <table-swatch> <floor-tile-swatch>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

APP = Path(__file__).resolve().parents[1]
OUT = APP / 'public/art/entrance/materials'


def seamless(img: Image.Image) -> Image.Image:
    """Cross-fade with the half-shifted picture near the edges, so it tiles; the centre stays as drawn."""
    a = np.asarray(img, dtype=np.float32)
    h, w = a.shape[:2]
    shifted = np.roll(np.roll(a, h // 2, axis=0), w // 2, axis=1)
    ys = np.abs(np.linspace(-1, 1, h))[:, None]
    xs = np.abs(np.linspace(-1, 1, w))[None, :]
    # 1 in the middle, easing to 0 at the edges (where the shifted copy, seamless there, takes over).
    edge = np.clip((np.maximum(xs, ys) - 0.55) / 0.45, 0, 1)
    k = (1 - edge * edge * (3 - 2 * edge))[..., None]
    return Image.fromarray(np.clip(a * k + shifted * (1 - k), 0, 255).astype(np.uint8))


def relief(img: Image.Image, strength: float = 2.2) -> Image.Image:
    """Height from brightness (dark joints low), softened; wrap-around gradients so it tiles."""
    lum = np.asarray(img.convert('L').filter(ImageFilter.GaussianBlur(1.6)), dtype=np.float32) / 255.0
    # Joints: the darkest lines read as grooves; the faces' own mottling stays faint.
    height = lum - np.asarray(img.convert('L').filter(ImageFilter.GaussianBlur(14)), dtype=np.float32) / 255.0 * 0.6
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5
    nx, ny, nz = -dx * strength * 10, dy * strength * 10, np.ones_like(height)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack([nx / n, ny / n, nz / n], axis=-1) * 0.5 + 0.5
    return Image.fromarray((rgb * 255).astype(np.uint8))


def main(table: Path, floor: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    t = seamless(Image.open(table).convert('RGB'))
    t.save(OUT / 'table-stone.webp', 'WEBP', quality=88, method=6)
    f = Image.open(floor).convert('RGB')
    f.save(OUT / 'floor-tiles.webp', 'WEBP', quality=88, method=6)
    relief(f).save(OUT / 'floor-tiles-normal.webp', 'WEBP', quality=92, method=6)
    for name in ('table-stone.webp', 'floor-tiles.webp', 'floor-tiles-normal.webp'):
        print(name, (OUT / name).stat().st_size, 'bytes')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
