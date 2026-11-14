/**
 * 卦签: a picture of one reading to send to a friend — the three hexagrams (目前 → 经过 → 结果) with
 * the moving line in cinnabar, the 简断's headline and its few lines, and when it was cast. What was
 * asked is not on it (the visitor shares the reading, not the worry). Drawn on a canvas in the app's
 * own fonts; shared through the system sheet where there is one, otherwise saved as a PNG.
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
  /** e.g. 丙午年 十月初六 巳时 起卦 */
  when: string;
  foot: string;
}

const W = 1080;
const H = 1440;
const GOLD = '#e7c27a';
const INK = '#f1e2bf';
const CINNABAR = '#d0532f';
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
    ctx.fillStyle = stage.moving === pos ? CINNABAR : GOLD;
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
  bg.addColorStop(0, '#2a1a10');
  bg.addColorStop(1, '#0f0a07');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // A fine double rule, like the stone's frame.
  ctx.strokeStyle = 'rgba(231, 194, 122, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = 'rgba(231, 194, 122, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD;
  ctx.font = font(HEAD, 44);
  ctx.fillText([...c.appName].join(' '), W / 2, 150);
  ctx.fillStyle = 'rgba(241, 226, 191, 0.6)';
  ctx.font = font(BODY, 30);
  ctx.fillText(c.when, W / 2, 200);

  // 目前 → 经过 → 结果
  const colW = 260;
  const xs = [W / 2 - colW - 60, W / 2, W / 2 + colW + 60];
  const hexW = 170;
  const top = 290;
  c.stages.forEach((s, i) => {
    ctx.fillStyle = 'rgba(241, 226, 191, 0.55)';
    ctx.font = font(BODY, 28);
    ctx.fillText(s.caption, xs[i], top - 24);
    const h = drawHexagram(ctx, xs[i] - hexW / 2, top, hexW, s);
    ctx.fillStyle = INK;
    ctx.font = font(HEAD, 40);
    ctx.fillText(s.name, xs[i], top + h + 64);
  });
  ctx.strokeStyle = 'rgba(231, 194, 122, 0.4)';
  ctx.lineWidth = 2;
  for (const x of [xs[0] + colW / 2 + 10, xs[1] + colW / 2 + 10]) {
    ctx.beginPath();
    ctx.moveTo(x, top + 70);
    ctx.lineTo(x + 18, top + 82);
    ctx.lineTo(x, top + 94);
    ctx.stroke();
  }

  // The 简断: headline, then its lines.
  let y = 700;
  ctx.fillStyle = 'rgba(231, 194, 122, 0.3)';
  ctx.fillRect(W / 2 - 60, y - 40, 120, 2);
  ctx.fillStyle = '#f6dfa4';
  ctx.font = font(HEAD, 60);
  for (const l of wrap(ctx, c.title, W - 220, 3)) {
    y += 80;
    ctx.fillText(l, W / 2, y);
  }
  y += 40;
  ctx.fillStyle = 'rgba(241, 226, 191, 0.85)';
  ctx.font = font(BODY, 36);
  for (const l of wrap(ctx, c.short, W - 240, 6)) {
    y += 58;
    ctx.fillText(l, W / 2, y);
  }

  // A cinnabar seal and the foot line.
  ctx.fillStyle = '#a2341c';
  ctx.fillRect(W / 2 - 34, H - 210, 68, 68);
  ctx.fillStyle = '#f8ebd2';
  ctx.font = font(HEAD, 40);
  ctx.fillText('卦', W / 2, H - 162);
  ctx.fillStyle = 'rgba(241, 226, 191, 0.5)';
  ctx.font = font(BODY, 26);
  ctx.fillText(c.foot, W / 2, H - 100);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'));
}

/** Opens the system share sheet with the card, or saves it where sharing files is not possible. */
export async function shareCard(blob: Blob, name: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'saved';
}
