"""Import the supplied DOCX losslessly; publish text/structure facts separately from commentary.
Only stdlib. All exclusions and replacements have source paragraph IDs and evidence.
"""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json, re, hashlib, collections, copy

ROOT=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+NS['w']+'}'
SOURCE='user-detailed-docx'
PATCHES=[];QUARANTINE=[];VARIANTS=[]

def save(path,x):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')

def text_of(p):
    return ''.join((n.text or '') if n.tag==W+'t' else '\t' if n.tag==W+'tab' else '\n' if n.tag in (W+'br',W+'cr') else '' for n in p.iter())

def sha(b):return hashlib.sha256(b).hexdigest()

def normalize(s):
    return re.sub(r'[\W_\s]','',s.translate(str.maketrans({'陰':'阴','陽':'阳','係':'系','闚':'窥','遯':'遁','顒':'颙','祐':'佑'})))

def ref(p):return {'sourceId':SOURCE,'part':'word/document.xml','paragraphId':p['id'],'bodyParagraph':p['bodyParagraph']}

def edit(p,after,reason,evidence,kind='correction'):
    before=p['text']
    if before==after:return
    item={'id':f'detail-edit-{len(PATCHES)+1:04}','sourceRef':ref(p),'before':before,'after':after,'reason':reason,'evidence':evidence,'kind':kind}
    PATCHES.append(item);p['text']=after;p.setdefault('patchIds',[]).append(item['id'])

def discard(p,reason,evidence):
    QUARANTINE.append({'sourceRef':ref(p),'text':p['text'],'style':p['style'],'reason':reason,'evidence':evidence,'status':'excluded-from-runtime-and-database'})

def source_paragraphs():
    path=ROOT/'sources/original/zhouyi64-detailed.docx'
    with ZipFile(path) as z:
        assert z.testzip() is None,'Corrupt DOCX archive'
        root=ET.fromstring(z.read('word/document.xml'))
        assert not root.findall('.//w:ins',NS) and not root.findall('.//w:del',NS),'Review tracked changes explicitly'
        assert not any(n.startswith('word/media/') for n in z.namelist()),'Images need separate handling'
        body=root.find('w:body',NS);allps=body.findall('.//w:p',NS);ordinals={id(p):i for i,p in enumerate(allps,1)}
        tops={id(p):i for i,p in enumerate(body.findall('w:p',NS),1)}
        rows=[]
        for p in allps:
            st=p.find('w:pPr/w:pStyle',NS)
            rows.append({'id':f'p-{ordinals[id(p)]:05}','paragraph':ordinals[id(p)],'bodyParagraph':tops.get(id(p)),
                         'style':st.get(W+'val') if st is not None else 'Normal','text':text_of(p),
                         'location':'body' if id(p) in tops else 'table'})
    out=ROOT/'sources/extracted/zhouyi64-detailed.jsonl';out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(''.join(json.dumps(p,ensure_ascii=False,separators=(',',':'))+'\n' for p in rows),encoding='utf-8',newline='\n')
    return rows,{'id':SOURCE,'path':path.relative_to(ROOT).as_posix(),'originalFilename':'周易六十四卦详解.docx','bytes':path.stat().st_size,
                 'sha256':sha(path.read_bytes()),'extractedPath':out.relative_to(ROOT).as_posix(),'extractedSha256':sha(out.read_bytes()),
                 'paragraphs':len(rows),'bodyParagraphs':len(tops),'tableParagraphs':len(rows)-len(tops),
                 'textCharacters':sum(len(p['text']) for p in rows),'wordCharacterClaim':'all extracted characters accounted for; not a claim that all interpretations are provable facts'}

