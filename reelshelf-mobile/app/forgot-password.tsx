import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { requestPasswordReset } from '@/lib/supabase/passwordReset';

const NEUTRAL_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. Check your inbox (and spam folder).";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (loading) return; // functional guard, not just the disabled prop below
    setLoading(true);
    setError(null);
    const { error: reqError } = await requestPasswordReset(email);
    setLoading(false);
    if (reqError) {
      setError(reqError);
      return;
    }
    // Same message whether or not this email is actually registered —
    // requestPasswordReset already never distinguishes the two internally.
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter the email on your account and we&apos;ll send you a link to reset your password.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard} accessibilityLiveRegion="polite">
              <Text style={styles.successText}>{NEUTRAL_SUCCESS_MESSAGE}</Text>
              <Pressable style={styles.linkBtn} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to Sign In">
                <Text style={styles.linkBtnLabel}>Back to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label} nativeID="label-fp-email">Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={RS.colors.textMuted}
                  editable={!loading}
                  accessibilityLabel="Email"
                  accessibilityLabelledBy="label-fp-email"
                />
              </View>

              {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

              <Pressable
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSend}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Send Reset Link"
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                {loading ? (
                  <ActivityIndicator color={RS.button.filledText} />
                ) : (
                  <Text style={styles.submitLabel}>Send Reset Link</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  scroll: {
    flexGrow:          1,
    paddingHorizontal: RS.spacing.lg,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.lg,
    gap:               RS.spacing.lg,
  },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  header: {
    gap: RS.spacing.xs,
  },
  title: {
    fontSize:      RS.typography.display - 8,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  subtitle: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    lineHeight: 21,
  },
  form: {
    gap: RS.spacing.md,
  },
  field: {
    gap: RS.spacing.xs,
  },
  label: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  input: {
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm + 2,
    fontSize:          RS.typography.body,
    color:             RS.colors.textPrimary,
  },
  error: {
    fontSize:   RS.typography.caption + 1,
    color:      '#f87171',
    lineHeight: 18,
  },
  submitBtn: {
    borderRadius:    RS.button.radius,
    backgroundColor: RS.button.filledBg,
    paddingVertical: RS.button.paddingV,
    alignItems:      'center',
    marginTop:       RS.spacing.xs,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
  successCard: {
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.md,
    gap:             RS.spacing.md,
  },
  successText: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    lineHeight: 21,
  },
  linkBtn: {
    alignSelf: 'flex-start',
  },
  linkBtnLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.button.primaryText,
  },
});
