"""Read-only consistency gate for the 2026-11-21 lost-object depth outputs.

Run from the repository root after the authored, question-story and SQLite
exports have completed:

    python3 scripts/review/check-lost-object-depth-sqlite-20261121.py

The script imports the complete SQL inputs into memory and opens the generated
SQLite file in read-only mode. It compares every authored JSON record, every
manuscript primary key, the complete month-key mapping, and every row of every
application table between SQL and SQLite. It also checks the separate 90- and
810-article campaigns. It does not build or modify any repository file.

JSON is written to stdout; a failed check exits nonzero. This is an output
consistency check, not semantic approval, classical interpretation approval,
an attestation of reading, or user acceptance.
"""

from itertools import zip_longest
from pathlib import Path
import json
import sqlite3
import sys


ROOT = Path(__file__).resolve().parents[2]
QUESTION = 'search.lost-object.recovery'
DEPTH_CAMPAIGN = 'lost-object-depth-20261121'
PRIOR_CAMPAIGN = 'lost-object-polish-20261120'
SQL_PATHS = [
    'data/knowledge.sql',
    'data/timing-audit.sql',
    'data/question-items.sql',
    'dist/question-stories.sql',
    'data/product-categories.sql',
    'dist/authored-readings.sql',
]


class CheckFailure(Exception):
    def __init__(self, check, detail):
        super().__init__(check)
        self.check = check
        self.detail = detail


def require(condition, check, detail):
    if not condition:
        raise CheckFailure(check, detail)


