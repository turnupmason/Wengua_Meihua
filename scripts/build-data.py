"""Lossless import + explicitly recorded editorial patches. Python stdlib only."""
from pathlib import Path
import re, json, hashlib, collections, difflib

ROOT=Path(__file__).resolve().parents[1]
VERSION='2026.11.10.1'
PATCHES=[]
ISSUES=[]
DIFFERENCES=[]
def load(path):return json.loads((ROOT/path).read_text())
def save(path,data):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def sha(s):return hashlib.sha256(s.encode('utf-8')).hexdigest()
def normalized(s):
    s=s.translate(str.maketrans({'陽':'阳','陰':'阴','乾':'干','馀':'余'}))
    return re.sub(r'[\W_\s]','',s)
def section_ref(source,text,start,end):
    return {'sourceId':source,'startChar':start,'endChar':end,'startLine':text.count('\n',0,start)+1,'endLine':text.count('\n',0,max(start,end-1))+1}
def patch(source,record,field,before,after,reason,evidence):
    if before==after:return None
    item={'id':f'edit-{len(PATCHES)+1:04}','sourceId':source,'recordId':record,'field':field,'before':before,'after':after,'reason':reason,'evidence':evidence}
    PATCHES.append(item);return item['id']
def issue(code,record,description,**kw):
    ISSUES.append({'code':code,'recordId':record,'description':description,**kw})
def cn_number(t):
    nums={c:i for i,c in enumerate('零一二三四五六七八九')}
    if '十' not in t:return nums[t]
    a,b=t.split('十');return (nums[a] if a else 1)*10+(nums[b] if b else 0)

def parse_grade_source():
    s=(ROOT/'sources/original/grades64.txt').read_text()
    ms=list(re.finditer(r'^第(\d+)卦([^\n]+)',s,re.M));out=[]
    for i,m in enumerate(ms):
        b=s[m.start():ms[i+1].start() if i+1<len(ms) else len(s)]
        h=re.match(r'([^（]+)（([^）]+)）\s*(.*)',m[2].strip())
        grade=re.search(r'^(上上|中上|中中|中下|下下|上)卦\s*$',b,re.M)
        poem=re.search(r'^象曰：(.*)',b,re.M)
        pair=re.search(r'下([乾坤震巽坎离艮兑泽])上([乾坤震巽坎离艮兑泽])',b)
        out.append({'id':int(m[1]),'name':h[1].strip(),'alias':h[2].strip(),'theme':h[3].strip(),
                    'rawGrade':grade[0].strip(),'gradeSource':'user-grade-table',
                    'poem':poem[1].strip(),'poemLabel':'用户提供诗象（非周易象传）',
                    'description':b[b.index('这个卦'):].strip(),
                    'sourceRef':section_ref('user-grade-table',s,m.start(),m.start()+len(b)),
                    'trigramNamesFromDescription':[('兑' if x=='泽' else x) for x in pair.groups()]})
    assert [x['id'] for x in out]==list(range(1,65))
    alias=out[57]
    alias['rawSourceAlias']=alias['alias']
    patch('user-grade-table','hex-58','grade.alias',alias['alias'],'兑卦','原表泽卦为兑卦名称录入问题；泽为兑所象，不改诗象',{'referenceId':'zhouyi-58','url':load('sources/references/zhouyi-58.json')['url']})
    alias['alias']='兑卦'
    target=out[43]
    target['rawSourceGrade']=target['rawGrade']
    ident=patch('user-grade-correction','hex-44','grade.rawGrade',target['rawGrade'],'中卦','用户最新订正优先：天风姤显示中卦，覆盖此前上上卦订正',{'sourceId':'user-grade-correction','date':'2026-11-10'})
    target['rawGrade']='中卦';target['correctionPatchId']=ident
    for x in out:x['canonicalGrade']='中中卦' if x['rawGrade']=='中卦' else x['rawGrade']
    assert collections.Counter(x['canonicalGrade'] for x in out)=={'上上卦':15,'中上卦':20,'中中卦':8,'中下卦':8,'下下卦':13}
    return out

def parse_passage(text):
    result={'text':'','vernacular':'','image':'','imageVernacular':''}
    current='text'
    for line in text.strip().splitlines():
        line=line.strip()
        if not line:continue
        if re.match(r'^《象》\s*曰[：:]',line):
            current='image';line=re.sub(r'^《象》\s*曰[：:]','',line)
        elif line.startswith('【白话】'):
            current='imageVernacular' if current in ('image','imageVernacular') else 'vernacular'
            line=line[len('【白话】'):]
        result[current]+= ('\n' if result[current] else '')+line
    return result

