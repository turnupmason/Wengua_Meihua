"""
宣纸 theme (2026-11-14): the app moves from the night hall to paper. Rather than restyle hundreds of
rules by hand, this reads src/styles.css and writes src/paper.generated.css: every colour-bearing
declaration again, scoped under `body.paper`, with its colours turned over —

  dark grounds (night, lacquer, 玄墨)   → 宣纸 tones
  light words and lines (cream, white)  → 墨 (玄墨 ink), keeping their alpha
  gold accents                          → a darker 古铜 that reads on paper
  mid tones (gold, grey)                → darker, to read on paper; cinnabar stays

Text shadows go (they were for reading over a picture at night); dark drop shadows become a faint
warm shade. Rules for pages already on paper (卦笺, 研习与校订, the stone's own writing, the bamboo
slip) and keyframes are left alone, and so is the opening screen, which stays dark (玄墨绿). Hand-made touches live in src/paper.css, loaded after this.

Run: python scripts/build-paper-css.py   (re-run after editing styles.css)
"""
import colorsys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'styles.css'
OUT = ROOT / 'src' / 'paper.generated.css'

# Selectors left as they are: already paper, pictures that keep their own colours, and the opening
# screen and its sign-in (the one dark page, 玄墨绿 and 香槟金, tuned in paper.css).
SKIP = re.compile(r'\.splash|\.login-|\.provider-btn|\.name-line|\.phone-row|\.code-row|\.model-badge|\.model-story|\.about-link|\.jian|\.study|\.ptab|painted-table|\.bestow-slip|\.slip-|splash-art|splash-key|walkin|hall-|\.share-image|qian-tong|shake-tube|painted-|\.me-member')
COLOR_PROPS = re.compile(
    r'^(color|background|background-color|background-image|border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color|'
    r'box-shadow|text-shadow|fill|stroke|caret-color|text-decoration-color|text-decoration|column-rule|filter|--[\w-]+)$'
)
HEX = re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b')
RGBA = re.compile(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)')
NAMED = {'#000': (0, 0, 0), 'black': (0, 0, 0), 'white': (255, 255, 255), '#fff': (255, 255, 255)}


def fmt(r, g, b, a):
    r, g, b = (max(0, min(255, round(v))) for v in (r, g, b))
    if a is None or a >= 1:
        return f'#{r:02x}{g:02x}{b:02x}'
    return f'rgba({r}, {g}, {b}, {round(a, 3)})'


def turn(r, g, b, a, shadow=False):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hue = h * 360
    if shadow:
        # A shadow cast on paper: faint and warm; a light inner highlight becomes a faint ink line.
        if l < 0.5:
            return fmt(70, 56, 34, (a if a is not None else 1) * 0.22)
        return fmt(255, 252, 244, (a if a is not None else 1) * 0.6)
    if l <= 0.24:
        # Night / lacquer / 玄墨 ground → 宣纸 (darker grounds a shade lighter paper).
        nl = 0.945 - l * 0.22
        nr, ng, nb = colorsys.hls_to_rgb(45 / 360, nl, 0.42)
        return fmt(nr * 255, ng * 255, nb * 255, a)
    red = (hue < 22 or hue > 335) and s > 0.3
    if red:
        # Cinnabar stays cinnabar, deep enough to read on paper.
        nr, ng, nb = colorsys.hls_to_rgb(h, min(l, 0.47), min(1, max(s, 0.42)))
        return fmt(nr * 255, ng * 255, nb * 255, a)
    if l >= 0.6:
        gold = 25 <= hue <= 60 and s > 0.32 and l < 0.86
        if gold:
            # Light gold words → 古铜 ink that reads on paper.
            nr, ng, nb = colorsys.hls_to_rgb(38 / 360, 0.33 + (1 - l) * 0.25, 0.32)
        else:
            # Cream / white words → 玄墨.
            nr, ng, nb = colorsys.hls_to_rgb(195 / 360, 0.12 + (1 - l) * 0.55, 0.29)
        return fmt(nr * 255, ng * 255, nb * 255, a)
    # Mid tones (gold, grey, 石青) darken to read on paper.
    nr, ng, nb = colorsys.hls_to_rgb(h, l * 0.72, min(1, s * 0.9))
    return fmt(nr * 255, ng * 255, nb * 255, a)


