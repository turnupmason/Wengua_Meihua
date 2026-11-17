/** 卦笺 and 研习与校订: the reading on 宣纸, its three layers kept apart, and where it all comes from. */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GuaJian } from '../src/ui/GuaJian';
import { StudyPage } from '../src/ui/StudyPage';
import { STRINGS } from '../src/domain/i18n';
import { questionById } from '../src/domain/questionCatalog';
import { judgmentFor, type ProductJudgment } from '../src/domain/judgment';
import { testKnowledge } from './helpers';

afterEach(cleanup);
const t = STRINGS.zh;

describe('卦笺', () => {
  it('answers first (简断), then 详断 and 应期; the 依据 folded, classic, plain words and working apart', async () => {
    const knowledge = await testKnowledge();
    const j = (await judgmentFor(knowledge.product, questionById('career.interview')!, { questionId: 'career.interview', primaryId: 48, movingLine: 5, method: 'classical-time', monthBranch: '亥', dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' })) as ProductJudgment;
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5 });
    render(
      <GuaJian reading={reading} judgment={{ state: 'ready', judgment: j, full: true }} question="求职录用" field="事业工作" asks="这次面试能通过吗？" castTime="丙午年十月初六 未时 起卦" t={t} lang="zh" saved={false} sectionTitle={() => null} onSave={() => {}} onUnlock={() => {}} onClose={() => {}} onStudy={() => {}} />,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('这次面试能通过吗？');
    expect(document.querySelector('.jian-field')?.textContent).toBe('事业工作 / 求职录用');
    expect(document.querySelector('.jian-brief h2')?.textContent).toBe(j.title);
    expect([...document.querySelectorAll('.jian-part h3')].map((h) => h.textContent)).toEqual(['开局', '过程', '结局', '总断']);
    // 依据 folded until asked for, then in its separate parts.
    expect(document.querySelector('.jian-basis-body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.jianBasisTitle) }));
    const heads = [...document.querySelectorAll('.jian-source h4')].map((h) => h.textContent);
    expect(heads).toEqual(expect.arrayContaining([t.jianStages, t.jianClassic, t.jianVernacular, t.jianWorking]));
    // The 校订 line and the way to 研习与校订.
    expect(document.querySelector('.jian-version')?.textContent).toBe('专家审定 · 依《梅花易数》体用之法');
    expect(screen.getByRole('button', { name: t.jianWhy })).toBeTruthy();
  });

  it('opened from a stage on the stone: the 依据 open at that stage', async () => {
    const knowledge = await testKnowledge();
    const j = (await judgmentFor(knowledge.product, questionById('career.interview')!, { questionId: 'career.interview', primaryId: 48, movingLine: 5, method: 'classical-time', monthBranch: '亥', dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' })) as ProductJudgment;
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5 });
    render(<GuaJian reading={reading} judgment={{ state: 'ready', judgment: j, full: true }} question="求职录用" field="事业工作" asks={null} castTime="" t={t} lang="zh" saved={false} sectionTitle={() => null} onSave={() => {}} onUnlock={() => {}} onClose={() => {}} focus="mutual" />);
    expect(document.querySelector('.jian-basis-body')).toBeTruthy();
    expect(document.querySelector('.jian-stage.is-focus b')?.textContent).toBe(t.verdictStage.mutual);
  });

  it('as the reading itself: the words at once, the three float up, 体用 with trigram and element, an arrow and 动爻 at the moving line', async () => {
    const knowledge = await testKnowledge();
    const j = (await judgmentFor(knowledge.product, questionById('career.interview')!, { questionId: 'career.interview', primaryId: 48, movingLine: 5, method: 'classical-time', monthBranch: '亥', dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' })) as ProductJudgment;
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5 });
    const props = { reading, judgment: { state: 'ready' as const, judgment: j, full: true }, question: '求职录用', field: '事业工作', asks: null, castTime: '', t, lang: 'zh' as const, saved: false, sectionTitle: () => null, onSave: () => {}, onUnlock: () => {}, onClose: () => {}, closeLabel: t.finish };
    const { rerender } = render(<GuaJian {...props} writing={{ reduced: false }} />);
    // Side by side, floating up; the 简断 is there at once.
    expect(document.querySelectorAll('.jian-guas .jian-gua')).toHaveLength(3);
    expect(document.querySelector('.jian-page.is-unveiling')).toBeTruthy();
    expect(document.querySelector('.jian-brief h2')?.textContent).toBe(j.title);
    // 水风井 九五 moves: 用 is the upper 坎水, 体 the lower 巽木, drawn in the figure; an arrow and 动爻 at the moving line.
    expect([...document.querySelectorAll('.gua-role text')].map((x) => x.textContent)).toEqual(['用', '坎水', '体', '巽木']);
    expect(document.querySelector('.gua-moving text')?.textContent).toBe('动爻');
    // 体用 in full: trigram, element, 旺衰 in 亥月, the relation.
    expect(document.querySelector('.jian-tiyong')?.textContent).toContain('体 巽木（相） · 用 坎水（旺） · 用生体');
    expect(document.querySelectorAll('.jian-yao.is-moving')).toHaveLength(1);
    // Shown: everything shows, and the main button ends the reading.
    rerender(<GuaJian {...props} writing={null} />);
    expect(document.querySelector('.jian-page.is-unveiling')).toBeNull();
    expect(document.querySelector('.jian-brief h2')?.textContent).toBe(j.title);
    expect(screen.getByRole('button', { name: t.finish })).toBeTruthy();
  });

  it('a cast with no written 断语 says why where the 简断 would be', async () => {
    const knowledge = await testKnowledge();
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5 });
    render(<GuaJian reading={reading} judgment={{ state: 'missing', reason: 'pending-authoring' }} pending={{ title: t.scriptPending, text: t.scriptPendingText }} question="求职录用" field="事业工作" asks={null} castTime="" t={t} lang="zh" saved={false} sectionTitle={() => null} onSave={() => {}} onUnlock={() => {}} onClose={() => {}} />);
    expect(document.querySelector('.jian-brief h2')?.textContent).toBe(t.scriptPending);
    expect(document.querySelector('.jian-version')).toBeNull();
  });
});

describe('研习与校订', () => {
  it('three chapters and a note: one fixed case worked out, then one 本卦 read three ways and why', async () => {
    const knowledge = await testKnowledge();
    render(<StudyPage knowledge={knowledge} t={t} onClose={() => {}} />);
    expect(document.querySelector('.study-bar-title')?.textContent).toBe('研习与校订');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('古籍为本，推演有据');
    expect([...document.querySelectorAll('.study-chapter h2')].map((h) => h.textContent)).toEqual([t.studyCh1Title, t.studyCh2Title, t.studyCh3Title, t.studyCh4Title]);
    expect(document.querySelectorAll('.study-steps li')).toHaveLength(2);
    // Not this very hour: the fixed case, 丙午年十月初五午时 → 水风井 九五 (the chart 第三章 varies).
    expect(document.querySelector('.study-steps')?.textContent).toContain('十月 初五 午时');
    expect(document.querySelector('.study-guas figcaption b')?.textContent).toBe('水风井');
    expect(document.querySelector('.study-tiyong')?.textContent).toBe('体 巽木（相） · 用 坎水（旺） · 用生体');
    expect(document.querySelectorAll('.study-guas .jian-gua')).toHaveLength(3);
    const words = await screen.findAllByText((_, el) => !!el?.matches('.study-case-word') && el.textContent !== '…');
    expect(new Set(words.map((x) => x.textContent)).size).toBe(3);
    // Why they differ: the moving line swaps 体用; another month, another strength.
    const why = [...document.querySelectorAll('.study-case-why span')].map((x) => x.textContent);
    expect(why[0]).toBe('体 巽木（相） · 用 坎水（旺） · 用生体');
    expect(why[1]).toContain('体 坎水');
    expect(why[2]).toBe('体 巽木（休） · 用 坎水（囚） · 用生体');
    expect(document.body.textContent).toContain('同卦不同断，皆有其据。');
    expect(document.body.textContent).not.toMatch(/384|专家审定|固定存储/);
    expect(document.body.textContent).toContain('不等于对未来的保证');
  });

  it('from a 卦笺: that very cast', () => {
    return testKnowledge().then((knowledge) => {
      const reading = knowledge.library.createReading({ primaryId: 1, movingLine: 3 });
      render(<StudyPage knowledge={knowledge} t={t} onClose={() => {}} example={{ reading, calendar: null, monthBranch: '午' }} />);
      expect([...document.querySelectorAll('.study-chapter h2')][1].textContent).toBe(t.studyCh2Own);
      expect(document.body.textContent).toContain(t.studyOtherMethod);
      expect(document.querySelector('.study-guas figcaption b')?.textContent).toBe(reading.stages.primary.name);
    });
  });

  it('says an even division by eight the classical way', () => {
    expect(t.studyTrigramsLine(24, 8, '坤', 25, 1, '乾', 1)).toBe('年月日之和 24，除八无余，作 8，为上卦坤；加时为 25，除八余 1，为下卦乾；除六余 1，第 1 爻动。');
  });
});
