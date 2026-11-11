/**
 * A section of the 《梅花易数》 (a 十八类占 category or a rule such as 《体用互变之诀》), shown whole,
 * from the reading's 古籍依据 link. The passage the reading quoted is highlighted.
 */
import type { Strings } from '../domain/i18n';

export interface SectionTarget {
  title: string;
  text: string;
  /** The sentence the reading used, highlighted where it appears. */
  quote?: string;
}

export function SectionPage({ target, t, onBack }: { target: SectionTarget; t: Strings; onBack: () => void }) {
  const body = target.text.replace(/^【[^】]*】\s*/, '').trim();
  const paras = body.split(/\r?\n+/).filter(Boolean);
  const q = target.quote?.trim();
  return (
    <article className="hex-page section-page">
      <header className="hex-page-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <p className="hex-page-kicker">{t.library}</p>
        <span />
      </header>
      <h2 className="section-title">《梅花易数·{target.title}》</h2>
      {paras.map((p, i) => {
        const at = q ? p.indexOf(q) : -1;
        return (
          <p key={i} className="classical small section-para">
            {at < 0 ? (
              p
            ) : (
              <>
                {p.slice(0, at)}
                <mark>{q}</mark>
                {p.slice(at + (q?.length ?? 0))}
              </>
            )}
          </p>
        );
      })}
    </article>
  );
}