def parse_hex(x):
    x = x.lstrip('#')
    if len(x) in (3, 4):
        x = ''.join(c * 2 for c in x)
    r, g, b = int(x[0:2], 16), int(x[2:4], 16), int(x[4:6], 16)
    a = int(x[6:8], 16) / 255 if len(x) == 8 else None
    return r, g, b, a


def map_value(prop, value, fn=None):
    fn = fn or turn
    if prop == 'text-shadow':
        return 'none'
    if 'url(' in value:
        return None
    shadow = prop in ('box-shadow', 'filter')
    changed = False

    def sub_rgba(m):
        nonlocal changed
        changed = True
        a = m.group(4)
        if a is not None:
            a = float(a[:-1]) / 100 if a.endswith('%') else float(a)
        return fn(float(m.group(1)), float(m.group(2)), float(m.group(3)), a, shadow)

    def sub_hex(m):
        nonlocal changed
        changed = True
        return fn(*parse_hex(m.group(0)), shadow=shadow)

    out = RGBA.sub(sub_rgba, value)
    out = HEX.sub(sub_hex, out)
    for name in ('black', 'white'):
        if re.search(rf'(?<![\w-]){name}(?![\w-])', out):
            changed = True
            out = re.sub(rf'(?<![\w-]){name}(?![\w-])', fn(*NAMED[name], None, shadow), out)
    return out if changed else None


def scope(selectors):
    out = []
    for sel in selectors.split(','):
        sel = sel.strip()
        if not sel or SKIP.search(sel):
            continue
        if sel.startswith(':root'):
            out.append('body.paper' + sel[len(':root'):])
        elif sel.startswith('html'):
            continue
        elif sel.startswith('body.'):
            out.append('body.paper.' + sel[len('body.'):])
        elif sel == 'body' or sel.startswith('body '):
            out.append('body.paper' + sel[4:])
        else:
            out.append('body.paper ' + sel)
    return out


