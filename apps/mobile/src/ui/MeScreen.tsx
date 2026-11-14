/**
 * 我的 (user centre, 2026-11-14, after the user's design): who is signed in, the membership state
 * (内测 for now: everything is open, no plans are sold — see OPEN_BETA), what has been asked (counts,
 * 应验率 from 应期回访, 卦册), the latest three casts, and the ways on: 问事录, 收藏, 卦册, 设置.
 */
import type { Strings } from '../domain/i18n';
import type { CastRecord } from '../domain/cast';
import { walkInUrl, WALK_IN_FILES } from './walkInArt';

export interface MeData {
  name: string;
  /** Short account id shown under the name (a guest has none). */
  id: string;
  guest: boolean;
  records: CastRecord[];
  saved: number;
  met: number;
  /** 应期回访 answers: 应了 / 没应 / 说不准. */
  tally: { happened: number; not: number; unsure: number };
  /** The 本卦 symbol of a record (䷃). */
  symbolOf: (r: CastRecord) => string;
  questionOf: (r: CastRecord) => string;
  onOpenRecord: (r: CastRecord) => void;
  onRecords: () => void;
  onSaved: () => void;
  onLibrary: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const day = (r: CastRecord, lang: 'zh' | 'en') => {
  const d = new Date(r.createdAt);
  return lang === 'en' ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getMonth() + 1}月${d.getDate()}日`;
};

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  records: 'M5 5h14v4H5zM5 11h14v4H5zM5 17h9',
  hits: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M14 10l6-6M17 4h3v3',
  saved: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  book: 'M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h9.5',
  settings: 'M5 7h14M5 12h14M5 17h14',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
};

export function MeScreen({ t, lang, data, onClose, onSettings }: { t: Strings; lang: 'zh' | 'en'; data: MeData; onClose: () => void; onSettings: () => void }) {
  const { records, tally } = data;
  // How many 应期 the visitor has come back to answer. No 应验率: a rate from a handful of answers
  // reads like a verified accuracy, which it is not (2026-11-14 review).
  const answered = tally.happened + tally.not + tally.unsure;
  const recent = records.slice(0, 3);
  const name = data.name || t.meGuest;
  return (
    <div className="me-page" role="dialog" aria-modal="true" aria-label={t.meTitle}>
      <header className="me-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(10, 8, 12, 0.15), rgba(10, 8, 10, 0.2) 55%, #0f0c0b), url(${walkInUrl(WALK_IN_FILES.courtyard)})` }}>
        <div className="me-bar">
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.back}>
            ←
          </button>
          <h2>{t.meTitle}</h2>
          <button type="button" className="icon-btn me-gear" onClick={onSettings} aria-label={t.settings} title={t.settings}>
            <Icon d={ICONS.gear} />
          </button>
        </div>
        <div className="me-profile">
          <span className="me-avatar" aria-hidden="true">{[...name][0]}</span>
          <div>
            <p className="me-name">{name}</p>
            {!data.guest && data.id && <p className="me-id">ID {data.id}</p>}
            <p className="me-motto">{t.meMotto}</p>
          </div>
        </div>
      </header>

      <main className="me-body">
        {/* 内测: the card says everything is open; plans and prices come at the store release. */}
        <section className="me-member">
          <div>
            <p className="me-member-title">
              <b>{t.meBetaTitle}</b>
              <em>{t.meBetaOn}</em>
            </p>
            <p className="me-member-text">{t.meBetaText}</p>
          </div>
        </section>

        <section className="me-card">
          <h3>{t.meMine}</h3>
          <div className="me-stats">
            <p>
              <b>{records.length}</b>
              <span>{t.meCasts}</span>
            </p>
            <p>
              <b>{data.saved}</b>
              <span>{t.meSaved}</span>
            </p>
            <p>
              <b>
                {data.met}
                <small>/64</small>
              </b>
              <span>{t.meMet}</span>
            </p>
            <p>
              <b>{answered}</b>
              <span>{t.meAnswered}</span>
            </p>
          </div>
        </section>

        <section className="me-card">
          <div className="me-card-head">
            <h3>{t.meRecent}</h3>
            {records.length > 0 && (
              <button type="button" onClick={data.onRecords}>
                {t.meAll} ›
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="me-empty">{t.meNoCasts}</p>
          ) : (
            <ul className="me-recent">
              {recent.map((r) => (
                <li key={r.castId}>
                  <button type="button" onClick={() => data.onOpenRecord(r)}>
                    <span className="me-hex" aria-hidden="true">{data.symbolOf(r)}</span>
                    <span className="me-recent-text">
                      <b>{data.questionOf(r)}</b>
                      <small>
                        {t.meMethod} · {r.stages.primary.name} → {r.stages.changed.name}
                      </small>
                    </span>
                    <time>{day(r, lang)}</time>
                    <i aria-hidden="true">›</i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="me-card me-menu">
          <button type="button" onClick={data.onRecords}>
            <Icon d={ICONS.records} />
            <span>{t.meRecords}</span>
            <small>{t.meCount(records.length)}</small>
            <i aria-hidden="true">›</i>
          </button>
          <button type="button" onClick={data.onRecords}>
            <Icon d={ICONS.hits} />
            <span>{t.meHits}</span>
            <small>{answered ? t.meHitsLine(answered) : t.meHitsNone}</small>
            <i aria-hidden="true">›</i>
          </button>
          <button type="button" onClick={data.onSaved}>
            <Icon d={ICONS.saved} />
            <span>{t.meSavedRow}</span>
            <small>{t.meCount(data.saved)}</small>
            <i aria-hidden="true">›</i>
          </button>
          <button type="button" onClick={data.onLibrary}>
            <Icon d={ICONS.book} />
            <span>{t.meBook}</span>
            <small>{t.meMetLine(data.met)}</small>
            <i aria-hidden="true">›</i>
          </button>
          <button type="button" onClick={onSettings}>
            <Icon d={ICONS.settings} />
            <span>{t.settings}</span>
            <i aria-hidden="true">›</i>
          </button>
        </section>

        <button type="button" className="text-btn me-sign" onClick={data.guest ? data.onSignIn : data.onSignOut}>
          {data.guest ? t.meSignIn : t.signOut}
        </button>
      </main>
    </div>
  );
}
