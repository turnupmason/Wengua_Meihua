"""Independently validate the prewritten edition and the SQLite publication artifact."""
from pathlib import Path
import json,sqlite3
ROOT=Path(__file__).resolve().parents[1]
def load(p):return json.loads((ROOT/p).read_text())
def main():
    catalog=load('data/catalog.json');hexes={h['id']:h for h in catalog['hexagrams']};bybits={tuple(h['bitsBottomUp']):h for h in hexes.values()}
    tri={tuple(t['bitsBottomUp']):t for t in catalog['trigrams']}
    idx=load('data/stories/index.json');assert idx['count']==1920 and len(idx['monthOrders'])==5
    strengths={'spring':('木','土'),'summer':('火','金'),'autumn':('金','木'),'winter':('水','火'),'earth':('土','水')}
    ordermap={x['id']:x for x in idx['monthOrders']};gen={'木':'火','火':'土','土':'金','金':'水','水':'木'};control={'木':'土','土':'水','水':'火','火':'金','金':'木'}
    def relation(a,b):return 'equal' if a==b else 'body_controls_use' if control[a]==b else 'use_controls_body' if control[b]==a else 'body_generates_use' if gen[a]==b else 'use_generates_body'
    db=sqlite3.connect(':memory:');db.executescript((ROOT/'data/knowledge.sql').read_text());assert not db.execute('PRAGMA foreign_key_check').fetchall();assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert db.execute('SELECT count(*) FROM monthly_narratives').fetchone()[0]==1920
    ids=set();stories=set();mutuals=set()
    for entry in idx['files']:
        f=load(entry['path']);assert f['contentVersion']==catalog['contentVersion'];assert len(f['rows'])==30
        for row in f['rows']:
            h=hexes[row['primaryId']];b=h['bitsBottomUp'];p=row['movingLine'];assert 1<=p<=6
            c=b.copy();c[p-1]^=1;m=[b[1],b[2],b[3],b[2],b[3],b[4]]
            assert row['stageIds']==[h['id'],bybits[tuple(m)]['id'],bybits[tuple(c)]['id']]
            bodybits=b[3:] if p<=3 else b[:3];body=tri[tuple(bodybits)];assert row['body']['trigram']==body['id']
            order=ordermap[row['monthOrder']];strong,weak=strengths[order['season']]
            for n in row['nodes']:
                assert n['state']==('strong' if n['element']==strong else 'weak' if n['element']==weak else 'not_explicit')
                assert n['monthRelation']==relation(n['element'],strong)
            assert len(row['relations'])==4
            for edge in row['relations']:
                target=next(n for n in row['nodes'] if n['role']==edge['targetRole']);assert edge['type']==relation(body['element'],target['element'])
            assert row['baseGrades']==[hexes[x]['grade']['rawGrade'] for x in row['stageIds']]
            assert len(row['paragraphs'])==3 and all(len(x)>60 for x in row['paragraphs'])
            persisted=db.execute('SELECT paragraphs_json,mutual_hexagram_id,changed_hexagram_id FROM monthly_narratives WHERE id=?',(row['id'],)).fetchone()
            assert json.loads(persisted[0])==row['paragraphs'] and list(persisted[1:])==row['stageIds'][1:]
            ids.add(row['id']);stories.add('\n\n'.join(row['paragraphs']));mutuals.add(row['stageIds'][1])
    assert len(ids)==len(stories)==1920 and len(mutuals)==16
    sections={s['id']:s for s in load('data/meihua-sections.json')['sections']};cases=load('data/classical-cases.json')
    assert cases['count']==len(cases['cases'])==10 and sum(len(c['charts']) for c in cases['cases'])==11
    for case in cases['cases']:
        source=sections[case['sourceSectionId']]['text'];assert case['sourceText']==source and case['prediction']['text'] in source
        if case['feedback']:assert case['feedback']['text'] in source
        for chart in case['charts']:
            b=hexes[chart['primaryId']]['bitsBottomUp'];changed=b.copy();changed[chart['movingLine']-1]^=1
            assert bybits[tuple(changed)]['id']==chart['changedId']
            assert bybits[(b[1],b[2],b[3],b[2],b[3],b[4])]['id']==chart['mutualId']
        if case['feedback'] and len(case['feedback']['text'])>12:assert all(case['feedback']['text'] not in story for story in stories)
    assert db.execute('SELECT count(*) FROM classical_cases').fetchone()[0]==10
    assert db.execute('SELECT count(*) FROM domain_narrative_rules').fetchone()[0]==18
    assert db.execute('SELECT display_grade FROM hexagrams WHERE id=44').fetchone()[0]=='中卦'
    print('Stories gate passed: 1,920 unique month-order stories and SQL rows; 18 domain rule sets; 10 source cases / 11 charts; exact feedback and no invented outcome leakage.')
if __name__=='__main__':main()
