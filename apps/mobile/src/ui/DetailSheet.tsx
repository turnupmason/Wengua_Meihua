/**
 * Bottom detail sheet. Order: name & grade → this cast's moving-line badge → classical text,
 * vernacular, image text → line facts & correct changed hexagram → editorial note → expandable
 * commentary & sources. Base texts come synchronously from the canonical library, so they stay
 * readable if a details file fails; only the newest request may update the sheet.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Knowledge, Reading, DetailedLine, DetailedHexagram, ReferenceCommentary } from '../knowledge/knowledge';
import { getVoidReleaseTargets } from '../knowledge/knowledge';
import type { Selection } from '../scene/StoneTable';
import type { CastRecord } from '../domain/cast';
import type { MissingReason, ProductJudgment } from '../domain/judgment';
import { createRequestGate } from '../domain/requestGate';
import { ROLE_LABEL } from '../domain/relation';
import { lineSlots } from '../domain/layout';
import type { Strings } from '../domain/i18n';
import { ELEMENT_EN } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { DisplayGradeText, domainTitle, relationText } from './text';
import { castTimeText } from './timeText';

const METHOD_NAME: Record<string, keyof Strings> = {
  'classical-time': 'm_classical',
  'object-count': 'm_object',
  'sound-count': 'm_sound',
  text: 'm_text',
  'object-direction': 'm_objdir',
  'chi-cun': 'm_chicun',
  'zhang-chi': 'm_zhangchi',
};

interface Props {
  knowledge: Knowledge;
  selection: Selection;
  reading: Reading | null;
  record: CastRecord | null;
  t: Strings;
  lang: Lang;
  onSelect: (s: Selection) => void;
  onClose: () => void;
}

/**
 * The 断语 of a cast as shown: the written record given at casting time (full text for members
 * or a single unlock), "missing" (with why) when there was none to give, or "legacy" for an older
 * record whose question was written freely and so has no fixed question to match.
 */
export type JudgmentView =
  | { state: 'ready'; judgment: ProductJudgment; full: boolean }
  | { state: 'missing'; reason: MissingReason }
  | { state: 'legacy' };

type Extended =
  | { state: 'loading' }
  | { state: 'ready'; line?: DetailedLine; hexagram?: DetailedHexagram }
  | { state: 'error'; mismatch: boolean };