# Specific paragraph spans containing another line/hexagram's interpretation.
# IDs below are stable top-level body paragraph ordinals in this uploaded file.
SPANS=[(291,292,'坤六五混入六四括囊解释'),(423,424,'屯六四重复六三即鹿解释'),
       (584,585,'蒙六五混入上九御寇解释'),(1139,1141,'比六四混入六三比之匪人解释'),
       (1945,1946,'大有初九混入同人初九'),(1964,1966,'大有九二混入同人六二'),
       (1984,1987,'大有九三混入同人九三'),(2005,2006,'大有九四混入同人九四'),
       (2024,2025,'大有六五混入同人九五'),(2043,2045,'大有上九混入同人上九'),
       (2091,2093,'谦初六混入大有初九'),(2111,2112,'谦六二混入大有九二'),
       (2130,2131,'谦九三混入大有九三'),(2149,2151,'谦六四混入大有九四'),
       (2169,2170,'谦六五混入大有六五'),(2188,2189,'谦上六混入大有上九'),
       (1372,1374,'履初九混入九二幽人解释'),
       (7576,7581,'丰初九所署邵雍/傅佩荣解释混入归妹初九，不能以新编文字冒充作者原话'),
       (8003,8017,'兑九四内重复插入九五完整解释及归妹变卦')]

REPLACE={
 753:[('做事谋始','作事谋始')], 1656:[('否，享','否，亨')],
 2053:[('多余昀','多余的')],2640:[('客保民','容保民')],
 2709:[('即忧之','既忧之')],2710:[('即忧之','既忧之')],
 3431:[('无只悔','无祗悔')],3704:[('曰闲舆卫','日闲舆卫')],3723:[('童豕之牿','童牛之牿')],
 3740:[('八四：','六四：')],4055:[('老妇土夫','老妇士夫')],4204:[('只既平','祇既平')],
 4999:[('受之介福','受兹介福')],5114:[('三是不食','三日不食')],
 7107:[('公诉','公餗')],7109:[('公诉','公餗')],7613:[('日中见昧','日中见沬')],
 7677:[('三岁不见','三岁不觌')],8529:[('西郊之禴祭','西邻之禴祭')],8541:[('濡其道','濡其首')],8543:[('濡其道','濡其首')],
 565:[('屯卦第四爻人生启示','蒙卦第四爻人生启示')],
 2705:[('九二属于阳爻居于刚位','九二属于阳爻居于柔位'),('九二与六二都属于失位','九二与六五都属于失位')],
 3030:[('因为六三阳爻居刚位','因为六三阴爻居刚位')],
 4049:[('九四阴爻居阳位','九四阳爻居阴位')],
 5057:[('九四爻属于阴爻居刚位','九四爻属于阳爻居柔位'),('像鼦鼠那样中，既贪焚','像鼫鼠那样，既贪婪'),('鼦鼠','鼫鼠')],
 5059:[('位置不当六五被众阴','位置不当。九四被众阴')],
 5700:[('初六是阴爻居柔位','初六是阴爻居刚位')],
 6441:[('六三阴爻居柔位','六三阴爻居刚位'),('六三与九四、九五仍存在着亲比关系','六三与九四相邻，仍有向上寻求会聚的可能')],
 6972:[('六二以阳爻居柔位','六二以阴爻居柔位'),('行有佳','行有嘉')],
 7350:[('初六属于阴爻居柔位','初六属于阴爻居刚位')],7353:[('水子之厉','小子之厉'),('突难','灾难')],
 7969:[('九二以阳爻居刚位','九二以阳爻居柔位')],
 604:[('先发治人','先发制人')],1794:[('同人干门','同人于门')],1872:[('号眺','号咷'),('天罔极上遇，','')],
 7925:[('善长','擅长')],8026:[('受受到','受到'),('阿谀奉诚','阿谀奉承')],8588:[('见微知巨','见微知著')],
}

