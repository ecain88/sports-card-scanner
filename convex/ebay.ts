import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * eBay Browse API — ACTIVE listings ("asking prices").
 *
 * Real SOLD comps are gated behind eBay's Marketplace Insights API, so the app
 * links out to eBay's own sold filter for true sold prices (see web buildSoldCompsUrl)
 * and uses the Browse API here for current active asking prices.
 *
 * Browse API needs an OAuth application token (client-credentials grant), so this
 * action expects EBAY_CLIENT_ID + EBAY_CLIENT_SECRET. Returns a typed error when
 * unconfigured rather than throwing.
 */

export interface ActiveListing {
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl: string;
}

export type BrowseResult =
  | { ok: true; listings: ActiveListing[] }
  | { ok: false; error: string };

const SPORTS_CARDS_CATEGORY = "212";

async function getAppToken(clientId: string, clientSecret: string): Promise<string | null> {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }).toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export const searchActiveListings = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (_ctx, args): Promise<BrowseResult> => {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { ok: false, error: "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not configured" };
    }

    const token = await getAppToken(clientId, clientSecret);
    if (!token) return { ok: false, error: "eBay OAuth token request failed" };

    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const params = new URLSearchParams({
      q: args.query,
      category_ids: SPORTS_CARDS_CATEGORY,
      limit: String(limit),
    });

    let res: Response;
    try {
      res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch (err) {
      return { ok: false, error: `eBay request failed: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (!res.ok) return { ok: false, error: `eBay Browse returned ${res.status}` };

    const data = (await res.json()) as {
      itemSummaries?: Array<{
        title?: string;
        price?: { value?: string; currency?: string };
        itemWebUrl?: string;
        image?: { imageUrl?: string };
      }>;
    };

    const listings: ActiveListing[] = (data.itemSummaries ?? [])
      .map((it) => ({
        title: it.title ?? "",
        price: Number(it.price?.value ?? 0),
        currency: it.price?.currency ?? "USD",
        url: it.itemWebUrl ?? "",
        imageUrl: it.image?.imageUrl ?? "",
      }))
      .filter((l) => l.price > 0);

    return { ok: true, listings };
  },
});
