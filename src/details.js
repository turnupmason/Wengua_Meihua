import {readRepositoryJSON} from './io.js';
function id(n,max,label){if(!Number.isSafeInteger(n)||n<1||n>max)throw new RangeError(`${label} must be an integer 1..${max}`);return n;}
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
/** Facts/primary texts are the default path; long source commentary is an explicit, separate lookup. */
export function createDetailsRepository({library,readJSON=readRepositoryJSON}) {
  if(!library?.getHexagram||!library?.contentVersion)throw new TypeError('A loaded canonical library is required');
  const cache=new Map();
  function read(path){
    if(!cache.has(path)){
      const task=Promise.resolve().then(()=>readJSON(path)).then(x=>{
        if(x.contentVersion!==library.contentVersion)throw new Error(`Content version mismatch: ${path}`);
        return freeze(x);
      }).catch(e=>{cache.delete(path);throw e;});
      cache.set(path,task);
    }
    return cache.get(path);
  }
  async function getHexagram(hexagramId){
    id(hexagramId,64,'hexagramId');const base=library.getHexagram(hexagramId),detail=await read(`data/details/${String(hexagramId).padStart(2,'0')}.json`);
    if(detail.hexagramId!==hexagramId||detail.lines.length!==6||detail.baseGrade!==base.grade.rawGrade)throw new Error('Detailed source does not match canonical hexagram');
    const lines=detail.lines.map((d,i)=>{
      if(d.position!==i+1||d.label!==base.lines[i].label||d.changedHexagram.id!==library.getChangedHexagram(hexagramId,i+1).id)throw new Error('Detailed line mapping mismatch');
      return {...base.lines[i],...d,hexagramId,commentaryPath:detail.commentaryPath};
    });
    return freeze({...base,lines,detail});
  }
  async function getLine(hexagramId,position){id(position,6,'linePosition');return (await getHexagram(hexagramId)).lines[position-1];}
  async function getReadingDetails(reading){
    id(reading?.primaryId,64,'primaryId');id(reading?.movingLine,6,'movingLine');
    const expected=library.createReading({primaryId:reading.primaryId,movingLine:reading.movingLine,mutualPolicy:reading.mutualPolicy||'inner-lines'});
    for(const stage of ['primary','mutual','changed'])if(reading.stages?.[stage]?.id!==expected.stages[stage].id)throw new Error('Reading stage IDs do not match its original moving line');
    const [primary,mutual,changed]=await Promise.all(['primary','mutual','changed'].map(s=>getHexagram(reading.stages[s].id)));
    return freeze({contentVersion:library.contentVersion,primary,mutual,changed,selectedMovingLine:primary.lines[reading.movingLine-1],selectionPolicy:'original-primary-line-only'});
  }
  async function getReferenceCommentary(hexagramId,{position=null}={}){
    id(hexagramId,64,'hexagramId');if(position!==null)id(position,6,'linePosition');
    const d=await read(`sources/commentary/${String(hexagramId).padStart(2,'0')}.json`);
    if(d.hexagramId!==hexagramId||!d.trustScope?.startsWith('source-commentary-only'))throw new Error('Unexpected reference commentary provenance');
    return freeze({...d,groups:d.groups.filter(g=>position===null?g.key==='intro':g.position===position)});
  }
  return Object.freeze({getHexagram,getLine,getReadingDetails,getReferenceCommentary,getIndex:()=>read('data/details/index.json'),clearCache:()=>cache.clear()});
}
