/**
 * 卦签: a picture of one reading to send to a friend. Read top down: brand and hour, the 简断's
 * headline (the first thing seen, even as a chat thumbnail), the three hexagrams (目前 → 经过 → 结果,
 * moving line in cinnabar), then a few lines of the 简断. What was
 * asked is not on it (the visitor shares the reading, not the worry). Drawn on a canvas in the app's
 * own fonts. It is shown first (the preview in ReadingView), then shared through the system sheet or
 * saved as a PNG; the field asked about (事业工作 · 能否转正) is on it, never the visitor’s own words.
 */

export interface CardStage {
  caption: string;
  name: string;
  bits: readonly number[];
  /** Lit line (本卦's moving line), 1 = bottom. */
  moving?: number | null;
}

export interface CardContent {
  appName: string;
  stages: [CardStage, CardStage, CardStage];
  title: string;
  short: string;
  /** The field and entry asked about (事业工作 · 能否转正) — never the visitor's own words. */
  field?: string;
  /** e.g. 丙午年 十月初六 巳时 起卦 */
  when: string;
  foot: string;
}

const W = 1080;
const H = 1440;
// On 宣纸 (2026-11-15): ink, bronze and cinnabar, like the 卦笺.
const MO = '#17252a';
const MO2 = '#3d4a4e';
const SHIQING = '#60767a';
const TONG = 'rgba(125, 102, 68, 0.75)';
const CINNABAR = '#ac5145';
const HEAD = "600 {s}px 'WenguaSerifHeading', 'Noto Serif SC', 'Songti SC', serif";
const BODY = "400 {s}px 'WenguaSerif', 'Noto Serif SC', 'Songti SC', serif";
const font = (f: string, s: number) => f.replace('{s}', String(s));

/** Breaks Chinese (or spaced) text into lines that fit, at most `max` lines (the last ends in …). */
function wrap(ctx: CanvasRenderingContext2D, raw: string, width: number, max: number): string[] {
  const text = [...raw.replace(/\s+/g, ' ').trim()];
  const closing = /[，。；、！？：”」）]/;
  const lines: string[] = [];
  let line = '';
  let used = 0;
  for (const ch of text) {
    if (lines.length === max) break;
    used++;
    if (ctx.measureText(line + ch).width <= width || !line) line += ch;
    else if (closing.test(ch)) {
      // A line never starts with closing punctuation: it stays on the line before.
      lines.push(line + ch);
      line = '';
    } else {
      // Break after a comma in the back half of the line rather than mid-phrase.
      const cut = Math.max(...[...'，；、：'].map((p) => line.lastIndexOf(p)));
      if (cut >= line.length / 2 && cut < line.length - 1) {
        lines.push(line.slice(0, cut + 1));
        line = line.slice(cut + 1) + ch;
      } else {
        lines.push(line);
        line = ch;
      }
    }
  }
  if (line && lines.length < max) lines.push(line);
  else if (line) used -= [...line].length;
  if (used < text.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
    lines[lines.length - 1] = last.replace(/[，。；、]$/, '') + '…';
  }
  return lines;
}

function drawHexagram(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, stage: CardStage) {
  const bar = 15;
  const gap = 13;
  for (let i = 0; i < 6; i++) {
    const pos = i + 1;
    const top = y + (5 - i) * (bar + gap);
    ctx.fillStyle = stage.moving === pos ? CINNABAR : MO;
    if (stage.bits[i]) ctx.fillRect(x, top, w, bar);
    else {
      const half = (w - w * 0.16) / 2;
      ctx.fillRect(x, top, half, bar);
      ctx.fillRect(x + w - half, top, half, bar);
    }
  }
  return 6 * bar + 5 * gap;
}

