/**
 * iOS Safari puts the on-screen keyboard over the page instead of resizing it. The keyboard's
 * height is published as the CSS variable --kb (from window.visualViewport), so bottom panels
 * and sheets can lift above it, and the focused field is scrolled into view.
 */
export function watchKeyboard(doc: Document = document, win: Window = window) {
  const vv = win.visualViewport;
  if (!vv) return () => {};
  const update = () => {
    const kb = Math.max(0, Math.round(win.innerHeight - vv.height - vv.offsetTop));
    doc.documentElement.style.setProperty('--kb', `${kb > 60 ? kb : 0}px`);
  };
  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    // Only when the keyboard is actually covering part of the screen, and only within scrollable panels.
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      setTimeout(() => {
        const kb = parseInt(getComputedStyle(doc.documentElement).getPropertyValue('--kb')) || 0;
        if (kb > 0) el.scrollIntoView?.({ block: 'nearest' });
      }, 300);
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  doc.addEventListener('focusin', onFocus);
  update();
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    doc.removeEventListener('focusin', onFocus);
  };
}
