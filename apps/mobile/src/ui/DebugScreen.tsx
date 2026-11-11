/** Manual cast for development and checking: pick a hexagram and line directly. */
import { useMemo, useState } from 'react';
import type { Knowledge } from '../knowledge/knowledge';
import { getXunVoid } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { domainTitle } from './text';

export interface ManualCast {
  primaryId: number;
  movingLine: number;
  domainId: string;
  monthBranch?: string;
  dayGanzhi?: string;
  withRitual: boolean;
}

const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];

export function DebugScreen({ knowledge, t, lang, onCast, onBack }: { knowledge: Knowledge; t: Strings; lang: Lang; onCast: (m: ManualCast) => void; onBack: () => void }) {
  const { library } = knowledge;
  const [primaryId, setPrimaryId] = useState(49);
  const [movingLine, setMovingLine] = useState(1);
  const [domainId, setDomainId] = useState('domain-02');
  const [monthBranch, setMonthBranch] = useState('');
  const [ganzhi, setGanzhi] = useState('');
  const [withRitual, setWithRitual] = useState(false);
  const ganzhiError = useMemo(() => {
    if (!ganzhi) return null;
    try {
      getXunVoid(ganzhi);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [ganzhi]);
  const preview = useMemo(() => library.createReading({ primaryId, movingLine }), [library, primaryId, movingLine]);

  return (
    <main className="screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h2>{t.manualTitle}</h2>
        <span />
      </header>
      <p className="note">{t.method_manual}</p>
      <form
        className="entry-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ganzhiError) return;
          onCast({ primaryId, movingLine, domainId, monthBranch: monthBranch || undefined, dayGanzhi: ganzhi || undefined, withRitual });
        }}
      >
        <label>
          <span>{t.primaryHex}</span>
          <select value={primaryId} onChange={(e) => setPrimaryId(Number(e.target.value))}>
            {library.listHexagrams().map((h) => (
              <option key={h.id} value={h.id}>
                {h.id} · {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.movingLine}</span>
          <select value={movingLine} onChange={(e) => setMovingLine(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((p) => (
              <option key={p} value={p}>
                {library.getHexagram(primaryId).lines[p - 1].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.domainLabel}</span>
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
            {library.listDomains().map((d) => (
              <option key={d.id} value={d.id}>
                {domainTitle(d, lang)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.optionalMonth}</span>
          <select value={monthBranch} onChange={(e) => setMonthBranch(e.target.value)}>
            <option value="">—</option>
            {BRANCHES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.optionalGanzhi}</span>
          <input value={ganzhi} maxLength={2} onChange={(e) => setGanzhi(e.target.value.trim())} />
        </label>
        {ganzhiError && <p className="error">{ganzhiError}</p>}
        <label className="toggle">
          <input type="checkbox" checked={withRitual} onChange={(e) => setWithRitual(e.target.checked)} /> {t.withRitual}
        </label>
        <p className="muted">
          {preview.stages.primary.name} → {preview.stages.mutual.name} → {preview.stages.changed.name}
        </p>
        <button type="submit" className="primary-btn">
          {t.castNow}
        </button>
      </form>
    </main>
  );
}
