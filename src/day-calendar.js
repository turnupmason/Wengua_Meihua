/** Civil-date labels only. UTC arithmetic here avoids DST; it does not select a user's timezone. */
const DAY=86400000,ANCHOR=Date.UTC(2000,0,7),STEMS=[...'甲乙丙丁戊己庚辛壬癸'],BRANCHES=[...'子丑寅卯辰巳午未申酉戌亥'];
function ordinal(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('Expected a complete YYYY-MM-DD civil date, without a clock time');
 const [y,m,d]=value.split('-').map(Number);if(y<1900||y>2099)throw new RangeError('Civil date year must be 1900..2099');
 const t=Date.UTC(y,m-1,d),date=new Date(t);
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw new RangeError('Invalid civil date');
 return t/DAY;
}
export function getCivilDay(date){
 const index=((ordinal(date)-ANCHOR/DAY)%60+60)%60;
 return Object.freeze({date,dayGanzhi:STEMS[index%10]+BRANCHES[index%12],dayBranch:BRANCHES[index%12]});
}
/** Expands a chosen branch period into calendar matches. It does not choose an event's cycle. */
export function findCivilDayMatches({startDate,endDate,branches}){
 const start=ordinal(startDate),end=ordinal(endDate);
 if(end<start||end-start>732)throw new RangeError('Use an ordered date range no longer than two years plus leap allowance');
 if(!Array.isArray(branches)||!branches.length||branches.some(b=>!BRANCHES.includes(b)))throw new RangeError('Provide valid branch candidates');
 const wanted=new Set(branches),matches=[];
 for(let n=start;n<=end;n++){
  const day=getCivilDay(new Date(n*DAY).toISOString().slice(0,10));
  if(wanted.has(day.dayBranch))matches.push(Object.freeze({...day,display:formatCivilDay(day.date),kind:'calendar-match',selectedAsEventDate:false}));
 }
 return Object.freeze(matches);
}
export function formatCivilDay(date){
 const day=getCivilDay(date),[y,m,d]=date.split('-').map(Number);
 return `${y}年${m}月${d}日（${day.dayGanzhi}日）`;
}
