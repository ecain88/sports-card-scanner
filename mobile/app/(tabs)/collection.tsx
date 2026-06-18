import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, TextInput,
} from "react-native";
import { Image } from "expo-image";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type CardRow = {
  _id: Id<"cards">;
  playerName: string;
  year: string;
  brand: string;
  sport: string;
  grade: string;
  avgPrice: number;
  imageUrl: string | null;
};

export default function CollectionScreen() {
  const router = useRouter();
  const rawCards = useQuery(api.cards.getCollection) ?? [];
  const deleteCardMutation = useMutation(api.cards.deleteCard);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const cards = rawCards as CardRow[];

  const filtered = search.trim()
    ? cards.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.playerName.toLowerCase().includes(q) ||
          c.year.includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.sport.toLowerCase().includes(q)
        );
      })
    : cards;

  async function onRefresh() {
    setRefreshing(true);
    // useQuery is reactive — just a small delay for UX
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }

  function confirmDelete(card: CardRow) {
    Alert.alert(
      "Remove Card",
      `Remove ${card.playerName} from your collection?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteCardMutation({ cardId: card._id }),
        },
      ]
    );
  }

  const totalValue = filtered.reduce((sum, c) => sum + (c.avgPrice ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Collection</Text>
        <Text style={styles.headerSub}>{cards.length} cards · Est. value ${totalValue.toFixed(2)}</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#475569" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by player, year, brand…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>
              {search ? "No cards match your search" : "No cards yet"}
            </Text>
            <Text style={styles.emptyBody}>
              {search ? "Try a different search term" : "Scan your first card to start building your collection"}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push("/(tabs)/scan")}>
                <Text style={styles.emptyButtonText}>Scan a Card</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cardTile}
            onPress={() => router.push(`/card/${item._id}`)}
            onLongPress={() => confirmDelete(item)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.cardThumb} contentFit="cover" />
            ) : (
              <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                <Text style={styles.cardThumbEmoji}>🃏</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardPlayer} numberOfLines={1}>{item.playerName}</Text>
              <Text style={styles.cardMeta}>{item.year} · {item.brand}</Text>
              {item.grade !== "Raw" && <Text style={styles.cardGrade}>{item.grade}</Text>}
              <Text style={styles.cardPrice}>
                {item.avgPrice ? `$${item.avgPrice.toFixed(2)} avg` : "No data"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#f1f5f9" },
  headerSub: { fontSize: 14, color: "#64748b", marginTop: 4 },
  searchRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#1e293b", borderRadius: 12, borderWidth: 1,
    borderColor: "#334155", paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#f1f5f9", fontSize: 15, paddingVertical: 12 },
  listContent: { paddingHorizontal: 12, paddingBottom: 100 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#f1f5f9", marginBottom: 8 },
  emptyBody: { fontSize: 14, color: "#64748b", textAlign: "center", paddingHorizontal: 32, marginBottom: 24 },
  emptyButton: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cardTile: {
    flex: 1, backgroundColor: "#1e293b", borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: "#334155",
  },
  cardThumb: { width: "100%", aspectRatio: 0.72 },
  cardThumbPlaceholder: { backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  cardThumbEmoji: { fontSize: 40 },
  cardInfo: { padding: 10 },
  cardPlayer: { color: "#f1f5f9", fontSize: 13, fontWeight: "700" },
  cardMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  cardGrade: { color: "#f59e0b", fontSize: 12, fontWeight: "600", marginTop: 2 },
  cardPrice: { color: "#22c55e", fontSize: 13, fontWeight: "700", marginTop: 4 },
});
