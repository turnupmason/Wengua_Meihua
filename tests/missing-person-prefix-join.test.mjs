import test from 'node:test';
import assert from 'node:assert/strict';
import {createJaccardPrefixIndex} from '../scripts/review/check-missing-person-monthly.mjs';

test('prefix filter agrees exactly with brute force, including selection and threshold',()=>{
 let seed=20261126;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const records=[];
 for(let i=0;i<350;i++){
  const a=new Set();
  for(let j=0;j<100;j++)if((next()%100)<(i%3===0?20:70))a.add(String(j).padStart(3,'0'));
  records.push({grams:a,selected:i%4!==0});
 }
 // Exact boundary: intersection 16, union 25 -> 0.64, not excluded.
 records.push({grams:new Set(Array.from({length:20},(_,i)=>'a'+i)),selected:true});
 records.push({grams:new Set([...Array.from({length:16},(_,i)=>'a'+i),...Array.from({length:5},(_,i)=>'b'+i)]),selected:true});
 records.push({grams:new Set(),selected:true});
 const freq=new Map();for(const a of records)for(const g of a.grams)freq.set(g,(freq.get(g)||0)+1);
 const ix=createJaccardPrefixIndex(),rare=createJaccardPrefixIndex(freq);
 for(let i=0;i<records.length;i++){
  const a=records[i],expected=[];
  for(let j=0;j<i;j++){
   const b=records[j];if(!a.selected&&!b.selected)continue;
   const inter=[...a.grams].filter(x=>b.grams.has(x)).length;
   const score=inter/(a.grams.size+b.grams.size-inter||1);
   if(score>=0.64)expected.push({index:j,score});
  }
  assert.deepEqual(ix.add(a.grams,a.selected),expected);
  assert.deepEqual(rare.add(a.grams,a.selected),expected);
 }
});
