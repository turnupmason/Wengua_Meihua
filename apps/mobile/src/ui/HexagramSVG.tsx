import { lineSlots } from '../domain/layout';

interface Props {
  bits: readonly number[];
  hexagramId: number;
  title: string;
  /** Persistent gold glow: only the primary hexagram's moving line of this cast. */
  movingLine?: number | null;
  /** Browsing highlight, visually distinct from the moving line. */
  selectedLine?: number | null;
  /** Low-key marker on the changed hexagram where the change landed. */
  correspondingLine?: number | null;
  lineLabels?: readonly string[];
  onLine?: (position: number) => void;
  width?: number;
  revealed?: boolean;
}

/** Data-driven hexagram: positions 1..6 bottom-up, position 1 drawn lowest. */
export function HexagramSVG({ bits, hexagramId, title, movingLine = null, selectedLine = null, correspondingLine = null, lineLabels, onLine, width = 120, revealed = true }: Props) {
  const slots = lineSlots(bits);
  return (
    <svg className={`hexagram-svg ${revealed ? 'is-revealed' : ''}`} viewBox="0 0 168 166" width={width} role="group" aria-label={title} data-hexagram-id={hexagramId}>
      {slots.map((s) => {
        const cls = ['yao', s.position === movingLine ? 'moving' : '', s.position === selectedLine ? 'selected' : ''].filter(Boolean).join(' ');
        const label = lineLabels?.[s.position - 1] ?? String(s.position);
        return (
          <g
            key={s.position}
            className={cls}
            data-line-position={s.position}
            role={onLine ? 'button' : undefined}
            tabIndex={onLine ? 0 : undefined}
            aria-label={onLine ? label : undefined}
            onClick={onLine ? () => onLine(s.position) : undefined}
            onKeyDown={
              onLine
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLine(s.position);
                    }
                  }
                : undefined
            }
          >
            {/* One hit area for both yin halves and the gap. */}
            <rect className="hit" x="0" y={s.svgY - 7} width="168" height="26" fill="transparent" />
            {s.yang ? (
              <rect className="bar" x="18" y={s.svgY} width="132" height="12" rx="2" />
            ) : (
              <>
                <rect className="bar" x="18" y={s.svgY} width="56" height="12" rx="2" />
                <rect className="bar" x="94" y={s.svgY} width="56" height="12" rx="2" />
              </>
            )}
            {s.position === correspondingLine && <circle className="change-marker" cx="160" cy={s.svgY + 6} r="4" />}
          </g>
        );
      })}
    </svg>
  );
}
