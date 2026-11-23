import fs from 'node:fs';
import crypto from 'node:crypto';
export const hist='sources/editorial/missing-contact/second-reviews-monthly/history/hex-022/reader-shihe-20261123';
export const src='sources/editorial/missing-contact/monthly/hex-022.json';
export const editor='/root/write_shihe_021';
export const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export function display(line,half){
 const text=fs.readFileSync(src,'utf8'),source=JSON.parse(text),articles=source.articles.filter(a=>a.movingLine===line).slice((half-1)*6,half*6);
 const packet={sourceSha256:sha(text),capturedAt:new Date().toISOString(),editor,movingLine:line,half,articles};
 const p=`${hist}/line-${line}-${half}-objects.json`;if(fs.existsSync(p))throw Error('Use existing packet or explicit reread');fs.writeFileSync(p,JSON.stringify(packet,null,2)+'\n');
 for(const a of articles){console.log('\nARTICLE',line,a.monthBranch);for(const[k,v]of Object.entries(a))console.log(k+':',JSON.stringify(v));}
}
export function seal(line,notes){
 const packets=[1,2].map(n=>JSON.parse(fs.readFileSync(`${hist}/line-${line}-${n}-objects.json`,'utf8'))),articles=packets.flatMap(x=>x.articles),now=JSON.parse(fs.readFileSync(src,'utf8')).articles.filter(a=>a.movingLine===line);
 if(articles.length!==12||notes.length!==12||JSON.stringify(articles)!==JSON.stringify(now))throw Error('Twelve actual final reads required');
 const record={editor,readCompletedAt:new Date().toISOString(),wholeArticlesRead:12,movingLine:line,method:'独立读者实际逐篇完整阅读工具所输出的全部字段，随后手写逐篇意见；封存不等于自动审读。',articles,articleReviews:articles.map((a,i)=>({key:`22/${line}/${a.monthBranch}`,finding:notes[i],articleSha256:sha(JSON.stringify(a)),editor,wholeArticleRead:true,allFieldsRead:true}))};
 const p=`${hist}/line-${line}-independent-read.json`;if(fs.existsSync(p))throw Error('read record exists');fs.writeFileSync(p,JSON.stringify(record,null,2)+'\n');console.log('Actual independent full fields read sealed',line,12);
}