def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def blocks(css, i=0):
    """Yields (prelude, body) at one nesting level; body is the raw text inside the braces."""
    n = len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            return
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{':
                depth += 1
            elif css[k] == '}':
                depth -= 1
            k += 1
        yield prelude, css[j + 1:k - 1]
        i = k


def decls(body):
    for d in re.split(r';(?![^(]*\))', body):
        if ':' not in d:
            continue
        p, v = d.split(':', 1)
        yield p.strip(), v.strip()


def convert(css):
    out = []
    for prelude, body in blocks(css):
        if prelude.startswith('@'):
            if prelude.startswith(('@media', '@supports')) and 'reduced-motion' not in prelude:
                inner = convert(body)
                if inner.strip():
                    out.append(f'{prelude} {{\n{inner}}}\n')
            continue
        sels = scope(prelude)
        if not sels:
            continue
        mapped = []
        for p, v in decls(body):
            if not COLOR_PROPS.match(p):
                continue
            important = v.endswith('!important')
            core = v[: -len('!important')].strip() if important else v
            m = map_value(p, core)
            if m is not None:
                mapped.append(f'  {p}: {m}{" !important" if important else ""};')
        if mapped:
            out.append(',\n'.join(sels) + ' {\n' + '\n'.join(mapped) + '\n}\n')
    return ''.join(out)


# ---------------------------------------------------------------------------------------------
# 夜间模式 (2026-11-15): the paper theme turned over once more, into 玄墨绿 — paper grounds become
# the green-black of the opening screen (cards a shade lighter), ink becomes ivory, bronze and stone
# lighten to read on the dark, cinnabar lightens a little. Written to src/paper-night.generated.css
# under `body.paper.night`, from: the paper rules of styles.css (卦笺, 研习与校订), paper.generated.css
# and paper.css, in that order. The opening screen, 首页 and the 立问 pages, the tab bar and the 卦笺's
# 象 band are dark already (玄墨绿) and are left out.
NIGHT_OUT = ROOT / 'src' / 'paper-night.generated.css'
PAPER_HAND = ROOT / 'src' / 'paper.css'
PAPER_NATIVE = re.compile(r'\.jian|\.study')
DAY_ONLY = re.compile(r'\.home-panel|\.dark-|\.flow-|\.fold-|\.tab-bar|\.jian-xiang|\.jian-bar|\.splash|\.login-|\.provider-btn|\.name-line|\.phone-row|\.code-row|\.model-badge|\.model-story|\.about-link')


def night(r, g, b, a, shadow=False):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hue = h * 360
    if shadow:
        if l < 0.5:
            return fmt(0, 0, 0, min(1, (a if a is not None else 1) * 1.6))
        return fmt(255, 255, 255, (a if a is not None else 1) * 0.06)
    if (hue < 22 or hue > 335) and s > 0.3 and 0.25 < l < 0.78:
        nr, ng, nb = colorsys.hls_to_rgb(h, max(l, 0.6), min(1, s * 0.85))
    elif l >= 0.78:
        nr, ng, nb = colorsys.hls_to_rgb(150 / 360, max(0.08, 0.125 + (l - 0.86) * 0.45), 0.1)
    elif l <= 0.32:
        nr, ng, nb = colorsys.hls_to_rgb(42 / 360, 0.9 - l * 0.35, 0.28)
    else:
        nr, ng, nb = colorsys.hls_to_rgb(h, min(0.84, l * 1.22 + 0.06), min(1, s * 1.05))
    return fmt(nr * 255, ng * 255, nb * 255, a)


def night_scope(selectors):
    out = []
    for sel in selectors.split(','):
        sel = sel.strip()
        if not sel or DAY_ONLY.search(sel) or '.night' in sel or sel.startswith((':root', 'html')):
            continue
        if sel.startswith('body.paper'):
            out.append('body.paper.night' + sel[len('body.paper'):])
        else:
            out.append('body.paper.night ' + sel)
    return out


def convert_night(css, keep=None):
    out = []
    for prelude, body in blocks(css):
        if prelude.startswith('@'):
            if prelude.startswith(('@media', '@supports')) and 'reduced-motion' not in prelude:
                inner = convert_night(body, keep)
                if inner.strip():
                    out.append(f'{prelude} {{\n{inner}}}\n')
            continue
        if keep and not keep.search(prelude):
            continue
        sels = night_scope(prelude)
        if not sels:
            continue
        mapped = []
        for p, v in decls(body):
            if not COLOR_PROPS.match(p):
                continue
            important = v.endswith('!important')
            core = v[: -len('!important')].strip() if important else v
            m = map_value(p, core, night)
            # A colour given by a token (var(--mo)) is already right at night (the token is turned);
            # it is repeated here so it still wins over the night rules generated before it.
            if m is None and 'var(' in core:
                m = core
            if m is not None:
                mapped.append(f'  {p}: {m}{" !important" if important else ""};')
        if mapped:
            out.append(',\n'.join(sels) + ' {\n' + '\n'.join(mapped) + '\n}\n')
    return ''.join(out)


def main():
    css = strip_comments(SRC.read_text(encoding='utf-8'))
    head = '/* Generated by scripts/build-paper-css.py from styles.css — do not edit; tune in paper.css. */\n'
    day = convert(css)
    OUT.write_text(head + day, encoding='utf-8', newline='\n')
    print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')
    hand = strip_comments(PAPER_HAND.read_text(encoding='utf-8'))
    nights = convert_night(css, PAPER_NATIVE) + convert_night(day) + convert_night(hand)
    nhead = '/* Generated by scripts/build-paper-css.py (夜间模式) — do not edit; tune in paper.css under body.paper.night. */\n'
    NIGHT_OUT.write_text(nhead + nights, encoding='utf-8', newline='\n')
    print(f'wrote {NIGHT_OUT.relative_to(ROOT)} ({NIGHT_OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
