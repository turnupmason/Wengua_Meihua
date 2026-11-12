import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadLibrary,createProductRepository} from '../src/index.js';
import {getCivilDay} from '../src/day-calendar.js';
import {getVoidProfileKey} from '../src/prewritten-manuscripts.js';

// Use the mobile app's pinned independent calendar library.
const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const {Solar} = require('lunar-javascript');
assert.equal(require('lunar-javascript/package.json').version, '1.7.7');
const dayMs = 86400000;
const start = Date.UTC(2027, 0, 1);
const end = Date.UTC(2029, 0, 1);
const branchesByTrigram = {乾:'戌亥',坎:'子',艮:'丑寅',震:'卯',巽:'辰巳',离:'午',坤:'未申',兑:'酉'};
const branchesByElement = {木:'寅卯',火:'巳午',土:'辰戌丑未',金:'申酉',水:'亥子'};
const calendar = [];
// January 2029 supplies candidates for casts at the end of December 2028.
for (let stamp = start; stamp < Date.UTC(2029, 1, 1); stamp += dayMs) {
  const date = new Date(stamp).toISOString().slice(0, 10);
  const lunar = Solar.fromYmd(...date.split('-').map(Number)).getLunar();
  const ganzhi = lunar.getDayInGanZhi();
  assert.equal(getCivilDay(date).dayGanzhi, ganzhi, date);
  calendar.push({date, ganzhi, xun: lunar.getDayXun(), empty: lunar.getDayXunKong()});
}
const castingDays = calendar.slice(0, (end - start) / dayMs);
assert.equal(castingDays.length, 731);
assert.equal(new Set(castingDays.map(d => d.ganzhi)).size, 60);

function expectedDates(dayIndex, wanted) {
  const cast = calendar[dayIndex];
  const month = cast.date.slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);
  const nextTwoMonths = calendar.slice(dayIndex, dayIndex + 62).filter(d => wanted.includes(d.ganzhi[1]));
  const current = nextTwoMonths.filter(d => d.date.startsWith(month));
  return (current.length ? current : nextTwoMonths.filter(d => d.date.startsWith(nextMonth))).map(d => d.date);
}

const readJSON = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const index = await readJSON('data/authored-readings/interview-pass/index.json');
const product = createProductRepository({library:await loadLibrary(), readJSON});
const options = {questionId:index.questionId, timingScale:'day', timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};
const totals = {};
for (const id of [1, 2, 3, 12, 25, 31, 33]) {
  const file = await readJSON(index.files.find(f => f.primaryId === id).path);
  const testedKeys = Object.entries(file.monthSlots).filter(([key, position]) => id <= 3 ||
    file.rows.some(r => !r.baseProse && r.movingLine === file.rows[position].movingLine && r.monthBranches.includes(key.split(':')[1])));
  const stats = {monthSlots:testedKeys.length, ready:0, pending:0, exact:0, mutualEffectPending:0, windows:0, nextMonthWindows:0};
  const seenContexts = new Set();
  for (const [key, position] of testedKeys) {
    const base = file.rows[position];
    const [line, monthBranch] = key.split(':');
    const exactRows = new Map(file.rows.filter(r => r.movingLine === Number(line) && r.monthBranches.includes(monthBranch))
      .map(r => [r.voidProfileKey, r]));
    let readyForKey = 0;
    for (const [dayIndex, day] of castingDays.entries()) {
      const trace = `${id}/${key}/${day.date}`;
      const out = await product.getContent({...options, primaryId:id, movingLine:Number(line), monthBranch, castingDate:day.date});
      const reading = out.reading;
      assert.equal(reading.dayGanzhi, day.ganzhi, trace);
      assert.equal(reading.monthBranch, monthBranch, trace);
      assert.equal(reading.monthOrder, base.monthOrder, trace);
      for (const node of reading.nodes) {
        const mapped = [...branchesByTrigram[node.trigram]];
        const matched = mapped.filter(b => day.empty.includes(b));
        assert.equal(node.void.xun.xunHead, day.xun, trace);
        assert.equal(node.void.xun.branches.join(''), day.empty, trace);
        assert.deepEqual(node.void.matchedBranches, matched, trace);
        assert.equal(node.void.hitKind, matched.length === 0 ? 'none' : matched.length === mapped.length ? 'full' : 'partial', trace);
        if (node.void.hitKind === 'partial') assert.equal(node.void.effective, 'reduced', trace);
      }
      const exact = exactRows.get(getVoidProfileKey(reading));
      const affected = reading.nodes.filter(n => n.role !== 'body_inherited' && n.void.effective !== 'active');
      if (!exact && affected.length) {
        assert.equal(out.status, 'pending-authoring', trace);
        assert.equal(out.story, null, trace);
        assert.deepEqual(out.paragraphs, [], trace);
        assert.equal(out.timingSection, undefined, trace);
        assert.equal(out.predictionAllowed, false, trace);
        stats.pending++;
        if (affected.every(n => n.role.endsWith('_mutual'))) stats.mutualEffectPending++;
        continue;
      }
      const manuscript = exact ?? base;
      assert.equal(out.status, 'ready', trace);
      assert.equal(out.voidMatch, exact ? 'recorded-context' : 'base-with-no-core-change', trace);
      assert.equal(out.short, manuscript.copy.short.text, trace);
      assert.equal(out.decision.id, manuscript.decision.id, trace);
      assert.equal(out.timingSection.windows.length, manuscript.timingSlots.length, trace);
      readyForKey++;
      stats.ready++;
      if (exact) {
        stats.exact++;
        seenContexts.add(manuscript.number);
      }
      for (const [slotIndex, window] of out.timingSection.windows.entries()) {
        const slot = manuscript.timingSlots[slotIndex];
        const node = reading.nodes.find(n => n.role === slot.role);
        const wanted = branchesByElement[node.element];
        const expected = expectedDates(dayIndex, wanted);
        assert.equal(node.void.effective, 'active', trace);
        assert.deepEqual([...window.targetBranches].sort(), [...wanted].sort(), trace);
        assert.equal(window.eventScope, slot.eventScope, trace);
        assert.deepEqual(window.matches.map(d => d.date), expected, trace);
        assert.deepEqual(window.displayedDates, expected.slice(0, 2), trace);
        stats.windows++;
        if (expected[0].slice(0, 7) !== day.date.slice(0, 7)) stats.nextMonthWindows++;
      }
    }
    assert.ok(readyForKey, `No eligible text over two years for ${id}/${key}`);
    if (id > 3) assert.equal(readyForKey, castingDays.length, `Incomplete summer contexts for ${id}/${key}`);
  }
  assert.equal(seenContexts.size, file.rows.filter(r => !r.baseProse).length);
  totals[id] = stats;
  console.log(JSON.stringify({primaryId:id,...stats}));
}
console.log(JSON.stringify({from:castingDays[0].date,to:castingDays.at(-1).date,days:castingDays.length,totals}));
