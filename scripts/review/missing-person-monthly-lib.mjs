// 失联寻人独立预览：只计算、检查和排版已写定的文章，不生成正文或签署阅读回执。
import {readFile,readdir} from 'node:fs/promises';
import {loadLibrary} from '../../src/index.js';
import {createContextualReading,promotionTimingSlots} from '../../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../../src/prewritten-manuscripts.js';
export {MONTHS,QI,stem,sha256,han,normalize,stripQuotes,independentFacts} from './monthly-lib.mjs';

export const SCOPE='missing-person-search-preview-1.0.0';
export const QUESTION_ID='search.missing-contact.locate-preview';
export const SOURCE_DIR='sources/editorial/missing-contact/monthly';
export const REVIEW_DIR='sources/editorial/missing-contact/reviews-monthly';
export const SECOND_REVIEW_DIR='sources/editorial/missing-contact/second-reviews-monthly';
export const DOC_DIR='docs/missing-contact/monthly-preview';
export const DEMO_DATE='2026-11-21';
export const LABELS={body:'体卦',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
export const REL_LABELS={equal:'与体比和',body_controls_use:'受体所克',use_controls_body:'克体',use_generates_body:'生体',body_generates_use:'受体所生'};
export const DIRECTIONS={乾:'西北',坤:'西南',震:'东方',巽:'东南',坎:'北方',离:'南方',艮:'东北',兑:'西方'};
export const VERDICTS={favourable:'寻获的传统支持较充分',conditional:'尚有寻获机会，须满足正文中的条件',difficult:'此次寻获困难'};
export const SOURCE_REFS={
 'ZY-SUI17-BENYI-COMPARISON':{title:'朱熹《周易本义》卷一·随上六（对读）',url:'../../../sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷1.txt',scope:'升六四本义指义见随卦，于此核随上六的西山、祭享之解释。'},
 'ZY-YU16-6-COMPARISON':{title:'《周易正义》豫卦上六（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02豫.txt',scope:'对读冥豫与冥升的不同爻义，不能据同字确定夜间行踪。'},
 'LIJI-QU-LI-STAIRS':{title:'《礼记·曲礼上》宾主登阶（对读）',url:'https://zh.wikisource.org/wiki/禮記/曲禮上',scope:'核宾主就东西阶的礼位，与孔疏践阼释语分别阅读，不据此推现实中失联者位置。'},
 'ZY-JIN35-COMPARISON':{title:'《周易正义》晋卦·卦辞（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/04晉.txt',scope:'晋卦康侯昼日三接与升六五所说的升进各有所指，晋卦经文不移作升卦的见面次数。'},
 'ZY-DAYOU14-2-COMPARISON':{title:'《周易正义》大有九二（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02大有.txt',scope:'大有九二堪受重任与困九四所言金车取九二，分别依两卦的主体、动位对读。'},
 'ZY-KAN29-TUAN-COMPARISON':{title:'《周易正义》坎卦彖辞（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/03坎.txt',scope:'核行险而不失其信的王注，不依据重坎向家人报告现实险情。'},
 'ZY-XUGUA-KUN-JING':{title:'《周易正义》序卦·困井相承（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/10.txt',scope:'困后受之以井只解释卦序，不替代困九四实际爻变所得坎卦。'},
 'ZY-SONG6-ZHONGXIONG':{title:'《周易正义》讼卦卦辞（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02訟.txt',scope:'孔疏以终竟讼事释终凶，不能与困上六知悔征吉相抵，也不指认真人有争讼。'},
 'MH-SHIWU-COMPARISON':{title:'《梅花易数》卷二·失物占第十五（对读）',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#失物占第十五',scope:'卷二明以变卦推失物所在，只对读取法，不能拿变乾西北给所寻之人定址。'},
 'SHIJING-WANG-GELEI':{title:'《诗经·王风·葛藟》（对读）',url:'https://zh.wikisource.org/w/index.php?title=詩經/葛藟&oldid=8738243',scope:'诗中河岸与远兄弟是诗篇自己的叙述，不能加在困上六成为寻人地理或亲友经历。'},
 'ZY-JIE40-GUACI':{title:'《周易正义》解卦卦辞（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/04解.txt',scope:'孔疏以有难可往释夙吉，与困九五戒速暴的徐分属两事，不由此定寻人应期。'},
 'ZY-DAGUO28-GUACI':{title:'《周易正义》大过卦辞（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/03大過.txt',scope:'孔疏以拯患难释利有攸往亨，变卦卦辞不独立于本动爻许寻人成果。'},
 'ZY-KUN47-1-COMPARISON':{title:'《周易正义》困卦初六（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/05困.txt',scope:'对读初六的三岁不觌与六三的入宫不见其妻，两爻不可合成现实失联时长。'},
 'ZY-XICI-KUN-JU':{title:'《周易正义》系辞下·困于石据于蒺藜（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/08.4.txt',scope:'系辞与孔疏以三上求四、下据二释名辱身危，不能当作关于失联者的现实险情通报。'},
 'ZY-XICI-KUN-GUAYUAN':{title:'《周易正义》系辞下·困以寡怨（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/08.6.txt',scope:'核寡怨所指为处困者自守，不以此判定亲友、失联者的现实情绪。'},
 'ZY-XU5-5-COMPARISON':{title:'《周易正义》需九五（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02需.txt',scope:'对读需九五与困九二的酒食，爻位与所问各依本卦，不从酒食二字许已得贞吉。'},
 'ZY-XICI-JING-DE':{title:'《周易正义》系辞下·井德之地（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/08.6.txt',scope:'孔疏井初六引系辞释居德之地，不据此给失联者定址。'},
 'ZY-BI8-5-COMPARISON':{title:'《周易正义》比九五（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02比.txt',scope:'比九五以三驱说失前禽，井初六无禽说井为时舍，两处用字不证明实际来去。'},
 'ZY-XU5-1-COMPARISON':{title:'《周易正义》需初九（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02需.txt',scope:'需初九郊远于险只作变卦同位对读，不外加爻辞或现实寻人地点。'},
 'ZHUANGZI-WAIWU-FUYU':{title:'《庄子·外物》车辙中鲋鱼（对读）',url:'https://zh.wikisource.org/w/index.php?title=莊子/外物&oldid=11117714',scope:'辙中鲋鱼需斗升之水，非井九二所叙之事，不据此推真人处境或地点。'},
 'ZY-JING48-5-COMPARISON':{title:'《周易正义》井九五（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/05井.txt',scope:'九五寒泉之食与初六泥而不食各有所指，不当作同一次现实查验。'},
 'MENGZI-JINXIN-JING':{title:'《孟子·尽心上》第二十九章（对读）',url:'https://zh.wikisource.org/wiki/孟子/盡心上',scope:'孟子以掘井未及泉为喻，与井九三已渫可汲而未食对读。'},
 'ZY-KAN29-3-COMPARISON':{title:'《周易正义》坎六三（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/03坎.txt',scope:'另卦六三失位处险而勿用，不覆盖原动井九三可用汲。'},
 'LUNYU-YONGYE-JING':{title:'《论语注疏》卷六·宰我问仁者',url:'https://zh.wikisource.org/wiki/論語註疏/卷06',scope:'宰我设井中有人问仁者，孔子答可逝不可陷。与井九三对读，不作实际遇险证据。'},
 'ZY-SIKU48-4':{title:'《周易注疏》四库全书本卷八·井六四',url:'https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷08',scope:'王注作自守而不能给上，与孔疏下文自守互证，据以校正旧录误字。'},
 'KONGYI-JING48-4':{title:"《周易孔义集说》卷十三·井六四",url:"https://zh.wikisource.org/wiki/周易孔義集說_(四庫全書本)/卷13",scope:"项平甫说护泉御泥，苏子瞻分别泉与井所寄，各以修养、容受论井甃。"},
 'SHIJING-KAIFENG':{title:"《诗经·邶风·凯风》",url:"https://zh.wikisource.org/wiki/詩經/凱風",scope:"诗中寒泉在浚之下，用以辨析所引地名的出处，不以诗中之浚定位井九五所问本人。"},
 'SHUOWEN-LIE-SHI':{title:"《说文解字》卷十一·水部（洌、湜）",url:"https://zh.wikisource.org/wiki/說文解字/11",scope:"洌训水清，湜训水清底见。对读字书释义，分清清楚与实际可见范围。"},
 'SHIJI-BOYI-ZHOUSU':{title:"《史记》卷六十一·伯夷列传",url:"https://zh.wikisource.org/zh-hans/史記/卷061",scope:"义不食周粟、采薇而食之有具体所指，不能从未领一物推本人拒绝一切帮助或推其动机。"},
 'SHIJING-JIONGZHUO':{title:"《诗经·大雅·泂酌》",url:"https://zh.wikisource.org/wiki/詩經/泂酌",scope:"可以餴饎、可以濯罍各显所取之水可以有不同用途，不以取水的目的不明取消可靠的当场辨认。"},
 'SHIJING-DADONG-DOU':{title:"《诗经·小雅·大东》",url:"https://zh.wikisource.org/wiki/詩經/大東",scope:"诗说维北有斗而不得挹酒浆，区分星斗与水器，辨观看朝向和人所处的位置。"},
 'MENGZI-QUAN-LILOU':{title:"《孟子注疏》卷八·离娄下",url:"https://zh.wikisource.org/zh-hans/孟子註疏/卷08",scope:"有本之泉与雨集沟浍相对，收到多少与来源是否持续须分别核实。"},
 'ZY-XICI-JING-QIAN':{title:"《周易正义》系辞下·井居其所而迁",url:"../../../sources/reference/zhouyi-zhengyi-hans/08.6.txt",scope:"井居处不移而其施可迁，对读上六出井济物，分物件流转与个人行踪。"},
 'ZY-XUN57-SHENMING':{title:"《周易正义》巽卦彖、象（对读）",url:"../../../sources/reference/zhouyi-zhengyi-hans/06巽.txt",scope:"重巽以申命与君子申命行事，重申所言不自定新日期。"},
 'ZY-KUN2-5-YUANJI':{title:"《周易正义》坤六五（对读）",url:"../../../sources/reference/zhouyi-zhengyi-hans/01坤.txt",scope:"坤六五以文在中说黄裳元吉，井上六以井功大成说元吉，同辞各有主语和来处。"},
 'HKO-2025-LEAP-SIX':{title:"香港天文台《二〇二五年年历》七月",url:"https://www.hko.gov.hk/tc/gts/astron2025/files/HKO_almanac_2025.pdf",scope:"该年闰六月初一在公历七月二十五，以实历说明平月闰月的辨别，不作失联日期。"},
 'LIJI-XUEJI-SHANWEN':{title:"《礼记纂言》卷三十五·学记",url:"https://zh.wikisource.org/wiki/禮記纂言_(四庫全書本)/卷35",scope:"善问如攻坚木，先易后难。换成倒叙不能独验见闻真假，仍应核准见者易于说明的事实。"},
 'HANFEIZI-ZHENG-LV':{title:"《韩非子》外储说左上·郑人置履",url:"https://zh.wikisource.org/zh-hans/韓非子/11",scope:"量足置履一事分辨尺码和实际能否辨认人，不能据一双鞋号数确认物主与现处。"},
 'ZY-XIAN31-GANYING':{title:"《周易正义》咸卦彖传（对读）",url:"../../../sources/reference/zhouyi-zhengyi-hans/04咸.txt",scope:"咸彖以二气感应相与讲咸，变卦相与不证实送行者同行，不指所寻本人已乘车。"},
 'ZY-GUAI43-L2':{title:"《周易正义》夬九二及象疏（变卦对读）",url:"../../../sources/reference/zhouyi-zhengyi-hans/05夬.txt",scope:"对读夬九二居中审度及勿恤，不由变爻另起夜间险断，不得以经句延误现实求助。"},
 'MZ-JINXIN-XIA-WUCHENG':{title:"《孟子·尽心下》读《武成》章",url:"https://ctext.org/wiki.pl?chapter=497377&if=gb",scope:"孟子有取于《武成》而质疑过辞。这是读书辨言的对照，不增加革九三的应期、证人数或险情判词。"},
 'ZY-SUI17-SHISHI':{title:"《周易正义》随卦彖传及疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/03隨.txt",scope:"对读随彖“天下随时”及王孔释义，因时调整查问不等于断定本人跟随了某人，不另立寻人应期。"},
 'SHIJING-BAIJU-YONG':{title:"《诗经·小雅·白驹》首章及《诗集传》",url:"https://ctext.org/wiki.pl?chapter=332478&if=gb&remap=gb",scope:"诗借系驹表达惜别愿留之情。愿望的表达不能作本人已经在场、同意留下或后来去向的依据。"},
 'MOE-SHAN-XING':{title:"《重编国语辞典修订本》“單”字姓氏读音",url:"https://dict.revised.moe.edu.tw/dictView.jsp?ID=8971&la=0&powerMode=0",scope:"核“單”的姓氏读音可为 shàn，供口头认姓时对照；字典例义不能作为现实辨认本人身份的证据。"},
 'ZY-FENG55-RIZHONG':{title:"《周易正义》丰卦“宜日中”及彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/06豐.txt",scope:"丰卦以日中遍照说宜照天下；与革九五对读其理，不把变卦的日中另取为当天联系时刻。"},
 'LVSHI-CHACHUAN-DING':{title:"《吕氏春秋·慎行论·察传》宋之丁氏",url:"https://ctext.org/text.pl?if=gb&node=24003&remap=gb&show=parallel",scope:"丁氏说明所省是一人外出汲水之劳，未在井中发现人；用于辨清转述中的得人对象，不取古事为实际寻人地点。"},
 'ZZ-TIANDAO-LUNBIAN':{title:"《庄子·天道》轮扁斲轮章",url:"https://ctext.org/text.pl?if=gb&node=42076&show=parallel",scope:"轮扁论亲手所得难以全由言语授人，对照熟人能辨却未必善于向陌生人描摹，不把言不尽意当作保真的保证。"},
 'ZY-TONGREN13-YE':{title:"《周易正义》同人卦首及彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/02同人.txt",scope:"同人于野，孔疏以和同于人、所及广远解释。对读不添现实同行者，不把野字坐实为郊外或荒地。"},
 'SHU-SHUOMING-YANMEI':{title:"《尚书·说命下》盐梅和羹之喻",url:"https://ctext.org/text.pl?if=gb&node=37559&remap=gb",scope:"王对傅说以盐梅调羹比喻辅导与匡正。用于区分提供语言帮助及亲历辨认，不以食物猜人所在。"},
 'YC-DING50':{title:"程颐《伊川易传》卷四·鼎卦",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"据鼎卦各爻程传原文核义。九二以仇为初、慎所趋而守正，不将旧注的关系譬喻推作现实人物恩怨。"},
 'ZY-LV56-JITA':{title:"《周易正义》旅卦卦首及疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/06旅.txt",scope:"孔疏从客寄他方释旅。对读不要求失联者必在旅途，也不以固定住址为确认当前所在的唯一方式。"},
 'ZY-XICI-DING4':{title:"《周易正义》系辞下·力小而任重",url:"../../../sources/reference/zhouyi-zhengyi-hans/08.4.txt",scope:"系辞引鼎九四释不能胜其任，依各人所能说明的范围核实寻人线索，不用德薄指责失联者或亲属。"},
 'ZY-ZHEN51-L3-CROSS':{title:'《周易正义》震卦·六三对读',url:'../../../sources/reference/zhouyi-zhengyi-hans/05震.txt',scope:'参照六三无乘刚之逆、能因惧而行的条件，对照上六动极复征之戒。'},
 'YC-ZHEN51':{title:"《伊川易传》卷四·震卦",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传释震六二亿为揣度，九陵取高且重，勿逐守中正而复其常，不定失联者去处或见人日期。"},
 'YC-GEN52':{title:"《伊川易传》卷四·艮卦",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传以止于动之初释初六未失正，并以阴柔难常说明永贞之戒；不据爻中趾字预设现实受伤或暂停求助。"},
 'YC-GEN52-L2':{title:"《伊川易传》卷四·艮六二",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程颐由股动腓随释六二受制，取九三在上为所随；当代查访只借其所主所随之别，不从本爻推真人去向、心境或失联缘故。"},
 'ZY-GU18-DECISION':{title:"《周易正义》蛊卦卦辞及彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/03蠱.txt",scope:"蛊卦先甲后甲取创制、申令与终始，供变卦对读，不以变卦古辞另造寻获日期。"},
 'ZY-CS52-L2':{title:"《淙山读周易记》卷十四·艮六二",url:"https://zh.wikisource.org/wiki/淙山讀周易記_(四庫全書本)/卷14",scope:"六二《象》明作不拯其随，所引伊川释未退听在上者未能下从。用以对读录文，不把个别异字推成新去向。"},
 'YC-GEN52-L2-SUI':{title:"《伊川易传》卷四·艮六二释随",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"艮六二之随系乎所主，以股动而腓随为象；无从借此给实际失联原因添上旁人参与。"},
 'YC-GEN52-L2-YING':{title:"《伊川易传》卷四·艮六二无应援",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"分同阴相对而无应援与下卦九三为止主之所随。古爻关系只供理解行止，并不能确认失联的现实因由。"},
 'ZY-SHUOGUA-XUN-GEN':{title:"《周易口义》说卦·八卦之德",url:"https://zh.wikisource.org/wiki/周易口義_(四庫全書本)/説卦",scope:"说卦艮止、巽入为八卦取义，不是某个现实出入口的见证，变巽所克应依原体五行判断。"},
 'YC-GEN52-L3':{title:"《伊川易传》卷四·艮九三",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"以分隔释限，以坚强失行止之宜释九三危厉；不从限夤推断实际身情、事故或失联动机。"},
 'ZY-JIJIE52-L3':{title:"李鼎祚《周易集解》卷十·艮九三",url:"https://zh.wikisource.org/zh-hant/周易集解_(李鼎祚)/卷十",scope:"虞翻读裂其夤、厉阍心，以脊肉释夤、守门人释阍。对读与王弼孔颖达理路分歧，不由经象推失联遭遇。"},
 'ZY-BO23-DECISION':{title:"《周易正义》剥卦卦辞及彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/03剝.txt",scope:"对读剥不利有攸往，保留剥消进退的原义，至于寻获仍以本体和互变五行条件合断。"},
 'YC-GEN52-L3-WU':{title:"《伊川易传》卷四·艮九三之止",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"九三以刚居刚而不中，止于两体之际，坚止而失其宜；不因一爻确定失联现实原因。"},
 'ZY-JIAN53-TUAN':{title:"《周易正义》渐卦彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/05漸.txt",scope:"渐彖进以正供对读，借其序与正辨查证次序和实际行踪；不以渐释取代本卦木日及阶段。"},
 'YC-GEN52-L4':{title:"《伊川易传》卷四·艮六四",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"以阴柔不遇刚阳解释仅能自止其躬而无咎，不能据此令别人停止寻找，也不据断实际身体。"},
 'YC-GE49':{title:'程颐《伊川易传》卷四·革卦',url:'../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt',scope:'革初须有其时、位、才而审虑慎动；逐爻据程传对应所释，不能据以预设真人经历。'},
 'YC-JING48':{title:'程颐《伊川易传》卷四·井卦',url:'../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt',scope:'初六取井与鼎皆就物以为义、上无应援不得上水，逐爻依井卦原注读。'},
 'ZY-DING50-1-COMPARISON':{title:'《周易正义》鼎初六（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/05鼎.txt',scope:'鼎初以颠趾出秽纳新，不能与井初泥而不食共用一个断辞。'},
 'YC-KUN47':{title:'程颐《伊川易传》卷四·困卦',url:'../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt',scope:'困初六取株木不能荫庇、三岁不觌为不遇其所亨等，依程传困卦逐爻核读。'},
 'YC-SHENG46':{title:'程颐《伊川易传》卷三·升卦',url:'../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷3.txt',scope:'升卦逐爻对读，依程颐对六四守分、六五任贤而升及上六冥升的本释。'},
 'ZY-SHI7-3-COMPARISON':{title:'《周易正义》师卦六三（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02師.txt',scope:'升九三变师，辨别本卦实动爻与师卦同位之辞，师六三不作本盘的第二条动爻。'},
 'ZY-CUI45-2-COMPARISON':{title:'《周易正义》萃卦六二（对读）',url:'https://zh.wikisource.org/wiki/周易正義/05萃',scope:'升九二与萃六二共有孚乃利用禴之辞，两爻各依本卦动爻、体用和月令判断。'},
 'ZY-KUN47-2-COMPARISON':{title:'《周易正义》困卦九二（对读）',url:'https://zh.wikisource.org/wiki/周易正義/05困',scope:'萃六二变困时，仅对读两卦各自的祭礼文字，动爻仍为萃六二。'},
 'ZY-BENYI-2':{title:'朱熹《周易本义》卷二',url:'../../../sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷2.txt',scope:'下经动爻的朱熹本义，与王弼注、孔颖达疏分别使用。'},
 'YC-2':{title:'程颐《伊川易传》卷二',url:'https://zh.wikisource.org/w/index.php?oldid=11131282&variant=zh-hans',scope:'程颐逐爻解释，与王弼注及孔颖达疏对读。'},
 'MH-XINGREN':{title:'《梅花易数》卷二·行人占第十三',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#行人占第十三',scope:'体为主，用为行人；归来与在外处境分开论。向现代失联寻获迁移的部分见本目录政策。'},
 'MH-YEJIAN':{title:'《梅花易数》卷二·谒见占第十四',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#謁見占第十四',scope:'是否得见与体用生克；不把求见原句直接当作失踪调查的已证实结果。'},
 'MH-QIUMOU':{title:'《梅花易数》卷二·求谋占第八',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#求謀占第八',scope:'所谋之事的成否、迟速，辅助说明寻找过程。'},
 'MH-TIYONG':{title:'《梅花易数》卷三·体用互变之诀、占卦诀',url:'https://zh.wikisource.org/wiki/梅花易數/卷三',scope:'本用、两互、变用的阶段与生克，始终沿用原体。'},
 'MH-QI':{title:'《梅花易数》卷三·体用衰旺之诀',url:'https://zh.wikisource.org/wiki/梅花易數/卷三',scope:'旺衰决定作用轻重；项目五态细化与同表核对见规则页，不声称原文列出全套五态表。'},
 'MH-XIANG':{title:'《梅花易数》卷一·八卦万物属类',url:'https://zh.wikisource.org/wiki/梅花易數/卷一#八卦萬物屬類',scope:'本用方位及地理屋舍类象。用于人员方位是明示的编辑迁移，不是原书失物变卦定位法。'},
 'MH-YINGQI':{title:'《梅花易数》卷三·占卜克应之诀、占卜十应诀之日应',url:'https://zh.wikisource.org/wiki/梅花易數/卷三',scope:'克应先定事件与远近尺度；日应原论本日，未来阶段窗口为本项目明示迁移，候选日期不保证寻获或联系。'},
};
const PROFILE=Object.freeze({namedStageEvents:true,questionId:QUESTION_ID,questionType:'missing_person_search_preview'});
export const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
export async function listIds(){try{return (await readdir(SOURCE_DIR)).filter(f=>/^hex-\d{3}\.json$/.test(f)).map(f=>Number(f.slice(4,7))).sort((a,b)=>a-b);}catch(e){if(e.code==='ENOENT')return [];throw e;}}
export async function context(){
 const [library,zhengyiTitles]=await Promise.all([loadLibrary(),readJSON('sources/reference/zhouyi-zhengyi/_titles.json')]);
 return {library,zhengyiTitles};
}
export function readingFor(ctx,id,article,date=DEMO_DATE){
 return createContextualReading({library:ctx.library,question:{id:QUESTION_ID,mode:'narrative',question_type:'missing_person_search_preview',question:'失联的人能否寻得，有哪些寻找线索？',sourceDomainIds:['domain-13','domain-14','domain-08']},primaryId:id,movingLine:article.movingLine,monthBranch:article.monthBranch,castingDate:date,applyVoid:false});
}
export function resolveTiming(reading,article,date=DEMO_DATE,viewDate=date){
 if(typeof article.timing==='string')return {slots:[],paragraphs:[article.timing],dateMatches:[],status:'not-derived'};
 const slots=promotionTimingSlots(reading,article.timing,article.outcome,PROFILE).map(s=>({...s,suffix:`前后，${s.event}，属${s.valence}应。${s.text}`,calculationBasis:{...s.calculationBasis,interpretationReview:'editorial-preview',independentInterpretationReview:'pending',scopeVersion:SCOPE}}));
 return {slots,...resolveManuscriptDates({paragraphs:slots.map(s=>s.token),dateSlots:slots,reading,castingDate:date,viewDate,timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}})};
}
export function referencesFor(ctx,id,a,supplements={}){
 const extra=supplements[`${a.movingLine}/${a.monthBranch}`]??[];
 return [...new Set([...a.sourceRefs,...extra])].flatMap(key=>{
  if(SOURCE_REFS[key])return {key,...SOURCE_REFS[key]};
  const match=/^ZY-(\d+)-(\d+)$/.exec(key);
  if(!match||Number(match[1])!==id||Number(match[2])!==a.movingLine)throw new Error('Invalid source reference '+key);
  const h=ctx.library.getHexagram(id),line=h.lines[a.movingLine-1];
  const canonicalName=new URL(h.referenceUrl).searchParams.get('title')?.split('/').at(-1);
  const volume=id<=4?1:id<=16?2:id<=30?3:id<=42?4:id<=54?5:6;
  // The base text uses 无妄 in its URL; the verified commentary index uses 無妄.
  const commentaryName=canonicalName==='无妄'?'無妄':canonicalName;
  const commentaryTitle=`周易正義/0${volume}${commentaryName}`;
  if(!ctx.zhengyiTitles.includes(commentaryTitle))throw new Error('Missing verified commentary title '+commentaryTitle);
  return [{key,title:`《周易》${h.shortName}·${line.label}`,url:line.referenceUrl,scope:'本卦真实动爻、完整爻辞及小象。'},
   {key:key+'-ZHENGYI',title:`《周易正义》${h.shortName}卦注疏`,url:'https://zh.wikisource.org/wiki/'+commentaryTitle,scope:'王弼注与孔颖达疏分别标明，不将现代寻找解释冒作原注。'}];
 });
}
export function renderHex(ctx,source){
 const id=source.primaryId,s=`hex-${String(id).padStart(3,'0')}`,name=ctx.library.getHexagram(id).name;
 const out=[`# ${id} · ${name}：失联寻人，六动爻与十二月令`,
 `本页有 ${source.articles.length} 篇独立逐月长稿。所问为人找不到了：能否寻得、可核对的方位、处境与安危倾向、可能的失联原因，以及消息或寻找进展的应期。`,
 '[返回目录](README.md) · [寻人规则与出处](POLICY.md) · [分批审计](AUDIT.md)',
 `方位、安危与原因均为传统类象推断，现实情况尚须核实。应期统一以 **${DEMO_DATE}** 演示候选日期；实际使用须按本次起卦当地日期重算，候选日不是保证日期。异常失联或有现实危险迹象时，应及时寻求当地警方或紧急服务帮助，不等待候选日。`];
 for(const a of source.articles){
  const r=readingFor(ctx,id,a),timing=resolveTiming(r,a),line=r.selectedMovingLine;
  out.push(`## ${line.label}动 · ${a.monthBranch}月`,a.title,Object.values(r.stages).map(x=>x.name).join(' → '),...a.paragraphs,
   '### 方位与寻找线索',a.placeHint,'### 处境与安危倾向',a.circumstanceHint,'### 失联原因参考',a.reasonHint,
   '### 应期参考',...(timing.slots.length?['以下为传统推算的参考窗口。仅在已有可继续核查的现实渠道时观察对应事件；没有新的事实，也不因此推定找到人。']:[]),...timing.paragraphs,
   '<details>\n<summary>卦理与出处</summary>',`传统判断：${VERDICTS[a.outcome]}。`,
   '取用：体为寻找与核实一方，本用为所寻的失联者；其余节点说明过程与收尾。'+r.edges.map(e=>{const n=r.nodes.find(n=>n.role===e.targetRole);return `${LABELS[n.role]}${n.trigram}${n.element}${REL_LABELS[e.type]}`;}).join('；')+'。',
   `旺衰：${a.monthBranch}月，`+r.nodes.filter(n=>n.role!=='body_inherited').map(n=>`${LABELS[n.role]}${n.trigram}${n.element}${n.strength.state}`).join('；')+'。',
   `爻辞：${line.label}「${line.text.replace(/。$/u,'')}」；象曰「${line.image.replace(/。$/u,'')}」。`,
   '专业说明：'+a.judgment.replace(/\b(favourable|conditional|difficult)\b/g,code=>'「'+VERDICTS[code]+'」'),
   '取期依据：'+(typeof a.timing==='string'?a.timing:a.timing.map(t=>t[4]).join(' ')),
   '出处：'+referencesFor(ctx,id,a,source.supplementalSourceRefs).map(ref=>`[${ref.title}](${ref.url})`).join('；')+'。各出处的适用范围与现代迁移说明见[规则页](POLICY.md)。',
   `稿件键：\`${QUESTION_ID}/${id}/${a.movingLine}/${a.monthBranch}/${a.outcome}\`。作者源：[${s}.json](../../../${SOURCE_DIR}/${s}.json)。`,
   '首轮编辑全文核读与第二读者的实际范围见目录及审计。机器复算不代表现实预测验证，也不等于用户逐篇验收。',
   '</details>','<details>\n<summary>简断摘要</summary>',a.short,'</details>');
 }
 return out.join('\n\n')+'\n';
}
