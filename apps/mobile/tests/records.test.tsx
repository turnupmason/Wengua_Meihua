import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { freezeCast } from '../src/domain/cast';
import { createJournal } from '../src/domain/journal';
import { sameMatterCandidate } from '../src/domain/sameMatter';
import { STRINGS } from '../src/domain/i18n';
import { RecordDetail } from '../src/ui/RecordDetail';
import { HexagramPage } from '../src/ui/HexagramPage';
import { LibraryScreen } from '../src/ui/LibraryScreen';
import { Verdict } from '../src/ui/Verdict';
import { memoryStore, testKnowledge } from './helpers';

afterEach(cleanup);

const cast = async (question: string, extra: Record<string, unknown> = {}, at = new Date()) => {
  const { library } = await testKnowledge();
  return freezeCast(library, { method: 'manual', manual: { primaryId: 34, movingLine: 1 }, instant: at, timeZone: 'UTC', question, domainId: 'domain-09', topicId: 'career', ...extra }, { now: at });
};

describe('frozen reading', () => {
  it('saves the reading as given, with versions and evidence ids', async () => {
    const r = await cast('这份工作能拿到吗？');
    expect(r.snapshot?.headline).toBe('先难后易');
    expect(r.snapshot?.conclusion).toBe('前期阻力较大，后续有缓和机会，但目前不足以断定一定能拿到这份工作。');
    expect(r.snapshot?.stages.map((s) => s.scope)).toEqual(['当前', '过程', '后势']);
    expect(r.snapshot?.ruleId).toMatch(/^use-mutual-changed-v/);
    expect(r.snapshot?.evidence).toContain('line:34:1');
    expect(r.eventId).toBeTruthy();
    expect(Object.isFrozen(r.snapshot)).toBe(true);
  });

  it('shows the frozen conclusion even if the rules would now say something else', async () => {
    const { library } = await testKnowledge();
    const r = await cast('这份工作能拿到吗？');
    const tampered = { ...r.snapshot!, conclusion: '（当时的结论）' };
    render(<Verdict reading={library.createReading({ primaryId: 34, movingLine: 1, domainId: 'domain-09' })} t={STRINGS.zh} lang="zh" onStage={() => {}} question={r.question} topicId="career" snapshot={tampered} />);
    expect(screen.getByText('（当时的结论）')).toBeTruthy();
  });

  it('keeps 问事录 in order: asked → cast → reading then → notes added later', async () => {
    const r = await cast('这份工作能拿到吗？');
    const journal = createJournal(memoryStore());
    render(<RecordDetail record={r} journal={journal} t={STRINGS.zh} onOpen={() => {}} onBack={() => {}} onChanged={() => {}} />);
    const heads = [...document.querySelectorAll('.rd-step h3')].map((h) => h.textContent);
    expect(heads.map((h) => h?.replace(/^\d/, '').replace(/原样.*$/, ''))).toEqual(['当时所问', '当时卦象', '当时解读', '后来进展']);
    fireEvent.change(screen.getByPlaceholderText(STRINGS.zh.bookNotePlaceholder), { target: { value: '面试安排在下周三。' } });
    fireEvent.click(screen.getByRole('button', { name: '追加进展' }));
    expect(screen.getByText('面试安排在下周三。')).toBeTruthy();
    // The note is separate from the frozen reading.
    expect(r.snapshot?.conclusion).not.toContain('面试');
  });
});

describe('same matter', () => {
  it('is decided by the fixed question and seven days, never by comparing wording', async () => {
    const now = new Date('2026-11-11T10:00:00Z');
    const a = await cast('这次面试能通过吗？', { questionId: 'career.job_interview.pass' }, new Date('2026-11-09T10:00:00Z'));
    const old = await cast('这次面试能通过吗？', { questionId: 'career.job_interview.pass' }, new Date('2026-10-01T10:00:00Z'));
    const legacy = await cast('这次面试能通过吗？', {}, new Date('2026-11-10T10:00:00Z'));
    expect(sameMatterCandidate([legacy, a, old], 'career.job_interview.pass', now)?.castId).toBe(a.castId);
    expect(sameMatterCandidate([old], 'career.job_interview.pass', now)).toBeNull(); // older than 7 days
    expect(sameMatterCandidate([a], 'career.exam.pass', now)).toBeNull(); // another question
    // An older free-written record with the same words is never matched to a fixed question.
    expect(sameMatterCandidate([legacy], 'career.job_interview.pass', now)).toBeNull();
    expect(sameMatterCandidate([a], null, now)).toBeNull();
  });
});

describe('藏经阁', () => {
  it('lists two to a row with figure, trigrams and grade, and searches the text', async () => {
    const knowledge = await testKnowledge();
    render(<LibraryScreen knowledge={knowledge} t={STRINGS.zh} lang="zh" onBack={() => {}} />);
    expect(document.querySelector('.hex-grid.two')).toBeTruthy();
    expect(screen.getAllByText(/乾天上 · 乾天下/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '眇能视' } });
    expect(screen.getByText('雷泽归妹')).toBeTruthy();
  });

  it('opens a hexagram page with its lines, marks the line used by the reading, and links each change', async () => {
    const knowledge = await testKnowledge();
    let went: number | null = null;
    render(<HexagramPage knowledge={knowledge} target={{ hexagramId: 34, line: 1, context: '本次问事：本卦雷天大壮，初九动' }} t={STRINGS.zh} lang="zh" onNavigate={(x) => (went = x.hexagramId)} onBack={() => {}} />);
    expect(screen.getByText('本次问事：本卦雷天大壮，初九动')).toBeTruthy();
    expect(document.querySelectorAll('.hex-lines li').length).toBeGreaterThanOrEqual(6);
    expect(document.querySelector('.hex-lines li.is-target')?.textContent).toMatch(/初九/);
    fireEvent.click(screen.getAllByRole('button', { name: /此爻变 → / })[0]);
    expect(went).toBe(knowledge.library.getChangedHexagram(34, 1).id);
  });
});
