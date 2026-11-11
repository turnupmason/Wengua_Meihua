// Twelve distinct lookup slots. Qi classification is separate from the month identity.
export const MONTH_SLOTS=Object.freeze([
 ['寅','spring-wood'],['卯','spring-wood'],['辰','seasonal-earth'],
 ['巳','summer-fire'],['午','summer-fire'],['未','seasonal-earth'],
 ['申','autumn-metal'],['酉','autumn-metal'],['戌','seasonal-earth'],
 ['亥','winter-water'],['子','winter-water'],['丑','seasonal-earth']
].map(([branch,qi],i)=>Object.freeze({branch,qi,position:i+1,label:branch+'月'})));
export function resolveMonthSlot({monthBranch,monthOrder}={}){
 const slot=monthBranch?MONTH_SLOTS.find(m=>m.branch===monthBranch):null;
 if(monthBranch&&!slot)throw new RangeError('Unknown month branch');
 if(slot&&monthOrder&&slot.qi!==monthOrder)throw new RangeError('Month branch and qi classification disagree');
 if(slot)return slot;
 // Five-state compatibility inputs cannot identify a specific month.
 if(monthOrder)return MONTH_SLOTS.find(m=>m.qi===monthOrder)||null;
 return null;
}
export const MONTH_SLOT_POLICY=Object.freeze({id:'twelve-month-slots-v1',baseSlotsPerQuestion:64*6*12,
 qiGrouping:'寅卯木;巳午火;申酉金;亥子水;辰未戌丑土',sourceIds:['mh-101','mh-119'],
 earthConvention:'four-earth-month-branches;explicit-input;no-unwritten-18-day-calendar-inference',
 sharing:'identical-written-qi-assessments-share-complete-prose;month-slots-remain-distinct',
 monthlyBranchClashRules:'not-added-without-an-authored-rule'});
