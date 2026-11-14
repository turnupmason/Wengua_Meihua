import hashlib
import json
import re
import subprocess
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r'D:\Wengua_Meihua-interview-publish')
SCRATCH = Path(__file__).parent
MONTHS = dict(zip('春夏秋冬土', ['spring-wood', 'summer-fire', 'autumn-metal', 'winter-water', 'seasonal-earth']))
MONTH_ELEMENT = dict(zip(MONTHS.values(), '木火金水土'))
BRANCH_MONTH = dict(zip('寅卯辰巳午未申酉戌亥子丑', ['春','春','土','夏','夏','土','秋','秋','土','冬','冬','土']))
TRIGRAMS = dict(zip(('111', '110', '101', '100', '011', '010', '001', '000'), '乾兑离震巽坎艮坤'))
ELEMENT = dict(zip('乾兑离震巽坎艮坤', '金金火木木水土土'))
GENERATES = dict(zip('木火土金水', '火土金水木'))
CONTROLS = dict(zip('木火土金水', '土金水木火'))
ROLES = ('use', 'body_mutual', 'use_mutual', 'changed_use')
ROLE_CN = dict(zip(ROLES, ('本用','体互','用互','变用')))
REL_CN = {'equal':'比和','use_controls_body':'克体','body_controls_use':'体制','use_generates_body':'生体','body_generates_use':'泄体'}
QI_BRANCH = dict(zip('木火土金水', ('寅卯','巳午','辰戌丑未','申酉','亥子')))
DEEP = ('囚', '死')
FIRM = ('旺', '相')

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def calc_relation(body, other):
    if body == other:
        return 'equal'
    if GENERATES[other] == body:
        return 'use_generates_body'
    if CONTROLS[other] == body:
        return 'use_controls_body'
    if GENERATES[body] == other:
        return 'body_generates_use'
    return 'body_controls_use'

def calc_strength(month, element):
    if month == element:
        return '旺'
    if GENERATES[month] == element:
        return '相'
    if GENERATES[element] == month:
        return '休'
    if CONTROLS[element] == month:
        return '囚'
    return '死'

def normalized(text):
    return ''.join(c for c in text if c.isalnum())

def element_observations(nodes, relations):
    return {
        role: dict(trigram=nodes[role][0], element=nodes[role][1], strength=nodes[role][2], relation=relations[role])
        for role in ROLES
    }

