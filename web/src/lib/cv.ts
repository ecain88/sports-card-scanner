/**
 * Border detection via GPT-4.1 Vision (server-side Convex action).
 *
 * Replaces the former OpenCV.js WASM pipeline. Downscales the photo, then
 * sends it to convex/borders.ts which asks GPT-4.1 to locate the card's
 * outer edge and inner print frame, then maps the normalized (0–1)
 * coordinates back to pixels for the centering pipeline in centering.ts.
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the selected image."));
    };
    img.src = url;
  });
}

const MAX_UPLOAD_DIMENSION = 1600;
const UPLOAD_JPEG_QUALITY = 0.85;

/**
 * Downscale + re-encode the photo before uploading it for detection.
 *
 * Phone camera photos are routinely 5-10MB; base64-encoded that comfortably
 * exceeds Convex's 1MB string-argument limit and is slow enough over cellular
 * to die mid-upload. GPT-4.1 vision doesn't need full resolution to locate
 * card borders, so we cap the longest edge and re-encode as JPEG.
 */
async function toUploadableBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImageElement(file);
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", UPLOAD_JPEG_QUALITY));
  if (!blob) throw new Error("Failed to encode image for upload.");

  return { base64: await blobToBase64(blob), mimeType: "image/jpeg" };
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
  const { base64, mimeType } = await toUploadableBase64(file);

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
      const isTransient = /connection lost|network|fetch failed|failed to fetch|timed out/i.test(message);
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
