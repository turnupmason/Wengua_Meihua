export type Element = '木'|'火'|'土'|'金'|'水';
export type Trigram = '乾'|'兑'|'离'|'震'|'巽'|'坎'|'艮'|'坤';
export type Branch = '子'|'丑'|'寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥';
export type Grade = '上上卦'|'中上卦'|'中中卦'|'中下卦'|'下下卦';
export type DisplayGrade = Grade|'中卦';
export type Stage = 'primary'|'mutual'|'changed';
export type RelationType = 'body_controls_use'|'use_controls_body'|'body_generates_use'|'use_generates_body'|'equal';
export interface SourceRef {sourceId:string;startChar:number;endChar:number;startLine:number;endLine:number}
export interface Passage {text:string;vernacular:string;image:string;imageVernacular:string}
export interface LineReading extends Passage {id:string;label:string;position:number|null;sourceRef:SourceRef;referenceId:string;referenceUrl:string}
export interface Hexagram {id:number;name:string;shortName:string;aliases:readonly string[];symbol:string;bitsBottomUp:readonly number[];upperTrigram:Trigram;lowerTrigram:Trigram;grade:{rawGrade:DisplayGrade;canonicalGrade:Grade;rawSourceGrade?:string;theme:string;poem:string;poemLabel:string;description:string;sourceRef:SourceRef};reading:Passage;lines:readonly LineReading[];specialLines:readonly LineReading[];patchIds:readonly string[];sourceRef:SourceRef;referenceUrl:string}
export interface Section {id:string;kind:'section'|'volume'|'part'|'frontmatter';volume:number|null;part:string|null;title:string;text:string;sourceRef:SourceRef}
export interface DomainPassage {quote:string;sectionId:string;sourceRef:SourceRef;status:string}
export interface Domain {id:string;title:string;sectionId:string;text:string;mode:string;sourceRef:SourceRef;relationPassages:Partial<Record<RelationType,DomainPassage>>}
export interface CalendarContext {season?:'spring'|'summer'|'autumn'|'winter'|'earth';monthBranch?:Branch}
export interface VoidOptions {ganzhi?:string;moving?:boolean;strength?:string;filledBranches?:Branch[];releaseClashBranches?:Branch[];combineBranches?:Branch[];supported?:boolean;severelyWeak?:boolean;dayMonthAttacked?:boolean;partialPolicy?:'mark-only'|'any-hit'|'all-hit'|'qualitative-reduction';allowCombine?:boolean;eventType?:'general'|'marriage'|'cooperation';basis?:string;roleEvidence?:Record<string,VoidOptions>}
export interface VoidAssessment {state:string;label:string;hit:boolean|null;effective:'active'|'conditional'|'suppressed'|'dormant'|'unknown'|'reduced';matchedBranches:Branch[];castingState?:string;releaseEvidence?:{branch:Branch;fill:boolean;clash:boolean;combine:boolean}[];releaseTargets?:ReleaseTarget[];combineEligible?:boolean;hitKind?:'none'|'partial'|'full'}
export interface ReleaseTarget {emptyBranch:Branch;fill:Branch;clash:Branch;combine:Branch}
export interface Relation {type:RelationType;label:string;phrase:string;bodyElement:Element;useElement:Element}
export interface Strength {state:'strong'|'weak'|'not_explicit'|'unresolved';label:string;element:Element;season?:string;monthBranch?:Branch|null;sourceSectionTitles:string[];note?:string;monthElement?:Element;monthRelation?:Relation}
export interface ReadingOptions {primaryId:number;movingLine:number;domainId?:string;calendar?:CalendarContext;voidContext?:VoidOptions;applyVoid?:boolean;mutualPolicy?:'inner-lines'|'pure-use-changed';question?:string;castId?:string|null}
export interface Reading {
 schemaVersion:string;contentVersion:string;primaryId:number;movingLine:number;mutualPolicy:string;castId:string|null;question:string;
 body:{trigram:Trigram;element:Element;side:'lower'|'upper'};use:{trigram:Trigram;element:Element;side:'lower'|'upper'};
 stages:Record<Stage,{stage:Stage;id:number;name:string;symbol:string;bitsBottomUp:number[];baseGrade:DisplayGrade;theme:string;caption:string;glowLine:number|null;correspondingChangedLine:number|null;detail:Hexagram}>;
 selectedMovingLine:LineReading&{hexagramId:number;position:number};
 nodes:ReadonlyArray<{id:string;stage:Stage;side:string;trigram:Trigram;element:Element;role:string;isBody:boolean;strength:Strength;supportEvidence:{basis:string;element:Element;kind:string;sourceIds:string[]}[];void:VoidAssessment}>;
 edges:ReadonlyArray<Relation&{from:string;to:string;targetRole:string;voidEffect:string;bodyVoidEffect:string;qualitativeNote:string;sourceSectionTitles:string[]}>;
 synthesis:Synthesis;
 domain:Domain;domainPassage:DomainPassage|null;contextualAssessment:{status:string;summary:string;missing:string[];baseGradesUnchanged:boolean};selectionPolicy:Record<string,unknown>;profile:Record<string,unknown>;
}
export interface Cast {primaryId:number;movingLine:number;upperNumber:number;lowerNumber:number;sourceSectionTitles:string[]}
export interface Library {
 contentVersion:string;getHexagram(id:number):Hexagram;getLineReading(id:number,line:number):LineReading;
 getChangedHexagram(id:number,line:number):Hexagram;getMutualHexagram(id:number,line?:number,policy?:'inner-lines'|'pure-use-changed'):Hexagram;
 getHexagramByBits(bits:number[]):Hexagram;createReading(options:ReadingOptions):Readonly<Reading>;
 castByTrigramNumbers(options:{upperNumber:number;lowerNumber:number;movingTotal:number}):Cast;
 castByTimeParts(options:{yearBranchNumber:number;lunarMonth:number;lunarDay:number;hourBranchNumber:number}):Cast;
 renderHexagramSVG(id:number,options?:{movingLine?:number|null;selectedLine?:number|null;stage?:Stage|'library';svgId?:string}):string;
 listHexagrams():readonly Hexagram[];listDomains():readonly Domain[];listSections():readonly Section[];
 getSection(id:string):Section|undefined;findSections(query:string):Section[];
}
export const TRIGRAM_BRANCHES:Readonly<Record<Trigram,readonly Branch[]>>;
export function relation(bodyElement:Element,useElement:Element):Relation;
export function getXunVoid(ganzhi:string):{ganzhi:string;xunHead:string;branches:Branch[];sourceId:string};
export function getVoidReleaseTargets(ganzhi:string):{ganzhi:string;xunHead:string;branches:Branch[];targets:ReleaseTarget[];priority:string[];combineDefaultEnabled:boolean;sourceId:string};
export function seasonalStrength(element:Element,context?:CalendarContext):Strength;
export function assessVoid(trigram:Trigram,options?:VoidOptions):VoidAssessment;
export function createLibrary(data:{catalog:unknown;sections:unknown;domains:unknown}):Library;
export function loadLibrary(options?:{readJSON?:(path:string)=>Promise<unknown>}):Promise<Library>;

