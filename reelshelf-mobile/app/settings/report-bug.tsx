// Real bug reports — inserts directly into the confirmed-real beta_feedback
// table (same table/columns/categories as the website's BetaFeedbackButton.tsx:
// bug/feature/ui/performance/other). Screenshot upload reuses the existing
// review-attachment upload path (uploadReviewImage), same as the Review
// Composer — no second upload implementation.
import * as ImagePicker from 'expo-image-picker';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { uploadReviewImage } from '@/lib/supabase/attachments';

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'ui', label: 'UI Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
] as const;

export default function ReportBugScreen() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('bug');
  const [message, setMessage] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to attach a screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || !result.assets?.[0]) return;
    setScreenshotUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!message.trim() || !supabase) return;
    setSubmitting(true);
    setError(null);

    let screenshotUrl: string | null = null;
    if (screenshotUri) {
      const uploadResult = await uploadReviewImage(screenshotUri, 'image/jpeg', 'screenshot.jpg');
      if ('url' in uploadResult) screenshotUrl = uploadResult.url;
      // A failed screenshot upload doesn't block the report itself.
    }

    const { error: insertError } = await supabase.from('beta_feedback').insert({
      user_id: user?.id ?? null,
      category,
      message: message.trim(),
      page_url: pathname,
      screenshot_url: screenshotUrl,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
    setTimeout(() => router.back(), 1400);
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]} edges={['top', 'bottom']}>
        <MaterialIcons name="check-circle" size={40} color={RS.colors.accent} />
        <Text style={styles.submittedText}>Thanks — your report was sent.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="close" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Report a Bug</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.value}
                style={[styles.categoryChip, category === c.value && styles.categoryChipActive]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={[styles.categoryChipLabel, category === c.value && styles.categoryChipLabelActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>What happened?</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the issue..."
            placeholderTextColor={RS.colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>Screenshot (optional)</Text>
          {screenshotUri ? (
            <View style={styles.screenshotPreviewWrap}>
              <Image source={{ uri: screenshotUri }} style={styles.screenshotPreview} />
              <Pressable style={styles.removeScreenshotBtn} onPress={() => setScreenshotUri(null)}>
                <MaterialIcons name="close" size={16} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.attachBtn} onPress={pickScreenshot}>
              <MaterialIcons name="add-photo-alternate" size={18} color={RS.colors.textSecondary} />
              <Text style={styles.attachBtnLabel}>Attach a screenshot</Text>
            </Pressable>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.submitBtn, (!message.trim() || submitting) && styles.submitBtnDisabled]}
            disabled={!message.trim() || submitting}
            onPress={handleSubmit}
          >
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitBtnLabel}>Send Report</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RS.colors.base },
  centered: { alignItems: 'center', justifyContent: 'center', gap: RS.spacing.sm },
  submittedText: { fontSize: RS.typography.body, color: RS.colors.textPrimary, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  headerTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  content: { padding: RS.spacing.md, gap: RS.spacing.sm },
  fieldLabel: {
    fontSize: RS.typography.caption, color: RS.colors.textSecondary, marginTop: RS.spacing.sm,
    textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs },
  categoryChip: {
    borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated, paddingHorizontal: 12, paddingVertical: 7,
  },
  categoryChipActive: { backgroundColor: RS.button.primaryFill, borderColor: RS.button.primaryBorder },
  categoryChipLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  categoryChipLabelActive: { color: RS.button.primaryText },
  messageInput: {
    backgroundColor: RS.colors.elevated, borderRadius: 10, borderWidth: 0.5, borderColor: RS.colors.border,
    paddingHorizontal: RS.spacing.md, paddingVertical: 12, color: RS.colors.textPrimary, fontSize: RS.typography.body,
    minHeight: 120,
  },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs,
    borderRadius: 10, borderWidth: 0.5, borderColor: RS.colors.border, borderStyle: 'dashed',
    paddingHorizontal: RS.spacing.md, paddingVertical: 12,
  },
  attachBtnLabel: { fontSize: RS.typography.body, color: RS.colors.textSecondary },
  screenshotPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  screenshotPreview: { width: 96, height: 96, borderRadius: 10, backgroundColor: RS.colors.elevated },
  removeScreenshotBtn: {
    position: 'absolute', top: -6, right: -6, backgroundColor: '#000000', borderRadius: 10, padding: 3,
  },
  errorText: { color: '#f87171', fontSize: RS.typography.body, marginTop: RS.spacing.sm },
  submitBtn: {
    backgroundColor: RS.button.filledBg, borderRadius: RS.button.radius, paddingVertical: 14,
    alignItems: 'center', marginTop: RS.spacing.lg,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnLabel: { color: '#ffffff', fontSize: RS.typography.body, fontWeight: '700' },
});
