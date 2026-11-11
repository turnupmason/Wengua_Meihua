import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getCivilDay,formatUpcomingCivilDay,findUpcomingCivilDayMatches} from '../src/index.js';

test('casting on the 12th cannot render the 8th of the same month as a future date',()=>{
 assert.throws(()=>formatUpcomingCivilDay('2026-11-08',{castingDate:'2026-11-12'}),/cannot precede/);
 const result=findUpcomingCivilDayMatches({castingDate:'2026-11-12',branches:[getCivilDay('2026-11-08').dayBranch]});
 assert.deepEqual(result.matches.map(d=>d.date),['2026-11-20']);
 assert.equal(result.matches[0].storyDisplay,'本月20号');
 assert.equal(result.selectedCycle,null);
 assert.equal(result.matches[0].selectedAsEventDate,false);
});

test('no remaining current-month match searches the next month by branch, not by day number',()=>{
 const result=findUpcomingCivilDayMatches({castingDate:'2026-11-30',branches:['酉']});
 assert.equal(result.monthOffset,1);
 assert.equal(result.matches[0].date,'2026-12-01');
 assert.equal(result.matches[0].storyDisplay,'下月1号');
 assert.ok(result.matches.every(d=>d.dayBranch==='酉'));
});

test('current-month dates take precedence and casting day is allowed at day precision',()=>{
 const result=findUpcomingCivilDayMatches({castingDate:'2026-11-12',branches:['寅']});
 assert.deepEqual(result.matches.map(d=>d.date),['2026-11-12','2026-11-24']);
 assert.equal(result.monthOffset,0);
});

test('eligibility review runs before deciding whether next month must be searched',()=>{
 const seen=[];
 const result=findUpcomingCivilDayMatches({castingDate:'2026-11-12',branches:['戌'],isEligible:row=>{
  seen.push(row.date);return row.date>='2026-12-01';
 }});
 assert.ok(seen.includes('2026-11-20'));
 assert.equal(result.monthOffset,1);
 assert.equal(result.matches[0].date,'2026-12-02');
 const none=findUpcomingCivilDayMatches({castingDate:'2026-11-12',branches:['戌'],isEligible:()=>false});
 assert.equal(none.monthOffset,null);assert.deepEqual(none.matches,[]);
 assert.throws(()=>findUpcomingCivilDayMatches({castingDate:'2026-11-12',branches:['戌'],isEligible:async()=>true}),/boolean/);
});

test('year rollover and leap day use complete civil dates',()=>{
 const january=findUpcomingCivilDayMatches({castingDate:'2026-12-31',branches:[getCivilDay('2027-01-01').dayBranch]});
 assert.equal(january.matches[0].date,'2027-01-01');assert.equal(january.matches[0].storyDisplay,'下月1号');
 const leap=findUpcomingCivilDayMatches({castingDate:'2028-02-28',branches:[getCivilDay('2028-02-29').dayBranch]});
 assert.equal(leap.matches[0].date,'2028-02-29');assert.equal(leap.matches[0].storyDisplay,'本月29号');
 assert.throws(()=>formatUpcomingCivilDay('2027-02-29',{castingDate:'2027-02-12'}));
});

test('history changes the label to an actual month without rolling the saved date forward',()=>{
 const options={castingDate:'2026-11-12'};
 assert.equal(formatUpcomingCivilDay('2026-11-20',options),'本月20号');
 assert.equal(formatUpcomingCivilDay('2026-11-20',{...options,viewDate:'2026-12-12'}),'11月20号');
 assert.equal(formatUpcomingCivilDay('2026-11-20',{...options,viewDate:'2027-01-12'}),'2026年11月20号');
 assert.equal(formatUpcomingCivilDay('2027-01-01',{castingDate:'2026-12-31'}),'下月1号');
 assert.equal(formatUpcomingCivilDay('2027-01-01',{castingDate:'2026-12-31',viewDate:'2027-01-12'}),'1月1号');
});

test('all 731 audited casting dates return future-only, chronological, correctly labelled candidates',async()=>{
 const calendar=JSON.parse(await readFile(new URL('../data/day-calendar.json',import.meta.url),'utf8'));
 const branches=[...'子丑寅卯辰巳午未申酉戌亥'];
 for(const [index,cast] of calendar.rows.entries()){
  const result=findUpcomingCivilDayMatches({castingDate:cast.date,branches:[branches[index%12]]});
  assert.ok(result.matches.length);
  for(const [i,day] of result.matches.entries()){
   assert.ok(day.date>=cast.date);assert.equal(day.dayBranch,branches[index%12]);
   if(i)assert.ok(day.date>result.matches[i-1].date);
   assert.equal(day.storyDisplay,formatUpcomingCivilDay(day.date,{castingDate:cast.date}));
   assert.equal(day.selectedAsEventDate,false);
  }
 }
});
