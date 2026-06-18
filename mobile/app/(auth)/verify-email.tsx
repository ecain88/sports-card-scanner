import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [resending, setResending] = useState(false);

  async function resendEmail() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    setResending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Sent!', 'Verification email resent. Check your inbox.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✉️</Text>
      <Text style={styles.title}>Check Your Email</Text>
      <Text style={styles.body}>
        We sent a verification link to your email address.{'\n\n'}
        Click the link in that email to verify your account, then come back and sign in.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={resendEmail}
        disabled={resending}
      >
        <Text style={styles.buttonText}>{resending ? 'Sending…' : 'Resend Email'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.link}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  button: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  buttonText: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  link: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },
});
