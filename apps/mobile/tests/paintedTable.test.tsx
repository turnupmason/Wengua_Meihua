import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PaintedTable } from '../src/ui/PaintedTable';
import { STRINGS } from '../src/domain/i18n';
import { primaryRelation } from '../src/domain/relation';
import type { LinePick } from '../src/scene/StoneTable';
import type { StageKey } from '../src/domain/layout';
import { testKnowledge } from './helpers';

afterEach(cleanup);

const clock = { current: { phase: 'reading', t: 0, elapsed: 0 } } as never;

describe('the painted stone table', () => {
  it('carves everything the 3D table carried, in the slab of the user’s picture', async () => {
    const { library } = await testKnowledge();
    // 水山蹇, 九五 moving.
    const reading = library.createReading({ primaryId: 39, movingLine: 5, domainId: 'domain-09' });
    const picks: LinePick[] = [];
    const stages: StageKey[] = [];
    render(
      <PaintedTable
        reading={reading}
        relation={primaryRelation(reading)}
        phase="reading"
        clock={clock}
        reduced={false}
        t={STRINGS.zh}
        lang="zh"
        selection={null}
        castTime="丙午年十月初五 子时 起卦"
        onPick={(p) => picks.push(p)}
        onOpenStage={(s) => stages.push(s)}
        onOpenRelation={() => {}}
        onMiss={() => {}}
      />,
    );
    // The picture is the table plate; the writing lies on one perspective-mapped face.
    expect((document.querySelector('.ptab-plate') as HTMLElement).style.backgroundImage).toMatch(/plate-table\.webp/);
    // Three frames, three hexagrams of six grooves, the moving line in cinnabar with its mark.
    expect([...document.querySelectorAll('.ptab-tablet')].map((x) => x.textContent)).toEqual(['目前', '经过', '结果']);
    expect(document.querySelectorAll('.ptab-line')).toHaveLength(18);
    const moving = document.querySelectorAll('.ptab-line.is-moving');
    expect(moving).toHaveLength(1);
    expect(moving[0].getAttribute('aria-label')).toBe(`本卦 ${reading.stages.primary.name} 九五`);
    expect(document.querySelector('.ptab-mark')?.textContent).toBe('○');
    // Names with their stage, grades, 体 / 用, the relation and the cast time.
    for (const s of ['primary', 'mutual', 'changed'] as const) expect(screen.getByRole('button', { name: `${STRINGS.zh[`stage_${s}`]} ${reading.stages[s].name}` })).toBeTruthy();
    expect(document.querySelectorAll('.ptab-grade')).toHaveLength(3);
    expect([...document.querySelectorAll('.ptab-role-word')].map((x) => x.textContent).sort()).toEqual(['体', '用']);
    expect(document.querySelector('.ptab-relation')?.textContent).toMatch(/丙午年十月初五 子时 起卦/);
    // A line answers with its own place; a name opens its stage.
    fireEvent.click(moving[0]);
    expect(picks[0]).toMatchObject({ stage: 'primary', hexagramId: reading.stages.primary.id, linePosition: 5 });
    fireEvent.click(screen.getByRole('button', { name: `本卦 ${reading.stages.primary.name}` }));
    expect(stages).toEqual(['primary']);
  });
});
