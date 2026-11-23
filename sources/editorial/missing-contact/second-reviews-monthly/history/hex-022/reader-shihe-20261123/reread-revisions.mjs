import fs from 'node:fs';
import {hist,src,editor,sha} from './reading.mjs';
const keys=['22/1/卯','22/1/辰','22/1/午','22/1/未','22/1/申','22/1/戌','22/2/巳','22/2/酉','22/3/巳','22/4/寅','22/4/卯','22/4/丑','22/5/午'];
const batch=Number(process.argv[2]);
if(![1,2,3].includes(batch))throw Error('batch 1–3 required');
const raw=fs.readFileSync(src,'utf8'),source=JSON.parse(raw),chosen=keys.slice((batch-1)*6,batch*6);
const articles=chosen.map(key=>source.articles.find(a=>`22/${a.movingLine}/${a.monthBranch}`===key));
if(articles.some(a=>!a))throw Error('missing key');
const packet={editor,capturedAt:new Date().toISOString(),sourceSha256:sha(raw),keys:chosen,articles};
const dest=`${hist}/revision-reread-${batch}-objects.json`;
if(fs.existsSync(dest))throw Error('preserve existing read object');
fs.writeFileSync(dest,JSON.stringify(packet,null,2)+'\n');
for(const a of articles){console.log('\nREVISED ARTICLE',a.movingLine,a.monthBranch);for(const[k,v]of Object.entries(a))console.log(k+':',JSON.stringify(v));}
