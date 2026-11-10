"""Independent publication gate: source coverage, identities, changed bits and SQLite constraints."""
from pathlib import Path
import json,hashlib,sqlite3,collections,re
ROOT=Path(__file__).resolve().parents[1]
def load(p):return json.loads((ROOT/p).read_text())
def main():
    source=load('data/details/source-manifest.json');raw=(ROOT/source['path']).read_bytes()
    assert len(raw)==source['bytes'] and hashlib.sha256(raw).hexdigest()==source['sha256']
    extraction=(ROOT/source['extractedPath']).read_bytes();assert hashlib.sha256(extraction).hexdigest()==source['extractedSha256']
    rows=[json.loads(l) for l in extraction.decode().splitlines()];assert len(rows)==8770
    dispositions=load('sources/review/details-paragraph-dispositions.json');assert len(dispositions)==len(rows)
    assert [d['paragraphId'] for d in dispositions]==[p['id'] for p in rows]
    assert sum(d['characters'] for d in dispositions)==sum(len(p['text']) for p in rows)==source['textCharacters']
    refs={p['id']:p for p in rows};catalog=load('data/catalog.json');by_id={h['id']:h for h in catalog['hexagrams']}
    index=load('data/details/index.json');assert len(index['hexagrams'])==64
    excluded=load('sources/review/details-quarantine.json');excluded_ids={p['sourceRef']['paragraphId'] for p in excluded if p['sourceRef']['bodyParagraph']!=1371}
    state={p['id']:p['text'] for p in rows}
    for p in load('data/details/editorial-patches.json'):
        pid=p['sourceRef']['paragraphId'];assert state[pid]==p['before'],p['id'];state[pid]=p['after']
    for entry in index['hexagrams']:
        h=by_id[entry['id']];d=load(entry['path']);assert d['contentVersion']==catalog['contentVersion']
        assert d['hexagramId']==h['id'] and d['name']==h['name'];assert d['baseGrade']==h['grade']['rawGrade'];assert len(d['lines'])==6
        for p,line in enumerate(d['lines'],1):
            assert line['position']==p and line['label']==h['lines'][p-1]['label']
            target=by_id[line['changedHexagram']['id']];different=[i+1 for i,(a,b) in enumerate(zip(h['bitsBottomUp'],target['bitsBottomUp'])) if a!=b]
            assert different==[p];assert line['changedHexagram']['name']==target['name']
        c=load(entry['commentaryPath']);assert c['trustScope'].startswith('source-commentary-only')
        for g in c['groups']:
            for s in g['sections']:
                for p in s['paragraphs']:
                    assert p['id'] not in excluded_ids
                    assert p['sourceRef']['paragraphId'] in refs
                    assert p['text']==state[p['id']]
    # All 384 lines must be in the independent SQLite join and match their canonical source verbatim.
    db=sqlite3.connect(':memory:');db.executescript((ROOT/'data/knowledge.sql').read_text())
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not db.execute('PRAGMA foreign_key_check').fetchall()
    assert db.execute('SELECT count(*) FROM hexagrams').fetchone()[0]==64
    assert db.execute('SELECT count(*) FROM moving_line_details').fetchone()[0]==384
    assert db.execute('SELECT count(*) FROM special_lines').fetchone()[0]==2
    for h in catalog['hexagrams']:
        for p,line in enumerate(h['lines'],1):
            text,target_id=db.execute('SELECT text,changed_hexagram_id FROM moving_line_details WHERE hexagram_id=? AND position=?',(h['id'],p)).fetchone()
            assert text==line['text'];assert load(f'data/details/{h["id"]:02}.json')['lines'][p-1]['changedHexagram']['id']==target_id
    assert not any('commentary_body' in x[0] for x in db.execute("SELECT name FROM sqlite_master WHERE type='table'"))
    print(f'Details gate passed: {len(rows)} paragraphs / {source["textCharacters"]} characters accounted for; 64 hexagrams, 384 changes and SQL joins; {len(excluded)} source segments excluded.')
if __name__=='__main__':main()