export function DetailSheet({ knowledge, selection, reading, record, t, lang, onSelect, onClose }: Props) {
  const { library, details } = knowledge;
  const { hexagramId, linePosition, stage } = selection;
  const h = library.getHexagram(hexagramId);
  const gate = useRef(createRequestGate()).current;
  const commentaryGate = useRef(createRequestGate()).current;
  const [extended, setExtended] = useState<Extended>({ state: 'loading' });
  const [retryKey, setRetryKey] = useState(0);
  const [commentary, setCommentary] = useState<{ state: 'idle' | 'loading' | 'error' } | { state: 'ready'; data: ReferenceCommentary }>({ state: 'idle' });
  const bodyRef = useRef<HTMLDivElement>(null);
  // The sheet opens low so the table stays visible; the handle raises it.
  const [expanded, setExpanded] = useState(false);
  // Free dragging: the sheet follows the finger to any height; low enough, it closes.
  const sheetRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const onGripDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('.icon-btn')) return;
    const el = sheetRef.current;
    if (!el) return;
    drag.current = { y: e.clientY, h: el.getBoundingClientRect().height, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onGripMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const max = window.innerHeight * 0.94;
    setHeight(Math.max(110, Math.min(max, d.h - dy)));
  };
  const onGripUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    suppressClick.current = true;
    if ((sheetRef.current?.getBoundingClientRect().height ?? 999) < 150) onClose();
  };
  const suppressClick = useRef(false);

  const castMoving = reading && stage === 'primary' && hexagramId === reading.primaryId ? reading.movingLine : null;
  const changedMarker = reading && stage === 'changed' && hexagramId === reading.stages.changed.id ? reading.movingLine : null;

  useEffect(() => {
    setExtended({ state: 'loading' });
    setCommentary({ state: 'idle' });
    commentaryGate.begin(); // invalidate any commentary still loading for the previous selection
    bodyRef.current?.scrollTo?.({ top: 0 });
    let alive = true;
    gate
      .run(async () => (linePosition ? { line: await details.getLine(hexagramId, linePosition) } : { hexagram: await details.getHexagram(hexagramId) }))
      .then((r) => {
        if (!alive || !r.current) return;
        if (r.error) setExtended({ state: 'error', mismatch: String((r.error as Error)?.message).includes('version mismatch') });
        else setExtended({ state: 'ready', ...r.value });
      });
    return () => {
      alive = false;
    };
  }, [hexagramId, linePosition, retryKey, details, gate, commentaryGate]);

  const loadCommentary = () => {
    setCommentary({ state: 'loading' });
    commentaryGate.run(() => details.getReferenceCommentary(hexagramId, { position: linePosition })).then((r) => {
      if (!r.current) return;
      setCommentary(r.error ? { state: 'error' } : { state: 'ready', data: r.value! });
    });
  };

  const stageLabel = stage === 'library' ? t.library : t[`stage_${stage}`];
  const line = linePosition ? library.getLineReading(hexagramId, linePosition) : null;
  const slotsTopDown = useMemo(() => [...lineSlots(h.bitsBottomUp)].sort((a, b) => b.position - a.position), [h]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        ref={sheetRef}
        className={`sheet ${expanded ? 'is-expanded' : ''} ${height !== null ? 'is-sized' : ''}`}
        style={height !== null ? { height } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={`${h.name} ${t.details}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>
        <button
          className="sheet-handle"
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            setHeight(null);
            setExpanded((x) => !x);
          }}
          aria-label={expanded ? t.collapse : t.expand}
        >
          <i />
        </button>
        <header className="sheet-head">
          <div>
            <p className="sheet-kicker">
              {stageLabel} · {h.upperTrigram}上 {h.lowerTrigram}下
            </p>
            <h2>
              <span className="hex-symbol" aria-hidden="true">{h.symbol}</span> {h.name}
            </h2>
            <p className="sheet-grade">
              {t.gradeLabel} <DisplayGradeText grade={h.grade} lang={lang} t={t} />
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        </div>

        <nav className="line-picker" aria-label={t.lines}>
          <button className={`line-row hex-row ${linePosition === null ? 'is-selected' : ''}`} onClick={() => onSelect({ ...selection, linePosition: null })}>
            <span className="row-label">{t.hexagramText}</span>
          </button>
          {slotsTopDown.map((s) => (
            <button
              key={s.position}
              className={`line-row ${s.position === linePosition ? 'is-selected' : ''} ${s.position === castMoving ? 'is-moving' : ''}`}
              onClick={() => onSelect({ ...selection, linePosition: s.position })}
              aria-label={`${h.lines[s.position - 1].label}${s.position === castMoving ? ' · ' + t.movingLineBadge : ''}`}
              data-line-position={s.position}
            >
              <span className={`mini-bar ${s.yang ? 'yang' : 'yin'}`} aria-hidden="true">
                <i />
                {!s.yang && <i />}
              </span>
              <span className="row-label">{h.lines[s.position - 1].label}</span>
              {s.position === castMoving && <span className="badge gold">{t.movingLineBadge}</span>}
              {s.position === changedMarker && <span className="badge dim">◦</span>}
            </button>
          ))}
        </nav>

        <div className="sheet-body" ref={bodyRef}>
          {lang === 'en' && <p className="note">{t.translationMissing}</p>}

          {line ? (
            <>
              {linePosition === castMoving && <p className="badge gold block">{t.movingLineBadge}</p>}
              {linePosition === changedMarker && <p className="badge dim block">{t.correspondingChange}</p>}
              <h3>
                {line.label} · {t.lineText}
              </h3>
              <p className="classical">{line.text}</p>
              <p className="vernacular">{line.vernacular}</p>
              <h4>{t.smallImage}</h4>
              <p className="classical">{line.image}</p>
              <p className="vernacular">{line.imageVernacular}</p>
            </>
          ) : (
            <>
              <h3>{t.hexagramText}</h3>
              <p className="classical">{h.reading.text}</p>
              <p className="vernacular">{h.reading.vernacular}</p>
              <h4>{t.bigImage}</h4>
              <p className="classical">{h.reading.image}</p>
              <p className="vernacular">{h.reading.imageVernacular}</p>
              {h.specialLines.map((sp) => (
                <div key={sp.id} className="special-line">
                  <h4>
                    {sp.label} · {t.specialLine}
                  </h4>
                  <p className="classical">{sp.text}</p>
                  <p className="vernacular">{sp.vernacular}</p>
                </div>
              ))}
              <details className="fold">
                <summary>{t.poemLabel}</summary>
                <p>{h.grade.poem}</p>
                <p className="muted">{h.grade.description}</p>
              </details>
            </>
          )}

          <ExtendedBlock extended={extended} t={t} onRetry={() => setRetryKey((k) => k + 1)} onOpenChanged={(id) => onSelect({ stage: 'library', hexagramId: id, linePosition: null })} />

          <div className="commentary">
            {commentary.state === 'idle' && (
              <button className="text-btn" onClick={loadCommentary}>
                {t.readCommentary}
              </button>
            )}
            {commentary.state === 'loading' && <p className="muted">…</p>}
            {commentary.state === 'error' && (
              <p className="muted">
                {t.commentaryUnavailable}{' '}
                <button className="text-btn" onClick={loadCommentary}>
                  {t.retry}
                </button>
              </p>
            )}
            {commentary.state === 'ready' && (
              <div className="commentary-body">
                <p className="note">{t.commentaryNote}</p>
                {commentary.data.groups.flatMap((g) => g.sections).map((s, i) => (
                  <div key={i}>
                    <h4>{s.title}</h4>
                    {s.paragraphs.map((p) => (
                      <p key={p.id}>{p.text}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <p>
              <a href={h.referenceUrl} target="_blank" rel="noopener noreferrer">
                {t.sourceLink}
              </a>
            </p>
          </div>

          {reading && stage !== 'library' && <ReadingBasis reading={reading} record={record} t={t} lang={lang} />}
        </div>
      </section>
    </div>
  );
}

function ExtendedBlock({ extended, t, onRetry, onOpenChanged }: { extended: Extended; t: Strings; onRetry: () => void; onOpenChanged: (id: number) => void }) {
  if (extended.state === 'loading') return <p className="muted">…</p>;
  if (extended.state === 'error') {
    return (
      <p className={extended.mismatch ? 'error' : 'muted'}>
        {extended.mismatch ? t.versionMismatch : t.detailsUnavailable}{' '}
        {!extended.mismatch && (
          <button className="text-btn" onClick={onRetry}>
            {t.retry}
          </button>
        )}
      </p>
    );
  }
  const l = extended.line;
  if (!l) return null;
  const s = l.structure;
  return (
    <>
      <h4>{t.structure}</h4>
      <p className="facts">
        {l.label} · {s.polarity === 'yang' ? t.yang : t.yin} · {s.correctPosition ? t.correctPos : t.incorrectPos}
        {s.central ? ` · ${t.central}` : ''} · {t.responds} {s.respondingPosition}
        <br />
        {t.changedBy}{' '}
        <button className="text-btn" onClick={() => onOpenChanged(l.changedHexagram.id)}>
          {l.changedHexagram.id} {l.changedHexagram.name}
        </button>
      </p>
      {l.editorialNotes.length > 0 && (
        <>
          <h4>{t.editorialNote}</h4>
          {l.editorialNotes.map((n, i) => (
            <p key={i} className="editorial" lang="zh">
              {n.text}
            </p>
          ))}
        </>
      )}
    </>
  );
}

/** Relation notes worth showing: what 旬空 does to the effect. The rest ("保留本项生克作用", "空亡资料待定…") are internal. */
const SHOWN_NOTES = new Set(['耗克作用暂减，仍核对体卦状态', '助益或可控条件暂难落实']);

/** 时令: the source lists only 旺 and 衰; other elements get a dash rather than a judgment. */
const strengthText = (state: string, label: string) => (state === 'strong' || state === 'weak' ? label : '—');

/** Casting numbers in words: upper / lower trigram numbers and the number that gives the moving line. */
function castNumbers(raw: Record<string, unknown>, lang: Lang): string {
  const n = (k: string) => (typeof raw[k] === 'number' ? (raw[k] as number) : null);
  const upper = n('upperNumber');
  const lower = n('lowerNumber');
  const moving = n('movingTotal');
  const parts: string[] = [];
  if (typeof raw.objectTrigram === 'string') parts.push(lang === 'en' ? `sign ${raw.objectTrigram}` : `物象${raw.objectTrigram}`);
  if (typeof raw.directionTrigram === 'string') parts.push(lang === 'en' ? `direction ${raw.directionTrigram}` : `方位${raw.directionTrigram}`);
  if (upper !== null) parts.push(lang === 'en' ? `upper ${upper}` : `上卦数${upper}`);
  if (lower !== null) parts.push(lang === 'en' ? `lower ${lower}` : `下卦数${lower}`);
  if (moving !== null) parts.push(lang === 'en' ? `moving line from ${moving}` : `动爻数${moving}`);
  return parts.join(' · ') || '—';
}

function ReadingBasis({ reading, record, t, lang }: { reading: Reading; record: CastRecord | null; t: Strings; lang: Lang }) {
  const el = (e: string) => (lang === 'en' ? `${e} ${ELEMENT_EN[e] ?? ''}` : e);
  const ganzhi = record?.context.dayGanzhi ?? null;
  const targets = ganzhi ? getVoidReleaseTargets(ganzhi) : null;
  const missing = reading.contextualAssessment.missing;
  return (
    <section className="basis">
      <h3>{t.basis}</h3>
      <p>
        <b>{t.bodyUse}</b>：{t.bodyTag}（{reading.body.trigram}
        {el(reading.body.element)}，{reading.body.side === 'upper' ? '上卦' : '下卦'}）；{t.useTag}（{reading.use.trigram}
        {el(reading.use.element)}，{reading.use.side === 'upper' ? '上卦' : '下卦'}）
      </p>
      <ul className="edges">
        {reading.edges.map((e) => (
          <li key={e.targetRole}>
            <b>{ROLE_LABEL[e.targetRole]?.[lang] ?? e.targetRole}</b> · {relationText(e, lang).label}
            {SHOWN_NOTES.has(e.qualitativeNote) && <span className="muted"> — {e.qualitativeNote}</span>}
          </li>
        ))}
      </ul>
      <p>
        {t.monthBranch}：{record?.context.monthBranch ?? t.pending} · {t.dayGanzhi}：{ganzhi ?? t.pending}
      </p>
      <table className="nodes">
        <thead>
          <tr>
            <th />
            <th>{t.strength}</th>
            <th>{t.voidLabel}</th>
          </tr>
        </thead>
        <tbody>
          {reading.nodes.map((n) => (
            <tr key={n.id}>
              <td>
                {ROLE_LABEL[n.role]?.[lang] ?? n.role} {n.trigram}
                {n.element}
              </td>
              <td>{strengthText(n.strength.state, n.strength.label)}</td>
              <td>{n.void.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">{t.strengthNote}</p>
      {targets && (
        <p className="muted">
          {t.voidTargets}：{targets.targets.map((x) => `${x.emptyBranch}空 · 填${x.fill} / 冲${x.clash}`).join('；')}
        </p>
      )}
      {missing.length > 0 && (
        <p className="note">
          {t.missingContext}
          {missing.map((m) => (m === 'calendar-context' ? t.missing_calendar : t.missing_void)).join('、')}
        </p>
      )}
      <h4>
        {t.domainPassage} · {domainTitle(reading.domain, lang)}
      </h4>
      {reading.domainPassage ? <p className="classical">{reading.domainPassage.quote}</p> : <p className="muted">—</p>}
      <details className="fold">
        <summary>{t.domainFull}</summary>
        <p className="classical small">{reading.domain.text}</p>
      </details>
      <p className="note">
        {t.fixedGrade} {t.noScore}
      </p>
      {record && (
        <details className="fold">
          <summary>{t.castAt}</summary>
          <dl className="meta">
            <dt>{t.castAt}</dt>
            <dd>{(record.localWallClock ?? record.createdAt).replace('T', ' ').slice(0, 16)}</dd>
            {record.calendar && (
              <>
                <dt>{t.lunarDate}</dt>
                <dd>{castTimeText(record.calendar, lang)}</dd>
              </>
            )}
            <dt>{t.methodLabel}</dt>
            <dd>{METHOD_NAME[record.method] ? (t[METHOD_NAME[record.method]] as string) : '—'}</dd>
            <dt>{t.rawNumbers}</dt>
            <dd>{castNumbers(record.rawInputs as Record<string, unknown>, lang)}</dd>
          </dl>
        </details>
      )}
    </section>
  );
}
