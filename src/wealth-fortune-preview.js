import {createContextualReading} from './interview-manuscripts.js';
import {resolveWealthFortuneTiming} from './wealth-fortune-timing.js';
import {MONTH_SLOTS} from './month-slots.js';
const q={id:'wealth.near-term.outlook',mode:'narrative',question_type:'near_term_financial_outlook',question:'近期财务得失的传统趋势如何，有没有进账机会？',sourceDomainIds:['domain-10']};
const dateToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
/** Read-only preview accessor. The caller supplies its selected contemporary
 * month branch (same convention as other product readings), and may inject the
 * civil date for reproducibility. A fresh query selects the exact month shard
 * every time. No changes to the existing product dispatch or production flag.
 */
export function createWealthFortunePreviewRepository({library,readJSON}){
 if(!library||typeof readJSON!=='function')throw new TypeError('Provide library and readJSON');
 return {async getReading({primaryId,movingLine,monthBranch,referenceDate=dateToday(),castingDate,mode='current',endDate}){
  if(!Number.isInteger(primaryId)||primaryId<1||primaryId>64||!Number.isInteger(movingLine)||movingLine<1||movingLine>6||!MONTH_SLOTS.some(s=>s.branch===monthBranch))throw new RangeError('Explicit valid hexagram, moving line and current (or historical casting) month branch required');
  const n='hex-'+String(primaryId).padStart(3,'0')+'.json';
  const base='sources/editorial/wealth-fortune';
  const [src,ts]=await Promise.all([readJSON(base+'/monthly/'+n),readJSON(base+'/timing-monthly/'+n)]);
  const article=src.articles.find(a=>a.movingLine===movingLine&&a.monthBranch===monthBranch&&a.editorialVersion==='wealth-fortune-v2');
  const key=primaryId+'/'+movingLine+'/'+monthBranch;
  const stored=ts.articles.find(x=>x.key===key);
  if(!article||!stored)return {status:'requires-reviewed-preview',key};
  const anchor=mode==='history'?castingDate:referenceDate;
  const reading=createContextualReading({library,question:q,primaryId,movingLine,monthBranch,castingDate:anchor,applyVoid:false});
  const timing=resolveWealthFortuneTiming({reading,specs:stored.slots,referenceDate,castingDate,mode,endDate});
  return {status:'preview',key,article,reading,timing,productionAllowed:false};
 }};
}
