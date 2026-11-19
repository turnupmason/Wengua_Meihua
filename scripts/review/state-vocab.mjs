// 状况类问项（职场情况：稳／有隐患／风险大）的判词表，供 check-hex、text-packet 共用（2026-11-19）。
export const STATE_WORDS = {
 stable:/稳得住|能稳住|稳住|稳当|稳稳|稳定|保得住|守得住|站得住|坐得稳|待得住|做得下去|留得住|不会被裁|轮不到你|不在裁员之列|工作稳|位置稳|岗位稳/u,
 watch:/隐患|变数|松动|不算稳|不够稳|不太稳当/u,
 strained:/风险大|风险不小|风险很大|风险偏大|保不住|难保|站不稳|坐不稳|位置不稳|岗位不稳|工作不稳|难以保住|动荡/u,
};
// 与本篇结论相反的说法
export const STATE_CONTRA = {
 stable:/隐患|风险大|风险不小|风险很大|保不住|难保|站不稳|坐不稳|位置不稳|岗位不稳|工作不稳|难以保住/u,
 watch:/风险大|风险很大|保不住|难保|难以保住|稳稳当当|没有一点隐患/u,
 strained:/稳得住|保得住|不会被裁|轮不到你|不在裁员之列|稳稳/u,
};
export const STATE_HEDGE = /有条件|有望|偏难|多半|大概率|成败两可|两可|或许|未必|恐怕|把握不大|把握较大|胜算|可能性|说不准|难说|看运气/u;
// 风险大也不吓人：不断定被裁，不写开除、失业
export const STATE_BLUNT = /一定被裁|必被裁|肯定被裁|铁定|被开除|开除你|失业|丢饭碗|卷铺盖|饭碗不保/u;
export const STATE_LABEL = {stable:'稳', watch:'有隐患', strained:'风险大'};
// 判断依据与计算说明里的结论用语
export const STATE_NOTE = {stable:/定为稳|判稳|稳得住|属稳/u, watch:/有隐患/u, strained:/风险大/u};
// 选择类问项（跳槽去留：留／先准备／可走，2026-11-19，docs/review/JOBCHANGE_REJUDGE_20261119.md）的判词表。
export const CHOICE_WORDS = {
 stay:/留在现职|做着现职|守着现在这份|继续做现在这份|还是现职|现职这边更合适|留在原单位|留在原岗位|不辞为好|不去为好|不换为宜|先不动|不宜动|现职更合适|现职为先|选现职|守住现职|继续留在|留下来|先留下|留任|不换为好|不宜换|不必换|眼下不换|这次不换|不宜辞|不必辞|暂不辞|先不辞|别辞|留着现职|现在这份更合适|还是留|留在原/u,
 prepare:/先准备|缓一缓再辞|缓些再辞|不急于辞|准备好了再|条件齐了再|先筹备|准备着|先做准备|备好再|再辞|晚些辞|晚一点辞|等[^，。；]{1,14}再(?:辞|走|换|提)|先别急着辞|不急着辞|可以换，?但|值得换，?但|落定再|谈妥再|定下来再|排好再|先把[^，。；]{1,14}(?:落实|谈妥|定下|签下)/u,
 switch:/可以换|可以过去|换过去合适|可以接下|接下这份|可以辞|可以走|换过去|去新工作|新工作更合适|选新工作|可以提辞职|可以办离职|可以动身|换得成|该换|值得换|可以去/u,
};
export const CHOICE_CONTRA = {
 stay:/可以换|可以辞|可以走|换过去|新工作更合适|选新工作|值得换|该换|现在就辞/u,
 prepare:/现在就辞|马上辞|立刻辞|立即辞|即刻辞|当下就辞|不宜换|不必换|别换|不值得换|现职更合适|选现职/u,
 switch:/先别辞|暂不辞|不宜辞|先不辞|别辞|不必辞|留在现职|现职更合适|不宜换|不必换|先准备|先筹备|再辞/u,
};
export const CHOICE_BLUNT = /一定后悔|必定后悔|肯定后悔|铁定|血亏|毁了|完蛋/u;
export const CHOICE_LABEL = {stay:'留', prepare:'先准备', switch:'可走'};
export const CHOICE_NOTE = {stay:/定为留/u, prepare:/定为先准备/u, switch:/定为可走/u};
// 按问项取判词表
export const VOCAB = {
 'workplace-stability':{WORDS:STATE_WORDS, CONTRA:STATE_CONTRA, HEDGE:STATE_HEDGE, BLUNT:STATE_BLUNT, LABEL:STATE_LABEL, NOTE:STATE_NOTE},
 'job-change':{WORDS:CHOICE_WORDS, CONTRA:CHOICE_CONTRA, HEDGE:STATE_HEDGE, BLUNT:CHOICE_BLUNT, LABEL:CHOICE_LABEL, NOTE:CHOICE_NOTE},
};
