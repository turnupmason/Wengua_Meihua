import {findUpcomingCivilDayMatches,formatUpcomingCivilDay,getCivilDay} from './day-calendar.js';
const branches=[...'子丑寅卯辰巳午未申酉戌亥'];
export function getVoidProfileKey(reading){
 return JSON.stringify(reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>[
  n.role,n.void.state,n.void.matchedBranches||[],n.void.effective,n.void.castingState||null
 ]));
}
export function unpackManuscript(file,record){
 const paragraphs=record.paragraphIds?.map(id=>{
  if(!Number.isInteger(id)||typeof file.textPool?.[id]!=='string')throw new Error('Manuscript paragraph reference invalid');
  return file.textPool[id];
 });
 const verdict=file.verdictPool?.[record.verdictId],dateSlots=file.timingPool?.[record.timingId];
 if(!paragraphs?.length||!verdict||!Array.isArray(dateSlots))throw new Error('Manuscript pools invalid');
 return {paragraphs,verdict,dateSlots,sourceIds:file.sourceIds};
}
function dateList(rows,castingDate,viewDate){
 const labels=rows.map(row=>formatUpcomingCivilDay(row.date,{castingDate,viewDate}));
 const parts=labels.map(label=>/^(.*?)(\d+)号$/.exec(label));
 if(parts.every(p=>p&&p[1]===parts[0][1]))return parts[0][1]+parts.map(p=>p[2]).join('、')+'号';
 return labels.join('、');
}
/** Only date labels are dynamic. Every surrounding sentence and paragraph is already stored. */
export function resolveManuscriptDates({paragraphs,dateSlots,reading,castingDate,viewDate,timingScale,timingContext={}}){
 const missing=[];
 if(!castingDate)missing.push('castingDate');
 if(timingScale!=='day')missing.push('explicit day scale');
 if(timingContext.castingMethod!=='pre-heaven'||timingContext.periodMethod!=='element-qi')missing.push('recorded pre-heaven element-qi timing method');
 if(reading.nodes.some(n=>n.void.state==='unresolved'))missing.push('casting-day void context');
 if(missing.length)return {status:'requires-context',missing,paragraphs,dateMatches:[]};
 const day=getCivilDay(castingDate);
 for(const n of reading.nodes)if(n.void.xun?.ganzhi&&n.void.xun.ganzhi!==day.dayGanzhi)throw new RangeError('Casting date and saved day ganzhi disagree');
 let output=[...paragraphs];const dateMatches=[];
 for(const slot of dateSlots){
  if(!slot.id||slot.token!==`{{date:${slot.id}}}`||!slot.branches?.length||slot.branches.some(b=>!branches.includes(b))||!slot.event||!slot.valence||!slot.sourceIds?.length)throw new Error('Manuscript date declaration invalid');
  const matches=findUpcomingCivilDayMatches({castingDate,branches:slot.branches});
  const displayed=matches.matches.slice(0,slot.displayLimit||2);
  const sentence=displayed.length?slot.prefix+dateList(displayed,castingDate,viewDate)+slot.suffix:slot.emptyText;
  output=output.map(p=>p.split(slot.token).join(sentence));
  dateMatches.push({slotId:slot.id,event:slot.event,valence:slot.valence,sourceIds:slot.sourceIds,
   matches:matches.matches,displayedDates:displayed.map(d=>d.date),selectedCycle:null,kind:'calendar-candidates'});
 }
 if(output.some(p=>p.includes('{{date:')))throw new Error('Unresolved manuscript date token');
 return {status:'resolved',paragraphs:output,dateMatches,castingDate,dayGanzhi:day.dayGanzhi};
}