def load(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def canonical(value):
    # Preserve JSON types: Python's normal equality treats True and 1 as equal.
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def table_names(db):
    return {
        row[0] for row in db.execute(
            """SELECT name FROM sqlite_master
               WHERE type='table' AND name NOT LIKE 'sqlite_%'"""
        )
    }


def compare_key_sets(expected, actual, check):
    require(expected == actual, check, {
        'expectedCount': len(expected),
        'actualCount': len(actual),
        'missingFirst10': sorted(expected - actual)[:10],
        'extraFirst10': sorted(actual - expected)[:10],
    })


def inspect(sql_db, disk_db):
    for label, db in [('SQL', sql_db), ('SQLite', disk_db)]:
        integrity = db.execute('PRAGMA integrity_check').fetchall()
        require(integrity == [('ok',)], 'integrity-check', {
            'database': label, 'result': integrity,
        })
        foreign_keys = db.execute('PRAGMA foreign_key_check').fetchall()
        require(not foreign_keys, 'foreign-key-check', {
            'database': label, 'violationsFirst10': foreign_keys[:10],
        })

    record_keys = set()
    slot_values = {}
    question_ids = set()
    per_question = []
    base_slots = 0
    exact_slots = 0
    campaign_keys = {DEPTH_CAMPAIGN: set(), PRIOR_CAMPAIGN: set()}

    def add_slot(key, month_order):
        require(key not in slot_values, 'duplicate-json-month-key', key)
        slot_values[key] = month_order

    indexes = sorted((ROOT / 'data/authored-readings').glob('*/index.json'))
    require(bool(indexes), 'authored-indexes', 'No authored indexes found')
    for index_path in indexes:
        index = json.loads(index_path.read_text(encoding='utf-8'))
        question_id = index['questionId']
        require(question_id not in question_ids, 'duplicate-question-index', question_id)
        question_ids.add(question_id)
        count = 0
        local_base_slots = 0
        local_exact_slots = 0

        for file in index['files']:
            batch = load(file['path'])
            require(batch['questionId'] == question_id, 'batch-question', file['path'])
            require(batch['primaryId'] == file['primaryId'], 'batch-hexagram', file['path'])

            for row in batch['rows']:
                require(row['primaryId'] == batch['primaryId'], 'row-hexagram', file['path'])
                key = (
                    question_id, row['primaryId'], row['movingLine'],
                    row['monthOrder'], row['voidProfileKey'],
                )
                require(key not in record_keys, 'duplicate-json-manuscript-key', key)
                record_keys.add(key)

                stored = sql_db.execute(
                    '''SELECT record_json, decision_id, review_version,
                              review_status, artifact_digest
                       FROM authored_product_manuscripts
                       WHERE question_id=? AND hexagram_id=? AND moving_line=?
                         AND month_order_id=? AND void_profile_key=?''',
                    key,
                ).fetchone()
                require(stored is not None, 'missing-sql-manuscript', key)
                require(canonical(json.loads(stored[0])) == canonical(row),
                        'complete-record-json', key)
                require(stored[1:] == (
                    row['decision']['id'],
                    row['review']['version'],
                    row['review']['status'],
                    row['artifactDigest'],
                ), 'manuscript-columns', key)

                campaign = row['authorship'].get('currentLiteraryPolish', {}).get('campaign')
                if question_id == QUESTION and campaign in campaign_keys:
                    campaign_keys[campaign].add(key)

                if not row['baseProse']:
                    for branch in row['monthBranches']:
                        add_slot(
                            (question_id, row['primaryId'], row['movingLine'],
                             branch, row['voidProfileKey']),
                            row['monthOrder'],
                        )
                        local_exact_slots += 1
                count += 1

            for key, row_index in batch['monthSlots'].items():
                line, branch = key.split(':')
                row = batch['rows'][row_index]
                require(row['movingLine'] == int(line) and branch in row['monthBranches'],
                        'json-month-slot-target', {'path': file['path'], 'key': key})
                add_slot(
                    (question_id, batch['primaryId'], int(line),
                     branch, row['voidProfileKey']),
                    row['monthOrder'],
                )
                local_base_slots += 1

        require(count == index['authoredVersionCount'], 'index-record-count', {
            'questionId': question_id, 'index': index['authoredVersionCount'], 'actual': count,
        })
        require(local_base_slots == index['baseCaseCount'], 'index-base-slot-count', {
            'questionId': question_id, 'index': index['baseCaseCount'], 'actual': local_base_slots,
        })
        base_slots += local_base_slots
        exact_slots += local_exact_slots
        per_question.append({
            'questionId': question_id,
            'records': count,
            'baseSlots': local_base_slots,
            'exactSlots': local_exact_slots,
        })

    actual_record_keys = set(sql_db.execute(
        '''SELECT question_id, hexagram_id, moving_line,
                  month_order_id, void_profile_key
           FROM authored_product_manuscripts'''
    ))
    compare_key_sets(record_keys, actual_record_keys, 'complete-manuscript-key-set')
    actual_slots = {
        (qid, hid, line, branch, void): order
        for qid, hid, line, branch, void, order in sql_db.execute(
            '''SELECT question_id, hexagram_id, moving_line,
                      month_branch, void_profile_key, month_order_id
               FROM authored_product_month_slots'''
        )
    }
    compare_key_sets(set(slot_values), set(actual_slots), 'complete-month-key-set')
    for key, order in slot_values.items():
        require(actual_slots[key] == order, 'month-key-mapping', {
            'key': key, 'expected': order, 'actual': actual_slots[key],
        })

    question_index = load('data/question-stories/index.json')
    product = load('data/product-categories.json')
    count_checks = [
        ('fixed_question_items', 90),
        ('fixed_question_stories', question_index['writtenBaseStoryCount']),
        ('fixed_question_story_profiles', question_index.get('writtenProfileStoryCount', 0)),
        ('product_categories', product['categoryCount']),
        ('product_subcategories', product['subcategoryCount']),
        ('product_questions', product['questionCount']),
    ]
    for table, expected in count_checks:
        actual = sql_db.execute('SELECT count(*) FROM ' + quote(table)).fetchone()[0]
        require(actual == expected, 'catalog-or-legacy-count', {
            'table': table, 'expected': expected, 'actual': actual,
        })
    approved = sql_db.execute(
        'SELECT count(*) FROM approved_fixed_question_stories'
    ).fetchone()[0]
    require(approved == question_index['approvedBaseStoryCount'] == 0
            and question_index.get('approvedProfileStoryCount', 0) == 0,
            'legacy-approval-boundary', 'Legacy export must not establish interpretive approval')

    loss = next((entry for entry in per_question if entry['questionId'] == QUESTION), None)
    require(loss is not None, 'lost-object-question', 'Lost-object index missing')
    require((loss['records'], loss['baseSlots'], loss['exactSlots']) == (1920, 4608, 0),
            'lost-object-total-coverage', loss)
    campaign_counts = {}
    for campaign, expected_rows, expected_slots in [
        (DEPTH_CAMPAIGN, 90, 216), (PRIOR_CAMPAIGN, 810, 1944),
    ]:
        keys = campaign_keys[campaign]
        slots = sum(
            (qid, hid, line, order, void) in keys
            for (qid, hid, line, branch, void), order in slot_values.items()
        )
        require((len(keys), slots) == (expected_rows, expected_slots), 'campaign-coverage', {
            'campaign': campaign,
            'expected': {'records': expected_rows, 'monthKeys': expected_slots},
            'actual': {'records': len(keys), 'monthKeys': slots},
        })
        campaign_counts[campaign] = {'records': len(keys), 'monthKeys': slots}

    sql_tables = table_names(sql_db)
    disk_tables = table_names(disk_db)
    compare_key_sets(sql_tables, disk_tables, 'sql-sqlite-table-set')
    table_counts = {}
    sentinel = object()
    for table in sorted(sql_tables):
        info = sql_db.execute('PRAGMA table_info(' + quote(table) + ')').fetchall()
        disk_info = disk_db.execute('PRAGMA table_info(' + quote(table) + ')').fetchall()
        require(info == disk_info, 'sql-sqlite-table-schema', table)
        primary = [
            column[1] for column in sorted(info, key=lambda column: column[5]) if column[5]
        ]
        order = primary or [column[1] for column in info]
        statement = (
            'SELECT * FROM ' + quote(table) +
            ' ORDER BY ' + ','.join(quote(column) for column in order)
        )
        count = 0
        for count, (expected, actual) in enumerate(
            zip_longest(
                sql_db.execute(statement), disk_db.execute(statement), fillvalue=sentinel,
            ),
            start=1,
        ):
            require(expected == actual, 'sql-sqlite-complete-table-rows', {
                'table': table, 'orderedRow': count,
            })
        table_counts[table] = count

    return {
        'schemaVersion': '1.0.0',
        'status': 'passed',
        'campaign': DEPTH_CAMPAIGN,
        'scope': 'all-authored-json-to-full-sql-and-all-application-tables-to-read-only-sqlite',
        'sqlInputs': SQL_PATHS,
        'sqlitePath': 'dist/wengua.sqlite',
        'authoredRecords': len(record_keys),
        'baseMonthSlots': base_slots,
        'exactContextMonthSlots': exact_slots,
        'allMonthKeys': len(slot_values),
        'lossDepthCampaignRecords': len(campaign_keys[DEPTH_CAMPAIGN]),
        'lossPriorCampaignRecords': len(campaign_keys[PRIOR_CAMPAIGN]),
        'campaignCounts': campaign_counts,
        'perQuestion': per_question,
        'allSQLSQLiteTableCounts': table_counts,
        'integrityCheck': {'SQL': 'ok', 'SQLite': 'ok'},
        'foreignKeyViolations': {'SQL': 0, 'SQLite': 0},
        'semanticReview': 'not-established-by-this-output-consistency-check',
        'userAcceptedThisVersion': False,
    }


def main():
    sql_db = None
    disk_db = None
    try:
        for path in SQL_PATHS:
            require((ROOT / path).is_file(), 'missing-full-sql-input', path)
        database = ROOT / 'dist/wengua.sqlite'
        require(database.is_file(), 'missing-sqlite-output', 'dist/wengua.sqlite')
        sql_db = sqlite3.connect(':memory:')
        for path in SQL_PATHS:
            sql_db.executescript((ROOT / path).read_text(encoding='utf-8'))
        disk_db = sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)
        report = inspect(sql_db, disk_db)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        report = {
            'schemaVersion': '1.0.0',
            'status': 'failed',
            'campaign': DEPTH_CAMPAIGN,
            'check': error.check if isinstance(error, CheckFailure) else 'execution-error',
            'detail': error.detail if isinstance(error, CheckFailure) else str(error),
            'semanticReview': 'not-established-by-this-output-consistency-check',
            'userAcceptedThisVersion': False,
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    finally:
        if disk_db is not None:
            disk_db.close()
        if sql_db is not None:
            sql_db.close()


if __name__ == '__main__':
    sys.exit(main())
