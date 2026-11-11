import type { RelationView } from '../domain/relation';

/**
 * Inline arrow between 体 and 用 that matches the engine's real direction.
 * Shape carries meaning without colour: 克 = solid line, filled head, tail bar;
 * 生 = dashed line, open chevron; 比和 = double line, no head.
 */
export function RelationGlyph({ relation, vertical = false, size = 1 }: { relation: RelationView; vertical?: boolean; size?: number }) {
  if (vertical) return <VerticalGlyph relation={relation} size={size} />;
  const bodyFirst = true; // reading order: 体 on the left, 用 on the right
  const pointsRight = relation.direction === 'body-to-use' ? bodyFirst : relation.direction === 'use-to-body' ? !bodyFirst : null;
  return (
    <span className={`relation-glyph kind-${relation.kind}`} aria-hidden="true">
      <span className="glyph-end">体</span>
      <svg viewBox="0 0 44 14" width={44 * size} height={14 * size}>
        <Arrow kind={relation.kind} from={pointsRight === false ? 40 : 4} to={pointsRight === false ? 4 : 40} y={7} horizontal />
      </svg>
      <span className="glyph-end">用</span>
    </span>
  );
}

function VerticalGlyph({ relation, size }: { relation: RelationView; size: number }) {
  // screen 'down' means from the upper trigram toward the lower one.
  const from = relation.screen === 'down' ? 4 : 56;
  const to = relation.screen === 'down' ? 56 : 4;
  return (
    <svg className={`relation-glyph-v kind-${relation.kind}`} viewBox="0 0 14 60" width={14 * size} height={60 * size} aria-hidden="true">
      <Arrow kind={relation.kind} from={from} to={to} y={7} horizontal={false} />
    </svg>
  );
}

function Arrow({ kind, from, to, y, horizontal }: { kind: RelationView['kind']; from: number; to: number; y: number; horizontal: boolean }) {
  const pt = (along: number, across: number) => (horizontal ? `${along},${across}` : `${across},${along}`);
  const line = (a: number, b: number, off = 0, dash?: string) => (
    <line
      x1={horizontal ? a : y + off}
      y1={horizontal ? y + off : a}
      x2={horizontal ? b : y + off}
      y2={horizontal ? y + off : b}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeDasharray={dash}
      strokeLinecap="round"
    />
  );
  if (kind === 'equal') return <g>{line(from, to, -2.2)}{line(from, to, 2.2)}</g>;
  const dir = Math.sign(to - from);
  const headBase = to - dir * 7;
  if (kind === 'controls') {
    return (
      <g>
        {line(from, headBase)}
        <line {...(horizontal ? { x1: from, x2: from, y1: y - 4, y2: y + 4 } : { y1: from, y2: from, x1: y - 4, x2: y + 4 })} stroke="currentColor" strokeWidth={1.6} />
        <polygon points={`${pt(to, y)} ${pt(headBase, y - 4.5)} ${pt(headBase, y + 4.5)}`} fill="currentColor" />
      </g>
    );
  }
  return (
    <g>
      {line(from, to - dir * 1.5, 0, '3 2.5')}
      <polyline points={`${pt(headBase, y - 4.5)} ${pt(to, y)} ${pt(headBase, y + 4.5)}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}
