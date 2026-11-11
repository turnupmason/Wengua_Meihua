import type { Reading, RelationType } from '../knowledge/knowledge';

export type RelationKind = 'controls' | 'generates' | 'equal';

export interface RelationView {
  type: RelationType;
  label: string;
  phrase: string;
  kind: RelationKind;
  /** Real direction from the engine edge (from → to). */
  direction: 'body-to-use' | 'use-to-body' | 'none';
  /** Same direction on screen (the upper trigram is drawn above the lower one). */
  screen: 'up' | 'down' | 'none';
  bodySide: 'upper' | 'lower';
  useSide: 'upper' | 'lower';
  from: string;
  to: string;
}

const KIND: Record<RelationType, RelationKind> = {
  body_controls_use: 'controls',
  use_controls_body: 'controls',
  body_generates_use: 'generates',
  use_generates_body: 'generates',
  equal: 'equal',
};

/** Primary body↔use relation, taken from the engine's edge (never recomputed in the UI). */
export function primaryRelation(reading: Reading): RelationView {
  const edge = reading.edges.find((e) => e.targetRole === 'use');
  if (!edge) throw new Error('Reading has no body/use edge');
  const bodyId = `primary-${reading.body.side}`;
  const kind = KIND[edge.type];
  const direction = kind === 'equal' ? 'none' : edge.from === bodyId ? 'body-to-use' : 'use-to-body';
  const fromSide = edge.from.endsWith('upper') ? 'upper' : 'lower';
  const screen = direction === 'none' ? 'none' : fromSide === 'upper' ? 'down' : 'up';
  return {
    type: edge.type, label: edge.label, phrase: edge.phrase, kind, direction, screen,
    bodySide: reading.body.side, useSide: reading.use.side, from: edge.from, to: edge.to,
  };
}

export const ROLE_LABEL: Record<string, { zh: string; en: string }> = {
  body: { zh: '体', en: 'Body' },
  use: { zh: '用', en: 'Use' },
  body_mutual: { zh: '体互', en: 'Body · mutual' },
  use_mutual: { zh: '用互', en: 'Use · mutual' },
  body_inherited: { zh: '体·沿用', en: 'Body (carried over)' },
  changed_use: { zh: '变用', en: 'Changed use' },
};
