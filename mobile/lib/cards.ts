import { ConvexHttpClient } from "convex/browser";
import * as SecureStore from "expo-secure-store";
import { CONVEX_URL } from "./convex";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CardDetails, EbaySalesResult } from "./api";

const JWT_KEY = "__convexAuthJWT";

async function authedHttp(): Promise<ConvexHttpClient> {
  const token = await SecureStore.getItemAsync(JWT_KEY);
  if (!token) throw new Error("Not authenticated");
  const client = new ConvexHttpClient(CONVEX_URL);
  client.setAuth(token);
  return client;
}

export type { Id };

export interface SavedCard {
  _id: Id<"cards">;
  _creationTime: number;
  userId: Id<"users">;
  playerName: string;
  year: string;
  brand: string;
  cardSet: string;
  cardNumber: string;
  variation: string;
  sport: string;
  team: string;
  grade: string;
  searchQuery: string;
  storageId?: Id<"_storage">;
  imageUrl: string | null;
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  totalSales: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  saleListings: SaleListingRow[];
}

export interface SaleListingRow {
  title: string;
  salePrice: number;
  saleDate: string;
  listingUrl: string;
  imageUrl: string;
}

export async function getCollection(): Promise<SavedCard[]> {
  const result = await (await authedHttp()).query(api.cards.getCollection, {});
  return (result ?? []) as SavedCard[];
}

export async function saveCard(
  cardDetails: CardDetails,
  salesData: EbaySalesResult
): Promise<Id<"cards">> {
  return await (await authedHttp()).mutation(api.cards.saveCard, {
    playerName: cardDetails.playerName,
    year: cardDetails.year,
    brand: cardDetails.brand,
    cardSet: cardDetails.set,
    cardNumber: cardDetails.cardNumber,
    variation: cardDetails.variation,
    sport: cardDetails.sport,
    team: cardDetails.team,
    grade: cardDetails.grade,
    searchQuery: cardDetails.searchQuery,
    avgPrice: salesData.averagePrice,
    lowPrice: salesData.lowestPrice,
    highPrice: salesData.highestPrice,
    totalSales: salesData.totalSales,
    lastSalePrice: salesData.lastSalePrice,
    lastSaleDate: salesData.lastSaleDate,
    saleListings: salesData.listings,
  });
}

export async function uploadCardImage(
  localUri: string,
  cardId: Id<"cards">
): Promise<void> {
  const FileSystem = await import("expo-file-system");

  // 1. Get a presigned upload URL from Convex storage
  const uploadUrl = await (await authedHttp()).mutation(api.cards.generateUploadUrl, {});

  // 2. Read file as base64 then convert to binary
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  // 3. Upload to Convex storage
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: binary,
  });
  if (!uploadResponse.ok) throw new Error("Image upload failed");
  const { storageId } = (await uploadResponse.json()) as {
    storageId: Id<"_storage">;
  };

  // 4. Link storageId to the card record
  await (await authedHttp()).mutation(api.cards.updateCardImage, { cardId, storageId });
}

export async function updateCardSales(
  cardId: Id<"cards">,
  salesData: EbaySalesResult
): Promise<void> {
  await (await authedHttp()).mutation(api.cards.updateCardSales, {
    cardId,
    avgPrice: salesData.averagePrice,
    lowPrice: salesData.lowestPrice,
    highPrice: salesData.highestPrice,
    totalSales: salesData.totalSales,
    lastSalePrice: salesData.lastSalePrice,
    lastSaleDate: salesData.lastSaleDate,
    saleListings: salesData.listings,
  });
}

export async function deleteCard(cardId: Id<"cards">): Promise<void> {
  await (await authedHttp()).mutation(api.cards.deleteCard, { cardId });
}
