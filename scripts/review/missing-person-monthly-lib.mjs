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
 'ZY-JIJIE52-L4':{title:"李鼎祚《周易集解》卷十·艮六四",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十",scope:"虞翻身释腹与王孔取全身相对读，形象取法并不限定现实辨认须照到哪一个身体部分。"},
 'YC-GEN52-L4-WEI':{title:"《伊川易传》卷四·艮六四象",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程颐以自守和在位所应当履行之事分别说明，寻访语境取谨慎与实际查证各尽其所。"},
 'ZY-LYU56-XIANG':{title:"《周易正义》旅卦大象疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/06旅.txt",scope:"变旅的山上有火及明慎为古辞释义，不以火推事故，也不据旅名定本人曾寄住客舍。"},
 'YC-GEN52-L5':{title:"《伊川易传》卷四·艮六五",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"以辅颊为言所由出，以有序为中节、有次序；谨慎有伦的言语不能替代实际查证。"},
 'ZY-JIJIE52-L5':{title:"李鼎祚《周易集解》卷十·艮六五",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十",scope:"虞翻所用经、象均作言有孚，与王孔通行本言有序分读；不能从一个孚字推定现有线索可直接确认。"},
 'ZY-SHUOGUA-GEN-HAND':{title:"《周易口义》说卦·艮为手",url:"https://zh.wikisource.org/wiki/周易口義_(四庫全書本)/説卦",scope:"区分八卦人身类象的艮为手与艮六五辅颊的爻辞象，均不替现实假定动作或传话。"},
 'XIAOJING-KOU':{title:"《孝经注疏》卷二·卿大夫章",url:"https://zh.wikisource.org/wiki/孝經註疏/卷2",scope:"供对读王注口无择言；言必守法而无可择，不把言语齐整推成事实已经核实。"},
 'YC-GEN52-L5-XU':{title:"《伊川易传》卷四·艮六五言有序",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程颐以言有序为中节、有次序，守实报告不由古义替真人断安危或下落。"},
 'YC-GEN52-L6':{title:"《伊川易传》卷四·艮上九",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"以敦厚、笃实守止到终释上九吉，仍与本互变的具体寻获条件分别。"},
 'ZY-QIAN15-XIANG':{title:"《周易正义》谦卦大象疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/02謙.txt",scope:"裒聚与益寡各依王孔说，与朱熹损高增卑之说对读，只借按缺处核查的意思。"},
 'ZY-BENYI-1-QIAN':{title:"《周易本义》卷一·谦大象",url:"../../../sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷1.txt",scope:"朱熹以损高增卑以趣于平释裒多益寡，本文取复核所缺，不替实际寻获下事实断。"},
 'ZY-SHUOGUA-GEN-ZHONGSHI':{title:"《周易口义》说卦·艮东北成终成始",url:"https://zh.wikisource.org/wiki/周易口義_(四庫全書本)/説卦",scope:"艮东北及万物成终成始只是传统卦象，不能据以替本人许下一次约定。"},
 'ZY-BENYI-TUFANG':{title:"《原本周易本义》序·伏羲与文王八卦方位",url:"https://zh.wikisource.org/wiki/原本周易本義_(四庫全書本)/序",scope:"伏羲方位图引邵子艮西北，文王方位东北；本预览沿用梅花卷一原本用艮东北，实际位置须据事实。"},
 'ZY-JIJIE52-L6':{title:"李鼎祚《周易集解》卷十·艮上九",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十",scope:"虞翻坤为厚、阳上据坤供对读王孔敦厚自终，不改本盘秋令的强弱。"},
 'ZY-BENYI-QIAN-YOUZHONG':{title:"《周易本义》卷一·谦卦有终",url:"../../../sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷1.txt",scope:"谦卦辞君子有终在朱注为先屈后伸，仅与艮上九厚终对读，不增加一处卦内生扶。"},
 'ZY-QIAN15-L6':{title:"《周易正义》谦卦上六",url:"../../../sources/reference/zhouyi-zhengyi-hans/02謙.txt",scope:"变卦上六原辞仅对读，不另起新占、不移为现实时地或查访办法。"},
 'ZY-JIJIE53-L1':{title:"李鼎祚《周易集解》卷十一·渐初六",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以初失位、动而得正释厉与无咎，对读王孔有言而义无咎。不据古辞替真人断年龄、地点或失联事由。"},
 'MH-HU-ORIGIN':{title:"《梅花易数》卷一·互卦起例",url:"https://zh.wikisource.org/wiki/梅花易數/卷一#互卦起例",scope:"说明取原卦中间四爻分两互。正文如用所列乾坤另法须明言；渐初六不涉及乾坤无互。"},
 'YC-JIAN53-L2':{title:"《伊川易传》卷四·渐六二",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"渐六二由中正与九五应释进之安，素为空，观得志行道。与王孔素故、朱子征素餐对读。"},
 'ZY-XUN57-TUAN':{title:"《周易正义》巽卦彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/06巽.txt",scope:"重巽以申命释上下相巽而申明命令；借辨反复问讯与得到实际答复，仍以本动爻和互变原盘论。"},
 'ZY-JIJIE53-L2':{title:"李鼎祚《周易集解》卷十一·渐六二",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以艮山石、坎为聚释磐，供对读王孔山石之安，不以名物合现实地证。"},
 'YC-JIAN53-L3':{title:"《伊川易传》卷四·渐九三",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"渐九三与小象。离叛群类为可丑，以顺道相保并强调自守以正。并读王注、孔疏训丑为类及三四相保，不转成真实人员与因果。"},
 'ZYZS-JIAN53-L4':{title:"四库本《周易注疏》卷九·渐六四",url:"https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷09",scope:"六四孔疏作六四与三相得，后文仍释四乘三体及三上顺。和维基文库《正义》渐篇网页异文对读。"},
 'ZY-JIJIE53-L4':{title:"《周易集解》卷十一·渐六四",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以巽长木、艮小木诸象解释方椽，四承五而顾三，释或得其桷，不取为实际建筑或方位。"},
 'YC-JIAN53-L4':{title:"《伊川易传》卷四·渐六四",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传六四本处非安地，或得横平之柯而安，居正巽顺为无咎所由，不以爻辞代实情核安危。"},
 'ZY-MENG-L5-XIANG':{title:"《周易正义》蒙卦六五",url:"../../../sources/reference/zhouyi-zhengyi-hans/01蒙.txt",scope:"对读蒙六五小象的顺以巽。上下文是童蒙受教，不移作渐六四时的角色及人事。"},
 'ZY-JIAREN-L2-XIANG':{title:"《周易正义》家人卦六二",url:"../../../sources/reference/zhouyi-zhengyi-hans/04家人.txt",scope:"对读家人六二小象顺以巽。家人六二居内中馈与渐六四遇桷，各从本爻。"},
 'ZY-DUN33-TUAN':{title:"《周易正义》遯卦卦辞与彖",url:"../../../sources/reference/zhouyi-zhengyi-hans/04遯.txt",scope:"变遯时读遯亨、小利贞及阴渐长，不因此改原体，也不据遯名替真实失联者定行迹或动机。"},
 'MH-REN2':{title:"《梅花易数》卷二·人事占第二",url:"https://zh.wikisource.org/wiki/梅花易數/卷二#人事占第二",scope:"用克体不宜、体生用有耗失，同时详看互变，复究盛衰。用于查访所费，不断所寻者现实安危或原因。"},
 'ZY-KUN47-L1':{title:"《周易正义》困卦初六",url:"../../../sources/reference/zhouyi-zhengyi-hans/05困.txt",scope:"困初六三岁不觌，是处困有应而二隔、困解乃出。与渐九五正应受隔终合对读，不把任何一爻的时数用作实际寻人日期。"},
 'YC-JIAN53-L5':{title:"《伊川易传》卷四·渐九五",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传释陵高阜及所愿为君臣以中正相交、其道当行，不将古注当本人实际所处、意愿。"},
 'ZY-JIJIE53-L5':{title:"《周易集解》卷十一·渐九五",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻释陵为丘、妇谓四、离孕坎岁，训胜为陵。辨取象、训词与本占实际体用、处所。"},
 'ZY-GEN52-TUAN':{title:"《周易正义》艮卦大象及疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/05艮.txt",scope:"艮大象兼山，孔疏两山重叠而止义愈明。并读渐九五末上下艮同土，不因卦象重叠改月令旺衰。"},
 'MH-NEIWAI':{title:"《梅花易数》卷三·体用生克之诀",url:"https://zh.wikisource.org/wiki/梅花易數/卷三#體用生克之訣",scope:"区分内卦体用互变与外卦所见真火、火形火色及力度。外部取象不重定本盘互离五行旺衰。"},
 'YC-JIAN53-L6':{title:"《伊川易传》卷四·渐上九",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"引安定胡公陆为逵、云路；进而不失其序，解释上九仪吉、小象不可乱，不据以定现实行迹。"},
 'ZY-JIJIE53-L6':{title:"《周易集解》卷十一·渐上九",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"干宝德可受、仪可象，从女归及母教语境释本卦上爻；虞翻陆谓三、上之三得正为其取象。均不改变本占的动爻或实地。"},
 'ZY-JIAN39-TUAN':{title:"《周易正义》蹇卦卦辞与彖",url:"../../../sources/reference/zhouyi-zhengyi-hans/04蹇.txt",scope:"蹇彖见险而能止，孔疏以外坎、内艮释险止。不据古义为本人补入真实察险或折返缘由。"},
 'ZY-LV10-L3':{title:"《周易正义》履卦六三",url:"../../../sources/reference/zhouyi-zhengyi-hans/02履.txt",scope:"跛能履与小象不足以与行。与归妹初九吉相承对读；有行动能力不证明走过某段，身体状况据实。"},
 'ZY-TAI11-L5':{title:"《周易正义》泰卦六五",url:"../../../sources/reference/zhouyi-zhengyi-hans/02泰.txt",scope:"泰六五帝乙归妹，与归妹卦名下孔疏所见兄嫁妹及以娣随姊所指分说，不为现实亲属关系作证。"},
 'ZY-JIJIE54-L1':{title:"《周易集解》卷十一·归妹初九",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"该网页录经为跛而履，虞翻释履为礼、坎为曳，并以阳得正释恒。对读王孔及四库本《集解》。"},
 'ZY-SK-JIJIE54-L1':{title:"四库本《周易集解》卷十一·归妹初九",url:"https://zh.wikisource.org/wiki/周易集解_(四庫全書本)/卷11",scope:"经文跛能履，虞翻注文内写跛而履。以此与同站通行电子录文分层对读。"},
 'LJ-HUNYI':{title:"《礼记》昏义",url:"https://zh.wikisource.org/wiki/禮記/昏義",scope:"先明婚礼合二姓、事宗庙、继后世的语境，再对读归妹彖人之终始。古代礼义不推真人失联原因。"},
 'ZY-GUIMEI54-L3':{title:"《周易正义》归妹六三",url:"../../../sources/reference/zhouyi-zhengyi-hans/05歸妹.txt",scope:"比较初九以娣而行和六三以须、反归以娣还须待时，不以古礼主客指当事人。"},
 'ZYZS-GUIMEI54-L2':{title:"四库本《周易注疏》卷九·归妹九二",url:"https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷09",scope:"小象疏四库电子本作九二失位，异于单卦《正义》网页九三失位。居内处中及未变常均属归妹九二。"},
 'ZY-LV10-L2':{title:"《周易正义》履卦九二",url:"../../../sources/reference/zhouyi-zhengyi-hans/02履.txt",scope:"履道坦坦、幽人贞吉从居中谦退解，对读归妹九二失位而仍守常，不据幽人补现实去处。"},
 'ZY-JIJIE54-L2':{title:"《周易集解》卷十一·归妹九二",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻视应五，幽人谓二，初动二在坎中是其取象。保留本盘九二的实际动爻与末震。"},
 'YC-GUIMEI54-L2':{title:"《伊川易传》卷四·归妹九二",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传释未变常、幽贞及利为宜于如是之贞，非不足而为之戒。"},
 'ZY-SHUOGUA-LIMU':{title:"《周易正义》说卦卷九之九",url:"https://zh.wikisource.org/wiki/周易正義/09.09",scope:"离为目取近于人身；用于区别下离的类象、互卦体用生克和现实人的视力及目击证据。"},
 'ZY-ZHEN51-XIANG':{title:"《周易正义》震卦大象",url:"../../../sources/reference/zhouyi-zhengyi-hans/05震.txt",scope:"孔疏训洊为重、因仍。以重震的卦象对照末震和原体五行比和，各依月气。"},
 'ZY-SHUOGUA-ZHENDONG':{title:"《易传》说卦·第七章",url:"https://zh.wikisource.org/wiki/周易/說卦#第七章",scope:"震动是取卦德。和动静取体用的哪一爻变动分读，不推实际人员已动。"},
 'YC-GUIMEI54-L3':{title:"《伊川易传》卷四·归妹六三",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传须为待，未有所适，分别读《本义》或曰另说，不能为现实本人定身份或日期。"},
 'ZY-JIJIE54-L3':{title:"《周易集解》卷十一·归妹六三",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"此录本小象有位字，虞翻以三未变阳释位不当；须训需，自初至五取需象，均各按古注。"},
 'ZY-DAZHUANG34-TUAN':{title:"《周易正义》大壮卦辞及彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/04大壯.txt",scope:"大壮阳长至四，乾刚而震动，卦名及利贞依古文义。不改季土原体上震及末下乾的克向。"},
 'ZY-KUIYU54-L3':{title:"《周易窥余》卷十三·归妹六三",url:"https://zh.wikisource.org/wiki/周易窺餘_(四庫全書本)/卷13",scope:"释六三娣于九二；录胡安定以兄弟姊妹婚礼的旧例谈待年，也指出与该爻义不合。各守古注适用范围。"},
 'ZY-YAOYI54-L3':{title:"《周易要义》归妹六三条",url:"https://zh.wikisource.org/wiki/周易要義_(四庫全書本)/全覽",scope:"六三须如字待，郑氏才智之称，荀陆作嬬且陆云妾也；释文及经句各照其原。"},
 'ZY-GUIMEI54-TUAN':{title:"《周易正义》归妹彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/05歸妹.txt",scope:"彖说以动由本卦下兑上震读；六三动后下乾的克向无从借用原兑的卦德。"},
 'ZYZS-GUIMEI54-L4':{title:"四库本《周易注疏》卷九·归妹九四",url:"https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷09",scope:"四库本九四孔疏作居不得位，与单篇网页录文有异。王注九四不正无应，对读九二与六五相应。"},
 'LJ-HUNYI-QINGQI':{title:"《礼记》昏义·请期",url:"https://zh.wikisource.org/wiki/禮記/昏義",scope:"请期为古昏礼之节。说明谁有待、谁所约是哪件事均依实情，不以古礼给所寻者定联系日。"},
 'ZY-JIJIE54-L4':{title:"《周易集解》卷十一·归妹九四",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻愆训为过，见日月及四时之象。与本占实际未令及末上坤土候分别核。"},
 'ZY-LIN19-JING':{title:"《周易正义》临卦卦辞与疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/03臨.txt",scope:"临卦至于八月孔疏以建丑至建申、阴长阳退释。变卦辞不作实际月令或联系日期。"},
 'YC-GUIMEI54-L4':{title:"《伊川易传》卷四·归妹九四",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"释九四愆期之志由己不由彼，与王注所待对照。古注不代真人说明迟延原因。"},
 'YC-GUIMEI54-L5':{title:"《伊川易传》卷四·归妹六五",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程传以尚礼不尚饰释衣袂，近望而未盈释六五不亢；不代现实身份、衣着和日期。"},
 'ZY-XIAOXU09-L6':{title:"《周易正义》小畜上九",url:"../../../sources/reference/zhouyi-zhengyi-hans/02小畜.txt",scope:"小畜上九月几望接君子征凶；分别在本爻上下文读，不套归妹或实际日期。"},
 'ZY-ZHONGFU61-L4':{title:"《周易正义》中孚六四",url:"../../../sources/reference/zhouyi-zhengyi-hans/06中孚.txt",scope:"中孚六四月几望接马匹亡无咎，重在以盛不争；与归妹六五同语异义。"},
 'ZY-JIJIE54-L5':{title:"《周易集解》卷十一·归妹六五",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻释袂为口袂之饰，兌取口乾取衣；震帝、坤乙各为注家取象，不改实际六五动。"},
 'LJ-YUZAO-MEI':{title:"《礼记·玉藻》袂可以回肘",url:"https://zh.wikisource.org/wiki/禮記/玉藻",scope:"深衣袖制所容为礼文，不用于确定本人实际动作、身体或位置。"},
 'ZYZS-GUIMEI54-L6':{title:"四库本《周易注疏》卷九·归妹上六",url:"https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷09",scope:"经作刲羊无血，王注、孔疏处与单篇录文分别校对。"},
 'ZY-JIJIE54-L6':{title:"《周易集解》卷十一·归妹上六",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以震筐坤虚和兑羊离刀释辞，以三四复位成泰、坎象不见释无血，不同于本占上六动成睽。"},
 'YC-GUIMEI54-L6':{title:"《伊川易传》卷四·归妹上六",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"筐篚所供和夫妇共承宗庙同在古礼语境，两项各依实物，不能由旧礼归罪于实际人物。"},
 'ZY-KUI38-TUAN-XIANG':{title:"《周易正义》睽彖传、大象",url:"../../../sources/reference/zhouyi-zhengyi-hans/04睽.txt",scope:"孔疏以火炎上、泽润下释睽义，以各司其事释君子同而异；两说均不落作现实人地。"},
 'ZYLV-MINGYAO':{title:"王弼《周易略例·明爻通变》",url:"https://zh.wikisource.org/wiki/周易略例/明爻通變",scope:"以近不必比、远不必乖辨爻情；亲疏不能替本人定位、推定失联缘故或证明见闻。"},
 'ZY-JIJIE55-L1':{title:"《周易集解》卷十一·丰初九",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻从四变坤应初、坤数十和离为日释旬，与王注训均分读；古辞不决定实际联系日期。"},
 'YC-FENG55-L1':{title:"《伊川易传》卷四·丰初九",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"初九明之初、九四动之初，各自相资；丰初九称配、九四称夷按各爻所指。"},
 'ZY-DAGUO28-TUAN':{title:"《周易正义》大过彖传",url:"../../../sources/reference/zhouyi-zhengyi-hans/03大過.txt",scope:"彖本末弱按王注指初上；大过为互卦时两互分别比对原体，不代替本卦与末变。"},
 'ZY-XIAOGUO62-TUAN':{title:"《周易正义》小过卦辞及彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/06小過.txt",scope:"孔疏对读大过音相过之过，说明小过名称用义；卦辞大小事另按彖疏，不改实际所见。"},
 'ZY-XICI-TONGXIN':{title:"《周易正义》系辞上·其利断金",url:"../../../sources/reference/zhouyi-zhengyi-hans/07.06.txt",scope:"孔疏以金之坚刚盛言同心之利，导出的是经文譬义；不重算本盘体互上兑克原体。"},
 'ZY-JIJIE55-L2':{title:"《周易集解》卷十一·丰六二",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以云蔽日释蔀，另取坎孚；《九家易》说明信见于五再发志，皆为古注解释。"},
 'ZYZS-FENG55-L2':{title:"四库本《周易注疏》卷九·丰六二音义",url:"https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷09",scope:"音义录孟本见主，王注孔疏依见斗释明暗；版本异文不能替寻访确认眼下本人。"},
 'YC-FENG55-L2':{title:"《伊川易传》卷四·丰六二",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"程颐以己之孚信感发上之心志，和孔疏六二自发、九家信著于五分别读。"},
 'ZY-JIJIE55-L3':{title:"《周易集解》卷十一·丰九三",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以沬为小星，又借兑取折与右、噬嗑艮取肱；不改本盘实际动爻。"},
 'ZY-DAZHUANG34-XIANG':{title:"《周易正义》大壮大象",url:"../../../sources/reference/zhouyi-zhengyi-hans/04大壯.txt",scope:"转入大壮可对读非礼弗履的经戒，不独立改变末下乾克上震的关系。"},
 'YC-FENG55-L3':{title:"《伊川易传》卷四·丰九三",url:"../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷4.txt",scope:"沛与斾旧本及幡幔之义，论暗甚于蔀及无所凭不归咎，各依九三原文。"},
 'ZYZS-FENG55-L3':{title:"四库本《周易注疏》卷九·丰九三音义",url:"https://zh.wikisource.org/wiki/周易注疏_(四庫全書本)/卷09",scope:"音义录姚氏滂沛、肱作股，郑氏韦为蔽膝，王注孔疏依幡幔与右肱分读，均不用于判真人所在地或安危。"},
 'ZY-XUGUA-GUIMEI-FENG':{title:"《周易正义》序卦·归妹受之以丰",url:"../../../sources/reference/zhouyi-zhengyi-hans/10.txt",scope:"序卦从得其所归释丰卦居次及卦名之大，和丰九三不任大事分读。"},
 'ZY-JIJIE55-L4':{title:"《周易集解》卷十一·丰九四",url:"https://zh.wikisource.org/wiki/周易集解_(李鼎祚)/卷十一",scope:"虞翻以明夷三体震释夷主，卷内按语另以伤及指五，此爻坎为幽分读。"},
 'ZY-MINGYI36-TUAN':{title:"《周易正义》明夷卦辞与彖疏",url:"../../../sources/reference/zhouyi-zhengyi-hans/04明夷.txt",scope:"明入地中取离坤二体，内文明外柔顺及艰贞按文王箕子旧例释，不给真人添大难。"},
 'ZY-MINGYI36-XIANG':{title:"《周易正义》明夷大象",url:"../../../sources/reference/zhouyi-zhengyi-hans/04明夷.txt",scope:"用晦而明按莅众和藏明释，不从卦辞推真人有意瞒人。"},
 'ZYLV-MINGTUAN':{title:"王弼《周易略例·明彖》",url:"https://zh.wikisource.org/wiki/周易略例/明彖",scope:"彖统论一卦之体，与丰九四动爻及梅花的阶段关系分别读。"},
 'ZY-XICI-LIGUA':{title:"《周易正义》系辞下·立卦与爻辞",url:"../../../sources/reference/zhouyi-zhengyi-hans/08.1.txt",scope:"旧注分别立卦之义和爻辞适时之功，不能以变卦名掩本爻及生克。"},
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
