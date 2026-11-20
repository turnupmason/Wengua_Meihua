// 篇内重复扫描（2026-11-20）：补厚时有写手把前文重说一遍凑字。列出同一篇正文里（去掉「」引文）重复出现的 N 字片段。
// 用法：node scripts/review/intra-repeat.cjs <问项目录> [N=10] [--hex 1,2] [--list]
const fs=require('fs');const args=process.argv.slice(2),item=args[0],N=+(args.find(a=>/^\d+$/.test(a))||10),list=args.includes('--list');
const hi=args.indexOf('--hex');const only=hi>=0?new Set(args[hi+1].split(',').map(Number)):null;
const dir=`sources/editorial/${item}/monthly/`;const per={};let total=0;
for(const f of fs.readdirSync(dir).filter(f=>/^hex-\d{3}\.json$/.test(f))){const h=+f.slice(4,7);if(only&&!only.has(h))continue;
 for(const a of JSON.parse(fs.readFileSync(dir+f,'utf8')).articles){
  const t=a.paragraphs.join('。').replace(/「[^」]*」|《[^》]*》/gu,'');const segs=t.split(/[。，；：、！？]/u).map(s=>s.replace(/[^\p{Script=Han}]/gu,''));
  const seen=new Map(),hits=new Set();
  segs.forEach((s,si)=>{for(let i=0;i+N<=s.length;i++){const g=s.slice(i,i+N);if(seen.has(g)&&seen.get(g)!==si)hits.add(g);else if(!seen.has(g))seen.set(g,si);}});
  // 合并重叠片段
  const uniq=[...hits].filter(g=>![...hits].some(o=>o!==g&&o.includes(g)));
  if(uniq.length){per[h]=(per[h]||0)+1;total++;if(list)console.log(`${h}/${a.movingLine}/${a.monthBranch}\t${uniq.slice(0,4).join(' | ')}`);}
 }}
console.log(JSON.stringify({item,N,articlesWithRepeat:total,perHex:per}));
