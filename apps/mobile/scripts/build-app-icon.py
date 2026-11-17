"""
App icon and launch screen (2026-11-17), drawn as the splash's emblem: 乾's six lines in 香槟金 inside a
double ring, on 玄墨绿. Writes the iOS AppIcon (1024, no transparency, square: iOS rounds it) and the
three launch images, plus public/icon.png for the web.

    python apps/mobile/scripts/build-app-icon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
LU = (32, 39, 36)          # #202724
LU_LIGHT = (40, 49, 45)    # centre of the ground
JIN = (198, 177, 139)      # #c6b18b
SS = 4                     # supersampling


def ground(size: int) -> Image.Image:
    """玄墨绿 a shade lighter at the centre, as on the splash."""
    img = Image.new('RGB', (size, size), LU)
    glow = Image.radial_gradient('L').resize((size, size))
    light = Image.new('RGB', (size, size), LU_LIGHT)
    return Image.composite(img, light, glow)


def emblem(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float):
    """The double ring and 乾 (six whole lines), scaled to the outer radius r."""
    w = max(1, round(r * 0.012))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=JIN + (150,), width=w)
    ri = r * 0.85
    draw.ellipse((cx - ri, cy - ri, cx + ri, cy + ri), outline=JIN + (70,), width=w)
    line_w, line_h, gap = r * 1.07, r * 0.082, r * 0.135
    top = cy - (6 * line_h + 5 * gap) / 2 + r * 0.004
    for i in range(6):
        y = top + i * (line_h + gap)
        draw.rounded_rectangle((cx - line_w / 2, y, cx + line_w / 2, y + line_h), radius=line_h * 0.15, fill=JIN + (255,))


def picture(size: int, radius_share: float) -> Image.Image:
    big = size * SS
    base = ground(big).convert('RGBA')
    layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    emblem(ImageDraw.Draw(layer), big / 2, big / 2, big * radius_share)
    out = Image.alpha_composite(base, layer).convert('RGB')
    return out.resize((size, size), Image.LANCZOS)


def main():
    icon = picture(1024, 0.36)
    icon.save(ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', optimize=True)
    icon.resize((512, 512), Image.LANCZOS).save(ROOT / 'public/icon.png', optimize=True)
    # Launch: the emblem small in the middle (the image is scaled to fill the screen's height).
    launch = picture(2732, 0.06)
    for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
        launch.save(ROOT / 'ios/App/App/Assets.xcassets/Splash.imageset' / name, optimize=True)
    print('icon and launch images written')


if __name__ == '__main__':
    main()
