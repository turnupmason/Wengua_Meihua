import assert from 'node:assert/strict';

const monthlyQi = {
 'spring-wood':   {木:'旺', 火:'相', 土:'死', 金:'囚', 水:'休'},
 'summer-fire':   {木:'休', 火:'旺', 土:'相', 金:'死', 水:'囚'},
 'autumn-metal':  {木:'死', 火:'囚', 土:'休', 金:'旺', 水:'相'},
 'winter-water':  {木:'相', 火:'死', 土:'囚', 金:'休', 水:'旺'},
 'seasonal-earth':{木:'囚', 火:'休', 土:'旺', 金:'相', 水:'死'},
};
const trigrams = {'111':['乾','金'], '110':['兑','金'], '101':['离','火'], '100':['震','木'],
 '011':['巽','木'], '010':['坎','水'], '001':['艮','土'], '000':['坤','土']};
const generates = {木:'火', 火:'土', 土:'金', 金:'水', 水:'木'};
const controls = {木:'土', 土:'水', 水:'火', 火:'金', 金:'木'};

export function checkChartFacts(library, row, key) {
 const primary = library.getHexagram(row.primaryId);
 const bits = primary.bitsBottomUp;
 const changed = bits.map((bit, i) => i === row.movingLine - 1 ? 1 - bit : bit);
 const mutual = [...bits.slice(1,4), ...bits.slice(2,5)];
 const stageBits = [bits, mutual, changed];
 assert.deepEqual(row.facts.stages.map(stage => library.getHexagram(stage.id).bitsBottomUp), stageBits, key);
 const useSide = row.movingLine <= 3 ? 0 : 1;
 const bodySide = 1 - useSide;
 const pick = (lines, side) => trigrams[lines.slice(side * 3, side * 3 + 3).join('')];
 const expected = new Map([
  ['body', pick(bits, bodySide)], ['use', pick(bits, useSide)],
  ['body_mutual', pick(mutual, bodySide)], ['use_mutual', pick(mutual, useSide)],
  ['body_inherited', pick(changed, bodySide)], ['changed_use', pick(changed, useSide)],
 ]);
 assert.equal(row.facts.nodes.length, expected.size, key);
 assert.deepEqual(new Set(row.facts.nodes.map(node => node.role)), new Set(expected.keys()), key);
 for (const node of row.facts.nodes) {
  assert.deepEqual([node.trigram, node.element], expected.get(node.role), key);
  assert.equal(node.qi, monthlyQi[row.monthOrder][node.element], key);
 }
 const body = expected.get('body')[1];
 const roles = ['use','body_mutual','use_mutual','changed_use'];
 const expectedRelations = Object.fromEntries(roles.map(role => {
  const other = expected.get(role)[1];
  const type = [
   [body === other, 'equal'],
   [generates[other] === body, 'use_generates_body'],
   [generates[body] === other, 'body_generates_use'],
   [controls[other] === body, 'use_controls_body'],
   [controls[body] === other, 'body_controls_use'],
  ].find(([applies]) => applies)[1];
  return [role, type];
 }));
 assert.equal(row.facts.directRelations.length, roles.length, key);
 assert.deepEqual(Object.fromEntries(row.facts.directRelations.map(({role, type}) => [role, type])), expectedRelations, key);
}
