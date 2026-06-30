/**
 * eBay helpers — pure, no network.
 *
 * Real SOLD comps are gated behind eBay's Marketplace Insights API, so v1 links
 * the user directly to eBay's own sold/completed search filter (zero approval,
 * always accurate) and uses the Browse API (elsewhere) for active asking prices.
 */

export interface CardLike {
  playerName?: string;
  year?: string;
  brand?: string;
  cardSet?: string;
  cardNumber?: string;
  variation?: string;
}

/** Compose a clean eBay search string from card fields, skipping blanks. */
export function buildCardQuery(card: CardLike): string {
  const parts = [
    card.year,
    card.brand,
    card.cardSet,
    card.playerName,
    card.cardNumber ? `#${card.cardNumber.replace(/^#/, "")}` : undefined,
    card.variation,
  ];
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a deep link into eBay's sold + completed listings search for a query.
 * LH_Sold=1 and LH_Complete=1 are the filters that restrict results to real
 * recent sales.
 */
export function buildSoldCompsUrl(query: string): string {
  const params = new URLSearchParams({
    _nkw: query,
    LH_Sold: "1",
    LH_Complete: "1",
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

/** Build a deep link into eBay active listings for a query. */
export function buildActiveListingsUrl(query: string): string {
  const params = new URLSearchParams({ _nkw: query });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}
