/**
 * Where each carved inscription goes on the table top, and what it says. Pure data (no
 * Three.js): every block has a fixed rectangle inside the table, so text never runs off it.
 * Chinese is carved in vertical columns, like a stele; each band reads
 *   [目前 in its own frame] | [体/用 tags, primary only] [hexagram] [本卦 · 卦名] [等级]
 */
import type { Reading } from '../knowledge/knowledge';
import type { RelationView } from '../domain/relation';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { RELATION_EN, SYNTH_EN } from '../domain/i18n';
import { HEX_LAYOUT, STAGE_ORDER, stageCenterZ, trigramDepth, type StageKey } from '../domain/layout';

export interface InscriptionLine {
  text: string;
  /** Glyph height in metres on the table. */
  size: number;
  /** Gold fill (default) or the paler secondary gold. */
  tone?: 'gold' | 'pale';
  /** Extra space before this line, metres. */
  gap?: number;
}

export interface Block {
  key: string;
  x: number;
  z: number;
  w: number;
  d: number;
  lines: InscriptionLine[];
  /** Characters stacked top to bottom (Chinese stele style). */
  vertical?: boolean;
  startKey: 'frames' | 'stage0' | 'stage1' | 'stage2' | 'tags';
  stage?: StageKey;
}

export function inscriptionBlocks(reading: Reading, relation: RelationView | null, t: Strings, lang: Lang, castTime = ''): Block[] {
  const L = HEX_LAYOUT;
  const band = 0.62; // usable band height for columns
  const blocks: Block[] = [];
  STAGE_ORDER.forEach((s, i) => {
    const panel = reading.stages[s];
    const grade = panel.detail.grade;
    const z = stageCenterZ(s);
    // 目前 / 经过 / 结果, alone inside its carved frame.
    blocks.push({ key: `caption-${s}`, stage: s, x: L.captionX, z, w: L.captionWidth - 0.04, d: 0.32, vertical: true, startKey: 'frames', lines: [{ text: t[`caption_${s}`], size: 0.1 }] });
    // 本卦 + name.
    blocks.push({
      key: `name-${s}`,
      stage: s,
      x: L.nameX,
      z,
      w: L.nameWidth,
      d: band,
      vertical: true,
      startKey: `stage${i}` as Block['startKey'],
      lines: [
        { text: t[`stage_${s}`], size: 0.058, tone: 'pale' },
        { text: panel.name, size: 0.11, gap: 0.03 },
      ],
    });
    // Grade.
    blocks.push({
      key: `grade-${s}`,
      stage: s,
      x: L.gradeX,
      z,
      w: L.gradeWidth,
      d: band,
      vertical: true,
      startKey: `stage${i}` as Block['startKey'],
      lines: lang === 'en' ? [{ text: grade.rawGrade, size: 0.085 }, { text: t.tierLabels[grade.canonicalGrade], size: 0.045, tone: 'pale', gap: 0.02 }] : [{ text: grade.rawGrade, size: 0.085 }],
    });
  });
  // 事态发展: under the 目前 frame, telling how to read 目前 → 经过 → 结果.
  blocks.push({
    key: 'situation',
    x: L.captionX,
    z: stageCenterZ('primary') + 0.27,
    w: L.captionWidth,
    d: 0.16,
    startKey: 'frames',
    lines: lang === 'en' ? [{ text: 'how it', size: 0.034, tone: 'pale' }, { text: 'unfolds ↑', size: 0.034, tone: 'pale' }] : [{ text: '事态', size: 0.058 }, { text: '发展', size: 0.058 }],
  });
  const roleMeaning = (isBody: boolean) => ((isBody ? t.bodyTag : t.useTag).split(/[：:]\s*/)[1] ?? '').replace(/\s*·\s*/g, '·');
  for (const side of ['upper', 'lower'] as const) {
    const isBody = reading.body.side === side;
    const info = isBody ? reading.body : reading.use;
    blocks.push({
      key: `role-${side}`,
      x: L.tagX,
      z: stageCenterZ('primary') + trigramDepth(side),
      w: L.tagWidth,
      d: 0.29,
      startKey: 'tags',
      lines: [
        { text: isBody ? '体' : '用', size: 0.1 },
        { text: roleMeaning(isBody), size: 0.05, tone: 'pale', gap: 0.004 },
        { text: `${info.trigram}${info.element}`, size: 0.056, gap: 0.004 },
      ],
    });
  }
  if (relation) {
    // The three stages against 体 (用 · 互 · 变), not the start alone as if it were the whole verdict.
    const y = reading.synthesis;
    const zhLine = y.applicable ? y.stoneLine : y.weather?.stoneLine ?? `${relation.label} · ${relation.phrase}`;
    const enLine = y.applicable ? y.stages.map((s) => `${['Use', 'Mutual', 'Changed'][y.stages.indexOf(s)]}: ${SYNTH_EN.stage[s.main.type]}`).join(' · ') : y.weather ? `Weather: ${y.weather.top.map((x) => SYNTH_EN.weather[x]).join(', ')}` : RELATION_EN[relation.type].label;
    blocks.push({
      key: 'relation',
      x: 0,
      z: L.relationZ,
      w: L.tableWidth - 0.2,
      d: L.relationHeight,
      startKey: 'tags',
      lines: [{ text: lang === 'en' ? enLine : zhLine, size: lang === 'en' ? 0.05 : 0.07 }, ...(castTime ? [{ text: castTime, size: 0.052, tone: 'pale' as const, gap: 0.012 }] : [])],
    });
  } else if (castTime) {
    blocks.push({ key: 'cast-time', x: 0, z: L.relationZ, w: L.tableWidth - 0.2, d: L.relationHeight, startKey: 'tags', lines: [{ text: castTime, size: 0.05, tone: 'pale' }] });
  }
  return blocks;
}
