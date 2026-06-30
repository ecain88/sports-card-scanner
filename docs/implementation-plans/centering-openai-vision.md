# Centering Analysis: OpenCV → GPT-4.1 Vision

## Background

The sports card scanner measures PSA-style centering by locating two rectangles in a card photo:

- **Outer rect** — the physical edge of the card
- **Inner rect** — the inner print-frame boundary (where artwork begins, inside the white border)

Border widths on each side (left, right, top, bottom) are derived from the gap between the two rects. Opposing border widths are expressed as ratios (e.g. 55/45) and mapped to PSA grade tolerances.

Reference spec: [cardgrade.io centering guide](https://cardgrade.io/blog/centering-guide)

## Problem with the original OpenCV.js approach

The app originally used `@techstark/opencv-js` (a ~10 MB WebAssembly build of OpenCV) running entirely in the browser to detect card borders via Canny edge detection + contour fitting.

**Why it failed:**

| Issue | Detail |
|---|---|
| WASM load failures | 10 MB bundle timed out or was blocked on mobile browsers, showing "Could not load OpenCV.js" |
| Brittle edge detection | Canny edge detection is sensitive to lighting, glare, background clutter, and card angle — all common in phone photos |
| Inner frame detection unreliability | Detecting the print frame (inside the white border) via contour nesting was fragile and fell back silently |
| Bundle overhead | 10 MB chunk required special Vite chunk splitting, service worker exclusion, and runtime caching rules |

## Solution: GPT-4.1 Vision via Convex action

Replace browser-side WASM with a server-side Convex action (`convex/borders.ts`) that sends the card image to GPT-4.1 Vision and asks it to locate the outer and inner rectangles semantically.

GPT-4.1 understands what a sports card looks like — white borders, print frames, card edges — making it far more robust than generic pixel-level edge detection on phone photos.

## Architecture

```
[User uploads photo]
        │
        ▼
  ScanPage.tsx
  ├── Shows default blue/green border overlays
  ├── "Auto-detect borders" button
  │         │
  │         ▼
  │   cv.ts: detectCardRects(file, imgW, imgH)
  │   ├── fileToBase64(file)
  │   └── convex.action(api.borders.detectBorders, { base64, mimeType })
  │                │
  │                ▼
  │         convex/borders.ts  ← NEW
  │         └── GPT-4.1 Vision API
  │             Returns normalized rects (0–1 coords)
  │                │
  │         cv.ts maps normalized → pixel coords
  │                │
  ▼         setOuter / setInner (pixel rects)
  ├── Canvas overlay redraws blue + green rects
  ├── Manual sliders for fine-tuning
  └── centering.ts: computeCentering(outer, inner)
      └── psa.ts: supportedPsaGrade(worstLargerPct)
```

The pure math layer (`centering.ts`, `geometry.ts`, `psa.ts`) is unchanged. Only the border *detection* step changes.

## Files changed

| File | Change |
|---|---|
| `convex/borders.ts` | **New** — Convex action calling GPT-4.1 Vision, returns normalized rect coords |
| `web/src/lib/cv.ts` | **Replaced** — removed OpenCV WASM, now wraps the Convex action call |
| `web/src/pages/ScanPage.tsx` | Stores raw `File` in state; passes it (+ image dimensions) to `detectCardRects` |
| `web/vite.config.ts` | Removed OpenCV chunk splitting, service worker exclusion, and runtime cache rules |
| `web/package.json` | Removed `@techstark/opencv-js` dependency |
| `convex/vision.ts` | Updated model string `gpt-4o` → `gpt-4.1` |
| `convex/schema.ts` | Updated comment to reference GPT-4.1 Vision pipeline |
| `web/src/lib/cv.integration.test.ts` | Replaced with stub (OpenCV-specific tests no longer applicable) |

## GPT-4.1 Vision prompt design

The prompt in `convex/borders.ts` asks the model to:

1. Find the **outer** rect (physical card edge vs. background)
2. Find the **inner** rect (print frame inside the white border)
3. Return coordinates as **normalized fractions** (0.0–1.0) of image width/height
4. Return a **confidence** score (0–1) — the UI shows a nudge prompt below ~0.6
5. Return **borderless: true** for full-bleed cards with no measurable border

Normalized coordinates are converted to pixel coords in `cv.ts` using the image's natural dimensions before being handed to `computeCentering()`.

## Model

`gpt-4.1` — OpenAI's current API-recommended vision model (replaces `gpt-4o` as of 2026). Both `vision.ts` (card identification) and `borders.ts` (border detection) use this model.

## Trade-offs

| | OpenCV.js (removed) | GPT-4.1 Vision (current) |
|---|---|---|
| Reliability on mobile | Fragile — WASM load failures | Reliable — standard HTTP |
| Detection accuracy | Brittle on real photos | Robust — semantic understanding |
| Bundle size impact | +10 MB WASM chunk | Zero |
| Cost | Free | ~$0.001–0.002 per auto-detect |
| Latency | Fast (local, when it loaded) | ~1–2 s round trip |
| Offline support | Yes (when loaded) | No |

Cost and latency are the main trade-offs. Since card identification (via `convex/vision.ts`) already requires an API round trip per scan, border detection adds a second call of similar cost. These could be batched into one request in a future optimisation.

## Manual fallback

The manual border sliders in `ScanPage.tsx` remain unchanged and are always available. If `detectCardRects` throws (e.g. no API key, network failure, or low confidence), the user can adjust the blue/green overlays manually to match the card before computing centering.