NOTES={
 (2,5):'六五以“黄裳，元吉”说明内在中顺之德，不以六四“括囊”代替本爻。黄为中色，裳在下，传统解读重在居中而谦下。',
 (3,4):'六四以求婚与相合为象。小象“求而往，明也”强调主动寻求适当联系；这与六三没有引导而逐鹿的情境不同。',
 (4,5):'六五“童蒙，吉”，小象以“顺以巽也”说明虚心受教的态度。这里不是上九“利用御寇”的警戒之义。',
 (8,4):'六四“外比之，贞吉”，小象以“以从上也”说明向外亲比、守正相从；不能以六三“比之匪人”代替本爻。',
 (14,1):'初九处大有之初，以不交于害、保持艰慎为要。尚未承担重任时，也不应因处境富足而放松戒惧。',
 (14,2):'九二“大车以载”，小象“积中不败也”，借能承载之车说明内有积蓄、能够担当。重点是充实能力与谨慎任事。',
 (14,3):'九三“公用亨于天子，小人弗克”，用朝享之礼说明有德者能够承担相应礼遇，小人则难以胜任。亨字的通读需结合所据注本。',
 (14,4):'九四“匪其彭，无咎”，小象强调明辨。处在富盛之时能辨轻重、不自夸其盛，是这条爻辞的一种传统读法。',
 (14,5):'六五以诚信相交而有威仪，既不失亲和，也有使人敬重的分寸。小象“信以发志”与“易而无备”应结合阅读。',
 (14,6):'上九“自天佑之，吉无不利”，小象“上吉大有祐也”。传统读法重视顺道、守信与尚贤，不把这句话改写为现实收益的保证。',
 (15,1):'初六“谦谦君子”，小象“卑以自牧也”，强调谦下并以此自我修养。涉大川的象意须与这种品德条件一起理解。',
 (15,2):'六二“鸣谦，贞吉”，小象“中心得也”，重在内心确有谦德而自然表现于外，不是只求谦逊的名声。',
 (15,3):'九三“劳谦君子”，有功劳而不自矜；小象“万民服也”将众人信服与这种品德联系起来。',
 (15,4):'六四“撝谦”，小象“不违则也”，强调施行谦道而不违准则。这里不是大有九四关于富盛的爻辞。',
 (15,5):'六五“不富以其邻，利用侵伐”，说明谦道并非放弃原则；小象“征不服也”应放在古代秩序与征伐语境中理解。',
 (15,6):'上六“鸣谦，利用行师，征邑国”，与志愿未遂、整治自身所属的古代政治语境相连，不是“大有上九”的天佑之辞。',
 (55,1):'初九“遇其配主，虽旬无咎，往有尚”。依古注将“旬”读作均等，指与相配者相互成就；小象提醒不要争相压过对方。',
}

def evidence(h):return {'hexagramId':h['id'],'referenceId':h['referenceId'],'url':h['referenceUrl'],'structuralRule':'六爻由下至上；奇位阳位、偶位阴位；单动爻只翻转该位'}

