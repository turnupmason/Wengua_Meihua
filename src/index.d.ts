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
export interface VoidOptions {ganzhi?:string;moving?:boolean;strength?:string;filledBranches?:Branch[];releaseClashBranches?:Branch[];combineBranches?:Branch[];supported?:boolean;severelyWeak?:boolean;dayMonthAttacked?:boolean;partialPolicy?:'mark-only'|'any-hit'|'all-hit';allowCombine?:boolean;eventType?:'general'|'marriage'|'cooperation';basis?:string;roleEvidence?:Record<string,VoidOptions>}
export interface VoidAssessment {state:string;label:string;hit:boolean|null;effective:'active'|'conditional'|'suppressed'|'dormant'|'unknown';matchedBranches:Branch[];castingState?:string;releaseEvidence?:{branch:Branch;fill:boolean;clash:boolean;combine:boolean}[];releaseTargets?:ReleaseTarget[];combineEligible?:boolean;hitKind?:'none'|'partial'|'full'}
export interface ReleaseTarget {emptyBranch:Branch;fill:Branch;clash:Branch;combine:Branch}
export interface Relation {type:RelationType;label:string;phrase:string;bodyElement:Element;useElement:Element}
export interface Strength {state:'strong'|'weak'|'not_explicit'|'unresolved';label:string;element:Element;season?:string;monthBranch?:Branch|null;sourceSectionTitles:string[];note?:string;monthElement?:Element;monthRelation?:Relation}
export interface ReadingOptions {primaryId:number;movingLine:number;domainId?:string;calendar?:CalendarContext;voidContext?:VoidOptions;mutualPolicy?:'inner-lines'|'pure-use-changed';question?:string;castId?:string|null}
export interface Reading {
 schemaVersion:string;contentVersion:string;primaryId:number;movingLine:number;mutualPolicy:string;castId:string|null;question:string;
 body:{trigram:Trigram;element:Element;side:'lower'|'upper'};use:{trigram:Trigram;element:Element;side:'lower'|'upper'};
 stages:Record<Stage,{stage:Stage;id:number;name:string;symbol:string;bitsBottomUp:number[];baseGrade:DisplayGrade;theme:string;caption:string;glowLine:number|null;correspondingChangedLine:number|null;detail:Hexagram}>;
 selectedMovingLine:LineReading&{hexagramId:number;position:number};
 nodes:ReadonlyArray<{id:string;stage:Stage;side:string;trigram:Trigram;element:Element;role:string;isBody:boolean;strength:Strength;supportEvidence:{basis:string;element:Element;kind:string;sourceIds:string[]}[];void:VoidAssessment}>;
 edges:ReadonlyArray<Relation&{from:string;to:string;targetRole:string;voidEffect:string;bodyVoidEffect:string;qualitativeNote:string;sourceSectionTitles:string[]}>;
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

export type MonthOrderId='spring-wood'|'summer-fire'|'autumn-metal'|'winter-water'|'seasonal-earth';
export interface MonthOrder {id:MonthOrderId;label:string;season:'spring'|'summer'|'autumn'|'winter'|'earth';strong:Element;weak:Element;opening:string}
export const MONTH_ORDERS:readonly Readonly<MonthOrder>[];
export interface NumericalCastContext {method:'object-direction-hour';objectTrigramNumber:number;directionTrigramNumber:number;hourBranchNumber:number;motion:'walking'|'standing'|'sitting'}
export interface TimingWindow {role:string;branch:Branch;afterDays?:number;condition:string;mechanism?:'fill'|'clash'|'combine';priority?:number;kind?:'support'|'equal'|'pressure';active?:boolean}
export interface TimingPlan {basis:string;scale:'day'|'month'|'year'|'hour'|null;dayGanzhi:string|null;voidBasis:string;voidGanzhi:string|null;voidWindows:readonly TimingWindow[];qiWindows:readonly TimingWindow[];blocked:readonly {role:string;state:string;reason:string}[];text:string;sourceIds:string[];priority:string[];gregorianDates:readonly [];reportedOutcome:null;numericalWindow:{rawTotal:number;motion:string;count:number;unit:string;status:string;sourceIds:string[]}|null}
export interface StoryOptions {primaryId:number;movingLine:number;monthOrder:MonthOrderId;domainId?:string;voidContext?:VoidOptions;timingScale?:'day'|'month'|'year'|'hour'|null;castContext?:NumericalCastContext|null;question?:string;mutualPolicy?:'inner-lines'}
export interface BaseStory {id:string;primaryId:number;movingLine:number;monthOrder:MonthOrderId;stageIds:number[];baseGrades:DisplayGrade[];paragraphs:string[];story:string;scope:string;sourceIds:string[]}
export interface StoryReading {id:string;contentVersion:string;narrativeVersion:string;monthOrder:Readonly<MonthOrder>;domainId:string;reading:Reading;baseStory:string;paragraphs:string[];story:string;voidNotes:{role:string;state:string;text:string;sourceIds:string[]}[];timing:TimingPlan;scope:string;reportedOutcome:null;baseGradesUnchanged:boolean}
export interface ClassicalCase {id:string;title:string;sourceSectionId:string;sourceText:string;sourceRef:SourceRef;prediction:{text:string;status:string};feedback:{text:string;status:string}|null;charts:{primaryId:number;movingLine:number;mutualId:number;changedId:number;input:Record<string,unknown>}[];timing:Record<string,unknown>;auditNotes:string[];reusePolicy:string}
export interface NarrativeRepository {getBase(options:Pick<StoryOptions,'primaryId'|'movingLine'|'monthOrder'|'mutualPolicy'>):Promise<BaseStory>;getStory(options:StoryOptions):Promise<StoryReading>;getClassicalCases(filter?:{primaryId?:number;movingLine?:number}):Promise<readonly ClassicalCase[]>;getIndex():Promise<unknown>;clearCache():void}
export function createNarrativeRepository(options:{library:Library;readJSON?:(path:string)=>Promise<unknown>}):NarrativeRepository;
export function buildTimingPlan(reading:Reading,options?:{timingScale?:'day'|'month'|'year'|'hour'|null;castContext?:NumericalCastContext|null}):TimingPlan;
