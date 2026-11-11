import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TOPICS, topicById } from '../src/domain/topics';
import { effectivePace } from '../src/domain/settings';
import { freezeCast } from '../src/domain/cast';
import { STRINGS } from '../src/domain/i18n';
import { Verdict, answerText } from '../src/ui/Verdict';
import { testKnowledge } from './helpers';

afterEach(cleanup);

describe('six 问事 domains', () => {
  it('are the six domains of the catalog; older record ids still resolve', () => {
    expect(TOPICS.map((x) => x.zh)).toEqual(['事业工作', '财富财运', '感情姻缘', '健康疾病', '家庭家宅', '寻人失物']);
    expect(topicById('family')?.id).toBe('home');
    expect(topicById('seek')?.id).toBe('search');
    expect(topicById('health')?.caution?.zh).toMatch(/不是医疗诊断/);
    expect(topicById('love')?.caution?.zh).toMatch(/他人心意/);
  });

  it('keeps the domain on the frozen cast', async () => {
    const { library } = await testKnowledge();
    const rec = freezeCast(library, { method: 'manual', manual: { primaryId: 34, movingLine: 1 }, instant: new Date(), timeZone: 'UTC', question: '这份工作能拿到吗？', domainId: 'domain-09', topicId: 'career' });
    expect(rec.topicId).toBe('career');
    expect(rec.domainId).toBe('domain-09');
  });
});

describe('answer first', () => {
  it('answers the asked question with the category’s own sentence, then the end', async () => {
    const { library } = await testKnowledge();
    const r = library.createReading({ primaryId: 34, movingLine: 1, domainId: 'domain-09' });
    expect(answerText(r, '这份工作能拿到吗？', STRINGS.zh, 'zh')).toBe('就“这份工作能拿到吗？”而言：《求名占》说「用克体，名不可成」；结局转顺，末后或有转机。');
    render(<Verdict reading={r} t={STRINGS.zh} lang="zh" onStage={() => {}} question="这份工作能拿到吗？" topicId="career" />);
    // The card answers the question in one sentence; the classical quote is in 读卦.
    expect(screen.getByText('前期阻力较大，后续有缓和机会，但目前不足以断定一定能拿到这份工作。')).toBeTruthy();
    expect(screen.getByText('这份工作能拿到吗？')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '先难后易' })).toBeTruthy();
  });

  it('shows the health caution with the answer', async () => {
    const { library } = await testKnowledge();
    const r = library.createReading({ primaryId: 34, movingLine: 1, domainId: 'domain-16' });
    render(<Verdict reading={r} t={STRINGS.zh} lang="zh" onStage={() => {}} question="这次的病能好转吗？" topicId="health" />);
    expect(screen.getByText(/不是医疗诊断/)).toBeTruthy();
  });
});

describe('pace', () => {
  it('runs the full ritual first, then quick, unless the visitor chooses', () => {
    expect(effectivePace('auto', false)).toBe('full');
    expect(effectivePace('auto', true)).toBe('quick');
    expect(effectivePace('full', true)).toBe('full');
    expect(effectivePace('quick', false)).toBe('quick');
  });
});