def reference_for(i):
    p=ROOT/f'sources/references/zhouyi-{i:02}.json'
    if not p.exists():raise ValueError(f'Missing online reference for hexagram {i}; fetch references before building')
    d=json.loads(p.read_text());e=next(x for x in d['sections'] if '易经' in x['heading']);x=next(x for x in d['sections'] if '象曰' in x['heading'])
    assert len(e['items'])>=6 and len(x['items'])>=6
    return d,e,x

# Restrict changes to reviewed corruptions. Online witnesses also have variants and typos.
REPAIRS={
 ('hex-03-line-2','text'):[('十年后才生育','十年乃字')],
 ('hex-03-line-3','text'):[('即主鹿','即鹿')],
 ('hex-07-line-4','image'):[('示失常','未失常')],
 ('hex-11-line-2','image'):[('以光在','以光大')],
 ('hex-11-line-3','text'):[('勿悔恤其孚','勿恤其孚')],
 ('hex-13-line-5','image'):[('天罔极上遇，','')],
 ('hex-14-line-1','image'):'大有初九，无交害也。',
 ('hex-14-line-5','text'):[('厥孚交加','厥孚交如')],
 ('hex-14-line-5','image'):[('厥孚交加','厥孚交如')],
 ('hex-18','judgement'):[('利涉在川','利涉大川')],
 ('hex-23-line-3','text'):[('剥，无咎','剥之，无咎')],
 ('hex-26-line-1','text'):[('利己','利已')],
 ('hex-26-line-1','image'):[('利己','利已')],
 ('hex-26-line-3','text'):[('曰闲舆卫','日闲舆卫')],
 ('hex-31-line-5','image'):[('志未','志末')],
 ('hex-35-line-6','text'):[('厉右','厉吉')],
 ('hex-36-line-1','text'):[('三是不食','三日不食')],
 ('hex-42-line-1','image'):[('不厚事','下不厚事')],
 ('hex-43-line-6','image'):[('晚号之凶','无号之凶')],
 ('hex-45','image'):[('戎不虞','戒不虞')],
 ('hex-50-line-4','text'):[('覆公诉','覆公餗')],
 ('hex-50-line-4','image'):[('覆公诉','覆公餗')],
 ('hex-55-line-2','text'):[('日见斗','日中见斗')],
 ('hex-63-line-5','text'):[('西郊之禴祭','西邻之禴祭')],
 ('hex-63-line-6','text'):[('濡其道','濡其首')],
 ('hex-63-line-6','image'):[('濡其道','濡其首')],
}
def align_field(rec,key,value,refvalue,ref,edits):
    value=value.strip();refvalue=refvalue.strip();before=value
    repairs=REPAIRS.get((rec,key),[])
    if isinstance(repairs,str):value=repairs
    else:
        for a,b in repairs:value=value.replace(a,b)
    if value!=before:
        edits.append(patch('user-yijing64',rec,key,before,value,'修正已人工复核的错字、漏字或段落错标；其余异文保留',{'referenceId':ref['id'],'url':ref['url']}))
    if normalized(value)!=normalized(refvalue):
        DIFFERENCES.append({'recordId':rec,'field':key,'retained':value,'reference':refvalue,'referenceId':ref['id'],'url':ref['url'],'status':'difference-retained; not automatically classified as error'})
    return value