def evaluate(nodes, rel, line_signal):
    body = nodes['body'][2]
    use, body_mutual, use_mutual, changed = (rel[k] for k in ROLES)
    pressure = [k for k in ROLES if rel[k] == 'use_controls_body']
    supply = [k for k in ROLES if rel[k] == 'use_generates_body']
    drain = [k for k in ROLES if rel[k] == 'body_generates_use']
    firm_supply = [k for k in supply if nodes[k][2] in FIRM]
    strong_pressure = [k for k in pressure if nodes[k][2] in FIRM]
    weak_pressure = [k for k in pressure if nodes[k][2] in DEEP]
    restrained = [k for k in ROLES if rel[k] == 'body_controls_use']
    early_can_control = use == 'body_controls_use' and (
        body in FIRM or (body == '休' and nodes['use'][2] in DEEP)
    )
    late_can_control = changed == 'body_controls_use' and (
        body in FIRM or (body == '休' and nodes['changed_use'][2] in DEEP)
    )
    if use == 'use_controls_body' and not supply:
        if body in FIRM and not strong_pressure and line_signal == 'P':
            return 'unresolved', '本用先克且全盘无生。体旺相而克源弱、爻有正证，承压能力与合格仍分两层', pressure
        return 'unlikely', '本用直接克体而全盘无生，求名及有克无生两条相合', pressure
    if pressure and not supply and body in DEEP:
        if line_signal == 'P' and not strong_pressure and use == 'equal' and changed != 'use_controls_body':
            return 'unresolved', '体囚死而有克无生。克不在首尾，正爻能否弥补体弱须有实际作答证据', pressure
        return 'unlikely', '体囚死、盘内有克无生，体党不能自行补强；核对克所在阶段', pressure
    if use == 'use_controls_body':
        if (body in DEEP and 'use' in strong_pressure and not firm_supply) or (
            line_signal == 'X' and (body not in FIRM or changed == 'use_controls_body')
        ):
            return 'unlikely', '直接克体先起，生扶在后或力量不足，另有体弱或爻明示受阻', pressure
        return 'unresolved', '开局直接受克，后段有生扶。须核实后援发生在应试作答时且足以追回失分', pressure + supply
    if changed == 'use_controls_body':
        if body in DEEP and ('changed_use' in strong_pressure or not firm_supply):
            return 'unlikely', '体囚死且末段变用克体，须实查压轴或交卷是否仍能完成', pressure + supply
        if not supply and line_signal in ('X','A'):
            return 'unlikely', '末段克体而无生，爻又明示条件限制或直接损害', pressure
        return 'unresolved', '变用克体是末段风险。前段可用性或旺相体力给缓冲，仍须核实完整答卷', pressure + supply
    if line_signal == 'X':
        if use == 'use_generates_body' and body in FIRM and not strong_pressure and changed in (
            'equal', 'use_generates_body', 'body_controls_use'
        ):
            return 'unresolved', '动爻提示实际完成障碍，开局有扶且体能承，须证明已解决该障碍', supply
        if use == 'equal' and body in FIRM and not pressure and changed in ('equal','body_controls_use'):
            return 'unresolved', '过程有持续承受条件，爻的止损或失败信号要求检验实际答卷状态', []
        return 'unlikely', '爻、象指向实际进展或完成障碍；所见五行支持仍需落实到该障碍', pressure + supply
    if use == 'body_generates_use':
        if not supply and (body in DEEP or changed == 'body_generates_use'):
            return 'unlikely', '初段耗体又无生扶，体弱或末段继续耗；投入难换成够线答卷', drain
        if (line_signal == 'P' and body in FIRM and 'changed_use' in supply and
                'changed_use' not in weak_pressure and nodes['changed_use'][2] in FIRM and not strong_pressure):
            return 'conditional-positive', '开局投入耗力，旺相原体能承且末段旺相生体；须确认投入能换来可评分答案', drain + supply
        return 'unresolved', '开局耗体。投入多少、互段能否回补及末段是否兑现，对合格至关重要', drain + supply
    if line_signal in ('L','A'):
        if (line_signal == 'L' and use == 'use_generates_body' and 'changed_use' in supply
                and body in FIRM and not pressure and changed != 'body_generates_use'):
            return 'conditional-positive', '本用和变用有生扶且体能承，爻只提供完成条件；合格以按计划形成完整卷面为限', supply
        return 'unresolved', '爻仅证守位、免过或有条件分向。结构有利时，仍要核对实际完成和得分', supply + pressure
    if strong_pressure and body not in FIRM:
        return 'unresolved', '爻有正证，旺相克源的影响要由实际应试能力或实助化解', pressure + supply
    if 'body_mutual' in pressure and not supply and body not in FIRM:
        return 'unresolved', '体互主过程并克体，无盘内生体；末段能继续的程度待实证', pressure
    if body in DEEP and not firm_supply:
        return 'unresolved', '原体偏弱，生扶未见有力；有利爻意能否成为实分要核实', supply
    if use == 'body_controls_use' and not early_can_control and not firm_supply:
        return 'unresolved', '虽体制用，原体力量未支持直接制得住当前考查；得分有待验证', restrained
    if changed == 'body_generates_use' and not (body in FIRM and (supply or early_can_control)):
        return 'unresolved', '末段泄体。前段可顺并仍需确认时间体力及答案完整性', drain + supply
    if use in ('equal','use_generates_body') or early_can_control:
        if changed in ('equal','use_generates_body') or late_can_control or (
            body in FIRM and bool(supply) and changed == 'body_generates_use'
        ):
            return 'conditional-positive', '爻有可落实的正向证据，且开局与末段具备承受或推进条件；合格以条件在作答中兑现为限', supply + pressure
    return 'unresolved', '爻有可行动之处，整体达标还依赖主用、两互和末段的实证衔接', supply + pressure

