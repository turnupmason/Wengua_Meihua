// 梅花各诀篇名核对（2026-11-20，换人通读查出「卦用最紧」误标《占卦诀》、494 行误标《体用》）：
// 按 sources/original/meihua-volumes-1-3.txt 各节【标题】，核《篇名》「引文」里篇名与引文所在节是否一致。
// 用法：node scripts/review/meihua-attr-audit.cjs <问项> [--hex 1,2] [--col9] [--list] [--fix]
// --fix：只改篇名（引文不动）。引文所在节唯一时改成那一节；同见于【体用总诀】与他节时取体用总诀（总诀为本）。逐月稿与五气源第 9 栏同改，保持专业说明一致。
const fs=require('fs');const args=process.argv.slice(2),item=args[0],list=args.includes('--list'),col9=args.includes('--col9');
const hi=args.indexOf('--hex'),only=hi>=0?new Set(args[hi+1].split(',').map(Number)):null;
const lines=fs.readFileSync('sources/original/meihua-volumes-1-3.txt','utf8').split('\n');
let head='';const secOf=[];lines.forEach((l,i)=>{const m=l.match(/^【(.+?)】/);if(m)head=m[1];secOf[i]=head;});
const norm=s=>s.replace(/[，。、；：「」“”！？…\s]/g,'');const nl=lines.map(norm);
const names=new Set(secOf.filter(Boolean));
const fix=args.includes('--fix');const out=[];const pairs={};let fixed=0;
const pick=secs=>secs.length===1?secs[0]:secs.includes('体用总诀')?'体用总诀':null;
const repl=t=>t.replace(/《([^》]+)》([^「《]{0,14})「([^」]+)」/g,(all,name,mid,q)=>{if(!names.has(name))return all;const nq=norm(q);if(nq.length<4)return all;const secs=[...new Set(nl.map((l,k)=>l.includes(nq)?secOf[k]:null).filter(Boolean))];if(!secs.length||secs.includes(name))return all;const to=pick(secs);if(!to)return all;fixed++;return '《'+to+'》'+mid+'「'+q+'」';});
// 一个篇名后紧跟第二段引文（「…」，「…」）时，第二段也按同一篇名核（2026-11-20 震卦第 9 栏查出）。
const scan=(key,text)=>{const re=/《([^》]+)》([^「《]{0,14})「([^」]+)」(?:[，、]「([^」]+)」)?/g;let m;while((m=re.exec(text))){if(!names.has(m[1]))continue;for(const q of [m[3],m[4]].filter(Boolean)){const nq=norm(q);if(nq.length<4)continue;
 const secs=[...new Set(nl.map((l,k)=>l.includes(nq)?secOf[k]:null).filter(Boolean))];if(!secs.length||secs.includes(m[1]))continue;
 const pk=m[1]+'→'+secs.join('/');pairs[pk]=(pairs[pk]||0)+1;out.push(`${key}\t《${m[1]}》「${q}」→ ${secs.join('/')}`);}}};
for(let h=1;h<=64;h++){if(only&&!only.has(h))continue;const id=String(h).padStart(3,'0');
 const mp=`sources/editorial/${item}/monthly/hex-${id}.json`;
 if(!col9&&fs.existsSync(mp))for(const a of JSON.parse(fs.readFileSync(mp,'utf8')).articles)[a.title,a.short,...a.paragraphs,a.judgment].forEach(t=>scan(`${h}/${a.movingLine}/${a.monthBranch}`,t||''));
 const bp=`sources/editorial/${item}/hex-${id}.json`;if(col9&&fs.existsSync(bp))JSON.parse(fs.readFileSync(bp,'utf8')).forEach((d,i)=>scan(`${h}#${i}`,d[9]||''));
 // 2026-11-21：--col9 同查计算说明。
 const pp=`sources/editorial/${item}/polish-v5/hex-${id}.json`;if(col9&&fs.existsSync(pp))JSON.parse(fs.readFileSync(pp,'utf8')).forEach((r,i)=>scan(`${h}#${i}计算说明`,(r.calculationNotes||[]).join('｜')));}
if(fix){for(let h=1;h<=64;h++){if(only&&!only.has(h))continue;const id=String(h).padStart(3,'0');
 const mp=`sources/editorial/${item}/monthly/hex-${id}.json`;if(fs.existsSync(mp)){const j=JSON.parse(fs.readFileSync(mp,'utf8'));const before=fixed;for(const a of j.articles){a.title=repl(a.title);a.short=repl(a.short);a.paragraphs=a.paragraphs.map(repl);if(a.judgment)a.judgment=repl(a.judgment);}if(fixed>before)fs.writeFileSync(mp,JSON.stringify(j,null,1)+'\n');}
 const bp=`sources/editorial/${item}/hex-${id}.json`;if(fs.existsSync(bp)){const raw=fs.readFileSync(bp,'utf8');const j=JSON.parse(raw);const before=fixed;j.forEach(d=>{if(typeof d[9]==='string')d[9]=repl(d[9]);});if(fixed>before)fs.writeFileSync(bp,JSON.stringify(j,null,raw.startsWith('[\n  ')?2:1)+'\n');}}
 console.log('fixed',fixed);}
if(list)for(const o of out)console.log(o);
console.log(JSON.stringify({item,col9,mismatches:out.length,pairs}));
