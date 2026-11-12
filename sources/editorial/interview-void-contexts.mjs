import {createInterviewReading} from '../../src/interview-manuscripts.js';

const roles={body:'原体',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
const relations={equal:'与原体比和',use_generates_body:'生原体',use_controls_body:'克原体',body_generates_use:'受原体所生',body_controls_use:'受原体所克'};
const sourcePath='sources/editorial/interview-void-contexts.mjs';
const pass='pass-with-conditions',hard='not-pass-this-round';
const caseAt=(castingDate,outcome,reason,timingRole=null)=>({castingDate,outcome,reason,timingRole});

// Each reason and outcome is written for the exact effects on its representative day.
const authored=[
 {primaryId:12,movingLine:1,cases:[
  caseAt('2026-11-11',pass,'开头坤土的生扶因未位减弱，过程仍有完整的艮土生体可以接续。乾体虽然弱，末段震木较弱且受体所克，要求仍有主动核实的余地。依初六守正而相连之意，解释扎实仍有望通过。','use_mutual'),
  caseAt('2026-11-16',pass,'体互巽木静待落实，原体要处理的中段事项暂时搁住。本用坤土和用互艮土都能生体，乾金有承接条件。末段震木仍可处理，按初六守正相连之意，按实回应仍有望通过。','use_mutual'),
  caseAt('2026-11-21',pass,'体互巽木得扶，过程事项可能再被提起。坤土与艮土的两处生扶仍有效，能接住追加说明。最后还有主动核对要求的余地。初六的有利条件在于据实配合，做到这一点仍有望通过。','use_mutual'),
  caseAt('2026-11-26',pass,'艮土寅位减力，中段接续的帮助变弱，前段坤土仍能生体。变用震木逢卯但发动，最后仍需实际回应这一项要求。守住事实和已经建立的配合，仍有望通过。','use'),
  caseAt('2026-12-06',pass,'艮土丑位减力，第二段的接力会弱一些。坤土的前段生扶仍在，末段震木也在较弱而可处理的状态。把开头已核实的经验带到最后确认，仍有望通过。','use'),
  caseAt('2026-12-16',hard,'乾体戌亥均命中，坤土的动助使其得扶待落实。两处土助可以让问答继续，乾体对最后震木要求的处理仍有待落实。初六的守正相连支持继续沟通，本轮通过仍偏难。','use_mutual'),
  caseAt('2026-12-26',pass,'坤土申位减力，最初生体支持会打折，过程仍有艮土接上。震木末段要求尚可逐项澄清，初六所说的同向配合仍有着力处，把需要说明的要求答完整仍有望通过。','use_mutual'),
 ]},
 {primaryId:12,movingLine:2,cases:[
  caseAt('2026-11-11',hard,'未位使坤土本用的生扶减弱，艮土还能在过程补上部分帮助。末后坎水仍泄弱金，补件或解释会继续花力气。六二提醒审清顺承的边界，前后合看，本轮通过偏难。','use_mutual'),
  caseAt('2026-11-16',pass,'巽木体互静待，中段这一项要处理的事暂缓，坤土和艮土的生扶保持完整。末段坎水囚而仍有耗费。六二的条件在于依岗位实情配合，控制追加说明的范围，这轮仍有望通过。','use_mutual'),
  caseAt('2026-11-21',pass,'巽木体互得扶待落实，过程仍可能回到原有要求。坤土、艮土都能生体，给解释留出余地。末段坎水的耗费较轻。依六二分清顺承的条件，有边界地配合仍有望通过。','use_mutual'),
  caseAt('2026-11-26',hard,'艮土寅位减力，中段对弱金的接续不足。开头坤土还能帮一程，末后坎水依旧耗体，尚需继续投入。六二的利处有条件，愿意顺承仍难抵消末段耗费，本轮通过偏难。','use'),
  caseAt('2026-12-06',hard,'艮土丑位减力，过程帮助变薄。变用坎水虽逢子而发动，末段仍会耗金，不能靠静候省下这段投入。六二重在把握顺承的限度，前段助力不足以支撑本轮通过。','use'),
  caseAt('2026-12-16',hard,'乾金戌亥均命中，有本用坤土相扶，承接仍待落实。艮土能帮补说明，末后坎水仍耗体。六二提示有条件地配合，原体未稳而末段还需投入，这轮通过偏难。','use_mutual'),
  caseAt('2026-12-26',hard,'本用坤土申位减力，开头支持变浅，艮土生扶主要留在过程。末段坎水的耗费继续存在。六二提醒把能承担的要求说清楚，现有配合难以补足后段，本轮通过偏难。','use_mutual'),
 ]},
 {primaryId:12,movingLine:3,cases:[
  caseAt('2026-11-11',hard,'坤土未位减力，开头托举较少。用互和变用的艮土仍能生弱金，帮助集中在补清事实和纠正回答。六三包羞的警戒仍在，修正有余地，本轮通过偏难。','changed_use'),
  caseAt('2026-11-16',hard,'体互巽木静待，中段待处置的事项暂缓。坤土、用互艮土和变用艮土仍可生体。六三所指的核心不足仍需要当面交代，减少一处牵绊和得到帮助都利于修正，本轮通过偏难。','changed_use'),
  caseAt('2026-11-21',hard,'体互巽木得扶待落实，原先中段尚未处理的事项可能再出现。两处艮土能扶弱金，也给补充说明留下机会。六三包羞警告含混带过问题，补救尚难支撑这轮通过。','changed_use'),
  caseAt('2026-11-26',hard,'用互与变用都是艮土，寅位同受半空减力，过程和收尾的生扶都减弱。开头坤土仍有帮助，无法替代后两段的承接。六三包羞提示把不足讲明，本轮通过偏难。','use'),
  caseAt('2026-12-06',hard,'用互与变用艮土同中丑位，后两段生扶均减力。原体乾金失令，当前更多能借本用坤土说明清楚起初的疑点。六三包羞所示的问题仍待纠正，本轮通过偏难。','use'),
  caseAt('2026-12-16',hard,'乾金戌亥均命中，动用坤土来生，原体得扶待落实。艮土还可以在后续帮着澄清，弱体对帮助的承接依然有条件。六三包羞之戒落在如实面对不足，本轮通过偏难。','changed_use'),
  caseAt('2026-12-26',hard,'坤土申位减力使开头助力变小，完整的艮土生扶主要落在中后段。六三包羞提示及早说明关键缺口，后续的帮助偏向补救，本轮通过仍偏难。','changed_use'),
 ]},
 {primaryId:25,movingLine:1,cases:[
  caseAt('2026-11-11',hard,'末段坤土未位减力，收尾生扶变弱。艮土在中段还能帮忙，失令乾金从开头就需要自行处理震木要求。初九往吉以据实应对为条件，末后承接不足，这轮通过偏难。','use_mutual'),
  caseAt('2026-11-16',pass,'体互巽木静待，原体在中段要处理的事项暂缓，用互艮土和变用坤土仍完整生体。虽起初要自己回应，后段有力接续，依初九无妄如实陈述，这轮有望通过。','changed_use'),
  caseAt('2026-11-21',pass,'巽木得扶待落实，过程要求可能重新提起。用互艮土的生扶仍能接住追问，末段也有坤土来生。依初九无妄把已有经验答实，后段仍有望走到通过。','changed_use'),
  caseAt('2026-11-26',pass,'本用震木逢卯而发动，开头要处理的要求依旧存在。用互艮土寅位减力，过程的帮助偏少，末后坤土完整生体。依初九无妄如实补足说明，仍有望通过。','changed_use'),
  caseAt('2026-12-06',pass,'用互艮土丑位减力，中段较难把帮助接足。开头要主动处理要求，最后仍有完整的坤土生体接续。初九无妄重在答有凭据，守住这个条件仍有望通过。','changed_use'),
  caseAt('2026-12-16',hard,'乾金原体戌亥全中且静待落实，开头对震木要求的掌握受限。艮土、坤土可提供接续和后援，帮助仍需原体能接住才可落实。初九往吉可取据实准备，本轮通过偏难。'),
  caseAt('2026-12-17',hard,'乾金原体得扶而待落实，已有承接线索，起步仍容易迟滞。中段艮土及末段坤土给了补足机会。初九利于如实进取，整体仍取通过偏难，宜先把能兑现的事项答清。'),
  caseAt('2026-12-26',hard,'坤土申位减力，末后的直接生扶变弱。中段艮土有助回应，开头至过程仍由弱金主动处理木方要求。初九的往吉保留如实作答的条件，最后确认仍难，这轮通过偏难。','use_mutual'),
 ]},
 {primaryId:31,movingLine:3,cases:[
  caseAt('2026-11-11',hard,'末段坤土未位减力，收尾帮助变小。艮土还能在开头生体，乾金互卦同弱，协调基础有限。九三执随往吝，若顺着追问反复改变立场更难落实，本轮通过偏难。','use'),
  caseAt('2026-11-16',hard,'巽木用互静待，补充说明中这一项要求暂缓。艮土和坤土仍能帮助开头与收尾，乾金体互比和但弱。九三警戒一味跟随，暂缓只给重新梳理的余地，本轮通过偏难。','changed_use'),
  caseAt('2026-11-21',hard,'巽木用互得扶待落实，过程中待说明的要求仍可能重提。乾金体互同弱，前后虽有土生也宜用于稳住答案。依九三执随往吝，本轮通过偏难。','changed_use'),
  caseAt('2026-11-26',hard,'本用艮土寅位减力，开头生体的支持变小。末段坤土仍能帮忙收束，中段同弱比和承接有限。九三戒随人改口，后援主要帮助说明清楚，本轮通过偏难。','changed_use'),
  caseAt('2026-12-06',hard,'本用艮土丑位减力，弱兑金在前段更难借力。末段坤土仍能帮补材料，中段依旧需要自行说明木方要求。九三的执随之戒未解，这轮通过偏难。','changed_use'),
  caseAt('2026-12-16',hard,'体互乾金戌亥全中，得扶待落实，中段比和的协作难即时到位。艮、坤两处生体仍在，可用于首尾澄清。九三警戒随人改口，过程支持偏弱，本轮通过偏难。','changed_use'),
  caseAt('2026-12-26',hard,'原体兑金酉位得扶待落实，末段坤土又因申位减力。开头艮土仍能帮，体的承接与收尾帮助同时受限。九三的执随之戒更须重视，本轮通过偏难。','use'),
 ]},
 {primaryId:33,movingLine:3,cases:[
  caseAt('2026-11-11',hard,'坤土未位减力，末段生扶变弱。艮土在前段仍能生体，体互乾金同弱，只提供有限协调。九三系遯有厉，宜缩小牵连，收尾支持不足，本轮通过偏难。','use'),
  caseAt('2026-11-16',pass,'巽木用互静待，中段要处理的一项要求暂缓，艮土和坤土可分别扶住开头与收尾。九三有厉也有安置得当的有利条件，讲清职责范围，这轮有望通过。','changed_use'),
  caseAt('2026-11-21',pass,'巽木用互得扶待落实，追加事项可能再起。前段艮土能生体，末段坤土亦保有生扶。依九三有厉而宜先安顿牵连之意，及时厘清职责仍有望通过。','changed_use'),
  caseAt('2026-11-26',pass,'艮土寅位减力，开头的生扶偏弱，中段同弱比和只给有限协调。末后坤土完整生体，能接住必要确认。依九三把分工和附带条件定清，仍有望通过。','changed_use'),
  caseAt('2026-12-06',pass,'艮土丑位减力，前段不易借到完整的帮助。乾金有处理事项的余地，末段仍由完整的坤土生扶。把九三所戒的额外牵连在问答中收拢，仍有望通过。','changed_use'),
  caseAt('2026-12-16',hard,'原体与体互乾金同逢戌亥，均得扶待落实。艮土能生，坤土仍有后援，原体承接和过程协调却都迟滞。九三系遯有厉，现有支持适合澄清范围，本轮通过偏难。','changed_use'),
  caseAt('2026-12-26',hard,'变用坤土申位减力，末段有帮但不足。开头艮土可以协助说明，体互同弱比和也能有限配合。九三系遯的牵连尚待解除，缺少足够的收尾支持，本轮通过偏难。','use'),
 ]},
];

const stageHelp={use:['本轮面试开头的问答获得回应','开头的问答可能较易获得回应'],use_mutual:['本轮面试中段的补充沟通获得回应','中段的补充沟通可能较易得到回应'],changed_use:['本轮面试末段的条件确认获得协助','末段的条件确认可能得到协助']};

export function authorInterviewVoidContexts({library,question,ledger}){
 return authored.flatMap(({primaryId,movingLine,cases})=>cases.map(({castingDate,outcome,reason,timingRole})=>{
  const monthOrder='summer-fire';
  const reading=createInterviewReading({library,question,primaryId,movingLine,monthOrder,castingDate});
  const line=ledger.get(`${primaryId}/${movingLine}`);
  const facts={};
  const coreVoidNotes=[];
  for(const n of reading.nodes.filter(n=>n.role!=='body_inherited')){
   const role=roles[n.role],name=n.trigram+n.element;
   const relation=reading.edges.find(e=>e.targetRole===n.role)?.type;
   const impact={reduced:'这一处作用减弱，仍参与判断。',conditional:'虽有生扶，实际作用尚待落实。',dormant:'这一处作用暂缓，待条件落实。',active:'本身仍有作用。'}[n.void.effective];
   facts[n.role]=`${role}${name}在巳午月属${n.strength.state}${relation?'，'+relations[relation]:''}。`+(n.void.hit?impact:'');
   if(n.void.hit)coreVoidNotes.push(`${role}${name}命中${n.void.matchedBranches.join('、')}，${n.void.label}。`);
  }
  const xun=reading.nodes.find(n=>n.role==='body').void.xun.xunHead;
  const lead=outcome===pass?'这轮面试有望通过。':'这轮面试通过偏难。';
  const [event,timingText]=stageHelp[timingRole]||[];
  return {primaryId,movingLine,monthOrder,castingDate,outcome,voidScenario:{xun},baseNoVoid:false,
   title:lead.slice(0,-1)+'，'+line.advice.split(/[，。]/u)[0],
   short:reason.replace('同受半空减力','同样减力')+line.advice,
   opening:facts.body+facts.use,process:facts.body_mutual+facts.use_mutual,
   ending:facts.changed_use+`${reading.selectedMovingLine.label}爻辞为“${line.fullText}”${line.meaning}`+reason,
   summary:lead+line.advice,
   lineApplication:{evidence:[line.fullText],conditions:[line.meaning,'结合本轮面试与实际旬空作用逐案判断。'],sourcePath},
   counterevidence:[{fact:Object.values(facts).join('')+coreVoidNotes.join(''),resolution:reason}],coreVoidNotes,
   authorship:{method:'individually-authored-void-context',version:'interview-void-context-1.0.0',lineSource:sourcePath,manualWholeArticleReview:true},
   decisionPolicy:{id:'exact-void-context',sourceIds:['mh-071','mh-101','mh-116','mh-117','mh-119','user-void-extension','user-void-timing'],scope:'exact-profile-and-single-interview-stage'},
   timing:timingRole?[{id:'stage-support',kind:'support',role:timingRole,event,valence:'吉',eventScope:timingRole==='changed_use'?'closing-coordination':'process-repair',sourceIds:['mh-116','mh-117','mh-143'],ruleIds:['good-event'],prefix:'可留意',suffix:`，${timingText}，属阶段性吉应。`}]:[],
   ...(timingRole?{}:{timingOmission:{status:'not-derived',reason:'原体作用仍待落实，现有生扶可作补救，暂无足够依据为具体面试事件取期。',sourceIds:['mh-116','user-void-timing']}}),
  };
 }));
}
