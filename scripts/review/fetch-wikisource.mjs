// 取维基文库页面（原文 wikitext 与 zh-hans 转换文本），供古籍引文逐字核对。
// 用法：node scripts/review/fetch-wikisource.mjs <输出子目录> <页面标题...>
import {writeFileSync, existsSync, mkdirSync} from 'node:fs';
const [sub, ...titles] = process.argv.slice(2);
const UA = {'User-Agent':'WenguaCitationCheck/1.0 (classical citation verification)'};
const api = 'https://zh.wikisource.org/w/api.php';
const dir = 'sources/reference/' + sub + '/'; mkdirSync(dir, {recursive:true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(params) {
  for (let k = 0; k < 8; k++) { await sleep(2500 * (k + 1)); try { const j = JSON.parse(await (await fetch(api + '?' + new URLSearchParams(params), {headers:UA})).text()); return j; } catch {} }
  throw new Error('rate limited');
}
for (const t of titles) {
  const name = t.replace(/[\/:*?"<>|() ]/g, '_');
  if (!existsSync(dir + name + '.txt')) {
    const j = await get({action:'parse', page:t, prop:'text|revid', variant:'zh-hans', format:'json', formatversion:'2'});
    if (!j.parse) { console.log('missing', t); continue; }
    writeFileSync(dir + name + '.txt', `# ${t} | revid ${j.parse.revid} | zh-hans\n` + j.parse.text.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '').replace(/&#\d+;|&[a-z]+;/g, ' '));
  }
  if (!existsSync(dir + name + '.wiki')) {
    const j = await get({action:'query', prop:'revisions', rvprop:'content|ids', rvslots:'main', titles:t, format:'json', formatversion:'2'});
    const rev = j.query.pages[0].revisions?.[0]; if (rev) writeFileSync(dir + name + '.wiki', `<!-- ${t} | revid ${rev.revid} -->\n` + rev.slots.main.content);
  }
  console.log('ok', t);
}
