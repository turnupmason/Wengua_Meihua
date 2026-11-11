"""Cut each deity (figure + throne + crown + clouds + painted platform) out of the art.

A hand-drawn outline per image gives GrabCut its seeds: well inside = figure, well outside =
background, a band around the outline is left for GrabCut to decide. Below CLOUD_Y the outline
is taken as-is (clouds are too close to the sky to separate by colour) with soft side fades.
"""
import json, sys
import numpy as np, cv2
from PIL import Image

POLY = json.load(open('poly.json', encoding='utf-8'))
BAND = 26


def run(name):
    spec = POLY[name]
    img = np.array(Image.open(f'{name}.webp').convert('RGB'))
    h, w = img.shape[:2]
    poly = np.array(spec['outline'], np.int32)
    inside = np.zeros((h, w), np.uint8)
    cv2.fillPoly(inside, [poly], 1)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * BAND + 1, 2 * BAND + 1))
    sure_fg = cv2.erode(inside, k)
    maybe = cv2.dilate(inside, k)
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    mask[maybe == 1] = cv2.GC_PR_BGD
    mask[inside == 1] = cv2.GC_PR_FGD
    mask[sure_fg == 1] = cv2.GC_FGD
    for x0, y0, x1, y1 in spec.get('bg_boxes', []):
        mask[y0:y1, x0:x1] = cv2.GC_BGD
    for p in spec.get('bg_polys', []):
        cv2.fillPoly(mask, [np.array(p, np.int32)], int(cv2.GC_BGD))
    for x0, y0, x1, y1 in spec.get('fg_boxes', []):
        mask[y0:y1, x0:x1] = cv2.GC_FGD
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(cv2.cvtColor(img, cv2.COLOR_RGB2BGR), mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # Below the cloud line keep the outline itself (no colour decision).
    cy = spec['cloud_y']
    alpha[cy:] = inside[cy:] * 255
    # Keep only the main piece; fill pinholes.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(alpha)
    if n > 1:
        main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        alpha = np.where(lab == main, 255, 0).astype(np.uint8)
    holes = cv2.bitwise_not(alpha)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(holes)
    for i in range(1, n):
        x, y, ww, hh, a = stats[i]
        if a < 1500 and x > 0 and y > 0 and x + ww < w and y + hh < h:
            alpha[lab == i] = 255
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # Soft edge.
    a = cv2.GaussianBlur(alpha.astype(np.float32) / 255, (0, 0), 1.6)
    a = np.clip((a - 0.5) * 1.6 + 0.5, 0, 1)
    # Soft fade of the cloud mass at both sides.
    fade = spec.get('side_fade')
    if fade:
        xs = np.arange(w, dtype=np.float32)
        l0, l1, r0, r1 = fade
        side = np.clip((xs - l0) / (l1 - l0), 0, 1) * np.clip((r1 - xs) / (r1 - r0), 0, 1)
        yy = np.arange(h, dtype=np.float32)
        rows = (np.clip((yy - (cy - 80)) / 120, 0, 1) * (yy < spec['platform_y']))[:, None]
        a = a * (1 - rows * (1 - side[None, :]))
    out = np.dstack([img, (a * 255).astype(np.uint8)])
    ys, xs = np.where(out[..., 3] > 8)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crop = out[y0:y1, x0:x1]
    Image.fromarray(crop, 'RGBA').save(f'{name}_cut.png')
    # Preview on a dark red ground (the hall) at half size.
    bg = np.zeros_like(crop[..., :3]); bg[:] = (70, 22, 16)
    aa = crop[..., 3:4] / 255.0
    prev = (crop[..., :3] * aa + bg * (1 - aa)).astype(np.uint8)
    Image.fromarray(prev).resize((prev.shape[1] // 2, prev.shape[0] // 2), Image.LANCZOS).save(f'{name}_prev.png')
    print(name, 'crop', (x0, y0, x1, y1), crop.shape)


for n in (sys.argv[1:] or POLY.keys()):
    run(n)