export interface DetailedLine extends LineReading {
 position:number;hexagramId:number;canonicalLineId:string;commentaryPath:string;
 structure:{polarity:'yin'|'yang';positionType:'yin'|'yang';correctPosition:boolean;central:boolean;respondingPosition:number;oppositeResponse:boolean};
 changedHexagram:{id:number;name:string;bitsBottomUp:number[]};
 editorialNotes:{text:string;kind:string;evidence:Record<string,unknown>}[];
}
export interface DetailedHexagram extends Omit<Hexagram,'lines'> {lines:readonly DetailedLine[];detail:{hexagramId:number;name:string;baseGrade:DisplayGrade;evidenceScope:string;commentaryPath:string}}
export interface ReferenceCommentary {schemaVersion:string;contentVersion:string;hexagramId:number;name:string;trustScope:string;attributions:string;groups:{key:string;position?:number;label:string;sections:{title:string;paragraphs:{id:string;text:string;sourceRef:{sourceId:string;part:string;paragraphId:string;bodyParagraph:number};patchIds:string[];contentKind:string}[]}[]}[]}
export interface DetailsRepository {
 getHexagram(id:number):Promise<DetailedHexagram>;getLine(id:number,position:number):Promise<DetailedLine>;
 getReadingDetails(reading:Reading):Promise<{contentVersion:string;primary:DetailedHexagram;mutual:DetailedHexagram;changed:DetailedHexagram;selectedMovingLine:DetailedLine;selectionPolicy:string}>;
 getReferenceCommentary(id:number,options?:{position?:number|null}):Promise<ReferenceCommentary>;
 getIndex():Promise<unknown>;clearCache():void;
}
export function createDetailsRepository(options:{library:Library;readJSON?:(path:string)=>Promise<unknown>}):DetailsRepository;
export type SynthesisTone='favorable'|'draining'|'adverse';
export interface SynthesisRelation {role:'use'|'body_mutual'|'use_mutual'|'changed_use';title:string;trigram:string;element:string;type:RelationType;label:string;stageLabel:string;tone:SynthesisTone;voidEffect:string}
export interface SynthesisStage {stage:'use'|'mutual'|'changed';hexagramStage:'primary'|'mutual'|'changed';word:string;scope:string;evidence:string;tone:SynthesisTone;main:SynthesisRelation;secondary:SynthesisRelation|null;phrase:string}
/** 用 → 互 → 变 synthesis against the fixed 体卦 (用 weighs most, then 互, then 变). */
export interface WeatherReading {headline:string;summary:string;counts:Record<string,number>;top:readonly string[];stoneLine:string;notes:ReadonlyArray<{kind:string;text:string}>;stages:ReadonlyArray<{stage:'use'|'mutual'|'changed';hexagramStage:'primary'|'mutual'|'changed';trigrams:readonly string[];images:readonly string[];phrase:string}>}
export type Synthesis = {ruleId:string;applicable:false;reason:string;weather:WeatherReading;stages:readonly [];notes:readonly [];sourceSectionTitles:readonly string[]}
  | {ruleId:string;applicable:true;order:readonly string[];lead:SynthesisTone;leadText:string;headline:string;stoneLine:string;verdict:SynthesisVerdict;evidenceSummary:string;compact:readonly [string,string,string];classical:string|null;summary:string;stages:readonly SynthesisStage[];notes:ReadonlyArray<{kind:string;text:string}>;sourceSectionTitles:readonly string[]};
