"""Create a reviewable SQLite import and database from canonical data, excluding unverified commentary."""
from pathlib import Path
import sqlite3,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def load(p):return json.loads((ROOT/p).read_text())
def j(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def main():
    cat=load('data/catalog.json');db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
    db.executescript('''
      CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE hexagrams(id INTEGER PRIMARY KEY CHECK(id BETWEEN 1 AND 64),name TEXT NOT NULL UNIQUE,bits_bottom_up TEXT NOT NULL UNIQUE CHECK(length(bits_bottom_up)=6 AND bits_bottom_up NOT GLOB '*[^01]*'),display_grade TEXT NOT NULL CHECK(display_grade IN ('上上卦','中上卦','中中卦','中下卦','下下卦','中卦')),canonical_grade TEXT NOT NULL CHECK(canonical_grade IN ('上上卦','中上卦','中中卦','中下卦','下下卦')),upper_trigram TEXT NOT NULL,lower_trigram TEXT NOT NULL,reading_json TEXT NOT NULL,provenance_json TEXT NOT NULL);
      CREATE TABLE lines(hexagram_id INTEGER NOT NULL REFERENCES hexagrams(id),position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 6),label TEXT NOT NULL,text TEXT NOT NULL,vernacular TEXT NOT NULL,image TEXT NOT NULL,image_vernacular TEXT NOT NULL,source_json TEXT NOT NULL,PRIMARY KEY(hexagram_id,position));
      CREATE TABLE special_lines(hexagram_id INTEGER PRIMARY KEY REFERENCES hexagrams(id),label TEXT NOT NULL CHECK(label IN ('用九','用六')),reading_json TEXT NOT NULL,CHECK((hexagram_id=1 AND label='用九') OR (hexagram_id=2 AND label='用六')));
      CREATE TABLE line_details(hexagram_id INTEGER NOT NULL,position INTEGER NOT NULL,changed_hexagram_id INTEGER NOT NULL REFERENCES hexagrams(id),structure_json TEXT NOT NULL,editorial_notes_json TEXT NOT NULL,PRIMARY KEY(hexagram_id,position),FOREIGN KEY(hexagram_id,position) REFERENCES lines(hexagram_id,position));
      CREATE TABLE domains(id TEXT PRIMARY KEY,title TEXT NOT NULL,text TEXT NOT NULL,source_json TEXT NOT NULL,usage TEXT NOT NULL DEFAULT 'historical-reference-not-proven-outcome');
      CREATE TABLE rule_profiles(id TEXT PRIMARY KEY,profile_json TEXT NOT NULL);
      CREATE TABLE source_documents(id TEXT PRIMARY KEY,path TEXT NOT NULL,sha256 TEXT NOT NULL,metadata_json TEXT NOT NULL);
      CREATE TABLE reference_commentary_links(hexagram_id INTEGER PRIMARY KEY REFERENCES hexagrams(id),path TEXT NOT NULL,usage TEXT NOT NULL CHECK(usage='explicit-reference-only;body-excluded'));
      CREATE TABLE month_orders(id TEXT PRIMARY KEY,label TEXT NOT NULL,season TEXT NOT NULL,definition_json TEXT NOT NULL);
      CREATE TABLE monthly_narratives(id TEXT PRIMARY KEY,hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_order_id TEXT NOT NULL REFERENCES month_orders(id),mutual_hexagram_id INTEGER NOT NULL REFERENCES hexagrams(id),changed_hexagram_id INTEGER NOT NULL REFERENCES hexagrams(id),paragraphs_json TEXT NOT NULL,trace_json TEXT NOT NULL,UNIQUE(hexagram_id,moving_line,month_order_id),FOREIGN KEY(hexagram_id,moving_line) REFERENCES lines(hexagram_id,position));
      CREATE TABLE domain_narrative_rules(domain_id TEXT PRIMARY KEY REFERENCES domains(id),rules_json TEXT NOT NULL);
      CREATE TABLE void_narrative_rules(state TEXT PRIMARY KEY,text TEXT NOT NULL,source_ids_json TEXT NOT NULL);
      CREATE TABLE classical_cases(id TEXT PRIMARY KEY,title TEXT NOT NULL,record_json TEXT NOT NULL,usage TEXT NOT NULL CHECK(usage='historical-source-report;not-new-user-prediction'));
      CREATE VIEW moving_line_details AS SELECT l.*,d.changed_hexagram_id,h.name AS changed_hexagram_name,d.structure_json,d.editorial_notes_json FROM lines l JOIN line_details d USING(hexagram_id,position) JOIN hexagrams h ON h.id=d.changed_hexagram_id;
    ''')
    db.executemany('INSERT INTO metadata VALUES (?,?)', [('schema_version','1.0.0'),('content_version',cat['contentVersion']),('line_order','bottom-up'),('commentary_gate','unverified bodies and quarantine excluded'),('meaning_scope','classical texts and translations are traditional readings; not verified future outcomes')])
    for h in cat['hexagrams']:
        db.execute('INSERT INTO hexagrams VALUES (?,?,?,?,?,?,?,?,?)',(h['id'],h['name'],''.join(map(str,h['bitsBottomUp'])),h['grade']['rawGrade'],h['grade']['canonicalGrade'],h['upperTrigram'],h['lowerTrigram'],j(h['reading']),j({'sourceRef':h['sourceRef'],'referenceUrl':h['referenceUrl'],'patchIds':h['patchIds']})))
        for line in h['lines']:db.execute('INSERT INTO lines VALUES (?,?,?,?,?,?,?,?)',(h['id'],line['position'],line['label'],line['text'],line['vernacular'],line['image'],line['imageVernacular'],j({'sourceRef':line['sourceRef'],'referenceUrl':line['referenceUrl']})))
        for line in h['specialLines']:db.execute('INSERT INTO special_lines VALUES (?,?,?)',(h['id'],line['label'],j(line)))
        db.execute('INSERT INTO reference_commentary_links VALUES (?,?,?)',(h['id'],f'sources/commentary/{h["id"]:02}.json','explicit-reference-only;body-excluded'))
    for h in cat['hexagrams']:
        detail=load(f'data/details/{h["id"]:02}.json')
        for line in detail['lines']:db.execute('INSERT INTO line_details VALUES (?,?,?,?,?)',(h['id'],line['position'],line['changedHexagram']['id'],j(line['structure']),j(line['editorialNotes'])))
    for d in load('data/domains.json'):db.execute('INSERT INTO domains(id,title,text,source_json) VALUES (?,?,?,?)',(d['id'],d['title'],d['text'],j(d['sourceRef'])))
    rp=load('data/rule-profile.json');db.execute('INSERT INTO rule_profiles VALUES (?,?)',(rp['id'],j(rp)))
    stories=load('data/stories/index.json')
    for order in stories['monthOrders']:db.execute('INSERT INTO month_orders VALUES (?,?,?,?)',(order['id'],order['label'],order['season'],j(order)))
    for f in stories['files']:
        for story in load(f['path'])['rows']:
            db.execute('INSERT INTO monthly_narratives VALUES (?,?,?,?,?,?,?,?)',(story['id'],story['primaryId'],story['movingLine'],story['monthOrder'],story['stageIds'][1],story['stageIds'][2],j(story['paragraphs']),j({k:story[k] for k in ['body','nodes','relations','sourceIds','scope']})))
    for d in load('data/stories/domain-rules.json')['domains']:db.execute('INSERT INTO domain_narrative_rules VALUES (?,?)',(d['id'],j(d)))
    void_rules=load('data/stories/void-rules.json')
    for state,text in void_rules['states'].items():db.execute('INSERT INTO void_narrative_rules VALUES (?,?,?)',(state,text,j(void_rules['sourceIds'])))
    for case in load('data/classical-cases.json')['cases']:db.execute('INSERT INTO classical_cases VALUES (?,?,?,?)',(case['id'],case['title'],j(case),'historical-source-report;not-new-user-prediction'))
    for s in load('data/source-manifest.json')['sources']+[load('data/details/source-manifest.json')]:db.execute('INSERT INTO source_documents VALUES (?,?,?,?)',(s['id'],s['path'],s['sha256'],j(s)))
    db.commit();assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not db.execute('PRAGMA foreign_key_check').fetchall()
    # Stable SQL is the version-controlled database import. The binary is an optional local artifact.
    statements=list(db.iterdump())
    # Create every parent table first, then defer row checks until the atomic import commits.
    ordered=[x for x in statements if x.startswith('CREATE TABLE')]+[x for x in statements if x.startswith('INSERT INTO')]+[x for x in statements if x.startswith('CREATE VIEW')]
    sql='PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;\n'+'\n'.join(ordered)+'\nCOMMIT;\n'
    (ROOT/'data/knowledge.sql').write_text(sql)
    out=ROOT/'dist';out.mkdir(exist_ok=True)
    target=out/'wengua.sqlite'
    if target.exists():target.unlink()
    # The new audit is a separate small SQL supplement; do not rewrite historical story rows.
    supplement=ROOT/'data/timing-audit.sql'
    with sqlite3.connect(target) as disk:
        db.backup(disk)
        if supplement.exists():disk.executescript(supplement.read_text())
        questions=ROOT/'data/question-items.sql'
        if questions.exists():disk.executescript(questions.read_text())
        assert disk.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    check=sqlite3.connect(':memory:');check.executescript(sql)
    assert check.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not check.execute('PRAGMA foreign_key_check').fetchall()
    assert check.execute('SELECT count(*) FROM moving_line_details').fetchone()[0]==384
    assert check.execute('SELECT display_grade FROM hexagrams WHERE id=44').fetchone()[0]=='中卦'
    assert check.execute('SELECT changed_hexagram_id FROM line_details WHERE hexagram_id=55 AND position=1').fetchone()[0]==62
    assert check.execute('SELECT count(*) FROM monthly_narratives').fetchone()[0]==1920
    assert check.execute('SELECT count(*) FROM classical_cases').fetchone()[0]==10
    print('SQLite: 64 hexagrams, 384 joined lines, 1,920 month-order stories, 18 domains, void rules and 10 historical source cases; integrity and foreign keys passed.')
if __name__=='__main__':main()
