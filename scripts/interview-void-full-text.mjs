import {mkdir,writeFile} from 'node:fs/promises';
import {createBaseInterviewReading} from '../sources/editorial/interview-base-authoring.mjs';
import {createInterviewReading} from '../src/interview-manuscripts.js';
import {MONTH_ORDERS} from '../src/narrative-rules.js';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';

export function firstThreeFullTextPath(primaryId,movingLine){
 return `interview-void/hex-${String(primaryId).padStart(3,'0')}-line-${movingLine}.md`;
}

const phases={opening:'开局',process:'过程',ending:'结局',summary:'总断'};
const monthOrder=row=>MONTH_ORDERS.findIndex(month=>month.id===row.monthOrder);
const escapeHtml=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function renderManuscript(row,{library,question}){
 const date=row.facts.referenceContext.castingDate;
 const makeReading=row.baseNoVoid?createBaseInterviewReading:createInterviewReading;
 const reading=makeReading({library,question,primaryId:row.primaryId,movingLine:row.movingLine,
  monthBranch:row.monthBranches[0],castingDate:date});
 const timing=row.timingSlots.length?resolveManuscriptDates({
  paragraphs:row.timingSlots.map(slot=>slot.token),dateSlots:row.timingSlots,reading,castingDate:date,
  timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'},
 }):null;
 if(timing&&timing.status!=='resolved')throw new Error(`Full-text timing failed for manuscript ${row.number}`);
 const copy=row.copy;
 const details=Object.entries(phases).map(([key,label])=>`**${label}** ${copy.long[key]}`);
 const dateLines=timing?timing.paragraphs.map((text,index)=>{
  const slot=row.timingSlots[index];
  return `${text}\n\n取期节点为${slot.calculationBasis.trigram}${slot.calculationBasis.element}，匹配${slot.branches.join('、')}日。`;
 }):[row.timingOmission.reason];
 const sourceLines=row.decision.sourceEvidence.map(evidence=>
  `- 《梅花易数·${evidence.title}》「${evidence.quote}」\n  ${evidence.reason}`);
 return [
  ...(row.baseProse?[`**${copy.title}**`]:[]),`**简断** ${copy.short.text}`,...details,
  `**应期**（${date} 起卦对照）\n\n${dateLines.join('\n\n')}`,
  `**动爻原文** ${row.movingLineText}`,
  ...row.coreVoidNotes,
  '**古籍依据**\n\n'+sourceLines.join('\n'),
 ].join('\n\n');
}

export async function writeFirstThreeVoidFullText({root,library,question,rows}){
 await mkdir(new URL('docs/interview-void/',root),{recursive:true});
 const catalogue=[
  '# 乾、坤、屯面试断语全文','',
  '按卦和动爻打开全文，再按月令查看基础稿与旬空情境稿。每份列出简断、开局、过程、结局、总断、应期和古籍依据。','',
  '[旬空复核表](INTERVIEW_VOID_FIRST_THREE.md)','',
 ];
 for(const primaryId of [1,2,3]){
  const name=library.getHexagram(primaryId).name;
  const pool=rows.filter(row=>row.primaryId===primaryId);
  catalogue.push(`## ${name}`,'','| 动爻 | 基础稿 | 旬空情境稿 |','| --- | ---: | ---: |');
  for(let movingLine=1;movingLine<=6;movingLine++){
   const line=pool.filter(row=>row.movingLine===movingLine);
   const base=line.filter(row=>row.baseProse).sort((a,b)=>monthOrder(a)-monthOrder(b));
   const contexts=line.filter(row=>!row.baseProse);
   const label=library.getLineReading(primaryId,movingLine).label;
   const path=firstThreeFullTextPath(primaryId,movingLine);
   catalogue.push(`| [${label}](${path}) | ${base.length} | ${contexts.length} |`);
   const page=[
    `# ${name} · ${label}动`,'',
    '[返回全文目录](../INTERVIEW_VOID_FULL_TEXT.md) · [旬空复核表](../INTERVIEW_VOID_FIRST_THREE.md)','',
    '每组先列基础稿，再列适用的旬空稿。起卦对照日用于展示日干支和应期，实际调用以起卦日和所选月令为准。','',
   ];
   for(const row of base){
    page.push(`## ${row.monthBranches.map(b=>b+'月').join('、')}`,'',
     '### 基础稿','',renderManuscript(row,{library,question}),'');
    for(const variant of contexts.filter(context=>context.monthOrder===row.monthOrder)){
     const ref=variant.facts.referenceContext;
     const subject=`${variant.voidScenario.xun}旬 · ${ref.dayGanzhi}日 · ${variant.copy.title}`;
     page.push(`<a name="manuscript-${variant.number}"></a>`,'',
      '<details>',`<summary>${escapeHtml(subject)}</summary>`,'',
      renderManuscript(variant,{library,question}),'','</details>','');
    }
   }
   await writeFile(new URL('docs/'+path,root),page.join('\n'));
  }
  catalogue.push('');
 }
 await writeFile(new URL('docs/INTERVIEW_VOID_FULL_TEXT.md',root),catalogue.join('\n'));
}
