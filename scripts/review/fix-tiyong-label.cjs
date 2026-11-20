// 篇名订正（2026-11-20）：原书 494 行（「体党多而体势盛」「用党多则体势衰」「体生用，为之泄气」「体宜受用卦之生」等）在【体用总诀】，
// 库目 mh-061 也作「体用总诀」，此前误标《体用》。只在《体用》后 12 字内紧跟这些原句或「（494 行）」时改为《体用总诀》；
// 682 行【体用】的「彼灭其吉」「稍解其穷」等不动。只改篇名，不动引文与其余文字。
// 用法：node scripts/review/fix-tiyong-label.cjs <问项> [--hex 1,2] [--write]（改逐月作者源全部文字栏与五气源第 9 栏）
const fs=require('fs');const args=process.argv.slice(2),item=args[0],write=args.includes('--write');
const hi=args.indexOf('--hex'),only=hi>=0?new Set(args[hi+1].split(',').map(Number)):null;
const Q=['体党多而体势盛','用党多则体势衰','体生用，为之泄气','体宜受用卦之生','用宜见卦体之克','用克体固不宜','体生用亦非利','体盛则吉','体衰则凶','如卦体是金','如用卦是金','宜受他卦之生','他卦者，谓用互变也','体用之说，动静之机'];
const RE=new RegExp('《体用》(?=[^《」「]{0,12}(?:「(?:'+Q.join('|')+')|（(?:mh-061，)?494 行）))','gu');
const fix=s=>typeof s==='string'?s.replace(RE,'《体用总诀》'):s;
let total=0;const per={};
for(let h=1;h<=64;h++){if(only&&!only.has(h))continue;const id=String(h).padStart(3,'0');
 const mp=`sources/editorial/${item}/monthly/hex-${id}.json`;
 if(fs.existsSync(mp)){const j=JSON.parse(fs.readFileSync(mp,'utf8'));let n=0;
  for(const a of j.articles){for(const k of ['title','short','judgment']){const v=fix(a[k]);if(v!==a[k]){n+=(a[k].match(RE)||[]).length;a[k]=v;}}
   a.paragraphs=a.paragraphs.map(p=>{const v=fix(p);if(v!==p)n+=(p.match(RE)||[]).length;return v;});
   if(Array.isArray(a.timing))a.timing=a.timing.map(w=>w.map(x=>{const v=fix(x);if(v!==x)n+=(x.match(RE)||[]).length;return v;}));
   if(a.judgmentCorrection){a.judgmentCorrection.new=fix(a.judgmentCorrection.new);a.judgmentCorrection.old=fix(a.judgmentCorrection.old);} }
  if(n){per[h]=(per[h]||0)+n;total+=n;if(write)fs.writeFileSync(mp,JSON.stringify(j,null,1)+'\n');}}
 const bp=`sources/editorial/${item}/hex-${id}.json`;
 if(fs.existsSync(bp)){const raw=fs.readFileSync(bp,'utf8');const j=JSON.parse(raw);let n=0;
  for(const d of j){const v=fix(d[9]);if(v!==d[9]){n+=(d[9].match(RE)||[]).length;d[9]=v;}
   if(Array.isArray(d[10]))d[10]=d[10].map(w=>w.map(x=>{const v=fix(x);if(v!==x)n+=(x.match(RE)||[]).length;return v;}));}
  if(n){per['五气'+h]=n;total+=n;if(write){const ind=raw.startsWith('[\n  ')?2:1;fs.writeFileSync(bp,JSON.stringify(j,null,ind)+'\n');}}}
}
console.log(JSON.stringify({item,total,write,per}));