def parse_yijing(grades):
    s=(ROOT/'sources/original/yijing64.txt').read_text()
    hs=list(re.finditer(r'^第([一二三四五六七八九十百]+)卦：《([^》]+)》',s,re.M))
    assert len(hs)==64
    result=[];revised=[]
    tri_bits={'乾':[1,1,1],'兑':[1,1,0],'离':[1,0,1],'震':[1,0,0],'巽':[0,1,1],'坎':[0,1,0],'艮':[0,0,1],'坤':[0,0,0]}
    for i,h in enumerate(hs,1):
        assert cn_number(h[1])==i
        end=hs[i].start() if i<64 else len(s);body=s[h.end():end]
        lineheads=list(re.finditer(r'^(初[九六]|[九六][二三四五]|上[九六]|用[九六])[，,：:]\s*',body,re.M))
        assert len(lineheads)==(7 if i in (1,2) else 6),(i,len(lineheads))
        ref,rc,rx=reference_for(i);edits=[]
        intro=parse_passage(body[:lineheads[0].start()])
        intro['text']=align_field(f'hex-{i:02}','judgement',intro['text'],rc['lead'][0],ref,edits)
        intro['image']=align_field(f'hex-{i:02}','image',intro['image'],rx['lead'][0],ref,edits)
        if i==2 and '如往东南方，则会失去朋友的帮助' in intro['vernacular']:
            before=intro['vernacular'];intro['vernacular']=before.replace('如往东南方，则会失去朋友的帮助','如往东北方，则会失去朋友的帮助')
            edits.append(patch('user-yijing64','hex-02','judgementVernacular',before,intro['vernacular'],'按原文东北丧朋修正译文方向',{'referenceId':ref['id'],'url':ref['url']}))
        lines=[];special=[]
        for j,m in enumerate(lineheads):
            raw=body[m.end():lineheads[j+1].start() if j+1<len(lineheads) else len(body)]
            item=parse_passage(raw);rid=f'hex-{i:02}-line-{j+1}' if j<6 else f'hex-{i:02}-{m[1]}'
            label=m[1]
            reftext=re.sub(r'^(初[九六]|[九六][二三四五]|上[九六]|用[九六])[：:，,]','',rc['items'][j])
            item['text']=align_field(rid,'text',item['text'],reftext,ref,edits)
            item['image']=align_field(rid,'image',item['image'],rx['items'][j],ref,edits)
            if i==3 and j==1:
                v='进退徘徊，骑马盘旋不前；来者并非盗寇，而是求婚的人。女子守正，不轻率许嫁，经过较长等待才得以成婚。这里“字”依所据古注作许嫁解。'
                edits.append(patch('user-yijing64',rid,'vernacular',item['vernacular'],v,'补齐缺失白话；依据经文与古注重新编写，非逐字搬运现代译文',{'referenceId':ref['id'],'url':ref['url'],'commentaryUrl':'https://zh.wikisource.org/zh-hans/周易正義/01屯'}));item['vernacular']=v
                before=item['imageVernacular'];v='六二的困难与下承刚爻有关。“十年乃字，反常也”在此解作经历阻碍后恢复正常的婚配关系，“反常”不是现代汉语的异常之意。'
                edits.append(patch('user-yijing64',rid,'imageVernacular',before,v,'修正反常被误解为异常，以及字被直接解释为生育',{'referenceId':ref['id'],'url':ref['url'],'commentaryUrl':'https://www.shidianguji.com/zh/book/SK0006/chapter/1l9rdom587kma'}));item['imageVernacular']=v
            if i==14 and j==0 and not item['imageVernacular']:
                v='《象辞》指出，大有初九尚未涉入交相侵害。处在富有之初仍应心存艰难、谨慎自守，不因富足而骄纵。'
                edits.append(patch('user-yijing64',rid,'imageVernacular','',v,'补齐原稿错标为象辞原文的白话段；古典象辞另据参考本补正',{'referenceId':ref['id'],'url':ref['url'],'commentaryUrl':'https://www.shidianguji.com/zh/book/SK0090/chapter/1lxf46ugs0q42'}));item['imageVernacular']=v
            item.update({'id':rid,'label':label,'position':j+1 if j<6 else None,'sourceRef':section_ref('user-yijing64',s,h.end()+m.start(),h.end()+(lineheads[j+1].start() if j+1<len(lineheads) else len(body))),
                         'referenceId':ref['id'],'referenceUrl':ref['url']})
            (lines if j<6 else special).append(item)
        bits=[1 if '九' in x['label'] else 0 for x in lines]
        g=grades[i-1];lower,upper=g['trigramNamesFromDescription']
        assert bits==tri_bits[lower]+tri_bits[upper],(i,bits,lower,upper)
        for item in [intro]+lines+special:
            assert all(item[k] for k in ['text','vernacular','image','imageVernacular']),(i,item)
        record={'id':i,'name':g['name'],'shortName':h[2].removesuffix('卦'),'aliases':sorted(set([h[2],g['alias'],g['name']]+(['遁','遯','遁卦','遯卦'] if i==33 else []))),
                'symbol':chr(0x4dc0+i-1),'bitsBottomUp':bits,'upperTrigram':upper,'lowerTrigram':lower,'grade':g,'reading':intro,'lines':lines,'specialLines':special,'patchIds':edits,
                'sourceRef':section_ref('user-yijing64',s,h.start(),end),'referenceId':ref['id'],'referenceUrl':ref['url'],'editorialStatus':'reviewed-corrections-only;remaining-witness-variants-retained'}
        result.append(record)
        rb=[h[0],'',intro['text'],'【白话】'+intro['vernacular'],'','《象》曰：'+intro['image'],'【白话】'+intro['imageVernacular'],'']
        for item in lines+special:rb += [item['label']+'，'+item['text'],'【白话】'+item['vernacular'],'《象》曰：'+item['image'],'【白话】'+item['imageVernacular'],'']
        revised.append('\n'.join(rb))
    (ROOT/'sources/revised/yijing64.txt').write_text('白话易经 · 可追溯修订版\n古典字段据网上参考本对校；现代白话除修改记录外沿用用户资料。\n\n'+'\n\n'.join(revised))
    return result

