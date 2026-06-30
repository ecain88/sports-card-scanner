/**
 * Pure geometry helpers for the centering CV pipeline.
 *
 * These are kept free of external dependencies so they can be unit-tested directly.
 * cv.ts calls into these to derive axis-aligned rectangles from detected corners.
 */

import type { Rect } from "./centering";

export interface Point {
  x: number;
  y: number;
}

/**
 * Order 4 corners as [topLeft, topRight, bottomRight, bottomLeft].
 * Uses the classic sum/diff trick: TL has the smallest x+y, BR the largest;
 * TR has the smallest (y-x), BL the largest.
 */
export function orderCorners(points: Point[]): [Point, Point, Point, Point] {
  if (points.length !== 4) {
    throw new Error(`orderCorners expects exactly 4 points, got ${points.length}`);
  }
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = bySum[0];
  const bottomRight = bySum[bySum.length - 1];

  const remaining = points.filter((p) => p !== topLeft && p !== bottomRight);
  // Of the two remaining, the one with greater x is the top-right.
  const [r0, r1] = remaining;
  const topRight = r0.x >= r1.x ? r0 : r1;
  const bottomLeft = topRight === r0 ? r1 : r0;

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/** Axis-aligned bounding rect from a set of points. */
export function rectFromCorners(points: Point[]): Rect {
  if (points.length === 0) {
    throw new Error("rectFromCorners requires at least one point");
  }
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const p of points) {
    if (p.x < left) left = p.x;
    if (p.x > right) right = p.x;
    if (p.y < top) top = p.y;
    if (p.y > bottom) bottom = p.y;
  }
  return { left, top, right, bottom };
}

/** Width/height of the largest side, used to size the perspective-corrected output. */
export function maxDimensions(ordered: [Point, Point, Point, Point]): { width: number; height: number } {
  const [tl, tr, br, bl] = ordered;
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = Math.max(dist(tl, tr), dist(bl, br));
  const height = Math.max(dist(tl, bl), dist(tr, br));
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Heuristic: a card is "borderless" (no measurable inner frame) when the inner
 * rect fills nearly the whole outer rect, leaving borders too thin to grade.
 * Returns true when the average border is below `minBorderFraction` of the card size.
 */
export function isLikelyBorderless(outer: Rect, inner: Rect, minBorderFraction = 0.015): boolean {
  const cardW = outer.right - outer.left;
  const cardH = outer.bottom - outer.top;
  if (cardW <= 0 || cardH <= 0) return true;
  const left = (inner.left - outer.left) / cardW;
  const right = (outer.right - inner.right) / cardW;
  const top = (inner.top - outer.top) / cardH;
  const bottom = (outer.bottom - inner.bottom) / cardH;
  const avg = (left + right + top + bottom) / 4;
  return avg < minBorderFraction;
}
