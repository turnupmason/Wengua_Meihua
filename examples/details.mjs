import {loadLibrary,createDetailsRepository} from '../src/index.js';
const library=await loadLibrary(),details=createDetailsRepository({library});
const reading=library.createReading({primaryId:55,movingLine:1});
const d=await details.getReadingDetails(reading);
console.log(JSON.stringify({primary:d.primary.name,mutual:d.mutual.name,changed:d.changed.name,selected:d.selectedMovingLine,grade44:library.getHexagram(44).grade.rawGrade},null,2));
