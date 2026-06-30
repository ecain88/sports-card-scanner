import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const saleListingValidator = v.object({
  title: v.string(),
  salePrice: v.number(),
  saleDate: v.string(),
  listingUrl: v.string(),
  imageUrl: v.string(),
});

// PSA-style centering measurement — borders detected by GPT-4.1 Vision (convex/borders.ts).
const centeringValidator = v.object({
  lrLeftPct: v.number(),
  lrRightPct: v.number(),
  tbTopPct: v.number(),
  tbBottomPct: v.number(),
  worstLargerPct: v.number(),
  supportedGradeFront: v.number(),
  confidence: v.number(),
  manualAdjusted: v.boolean(),
});

export default defineSchema({
  ...authTables,
  cards: defineTable({
    userId: v.id("users"),
    playerName: v.string(),
    year: v.string(),
    brand: v.string(),
    cardSet: v.string(),
    cardNumber: v.string(),
    variation: v.string(),
    sport: v.string(),
    team: v.string(),
    grade: v.string(),
    searchQuery: v.string(),
    storageId: v.optional(v.id("_storage")),
    avgPrice: v.number(),
    lowPrice: v.number(),
    highPrice: v.number(),
    totalSales: v.number(),
    lastSalePrice: v.optional(v.number()),
    lastSaleDate: v.optional(v.string()),
    saleListings: v.array(saleListingValidator),
    centering: v.optional(centeringValidator),
    isBorderless: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
});
