import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Verdict } from '../src/ui/Verdict';
import { ReadingView } from '../src/ui/ReadingView';
import { createJournal } from '../src/domain/journal';
import { STRINGS } from '../src/domain/i18n';
import { memoryStore, testKnowledge } from './helpers';

afterEach(cleanup);

describe('conclusion first', () => {
  it('shows the 用→互→变 verdict for 雷天大壮 初爻 and opens a stage on tap', async () => {
    const { library } = await testKnowledge();
    const reading = library.createReading({ primaryId: 34, movingLine: 1 });
    const onStage = vi.fn();
    render(<Verdict reading={reading} t={STRINGS.zh} lang="zh" onStage={onStage} />);
    expect(screen.getByRole('heading', { name: '先难后易' })).toBeTruthy();
    expect(screen.getByText('以不顺为主')).toBeTruthy();
    // The card answers directly; the stage summary lives in 读卦.
    expect(screen.getByText(/前期阻力较大，后续有缓和机会，但目前不足以断定一定能/)).toBeTruthy();
    // Not the old single-line verdict.
    expect(screen.queryByText(/主不顺/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /结果 变比和/ }));
    expect(onStage).toHaveBeenCalledWith('changed');
  });

  it('天时: no 体用, but a full 全观诸卦 conclusion, stages and reading view', async () => {
    const { library } = await testKnowledge();
    const reading = library.createReading({ primaryId: 54, movingLine: 2, domainId: 'domain-01' });
    const onStage = vi.fn();
    render(<Verdict reading={reading} t={STRINGS.zh} lang="zh" onStage={onStage} />);
    expect(screen.getByRole('heading', { name: '雷动' })).toBeTruthy();
    expect(screen.getByText(/震三、兑一/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /经过 水 · 火/ }));
    expect(onStage).toHaveBeenCalledWith('mutual');
    cleanup();
    render(<ReadingView reading={reading} question="" castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} judgment={{ state: 'legacy' }} onUnlock={() => {}} hexagramName={(id) => library.getHexagram(id).name} lineName={(id, l) => library.getHexagram(id).lines[l - 1].label} onClose={() => {}} />);
    expect(document.querySelectorAll('.read-stage g.yao[role="button"]')).toHaveLength(18);
    expect(screen.getByText(STRINGS.zh.weatherRule)).toBeTruthy();
    expect(screen.getByText(/^凡占天时，不分体用，全观诸卦/)).toBeTruthy();
    expect(screen.getAllByText(/震雷/).length).toBeGreaterThan(0);
  });

  it('reading view gives the basis and every line is tappable', async () => {
    const { library } = await testKnowledge();
    const reading = library.createReading({ primaryId: 34, movingLine: 1 });
    const onPick = vi.fn();
    render(
      <ReadingView reading={reading} question="这份工作能拿到吗" castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={onPick} onSave={() => {}} judgment={{ state: 'legacy' }} onUnlock={() => {}} hexagramName={(id) => library.getHexagram(id).name} lineName={(id, l) => library.getHexagram(id).lines[l - 1].label} onClose={() => {}} />,
    );
    expect(screen.getByText('“这份工作能拿到吗”')).toBeTruthy();
    expect(screen.getByText(/初九动，动在下卦，下卦乾金为用；另一卦震木为体/)).toBeTruthy();
    expect(screen.getByText(/与体同侧的兑金为体互/)).toBeTruthy();
    expect(screen.getByText(/用卦乾金变为巽木；体卦震木不变/)).toBeTruthy();
    const lines = document.querySelectorAll('.read-stage g.yao[role="button"]');
    expect(lines).toHaveLength(18);
    fireEvent.click(lines[0]);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ stage: 'primary', hexagramId: 34 }));
  });
});

describe('卦册', () => {
  it('keeps a cast with dated notes and forgets it on remove', () => {
    let n = 0;
    const j = createJournal(memoryStore(), () => new Date(Date.UTC(2026, 10, 11, 9, n++)));
    expect(j.has('c1')).toBe(false);
    j.save('c1');
    j.save('c1', '  面试安排在下周三。 ');
    j.save('c1', '');
    const e = j.get('c1')!;
    expect(e.savedAt).toBe('2026-11-11T09:00:00.000Z');
    expect(e.notes.map((x) => x.text)).toEqual(['面试安排在下周三。']);
    j.remove('c1');
    expect(j.get('c1')).toBeNull();
  });

  it('survives corrupt storage', () => {
    const store = memoryStore();
    store.setItem('wengua.journal.v1', '{oops');
    expect(createJournal(store).all()).toEqual({});
  });
});

describe('home defaults', () => {
  it('starts on 人事, not 天时, so a plain question is not read as weather', async () => {
    const { EMPTY_FORM } = await import('../src/ui/HomeOverlay');
    expect(EMPTY_FORM.domainId).toBe('domain-02');
  });
});

describe('专业依据 relation layer', () => {
  it('maps 目前/经过/后势 to the judgment, names what each link opens, and links the classical source', async () => {
    const { library } = await testKnowledge();
    const reading = library.createReading({ primaryId: 55, movingLine: 3, domainId: 'domain-04' });
    const opened: string[] = [];
    render(
      <ReadingView reading={reading} question="这次搬家合适吗？" castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} judgment={{ state: 'legacy' }} onUnlock={() => {}} hexagramName={(id) => library.getHexagram(id).name} lineName={(id, l) => library.getHexagram(id).lines[l - 1].label} onClose={() => {}} onOpenBook={() => {}} onOpenSection={(title) => opened.push(title)} />,
    );
    expect(screen.getByText('从卦象证据直接对应断语')).toBeTruthy();
    expect(screen.getByText('互克兼比')).toBeTruthy();
    expect(screen.getByText('前期耗费，中间有牵制也有配合，末后出现比和之象。')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '查看《雷火丰·九三》原文' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '查看《泽风大过》原文' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /屋舍占第四/ }));
    expect(opened).toEqual(['屋舍占第四']);
  });
});
