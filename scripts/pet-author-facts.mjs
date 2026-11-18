// Author aid: deterministic facts only. No prose, verdicts or timing are generated.
import {loadLibrary} from '../src/index.js';
import {createContextualReading, LOST_PET_RECOVERY_PROFILE} from '../src/interview-manuscripts.js';
const primaryId=Number(process.argv[2]);
if(!Number.isSafeInteger(primaryId)||primaryId<1||primaryId>64)throw Error('Pass one hexagram id (1–64).');
const library=await loadLibrary();
const question={id:LOST_PET_RECOVERY_PROFILE.questionId,question_type:LOST_PET_RECOVERY_PROFILE.questionType,mode:'narrative'};
for(let movingLine=1;movingLine<=6;movingLine++){
 const readings=['寅','巳','申','亥','辰'].map(monthBranch=>createContextualReading({
  library,question,primaryId,movingLine,monthBranch,castingDate:'2026-11-18',applyVoid:false,
 }));
 const r=readings[0];
 console.log(JSON.stringify({
  primaryId,movingLine,stages:Object.values(r.stages).map(s=>({id:s.id,name:s.name})),
  line:{text:r.selectedMovingLine.text,image:r.selectedMovingLine.image,sourceRef:r.selectedMovingLine.sourceRef},
  bodySide:r.body.side,useSide:r.use.side,
  relations:r.edges.map(e=>({role:e.targetRole,relation:e.type})),
  qi:readings.map(x=>({monthOrder:x.monthOrder,nodes:x.nodes.filter(n=>n.role!=='body_inherited').map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state}))})),
  voidApplied:false,proseGenerated:false,
 }));
}
