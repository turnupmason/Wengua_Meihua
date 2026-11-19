// Explicit hexagram selection protects the 576 style-reference articles from unrelated regeneration.
// This renderer never generates prose or approves any manuscript.
import {writeFile} from 'node:fs/promises';
import {context,loadHex,renderHex,DOC_DIR,stem} from './review/interview-monthly-lib.mjs';
import {auditMonthly} from './review/check-interview-monthly.mjs';
const args=process.argv.slice(2),idx=args.indexOf('--hex');
if(idx<0||!args[idx+1])throw new Error('Specify the completed hexagrams: --hex 3,4');
const ids=args[idx+1].split(',').map(Number);
if(ids.some(id=>!Number.isInteger(id)||id<1||id>64)||new Set(ids).size!==ids.length)throw new Error('Invalid hexagram selection');
const report=await auditMonthly({ids});
if(report.errors.length)throw new Error('Monthly audit failed: '+JSON.stringify(report.errors.slice(0,10)));
const ctx=await context();
for(const id of ids){const bundle=await loadHex(id);await writeFile(`${DOC_DIR}/${stem(id)}.md`,renderHex(ctx,bundle));}
console.log(JSON.stringify({renderedHexagrams:ids,articles:report.articleCount,authorApprovalAdded:false}));
