/**
 * 殿中三处: the hall is the app's map. 问事香案 is the home view before the 三清; 藏经阁 (the
 * sixty-four hexagrams and the classics) is a sutra cabinet against the left wall; 问事录 (past
 * readings and the journal) is a writing desk against the right wall. Both sit between the
 * columns, half-way down the hall. Plain numbers only (no three.js), so tests can import them.
 */
type V3 = [number, number, number];

export type Place = 'altar' | 'library' | 'records';

/** Where each piece stands (centre of its footprint on the floor) and which way it faces. */
export const PLACE_SPOTS = {
  library: { pos: [-8.3, 0, -4.0] as V3, facing: Math.PI / 2 }, // faces +x, into the hall
  records: { pos: [8.25, 0, -4.0] as V3, facing: -Math.PI / 2 }, // faces -x
} as const;

/**
 * Camera when visiting: standing in the aisle, looking across between the columns at the piece.
 * The panel covers the lower part of the screen, so the view is framed above it.
 */
export const PLACE_POSES: Record<Exclude<Place, 'altar'>, { pos: V3; target: V3 }> = {
  // From the centre aisle: a phone's portrait view is narrow, so the whole piece and its plaque
  // only fit above the panel from about eight metres away.
  library: { pos: [0.4, 1.8, -4.0], target: [-8.3, 2.05, -4.0] },
  records: { pos: [-0.4, 1.8, -4.0], target: [8.25, 1.85, -4.0] },
};

/** Fraction of the screen the place's panel covers (kept clear by the camera). */
export const PLACE_PANEL = 0.58;