def parse_meihua():
    s=(ROOT/'sources/original/meihua-volumes-1-3.txt').read_text()
    # Every source character belongs to exactly one indexed block, including front matter.
    matches=list(re.finditer(r'^(卷[一二三]　[^\n]+|第[一二三四五]篇　[^\n]+|【[^】]+】)\s*$',s,re.M))
    starts=[0]+[m.start() for m in matches if m.start()!=0];out=[];volume=None;part=None
    edits=[('以乎分','以平分'),('谓老人虫','谓老人曰'),('末临其期','未临其期'),('为卜占之切要','为卜占之切要')]
    refs=[load(f'sources/references/meihua-{i}.json') for i in (1,2,3)]
    for idx,start in enumerate(starts):
        end=starts[idx+1] if idx+1<len(starts) else len(s);raw=s[start:end];heading=raw.splitlines()[0] if idx else '卷首与目录'
        kind='frontmatter' if idx==0 else 'section' if heading.startswith('【') else 'volume' if heading.startswith('卷') else 'part'
        if kind=='volume':volume='一二三'.index(heading[1])+1;part=None
        if kind=='part':part=heading
        title=heading.strip('【】');sid=f'mh-{idx:03}'
        text=raw
        if kind=='section':
            for a,b in edits:
                if a==b or a not in text:continue
                ref=refs[(volume or 1)-1]
                # Only apply a proposed replacement when the chosen reference actually supports it.
                if b in ref['text']:
                    before=text;text=text.replace(a,b)
                    patch('user-meihua',sid,'text',before,text,'上下文与网上参考本一致的录入字修订',{'referenceId':ref['id'],'url':ref['url']})
            # Sui/zhui are contextual: preserve genuine chasing, replace only explicitly corroborated strings.
            for a,b in [('逐占之','遂占之'),('逐与客曰','遂与客曰'),('逐将此六字','遂将此六字'),('逐为客曰','遂为客曰'),('逐谓寺僧','遂谓寺僧'),('逐以成卦之数','遂以成卦之数')]:
                ref=refs[(volume or 1)-1]
                if a in text and normalized(b) in normalized(ref['text']):
                    before=text;text=text.replace(a,b);patch('user-meihua',sid,'text',before,text,'仅校正已获参考本支持的遂/逐语境，不作全局替换',{'referenceId':ref['id'],'url':ref['url']})
        if kind=='section':
            corrected=[('以乎分','以平分',1),('谓老人虫','谓老人曰',1),('如何”二安带口','如何”二字带口',2),('树木之末伐者，生炎之迟也','树木之未伐者，生火之迟也',3),('末临其期','未临其期',3),('内外并也生体','内外并无生体',3)]
            urls={1:'https://www.diancangwang.cn/xuanxuewushu/8d9cde0f755a/1bc4bd477d7d.html',2:'https://www.211cn.ca/book/plum-blossom-yi-numbers-gugong-edition/?c=3',3:'https://www.diancangwang.cn/xuanxuewushu/8d9cde0f755a/f8ca0c3d3ef4.html'}
            for a,b,v in corrected:
                if a in text:
                    before=text;text=text.replace(a,b)
                    patch('user-meihua',sid,'text',before,text,'对照另一网上古典见证本修正明确录入字；非同音全局替换',{'url':urls[v],'retrievedDate':'2026-11-10','additionalWitness':True})
        out.append({'id':sid,'kind':kind,'volume':volume,'part':part,'title':title,'text':text,'sourceRef':section_ref('user-meihua',s,start,end)})
    assert ''.join(s[x['sourceRef']['startChar']:x['sourceRef']['endChar']] for x in out)==s
    assert sum(x['kind']=='section' for x in out)==132
    (ROOT/'sources/revised/meihua-volumes-1-3.txt').write_text(''.join(x['text'] for x in out))
    for x in out:
        if x['title']=='变卦式八则':issue('SOURCE_STRUCTURAL_INCONSISTENCY',x['id'],'本节部分体用、五行、变卦叙述互不相合；作为历史资料保留，不直接生成结构算法或黄金测试。',severity='review')
        if x['title']=='体用互变之诀':issue('SOURCE_CASE_WORDING',x['id'],'观梅恒卦及相关互卦表述与卷一起例不完全相合；程序结构以可复算起例为准，文献表述保留供核对。',severity='review')
    return out

