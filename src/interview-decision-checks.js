export const INTERVIEW_DECISION_POLICY_VERSION='interview-evidence-1.0.0';
export function checkInterviewShort(text){
 if(typeof text!=='string'||!text.trim()||/应期|吉应|凶应|窗口|候选日期|起卦|换算|计算说明|计算依据|卦气|月令|旬空|半空|干支/.test(text))
  throw new Error('Interview short reading must use natural prose; timing and calculation belong in separate fields.');
 return {status:'passed',scope:'no-timing-or-calculation-directions-in-short-prose'};
}
// A consistency gate for this project's application of 求名占 to one interview stage.
// It rejects unsupported favourable reversals; it is not a universal outcome calculator.
export function checkInterviewDecision(reading,authored){
 const use=reading.edges.find(e=>e.targetRole==='use');
 const end=reading.edges.find(e=>e.targetRole==='changed_use');
 const generators=reading.edges.filter(e=>e.type==='use_generates_body').map(e=>e.targetRole);
 const adverseLine=/凶|无攸利/.test(reading.selectedMovingLine.text);
 const conflict=use?.type==='use_controls_body'&&generators.length===0;
 const strictControl=authored.decisionPolicy?.strictControl===true;
 const controllingRoles=strictControl?reading.edges.filter(e=>e.type==='use_controls_body').map(e=>e.targetRole):[];
 const noGenerationWithControl=controllingRoles.length>0&&generators.length===0;
 if(conflict&&authored.outcome.startsWith('pass'))
  throw new Error('Unsupported favourable reversal: 用克体且无直接生体; 旺体或互卦比和 alone does not establish success (mh-071;mh-116).');
 if(noGenerationWithControl&&authored.outcome.startsWith('pass'))
  throw new Error('Unsupported favourable reversal: 无生体而有克体，旺体、比和及弱克不足以支持通过 (mh-116).');
 const clauses={use_controls_body:{text:'用克体，名不可成。',sourceId:'mh-071'},body_generates_use:{text:'体生用，名不可就，或因名有丧。',sourceId:'mh-071'},
  use_generates_body:{text:'用生体，名易成，或因名有得。',sourceId:'mh-071'},body_controls_use:{text:'体克用，名可成，但成迟。',sourceId:'mh-071'},equal:{text:'体用比和，功名称意。',sourceId:'mh-071'}};
 return {policyVersion:INTERVIEW_DECISION_POLICY_VERSION,scope:'project-interview-stage-application;not-an-automatic-classical-verdict',
  use:{relation:use.type,...clauses[use.type]},end:{relation:end.type,...clauses[end.type]},
  generatingRoles:generators,movingLineAdverseTerms:adverseLine,
  noGenerationWithUseControl:conflict,
  ...(strictControl?{controllingRoles,noGenerationWithControl}:{}),
  reliefIsNotAttainment:conflict||noGenerationWithControl?{sourceIds:['mh-071','mh-116','mh-119'],reason:'旺体、克体气衰、互卦比和可减轻牵制，未另有成就依据时不翻为通过。'}:null,
  authorResolution:authored.counterevidence,independentReviewStatus:'pending'};
}
