// 高频短语扫描（2026-11-20）：每卦列出见于超过 TH 篇的非术语五字短语（去掉各篇首句、引文、书名），供验收时找套话。
// 用法：node scripts/review/phrase-scan.cjs sources/editorial/<问项>/monthly [TH=18]。用户面试稿除判词外极少超过 18 篇。
const fs=require('fs');const dir=process.argv[2],N=5,TH=+process.argv[3]||18;
const TECH=/[乾坤震巽坎离艮兑金木水火土旺相休囚死体用互变卦爻生克比和寅卯辰巳午未申酉戌亥子丑月春夏秋冬]/u;
const out={};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const arts=JSON.parse(fs.readFileSync(dir+'/'+f,'utf8')).articles;const cnt=new Map();
for(const a of arts){const cut=s=>s.replace(/^[^。！？]*[。！？]/u,'');const t=[cut(a.short),cut(a.paragraphs[0]),...a.paragraphs.slice(1)].join('。').replace(/「[^」]*」|《[^》]*》/gu,'').replace(/[^\p{Script=Han}。，；：、！？]/gu,'');const seen=new Set();for(const seg of t.split(/[。，；：、！？]/u))for(let i=0;i+N<=seg.length;i++){const g=seg.slice(i,i+N);if(!TECH.test(g))seen.add(g)}for(const g of seen)cnt.set(g,(cnt.get(g)||0)+1)}
const top=[...cnt].filter(x=>x[1]>TH).sort((a,b)=>b[1]-a[1]);
// collapse overlapping
const kept=[];for(const [g,c] of top){if(!kept.some(([k,kc])=>kc>=c-2&&(k.includes(g.slice(1))||k.includes(g.slice(0,-1)))))kept.push([g,c])}
out[f]=kept.slice(0,6).map(x=>x.join(':')).join(' ');}
for(const [f,v] of Object.entries(out))if(v)console.log(f,v);
