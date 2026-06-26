import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCollection = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      cards.map(async (card) => ({
        ...card,
        imageUrl: card.storageId ? await ctx.storage.getUrl(card.storageId) : null,
      }))
    );
  },
});

export const getCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const card = await ctx.db.get(args.cardId);
    if (!card || card.userId !== userId) return null;

    return {
      ...card,
      imageUrl: card.storageId ? await ctx.storage.getUrl(card.storageId) : null,
    };
  },
});

export const saveCard = mutation({
  args: {
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
    avgPrice: v.number(),
    lowPrice: v.number(),
    highPrice: v.number(),
    totalSales: v.number(),
    lastSalePrice: v.optional(v.number()),
    lastSaleDate: v.optional(v.string()),
    saleListings: v.array(
      v.object({
        title: v.string(),
        salePrice: v.number(),
        saleDate: v.string(),
        listingUrl: v.string(),
        imageUrl: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("cards", {
      userId,
      ...args,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateCardImage = mutation({
  args: {
    cardId: v.id("cards"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card || card.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.cardId, { storageId: args.storageId });
  },
});

export const updateCardSales = mutation({
  args: {
    cardId: v.id("cards"),
    avgPrice: v.number(),
    lowPrice: v.number(),
    highPrice: v.number(),
    totalSales: v.number(),
    lastSalePrice: v.optional(v.number()),
    lastSaleDate: v.optional(v.string()),
    saleListings: v.array(
      v.object({
        title: v.string(),
        salePrice: v.number(),
        saleDate: v.string(),
        listingUrl: v.string(),
        imageUrl: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card || card.userId !== userId) throw new Error("Not found");

    const { cardId, ...updates } = args;
    await ctx.db.patch(cardId, updates);
  },
});

export const deleteCard = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const card = await ctx.db.get(args.cardId);
    if (!card || card.userId !== userId) throw new Error("Not found");

    if (card.storageId) {
      await ctx.storage.delete(card.storageId);
    }
    await ctx.db.delete(args.cardId);
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
