/**
 * Flat reading board (used only when 3D is unavailable or switched off). It mirrors the stone
 * table: three bands stacked from 本卦 (目前, bottom) to 变卦 (结果, top), each with its
 * 目前/经过/结果 frame, the hexagram, and the name and grade written vertically; 体/用 beside
 * the primary; the relation along the bottom. Everything is centred on a stone-coloured panel.
 */
import type { Reading } from '../knowledge/knowledge';
import type { RelationView } from '../domain/relation';
import type { StageKey } from '../domain/layout';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import type { LinePick, Selection } from '../scene/StoneTable';
import { HexagramSVG } from './HexagramSVG';
import { RelationGlyph } from './RelationGlyph';
import { RoleTag, relationText } from './text';
import { SYNTH_EN } from '../domain/i18n';

interface Props {
  reading: Reading;
  relation: RelationView;
  selection: Selection | null;
  t: Strings;
  lang: Lang;
  revealed: boolean;
  onPick: (p: LinePick) => void;
  onOpenStage: (s: StageKey) => void;
  castTime?: string;
}

const BANDS: StageKey[] = ['changed', 'mutual', 'primary'];

export function Board2D({ reading, relation, selection, t, lang, revealed, onPick, onOpenStage, castTime }: Props) {
  const rel = relationText(relation, lang);
  const y = reading.synthesis;
  const stages = !y.applicable ? (y.weather?.stoneLine ?? `${rel.label} · ${rel.phrase}`) : lang === 'en' ? y.stages.map((s, i) => `${['Use', 'Mutual', 'Changed'][i]}: ${SYNTH_EN.stage[s.main.type]}`).join(' · ') : y.stoneLine;
  return (
    <div className={`board-2d ${revealed ? 'is-revealed' : ''}`}>
      {BANDS.map((s, i) => {
        const panel = reading.stages[s];
        const selected = selection && selection.stage === s && selection.hexagramId === panel.id ? selection.linePosition : null;
        return (
          <div key={s} className={`band band-${s}`}>
            <div className="band-caption">
              <span>{t[`caption_${s}`]}</span>
              {i > 0 && <i className="band-arrow" aria-hidden="true">︿</i>}
              {s === 'primary' && <small className="band-situation">{t.situation}</small>}
            </div>
            <div className="band-tags">
              {s === 'primary' &&
                (['upper', 'lower'] as const).map((side) => {
                  const isBody = reading.body.side === side;
                  const info = isBody ? reading.body : reading.use;
                  return <RoleTag key={side} isBody={isBody} t={t} trigram={info.trigram} element={info.element} />;
                })}
            </div>
            <HexagramSVG
              bits={panel.bitsBottomUp}
              hexagramId={panel.id}
              title={`${t[`stage_${s}`]} ${panel.name}`}
              movingLine={s === 'primary' ? reading.movingLine : null}
              correspondingLine={s === 'changed' ? reading.movingLine : null}
              selectedLine={selected}
              lineLabels={panel.detail.lines.map((l) => l.label)}
              onLine={(pos) => onPick({ stage: s, hexagramId: panel.id, linePosition: pos })}
              width={112}
              revealed={revealed}
            />
            <button className="band-name" onClick={() => onOpenStage(s)} aria-label={`${t[`stage_${s}`]} ${panel.name}`}>
              <small>{t[`stage_${s}`]}</small>
              <b>{panel.name}</b>
            </button>
            <span className="band-grade">{panel.detail.grade.rawGrade}</span>
          </div>
        );
      })}
      {/* 用 · 互 · 变 against 体 — the start alone is not the verdict (the conclusion is below). */}
      <p className="board-relation" aria-label={stages}>
        <RelationGlyph relation={relation} />
        <b>{stages}</b>
      </p>
      {castTime && <p className="board-time">{castTime}</p>}
    </div>
  );
}
