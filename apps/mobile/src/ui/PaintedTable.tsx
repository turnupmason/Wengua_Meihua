/**
 * The stone table, painted (docs/art-reference/sanqing-entrance/table-empty.webp, the user's
 * picture): the dark slab with its bronze rim on the red-lacquer stand, over the paving. What
 * the 3D table carries is carved into the slab in the same Song face and old gold as the user's
 * reference (table-carved-reference.webp): 目前 / 经过 / 结果 in their frames, the three
 * hexagrams as gold-filled grooves (the moving line in cinnabar, with its ○ / ×), 本卦 / 互卦 /
 * 变卦 with their names and grades, 体 and 用 beside the primary, the relation and the cast time.
 *
 * The writing lies on a flat 600 × 1040 face (the 3D slab's proportions) mapped onto the slab
 * in the picture by one CSS perspective transform, so it sits in the stone and stays tappable.
 * While 石桌显卦 the grooves open one by one on the ritual clock, with the same chimes.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import type { Reading } from '../knowledge/knowledge';
import type { RelationView } from '../domain/relation';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { STAGE_ORDER, type StageKey } from '../domain/layout';
import type { LinePick, Selection } from '../scene/StoneTable';
import { inscriptionBlocks, type Block } from '../scene/inscriptionLayout';
import { revealPlan, lineStarted } from '../scene/carving';
import { templeAudio } from '../domain/audio';
import type { RitualClock } from './useRitualClock';
import { WALK_IN_FILES, walkInUrl } from './walkInArt';

/** The picture (941 × 1672) and the slab top inside its bronze rim, in its pixels (TL, TR, BR, BL). */
const PLATE = { w: 941, h: 1672 };
const QUAD: [number, number][] = [
  [174, 209],
  [757, 209],
  [902, 1072],
  [32, 1072],
];
/** The slab's width at its near edge. */
const SLAB_X: [number, number] = [32, 902];
/** The flat face the writing is laid out on (the 3D slab is 1.5 × 2.6 m). */
const FACE = { w: 600, h: 1040 };
/** Room kept at the foot for the 简断 card (its height, its margin and the gap above it). */
const BARS = { bottom: 132 };

/** Band centres on the face (结果 at the far end, 目前 nearest), and the hexagram's measures. */
const BAND_Y: Record<StageKey, number> = { changed: 215, mutual: 485, primary: 755 };
const HEX = { pitch: 34 };
/**
 * The far bands are seen smaller (the slab recedes), and more so in height than in width: from the
 * slab's own perspective map at each name (relative to 本卦's), 互卦 is seen at 0.90 wide × 0.81
 * high and 变卦 at 0.82 wide × 0.67 high. Their writing is set larger by the height's inverse and
 * narrowed back by the width's, so the three names (and grades) look the same size and shape.
 */
const FAR: Record<StageKey, { size: number; x: number }> = {
  primary: { size: 1, x: 1 },
  mutual: { size: 1.239, x: 0.899 },
  changed: { size: 1.502, x: 0.816 },
};
const lineY = (stage: StageKey, position: number) => BAND_Y[stage] + (3.5 - position) * HEX.pitch;

