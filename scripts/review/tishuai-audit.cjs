// 「体衰」引文核对（2026-11-20）：《衰旺论》「体衰而有生体之卦，则衰稍解」「若体衰而逢克，则其凶甚矣」，衰指死（定稿第十节：
// 体以囚、死为弱，原书论体只说「体卦气衰」，衰即死）。列出体不在死地却引这两句、或说「体衰」的篇与第 9 栏行。
// 用法：node scripts/review/tishuai-audit.cjs <问项> [--hex 1,2] [--list]
const fs=require('fs');const args=process.argv.slice(2),item=args[0],list=args.includes('--list');
const hi=args.indexOf('--hex'),only=hi>=0?new Set(args[hi+1].split(',').map(Number)):null;
const QI={寅:'spring-wood',卯:'spring-wood',辰:'seasonal-earth',巳:'summer-fire',午:'summer-fire',未:'seasonal-earth',申:'autumn-metal',酉:'autumn-metal',戌:'seasonal-earth',亥:'winter-water',子:'winter-water',丑:'seasonal-earth'};
const RE=/体衰而有生体之卦|衰稍解|若体衰而逢克|体衰而逢克|体衰逢克|体衰[，、而之时]|体卦气衰/u;
const out=[];let mon=0,c9=0;
for(let h=1;h<=64;h++){if(only&&!only.has(h))continue;const id=String(h).padStart(3,'0');const dp=`data/authored-readings/${item}/hex-${id}.json`;if(!fs.existsSync(dp))continue;
 const data=JSON.parse(fs.readFileSync(dp,'utf8'));const bodyQi=(l,qi)=>data.rows.find(r=>r.baseProse!==false&&r.movingLine===l&&r.monthOrder===qi)?.facts.nodes.find(n=>n.role==='body')?.qi;
 const base=JSON.parse(fs.readFileSync(`sources/editorial/${item}/hex-${id}.json`,'utf8'));
 base.forEach((d,i)=>{const q=bodyQi(d[0],d[1]);if(q&&q!=='死'&&RE.test(String(d[9]))){c9++;out.push(`${h}#${i}\t体${q}\t第9栏`);}});
 const mp=`sources/editorial/${item}/monthly/hex-${id}.json`;if(fs.existsSync(mp))for(const a of JSON.parse(fs.readFileSync(mp,'utf8')).articles){const q=bodyQi(a.movingLine,QI[a.monthBranch]);const t=[a.title,a.short,...a.paragraphs].join('');if(q&&q!=='死'&&RE.test(t)){mon++;out.push(`${h}/${a.movingLine}/${a.monthBranch}\t体${q}\t正文`);}}}
if(list)for(const o of out)console.log(o);
console.log(JSON.stringify({item,monthlyArticles:mon,col9Rows:c9}));
