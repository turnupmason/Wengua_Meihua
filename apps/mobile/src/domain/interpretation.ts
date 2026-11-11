/**
 * Pluggable interpretation layer. Version 1 ships only the local provider, which arranges
 * existing source texts and computed facts — no model, no network.
 *
 * A future model-backed provider must run behind a server (API keys never ship in the app),
 * receive only the structured reading plus selected source passages, and return text with
 * citation ids. `guardInterpretation` rejects any output that tries to restate fixed facts
 * differently or cites passages that were not supplied.
 */
import type { Reading } from '../knowledge/knowledge';

export interface InterpretationInput {
  castId: string | null;
  primaryId: number;
  movingLine: number;
  stages: { stage: string; id: number; name: string; baseGrade: string }[];
  body: { trigram: string; element: string };
  use: { trigram: string; element: string };
  relations: { targetRole: string; label: string }[];
  domain: { id: string; title: string };
  /** Only these passages may be cited. */
  passages: { id: string; text: string }[];
}

export interface InterpretationOutput {
  provider: string;
  summary: string;
  stageNotes: { stage: string; text: string }[];
  citations: string[];
  /** Fields a provider may echo; if present they must equal the input. */
  echoedFacts?: Partial<{ primaryId: number; movingLine: number; grades: string[]; body: string }>;
}

export interface InterpretationProvider {
  readonly id: string;
  interpret(input: InterpretationInput, signal?: AbortSignal): Promise<InterpretationOutput>;
}

export function buildInterpretationInput(reading: Reading): InterpretationInput {
  const passages: { id: string; text: string }[] = [
    { id: `line:${reading.primaryId}:${reading.movingLine}`, text: reading.selectedMovingLine.text },
  ];
  if (reading.domainPassage) passages.push({ id: `domain:${reading.domain.id}:${reading.domainPassage.sectionId}`, text: reading.domainPassage.quote });
  return {
    castId: reading.castId,
    primaryId: reading.primaryId,
    movingLine: reading.movingLine,
    stages: (['primary', 'mutual', 'changed'] as const).map((s) => ({ stage: s, id: reading.stages[s].id, name: reading.stages[s].name, baseGrade: reading.stages[s].baseGrade })),
    body: { trigram: reading.body.trigram, element: reading.body.element },
    use: { trigram: reading.use.trigram, element: reading.use.element },
    relations: reading.edges.map((e) => ({ targetRole: e.targetRole, label: e.label })),
    domain: { id: reading.domain.id, title: reading.domain.title },
    passages,
  };
}

export function guardInterpretation(input: InterpretationInput, output: InterpretationOutput): InterpretationOutput {
  const allowed = new Set(input.passages.map((p) => p.id));
  const bad = output.citations.filter((c) => !allowed.has(c));
  if (bad.length) throw new Error(`Interpretation cites unknown passages: ${bad.join(', ')}`);
  const e = output.echoedFacts;
  if (e) {
    if (e.primaryId !== undefined && e.primaryId !== input.primaryId) throw new Error('Interpretation changed the primary hexagram');
    if (e.movingLine !== undefined && e.movingLine !== input.movingLine) throw new Error('Interpretation changed the moving line');
    if (e.grades && e.grades.join() !== input.stages.map((s) => s.baseGrade).join()) throw new Error('Interpretation changed fixed grades');
    if (e.body !== undefined && e.body !== input.body.trigram) throw new Error('Interpretation changed body/use');
  }
  return output;
}

/** Local, deterministic provider: arranges what the sources and engine already say. */
export const localInterpretationProvider: InterpretationProvider = {
  id: 'local-sources-v1',
  async interpret(input) {
    const [p, m, c] = input.stages;
    const rel = input.relations.find((r) => r.targetRole === 'use');
    return {
      provider: this.id,
      summary: `${p.name}（${p.baseGrade}）→ ${m.name}（${m.baseGrade}）→ ${c.name}（${c.baseGrade}）；体${input.body.trigram}${input.body.element}，用${input.use.trigram}${input.use.element}，${rel?.label ?? ''}。`,
      stageNotes: input.stages.map((s) => ({ stage: s.stage, text: `${s.name} · ${s.baseGrade}` })),
      citations: input.passages.map((x) => x.id),
    };
  },
};

/** Runs a provider and falls back to the local one on any failure; the main flow never breaks. */
export async function interpretSafely(provider: InterpretationProvider, input: InterpretationInput, signal?: AbortSignal): Promise<InterpretationOutput> {
  try {
    return guardInterpretation(input, await provider.interpret(input, signal));
  } catch {
    return localInterpretationProvider.interpret(input);
  }
}
