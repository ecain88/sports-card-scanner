/**
 * Pure PSA-style centering geometry.
 *
 * Given the card's outer edge rectangle and the inner print-frame rectangle
 * (both already perspective-corrected to axis-aligned pixel coordinates), compute
 * the left/right and top/bottom border ratios PSA uses for centering grading.
 */

import { supportedPsaGrade, type CardSide } from "./psa";

export interface Rect {
  /** Left edge x (px). */
  left: number;
  /** Top edge y (px). */
  top: number;
  /** Right edge x (px). */
  right: number;
  /** Bottom edge y (px). */
  bottom: number;
}

export interface AxisRatio {
  /** Percentage of combined border width on the first side (0..100). */
  firstPct: number;
  /** Percentage on the opposing side (0..100). */
  secondPct: number;
}

export type Axis = "leftRight" | "topBottom";

export interface CenteringResult {
  lr: { leftPct: number; rightPct: number };
  tb: { topPct: number; bottomPct: number };
  /** The axis with the worse (more off-center) ratio. */
  worstAxis: Axis;
  /** The larger-side percentage on the worst axis (50..100). */
  worstLargerPct: number;
  /** Highest PSA grade the centering supports for the given side. */
  supportedGrade: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Normalize two opposing border widths into percentages summing to 100. */
function ratio(a: number, b: number): AxisRatio {
  const total = a + b;
  if (total <= 0 || !Number.isFinite(total)) {
    // Degenerate: treat as perfectly centered to avoid divide-by-zero blowups.
    return { firstPct: 50, secondPct: 50 };
  }
  const firstPct = round1((a / total) * 100);
  return { firstPct, secondPct: round1(100 - firstPct) };
}

/**
 * Compute centering from outer (card edge) and inner (print frame) rectangles.
 * Border widths are the gaps between the two rectangles on each side.
 */
export function computeCentering(
  outer: Rect,
  inner: Rect,
  side: CardSide = "front",
): CenteringResult {
  const leftBorder = inner.left - outer.left;
  const rightBorder = outer.right - inner.right;
  const topBorder = inner.top - outer.top;
  const bottomBorder = outer.bottom - inner.bottom;

  const lrRatio = ratio(Math.max(0, leftBorder), Math.max(0, rightBorder));
  const tbRatio = ratio(Math.max(0, topBorder), Math.max(0, bottomBorder));

  const lrLarger = Math.max(lrRatio.firstPct, lrRatio.secondPct);
  const tbLarger = Math.max(tbRatio.firstPct, tbRatio.secondPct);

  const worstAxis: Axis = lrLarger >= tbLarger ? "leftRight" : "topBottom";
  const worstLargerPct = Math.max(lrLarger, tbLarger);

  return {
    lr: { leftPct: lrRatio.firstPct, rightPct: lrRatio.secondPct },
    tb: { topPct: tbRatio.firstPct, bottomPct: tbRatio.secondPct },
    worstAxis,
    worstLargerPct,
    supportedGrade: supportedPsaGrade(worstLargerPct, side),
  };
}

/** Format an axis ratio as "55/45" with the larger side first (PSA convention). */
export function formatRatio(firstPct: number, secondPct: number): string {
  const larger = Math.max(firstPct, secondPct);
  const smaller = Math.min(firstPct, secondPct);
  return `${Math.round(larger)}/${Math.round(smaller)}`;
}
