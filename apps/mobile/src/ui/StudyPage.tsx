/**
 * 研习与校订 (2026-11-14, second pass after the review): why a reading here deserves a careful read —
 * shown, not claimed; about seven parts our own study and three parts plain 易学 for the curious.
 *
 *  第一章 · 古籍为本   the method (《梅花易数》 体用) and the sections drawn on; the classic, its plain
 *                      rendering and our own 断语 marked apart on every 卦笺.
 *  第二章 · 推演有据   a cast worked through — the visitor's own (from its 卦笺), or else the fixed case:
 *                      丙午年十月初五午时, 水风井 九五 in 亥月, the same chart chapter three then varies.
 *  第三章 · 断语精校   one 本卦, three charts, three written 断语 — and what changed between them
 *                      (the moving line turns 体 and 用 about; another month changes 旺衰).
 *  易学小识            本互变, 体用, 旺相休囚死, 动爻 in a line each.
 * Ends plainly: a careful method is not a guarantee of what will happen.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Knowledge, Reading } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import { createCalendarProvider, type CalendarResult } from '../domain/calendar';
import { questionById } from '../domain/questionCatalog';
import { judgmentFor, type ProductJudgment } from '../domain/judgment';
import { GuaFigure, bodyUseMarks, tiyongLine } from './GuaFigure';

/**
 * The worked case of 第二章 when the page is not opened from a 卦笺: 2026-11-13 12:00 in 北京时间 is
 * 丙午年十月初五午时; by 年月日时起例 午7 + 十月10 + 初五5 = 22 → 坎 (上), + 午时7 = 29 → 巽 (下), 29 ÷ 6 余 5
 * → 第五爻: 水风井 九五, in 亥月 — the first of the three charts in 第三章.
 */
const CASE_MOMENT = { instant: '2026-11-13T04:00:00Z', timeZone: 'Asia/Shanghai' } as const;

/** The one case compared: 求职录用, 水风井 (48). */
const CASE = { entry: 'career.interview', primaryId: 48 } as const;
const CASES = [
  { line: 5, month: '亥' },
  { line: 2, month: '亥' },
  { line: 5, month: '巳' },
] as const;
const BOOKS = ['年月日时起例', '卦以八除', '爻以六除', '体用总诀', '体用互变之诀', '体用衰旺之诀'];

export interface StudyExample {
  /** The visitor's own cast: its reading, and its calendar when it was cast by the hour. */
  reading: Reading;
  calendar: CalendarResult | null;
  monthBranch: string | null;
}

