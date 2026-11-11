import {writeFile} from 'node:fs/promises';
import {getCivilDay} from '../src/day-calendar.js';
const start='2026-11-10',end='2028-11-10',day=86400000,rows=[];
for(let t=Date.parse(start+'T00:00:00Z');t<Date.parse(end+'T00:00:00Z');t+=day)rows.push(getCivilDay(new Date(t).toISOString().slice(0,10)));
await writeFile(new URL('../data/day-calendar.json',import.meta.url),JSON.stringify({schemaVersion:'1.0.0',calendarVersion:'civil-day-1.0.0',
 startDate:start,endDateExclusive:end,count:rows.length,policy:'YYYY-MM-DD date keys;no clock time or location input;not an instant-to-local-date converter',
 anchor:{date:'2000-01-07',dayGanzhi:'甲子'},scope:'day ganzhi only;not lunar date,solar-term month or divination date selection',rows},null,2)+'\n');
console.log(`Civil-date cache rebuilt: ${rows.length} checked date keys, ${start} through ${rows.at(-1).date}.`);
