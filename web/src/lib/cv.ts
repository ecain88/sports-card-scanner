/**
 * OpenCV.js wrapper for client-side card detection.
 *
 * Loads OpenCV.js (WASM) lazily from a CDN on first use, then detects the card's
 * outer edge quad and the inner print-frame rectangle. The pure geometry/centering
 * math lives in geometry.ts / centering.ts and is unit-tested separately — this
 * file only does pixel work and hands axis-aligned rects back to that core.
 */

import type { Rect } from "./centering";
import { orderCorners, rectFromCorners, isLikelyBorderless, type Point } from "./geometry";

/* OpenCV is bundled as @techstark/opencv-js (wasm embedded) and dynamically
 * imported on first use, so it's served same-origin from our own deploy (no CDN,
 * no CORS) and cached by the service worker. We type it loosely; the centering
 * math is tested separately. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cvPromise: Promise<any> | null = null;

/** Lazy-load OpenCV once and resolve when the WASM runtime is initialized. */
export function loadOpenCv(): Promise<unknown> {
  if (cvPromise) return cvPromise;
  cvPromise = (async () => {
    const mod = await import("@techstark/opencv-js");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cv: any = (mod as any).default ?? mod;
    if (!cv?.Mat) {
      await new Promise<void>((resolve) => {
        cv.onRuntimeInitialized = () => resolve();
      });
    }
    return cv;
  })();
  return cvPromise;
}

export interface DetectionResult {
  outer: Rect;
  inner: Rect;
  /** 0..1 — how confident the detection is. Below ~0.6 prompt manual adjust. */
  confidence: number;
  borderless: boolean;
}

/** Find the largest 4-point contour (the card outer edge) in a binary edge image. */
function largestQuad(cv: any, contours: any): { points: Point[]; area: number } | null {
  let best: { points: Point[]; area: number } | null = null;
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const peri = cv.arcLength(cnt, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
    if (approx.rows === 4) {
      const area = cv.contourArea(approx);
      if (!best || area > best.area) {
        const points: Point[] = [];
        for (let r = 0; r < 4; r++) {
          points.push({ x: approx.intPtr(r, 0)[0], y: approx.intPtr(r, 0)[1] });
        }
        best = { points, area };
      }
    }
    approx.delete();
    cnt.delete();
  }
  return best;
}

/**
 * Detect outer card rect + inner frame rect from an ImageData.
 * Returns confidence so the UI can decide whether to ask for a manual nudge.
 */
export async function detectCardRects(image: ImageData): Promise<DetectionResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv: any = await loadOpenCv();
  if (!cv) throw new Error("OpenCV unavailable");

  const src = cv.matFromImageData(image);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 60, 180);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const outerQuad = largestQuad(cv, contours);
    if (!outerQuad) {
      // Nothing card-like found — caller should fall back to fully manual.
      const whole: Rect = { left: 0, top: 0, right: image.width, bottom: image.height };
      return { outer: whole, inner: whole, confidence: 0, borderless: false };
    }

    const orderedOuter = orderCorners(outerQuad.points);
    const outer = rectFromCorners(orderedOuter);

    // Inner frame: the next-largest quad strictly inside the outer rect.
    const contours2 = new cv.MatVector();
    const hierarchy2 = new cv.Mat();
    cv.findContours(edges, contours2, hierarchy2, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    let inner: Rect = outer;
    let innerArea = 0;
    for (let i = 0; i < contours2.size(); i++) {
      const cnt = contours2.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const pts: Point[] = [];
        for (let r = 0; r < 4; r++) pts.push({ x: approx.intPtr(r, 0)[0], y: approx.intPtr(r, 0)[1] });
        const r = rectFromCorners(pts);
        const area = (r.right - r.left) * (r.bottom - r.top);
        const insideOuter = r.left > outer.left && r.top > outer.top && r.right < outer.right && r.bottom < outer.bottom;
        if (insideOuter && area > innerArea && area < outerQuad.area * 0.98) {
          inner = r;
          innerArea = area;
        }
      }
      approx.delete();
      cnt.delete();
    }
    contours2.delete();
    hierarchy2.delete();

    const borderless = isLikelyBorderless(outer, inner);
    // Confidence: high when a distinct inner frame was found inside the card.
    const ratioFill = innerArea > 0 ? innerArea / outerQuad.area : 0;
    const confidence = innerArea === 0 ? 0.2 : Math.max(0, Math.min(1, 1 - Math.abs(0.7 - ratioFill)));

    return { outer, inner, confidence, borderless };
  } finally {
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}
