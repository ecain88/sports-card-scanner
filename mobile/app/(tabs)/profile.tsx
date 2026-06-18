import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useAuthActions } from "@/lib/auth";
import { api } from "../../../convex/_generated/api";

export default function ProfileScreen() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.cards.getCurrentUser);
  const cards = useQuery(api.cards.getCollection) ?? [];

  const totalValue = cards.reduce((s: number, c: { avgPrice: number }) => s + (c.avgPrice ?? 0), 0);
  const topCard = [...cards].sort((a, b) => b.avgPrice - a.avgPrice)[0];
  const topCardLabel = topCard ? `${topCard.playerName} (${topCard.year})` : "—";

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  }

  const name = (currentUser as { name?: string } | null)?.name ?? "Collector";
  const email = (currentUser as { email?: string } | null)?.email ?? "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Cards" value={String(cards.length)} icon="albums" />
        <StatCard label="Est. Value" value={`$${totalValue.toFixed(0)}`} icon="trending-up" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TOP CARD</Text>
        <Text style={styles.topCard}>{topCardLabel}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <MenuItem icon="mail-outline" label="Email" value={email} />
        <MenuItem icon="shield-checkmark-outline" label="Platform" value="Convex" />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as never} size={22} color="#3b82f6" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={styles.menuItem}>
      <Ionicons name={icon as never} size={20} color="#475569" style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { paddingBottom: 60 },
  header: { alignItems: "center", paddingTop: 70, paddingBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  name: { fontSize: 24, fontWeight: "800", color: "#f1f5f9" },
  email: { fontSize: 14, color: "#64748b", marginTop: 4 },
  statsRow: { flexDirection: "row", marginHorizontal: 16, gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: "#1e293b", borderRadius: 14, padding: 16,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#334155",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  statLabel: { fontSize: 12, color: "#64748b" },
  section: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: "#1e293b",
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#334155",
  },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#475569", letterSpacing: 1.2, marginBottom: 10 },
  topCard: { fontSize: 16, color: "#f1f5f9", fontWeight: "600" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: "#cbd5e1" },
  menuValue: { fontSize: 14, color: "#64748b" },
  signOutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginTop: 8, paddingVertical: 16,
    backgroundColor: "#1e293b", borderRadius: 12, borderWidth: 1, borderColor: "#334155",
  },
  signOutText: { color: "#ef4444", fontSize: 16, fontWeight: "700" },
});
