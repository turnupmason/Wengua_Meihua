/**
 * Closing as gently as opening (2026-11-14, the user: 点击关闭以后不要直接消失，跟点开一样稍微有一个过度).
 *
 * <Exit show={open}>{open && <Sheet … />}</Exit>: while `show` is true the children render as usual;
 * when it turns false the last children stay a moment inside `.exit-wrap.is-closing`, where the CSS
 * plays the opening animation in reverse (backdrop fades, sheet slides down, a popup shrinks), and
 * then go. The wrapper is `display: contents`, so layout is untouched, and the same element tree is
 * kept, so the closing sheet keeps the state it had (the level it was on, what was typed).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export const EXIT_MS = 260;

export function Exit({ show, children, ms = EXIT_MS }: { show: boolean; children: ReactNode; ms?: number }) {
  const last = useRef<ReactNode>(null);
  const [closing, setClosing] = useState(false);
  const [wasShown, setWasShown] = useState(show);
  // Derived from the change of `show`, during render, so there is no frame without the sheet.
  if (show !== wasShown) {
    setWasShown(show);
    if (!show && last.current) setClosing(true);
  }
  if (show) last.current = children;
  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(() => {
      setClosing(false);
      last.current = null;
    }, ms);
    return () => window.clearTimeout(id);
  }, [closing, ms]);
  if (!show && !closing) return null;
  // A sheet on its way out is only a picture of itself: not read aloud, not tappable.
  return (
    <div className={`exit-wrap${!show ? ' is-closing' : ''}`} aria-hidden={!show || undefined} inert={!show || undefined}>
      {show ? children : last.current}
    </div>
  );
}
