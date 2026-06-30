import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Card identification via GPT-4.1 Vision. This is the IDENTIFICATION pipeline only —
 * it never measures centering (that runs server-side via convex/borders.ts). It extracts
 * the card's metadata and an eBay-optimized search string.
 *
 * Uses the OpenAI REST API via fetch so it runs in Convex's default runtime with
 * no node-only dependencies. Returns a typed error string instead of crashing when
 * OPENAI_API_KEY is absent.
 */

export interface CardDetails {
  playerName: string;
  year: string;
  brand: string;
  set: string;
  cardNumber: string;
  variation: string;
  sport: string;
  team: string;
  grade: string;
  searchQuery: string;
}

export type RecognizeResult =
  | { ok: true; card: CardDetails }
  | { ok: false; error: string };

export const recognizeCard = action({
  args: {
    frontBase64: v.string(),
    backBase64: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<RecognizeResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "OPENAI_API_KEY not configured" };
    }

    const hasBack = Boolean(args.backBase64);
    const content: Array<Record<string, unknown>> = [
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${args.frontBase64}`, detail: "high" } },
    ];
    if (args.backBase64) {
      content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${args.backBase64}`, detail: "high" } });
    }

    const yearInstruction = hasBack
      ? `For "year": use the copyright (©) year on the BACK (image 2), e.g. "© 2025 Topps". Extract only the 4-digit year after ©. Ignore stat years. Fall back to the front year if no © year is visible.`
      : `For "year": find the © symbol and use the 4-digit year after it, else the year printed on the front.`;

    content.push({
      type: "text",
      text: `You are given ${hasBack ? "two images: image 1 FRONT, image 2 BACK" : "the front"} of a sports card. Return ONLY a JSON object with exactly these fields:
{"playerName":"","year":"","brand":"","set":"","cardNumber":"","variation":"","sport":"","team":"","grade":"","searchQuery":""}
- grade: grading company + grade if slabbed, else "Raw".
- searchQuery: an eBay-optimized string like "2020 Topps Chrome Mike Trout #1 Refractor".
${yearInstruction}
Return only valid JSON.`,
    });

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4.1", max_tokens: 500, messages: [{ role: "user", content }] }),
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
      const card = JSON.parse(cleaned) as CardDetails;
      return { ok: true, card };
    } catch {
      return { ok: false, error: `Could not parse model output: ${cleaned.slice(0, 160)}` };
    }
  },
});
