import {loadLibrary,createNarrativeRepository} from '../src/index.js';
const lib=await loadLibrary(),narratives=createNarrativeRepository({library:lib});
const result=await narratives.getStory({primaryId:49,movingLine:1,monthOrder:'spring-wood',domainId:'domain-10',voidContext:{ganzhi:'甲子'},timingScale:'day'});
console.log(result.story);
console.log('\n应期依据：',JSON.stringify(result.timing,null,2));
