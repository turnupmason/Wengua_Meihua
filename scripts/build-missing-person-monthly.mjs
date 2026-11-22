// Render only after concrete source/receipt validation. Does not author, expand, or approve prose.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {context,listIds,stem,SOURCE_DIR,DOC_DIR,renderHex} from './review/missing-person-monthly-lib.mjs';
import {auditMissingMonthly} from './review/check-missing-person-monthly.mjs';
const args=process.argv.slice(2),p=args.indexOf('--hex'),ids=p<0?await listIds():args[p+1].split(',').map(Number);
if(!ids.length||new Set(ids).size!==ids.length||ids.some(x=>!Number.isInteger(x)||x<1||x>64))throw new Error('Provide one or more valid hexagram IDs');
const report=await auditMissingMonthly({ids,requireSecond:args.includes('--require-second')});
if(report.errors.length)throw new Error(JSON.stringify(report.errors.slice(0,20),null,2));
const ctx=await context();await mkdir(DOC_DIR,{recursive:true});
for(const id of ids){const source=JSON.parse(await readFile(`${SOURCE_DIR}/${stem(id)}.json`,'utf8'));await writeFile(`${DOC_DIR}/${stem(id)}.md`,renderHex(ctx,source));}
console.log(JSON.stringify({renderedHexagrams:ids,renderedArticles:report.articleCount,bodyHanRange:report.bodyHanRange,sourceChecks:'passed',independentFullReading:report.secondReadArticles,realWorldPredictionAccuracy:'not-validated'}));
