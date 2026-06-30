/**
 * Local Convex API reference.
 *
 * The PWA lives in web/ and deploys with Vercel's Root Directory set to web/, so
 * it must NOT reach outside its root into ../convex/_generated (those files aren't
 * available to the Vercel build). We therefore use Convex's runtime `anyApi`
 * instead of the generated typed API, and declare precise types for the data the
 * UI actually consumes so call sites stay type-safe.
 */

import { anyApi } from "convex/server";

// Runtime function references (untyped) — resolved by name against the deployment.
export const api = anyApi;

/** A card as returned by api.cards.getCollection. */
export interface Centering {
  lrLeftPct: number;
  lrRightPct: number;
  tbTopPct: number;
  tbBottomPct: number;
  worstLargerPct: number;
  supportedGradeFront: number;
  confidence: number;
  manualAdjusted: boolean;
}

export interface CollectionCard {
  _id: string;
  playerName: string;
  year: string;
  brand: string;
  cardSet: string;
  cardNumber: string;
  imageUrl: string | null;
  centering?: Centering;
  isBorderless?: boolean;
  lastSalePrice?: number;
  lastSaleDate?: string;
}

/** The signed-in user as returned by api.cards.getCurrentUser. */
export interface CurrentUser {
  _id: string;
  email?: string;
  name?: string;
}
