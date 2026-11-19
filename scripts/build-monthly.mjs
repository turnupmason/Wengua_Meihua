// 逐月长稿阅读页（各问项通用，照面试 build-interview-monthly.mjs）。只排版作者已写定的正文，不生成、不改写、不签核读。
// 用法：node scripts/build-monthly.mjs <问项目录> --hex 3,4
import {writeFile,mkdir} from 'node:fs/promises';
import {context,loadHex,renderHex,stem,item} from './review/monthly-lib.mjs';
import {auditMonthly} from './review/check-monthly.mjs';
const args=process.argv.slice(2),name=args[0],idx=args.indexOf('--hex');
if(!name||idx<0||!args[idx+1])throw new Error('Usage: build-monthly.mjs <item> --hex 3,4');
const c=item(name);
const ids=args[idx+1].split(',').map(Number);
if(ids.some(id=>!Number.isInteger(id)||id<1||id>64)||new Set(ids).size!==ids.length)throw new Error('Invalid hexagram selection');
const report=await auditMonthly(name,{ids});
if(report.errors.length)throw new Error('Monthly audit failed: '+JSON.stringify(report.errors.slice(0,10)));
const ctx=await context();await mkdir(c.DOC_DIR,{recursive:true});
for(const id of ids){const bundle=await loadHex(c,id);await writeFile(`${c.DOC_DIR}/${stem(id)}.md`,renderHex(ctx,c,bundle));}
console.log(JSON.stringify({item:name,renderedHexagrams:ids,articles:report.articleCount,authorApprovalAdded:false}));
