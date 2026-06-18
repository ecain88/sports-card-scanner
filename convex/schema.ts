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
    saleListings: v.array(saleListingValidator),
  }).index("by_user", ["userId"]),
});