def main():
    grades=parse_grade_source();hexagrams=parse_yijing(grades);sections=parse_meihua()
    domains=[]
    for x in sections:
        if x['volume']==2 and x['part'] and x['part'].startswith('第二篇') and x['kind']=='section':
            domains.append({'id':f'domain-{len(domains)+1:02}','title':x['title'],'sectionId':x['id'],'text':x['text'],'mode':'reference-only' if len(domains) in (0,5,15) else 'body-use-reference','sourceRef':x['sourceRef']})
    assert len(domains)==18
    for d in domains:
        paragraph=d['text'].splitlines()[1]
        tokens={'体克用':'body_controls_use','用克体':'use_controls_body','体生用':'body_generates_use','用生体':'use_generates_body','体用比和':'equal'}
        found=sorted([(paragraph.find(t),t,k) for t,k in tokens.items() if t in paragraph])
        d['relationPassages']={}
        for j,(pos,token,key) in enumerate(found):
            stop=found[j+1][0] if j+1<len(found) else len(paragraph)
            quote=paragraph[pos:stop].strip('，；。 ')
            # Keep only the first sentence; retain exact source wording, without inventing an interpretation.
            if '。' in quote:quote=quote.split('。')[0]
            d['relationPassages'][key]={'quote':quote,'sectionId':d['sectionId'],'sourceRef':d['sourceRef'],'status':'source-quotation; not standalone verdict'}
    trigram_data=[{'id':n,'number':i,'element':e,'bitsBottomUp':b} for i,(n,e,b) in enumerate([('乾','金',[1,1,1]),('兑','金',[1,1,0]),('离','火',[1,0,1]),('震','木',[1,0,0]),('巽','木',[0,1,1]),('坎','水',[0,1,0]),('艮','土',[0,0,1]),('坤','土',[0,0,0])],1)]
    references=[json.loads(p.read_text()) for p in sorted((ROOT/'sources/references').glob('*.json'))]
    assert len(references)==67,len(references)
    source_specs=[('user-meihua','meihua-volumes-1-3.txt','梅花易数_卷一至卷三_整理完整版.txt'),('user-yijing64','yijing64.txt','YiJing64_Reissued_20261110.txt'),('user-grade-table','grades64.txt','Pasted text.txt'),('user-void-extension','void-rules.txt','用户在对话中补充的空亡规则'),('user-void-timing','void-time-nodes.txt','用户补充的六旬出空时间节点及真空优先规则'),('user-grade-correction','grade-correction.txt','用户最新明确订正天风姤为中卦')]
    sources=[]
    for sid,filename,original in source_specs:
        p=ROOT/'sources/original'/filename;b=p.read_bytes()
        sources.append({'id':sid,'path':str(p.relative_to(ROOT)),'originalFilename':original,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'characters':len(b.decode()),'provenance':'user-supplied','status':'source snapshot; not an independently authenticated critical edition'})
    catalog={'schemaVersion':'1.0.0','contentVersion':VERSION,'lineOrder':'bottom-up','hexagrams':hexagrams,'trigrams':trigram_data}
    save('data/catalog.json',catalog);save('data/meihua-sections.json',{'schemaVersion':'1.0.0','sections':sections});save('data/domains.json',domains)
    save('data/grades.json',grades);save('data/editorial-patches.json',PATCHES);save('data/issues.json',ISSUES);save('data/reference-differences.json',DIFFERENCES)
    save('data/source-manifest.json',{'version':VERSION,'sources':sources,'references':[{'id':r['id'],'title':r['title'],'revisionId':r['revisionId'],'url':r['url'],'path':f"sources/references/{r['id']}.json"} for r in references]})
    report={'hexagrams':len(hexagrams),'ordinaryLineReadings':sum(len(x['lines']) for x in hexagrams),'specialLineReadings':sum(len(x['specialLines']) for x in hexagrams),'vernacularBlocks':sum(2+2*len(x['lines'])+2*len(x['specialLines']) for x in hexagrams),'meihuaSections':sum(x['kind']=='section' for x in sections),'domains':len(domains),'onlineReferencePages':len(references),'editorialPatches':len(PATCHES),'issues':len(ISSUES),'retainedReferenceDifferences':len(DIFFERENCES),'grades':dict(collections.Counter(x['rawGrade'] for x in grades)),'canonicalGrades':dict(collections.Counter(x['canonicalGrade'] for x in grades))}
    save('data/import-report.json',report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
