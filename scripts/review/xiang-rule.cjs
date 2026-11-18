// 候选：无生无克之盘「不拘体用」，以卦辞象理定档（487 行西林寺额）。只诊断。
const G = require('./guaci.json');
const ALL = new Set([23, 12, 54, 6]); // 剥「不利有攸往」、否「不利」、归妹「征凶，无攸利」、讼「终凶」
const LOVE = new Set([44]);          // 姤「女壮，勿用取女」：只对婚恋问项
function xiang(t, rel, hexId, changedId, love, mode) {
  const calmOnly = !Object.values(rel).some(v => v === 'use_generates_body' || v === 'use_controls_body');
  if (!calmOnly || !t.why.startsWith('R1b')) return t.t;
  const bad = id => ALL.has(id) || (love && LOVE.has(id));
  if (!bad(hexId) && !(mode !== 'main' && bad(changedId))) return t.t;
  if (mode === 'step') return t.t === 'F' ? 'C' : 'D';
  return 'D';
}
module.exports = {xiang};
