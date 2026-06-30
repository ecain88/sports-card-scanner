import { useState } from "react";
import { buildActiveListingsUrl, buildSoldCompsUrl } from "../lib/ebay";

/**
 * eBay comps panel. v1 links out to eBay's own sold/completed filter (real sold
 * prices, no API approval needed). Active "asking price" listings via the Browse
 * API are wired in later through a Convex action.
 */
export function CompsPanel({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const trimmed = query.trim();

  return (
    <div className="card">
      <h2 style={{ fontSize: 17, marginTop: 0 }}>eBay comps</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. 2011 Topps Update Mike Trout #US175"
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
      />
      {trimmed.length > 0 ? (
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="link" href={buildSoldCompsUrl(trimmed)} target="_blank" rel="noreferrer">
            View sold comps on eBay →
          </a>
          <a className="link" href={buildActiveListingsUrl(trimmed)} target="_blank" rel="noreferrer">
            View active listings →
          </a>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 10 }}>Enter a card to see recent sales.</p>
      )}
      <p className="muted" style={{ marginTop: 10 }}>
        Sold prices open on eBay. In-app active “asking” prices arrive once the Browse API key is set.
      </p>
    </div>
  );
}
