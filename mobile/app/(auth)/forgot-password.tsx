import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuthActions } from "@/lib/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", { email: email.trim(), flow: "reset" });
      router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not send reset code.");
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
        <Text style={styles.logo}>🔑</Text>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a reset code.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Sending…" : "Send Reset Code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
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
