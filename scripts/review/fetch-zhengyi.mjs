// 从维基文库取《周易正义》各卦页的原文（王弼注、孔颖达疏），存到 sources/reference/zhouyi-zhengyi/，供引文逐字核对。只取一次。
import {writeFileSync, existsSync} from 'node:fs';
const UA = {'User-Agent':'WenguaCitationCheck/1.0 (classical citation verification)'};
const api = 'https://zh.wikisource.org/w/api.php';
let titles = [], cont = {};
const listFile = 'sources/reference/zhouyi-zhengyi/_titles.json';
if (existsSync(listFile)) titles = JSON.parse((await import('node:fs')).readFileSync(listFile, 'utf8'));
else do {
  const q = new URLSearchParams({action:'query', list:'prefixsearch', pssearch:'周易正義/', pslimit:'100', format:'json', ...cont});
  let j = null;
  for (let k = 0; k < 8 && !j; k++) { await new Promise(r => setTimeout(r, 4000 * (k + 1))); try { j = JSON.parse(await (await fetch(api + '?' + q, {headers:UA})).text()); } catch { console.log('list retry', k); } }
  if (!j) throw new Error('rate limited (list)');
  titles.push(...j.query.prefixsearch.map(x => x.title)); cont = j.continue ?? null;
} while (cont);
titles = [...new Set(titles)];
console.log('pages', titles.length);
writeFileSync(listFile, JSON.stringify(titles));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const todo = titles.filter(t => !existsSync('sources/reference/zhouyi-zhengyi/' + (t.split('/')[1] ?? t).replace(/[\/:*?"<>|]/g, '_') + '.wiki'));
for (let i = 0; i < todo.length; i += 10) {
  const batch = todo.slice(i, i + 10);
  let j = null;
  for (let k = 0; k < 6 && !j; k++) {
    await sleep(3000 * (k + 1));
    const q = new URLSearchParams({action:'query', prop:'revisions', rvprop:'content|ids', rvslots:'main', titles:batch.join('|'), format:'json', formatversion:'2', maxlag:'5'});
    const r = await fetch(api + '?' + q, {headers:UA}); const t = await r.text();
    try { j = JSON.parse(t); } catch { console.log('retry', k); }
  }
  if (!j) throw new Error('rate limited');
  for (const p of j.query.pages) {
    const rev = p.revisions?.[0]; if (!rev) { console.log('missing', p.title); continue; }
    const file = 'sources/reference/zhouyi-zhengyi/' + (p.title.split('/')[1] ?? p.title).replace(/[\/:*?"<>|]/g, '_') + '.wiki';
    writeFileSync(file, `<!-- ${p.title} | revid ${rev.revid} | https://zh.wikisource.org/wiki/${encodeURIComponent(p.title)} -->
` + rev.slots.main.content);
  }
  console.log('saved', i + batch.length, '/', todo.length);
}
console.log('done');
