/**
 * 详断, read plain first (2026-11-13). Each part of a written 断语 often opens with the terms it rests
 * on (「冬令坎水体和坎水用皆旺，比和。」) and then says what that means for the matter. For a reader
 * who does not know the terms, the plain words come first and the terms follow as the part's basis.
 *
 * Only the order changes, never the words: in each sentence the clauses it opens with that are
 * terms (trigram and element, season and state, 体互 / 用互 / 变用, a line's name or its quoted text)
 * move to the basis; the rest of the sentence stays as written, its punctuation kept. A sentence of
 * terms only moves whole. A part that would have nothing plain left is shown as it was written.
 */
const TRI = '乾兑离震巽坎艮坤';
const EL = '金木水火土';
const TERM = new RegExp(
  [
    `[${TRI}][${EL}]`, // 坎水, 震木
    `[${TRI}${EL}][冬春夏秋]?令?属?[旺相休囚死]`, // 坎旺, 金冬休, 震木属相
    `[旺相休囚死][${TRI}]`, // 旺坎, 休乾
    `[冬春夏秋]令|[冬春夏秋][${TRI}${EL}]`, // 冬令, 冬乾
    '体互|用互|变用|本用|原体|体用|比和|同气',
    `[${EL}](?:所)?[生克]|[生克]体|体[生克]`, // 木所生, 克体, 体克
    '^[初上][六九]|^[九六][二三四五]|^用[九六]', // 初六, 九五 (a line's name opening the clause)
    '“|「', // a line's quoted text
  ].join('|'),
);

const isTerm = (clause: string) => TERM.test(clause.trim());
/** A clause that only reads on from the one before it. */
const LEANS = /^[取以为而则故乃即且亦]/;

/** Splits text at the given marks (kept with the piece before them), never inside “…”. */
function pieces(text: string, marks: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of text) {
    cur += ch;
    // A quotation (“…” or 「…」, as the 断语 quote a line's words) is never cut.
    if (ch === '“' || ch === '「') quoted = true;
    else if (ch === '”' || ch === '」') quoted = false;
    else if (!quoted && marks.includes(ch)) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

const END = /[。！？]$/;
/** A sentence opened by the moving line itself: its name (初六, 九五…) or its quoted text. */
const LINE = /^\s*(?:[初上][六九]|[九六][二三四五]|用[九六]|“|「)/;
/** The part's own conclusion, as the 断语 words it: 「本轮偏难通过」「这轮仍偏向通过」. */
const VERDICT = /^\s*(?:本轮|这轮|本次|这次|此次)/;

/**
 * `verdictFirst` (结局): the clause that states this round's outcome, where the part has one, is read
 * first; the rest follows in its own order.
 */
export function plainFirst(text: string, { verdictFirst = false }: { verdictFirst?: boolean } = {}): { plain: string; basis: string } {
  const plain: string[] = [];
  const basis: string[] = [];
  for (const sentence of pieces(text.trim(), '。！？')) {
    const end = END.exec(sentence)?.[0] ?? '';
    const clauses = pieces(sentence.slice(0, sentence.length - end.length), '，；、');
    let n = 0;
    while (n < clauses.length && isTerm(clauses[n])) n += 1;
    // What follows the terms leans on them (「取…」「以…」「而…」). After the moving line's own words it
    // is the reading of that line, and goes with them into the basis; after other terms the sentence
    // stays whole, as written.
    if (n > 0 && n < clauses.length && LEANS.test(clauses[n].trim())) n = LINE.test(clauses[0]) ? clauses.length : 0;
    if (n === 0) plain.push(sentence);
    else if (n === clauses.length) basis.push(sentence);
    else {
      const lead = clauses.slice(0, n).join('').replace(/[，；、]$/, '');
      basis.push(`${lead}。`);
      plain.push(`${clauses.slice(n).join('')}${end}`);
    }
  }
  if (!plain.length || !basis.length) return { plain: text.trim(), basis: '' };
  return { plain: (verdictFirst ? withVerdictFirst(plain) : plain).join('').trim(), basis: basis.join('').trim() };
}

/** Moves the clause that states the outcome to the head; its sentence closes where it stood. */
function withVerdictFirst(sentences: string[]): string[] {
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const end = END.exec(s)?.[0] ?? '。';
    const clauses = pieces(s.slice(0, s.length - (END.test(s) ? 1 : 0)), '，；、');
    const k = clauses.findIndex((c) => VERDICT.test(c));
    if (k < 0) continue;
    if (i === 0 && k === 0) return sentences;
    const verdict = `${clauses[k].replace(/[，；、]$/, '')}。`;
    const rest = clauses.filter((_, j) => j !== k);
    const left = rest.length ? `${rest.join('').replace(/[，；、]$/, '')}${end}` : '';
    return [verdict, ...sentences.slice(0, i), ...(left ? [left] : []), ...sentences.slice(i + 1)];
  }
  return sentences;
}
