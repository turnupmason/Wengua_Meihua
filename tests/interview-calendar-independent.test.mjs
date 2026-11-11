import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getCivilDay,findUpcomingCivilDayMatches} from '../src/day-calendar.js';
const fixture=JSON.parse(await readFile(new URL('../sources/audit/interview-review-20261111.json',import.meta.url),'utf8'));
const stems=[...'甲乙丙丁戊己庚辛壬癸'],branches=[...'子丑寅卯辰巳午未申酉戌亥'];
// Integer Gregorian JDN arithmetic: no production anchor or date-difference code.
function independentDay(date){
 const [year,month,day]=date.split('-').map(Number),a=Math.floor((14-month)/12),y=year+4800-a,m=month+12*a-3;
 const jdn=day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
 const i=((jdn+49)%60+60)%60;
 return {dayGanzhi:stems[i%10]+branches[i%12],dayBranch:branches[i%12]};
}

test('production civil days agree with externally checked anchors and independent JDN arithmetic across 1900..2099',()=>{
 for(const anchor of fixture.calendarAnchors){assert.equal(independentDay(anchor.date).dayGanzhi,anchor.dayGanzhi);assert.equal(getCivilDay(anchor.date).dayGanzhi,anchor.dayGanzhi);}
 let days=0;
 for(let y=1900;y<=2099;y++)for(let m=1;m<=12;m++)for(let d=1;d<=new Date(Date.UTC(y,m,0)).getUTCDate();d++){
  const date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  assert.equal(getCivilDay(date).dayGanzhi,independentDay(date).dayGanzhi,date);days++;
 }
 assert.equal(days,73049);
});

test('demo windows and other cast months recalculate branch dates without reusing saved November labels',()=>{
 const examples=[['2026-11-11',['申','酉'],['2026-11-18','2026-11-19']],['2026-11-11',['寅','卯'],['2026-11-12','2026-11-13']],['2026-11-11',['亥','子'],['2026-11-21','2026-11-22']]];
 for(const [castingDate,target,expected] of examples)assert.deepEqual(findUpcomingCivilDayMatches({castingDate,branches:target}).matches.slice(0,2).map(d=>d.date),expected);
 for(const castingDate of ['2026-11-20','2026-11-30','2026-12-31','2027-01-25','2028-02-27'])for(const target of [['申','酉'],['寅','卯'],['亥','子']]){
  const result=findUpcomingCivilDayMatches({castingDate,branches:target});
  const [y,m]=castingDate.split('-').map(Number);let expected=[];
  for(let offset=0;offset<2;offset++){
   const days=new Date(Date.UTC(y,m+offset,0)).getUTCDate();
   for(let d=1;d<=days;d++){
    const date=new Date(Date.UTC(y,m-1+offset,d)).toISOString().slice(0,10);
    if(date>=castingDate&&target.includes(independentDay(date).dayBranch))expected.push(date);
   }
   if(expected.length)break;
  }
  assert.deepEqual(result.matches.map(d=>d.date),expected);
  assert.ok(result.matches.every(d=>d.date>=castingDate&&target.includes(independentDay(d.date).dayBranch)));
 }
});