def import_book(rows,cat):
    ps=[copy.deepcopy(p) for p in rows if p['location']=='body'];heads=[i for i,p in enumerate(ps) if p['style']=='Heading1']+[len(ps)]
    assert len(heads)==65
    bybits={tuple(h['bitsBottomUp']):h for h in cat['hexagrams']};results=[];coverage={};rawchanges=[]
    for i,h in enumerate(cat['hexagrams']):
        span=ps[heads[i]:heads[i+1]];m=re.fullmatch(r'第(\d+)卦\s+(.+?)\s+·\s+(.+)',span[0]['text']);assert m and int(m[1])==h['id'] and m[3]==h['name']
        assert span[1]['text']==h['upperTrigram']+'上'+h['lowerTrigram']+'下'
        groups=[];group={'key':'intro','label':'卦义','sections':[]};groups.append(group);section=None;line=0
        for p in span[2:]:
            b=p['bodyParagraph'];t=p['text'];lm=re.fullmatch(r'([1-6]) · (初[九六]|[九六][二三四五]|上[九六])',t)
            if lm:
                line=int(lm[1]);assert lm[2]==h['lines'][line-1]['label']
                group={'key':f'line-{line}','position':line,'label':lm[2],'sections':[]};groups.append(group);section=None;coverage[p['id']]='heading';continue
            if t.startswith('附 · '):
                label=t.split(' · ')[1];assert h['id'] in (1,2) and label==h['specialLines'][0]['label']
                group={'key':label,'label':label,'sections':[]};groups.append(group);section={'title':'特殊用爻','paragraphs':[]};group['sections'].append(section);coverage[p['id']]='heading';continue
            exclusions=[reason for a,z,reason in SPANS if a<=b<=z]
            if exclusions:
                discard(p,exclusions[0],evidence(h));coverage[p['id']]='quarantined';continue
            if p['style'] in ('Heading2','Heading3'):
                # The DOCX injects false heading rows into already-running white-language/philosophy paragraphs.
                if t=='爻辞与象辞' and any(s['title'] in ('爻辞与象辞','爻辞、象辞与白话') for s in group['sections']):
                    edit(p,'','重复伪标题切断白话或哲学段，合并回原段落',evidence(h),'formatting');coverage[p['id']]='formatting-repaired';continue
                section={'title':t,'paragraphs':[]};group['sections'].append(section);coverage[p['id']]='heading';continue
            if section is None:
                section={'title':'整理说明','paragraphs':[]};group['sections'].append(section)
            if b in REPLACE:
                after=t
                for a,z in REPLACE[b]:
                    assert a in after,(b,a);after=after.replace(a,z)
                edit(p,after,'按经文见证、上下文或爻位结构修正明确错字/陈述',evidence(h));t=p['text']
            if b==1371:
                marker='从卦象上看，九二';cut=t.index(marker)
                discard({**p,'text':t[cut:]},'履初九段末夹入九二解释，后半段隔离',evidence(h));edit(p,t[:cut],'分离混入的九二解释',evidence(h),'scope-repair');t=p['text']
            if b in (372,373):
                original=h['lines'][1]
                after=('六二：'+original['vernacular']) if b==372 else ('《象辞》说：'+original['imageVernacular'])
                edit(p,after,'沿用已据古注校订的字/反常读法，避免怀孕及异常的误解',{'url':'https://zh.wikisource.org/zh-hans/周易正義/01屯'});t=p['text']
            if h['id']==55 and line==1 and b in (7570,7571,7573,7574,7583):
                ln=h['lines'][0];after={7570:'初九。'+ln['text'],7571:'象曰：'+ln['image'],
                  7573:'初九：遇到可以相配共事的人；双方地位相当，彼此协作便可免咎，前行有所嘉许。“旬”在此依古注作均等解。',
                  7574:'《象辞》说：“虽旬无咎”重在相均相成；若争相压过对方，则可能生灾。',
                  7583:'初九爻动，变为第62卦《小过卦》（雷山小过）。'}[b]
                edit(p,after,'丰初九误贴归妹内容；恢复本爻并按阴阳位复算变卦',{'url':'https://zh.wikisource.org/zh-hans/周易正義/06豐','computedChangedHexagramId':62});t=p['text']
            # Do not pass folk poems off as the classical Image commentary.
            after=re.sub(r'《象》(?:中|是)?(?:这样|这样来|是这样来|这样来)?(?:评断|评判|断|来断|判断)(?:此卦|这一卦)|《象》中对此卦的断语', '民间卦象诗对此卦的描述',t)
            if after!=t:edit(p,after,'民间吉凶诗与周易象传分清来源',{'sourceId':'user-grade-table'},'attribution-label');t=after
            if h['grade']['poem'][:8] in t and '《象》' in t:
                end=t.index(h['grade']['poem'][:8]);start=t.rfind('《象》',0,end)
                if start>=0:
                    after=t[:start]+'民间卦象诗'+t[start+3:]
                    edit(p,after,'与用户诗象逐字对应的民间诗不应署为周易象传',{'sourceId':'user-grade-table'},'attribution-label');t=after
            section['paragraphs'].append({'id':p['id'],'text':t,'sourceRef':ref(p),'patchIds':p.get('patchIds',[]),'contentKind':'historical-commentary;not-verified-outcome'})
            coverage[p['id']]='retained-commentary'
        assert [g['position'] for g in groups if 'position' in g]==list(range(1,7))
        # Every classical opening is compared character by character. Runtime uses one canonical text source.
        for g in groups:
            pos=g.get('position');expected=h['lines'][pos-1] if pos else h['reading'] if g['key']=='intro' else h['specialLines'][0]
            classical=next((s for s in g['sections'] if '辞与象辞' in s['title'] or '辞、象辞与白话' in s['title']),None)
            if classical:
                originals=[p for p in classical['paragraphs'] if not p['text'].startswith('【白话】')]
                assert len(originals)>=2,(h['id'],g['key'],originals)
                for p,k in zip(originals,['text','image']):
                    value=re.sub(r'^(?:《象》曰|象曰)[：:]','',p['text']);value=re.sub(r'^(初[九六]|[九六][二三四五]|上[九六]|用[九六])[。，：,]','',value)
                    if g['key']=='intro':value=re.sub(r'^'+re.escape(h['shortName'])+r'[：:。，]','',value)
                    exp=expected[k]
                    if g['key']=='intro':exp=re.sub(r'^'+re.escape(h['shortName'])+r'[：:。，]','',exp)
                    if normalize(value)!=normalize(exp):
                        VARIANTS.append({'hexagramId':h['id'],'scope':g['key'],'field':k,'sourceRef':p['sourceRef'],'sourceText':p['text'],'canonicalText':expected[k],'referenceUrl':h['referenceUrl'],'status':'source-variant-or-editorial-difference;canonical-runtime-does-not-import-this-field'})
            for s in g['sections']:
                if s['title']=='爻变与变卦' and pos:
                    bits=h['bitsBottomUp'].copy();bits[pos-1]^=1;target=bybits[tuple(bits)]
                    for p in s['paragraphs']:
                        match=re.search(r'第(\d+)卦',p['text'])
                        if not match:continue
                        assert int(match[1])==target['id'],(h['id'],pos,p)
                        assert not re.search(r'(初[九六]|[九六][二三四五]|上[九六])爻动',p['text']) or p['text'].startswith(g['label']), (h['id'],pos,p)
                        rawchanges.append((h['id'],pos,target['id']))
            g['sections']=[s for s in g['sections'] if s['paragraphs']]
        commentary={'schemaVersion':'1.0.0','contentVersion':cat['contentVersion'],'hexagramId':h['id'],'name':h['name'],'sourceId':SOURCE,
           'trustScope':'source-commentary-only;not-authoritative-rules-or-proven-outcomes','attributions':'作者名为原稿所署，未核验独立出版版本；新补文字不署作这些作者原话',
           'groups':groups,'excludedParagraphs':sum(1 for p in span if coverage.get(p['id'])=='quarantined')}
        save(f'sources/commentary/{h["id"]:02}.json',commentary)
        lines=[]
        for pos,ln in enumerate(h['lines'],1):
            bits=h['bitsBottomUp'].copy();bits[pos-1]^=1;c=bybits[tuple(bits)];op=pos+3 if pos<=3 else pos-3
            structure={'polarity':'yang' if h['bitsBottomUp'][pos-1] else 'yin','positionType':'yang' if pos%2 else 'yin',
              'correctPosition':h['bitsBottomUp'][pos-1]==pos%2,'central':pos in (2,5),'respondingPosition':op,'oppositeResponse':h['bitsBottomUp'][pos-1]!=h['bitsBottomUp'][op-1]}
            notes=[]
            if (h['id'],pos) in NOTES:notes.append({'text':NOTES[h['id'],pos],'kind':'new-editorial-paraphrase','evidence':evidence(h)})
            g=next(g for g in groups if g.get('position')==pos)
            if not any('哲学' in s['title'] for s in g['sections']) and not notes:
                notes.append({'text':f'{ln["label"]}位于本卦第{pos}爻，'+('阳爻' if h['bitsBottomUp'][pos-1] else '阴爻')+f'；单爻变化得到第{c["id"]}卦{c["name"]}。爻义请结合本爻经文、小象与白话阅读。','kind':'computed-structural-note','evidence':evidence(h)})
            lines.append({'position':pos,'label':ln['label'],'canonicalLineId':ln['id'],'structure':structure,
              'changedHexagram':{'id':c['id'],'name':c['name'],'bitsBottomUp':bits},'editorialNotes':notes,'commentaryGroup':g['key']})
        detail={'schemaVersion':'1.0.0','contentVersion':cat['contentVersion'],'hexagramId':h['id'],'name':h['name'],
          'baseGrade':h['grade']['rawGrade'],'canonicalGrade':h['grade']['canonicalGrade'],'canonicalRef':{'path':'data/catalog.json','id':h['id']},
          'evidenceScope':'text-and-structure-collated;interpretation-is-not-a-proven-prediction','lines':lines,
          'specialLabels':[s['label'] for s in h['specialLines']], 'commentaryPath':f'sources/commentary/{h["id"]:02}.json'}
        save(f'data/details/{h["id"]:02}.json',detail);results.append(detail)
        coverage[span[0]['id']]='heading';coverage[span[1]['id']]='structure-checked'
    # Front matter and TOC are preserved in extraction; do not call them missing chapter text.
    for p in rows:
        if p['id'] not in coverage:coverage[p['id']]='table-of-contents' if p['location']=='table' else 'frontmatter'
    assert len(coverage)==len(rows)
    return results,coverage,rawchanges