def review_timing(nodes, relations, verdict):
    if verdict == 'conditional-positive':
        for role in ROLES:
            if relations[role] == 'use_generates_body' and nodes[role][2] not in DEEP:
                return dict(event='合格方向的助力窗口', anchor=role, trigram=nodes[role][0],
                            branches=list(QI_BRANCH[nodes[role][1]]), sources=['mh-071','mh-116','mh-122','mh-143'],
                            condition='仅供近期已有安排的对应事件参考，以实际当地起卦日匹配。开考与公布遵从主办方')
        if all(relations[role] != 'use_controls_body' for role in ROLES) and nodes['body'][2] in FIRM:
            return dict(event='条件成立后的原体时序', anchor='body', trigram=nodes['body'][0],
                        branches=list(QI_BRANCH[nodes['body'][1]]), sources=['mh-071','mh-122','mh-143'],
                        condition='无克时才参考原体时序，近期确有相应安排才参照')
    if verdict == 'unlikely':
        for role in ROLES:
            if relations[role] == 'use_controls_body' and nodes[role][2] in FIRM:
                return dict(event='直接阻力窗口', anchor=role, trigram=nodes[role][0],
                            branches=list(QI_BRANCH[nodes[role][1]]), sources=['mh-116','mh-122','mh-143'],
                            condition='近期确有相应环节才参考阻力卦气；不能推定真实成绩或通知时间')
    return None

def write_jsonl(path, rows):
    with path.open('w', encoding='utf-8', newline='\n') as out:
        for row in rows:
            out.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')

