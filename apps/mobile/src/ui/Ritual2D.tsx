/**
 * Flat ritual scene for devices without WebGL, timed by the same ritual clock: the 三清祖师
 * seated side by side under the hall plaque (the same cutouts as on the 3D altar), a line-drawn
 * burner, and incense with rising smoke.
 */
import type { CSSProperties } from 'react';
import { phaseDuration, type RitualPhase } from '../domain/ritual';

const SEATS = [
  { file: 'art/sanqing-laojun.webp', x: 2, y: 178, w: 124, h: 152 },
  { file: 'art/sanqing-lingbao.webp', x: 234, y: 178, w: 124, h: 152 },
  { file: 'art/sanqing-yuanshi.webp', x: 104, y: 150, w: 152, h: 180 },
];

export function Ritual2D({ phase, reduced }: { phase: RitualPhase; reduced: boolean }) {
  const d = phaseDuration(phase, reduced);
  const style = { '--phase-s': `${Number.isFinite(d) ? d : 1}s` } as CSSProperties;
  const lit = phase === 'revealing';
  return (
    <div className={`ritual-2d phase-${phase} ${reduced ? 'reduced' : ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 360 560" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="r2d-bg" cx="50%" cy="34%" r="70%">
            <stop offset="0" stopColor="#3b2614" />
            <stop offset="0.55" stopColor="#1a120b" />
            <stop offset="1" stopColor="#0b0806" />
          </radialGradient>
          <radialGradient id="r2d-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd98f" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="r2d-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4d590" />
            <stop offset="1" stopColor="#a8773a" />
          </linearGradient>
        </defs>
        <rect width="360" height="560" fill="url(#r2d-bg)" />
        {/* Plaque */}
        <g className="r2d-plaque-group" transform="translate(180 64)">
          <rect x="-62" y="-20" width="124" height="40" rx="3" fill="#3a1510" stroke="url(#r2d-gold)" strokeWidth="2" />
          <text y="7" textAnchor="middle" className="r2d-plaque">三 清 殿</text>
        </g>
        {/* 三清祖师 seated side by side: 老君 left, 元始 middle (raised), 灵宝 right. */}
        <circle cx="180" cy="218" r="150" fill="url(#r2d-halo)" className="r2d-halo" />
        {SEATS.map((s) => (
          <image key={s.file} href={`${import.meta.env.BASE_URL}${s.file}`} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMax meet" />
        ))}
        {/* Altar ledge */}
        <rect x="40" y="330" width="280" height="10" fill="url(#r2d-gold)" opacity="0.55" />
        <rect x="52" y="340" width="256" height="40" fill="#2a1a10" />
        {/* Burner (line art) */}
        <g transform="translate(180 470)" stroke="url(#r2d-gold)" fill="none" strokeWidth="2">
          <path d="M-58 -10 Q-58 32 -30 36 L30 36 Q58 32 58 -10 Z" fill="#2a1d12" />
          <path d="M-66 -12 L66 -12" strokeWidth="3" />
          <path d="M-40 36 L-46 58 M40 36 L46 58 M0 36 L0 58" />
          <path d="M-58 -2 q-16 -4 -12 -18 M58 -2 q16 -4 12 -18" />
        </g>
        {/* The three sticks: centre, right, left */}
        <g transform="translate(180 458)" className={`r2d-sticks ${lit ? 'is-lit' : ''}`}>
          {[0, 18, -18].map((x, i) => (
            <g key={i} className={`r2d-stick s${i}`}>
              <line x1={x} y1="0" x2={x} y2="-74" stroke="#8a3f20" strokeWidth="2.2" />
              <circle cx={x} cy="-75" r="2.6" className="r2d-tip" />
              <path className="r2d-smoke" d={`M${x} -78 q -10 -24 3 -48 t -4 -48 t 6 -40`} fill="none" stroke="#e6ded0" strokeWidth="1.4" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
