import { useEffect, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
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
import { parseRecoveryTokensFromUrl, updateRecoveryPassword } from '@/lib/supabase/passwordReset';

type Status = 'checking' | 'ready' | 'expired' | 'success';

// Reached only via the reelshelfmobile://reset-password deep link (or its
// web equivalent) that Supabase's password-recovery email points to — see
// lib/supabase/passwordReset.ts for the confirmed implicit-flow token
// format this parses, and contexts/AuthContext.tsx's beginRecoverySession
// for why the resulting session is never exposed as a normal login
// anywhere else in the app. Reaching this screen with no valid recovery
// token (e.g. someone navigates here directly) is treated the same as an
// expired link — there's nothing meaningful to show either way.
export default function ResetPasswordScreen() {
  const { beginRecoverySession, endRecoverySession } = useAuth();
  const [status, setStatus] = useState<Status>('checking');
  const [expiredMessage, setExpiredMessage] = useState('This reset link is no longer valid. Request a new one below.');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // True once a recovery session was actually established — guards the
  // unmount cleanup below from signing out a session that was never opened
  // (e.g. the "expired" branch never calls beginRecoverySession at all).
  const recoverySessionOpenRef = useRef(false);
  // True once the success handler has already ended the recovery session
  // itself — the unmount cleanup must not end it a second time.
  const completedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url: string) {
      const result = parseRecoveryTokensFromUrl(url);
      if (cancelled) return;

      if (result.status === 'expired') {
        setExpiredMessage(result.message);
        setStatus('expired');
        return;
      }
      if (result.status === 'none') {
        // No token in this URL at all — nothing to process yet (could be a
        // warm-start 'url' event for an unrelated link). Only treat as
        // expired if we're still 'checking' once getInitialURL settles.
        return;
      }

      const { error: sessionError } = await beginRecoverySession(result.accessToken, result.refreshToken);
      if (cancelled) return;
      if (sessionError) {
        setExpiredMessage('This reset link is no longer valid. Request a new one below.');
        setStatus('expired');
        return;
      }
      recoverySessionOpenRef.current = true;
      setStatus('ready');

      // Web only: strip the token out of the visible URL/history now that
      // it's been consumed — never leave it sitting in the address bar.
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    Linking.getInitialURL().then((url) => {
      if (cancelled) return;
      if (url) {
        handleUrl(url);
      } else {
        setStatus('expired'); // reached with no link at all
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      cancelled = true;
      sub.remove();
      // Abandoned without completing (navigated away, closed the app) —
      // never leave a live recovery session lingering.
      if (recoverySessionOpenRef.current && !completedRef.current) {
        endRecoverySession().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestNewEmail = () => {
    router.replace('/forgot-password');
  };

  const handleSubmit = async () => {
    if (submitting) return; // functional guard, not just the disabled prop below
    setError(null);

    if (password.length === 0) {
      setError('Enter a new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updateRecoveryPassword(password);
    setSubmitting(false);

    if (updateError) {
      setError(updateError);
      return;
    }

    completedRef.current = true;
    setPassword('');
    setConfirmPassword('');
    await endRecoverySession();
    setStatus('success');
  };

  const handleContinueToSignIn = () => {
    router.replace('/login');
  };

  if (status === 'checking') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={RS.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'expired') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.expiredTitle}>Link no longer valid</Text>
          <Text style={styles.expiredMessage}>{expiredMessage}</Text>
          <Pressable style={styles.submitBtn} onPress={handleRequestNewEmail}>
            <Text style={styles.submitLabel}>Request a new email</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'success') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.expiredTitle}>Password updated</Text>
          <Text style={styles.expiredMessage}>You can now sign in with your new password.</Text>
          <Pressable style={styles.submitBtn} onPress={handleContinueToSignIn}>
            <Text style={styles.submitLabel}>Continue to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Set a new password</Text>
            <Text style={styles.subtitle}>Choose a new password for your account.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={RS.colors.textMuted}
                  editable={!submitting}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                  <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={RS.colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  placeholder="••••••••"
                  placeholderTextColor={RS.colors.textMuted}
                  editable={!submitting}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                  <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={20} color={RS.colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={RS.button.filledText} />
              ) : (
                <Text style={styles.submitLabel}>Update Password</Text>
              )}
            </Pressable>
          </View>
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
  centered: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               RS.spacing.md,
    paddingHorizontal: RS.spacing.lg,
  },
  expiredTitle: {
    fontSize:      RS.typography.display - 8,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    letterSpacing: RS.letterSpacing.tight,
  },
  expiredMessage: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    textAlign:  'center',
    lineHeight: 21,
  },
  scroll: {
    flexGrow:          1,
    paddingHorizontal: RS.spacing.lg,
    paddingTop:        RS.spacing.xl,
    paddingBottom:     RS.spacing.lg,
    gap:               RS.spacing.lg,
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
  passwordRow: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    paddingHorizontal: RS.spacing.md,
  },
  passwordInput: {
    flex:            1,
    paddingVertical: RS.spacing.sm + 2,
    fontSize:        RS.typography.body,
    color:           RS.colors.textPrimary,
  },
  eyeBtn: {
    padding: 4,
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
    paddingHorizontal: RS.button.paddingH,
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
});