def hash_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    catalog = read_json(ROOT/'data/catalog.json')['hexagrams']
    raw_lines = (ROOT/'sources/original/yijing64.txt').read_text(encoding='utf-8-sig').splitlines()
    hex_by_bits = {''.join(map(str, h['bitsBottomUp'])): h for h in catalog}
    facts_path = SCRATCH/'blind-facts.json'
    facts = {(x['primaryId'], x['movingLine'], x['monthOrder']):x for x in read_json(facts_path)}
    assert hash_file(facts_path) == '8df58fbb35bed6a543b2afa54ad80a3ca3138c64c415098b6f7dbe841e8f4f36'
    assert len(catalog) == len(hex_by_bits) == 64 and len(facts) == 1920
    annotations = {}
    for name in ('blind.lines-01.txt', 'blind.lines-17.txt'):
        for entry in (SCRATCH/name).read_text(encoding='utf-8-sig').splitlines():
            h, *notes = entry.split('|')
            assert len(notes) == 6
            for i, note in enumerate(notes, 1):
                assert note[0] in 'PLAX' and (int(h), i) not in annotations
                annotations[int(h), i] = (note[0], note[1:].strip())
    assert len(annotations) == 384
    overrides = {}
    for entry in (SCRATCH/'blind.overrides.txt').read_text(encoding='utf-8-sig').splitlines():
        label, group, verdict, note = entry.split('|')
        h, line_no = map(int,label.split('.'))
        assert verdict in ('unlikely','unresolved','conditional-positive')
        for mo in group.split('+'):
            key = h, line_no, MONTHS[mo]
            assert key not in overrides
            overrides[key] = verdict, note
    assert set(overrides) <= set(facts)
    slot_source = (ROOT/'src/month-slots.js').read_text(encoding='utf-8')
    actual_branches = re.findall(r"\['(.)','([a-z-]+)'\]", slot_source)
    assert actual_branches == [(branch, MONTHS[mo]) for branch, mo in BRANCH_MONTH.items()]

    main_rows, branch_rows = [], []
    quote_discrepancies = []
    for h in catalog:
        primary = h['id']
        bits = ''.join(map(str, h['bitsBottomUp']))
        mutual_bits = bits[1:4]+bits[2:5]
        mutual = hex_by_bits[mutual_bits]
        for line_no in range(1, 7):
            raw_line = h['lines'][line_no-1]
            ref = raw_line['sourceRef']
            raw_block = '\n'.join(raw_lines[ref['startLine']-1:ref['endLine']])
            for field in ('text', 'image'):
                if normalized(raw_line[field]) not in normalized(raw_block):
                    quote_discrepancies.append([primary, line_no, field, ref, raw_line[field], raw_block])
            use_half = (line_no - 1) // 3
            body_half = 1 - use_half
            changed_bits = bits[:line_no-1] + ('1' if bits[line_no-1] == '0' else '0') + bits[line_no:]
            changed = hex_by_bits[changed_bits]
            trigram_at = lambda pattern, half: TRIGRAMS[pattern[half*3:half*3+3]]
            trigrams = dict(body=trigram_at(bits, body_half), use=trigram_at(bits, use_half),
                            body_mutual=trigram_at(mutual_bits, body_half), use_mutual=trigram_at(mutual_bits, use_half),
                            changed_use=trigram_at(changed_bits, use_half), body_inherited=trigram_at(changed_bits, body_half))
            assert trigrams['body_inherited'] == trigrams['body']
            signal, note = annotations[primary, line_no]
            for qi in MONTHS.values():
                key = primary, line_no, qi
                f = facts[key]
                nodes = {role:(t, ELEMENT[t], calc_strength(MONTH_ELEMENT[qi], ELEMENT[t]))
                         for role,t in trigrams.items()}
                relations = {role:calc_relation(nodes['body'][1],nodes[role][1]) for role in ROLES}
                assert dict((role,(t,e,s)) for role,t,e,s in f['nodes']) == nodes, key
                assert dict(f['relations']) == relations, key
                assert f['stages'] == [[x['id'],x['name']] for x in (h, mutual, changed)], key
                assert (f['line'],f['image'],f['locator']) == (raw_line['text'],raw_line['image'],ref), key
                verdict, rationale, dominant = evaluate(nodes,relations,signal)
                hand = overrides.get(key)
                if hand:
                    verdict, hand_reason = hand
                branches = [branch for branch, mo in BRANCH_MONTH.items() if MONTHS[mo] == qi]
                condition = (
                    '待核同类练习得分与完成度是否已可稳定到合格线，现场须按时形成完整可评分答卷。'
                    if verdict == 'conditional-positive' else
                    '需确认相关障碍在考试前已消除或实际卷面有足量得分，才考虑改变判断。'
                    if verdict == 'unlikely' else
                    '已有卦爻证据方向混合或范围有限，须补实际题型、掌握度和交卷表现。'
                )
                row = dict(articleKey=f'{primary:03d}/{line_no}/{qi}', hexId=primary, movingLine=line_no,
                           monthOrder=qi, monthBranches=branches, lineSignal=signal, lineInterpretation=note,
                           lineText=f['line'], imageText=f['image'], lineSource=ref, stages=f['stages'],
                           rootBody=list(nodes['body']), evidence=element_observations(nodes,relations),
                           strongestStage=ROLE_CN['use'], salientRoles=dominant,
                           sourceIds=['mh-056','mh-061','mh-064','mh-071','mh-116','mh-117','mh-119'],
                           blindVerdict=verdict, ruleReason=rationale, condition=condition,
                           exactQiSemanticReview=hand_reason if hand else None,
                           reviewGranularity='manual-line-and-qi' if hand else 'manual-line-assisted-qi',
                           timing=review_timing(nodes,relations,verdict))
                main_rows.append(row)
                for branch in branches:
                    branch_rows.append(dict(lookupKey=f'{primary:03d}/{line_no}/{branch}',
                                            hexId=primary, movingLine=line_no, monthBranch=branch,
                                            articleKey=row['articleKey'], monthOrder=qi, blindVerdict=verdict,
                                            reviewGranularity=row['reviewGranularity'],
                                            branchBasis='same-five-state-qi-no-branch-specific-rules'))
    assert len(main_rows) == len({r['articleKey'] for r in main_rows}) == 1920
    assert len(branch_rows) == len({r['lookupKey'] for r in branch_rows}) == 4608
    assert {r['lookupKey'] for r in branch_rows} == {
        f'{h:03d}/{i}/{b}' for h in range(1,65) for i in range(1,7) for b in BRANCH_MONTH
    }
    write_jsonl(SCRATCH/'blind.articles.jsonl',main_rows)
    write_jsonl(SCRATCH/'blind.lookups.jsonl',branch_rows)
    write_jsonl(SCRATCH/'blind.quote-discrepancies.jsonl',quote_discrepancies)
    print(json.dumps(dict(
        articleVerdicts=Counter(r['blindVerdict'] for r in main_rows),
        lookupVerdicts=Counter(r['blindVerdict'] for r in branch_rows),
        articleGranularity=Counter(r['reviewGranularity'] for r in main_rows),
        lookupGranularity=Counter(r['reviewGranularity'] for r in branch_rows),
        timingCandidates=sum(r['timing'] is not None for r in main_rows),
        quoteDiscrepancies=len(quote_discrepancies)
    ),ensure_ascii=False))

if __name__ == '__main__':
    main()