export async function drawCard(c: CardContent): Promise<Blob> {
  // The app's fonts must be ready before drawing, or the canvas falls back to a system face.
  try {
    await Promise.all([document.fonts.load(font(HEAD, 64), c.title + c.appName), document.fonts.load(font(BODY, 36), c.short)]);
  } catch {
    /* draw with whatever is there */
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f6f2e6');
  bg.addColorStop(1, '#ece5d2');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // A bronze double rule, the same distance from every edge, as a book page is framed.
  const EDGE = 52;
  ctx.strokeStyle = TONG;
  ctx.lineWidth = 3;
  ctx.strokeRect(EDGE, EDGE, W - EDGE * 2, H - EDGE * 2);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(EDGE + 12, EDGE + 12, W - (EDGE + 12) * 2, H - (EDGE + 12) * 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Brand, the field asked about, and the hour, small.
  ctx.fillStyle = MO;
  ctx.font = font(HEAD, 40);
  ctx.fillText([...c.appName].join(' '), W / 2, 140);
  let head = 140;
  if (c.field) {
    head += 52;
    ctx.fillStyle = MO2;
    ctx.font = font(HEAD, 34);
    ctx.fillText(c.field, W / 2, head);
  }
  head += 46;
  ctx.fillStyle = SHIQING;
  ctx.font = font(BODY, 28);
  ctx.fillText(c.when, W / 2, head);

  // The 简断's headline first: what the card is saying, readable even as a chat thumbnail.
  let y = head + 50;
  ctx.fillStyle = MO;
  ctx.font = font(HEAD, 70);
  for (const l of wrap(ctx, c.title, W - 200, 3)) {
    y += 92;
    ctx.fillText(l, W / 2, y);
  }

  // Then the three hexagrams: 目前 → 经过 → 结果, the moving line in cinnabar.
  const colW = 250;
  const xs = [W / 2 - colW - 50, W / 2, W / 2 + colW + 50];
  const hexW = 150;
  const top = y + 120;
  let below = top;
  c.stages.forEach((s, i) => {
    ctx.fillStyle = SHIQING;
    ctx.font = font(BODY, 28);
    ctx.fillText(s.caption, xs[i], top - 26);
    const h = drawHexagram(ctx, xs[i] - hexW / 2, top, hexW, s);
    ctx.fillStyle = MO;
    ctx.font = font(HEAD, 38);
    ctx.fillText(s.name, xs[i], top + h + 58);
    below = top + h + 58;
  });
  ctx.strokeStyle = 'rgba(125, 102, 68, 0.5)';
  ctx.lineWidth = 2;
  for (const x of [xs[0] + colW / 2 + 6, xs[1] + colW / 2 + 6]) {
    ctx.beginPath();
    ctx.moveTo(x, top + 62);
    ctx.lineTo(x + 16, top + 74);
    ctx.lineTo(x, top + 86);
    ctx.stroke();
  }

  // A few lines of the 简断 itself, brighter and shorter.
  y = below + 50;
  ctx.fillStyle = 'rgba(125, 102, 68, 0.45)';
  ctx.fillRect(W / 2 - 50, y, 100, 2);
  y += 22;
  ctx.fillStyle = MO2;
  ctx.font = font(BODY, 38);
  for (const l of wrap(ctx, c.short, W - 260, 4)) {
    y += 60;
    ctx.fillText(l, W / 2, y);
  }

  // The cinnabar seal 「问卦」 (read top to bottom) and the foot line.
  ctx.fillStyle = CINNABAR;
  ctx.fillRect(W / 2 - 36, H - 244, 72, 100);
  ctx.strokeStyle = 'rgba(248, 236, 216, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 31, H - 239, 62, 90);
  ctx.fillStyle = '#f8ecd8';
  ctx.font = font(HEAD, 36);
  ctx.fillText('问', W / 2, H - 202);
  ctx.fillText('卦', W / 2, H - 160);
  ctx.fillStyle = SHIQING;
  ctx.font = font(BODY, 26);
  ctx.fillText(c.foot, W / 2, H - 104);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'));
}

/** Whether this device can hand the picture to the system share sheet. */
export function canShareImage(blob: Blob, name: string): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    return !!nav.canShare?.({ files: [new File([blob], name, { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** The system share sheet with the card. */
export async function shareImage(blob: Blob, name: string): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [new File([blob], name, { type: 'image/png' })] });
    return 'shared';
  } catch (e) {
    return (e as Error).name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

/** Saves the card as a PNG (a download in the browser). */
export function saveImage(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
