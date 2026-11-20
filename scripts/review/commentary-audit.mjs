// 注疏与一切「」引文核对（只读）：考试、面试作者源的正文、判断依据、应期、计算说明、复核记录。
// 经传与《梅花易数》对 sources/original（含订正），王注孔疏对 sources/reference/zhouyi-zhengyi-hans（维基文库《周易正义》简体），
// 程传、本义另列待核。用法：node scripts/review/commentary-audit.mjs <问项目录...> [--out file]
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs';
const args = process.argv.slice(2); const oi = args.indexOf('--out'); const out = oi >= 0 ? args[oi + 1] : null;
const items = args.filter((a, i) => a !== '--out' && i !== oi + 1);
const T2S = {陽:'阳',陰:'阴',於:'于',無:'无',龍:'龙',戰:'战',
  // 异体与底本录入字（逐条对过原文）：巳已、絜潔洁、鄣障、㧑撝、陗峭、馀余、耽眈、闚窥、壊壞坏、徳德、夫夬（本义履九五）
  巳:'已',絜:'洁',潔:'洁',潔:'洁',鄣:'障',㧑:'撝',峭:'陗',馀:'余',耽:'眈',窺:'窥',闚:'窥',壊:'坏',壞:'坏',徳:'德',己:'已',扞:'捍',脩:'修',給:'给',覲:'觐',為:'为',進:'进',仕:'仕',養:'养',朝:'朝',
  // 2026-11-19 逐月长稿核查确认的参考本录入异体（正文用通行字；11-20 补程传「戸」户）：㢲巽、専专、頥颐、宼寇、甯宁、尢尤、暌睽；参考本把「乾」转成「干」，两侧同归「干」。
  㢲:'巽',専:'专',頥:'颐',宼:'寇',甯:'宁',尢:'尤',暌:'睽',乾:'干',薰:'熏',薫:'熏',㫁:'断',𫉬:'获',戸:'户'};
const han = s => [...String(s)].map(c => T2S[c] ?? c).join('').replace(/[^\p{Script=Han}]/gu, '').replace(/履干/gu, '履乾').replace(/夫决其履/gu, '夬决其履');
const base = ['yijing64.txt','meihua-volumes-1-3.txt'].map(f => han(readFileSync('sources/original/' + f, 'utf8'))).join('|')
  + '|' + JSON.parse(readFileSync('data/editorial-patches.json', 'utf8')).map(p => han(p.after ?? '')).join('|');
const corpus = (...dirs) => dirs.map(d => 'sources/reference/' + d + '/').filter(existsSync).flatMap(d => readdirSync(d).filter(f => /\.(txt|wiki)$/.test(f)).map(f => han(readFileSync(d + f, 'utf8')))).join('|');
const zy = corpus('zhouyi-zhengyi-hans', 'zhouyi-zhengyi');
const by = corpus('zhouyi-benyi'), cz = corpus('yichuan-yizhuan');
const CORP = {王孔:zy, 系辞文言彖:zy, 本义:by, 程传:cz, 集解:'', 未标出处:zy + '|' + by + '|' + cz};
const WHO = [['程传', /程传|程颐|伊川|易传》/u], ['本义', /本义|朱熹|朱子/u], ['集解', /集解/u], ['系辞文言彖', /系辞|文言|彖|说卦|序卦|杂卦/u], ['王孔', /王注|王弼|孔疏|孔颖达|正义|注疏|疏》|疏「|注「/u]];
const res = new Map();
function scan(item, where, s) {
  if (typeof s !== 'string') return;
  for (const m of s.matchAll(/「([^「」]{2,300})」/gu)) {
    const ctx = s.slice(Math.max(0, m.index - 18), m.index);
    const frags = m[1].split(/……|…/u).map(han).filter(x => x.length >= 2);
    if (!frags.length) continue;
    const who = (WHO.find(([, re]) => re.test(ctx.split(/[。；]/u).pop() ?? ''))?.[0]) ?? '未标出处';
    const ok = frags.every(x => base.includes(x) || CORP[who].includes(x) || (who !== '未标出处' && (zy + by + cz).includes(x)));
    if (ok) continue;
    // 未标出处的：只查读者看得到的栏，且像古文的（口语、规则名不算引文）
    if (who === '未标出处' && (/lineReading|reason|evidence/.test(where) || !/[也之其乎矣焉者曰兮哉]/u.test(m[1]))) continue;
    const k = who + '｜' + m[1];
    if (!res.has(k)) res.set(k, {who, quote:m[1], miss:frags.filter(x => !base.includes(x) && !(zy + by + cz).includes(x)), ctx, n:0, at:[]});
    const r = res.get(k); r.n++; if (r.at.length < 4) r.at.push(item + ':' + where);
  }
}
// --monthly：核逐月长稿 sources/editorial/<问项>/monthly/hex-NNN.json（标题、简断、正文、专业说明、取期），2026-11-19 加。
const monthly = items.includes('--monthly');
for (const item of items.filter(a => a !== '--monthly')) {
  const dir = `sources/editorial/${item}/`;
  if (monthly) {
    const md = dir + 'monthly/';
    for (const f of readdirSync(md).filter(f => /^hex-\d{3}\.json$/.test(f))) {
      const id = f.slice(4, 7);
      for (const a of JSON.parse(readFileSync(md + f, 'utf8')).articles) {
        const k = `${id}/${a.movingLine}/${a.monthBranch}`;
        scan(item, k + '/title', a.title); scan(item, k + '/short', a.short);
        a.paragraphs.forEach((p, i) => scan(item, `${k}/p${i + 1}`, p));
        scan(item, k + '/judgment', a.judgment); scan(item, k + '/timing', JSON.stringify(a.timing));
      }
    }
    continue;
  }
  for (const f of readdirSync(dir).filter(f => /^hex-\d{3}\.json$/.test(f))) {
    const id = f.slice(4, 7);
    const src = JSON.parse(readFileSync(dir + f, 'utf8'));
    src.forEach((d, i) => { for (let c = 3; c <= 9; c++) scan(item, `${id}#${i}/c${c}`, d[c]); scan(item, `${id}#${i}/t`, JSON.stringify(d[10])); });
    for (const sub of ['polish-v5', 'review-v2']) {
      if (!existsSync(dir + sub + '/' + f)) continue;
      const raw = JSON.parse(readFileSync(dir + sub + '/' + f, 'utf8')); const recs = Array.isArray(raw) ? raw : raw.records;
      recs.forEach((r, i) => {
        if (sub === 'polish-v5') (r.calculationNotes ?? []).forEach((n, k) => scan(item, `${id}#${i}/note${k}`, n));
        else for (const k of ['lineReading','reason','evidenceFor','evidenceAgainst']) scan(item, `${id}#${i}/${k}`, JSON.stringify(r[k] ?? ''));
      });
    }
  }
}
const list = [...res.values()].sort((a, b) => a.who.localeCompare(b.who) || b.n - a.n);
if (out) writeFileSync(out, JSON.stringify(list, null, 1));
const cnt = {}; list.forEach(x => cnt[x.who] = (cnt[x.who] ?? 0) + 1);
console.log('corpus chars', zy.length, by.length, cz.length, 'unmatched unique', list.length, JSON.stringify(cnt));