def main():
    cat=json.loads((ROOT/'data/catalog.json').read_text());rows,manifest=source_paragraphs();results,coverage,changes=import_book(rows,cat)
    assert len(changes)==384 and len(set((h,p) for h,p,t in changes))==384
    save('data/details/index.json',{'schemaVersion':'1.0.0','contentVersion':cat['contentVersion'],'sourceId':SOURCE,
      'hexagrams':[{'id':d['hexagramId'],'name':d['name'],'path':f'data/details/{d["hexagramId"]:02}.json','commentaryPath':d['commentaryPath']} for d in results],
      'publicationGate':{'canonicalAndStructure':'required-for-runtime-database','commentary':'separate-explicit-reference-access','quarantine':'never-import'}})
    save('data/details/source-manifest.json',manifest);save('data/details/editorial-patches.json',PATCHES)
    save('data/details/variants.json',VARIANTS);save('sources/review/details-quarantine.json',QUARANTINE)
    report={'contentVersion':cat['contentVersion'],'source':manifest,'hexagrams':64,'ordinaryLines':384,'computedChanges':384,
      'sourceChangeStatementsChecked':len(changes),'editorialPatches':len(PATCHES),'quarantinedParagraphs':len(QUARANTINE),
      'retainedClassicalDifferencesInReferenceOnly':len(VARIANTS),'paragraphCoverage':dict(collections.Counter(coverage.values())),
      'coveredParagraphs':len(coverage),'blockingStructuralErrors':0,'unverifiedCommentaryAllowedInFactsDatabase':False,
      'semantics':'Coverage and exact structural checks do not certify metaphysical predictions, author attributions or every modern commentary sentence.'}
    save('data/details/import-report.json',report)
    save('sources/review/details-paragraph-dispositions.json',[{'paragraphId':p['id'],'bodyParagraph':p['bodyParagraph'],'characters':len(p['text']),'disposition':coverage[p['id']]} for p in rows])
    print(json.dumps({k:v for k,v in report.items() if k!='source'},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