/** CSS matrix3d taking the rectangle (0,0)–(w,h) onto the quad (projective, square-to-quad). */
function quadMatrix(w: number, h: number, q: [number, number][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`;
}

/** The screen's side margin for the slab: the same 12px as the top bar's buttons. */
const SIDE = 12;
/** The table as seen (slab top to the feet of its legs), in the picture's pixels. */
const TABLE_Y: [number, number] = [209, 1363];

/**
 * The picture fills the screen: the slab as wide as it goes within the side margins, and the table
 * (slab and legs) centred between the top bar and the 简断 card at the foot, so the space above and
 * below it is even. The dark floor of the picture runs on beyond.
 */
function frame(root: HTMLElement, plate: HTMLElement, face: HTMLElement) {
  const W = root.clientWidth;
  const H = root.clientHeight;
  const s = Math.min(H / PLATE.h, (W - 2 * SIDE) / (SLAB_X[1] - SLAB_X[0]));
  const left = W / 2 - ((SLAB_X[0] + SLAB_X[1]) / 2) * s;
  const bar = document.querySelector<HTMLElement>('.temple-top')?.getBoundingClientRect().bottom || 56;
  const above = bar;
  const below = H - BARS.bottom;
  const mid = (above + below) / 2 - ((TABLE_Y[0] + TABLE_Y[1]) / 2) * s;
  // Never so high that the slab's far edge meets the bar (on a short screen the legs go behind the
  // 简断 card instead).
  const top = Math.max(mid, above + 24 - TABLE_Y[0] * s);
  Object.assign(plate.style, { width: `${PLATE.w * s}px`, height: `${PLATE.h * s}px`, left: `${left}px`, top: `${top}px` });
  face.style.transform = quadMatrix(FACE.w, FACE.h, QUAD.map(([x, y]) => [x * s, y * s] as [number, number]));
}

interface Props {
  reading: Reading;
  relation: RelationView | null;
  phase: string;
  clock: MutableRefObject<RitualClock>;
  reduced: boolean;
  t: Strings;
  lang: Lang;
  selection: Selection | null;
  castTime: string;
  onPick: (p: LinePick) => void;
  onOpenStage: (s: StageKey) => void;
  onOpenRelation: () => void;
  /** A tap on the table away from any line (closes the line's tip). */
  onMiss: () => void;
  /** First time at the stone: 目前 lights once (start here). */
  hint?: boolean;
}

type Part = { el: HTMLElement; at: number; dur: number; kind: 'fade' | 'groove'; y?: number };
/** Where a groove runs on the face: from GROOVE_X, GROOVE_W long. */
const GROOVE_X = 253;
const GROOVE_W = 184;

/** Tap / Enter / Space on a plain element (vertical writing is unreliable inside a <button>). */
const tappable = (on: boolean, act: () => void) => ({
  role: 'button' as const,
  tabIndex: on ? 0 : -1,
  onClick: (e: React.MouseEvent) => {
    if (!on) return;
    e.stopPropagation();
    act();
  },
  onKeyDown: (e: React.KeyboardEvent) => {
    if (on && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      act();
    }
  },
});

export function PaintedTable({ reading, relation, phase, clock, reduced, t, lang, selection, castTime, onPick, onOpenStage, onOpenRelation, onMiss, hint = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const parts = useRef<Map<string, Part>>(new Map());
  const spark = useRef<HTMLElement>(null);
  const plan = useMemo(() => revealPlan(reduced), [reduced]);
  const blocks = useMemo(() => {
    const m = new Map<string, Block>();
    for (const b of inscriptionBlocks(reading, relation, t, lang, castTime)) m.set(b.key, b);
    return m;
  }, [reading, relation, t, lang, castTime]);
  const zh = lang !== 'en';
  const interactive = phase === 'reading';

  useEffect(() => {
    const fit = () => root.current && plate.current && face.current && frame(root.current, plate.current, face.current);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // 石桌显卦: each part shows when its time on the ritual clock comes (grooves open along their
  // length, the writing fades in), with a soft chime as each line begins. Done in the reading.
  useEffect(() => {
    const all = [...parts.current.values()];
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    // A groove is cut first (it opens along its length, dark), then gold settles in its floor.
    const set = (p: Part, k: number, gold: number) => {
      if (p.kind === 'groove') {
        p.el.style.transform = `scaleX(${k.toFixed(3)})`;
        p.el.style.setProperty('--g', gold.toFixed(3));
      } else p.el.style.opacity = k.toFixed(3);
    };
    const sp = spark.current;
    if (phase !== 'revealing') {
      for (const p of all) set(p, 1, 1);
      if (sp) sp.style.opacity = '0';
      return;
    }
    let raf = 0;
    let last = -1;
    const tick = () => {
      // The clock moves on to the reading (t back to 0) a moment before this effect is replaced:
      // drawing that frame would wipe the carving for an instant.
      if (clock.current.phase !== 'revealing') {
        raf = requestAnimationFrame(tick);
        return;
      }
      const now = clock.current.t;
      let cutting: { x: number; y: number } | null = null;
      for (const p of all) {
        const k = clamp((now - p.at) / p.dur);
        set(p, k, clamp((now - p.at - p.dur) / plan.glowDuration));
        if (p.kind === 'groove' && p.y !== undefined && k > 0 && k < 1) cutting = { x: GROOVE_X + GROOVE_W * k, y: p.y };
      }
      // The point of light that cuts the line.
      if (sp) {
        sp.style.opacity = cutting && !plan.reduced ? '1' : '0';
        if (cutting) sp.style.transform = `translate3d(${cutting.x.toFixed(1)}px, ${cutting.y.toFixed(1)}px, 0)`;
      }
      if (last >= 0) {
        const started = lineStarted(plan, last, now);
        if (started !== null) templeAudio.chime(started - 1);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, clock, plan, reading]);

  /** Registers a part of the carving with its start and length on the clock. */
  const part = (key: string, at: number, dur: number, kind: Part['kind'] = 'fade', y?: number) => (el: HTMLElement | null) => {
    if (el) parts.current.set(key, { el, at, dur, kind, y });
    else parts.current.delete(key);
  };
  const framesAt = plan.framesStart;
  const frameDur = plan.reduced ? 0.4 : 0.6;
  const text = (b: Block | undefined) => b?.lines ?? [];

  const pickAt = (stage: StageKey, position: number) => (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onPick({ stage, hexagramId: reading.stages[stage].id, linePosition: position, at: [e.clientX, e.clientY] });
  };

  return (
    <div ref={root} className={`painted-table ${interactive ? 'is-live' : ''} ${hint ? 'is-hint' : ''}`} aria-hidden={!interactive} onClick={interactive ? onMiss : undefined}>
      {/* A thin warm wash over the picture (static, so it costs nothing per frame) brings the table's
          cooler grey toward the hall's lamplight. */}
      <div ref={plate} className="ptab-plate" style={{ backgroundImage: `linear-gradient(rgba(150, 90, 30, 0.1), rgba(150, 90, 30, 0.1)), url(${walkInUrl(WALK_IN_FILES.table)})` }}>
        <div ref={face} className={`ptab-face ${zh ? '' : 'is-en'}`} style={{ width: FACE.w, height: FACE.h }}>
          <i ref={spark} className="ptab-spark" />
          {/* The rule between the frames and the hexagrams. */}
          <i ref={part('rule', framesAt, frameDur)} className="ptab-rule" />
          {STAGE_ORDER.map((s, i) => {
            const panel = reading.stages[s];
            const bandY = BAND_Y[s];
            const name = text(blocks.get(`name-${s}`));
            const grade = text(blocks.get(`grade-${s}`));
            const textAt = plan.textStart(i);
            return (
              <div key={s} className={`ptab-band band-${s}`}>
                {/* 目前 / 经过 / 结果 in its carved frame. */}
                <div ref={part(`caption-${s}`, framesAt, frameDur)} className="ptab-tablet ptab-gold" style={{ top: bandY - 78 }} {...tappable(interactive, () => onOpenStage(s))}>
                  <span>{t[`caption_${s}`]}</span>
                </div>
                {/* The hexagram: six grooves, bottom (初) to top. */}
                {panel.bitsBottomUp.map((bit, k) => {
                  const position = k + 1;
                  const isMoving = s === 'primary' && position === reading.movingLine;
                  const isSelected = !!selection && selection.stage === s && selection.hexagramId === panel.id && selection.linePosition === position;
                  const y = lineY(s, position);
                  return (
                    <button
                      key={position}
                      type="button"
                      className={`ptab-line ${bit ? 'is-yang' : 'is-yin'} ${isMoving ? 'is-moving' : ''} ${isSelected ? 'is-selected' : ''}`}
                      style={{ top: y - HEX.pitch / 2 }}
                      onClick={pickAt(s, position)}
                      tabIndex={interactive ? 0 : -1}
                      aria-label={`${t[`stage_${s}`]} ${panel.name} ${panel.detail.lines[k]?.label ?? position}`}
                    >
                      <span ref={part(`line-${s}-${position}`, plan.lineStart(i, position), plan.lineDuration, 'groove', y)} className="ptab-groove">
                        {bit ? <i /> : (
                          <>
                            <i />
                            <i />
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
                {/* The moving line's ○ / ×, and its counterpart marked on the 变卦. */}
                {s === 'primary' && (
                  <b ref={part('mark', plan.lineStart(0, reading.movingLine) + plan.lineDuration, 0.5)} className="ptab-mark" style={{ top: lineY(s, reading.movingLine) }}>
                    {panel.bitsBottomUp[reading.movingLine - 1] ? '○' : '×'}
                  </b>
                )}
                {s === 'changed' && <i ref={part('counter', plan.textStart(2), 0.5)} className="ptab-counter" style={{ top: lineY(s, reading.movingLine) }} />}
                {/* The name (本卦 / 互卦 / 变卦 is said by the frame on the left and when the name is
                    tapped), and its grade, written down the slab. */}
                <div ref={part(`name-${s}`, textAt, plan.textDuration)} className="ptab-name" style={{ top: bandY }} aria-label={`${t[`stage_${s}`]} ${panel.name}`} {...tappable(interactive, () => onOpenStage(s))}>
                  {name
                    .filter((l) => l.tone !== 'pale')
                    .map((l, j) => (
                      <span key={j} className="ptab-gold" style={zh ? { fontSize: Math.round(44 * FAR[s].size), transform: `scaleX(${FAR[s].x})` } : undefined}>
                        {l.text}
                      </span>
                    ))}
                </div>
                <span ref={part(`grade-${s}`, textAt, plan.textDuration)} className="ptab-grade ptab-gold" style={{ top: bandY, ...(zh ? { fontSize: Math.round(24 * FAR[s].size), transform: `translateY(-50%) scaleX(${FAR[s].x})` } : {}) }}>
                  {grade.map((l) => l.text).join(zh ? '' : ' ')}
                </span>
              </div>
            );
          })}
          {/* 事态发展 under the 目前 frame: read upward, 目前 → 经过 → 结果. */}
          <span ref={part('situation', framesAt, frameDur)} className="ptab-situation ptab-pale">
            {text(blocks.get('situation')).map((l, j) => (
              <span key={j}>{l.text}</span>
            ))}
          </span>
          {/* 体 and 用 beside the primary's two trigrams (with the trigram and its element), an arrow from
              体 to 用. Their meaning (自己 / 事情) is too small to read on a phone carved here; it is
              given when 体用 is opened. */}
          {(['upper', 'lower'] as const).map((side) => {
            const all = text(blocks.get(`role-${side}`));
            const lines = all.length > 2 ? [all[0], all[all.length - 1]] : all;
            const y = BAND_Y.primary + (side === 'upper' ? -1.5 : 1.5) * HEX.pitch;
            return (
              <span key={side} ref={part(`role-${side}`, plan.tagsStart, plan.textDuration)} className="ptab-role" style={{ top: y }}>
                {lines.map((l, j) => (
                  <span key={j} className={j === 0 ? 'ptab-gold ptab-role-word' : 'ptab-pale'}>
                    {l.text}
                  </span>
                ))}
              </span>
            );
          })}
          <i ref={part('arrow', plan.arrowStart, plan.reduced ? plan.lineDuration : 0.5)} className={`ptab-arrow ${reading.body.side === 'lower' ? 'is-up' : 'is-down'}`} style={{ top: BAND_Y.primary - 22 }} />
          {/* The three stages against 体, and when it was cast. */}
          {(() => {
            const rel = text(blocks.get('relation') ?? blocks.get('cast-time'));
            return (
              <button type="button" ref={part('relation', plan.tagsStart, plan.textDuration)} className="ptab-relation" onClick={() => interactive && relation && onOpenRelation()} tabIndex={interactive ? 0 : -1}>
                {rel.map((l, j) => (
                  <span key={j} className={l.tone === 'pale' ? 'ptab-pale ptab-time' : 'ptab-gold ptab-rel-line'}>
                    {l.text}
                  </span>
                ))}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
