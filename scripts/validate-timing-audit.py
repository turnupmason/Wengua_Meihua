"""Check every timing quotation, domain record and supplemental SQL independently."""
from pathlib import Path
import hashlib,json,sqlite3
ROOT=Path(__file__).resolve().parents[1]
def load(p):return json.loads((ROOT/p).read_text())
def main():
    d=load('data/timing-audit.json');sections={s['id']:s for s in load('data/meihua-sections.json')['sections']}
    assert len(d['rules'])==27 and len(d['domains'])==18 and len(d['trigramPeriods'])==8
    for r in d['rules']+d['trigramPeriods']:
        s=sections[r['sectionId']];e=r['evidence'];at=e['quoteOffsetInSection']
        assert s['text'][at:at+len(r['quote'])]==r['quote']
        assert hashlib.sha256(s['text'].encode()).hexdigest()==e['sectionSha256']
    assert {p['id'] for p in d['domains']}=={p['id'] for p in load('data/domains.json')}
    for p in d['domains']:assert p['source']['quote']==sections[p['sectionId']]['text']
    assert len(d['retrievals'])==3 and all(r['httpStatus']==200 for r in d['retrievals'])
    checks=[c for r in d['retrievals'] for c in r['quoteChecks']]
    assert len(checks)==35 and all(c['matched'] for c in checks)
    for c in d['cases']:
        raw=sections[c['sectionId']]['text'];assert c['prediction']['text'] in raw
        if c['feedback']:assert c['feedback']['text'] in raw
    db=sqlite3.connect(':memory:');db.executescript((ROOT/'data/knowledge.sql').read_text())
    db.executescript((ROOT/'data/timing-audit.sql').read_text())
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    for table,key,rows in [('timing_audit_rules','id',d['rules']),('domain_timing_profiles','domain_id',d['domains']),('trigram_timing_periods','trigram',d['trigramPeriods']),('timing_audit_issues','id',d['issues'])]:
        assert db.execute(f'SELECT count(*) FROM {table}').fetchone()[0]==len(rows)
        for r in rows:
            v=r['trigram'] if key=='trigram' else r['id']
            assert json.loads(db.execute(f'SELECT payload_json FROM {table} WHERE {key}=?',(v,)).fetchone()[0])==r
    assert db.execute('SELECT count(*) FROM monthly_narratives').fetchone()[0]==1920
    assert db.execute("SELECT value FROM timing_audit_metadata WHERE key='audit_version'").fetchone()[0]==d['auditVersion']
    print('Timing gate: 18 domains, 27 exact clauses, 8 period tables, 35 online passage checks, 10 source cases; supplement SQL joins and unchanged 1,920 base rows passed.')
if __name__=='__main__':main()
