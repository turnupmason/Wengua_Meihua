import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DetailSheet } from '../src/ui/DetailSheet';
import { STRINGS } from '../src/domain/i18n';
import type { Selection } from '../src/scene/StoneTable';
import type { Knowledge, DetailsRepository } from '../src/knowledge/knowledge';
import { testKnowledge } from './helpers';
import { useState } from 'react';

const t = STRINGS.zh;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(cleanup);

/** Wraps the real details repository so each line resolves after its own delay. */
function delayedDetails(details: DetailsRepository, delayFor: (id: number, pos: number) => number, fail?: (id: number, pos: number) => Error | null): DetailsRepository {
  return {
    ...details,
    async getLine(id, pos) {
      await sleep(delayFor(id, pos));
      const err = fail?.(id, pos);
      if (err) throw err;
      return details.getLine(id, pos);
    },
  };
}

function Harness({ knowledge, initial, primaryMoving }: { knowledge: Knowledge; initial: Selection; primaryMoving?: number }) {
  const [sel, setSel] = useState<Selection>(initial);
  const reading = primaryMoving ? knowledge.library.createReading({ primaryId: initial.hexagramId, movingLine: primaryMoving }) : null;
  return <DetailSheet knowledge={knowledge} selection={sel} reading={reading} record={null} t={t} lang="zh" onSelect={setSel} onClose={() => {}} />;
}

const facts = () => document.querySelector('.facts')?.textContent ?? '';

describe('DetailSheet interaction', () => {
  it('rapid taps on six lines end on the last tapped line, even if older responses arrive later', async () => {
    const k = await testKnowledge();
    // Higher lines respond slower: tapping 上 → 初 makes the 上九 response arrive last.
    const knowledge = { ...k, details: delayedDetails(k.details, (_id, pos) => pos * 15) };
    render(<Harness knowledge={knowledge} initial={{ stage: 'primary', hexagramId: 55, linePosition: 6 }} primaryMoving={1} />);
    for (const label of ['上六', '六五', '九四', '九三', '六二', '初九']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
    }
    await act(() => sleep(200));
    expect(document.querySelector('.sheet-body h3')?.textContent).toContain('初九');
    expect(facts()).toContain('初九');
    expect(facts()).toContain('62 雷山小过');
    expect(document.body.textContent).toContain('遇其配主，虽旬无咎，往有尚。');
    // The cast's moving line keeps its badge while browsing.
    expect(screen.getByRole('button', { name: /初九 · 本次动爻/ })).toBeTruthy();
  });

  it('兑九四 and 九五 panels never mix', async () => {
    const k = await testKnowledge();
    const knowledge = { ...k, details: delayedDetails(k.details, (_id, pos) => (pos === 4 ? 60 : 5)) };
    render(<Harness knowledge={knowledge} initial={{ stage: 'library', hexagramId: 58, linePosition: 4 }} />);
    fireEvent.click(screen.getByRole('button', { name: /^九五/ }));
    await act(() => sleep(120));
    expect(facts()).toContain('九五');
    expect(facts()).toContain('54 雷泽归妹');
    expect(facts()).not.toContain('60');
    expect(document.body.textContent).not.toContain('商兑');
  });

  it('keeps the base scripture when a details file fails, and offers retry', async () => {
    const k = await testKnowledge();
    let failing = true;
    const knowledge = { ...k, details: delayedDetails(k.details, () => 1, () => (failing ? new Error('offline') : null)) };
    render(<Harness knowledge={knowledge} initial={{ stage: 'library', hexagramId: 3, linePosition: 2 }} />);
    await act(() => sleep(30));
    expect(document.body.textContent).toContain('屯如邅如');
    expect(document.body.textContent).toContain(t.detailsUnavailable);
    failing = false;
    fireEvent.click(screen.getByRole('button', { name: t.retry }));
    await act(() => sleep(30));
    expect(facts()).toContain('六二');
  });

  it('reports a content-version mismatch explicitly instead of mixing versions', async () => {
    const k = await testKnowledge();
    const knowledge = { ...k, details: delayedDetails(k.details, () => 1, () => new Error('Content version mismatch: data/details/14.json')) };
    render(<Harness knowledge={knowledge} initial={{ stage: 'library', hexagramId: 14, linePosition: 1 }} />);
    await act(() => sleep(30));
    expect(document.body.textContent).toContain(t.versionMismatch);
  });

  it('姤 shows 中卦 in the sheet header', async () => {
    const k = await testKnowledge();
    render(<Harness knowledge={k} initial={{ stage: 'mutual', hexagramId: 44, linePosition: null }} />);
    await act(() => sleep(20));
    expect(document.querySelector('.sheet-grade')?.textContent).toContain('中卦');
    expect(document.querySelector('.sheet-grade')?.textContent).not.toContain('上上');
  });
});
