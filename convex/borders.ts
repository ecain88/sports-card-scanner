import { action } from "./_generated/server";
import { v } from "convex/values";


/** Normalized (0–1) rectangle coordinates relative to image dimensions. */
interface NormalizedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type DetectBordersResult =
  | { ok: true; outer: NormalizedRect; inner: NormalizedRect; confidence: number; borderless: boolean }
  | { ok: false; error: string };

export const detectBorders = action({
  args: {
    base64: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args): Promise<DetectBordersResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "OPENAI_API_KEY not configured" };
    }

    const content = [
      {
        type: "image_url",
        image_url: {
          url: `data:${args.mimeType};base64,${args.base64}`,
          detail: "high",
        },
      },
      {
        type: "text",
        text: `You are analyzing a sports trading card for PSA-style centering measurement.

Locate two rectangles and return ONLY a JSON object — no prose, no markdown:

1. "outer": The physical card edge (where the card ends and the background begins).
2. "inner": The inner print-frame boundary (where the card artwork begins, inside the white border).

Express every coordinate as a fraction of the image dimensions (0.0 = left/top edge, 1.0 = right/bottom edge).

Also include:
- "confidence": 0.0–1.0. Lower when the card is tilted, obscured, or the borders are hard to read.
- "borderless": true only when the card has no measurable white border (e.g. modern borderless parallels).

Return exactly this JSON shape, no other text:
{"outer":{"left":0.05,"top":0.03,"right":0.95,"bottom":0.97},"inner":{"left":0.12,"top":0.10,"right":0.88,"bottom":0.90},"confidence":0.9,"borderless":false}`,
      },
    ];

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          max_tokens: 200,
          messages: [{ role: "user", content }],
        }),
      });
    } catch (err) {
      return { ok: false, error: `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    if (!res.ok) {
      return { ok: false, error: `OpenAI returned ${res.status}` };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as {
        outer: NormalizedRect;
        inner: NormalizedRect;
        confidence: number;
        borderless: boolean;
      };
      if (!parsed.outer || !parsed.inner) {
        return { ok: false, error: `Unexpected model output: ${cleaned.slice(0, 160)}` };
      }
      return { ok: true, ...parsed };
    } catch {
      return { ok: false, error: `Could not parse model output: ${cleaned.slice(0, 160)}` };
    }
  },
});