/** Overall answer; `template` contains {outcome}. */
export interface SynthesisVerdict {code:string;conflict:boolean;template:string;caveat:string|null;conditions:readonly string[]}

export type MonthOrderId='spring-wood'|'summer-fire'|'autumn-metal'|'winter-water'|'seasonal-earth';
export interface MonthOrder {id:MonthOrderId;label:string;season:'spring'|'summer'|'autumn'|'winter'|'earth';strong:Element;weak:Element;opening:string}
export const MONTH_ORDERS:readonly Readonly<MonthOrder>[];
export interface NumericalCastContext {method:'object-direction-hour';objectTrigramNumber:number;directionTrigramNumber:number;hourBranchNumber:number;motion:'walking'|'standing'|'sitting'}
export interface TimingContext {castingMethod?:'pre-heaven'|'post-heaven'|'manual';periodMethod?:'element-qi'|'trigram-periods'|'numerical';numericalApplicability?:boolean;eventWindow?:'today';eventKind?:'office-risk'}
export interface TimingEventPeriod {method:string;branches:readonly Branch[];scope?:string;periodText?:string;sourceIds:readonly string[]}
export interface AuditedTimingEvent {id:string;role:string;stage:Stage|null;relation:string;trigram?:Trigram;element?:Element;event:string;valence:string;ruleIds:readonly string[];sourceIds:readonly string[];periods:readonly TimingEventPeriod[];eligible:boolean;status:string;scope:string;outcomeKind?:string;voidState?:string;monthStrength?:string}
export interface DomainTimingProfile {id:string;label:string;sectionId:string;mode:string;note:string;eventLabels:Record<RelationType,string>;directRuleIds:readonly string[];generalRuleIds:readonly string[];clinicalReferenceOnly:boolean;noAutomaticCompletionDate:boolean}
export const TIMING_AUDIT_VERSION:string;
export const DOMAIN_TIMING_SPECS:readonly DomainTimingProfile[];
export const GLOBAL_TIMING_RULES:readonly {id:string;sectionId:string;quote:string;application:string}[];
export const TRIGRAM_PERIOD_SPECS:readonly {trigram:Trigram;sectionId:string;quote:string;branches:readonly Branch[];scales:readonly string[];numericTermsStatus:string}[];
export interface VoidTimingPrerequisite {role:string;state:string;fillBranches:readonly Branch[];clashBranches:readonly Branch[];sourceLayer:string;provesFulfilment:false}
export interface TimingWindow {role:string;branch:Branch;afterDays?:number;calendarOnly?:boolean;selectedAsEventDate?:false;condition:string;mechanism?:'fill'|'clash'|'combine';priority?:number;kind?:'support'|'equal'|'pressure'|'release-state';event?:string;valence?:string;sourceLayer?:string;provesFulfilment?:false;active?:boolean}
export interface TimingPlan {auditVersion:string;status:string;domainTimingProfile:DomainTimingProfile;events:readonly AuditedTimingEvent[];waitingForVoid:readonly VoidTimingPrerequisite[];referenceMethods:readonly Record<string,unknown>[];relativePace:readonly {role:string;pace:string;sourceIds:string[];absoluteDays:null}[];obstructionDurations:readonly {role:string;trigram:Trigram;count:number;unit:string;kind:string;event:string;sourceIds:string[];eventDate:null;notAdditive:boolean}[];calendarOccurrences:readonly {eventId:string;event:string;valence:string;periodMethod:string;branch:Branch;nextAfterDays:number;kind:string;selectedAsEventDate:false;sourceLayer:string;gregorianDate:null}[];context:TimingContext;missing:readonly string[];dateSelection:{status:string;reason:string};sourceLayers:Record<string,unknown>;basis:string;scale:'day'|'month'|'year'|'hour'|null;dayGanzhi:string|null;voidBasis:string;voidGanzhi:string|null;voidWindows:readonly TimingWindow[];qiWindows:readonly TimingWindow[];blocked:readonly {role:string;state:string;reason:string}[];text:string;sourceIds:string[];priority:string[];gregorianDates:readonly [];reportedOutcome:null;numericalWindow:{rawTotal:number;motion:string;count:number;unit:string;status:string;sourceIds:string[];certainty:string;canTimeAdverseOutcome:boolean;cannotReviveTrueVoid:boolean;eventWindow:string|null;applicability:string}|null}
export interface StoryOptions {primaryId:number;movingLine:number;monthOrder:MonthOrderId;domainId?:string;voidContext?:VoidOptions;timingScale?:'day'|'month'|'year'|'hour'|null;castContext?:NumericalCastContext|null;timingContext?:TimingContext;question?:string;mutualPolicy?:'inner-lines'}
export interface BaseStory {id:string;primaryId:number;movingLine:number;monthOrder:MonthOrderId;stageIds:number[];baseGrades:DisplayGrade[];paragraphs:string[];story:string;scope:string;sourceIds:string[]}
export interface StoryVerdict {code:string;summary:string;ruleId:string;sourceIds:string[];reasons?:string[];finalRelation?:RelationType;basisQuote?:string|null;status?:string;linePolicy?:string;relationEvidence?:{role:string;type:RelationType;strength:string;voidState:string}[]}
export interface StoryMovingLine {hexagramId:number;position:number;label:string;text:string;explanation:string;fromTrigram:Trigram;toTrigram:Trigram;fromRelation:RelationType;toRelation:RelationType;sourceRef:SourceRef;editorialNote:boolean}
export interface StoryTimingDecision {kind:string;voidPrerequisites?:readonly VoidTimingPrerequisite[];event?:{id?:string;label:string;valence:string}|null;missing?:readonly string[];sourceIds?:readonly string[];period?:(TimingEventPeriod&{unit:string|null;selectedCycle:null});windows:readonly TimingWindow[];secondary?:readonly TimingWindow[];text:string}
export interface StoryReading {id:string;contentVersion:string;narrativeVersion:string;compositionVersion:string;monthOrder:Readonly<MonthOrder>;domainId:string;reading:Reading;fullChart:Readonly<FullChartRelations>;baseStory:string;verdict:StoryVerdict;movingLine:StoryMovingLine;timingDecision:StoryTimingDecision;paragraphs:string[];story:string;voidNotes:{role:string;state:string;text:string;sourceIds:string[]}[];timing:TimingPlan;scope:string;reportedOutcome:null;baseGradesUnchanged:boolean}
export interface ClassicalCase {id:string;title:string;sourceSectionId:string;sourceText:string;sourceRef:SourceRef;prediction:{text:string;status:string};feedback:{text:string;status:string}|null;charts:{primaryId:number;movingLine:number;mutualId:number;changedId:number;input:Record<string,unknown>}[];timing:Record<string,unknown>;auditNotes:string[];reusePolicy:string}
export interface NarrativeRepository {getBase(options:Pick<StoryOptions,'primaryId'|'movingLine'|'monthOrder'|'mutualPolicy'>):Promise<BaseStory>;getStory(options:StoryOptions):Promise<StoryReading>;getClassicalCases(filter?:{primaryId?:number;movingLine?:number}):Promise<readonly ClassicalCase[]>;getIndex():Promise<unknown>;clearCache():void}
export function createNarrativeRepository(options:{library:Library;readJSON?:(path:string)=>Promise<unknown>}):NarrativeRepository;
export function buildTimingPlan(reading:Reading,options?:{timingScale?:'day'|'month'|'year'|'hour'|null;castContext?:NumericalCastContext|null;timingContext?:TimingContext}):TimingPlan;
export function selectAuditedTiming(reading:Reading,plan:TimingPlan,verdict:Pick<StoryVerdict,'code'>):StoryTimingDecision;

