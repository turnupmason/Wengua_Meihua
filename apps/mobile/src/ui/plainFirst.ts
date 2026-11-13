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
    '“', // a line's quoted text
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
    if (ch === '“') quoted = true;
    else if (ch === '”') quoted = false;
    else if (!quoted && marks.includes(ch)) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

const END = /[。！？]$/;

export function plainFirst(text: string): { plain: string; basis: string } {
  const plain: string[] = [];
  const basis: string[] = [];
  for (const sentence of pieces(text.trim(), '。！？')) {
    const end = END.exec(sentence)?.[0] ?? '';
    const clauses = pieces(sentence.slice(0, sentence.length - end.length), '，；、');
    let n = 0;
    while (n < clauses.length && isTerm(clauses[n])) n += 1;
    // What follows the terms leans on them (「取…」「以…」「而…」): the sentence stays whole, as written.
    if (n > 0 && n < clauses.length && LEANS.test(clauses[n].trim())) n = 0;
    if (n === 0) plain.push(sentence);
    else if (n === clauses.length) basis.push(sentence);
    else {
      const lead = clauses.slice(0, n).join('').replace(/[，；、]$/, '');
      basis.push(`${lead}。`);
      plain.push(`${clauses.slice(n).join('')}${end}`);
    }
  }
  if (!plain.length || !basis.length) return { plain: text.trim(), basis: '' };
  return { plain: plain.join('').trim(), basis: basis.join('').trim() };
}
