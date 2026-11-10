import {loadLibrary,getVoidReleaseTargets} from '../src/index.js';
const lib=await loadLibrary();
const cast=lib.castByTimeParts({yearBranchNumber:5,lunarMonth:12,lunarDay:17,hourBranchNumber:9});
const r=lib.createReading({...cast,calendar:{monthBranch:'丑'},voidContext:{ganzhi:'甲子'},question:'演示观梅起例'});
console.log(JSON.stringify({body:r.body,use:r.use,stages:Object.values(r.stages).map(s=>({name:s.name,grade:s.baseGrade,caption:s.caption})),movingLine:r.selectedMovingLine,relations:r.edges,releaseTargets:getVoidReleaseTargets('甲子')},null,2));