export interface CivilDay {date:string;dayGanzhi:string;dayBranch:Branch}
export function getCivilDay(date:string):Readonly<CivilDay>;
export function formatCivilDay(date:string):string;
export function findCivilDayMatches(options:{startDate:string;endDate:string;branches:readonly Branch[]}):readonly Readonly<CivilDay&{display:string;kind:'calendar-match';selectedAsEventDate:false}>[];
export function formatUpcomingCivilDay(date:string,options:{castingDate:string;viewDate?:string}):string;
export interface UpcomingCivilDay extends CivilDay {display:string;kind:'calendar-match';selectedAsEventDate:false;monthOffset:0|1;storyDisplay:string}
export interface UpcomingCivilDayMatches {castingDate:string;monthOffset:0|1|null;matches:readonly Readonly<UpcomingCivilDay>[];selectedCycle:null;scope:'calendar-candidates-only'}
export function findUpcomingCivilDayMatches(options:{castingDate:string;branches:readonly Branch[];isEligible?:(day:Readonly<CivilDay&{display:string;kind:'calendar-match';selectedAsEventDate:false}>)=>boolean}):Readonly<UpcomingCivilDayMatches>;
export interface FullChartRelations {rootBodyId:string;rootTrigram:Trigram;rootElement:Element;visiblePositions:6;rootBodyCount:1;independentNodeIdentities:number;nodes:ReadonlyArray<Reading['nodes'][number]&{label:string;entityId:string;rootBodyId:string;isInheritedBody:boolean}>;pairs:readonly {a:string;b:string;aRole:string;bRole:string;aTrigram:Trigram;bTrigram:Trigram;type:RelationType;kind:'equal'|'generates'|'controls';from:string|null;to:string|null;sameEntity:boolean;assessments:readonly unknown[];usage:string;sourceIds:string[]}[];chains:readonly {kind:string;nodes:string[];sourceIds:string[];usage:string}[];sourceIds:readonly string[];numericEnergyScore:null}
export function buildFullChartRelations(reading:Reading):Readonly<FullChartRelations>;

