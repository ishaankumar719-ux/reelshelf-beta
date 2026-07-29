import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { resendVerificationEmail } from '@/lib/supabase/emailVerification';

const RESEND_COOLDOWN_SECONDS = 60;

// Reached right after a signup that requires email confirmation (signUp()
// returned no session — see app/login.tsx's handleSignUp). Never renders
// with a session active; this is a pure "waiting for the user to check
// their inbox" state, not a gated/personalized screen.
export default function VerifyPendingScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resending || cooldown > 0 || !email) return; // functional guard, not just the disabled prop below
    setResending(true);
    setMessage(null);
    const { error } = await resendVerificationEmail(email);
    setResending(false);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage('Email resent — check your inbox.');
    startCooldown();
  };

  const handleChangeEmail = () => {
    router.replace(`/login?mode=signup&email=${encodeURIComponent(email ?? '')}`);
  };

  const handleBackToSignIn = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to{email ? ` ${email}` : ' your inbox'}. Tap it to finish creating your account.
        </Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable
          style={[styles.resendBtn, (resending || cooldown > 0) && styles.resendBtnDisabled]}
          onPress={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending ? (
            <ActivityIndicator color={RS.button.filledText} />
          ) : (
            <Text style={styles.resendLabel}>
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Email'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleChangeEmail} hitSlop={8} style={styles.linkBtn}>
          <Text style={styles.linkLabel}>Change email</Text>
        </Pressable>

        <Pressable onPress={handleBackToSignIn} hitSlop={8} style={styles.linkBtn}>
          <Text style={styles.linkLabel}>Back to Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  content: {
    flex:              1,
    justifyContent:    'center',
    paddingHorizontal: RS.spacing.lg,
    gap:               RS.spacing.md,
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
  message: {
    fontSize:   RS.typography.caption + 1,
    color:      RS.colors.accent,
    lineHeight: 18,
  },
  resendBtn: {
    borderRadius:    RS.button.radius,
    backgroundColor: RS.button.filledBg,
    paddingVertical: RS.button.paddingV,
    alignItems:      'center',
    marginTop:       RS.spacing.sm,
  },
  resendBtnDisabled: {
    opacity: 0.6,
  },
  resendLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: RS.spacing.xs,
  },
  linkLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
});
