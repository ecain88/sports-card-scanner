import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthActions } from "@/lib/auth";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuthActions();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!code.trim() || !newPassword) {
      Alert.alert("Missing fields", "Please enter the code and new password.");
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        email,
        code: code.trim(),
        newPassword,
        flow: "reset-verification",
      });
      Alert.alert("Success", "Password reset! Please sign in with your new password.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Reset failed. Check your code and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🔐</Text>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the code we sent to {email} and choose a new password.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Reset Code"
          placeholderTextColor="#64748b"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
        />
        <TextInput
          style={styles.input}
          placeholder="New Password (min 8 characters)"
          placeholderTextColor="#64748b"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="#64748b"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Resetting…" : "Reset Password"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.link}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  logo: { fontSize: 56, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 32, fontWeight: "800", color: "#f1f5f9", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#94a3b8", textAlign: "center", marginBottom: 32, marginTop: 8, lineHeight: 22 },
  input: {
    backgroundColor: "#1e293b", borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 18, fontSize: 16, color: "#f1f5f9", marginBottom: 14,
    borderWidth: 1, borderColor: "#334155",
  },
  button: {
    backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  link: { color: "#94a3b8", textAlign: "center", fontSize: 15 },
});