export interface FixedQuestion {question_type:string;interpretationReview:string;id:string;domainId:string;position:number;question:string;answerBrief:string;positiveEvent:string;adverseEvent:string;mode:'narrative'|'reference';timingPolicy:string;sourceIds:string[];sourceApplication:string;ruleReview:string;contentStatus:'reference-written'|'full-story-pending'|'base-written';referenceParagraphs?:string[]}
export interface QuestionCatalog {schemaVersion:'1.0.0';catalogVersion:string;contentVersion:string;count:90;domainCount:18;narrativeCount:75;referenceCount:15;selectionPolicy:{input:'domain-and-fixed-question-only';freeText:false;aiClassification:false;questionsPerDomain:5;multiQuestion:false;unknownQuestion:'reject';missingStory:'pending-no-domain-fallback'};domains:{id:string;label:string;sourceSectionId:string;mode:'narrative'|'reference';items:FixedQuestion[]}[]}
export interface FixedQuestionOptions {questionId:string;domainId?:string;primaryId?:number;movingLine?:number;monthOrder?:MonthOrderId;question_type?:string;voidContext?:VoidOptions;castingDate?:string;viewDate?:string;timingScale?:'day'|'month'|'year'|'hour';timingContext?:TimingContext}
export interface ManuscriptVerdict {code:string;result:string;reason:string;protected?:boolean}
export interface ManuscriptDateSlot {id:string;token:string;branches:Branch[];prefix:string;suffix:string;event:string;valence:string;sourceIds:string[];displayLimit:number;emptyText:string}
export interface ManuscriptTimingBasis {role:string;trigram:Trigram;element:Element;directRelation:RelationType;method:string;scale:string;ruleIds:readonly string[];sourceIds:readonly string[];interpretationReview:string;independentInterpretationReview:'pending'}
export interface ManuscriptDateWindow {text?:string;slotId:string;event:string;valence:string;sourceIds:string[];matches:readonly UpcomingCivilDay[];displayedDates:string[];selectedCycle:null;kind:'calendar-candidates';eventScope?:string;targetBranches?:Branch[];calculationBasis?:Readonly<ManuscriptTimingBasis>}
export interface ManuscriptDateResolution {interpretationReviewed?:boolean;independentInterpretationReview?:'pending';status:'requires-context'|'resolved';missing?:string[];paragraphs:string[];castingDate?:string;dayGanzhi?:string;dateMatches:ManuscriptDateWindow[]}
export interface FixedQuestionContent {status:'reference'|'pending-authoring'|'pending-review'|'review-preview'|'authored-base'|'ready';productionAllowed?:boolean;audit?:InterpretationReview;binding?:Readonly<Record<string,unknown>>;reason?:string;evidence?:InterpretationEvidence;selection:{question_type:string;questionId:string;domainId:string;question:string;answerBrief:string;positiveEvent:string;adverseEvent:string;timingPolicy:string;ruleReview:string};paragraphs:readonly string[];story:string|null;reading?:Reading;key?:string;contextKey?:string;profileKey?:string|null;sourceSections?:unknown[];sourceIds?:string[];requiresDateResolution?:boolean;verdict?:ManuscriptVerdict;dateResolution?:ManuscriptDateResolution;manuscriptVersion?:string;reportedOutcome:null}
export interface QuestionRepository {getCatalog():Promise<Readonly<QuestionCatalog>>;getQuestion(id:string):Promise<Readonly<FixedQuestion>>;listQuestions(domainId:string):Promise<readonly Readonly<FixedQuestion>[]>;getContent(options:FixedQuestionOptions):Promise<Readonly<FixedQuestionContent>>;clearCache():void}
export function createQuestionRepository(options:{library:Library;readJSON?:(path:string)=>Promise<unknown>;editorialPreview?:boolean}):QuestionRepository;
export function questionStoryContextKey(reading:Reading):string;
export function getVoidProfileKey(reading:Reading):string;
export function unpackManuscript(file:{textPool:string[];verdictPool:ManuscriptVerdict[];timingPool:ManuscriptDateSlot[][];sourceIds:string[]},record:{paragraphIds:number[];verdictId:number;timingId:number}):{paragraphs:string[];verdict:ManuscriptVerdict;dateSlots:ManuscriptDateSlot[];sourceIds:string[]};
export function resolveManuscriptDates(options:{paragraphs:string[];dateSlots:ManuscriptDateSlot[];reading:Reading;castingDate?:string;viewDate?:string;timingScale?:'day'|'month'|'year'|'hour';timingContext?:TimingContext}):ManuscriptDateResolution;

