// Real account deletion — calls the deployed delete-account Edge Function
// (supabase/functions/delete-account), which re-verifies the password
// server-side, cleans up Storage, then deletes the auth user, cascading
// across every user-owned table (see the Edge Function's own header comment
// for the full, verified cascade list this warning copy is derived from).
import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { deleteOwnAccount } from '@/lib/supabase/deleteAccount';

const WHAT_GETS_DELETED = [
  'Your profile, avatar, and account info',
  'Every diary entry, rating, and review you’ve written — plus their comments, likes, and reactions',
  'Any photos or GIFs attached to your diary entries',
  'Your Mount Rushmore picks',
  'Every list you’ve created, plus lists you’ve liked or saved',
  'Your followers and everyone you follow',
  'Notifications — both ones sent to you, and ones your own activity generated for others',
  'Comments and reactions you’ve left on other people’s reviews',
  'Your saved/watchlist items',
  'Your trivia answers and progress',
  'Badges you’ve earned',
  'Your Daily Reel picks and progress',
];

export default function DeleteAccountScreen() {
  const { user, signOut } = useAuth();
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = acknowledged && password.length > 0 && confirmText.trim().toUpperCase() === 'DELETE' && !loading;

  const handleConfirm = async () => {
    if (!user?.email || !canConfirm) return;
    setLoading(true);
    setError(null);
    const { error: deleteError } = await deleteOwnAccount(user.email, password);
    setLoading(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Delete your account</Text>
          <Text style={styles.subtitle}>This is permanent. Nothing is retained — everything below is removed and cannot be recovered.</Text>

          <View style={styles.list}>
            {WHAT_GETS_DELETED.map((item) => (
              <View key={item} style={styles.listRow}>
                <Text style={styles.listBullet}>—</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.ackRow} onPress={() => setAcknowledged((v) => !v)}>
            <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
              {acknowledged && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.ackText}>I understand this permanently deletes everything listed above and cannot be undone.</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Confirm your password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Current password"
            placeholderTextColor={RS.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>Type DELETE to confirm</Text>
          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor={RS.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            disabled={!canConfirm}
            onPress={handleConfirm}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.confirmBtnLabel}>Permanently delete my account</Text>}
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelBtnLabel}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RS.colors.base },
  content: { padding: RS.spacing.lg, gap: RS.spacing.sm },
  title: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary },
  subtitle: { fontSize: RS.typography.body, color: '#f87171', marginBottom: RS.spacing.sm },
  list: { gap: RS.spacing.xs, marginBottom: RS.spacing.md },
  listRow: { flexDirection: 'row', gap: RS.spacing.xs },
  listBullet: { color: RS.colors.textMuted, fontSize: RS.typography.body },
  listText: { flex: 1, color: RS.colors.textSecondary, fontSize: RS.typography.body, lineHeight: 19 },
  ackRow: { flexDirection: 'row', gap: RS.spacing.sm, alignItems: 'flex-start', marginVertical: RS.spacing.md },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: RS.colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkboxMark: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  ackText: { flex: 1, color: RS.colors.textPrimary, fontSize: RS.typography.body, lineHeight: 19 },
  fieldLabel: { fontSize: RS.typography.caption, color: RS.colors.textSecondary, marginTop: RS.spacing.sm, marginBottom: RS.spacing.xs, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  input: {
    backgroundColor: RS.colors.elevated, borderRadius: 10, borderWidth: 0.5, borderColor: RS.colors.border,
    paddingHorizontal: RS.spacing.md, paddingVertical: 12, color: RS.colors.textPrimary, fontSize: RS.typography.body,
  },
  errorText: { color: '#f87171', fontSize: RS.typography.body, marginTop: RS.spacing.sm },
  confirmBtn: {
    backgroundColor: '#ef4444', borderRadius: RS.button.radius, paddingVertical: 14,
    alignItems: 'center', marginTop: RS.spacing.lg,
  },
  confirmBtnDisabled: { backgroundColor: 'rgba(239,68,68,0.25)' },
  confirmBtnLabel: { color: '#ffffff', fontSize: RS.typography.body, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: RS.spacing.md },
  cancelBtnLabel: { color: RS.colors.textSecondary, fontSize: RS.typography.body, fontWeight: '600' },
});
