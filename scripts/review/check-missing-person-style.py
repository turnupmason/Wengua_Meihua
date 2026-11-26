#!/usr/bin/env python3
"""Reproducible style/duplicate scan of monthly authored JSON articles.

This is a corpus-level machine scan, not a semantic review or evidence of prediction accuracy.
Usage: python3 final-style-check.py --repo-root . --output /tmp/missing-contact-style.json
"""
from pathlib import Path
import argparse,json,re,collections,hashlib,math,statistics,time,subprocess
MONTHS='寅卯辰巳午未申酉戌亥子丑'
QI={**dict.fromkeys('寅卯','木'),**dict.fromkeys('辰未戌丑','土'),**dict.fromkeys('巳午','火'),**dict.fromkeys('申酉','金'),**dict.fromkeys('亥子','水')}
HAN=re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]')
QUOTE=re.compile(r'「[^」]*」|『[^』]*』|“[^”]*”|《[^》]*》|〈[^〉]*〉')
SENTENCE=re.compile(r'[。！？!?\n]')
CLAUSE=re.compile(r'[。！？!?；;，、,：:\n]')
# Strip books' titles and expressly quoted text to avoid overcounting quoted classic wording.
def stripped(s): return QUOTE.sub('',s)
def norm(s): return ''.join(HAN.findall(s))
def first(s): return next((norm(p) for p in SENTENCE.split(stripped(s)) if norm(p)), '')
def initial_clause(s): return next((norm(p) for p in CLAUSE.split(stripped(s)) if norm(p)), '')
def md(s): return hashlib.sha256(s.encode('utf-8')).hexdigest()
def is_month_start(s,m):
    x=norm(s)
    if not x.startswith(m):return False
    # When a leading branch character is lexical rather than calendric, don't call it a month lead.
    nonmonth={
      '未':('未见','未能','未曾','未必','未有','未可','未得','未来','未济','未获','未到','未将','未足','未明','未证','未说','未改','未查','未完','未知','未使','未让','未应','未确定','未尝','未免'),
      '申':('申命','申请','申报','申明','申述','申诉','申辩'),
      '子':('子女','子孙','子曰','子弟'),
      '丑':('丑事','丑陋'),
    }
    return not x.startswith(nonmonth.get(m,()))
def canonical_start(s,m):
    x=norm(stripped(s))
    if x.startswith(m):
        # Keep explicit distinction of month/season qualifiers in the normalized lead.
        return '月支'+x[1:]
    return x
def group_counts(groups,minimum=2):
    return [dict(text=k,count=len(v),keys=v) for k,v in sorted(groups.items(),key=lambda kv:(-len(kv[1]),kv[0])) if len(v)>=minimum]
def add(groups,key,a):
    if key: groups[key].append(a)
def runs(rows, field, kind='month'):
    out=[]
    for (h,l),g in collections.defaultdict(list, {k:[a for a in rows if (a['hex'],a['line'])==k] for k in sorted({(a['hex'],a['line']) for a in rows})}).items():
        g.sort(key=lambda a:MONTHS.index(a['month']))
        run=[];label=None
        for a in g:
            x=(norm(a[field]).startswith(a['month']) if kind=='month' else is_month_start(a[field],a['month']) if kind=='semantic-month' else canonical_start(a[field],a['month'])[:12])
            if kind in ('month','semantic-month') and not x:
                if len(run)>=4:out.append(dict(hex=h,line=l,count=len(run),keys=run,pattern=label))
                run=[];label=None;continue
            if run and x!=label:
                if len(run)>=4:out.append(dict(hex=h,line=l,count=len(run),keys=run,pattern=label))
                run=[]
            run.append(a['key']);label=x
        if len(run)>=4:out.append(dict(hex=h,line=l,count=len(run),keys=run,pattern=label))
    return sorted(out,key=lambda a:(-a['count'],a['hex'],a['line']))
