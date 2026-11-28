/** Wealth preview: author-selected event roles + the shared civil-day calendar.
 * This module expands dates; it never selects a financial event from the chart
 * or rewrites the authored interpretation. New readings use a supplied current
 * civil date and month branch; historical readings keep their cast immutable.
 */
import {getCivilDay,findUpcomingCivilDayMatches,formatUpcomingCivilDay} from './day-calendar.js';
import {ELEMENT_DAY_BRANCHES} from './timing-rules.js';
import {assessSeasonalQi} from './interpretation-audit.js';

const QI_ORDER={木:'spring-wood',火:'summer-fire',土:'seasonal-earth',金:'autumn-metal',水:'winter-water'};
const RELATIONS={
 gain:['body_controls_use','use_generates_body'],
 'conditional-gain':['body_controls_use','use_generates_body'],
 drain:['body_generates_use'],
 obstruction:['use_controls_body'],
 'risk-review':['body_generates_use','use_controls_body']
};
const LABELS={gain:'进财参考','conditional-gain':'有条件的财源观察',drain:'防耗参考',obstruction:'阻耗复核','risk-review':'风险复核（非破财日）',prepare:'蓄力与办理条件','weak-environment':'宜稳守的环境'};
const ROLES=new Set(['use','body_mutual','use_mutual','changed_use','body']);
const SOURCES={gain:['mh-072','mh-143'],'conditional-gain':['mh-072','mh-143'],drain:['mh-072','mh-143'],obstruction:['mh-072','mh-143'],'risk-review':['mh-072','mh-143'],prepare:['mh-090','mh-119','mh-143'],'weak-environment':['mh-090','mh-119','mh-143']};

export function wealthTimingBranches(reading,spec){
 const {kind,roles,event,reason,element}=spec;
 if(!(kind in LABELS)||!Array.isArray(roles)||!roles.length||new Set(roles).size!==roles.length||roles.some(r=>!ROLES.has(r))||typeof event!=='string'||!event.trim()||typeof reason!=='string'||!reason.trim())throw new Error('Invalid authored wealth timing spec');
 const nodes=roles.map(role=>reading.nodes.find(n=>n.role===role));
 if(nodes.some(n=>!n))throw new Error('Missing chart node');
 if(kind==='prepare'||kind==='weak-environment'){
  if(roles.length!==1||roles[0]!=='body')throw new Error('Environment candidates must refer to original body');
  const e=element??nodes[0].element;
  if(!(e in QI_ORDER))throw new Error('Invalid environment element');
  const state=assessSeasonalQi(nodes[0].element,QI_ORDER[e]).state;
  if(kind==='prepare'?!['旺','相'].includes(state):!['囚','死'].includes(state))throw new Error('Environment does not support authored strength direction');
  return {element:e,branches:[...ELEMENT_DAY_BRANCHES[e]],sourceIds:SOURCES[kind],directRelations:[],environmentState:state};
 }
 if(element!==undefined)throw new Error('Event element must derive from actual node');
 if(roles.includes('body')||nodes.some(n=>n.element!==nodes[0].element))throw new Error('Event roles must have a common actual non-body element');
 const rels=roles.map(role=>reading.edges.find(e=>e.targetRole===role)?.type);
 if(rels.some(r=>!RELATIONS[kind].includes(r)))throw new Error('Wealth timing role/relation does not match event type');
 return {element:nodes[0].element,branches:[...ELEMENT_DAY_BRANCHES[nodes[0].element]],sourceIds:SOURCES[kind],directRelations:rels};
}

/** Expand from referenceDate for this new reading, or from frozen castingDate
 * for a history view. In history, passed candidates are flagged expired, not
 * silently refreshed. The caller provides the actual calendar month branch.
 */
export function resolveWealthFortuneTiming({reading,specs,referenceDate,castingDate,mode='current',displayLimit=2,endDate}){
 getCivilDay(referenceDate);
 if(!['current','history'].includes(mode)||!Number.isInteger(displayLimit)||displayLimit<1||displayLimit>12)throw new Error('Invalid wealth timing context');
 if(mode==='history'){
  getCivilDay(castingDate);
  if(referenceDate<castingDate)throw new RangeError('Historical view precedes casting date');
 }
 if(!Array.isArray(specs)||!specs.length)throw new Error('Authored wealth timing specs required');
 const anchor=mode==='history'?castingDate:referenceDate;
 if(!reading.monthBranch||reading.castingDate!==anchor)throw new RangeError('Date reference requires matching chart context; refresh with current month branch and date');
 if(endDate!==undefined){getCivilDay(endDate);if(endDate<anchor)throw new RangeError('Timing horizon precedes casting date');}
 const slots=specs.map((spec,i)=>{
  const basis=wealthTimingBranches(reading,spec);
  const upcoming=findUpcomingCivilDayMatches({castingDate:anchor,branches:basis.branches,...(endDate?{isEligible:row=>row.date<=endDate}:{})});
  const rows=upcoming.matches.slice(0,displayLimit).map(row=>({...row,display:formatUpcomingCivilDay(row.date,{castingDate:anchor,viewDate:referenceDate}),expired:row.date<referenceDate}));
  const label=LABELS[spec.kind];
  const text=rows.length?rows.map(row=>row.display+(row.expired?'（已过）':'')).join('、')+'：'+spec.event:spec.event+'（当前、下一月份无可显示日期）';
  return {id:'wealth-'+(i+1),...spec,...basis,label,dates:rows,display:text,monthOffset:upcoming.monthOffset,selectedAsEventDate:false};
 });
 return {status:'resolved',mode,referenceDate,castingDate:anchor,monthBranch:reading.monthBranch??null,slots,scope:'calendar-candidates; current forecast recomputes from the supplied current date; history is immutable; not guaranteed events'};
}
