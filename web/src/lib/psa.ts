/**
 * PSA centering grade mapping.
 *
 * PSA expresses centering as the ratio of the two opposing border widths on the
 * worst axis, e.g. "55/45" means the larger border occupies 55% of the combined
 * border width on that axis. A perfectly centered card is 50/50.
 *
 * The published front tolerances (largest allowed "larger-side" percentage for a
 * given grade) used here:
 *   GEM-MT 10 -> 55, MINT 9 -> 60, NM-MT 8 -> 65, NM 7 -> 70, EX-MT 6 -> 80, EX 5 -> 85
 * Back tolerances are looser. Anything worse than the lowest band returns grade 4
 * (centering would cap the card at or below a 4).
 */

export type CardSide = "front" | "back";

/** Ordered best -> worst. Each entry: max allowed larger-side percentage for that grade. */
const FRONT_TOLERANCES: ReadonlyArray<readonly [grade: number, maxLargerPct: number]> = [
  [10, 55],
  [9, 60],
  [8, 65],
  [7, 70],
  [6, 80],
  [5, 85],
];

const BACK_TOLERANCES: ReadonlyArray<readonly [grade: number, maxLargerPct: number]> = [
  [10, 75],
  [9, 80],
  [8, 85],
  [7, 90],
  [6, 90],
  [5, 95],
];

/** Grade returned when centering is worse than the lowest defined band. */
export const FLOOR_GRADE = 4;

/**
 * Map a worst-axis larger-side percentage (50..100) to the highest PSA grade
 * whose centering tolerance it satisfies.
 */
export function supportedPsaGrade(worstLargerPct: number, side: CardSide = "front"): number {
  if (!Number.isFinite(worstLargerPct)) return FLOOR_GRADE;
  const pct = Math.max(50, Math.min(100, worstLargerPct));
  const table = side === "front" ? FRONT_TOLERANCES : BACK_TOLERANCES;
  for (const [grade, maxLargerPct] of table) {
    if (pct <= maxLargerPct) return grade;
  }
  return FLOOR_GRADE;
}

/** Human-readable centering verdict, e.g. "Centering supports up to PSA 9". */
export function gradeVerdict(grade: number): string {
  if (grade >= 10) return "Centering supports a PSA 10 (Gem Mint)";
  if (grade <= FLOOR_GRADE) return `Centering caps this card at ~PSA ${FLOOR_GRADE} or lower`;
  return `Centering supports up to PSA ${grade}`;
}