def prefix_joins(rows,field,threshold,n=3):
    # Exact Jaccard similarity join using length and globally rare-first prefix filter.
    # For J(A,B) >= t, a token must occur in each prefix of length |A|-ceil(t|A|)+1.
    grams=[set(t[i:i+n] for i in range(max(0,len(t)-n+1))) for a in rows for t in [norm(stripped(a[field]))]]
    freq=collections.Counter(x for g in grams for x in g)
    by_size=sorted(range(len(grams)),key=lambda i:len(grams[i]))
    inv=collections.defaultdict(list); pairs=[]; candidate_pairs=0
    for i in by_size:
        g=grams[i];m=len(g)
        if not m:continue
        prefix=sorted(g,key=lambda x:(freq[x],x))[:m-math.ceil(threshold*m-1e-10)+1]
        candidates=set(j for x in prefix for j in inv[x] if len(grams[j])+1e-10>=threshold*m)
        for j in candidates:
            candidate_pairs+=1
            h=grams[j]; common=len(g&h);score=common/(m+len(h)-common)
            if score+1e-10 >= threshold:
                a,b=rows[j],rows[i]
                pairs.append(dict(first=a['key'],second=b['key'],similarity=round(score,4),sameHex=a['hex']==b['hex'],sameLine=a['hex']==b['hex'] and a['line']==b['line'],sameQi=QI[a['month']]==QI[b['month']]))
        for x in prefix:inv[x].append(i)
    return dict(threshold=threshold,gramSize=n,documents=len(rows),candidatePairs=candidate_pairs,pairs=sorted(pairs,key=lambda p:(-p['similarity'],p['first'],p['second'])))
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root',type=Path,default=Path.cwd(),help='repository root (default: current directory)')
    parser.add_argument('--output',type=Path,required=True,help='JSON report path')
    parser.add_argument('--item',default='missing-contact',help='monthly question directory (default: missing-contact)')
    args=parser.parse_args()
    repo=args.repo_root.resolve()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',args.item): parser.error('invalid --item directory name')
    roots=[repo/'sources/editorial'/args.item/'monthly',repo/'sources/editorial'/args.item/'partial-monthly']
    rows=[];source_receipts=[]
    for folder in roots:
        for p in sorted(folder.glob('hex-*.json')):
            raw=p.read_bytes();s=json.loads(raw);h=s['primaryId'];source_receipts.append(dict(path=str(p.relative_to(repo)),sha256=hashlib.sha256(raw).hexdigest(),count=len(s['articles'])))
            for a in s['articles']:
                m=a['monthBranch'];l=a['movingLine']
                rows.append(dict(key=f'{h}/{l}/{m}',hex=h,line=l,month=m,body='\n'.join(a['paragraphs']),short=a['short'],paras=a['paragraphs'],title=a['title']))
    rows.sort(key=lambda a:(a['hex'],a['line'],MONTHS.index(a['month'])))
    if not rows: parser.error('no monthly or partial-monthly source articles found under --repo-root')
    if len({a['key'] for a in rows})!=len(rows): parser.error('duplicate article keys in monthly and partial-monthly sources')
    print('source count',len(rows),flush=True)
    metrics={}; group_metrics={}; opener_runs={}
    for field in ['body','short']:
        opener=collections.defaultdict(list);clause=collections.defaultdict(list);exact=collections.defaultdict(list);long_sentence=collections.defaultdict(list);long_clause=collections.defaultdict(list);prefix=collections.defaultdict(list);p12=collections.defaultdict(list);p16=collections.defaultdict(list);p24=collections.defaultdict(list);norm12=collections.defaultdict(list);cross12=collections.defaultdict(list);crossNorm12=collections.defaultdict(list);marker=collections.defaultdict(list)
        month_start=[];semantic_month_start=[];explicit_month_start=[];season_start=[];quote_start=[];lengths=[];intro_word=collections.Counter()
        for a in rows:
            k=a['key'];s=a[field];m=a['month'];t=norm(stripped(s));f=first(s);c=initial_clause(s)
            lengths.append(len(t))
            if s.lstrip().startswith(('「','『','“','《','〈')):quote_start.append(k)
            if norm(s).startswith(m):month_start.append(k)
            if is_month_start(s,m):semantic_month_start.append(k)
            if re.match(rf'{m}(?:月|令|月令)',norm(s)):explicit_month_start.append(k)
            if re.match(r'(?:春|夏|秋|冬|季土|土令|四季)',norm(s)):season_start.append(k)
            add(exact,t,k);add(opener,f,k);add(clause,c,k)
            if len(f)>=12:add(p12,f[:12],k)
            if len(f)>=16:add(p16,f[:16],k)
            if len(f)>=24:add(p24,f[:24],k)
            starter=canonical_start(f,m)
            if len(starter)>=12:add(norm12,starter[:12],k)
            firstpara=s if field=='short' else a['paras'][0]
            cross=norm(stripped(firstpara));cross_n=canonical_start(firstpara,m)
            if len(cross)>=12:add(cross12,cross[:12],k)
            if len(cross_n)>=12:add(crossNorm12,cross_n[:12],k)
            for ss in SENTENCE.split(stripped(s)):
                ss=norm(ss)
                if len(ss)>=24:add(long_sentence,ss,k)
            for cc in CLAUSE.split(stripped(s)):
                cc=norm(cc)
                if len(cc)>=16:add(long_clause,cc,k)
            # broad style indicators only, not faults
            for tag,pat in {'先说判断':r'^(?:本月|此月|这一盘|这盘|此卦|问|若问|占到|读|见到|从|倘若)','如果':r'如果|倘若|假如|假使','不能不宜':r'不能|不宜|不可|不应|不要','现实实证':r'现实|实际|实证|核实|核明|可信|可靠','安危警示':r'警方|紧急|救援|危险|求助','证据边界':r'不是|不等于|不代表|不意味着|不证明'}.items():
                if re.search(pat,s):marker[tag].append(k)
        for group in [long_sentence,long_clause]:
            for k,v in list(group.items()):group[k]=sorted(set(v))
        byhex=[]
        for h in sorted({a['hex'] for a in rows}):
            g=[a for a in rows if a['hex']==h];ks={a['key'] for a in g}
            byhex.append(dict(hex=h,count=len(g),monthStart=len(ks.intersection(month_start)),semanticMonthStart=len(ks.intersection(semantic_month_start)),explicitMonthStart=len(ks.intersection(explicit_month_start)),seasonStart=len(ks.intersection(season_start)),quotedStart=len(ks.intersection(quote_start))))
        groups={name:group_counts(g) for name,g in [('exactText',exact),('exactFirstSentence',opener),('exactFirstClause',clause),('first12Han',p12),('first16Han',p16),('first24Han',p24),('monthNormalizedFirst12Han',norm12),('crossPunctuationFirst12Han',cross12),('crossPunctuationMonthNormalizedFirst12Han',crossNorm12),('longSentence24Han',long_sentence),('longClause16Han',long_clause)]}
        counts={g:dict(groups=len(r),articles=len(set(k for x in r for k in x['keys'])),maxGroup=max((x['count'] for x in r),default=0),pairs=sum(x['count']*(x['count']-1)//2 for x in r)) for g,r in groups.items()}
        metrics[field]=dict(lengthRange=[min(lengths),max(lengths)],median=statistics.median(lengths),monthStartCount=len(month_start),monthStartPct=round(100*len(month_start)/len(rows),2),semanticMonthStartCount=len(semantic_month_start),semanticMonthStartPct=round(100*len(semantic_month_start)/len(rows),2),explicitMonthStartCount=len(explicit_month_start),seasonStartCount=len(season_start),quoteStartCount=len(quote_start),groupMetrics=counts,styleMarkerCounts={k:len(v) for k,v in marker.items()},byHex=byhex)
        group_metrics[field]=groups
        opener_runs[field]={'consecutiveMonthRuns':runs(rows,field), 'consecutiveSemanticMonthRuns':runs(rows,field,kind='semantic-month'), 'identicalMonthNormalizedPrefixRuns':runs(rows,field,kind='prefix')}
        complete=[r for r in opener_runs[field]['consecutiveMonthRuns'] if r['count']==12]
        complete_semantic=[r for r in opener_runs[field]['consecutiveSemanticMonthRuns'] if r['count']==12]
        opener_runs[field]['completeMonthStartLines']=complete
        opener_runs[field]['completeSemanticMonthStartLines']=complete_semantic
        metrics[field]['completeMonthStartLineCount']=len(complete)
        metrics[field]['completeSemanticMonthStartLineCount']=len(complete_semantic)
    print('patterns complete',flush=True)
    near={}
    for field,threshold in [('body',0.64),('short',0.72)]:
        st=time.monotonic();near[field]=prefix_joins(rows,field,threshold)
        print('similarity',field,'pairs',len(near[field]['pairs']),'candidates',near[field]['candidatePairs'],'elapsed',round(time.monotonic()-st,2),flush=True)
    result=dict(schemaVersion='1.0.0',scope='machine-style-scan; not independent full read or prediction validation',baseCommit=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),articleCount=len(rows),sourceCount=len(source_receipts),sources=source_receipts,method={'quoteExclusion':'remove explicit 「」 『』 “” 《》 〈〉 contents before literal text, sentence, clause and ngram matching','monthStart':'first Han character of displayed text equals row month branch; completeMonthStartLines require all 12 articles in one line to meet this condition; lexical false positives are also reported separately with a conservative semantic filter; does not imply wrong rule','firstPrefix':'first normalized Han sentence, 12/16/24 Han; month-normalized variant substitutes the actual branch only if initial; crossPunctuation variants use all first paragraph (body) or short without sentence boundary, excluding quoted text and punctuation','longSentence':'exact normalized unquoted sequences of at least 24 Han between 。！？ newline','longClause':'exact normalized unquoted sequences of at least 16 Han between sentence, comma/colon/semicolon markers','nearDuplicate':'exact Jaccard of unique normalized unquoted Han 3-grams, length/rare-prefix pruning; all pairs meeting threshold retrieved','humanMeaning':'same qi judgments and source-based necessary terminology may repeat legitimately; groups are review candidates, not automatic faults'})
    for f in near:
        pp=near[f]['pairs'];metrics[f]['nearDuplicateSummary']={'threshold':near[f]['threshold'],'pairCount':len(pp),'sameHex':sum(x['sameHex'] for x in pp),'sameLine':sum(x['sameLine'] for x in pp),'sameQi':sum(x['sameQi'] for x in pp),'maxSimilarity':max((x['similarity'] for x in pp),default=0)}
    result.update(metrics=metrics,groups=group_metrics,openerRuns=opener_runs,nearDuplicates=near)
    if args.item!='missing-contact': result['item']=args.item
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({f:{k:v for k,v in metrics[f].items() if k!='byHex'} for f in metrics},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
