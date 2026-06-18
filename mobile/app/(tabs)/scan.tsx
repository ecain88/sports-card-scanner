import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  ScrollView, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { scanCardImage, ScanResult } from '@/lib/api';
import { saveCard, uploadCardImage } from '@/lib/cards';

type ScanState = 'capture' | 'review' | 'scanning' | 'result' | 'saving';
type CaptureStep = 'front' | 'back';

export default function ScanScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>('capture');
  const [captureStep, setCaptureStep] = useState<CaptureStep>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function captureImage(source: 'camera' | 'library') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (source === 'camera' && !perm.granted) {
      Alert.alert('Permission required', 'Camera access is needed to scan cards.');
      return;
    }

    // quality 0.4 keeps file small enough to send quickly; base64 for both sides now
    const options = { quality: 0.4, allowsEditing: false, base64: true };
    const pickerResult = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (pickerResult.canceled) return;

    const asset = pickerResult.assets[0];

    if (captureStep === 'front') {
      setFrontUri(asset.uri);
      setFrontBase64(asset.base64 ?? null);
      setCaptureStep('back');
    } else {
      setBackUri(asset.uri);
      setBackBase64(asset.base64 ?? null);
      setState('review');
    }
  }

  function retakePhoto(side: 'front' | 'back') {
    if (side === 'front') {
      setFrontUri(null);
      setFrontBase64(null);
      setBackUri(null);
      setBackBase64(null);
      setCaptureStep('front');
    } else {
      setBackUri(null);
      setBackBase64(null);
      setCaptureStep('back');
    }
    setState('capture');
  }

  async function handleSubmit() {
    if (!frontUri || !frontBase64) {
      Alert.alert('Missing photo', 'Please retake the front photo and try again.');
      return;
    }
    setState('scanning');
    setError(null);
    try {
      const scanResult = await scanCardImage(frontBase64, backBase64 ?? undefined);
      setResult(scanResult);
      setState('result');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setError(message);
      setState('review');
      Alert.alert('Scan Failed', message);
    }
  }

  async function handleSave() {
    if (!result) return;
    setState('saving');
    try {
      const cardId = await saveCard(result.cardDetails, result.salesData);

      // Upload front image in background — Convex links storageId to the card
      if (frontUri) {
        uploadCardImage(frontUri, cardId)
          .catch((e) => console.warn('Image upload failed (non-fatal):', e));
      }

      Alert.alert('Saved!', 'Card added to your collection.', [
        { text: 'View Collection', onPress: () => router.push('/(tabs)/collection') },
        { text: 'Scan Another', onPress: resetScan },
      ]);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
      setState('result');
    }
  }

  function resetScan() {
    setFrontUri(null);
    setFrontBase64(null);
    setBackUri(null);
    setBackBase64(null);
    setCaptureStep('front');
    setResult(null);
    setError(null);
    setState('capture');
  }

  // ── Loading states ──────────────────────────────────────────────────────────
  if (state === 'scanning') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Analyzing card…</Text>
        <Text style={styles.loadingSubtext}>Identifying card and fetching eBay sales data</Text>
      </View>
    );
  }

  if (state === 'saving') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Saving to collection…</Text>
      </View>
    );
  }

  // ── Capture screen ──────────────────────────────────────────────────────────
  if (state === 'capture') {
    const isFront = captureStep === 'front';
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isFront ? 'Step 1 of 2' : 'Step 2 of 2'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isFront
              ? 'Take a photo of the front of your card'
              : 'Now take a photo of the back of your card'}
          </Text>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          <View style={[styles.progressStep, styles.progressStepDone]}>
            {frontUri
              ? <Ionicons name="checkmark" size={16} color="#fff" />
              : <Text style={styles.progressStepText}>1</Text>}
          </View>
          <View style={[styles.progressLine, frontUri ? styles.progressLineDone : null]} />
          <View style={[styles.progressStep, !isFront ? styles.progressStepActive : styles.progressStepInactive]}>
            <Text style={styles.progressStepText}>2</Text>
          </View>
        </View>

        {/* Front thumbnail if captured */}
        {frontUri && (
          <View style={styles.thumbnailRow}>
            <View style={styles.thumbnailContainer}>
              <Image source={{ uri: frontUri }} style={styles.thumbnail} contentFit="cover" />
              <Text style={styles.thumbnailLabel}>Front ✓</Text>
            </View>
            <View style={[styles.thumbnailContainer, styles.thumbnailPlaceholder]}>
              <Ionicons name="camera" size={28} color="#475569" />
              <Text style={styles.thumbnailLabel}>Back</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.scanButtons}>
          <TouchableOpacity style={styles.scanButton} onPress={() => captureImage('camera')}>
            <Ionicons name="camera" size={36} color="#3b82f6" />
            <Text style={styles.scanButtonTitle}>
              {isFront ? 'Take Front Photo' : 'Take Back Photo'}
            </Text>
            <Text style={styles.scanButtonSub}>Open camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanButtonSecondary} onPress={() => captureImage('library')}>
            <Ionicons name="images" size={24} color="#8b5cf6" />
            <Text style={styles.scanButtonSecondaryText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>

        {frontUri && (
          <TouchableOpacity style={styles.retakeLink} onPress={() => retakePhoto('front')}>
            <Text style={styles.retakeLinkText}>Retake front photo</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Tips for best results:</Text>
          <Text style={styles.tipText}>• Good lighting — avoid glare</Text>
          <Text style={styles.tipText}>• Lay card flat on a dark surface</Text>
          <Text style={styles.tipText}>• Make sure text is legible</Text>
        </View>
      </View>
    );
  }

  // ── Review screen ───────────────────────────────────────────────────────────
  if (state === 'review') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Review Photos</Text>
          <Text style={styles.headerSubtitle}>Make sure both sides are clear before submitting</Text>
        </View>

        <View style={styles.reviewGrid}>
          <View style={styles.reviewCard}>
            <Image source={{ uri: frontUri! }} style={styles.reviewImage} contentFit="cover" />
            <View style={styles.reviewFooter}>
              <Text style={styles.reviewLabel}>Front</Text>
              <TouchableOpacity onPress={() => retakePhoto('front')}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.reviewCard}>
            {backUri ? (
              <>
                <Image source={{ uri: backUri }} style={styles.reviewImage} contentFit="cover" />
                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewLabel}>Back</Text>
                  <TouchableOpacity onPress={() => retakePhoto('back')}>
                    <Text style={styles.retakeText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={[styles.reviewImage, styles.reviewImagePlaceholder]}>
                <Ionicons name="camera-outline" size={32} color="#475569" />
                <Text style={styles.reviewPlaceholderText}>No back photo</Text>
              </View>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Submit & Get Prices</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetScan}>
          <Text style={styles.resetButtonText}>Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (state === 'result' && result) {
    const { cardDetails, salesData } = result;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.reviewGrid}>
          {frontUri && <Image source={{ uri: frontUri }} style={styles.resultImage} contentFit="cover" />}
          {backUri && <Image source={{ uri: backUri }} style={styles.resultImage} contentFit="cover" />}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Details</Text>
          <DetailRow label="Player" value={cardDetails.playerName} />
          <DetailRow label="Year" value={cardDetails.year} />
          <DetailRow label="Brand" value={cardDetails.brand} />
          <DetailRow label="Set" value={cardDetails.set} />
          <DetailRow label="Card #" value={cardDetails.cardNumber} />
          {cardDetails.variation ? <DetailRow label="Variation" value={cardDetails.variation} /> : null}
          <DetailRow label="Sport" value={cardDetails.sport} />
          <DetailRow label="Grade" value={cardDetails.grade} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>eBay Completed Sales</Text>
          {salesData.totalSales > 0 ? (
            <>
              <View style={styles.priceGrid}>
                <PriceStat label="Average" value={salesData.averagePrice} accent="#3b82f6" />
                <PriceStat label="Lowest" value={salesData.lowestPrice} accent="#22c55e" />
                <PriceStat label="Highest" value={salesData.highestPrice} accent="#f59e0b" />
              </View>
              <Text style={styles.saleCount}>Based on {salesData.totalSales} recent sales</Text>
              {salesData.listings.slice(0, 5).map((listing, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.listingRow}
                  onPress={() => Linking.openURL(listing.listingUrl)}
                >
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                    <Text style={styles.listingDate}>{new Date(listing.saleDate).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.listingPrice}>${listing.salePrice.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <Text style={styles.noSales}>No recent completed sales found on eBay.</Text>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="bookmark" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Save to Collection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={resetScan}>
            <Text style={styles.resetButtonText}>Scan Another Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
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
      <Text style={[styles.priceValue, { color: accent }]}>${value.toFixed(2)}</Text>
      <Text style={styles.priceLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 48 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
  headerSubtitle: { fontSize: 15, color: '#64748b', marginTop: 6, lineHeight: 22 },
  loadingText: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginTop: 20 },
  loadingSubtext: { color: '#64748b', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, marginBottom: 24 },
  progressStep: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressStepDone: { backgroundColor: '#22c55e' },
  progressStepActive: { backgroundColor: '#3b82f6' },
  progressStepInactive: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  progressStepText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progressLine: { flex: 1, height: 2, backgroundColor: '#1e293b', marginHorizontal: 8 },
  progressLineDone: { backgroundColor: '#22c55e' },

  // Thumbnails during capture
  thumbnailRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  thumbnailContainer: { flex: 1, alignItems: 'center', gap: 6 },
  thumbnail: { width: '100%', aspectRatio: 0.72, borderRadius: 10 },
  thumbnailPlaceholder: { backgroundColor: '#1e293b', borderRadius: 10, aspectRatio: 0.72, justifyContent: 'center' },
  thumbnailLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  // Capture buttons
  scanButtons: { paddingHorizontal: 24, gap: 12 },
  scanButton: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  scanButtonTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginTop: 10 },
  scanButtonSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  scanButtonSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  scanButtonSecondaryText: { color: '#8b5cf6', fontSize: 15, fontWeight: '600' },
  retakeLink: { alignItems: 'center', marginTop: 12 },
  retakeLinkText: { color: '#475569', fontSize: 14 },

  // Review
  reviewGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  reviewCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  reviewImage: { width: '100%', aspectRatio: 0.72 },
  reviewImagePlaceholder: { backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reviewPlaceholderText: { color: '#475569', fontSize: 12 },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  reviewLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  retakeText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },

  // Submit
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 18,
    marginHorizontal: 16, marginBottom: 12,
  },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  resetButton: { alignItems: 'center', paddingVertical: 12 },
  resetButtonText: { color: '#475569', fontSize: 15 },

  // Results
  resultImage: { flex: 1, aspectRatio: 0.72, borderRadius: 10 },
  section: { margin: 16, backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  detailLabel: { color: '#64748b', fontSize: 15 },
  detailValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right' },
  priceGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  priceStat: { alignItems: 'center' },
  priceValue: { fontSize: 24, fontWeight: '800' },
  priceLabel: { color: '#64748b', fontSize: 12, marginTop: 2 },
  saleCount: { color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  listingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a',
  },
  listingInfo: { flex: 1, paddingRight: 12 },
  listingTitle: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  listingDate: { color: '#475569', fontSize: 12, marginTop: 2 },
  listingPrice: { color: '#22c55e', fontSize: 15, fontWeight: '700' },
  noSales: { color: '#64748b', textAlign: 'center', paddingVertical: 16 },
  actionRow: { marginHorizontal: 16, gap: 12 },
  saveButton: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  errorBox: { marginHorizontal: 24, backgroundColor: '#450a0a', borderRadius: 10, padding: 14, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 14 },
  tipBox: { margin: 24, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  tipTitle: { color: '#94a3b8', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  tipText: { color: '#64748b', fontSize: 13, lineHeight: 22 },
});
