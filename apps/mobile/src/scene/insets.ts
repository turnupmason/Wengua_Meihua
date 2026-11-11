/**
 * Screen space the HTML overlay takes from the 3D view. The result footer (conclusion card and
 * buttons) is measured by TempleView; the camera frames the stone table in the space above it.
 */
import type { Place } from './placeLayout';

export const sceneInsets: { footerPx: number; headerPx: number; place: Place } = {
  /** Height of the result footer in CSS pixels (last measured; a sensible default before that). */
  footerPx: 300,
  /** Bottom edge of the top bar (safe area + back, question, sound), in CSS pixels. */
  headerPx: 64,
  /** Where the visitor stands in the hall while idle (the camera glides there). */
  place: 'altar',
};
