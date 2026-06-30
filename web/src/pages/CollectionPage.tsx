import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { formatRatio } from "../lib/centering";
import { gradeVerdict } from "../lib/psa";

function CardList() {
  const cards = useQuery(api.cards.getCollection);

  if (cards === undefined) {
    return <div className="card"><p className="muted" style={{ margin: 0 }}>Loading your collection…</p></div>;
  }
  if (cards.length === 0) {
    return <div className="card"><p className="muted" style={{ margin: 0 }}>No cards yet. Scan one to get started.</p></div>;
  }

  return (
    <>
      {cards.map((card) => (
        <div className="card" key={card._id}>
          <strong>{[card.year, card.brand, card.playerName].filter(Boolean).join(" ") || "Untitled card"}</strong>
          {card.cardNumber ? <span className="muted"> · {card.cardNumber}</span> : null}
          {card.centering ? (
            <p style={{ margin: "8px 0 0" }}>
              PSA {card.centering.supportedGradeFront} ·{" "}
              {formatRatio(card.centering.lrLeftPct, card.centering.lrRightPct)} L/R ·{" "}
              {formatRatio(card.centering.tbTopPct, card.centering.tbBottomPct)} T/B
              <br />
              <span className="muted">{gradeVerdict(card.centering.supportedGradeFront)}</span>
            </p>
          ) : (
            <p className="muted" style={{ margin: "8px 0 0" }}>No centering recorded.</p>
          )}
          {card.lastSalePrice ? (
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Last sale: ${card.lastSalePrice}
              {card.lastSaleDate ? ` (${card.lastSaleDate.slice(0, 10)})` : ""}
            </p>
          ) : null}
        </div>
      ))}
    </>
  );
}

export function CollectionPage() {
  return (
    <div className="page">
      <h1>Collection</h1>
      <AuthLoading>
        <div className="card"><p className="muted" style={{ margin: 0 }}>Connecting…</p></div>
      </AuthLoading>
      <Authenticated>
        <CardList />
      </Authenticated>
      <Unauthenticated>
        <div className="card"><p className="muted" style={{ margin: 0 }}>Sign in on the Profile tab to see your saved cards.</p></div>
      </Unauthenticated>
    </div>
  );
}