export const INTERPRETATION_POLICY_VERSION:'interpretation-2.0.0';
export const AUDIT_CHECKS:readonly string[];
export interface SeasonalQi {element:Element;monthOrder:MonthOrderId;governor:Element;state:'旺'|'相'|'休'|'囚'|'死';policyVersion:string;sourceLayer:string;numericMultiplier:null;impliesNoEffect:false;impliesTrueVoid:false}
export interface InterpretationEvidence {policyVersion:string;monthOrder:MonthOrderId;nodes:readonly {id:string;role:string;trigram:Trigram;element:Element;independent:boolean;strength:SeasonalQi;voidAnnotation:Readonly<Record<string,unknown>>}[];directRelations:readonly {targetRole:string;type:RelationType;from:string;to:string;assessments:readonly {role:string;strength:SeasonalQi;voidAnnotation:Readonly<Record<string,unknown>>}[]}[];appliedIndirectRules:readonly never[];calendarBoundary:Readonly<Record<string,unknown>>;assessment:string}
export interface InterpretationReview {status:'approved'|'pending-review';passed:number;total:number;reasons:readonly string[];checks?:readonly {id:string;passed:boolean}[]}
export function assessSeasonalQi(element:Element,monthOrder:MonthOrderId):Readonly<SeasonalQi>;
export function buildInterpretationEvidence(reading:Reading,options:{monthOrder:MonthOrderId}):Readonly<InterpretationEvidence>;
export function interpretationArtifactDigest(material:unknown):Promise<string>;
export function evaluateInterpretationReview(registry:unknown,binding:Readonly<Record<string,unknown>>):Readonly<InterpretationReview>;
export const STORY_EDITORIAL_VERSION:'story-editorial-3.0.0';
export interface MovingLineObservation {fullText:string;terms:readonly {term:string;start:number;end:number;requiresContextualInterpretation:true}[];automaticPolarityScore:null;applicationMustBeCurated:true}
export interface EditorialStoryFacts {version:string;contentVersion:string;questionId:string;question_type:string;domainId:string;primaryId:number;movingLine:number;monthOrder:MonthOrderId;stages:Readonly<Record<Stage,{id:number;name:string;baseGrade:DisplayGrade}>>;nodes:readonly {role:string;trigram:Trigram;element:Element;qi:SeasonalQi['state'];independent:boolean}[];relations:readonly {role:string;type:RelationType}[];line:MovingLineObservation & {label:string;image:string;sourceRef:SourceRef;referenceUrl:string};scope:{monthSelection:string;void:string;timing:string;realWorldOutcome:string}}
export interface EditorialStorySample {decision:{id:string;outcomeCode:string};copy:{title:string;short:{decisionId:string;text:string};long:{decisionId:string;opening:string;process:string;ending:string;summary:string}};lineApplication:{evidence:readonly string[];conditions:readonly string[]};counterevidence:readonly {fact:string;resolution:string}[]}
export function inspectMovingLine(text:string):Readonly<MovingLineObservation>;
export function collectStoryFacts(options:{library:Library;question:Readonly<FixedQuestion>;primaryId:number;movingLine:number;monthOrder:MonthOrderId}):Readonly<EditorialStoryFacts>;
export const CONFLICT_CASE_POLICIES:readonly Readonly<Record<string,unknown>>[];
export function resolveConflictCase(facts:EditorialStoryFacts):Readonly<{status:'unresolved'|'case-policy-matched';productionAllowed:false;policyVersion?:string;policyId?:string;outcomeCode?:string;conditions?:readonly string[];counterevidence?:string;reason?:string;numericWeights?:null}>;
export function countHan(text:string):number;
export function validateStoryCopy(sample:EditorialStorySample):Readonly<{shortHanCount:number;structuralCopyChecks:'passed';semanticConsistency:string}>;
export function getStoryCopy(sample:EditorialStorySample):Readonly<{decisionId:string;title:string;short:string;long:{opening:string;process:string;ending:string;summary:string};productionAllowed:false;status:'editorial-preview'}>;
export interface ProductContextField {label:string;options?:readonly string[];type?:'year';required:boolean}
export interface ProductQuestion {id:string;categoryId:string;subcategoryId:string;position:number;question:string;question_type:string;answerScope:string;mode:'narrative'|'reference'|'guidance';sourceDomainIds:readonly string[];sourceSections:readonly {domainId:string;sectionId:string}[];chartSourceDomainId:string|null;contextFields:Readonly<Record<string,ProductContextField>>;practicalAdvice:readonly string[];legacyQuestionId?:string;manuscriptIndexPath?:string;archived?:boolean;legacyBindings?:{contextKey:string;values:Readonly<Record<string,string>>};referenceParagraphs?:readonly string[];guidanceParagraphs?:readonly string[];ruleStatus:string}
export interface ProductSubcategory {id:string;categoryId:string;slug:string;label:string;position:number;exampleQuestions:readonly string[];questions:readonly ProductQuestion[]}
export interface ProductCategory {id:string;number:string;label:string;position:number;policy:string;subcategories:readonly ProductSubcategory[]}
export interface ProductCatalog {schemaVersion:'1.0.0';contentVersion:string;productCatalogVersion:'2.0.0';categoryCount:6;subcategoryCount:31;questionCount:82;classicalDomainCount:18;selectionPolicy:{input:string;aiClassification:false;freeTextChangesQuestion:false;missingContent:string};objectPracticalAdvice:Readonly<Record<string,readonly string[]>>;categories:readonly ProductCategory[]}
export interface ProductContentOptions {questionId:string;categoryId?:string;subcategoryId?:string;question_type?:string;context?:Readonly<Record<string,string|number>>;primaryId?:number;movingLine?:number;monthBranch?:Branch;monthOrder?:MonthOrderId;voidContext?:VoidOptions;castingDate?:string;viewDate?:string;timingScale?:'day'|'month'|'year'|'hour';timingContext?:TimingContext}
export interface MonthSlot {branch:Branch;qi:MonthOrderId;position:number;label:string}
export const MONTH_SLOTS:readonly Readonly<MonthSlot>[];
export const MONTH_SLOT_POLICY:Readonly<Record<string,unknown>>;
export function resolveMonthSlot(options:{monthBranch?:Branch;monthOrder?:MonthOrderId}):Readonly<MonthSlot>|null;
export const VOID_RULESET:Readonly<Record<string,unknown>>;
export interface ProductCalculationExplanation {month:Readonly<Record<string,unknown>>;void?:Readonly<Record<string,unknown>>;timing:Readonly<Record<string,unknown>>;paragraphs:readonly string[]}
export interface ProductTimingWindow extends ManuscriptDateWindow {text:string;eventScope:string;targetBranches:Branch[];calculationBasis:Readonly<ManuscriptTimingBasis>}
export interface ProductTimingSection {title:string;referenceNote:string;castingDate:string;windows:readonly ProductTimingWindow[];phaseNotes?:readonly string[]}
export interface ProductContent {monthBranch?:Branch|null;monthOrder?:MonthOrderId;narrativeParagraphs?:readonly string[];timingSection?:ProductTimingSection;title?:string;short?:string;long?:Readonly<{opening:string;process:string;ending:string;summary:string}>;dateResolution?:ManuscriptDateResolution;calculationExplanation?:ProductCalculationExplanation;manuscriptVersion?:string;review?:Readonly<Record<string,unknown>>;decision?:Readonly<Record<string,unknown>>;status:FixedQuestionContent['status']|'guidance'|'requires-context';selection:{questionId:string;categoryId:string;subcategoryId:string;question_type:string;question:string;answerScope:string;context:Readonly<Record<string,string|number>>};legacySelection?:FixedQuestionContent['selection'];practicalAdvice:readonly string[];sourceSections:readonly unknown[];paragraphs:readonly string[];story:string|null;predictionAllowed:boolean;productionAllowed?:boolean;missingContext?:readonly string[];reading?:Reading;provesLocation?:false;reportedOutcome:null}
export interface ProductRepository {getCatalog():Promise<Readonly<ProductCatalog>>;getQuestion(id:string):Promise<Readonly<ProductQuestion>>;listSubcategories(categoryId:string):Promise<readonly ProductSubcategory[]>;listQuestions(subcategoryId:string):Promise<readonly ProductQuestion[]>;getContent(options:ProductContentOptions):Promise<Readonly<ProductContent>>;clearCache():void}
export function createProductRepository(options:{library:Library;readJSON?:(path:string)=>Promise<unknown>;includeHistoricalInterviewVoid?:boolean;questionRepository?:Pick<QuestionRepository,'getQuestion'|'getContent'> & Partial<Pick<QuestionRepository,'clearCache'>>}):ProductRepository;
