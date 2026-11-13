/**
 * The hall where the visitor stands at home, painted (docs/art-reference/sanqing-entrance,
 * keyframes/03-hall-lighting): the artist's dark wooden hall with its warm lamplight and bronze
 * censer, the 「三清殿」 plaque on the wall, and the three original portraits on the three seats —
 * 太上老君 on the viewer's left, 元始天尊 in the middle, a little higher and further back, 灵宝天尊
 * on the right. Contact shadows and a touch of the hall's warm light settle them into the picture.
 * The 3D hall takes over (cross-fade) once the visitor walks to the stone table or to another place.
 */
import { useEffect, useRef } from 'react';
import { WALK_IN_FILES, walkInUrl } from './walkInArt';

/** Picture proportions and where the 三清 sit in it (fractions of the picture). */
const ASPECT = 941 / 1672;
/** The seats' top: where the figures rest. */
const SEAT_LINE = 0.472;
/** From the highest crown to the seats. */
const FIGURES = 0.205;
/** Distance of the outer figures' edges from the picture's side. */
const SIDE_MARGIN = 0.089;
/** Last measured top of the 问事 tray (fraction of the screen), for framing before it appears. */
let trayTop = 0.39;

const topOf = (el: HTMLElement) => {
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  return y;
};

/**
 * Frames the picture for the screen: the figures, crown to seat, fit between the top bar and the
 * 问事 tray, seated just above the tray's edge; the outer figures keep room at the screen's sides.
 * Layout positions are used (not the tray's rising animation), so the framing never jumps.
 */
function frame(plate: HTMLElement, root: HTMLElement) {
  const W = root.clientWidth;
  const H = root.clientHeight;
  if (!W || !H) return;
  const panel = document.querySelector<HTMLElement>('.home-panel');
  const header = document.querySelector<HTMLElement>('.temple-top');
  if (panel?.offsetHeight) trayTop = topOf(panel) / H;
  const tray = trayTop * H;
  const bar = header?.offsetHeight ? topOf(header) + header.offsetHeight : 64;
  const room = Math.max(80, tray - bar - 10);
  const sideMax = (W / 2 - 8) / (0.5 - SIDE_MARGIN);
  const fitMax = (room / FIGURES) * ASPECT;
  const pw = Math.max(W, Math.min(sideMax, fitMax, W * 1.3));
  const ph = pw / ASPECT;
  const top = Math.min(0, tray - 6 - SEAT_LINE * ph);
  Object.assign(plate.style, { width: `${pw}px`, height: `${ph}px`, left: `${(W - pw) / 2}px`, top: `${top}px`, transform: 'none' });
}

/** Seats in the 941×1672 picture: left %, top %, width % (each portrait's foot on its seat's top). */
const SEATS = [
  { key: 'yuanshi', file: 'art/sanqing-yuanshi.webp', left: 37.4, top: 27.3, width: 25.5, shadowTop: 46.2 },
  { key: 'laojun', file: 'art/sanqing-laojun.webp', left: 8.9, top: 30.9, width: 22.8, shadowTop: 47.6 },
  { key: 'lingbao', file: 'art/sanqing-lingbao.webp', left: 68.8, top: 31.4, width: 22.8, shadowTop: 47.6 },
] as const;
/** Hanging lanterns (x, y, size as fractions of the width) and the censer's mouth. */
const LAMPS = [
  [0.138, 0.145, 0.12],
  [0.882, 0.145, 0.12],
] as const;
const CENSER = [0.5, 0.572] as const;

export function PaintedHall({ shown, still }: { shown: boolean; still: boolean }) {
  const base = import.meta.env.BASE_URL;
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shown) return;
    // Re-framed a few times a second while shown: cheap, and it follows the tray and rotation.
    const fit = () => root.current && plate.current && frame(plate.current, root.current);
    fit();
    const id = window.setInterval(fit, 250);
    window.addEventListener('resize', fit);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', fit);
    };
  }, [shown]);
  return (
    <div ref={root} className={`painted-hall ${shown ? 'is-on' : ''} ${still ? 'is-still' : ''}`} aria-hidden="true">
      <div ref={plate} className="walkin-plate hall-plate" style={{ backgroundImage: `url(${walkInUrl(WALK_IN_FILES.hall)})` }}>
        {LAMPS.map(([x, y, w], i) => (
          <i key={i} className="walkin-lamp" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, animationDelay: `${-i * 1.1}s` }} />
        ))}
        {SEATS.map((s) => (
          <i key={`shadow-${s.key}`} className="hall-shadow" style={{ left: `${s.left - 1}%`, top: `${s.shadowTop}%`, width: `${s.width + 2}%` }} />
        ))}
        {SEATS.map((s) => (
          <img key={s.key} className={`hall-figure is-${s.key}`} src={`${base}${s.file}`} alt="" style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.width}%` }} />
        ))}
        {[0, 1].map((i) => (
          <img key={i} className="walkin-smoke is-hall" src={walkInUrl(WALK_IN_FILES.wisp)} alt="" style={{ left: `${CENSER[0] * 100}%`, top: `${CENSER[1] * 100}%`, animationDelay: `${-i * 4.5}s` }} />
        ))}
      </div>
    </div>
  );
}

/** 藏经阁 and 问事录, painted (4:3 pictures): a lantern each, and the desk's small censer. */
const PLACES = {
  library: { file: 'place-library.webp', lamps: [[0.125, 0.175, 0.1]], smoke: null },
  records: { file: 'place-records.webp', lamps: [[0.153, 0.265, 0.11]], smoke: [0.225, 0.54] },
} as const;
export type PaintedPlaceKey = keyof typeof PLACES;
const PLACE_ASPECT = 4 / 3;

/**
 * Frames a place's picture above its panel: from the top of the screen to a little below the
 * panel's edge, cropped at the sides as needed (never narrower than the screen).
 */
function framePlace(plate: HTMLElement, root: HTMLElement, panelFraction: number) {
  const W = root.clientWidth;
  const H = root.clientHeight;
  if (!W || !H) return;
  const ph = Math.max(W / PLACE_ASPECT, H * (1 - panelFraction) + 24);
  const pw = ph * PLACE_ASPECT;
  Object.assign(plate.style, { width: `${pw}px`, height: `${ph}px`, left: `${(W - pw) / 2}px`, top: '0px', transform: 'none' });
}

export function PaintedPlace({ place, shown, still, panelFraction }: { place: PaintedPlaceKey; shown: boolean; still: boolean; panelFraction: number }) {
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const p = PLACES[place];
  useEffect(() => {
    const fit = () => root.current && plate.current && framePlace(plate.current, root.current, panelFraction);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [panelFraction]);
  return (
    <div ref={root} className={`painted-hall is-place ${shown ? 'is-on' : ''} ${still ? 'is-still' : ''}`} aria-hidden="true">
      <div ref={plate} className="walkin-plate place-plate" style={{ backgroundImage: `url(${walkInUrl(p.file)})` }}>
        {p.lamps.map(([x, y, w], i) => (
          <i key={i} className="walkin-lamp" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%` }} />
        ))}
        {p.smoke &&
          [0, 1].map((i) => (
            <img key={i} className="walkin-smoke is-desk" src={walkInUrl(WALK_IN_FILES.wisp)} alt="" style={{ left: `${p.smoke[0] * 100}%`, top: `${p.smoke[1] * 100}%`, animationDelay: `${-i * 4.5}s` }} />
          ))}
      </div>
    </div>
  );
}
