/** 详断 read plain first: only the order changes, never the words. */
import { describe, expect, it } from 'vitest';
import { plainFirst } from '../src/ui/plainFirst';

const SAMPLES = [
  '冬令坎水体和坎水用皆旺，比和。开头有足够的应答基础，能从完整的经历说起。',
  '体互艮土冬囚而克旺坎，具体牵制可以承担。用互震木冬相，受坎水所生，反复交代同一做法还需投入，宜及早换到有凭据的说法。',
  '初六“习坎，入于坎窞，凶”，警戒在有问题的路上反复用力。变用兑金冬休，仍生旺坎，末后能帮助改正一些问题。爻辞对当前做法的警戒较重，末助用在改答较合适，本轮仍偏难通过。',
  '这轮有较好的推进条件。巽木体冬令属相，坎水用当旺而生体，开头的支持较实，也有能力把经历说到可核。',
  '体互兑金来克体，细节处可能有需要解释的地方；金冬休，牵制有限。用互离火受体木所生，冬令属死，相关耗费较轻。把经历和做法说明白，有助于把沟通接下去。',
  '冬乾体用皆休而比和，沟通可以照旧展开，推动更改要多费周折。',
  '初九以潜龙勿用劝早段蓄力。变巽冬相，为休乾所克而难速制。比较里仍有待兑现的部分，选现职并暂缓辞职更稳。',
  '本轮偏难通过，眼下有余力修正而无需反复沿原路解释。收尾集中补真正需要纠正的一项。',
];

const chars = (s: string) => [...s.replace(/[，。；、！？\s]/g, '')].sort().join('');

describe('详断, plain first', () => {
  it('puts the plain words first and the terms after, keeping every word', () => {
    const out = SAMPLES.map((s) => plainFirst(s));
    for (const [i, o] of out.entries()) {
      // Nothing lost or added (punctuation aside).
      expect(chars(o.plain + o.basis)).toBe(chars(SAMPLES[i]));
    }
    expect(out[0]).toEqual({ plain: '开头有足够的应答基础，能从完整的经历说起。', basis: '冬令坎水体和坎水用皆旺，比和。' });
    expect(out[2].plain).toBe('警戒在有问题的路上反复用力。末后能帮助改正一些问题。爻辞对当前做法的警戒较重，末助用在改答较合适，本轮仍偏难通过。');
    // A line's quoted text is never cut at its own commas.
    expect(out[2].basis).toBe('初六“习坎，入于坎窞，凶”。变用兑金冬休，仍生旺坎。');
    expect(out[5]).toEqual({ plain: '沟通可以照旧展开，推动更改要多费周折。', basis: '冬乾体用皆休而比和。' });
    // All plain: as written.
    expect(out[7]).toEqual({ plain: SAMPLES[7], basis: '' });
    // After other terms, a clause that leans on them keeps its sentence whole.
    const leaning = plainFirst('冬乾体用皆休，而沟通可以照旧展开。末段仍要花力气。');
    expect(leaning).toEqual({ plain: '冬乾体用皆休，而沟通可以照旧展开。末段仍要花力气。', basis: '' });
  });

  it('结局: the outcome first, the moving line and its reading whole in the basis', () => {
    const text = '上六“系用徽纆，置于丛棘，三岁不得，凶”，取持续沿用原法会被同一难点牵住。末段仍要花力气。缺少直接接应解开反复纠缠的要求，本轮偏难通过。变用巽木冬相，受旺坎所生。原体有余力作答。';
    const out = plainFirst(text, { verdictFirst: true });
    expect(out.plain).toBe('本轮偏难通过。末段仍要花力气。缺少直接接应解开反复纠缠的要求。');
    expect(out.basis).toBe('上六“系用徽纆，置于丛棘，三岁不得，凶”，取持续沿用原法会被同一难点牵住。变用巽木冬相，受旺坎所生。原体有余力作答。');
    expect(chars(out.plain + out.basis)).toBe(chars(text));
    // Where the outcome already leads, nothing moves.
    expect(plainFirst('本轮仍偏难通过。末段仍要花力气。', { verdictFirst: true }).plain).toBe('本轮仍偏难通过。末段仍要花力气。');
  });
});