export function StudyPage({ knowledge, t, onClose, example = null }: { knowledge: Knowledge; t: Strings; onClose: () => void; example?: StudyExample | null }) {
  const lib = knowledge.library;
  // 第二章: the visitor's own cast, or the fixed case (CASE_MOMENT).
  const work = useMemo(() => {
    if (example) {
      const c = example.calendar;
      const parts = c ? { yearBranchNumber: c.yearBranchNumber, lunarMonth: c.castingMonthNumber, lunarDay: c.lunar.day, hourBranchNumber: c.hourBranchNumber } : null;
      const byHour = parts ? lib.castByTimeParts(parts) : null;
      // Only when the hour gives this very chart is the counting shown (other methods count otherwise).
      const counted = byHour && byHour.primaryId === example.reading.primaryId && byHour.movingLine === example.reading.movingLine ? byHour : null;
      return { own: true, c, parts: counted ? parts : null, cast: counted, reading: example.reading, month: example.monthBranch };
    }
    // Not this very hour (it changes every 时辰 and looks like the visitor's own last cast): one fixed
    // case, checked, that chapter three goes on to vary (the user, 2026-11-15).
    const c = createCalendarProvider().resolve({ instant: CASE_MOMENT.instant, timeZone: CASE_MOMENT.timeZone });
    const parts = { yearBranchNumber: c.yearBranchNumber, lunarMonth: c.castingMonthNumber, lunarDay: c.lunar.day, hourBranchNumber: c.hourBranchNumber };
    const cast = lib.castByTimeParts(parts);
    return { own: false, c, parts, cast, reading: lib.createReading({ primaryId: cast.primaryId, movingLine: cast.movingLine }), month: c.monthBranch };
  }, [lib, example]);
  const upper = work.parts ? work.parts.yearBranchNumber + work.parts.lunarMonth + work.parts.lunarDay : 0;
  const total = work.parts ? upper + work.parts.hourBranchNumber : 0;

  // 第三章: the same 本卦, three charts, three written 断语.
  const [cases, setCases] = useState<(ProductJudgment | null)[]>([]);
  useEffect(() => {
    let alive = true;
    const q = questionById(CASE.entry);
    if (!q) return;
    void Promise.all(
      CASES.map((k) =>
        judgmentFor(knowledge.product, q, { questionId: CASE.entry, primaryId: CASE.primaryId, movingLine: k.line, method: 'classical-time', monthBranch: k.month, dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' })
          .then((j) => (j.state === 'ready' ? (j as ProductJudgment) : null))
          .catch(() => null),
      ),
    ).then((r) => alive && setCases(r));
    return () => {
      alive = false;
    };
  }, [knowledge.product]);
  const caseHex = lib.getHexagram(CASE.primaryId);
  const caseReadings = useMemo(() => CASES.map((k) => lib.createReading({ primaryId: CASE.primaryId, movingLine: k.line })), [lib]);
  const lineLabel = (n: number) => caseHex.lines[n - 1].label;
  const r = work.reading;
  const s = r.stages;
  const stages = [
    ['primary', t.jianPrimary],
    ['mutual', t.jianMutual],
    ['changed', t.jianChanged],
  ] as const;
  return (
    <div className="jian-page study-page" role="dialog" aria-modal="true" aria-label={t.studyTitle} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="jian-bar study-bar">
        <button type="button" className="jian-back" onClick={onClose} aria-label={t.back}>
          ←
        </button>
        <span className="study-bar-title">{t.studyTitle}</span>
        <span />
      </header>
      <article className="jian study">
        <section className="study-hero">
          <h1>{t.studyHeading}</h1>
          <p className="study-brand">{t.studyBrand}</p>
          <p className="study-lead">{t.studyLead}</p>
        </section>

        {/* 第一章 · 古籍为本 */}
        <section className="study-chapter">
          <p className="study-no">{t.studyCh1}</p>
          <h2>{t.studyCh1Title}</h2>
          <p className="study-text">{t.studyBooksText}</p>
          <div className="study-books">
            <b>《梅花易数》</b>
            <ul>
              {BOOKS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <dl className="study-layers">
            <div>
              <dt>{t.jianClassic}</dt>
              <dd>{t.studyLayerClassic}</dd>
            </div>
            <div>
              <dt>{t.jianVernacular}</dt>
              <dd>{t.studyLayerPlain}</dd>
            </div>
            <div>
              <dt>{t.studyLayerOursTitle}</dt>
              <dd>{t.studyLayerOurs}</dd>
            </div>
          </dl>
        </section>

        {/* 第二章 · 推演有据 */}
        <section className="study-chapter">
          <p className="study-no">{t.studyCh2}</p>
          <h2>{work.own ? t.studyCh2Own : t.studyCh2Title}</h2>
          {work.parts && work.cast ? (
            <ol className="study-steps">
              <li>
                <b>{t.studyStepTime}</b>
                <span>
                  {work.c?.lunar.label} {work.c?.hourBranch}时 → {t.studyNumbers(work.parts.yearBranchNumber, work.parts.lunarMonth, work.parts.lunarDay, work.parts.hourBranchNumber)}
                </span>
              </li>
              <li>
                <b>{t.studyStepTrigrams}</b>
                <span>{t.studyTrigramsLine(upper, work.cast.upperNumber, s.primary.detail.upperTrigram, total, work.cast.lowerNumber, s.primary.detail.lowerTrigram, work.cast.movingLine)}</span>
              </li>
            </ol>
          ) : (
            <p className="study-text">{t.studyOtherMethod}</p>
          )}
          <div className="study-guas">
            {stages.map(([k, label]) => (
              <figure key={k}>
                <GuaFigure bits={s[k].bitsBottomUp} moving={k === 'primary' ? r.movingLine : null} {...(k === 'primary' ? { ...bodyUseMarks(t, r), movingLabel: t.jianMovingLabel } : {})} />
                <figcaption>
                  <b>{s[k].name}</b>
                  <small>{label}</small>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="study-tiyong">{tiyongLine(t, r, work.month)}</p>
          <p className="study-text study-small">{t.studyTiyongPlain}</p>
        </section>

        {/* 第三章 · 断语精校 */}
        <section className="study-chapter">
          <p className="study-no">{t.studyCh3}</p>
          <h2>{t.studyCh3Title}</h2>
          <p className="study-text">{t.studyCh3Lead}</p>
          <ol className="study-cases">
            {CASES.map((k, i) => (
              <li key={i} className="study-case">
                <GuaFigure bits={caseReadings[i].stages.primary.bitsBottomUp} moving={k.line} {...bodyUseMarks(t, caseReadings[i])} compact />
                <div className="study-case-body">
                <p className="study-case-label">
                  {caseHex.name} · {lineLabel(k.line)}动 · {k.month}月
                </p>
                <p className="study-case-word">{cases[i]?.title ?? '…'}</p>
                <p className="study-case-why">
                  {i === 1 ? t.studyWhyLine(lineLabel(CASES[0].line), lineLabel(k.line)) : i === 2 ? t.studyWhyMonth(CASES[0].month, k.month) : t.studyWhyBase}
                  <span>{tiyongLine(t, caseReadings[i], k.month)}</span>
                </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="study-motto">{t.studyMotto}</p>
          <p className="study-text study-small">{t.studyMottoText}</p>
        </section>

        {/* 易学小识 */}
        <section className="study-chapter">
          <p className="study-no">{t.studyCh4}</p>
          <h2>{t.studyCh4Title}</h2>
          <dl className="study-glossary">
            {t.studyGlossary.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="jian-foot study-foot">
          <p className="study-honest">{t.studyHonest}</p>
          <span className="jian-stamp" aria-hidden="true">问卦</span>
        </footer>
      </article>
    </div>
  );
}
