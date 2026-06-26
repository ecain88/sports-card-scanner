import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Linking,
} from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { refreshCardSales, EbaySalesResult } from "@/lib/api";
import { updateCardSales, deleteCard } from "@/lib/cards";

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const card = useQuery(api.cards.getCard, { cardId: id as Id<"cards"> });

  async function handleRefreshSales() {
    if (!card) return;
    setRefreshing(true);
    try {
      const salesData: EbaySalesResult = await refreshCardSales(card.searchQuery);
      await updateCardSales(card._id, salesData);
      Alert.alert("Updated", "eBay sales data refreshed.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Remove Card", "Remove this card from your collection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!card) return;
          await deleteCard(card._id);
          router.back();
        },
      },
    ]);
  }

  if (card === undefined) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (card === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: "#f1f5f9" }}>Card not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color="#f1f5f9" />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.cardImage} contentFit="contain" />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImageEmoji}>🃏</Text>
        </View>
      )}

      <Text style={styles.playerName}>{card.playerName}</Text>
      <Text style={styles.cardMeta}>{card.year} · {card.brand} · {card.cardSet}</Text>
      {card.variation ? <Text style={styles.variation}>{card.variation}</Text> : null}
      {card.grade !== "Raw" && <Text style={styles.grade}>{card.grade}</Text>}

      {(card.lastSalePrice ?? 0) > 0 && (
        <View style={styles.lastSaleBox}>
          <Text style={styles.lastSaleLabel}>Last Sale Comp</Text>
          <Text style={styles.lastSalePrice}>${(card.lastSalePrice ?? 0).toFixed(2)}</Text>
          {card.lastSaleDate ? (
            <Text style={styles.lastSaleDate}>
              {new Date(card.lastSaleDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.priceGrid}>
        <PriceStat label="Average" value={card.avgPrice} accent="#3b82f6" />
        <PriceStat label="Lowest" value={card.lowPrice} accent="#22c55e" />
        <PriceStat label="Highest" value={card.highPrice} accent="#f59e0b" />
      </View>

      <TouchableOpacity
        style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}
        onPress={handleRefreshSales}
        disabled={refreshing}
      >
        {refreshing
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="refresh" size={18} color="#fff" />
        }
        <Text style={styles.refreshButtonText}>
          {refreshing ? "Refreshing…" : "Refresh eBay Sales"}
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Details</Text>
        <DetailRow label="Player" value={card.playerName} />
        <DetailRow label="Year" value={card.year} />
        <DetailRow label="Brand" value={card.brand} />
        <DetailRow label="Set" value={card.cardSet} />
        <DetailRow label="Card #" value={card.cardNumber} />
        {card.variation ? <DetailRow label="Variation" value={card.variation} /> : null}
        <DetailRow label="Sport" value={card.sport} />
        <DetailRow label="Team" value={card.team} />
        <DetailRow label="Grade" value={card.grade} />
        <DetailRow label="Total Sales" value={String(card.totalSales)} />
        <DetailRow label="Added" value={new Date(card._creationTime).toLocaleDateString()} />
      </View>

      {card.saleListings?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent eBay Sales</Text>
          {card.saleListings.map((listing, i) => (
            <TouchableOpacity
              key={i}
              style={styles.listingRow}
              onPress={() => Linking.openURL(listing.listingUrl)}
            >
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                <Text style={styles.listingDate}>{new Date(listing.saleDate).toLocaleDateString()}</Text>
              </View>
              <View style={styles.listingRight}>
                <Text style={styles.listingPrice}>${listing.salePrice.toFixed(2)}</Text>
                <Ionicons name="open-outline" size={14} color="#475569" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function PriceStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.priceStat}>
      <Text style={[styles.priceValue, { color: accent }]}>
        {value > 0 ? `$${value.toFixed(2)}` : "—"}
      </Text>
      <Text style={styles.priceLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  centered: { justifyContent: "center", alignItems: "center" },
  content: { paddingBottom: 60 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 },
  backButton: { padding: 4 },
  deleteButton: { padding: 4 },
  cardImage: { width: "100%", height: 300, backgroundColor: "#1e293b" },
  cardImagePlaceholder: { width: "100%", height: 200, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  cardImageEmoji: { fontSize: 64 },
  playerName: { fontSize: 28, fontWeight: "800", color: "#f1f5f9", textAlign: "center", marginTop: 20, paddingHorizontal: 20 },
  cardMeta: { fontSize: 15, color: "#64748b", textAlign: "center", marginTop: 6 },
  variation: { fontSize: 14, color: "#8b5cf6", textAlign: "center", fontWeight: "600", marginTop: 4 },
  grade: { fontSize: 14, color: "#f59e0b", textAlign: "center", fontWeight: "600", marginTop: 4 },
  lastSaleBox: { marginHorizontal: 16, marginTop: 20, marginBottom: 8, backgroundColor: "#0c2340", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: "#1d4ed8", alignItems: "center" },
  lastSaleLabel: { fontSize: 11, fontWeight: "700", color: "#60a5fa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  lastSalePrice: { fontSize: 36, fontWeight: "900", color: "#f1f5f9" },
  lastSaleDate: { fontSize: 13, color: "#60a5fa", marginTop: 2 },
  priceGrid: { flexDirection: "row", justifyContent: "space-around", marginVertical: 24, marginHorizontal: 16, backgroundColor: "#1e293b", borderRadius: 14, paddingVertical: 20, borderWidth: 1, borderColor: "#334155" },
  priceStat: { alignItems: "center" },
  priceValue: { fontSize: 22, fontWeight: "800" },
  priceLabel: { color: "#64748b", fontSize: 12, marginTop: 4 },
  refreshButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 14, marginHorizontal: 16, marginBottom: 20 },
  refreshButtonDisabled: { opacity: 0.6 },
  refreshButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  section: { margin: 16, backgroundColor: "#1e293b", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#334155" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  detailLabel: { color: "#64748b", fontSize: 15 },
  detailValue: { color: "#f1f5f9", fontSize: 15, fontWeight: "600", flex: 1, textAlign: "right" },
  listingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  listingInfo: { flex: 1, paddingRight: 12 },
  listingTitle: { color: "#cbd5e1", fontSize: 13, lineHeight: 18 },
  listingDate: { color: "#475569", fontSize: 12, marginTop: 2 },
  listingRight: { alignItems: "flex-end", gap: 4 },
  listingPrice: { color: "#22c55e", fontSize: 15, fontWeight: "700" },
});
