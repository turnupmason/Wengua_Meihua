// 取《周易正义》各页的简体转换文本（维基文库 zh-hans 变体），存为纯文本，供注疏引文逐字核对。
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
const UA = {'User-Agent':'WenguaCitationCheck/1.0 (classical citation verification)'};
const api = 'https://zh.wikisource.org/w/api.php';
const titles = JSON.parse(readFileSync('sources/reference/zhouyi-zhengyi/_titles.json', 'utf8'));
mkdirSync('sources/reference/zhouyi-zhengyi-hans', {recursive:true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const t of titles) {
  const name = (t.split('/')[1] ?? t).replace(/[\/:*?"<>|]/g, '_');
  const file = `sources/reference/zhouyi-zhengyi-hans/${name}.txt`;
  if (existsSync(file)) continue;
  let j = null;
  for (let k = 0; k < 8 && !j; k++) {
    await sleep(2500 * (k + 1));
    const q = new URLSearchParams({action:'parse', page:t, prop:'text|revid', variant:'zh-hans', format:'json', formatversion:'2'});
    try { j = JSON.parse(await (await fetch(api + '?' + q, {headers:UA})).text()); if (!j.parse) { console.log('no parse', t, JSON.stringify(j).slice(0, 100)); j = null; break; } } catch { j = null; }
  }
  if (!j) { console.log('skip', t); continue; }
  const text = j.parse.text.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '').replace(/&#\d+;|&[a-z]+;/g, ' ');
  writeFileSync(file, `# ${t} | revid ${j.parse.revid} | variant zh-hans | https://zh.wikisource.org/wiki/${encodeURIComponent(t)}\n` + text);
  console.log('ok', name);
}
console.log('done');
