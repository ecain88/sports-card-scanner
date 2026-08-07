/**
 * Border detection via GPT-4.1 Vision (server-side Convex action).
 *
 * Replaces the former OpenCV.js WASM pipeline. Sends the raw image file to
 * convex/borders.ts which asks GPT-4.1 to locate the card's outer edge and
 * inner print frame, then maps the normalized (0–1) coordinates back to pixels
 * for the centering pipeline in centering.ts.
 */

import type { Rect } from "./centering";
import { convexHttp } from "./convexHttpClient";
import { api } from "./api";

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DetectionResult {
  outer: Rect;
  inner: Rect;
  /** 0..1 — how confident the detection is. Below ~0.6 prompt manual adjust. */
  confidence: number;
  borderless: boolean;
}

interface NormalizedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function toPixels(r: NormalizedRect, w: number, h: number): Rect {
  return { left: r.left * w, top: r.top * h, right: r.right * w, bottom: r.bottom * h };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Detect outer card rect + inner frame rect from a File using GPT-4.1 Vision.
 * Returns confidence so the UI can decide whether to ask for a manual nudge.
 */
export async function detectCardRects(
  file: File,
  imageWidth: number,
  imageHeight: number,
): Promise<DetectionResult> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  let lastError: unknown;
  let result: { ok: true; outer: NormalizedRect; inner: NormalizedRect; confidence: number; borderless: boolean } | { ok: false; error: string } | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await convexHttp.action((api as any).borders.detectBorders, { base64, mimeType });
      break;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      // Only retry on connection/network failures — not on real errors from the action itself.
      const isTransient = /connection lost|network|fetch failed|timed out/i.test(message);
      if (!isTransient || attempt === MAX_ATTEMPTS) {
        throw err;
      }
      await sleep(500 * attempt);
    }
  }

  if (!result) {
    throw lastError instanceof Error ? lastError : new Error("Border detection failed after retries.");
  }

  if (!result.ok) {
    throw new Error(result.error);
  }

  return {
    outer: toPixels(result.outer, imageWidth, imageHeight),
    inner: toPixels(result.inner, imageWidth, imageHeight),
    confidence: result.confidence,
    borderless: result.borderless,
  };
}
