import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { completeEmailVerification, parseVerificationTokensFromUrl } from '@/lib/supabase/emailVerification';
import { trackSignupCompleted } from '@/lib/observability/analytics';

type Status = 'checking' | 'success' | 'invalid';

// Reached via the reelshelfmobile://verify-email deep link Supabase's
// signup-confirmation email points to — a parallel route alongside
// reset-password, reusing the exact same expo-linking setup and the same
// confirmed implicit-flow fragment format (see lib/supabase/
// emailVerification.ts), NOT a second linking system. Unlike reset-password,
// a successful result here IS a normal login — the resulting session goes
// straight through the shared AuthContext's existing onAuthStateChange
// listener like any other sign-in, no isolation needed.
export default function VerifyEmailScreen() {
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('This link is no longer valid.');

  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url: string) {
      const result = parseVerificationTokensFromUrl(url);
      if (cancelled) return;

      if (result.status === 'verified') {
        const { error } = await completeEmailVerification(result.accessToken, result.refreshToken);
        if (cancelled) return;
        if (error) {
          setMessage(error);
          setStatus('invalid');
          return;
        }
        const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
        if (data.user) trackSignupCompleted(data.user.id);
        setStatus('success');
        return;
      }

      if (result.status === 'invalid' || result.status === 'none') {
        // Not an error yet — this link may simply have already been used
        // (e.g. tapped a second time after already verifying, or opened
        // while already signed in from completing it earlier). If a real
        // session already exists, treat this as success, not a failure.
        const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
        if (cancelled) return;
        if (data.session) {
          setStatus('success');
          return;
        }
        if (result.status === 'invalid') setMessage(result.message);
        setStatus('invalid');
      }
    }

    Linking.getInitialURL().then((url) => {
      if (cancelled) return;
      if (url) handleUrl(url);
      else setStatus('invalid');
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const handleContinue = () => {
    // TODO(onboarding sprint): route new/incomplete-onboarding users to
    // /onboarding instead once that flow exists — matches the same gate
    // handleSignUp's immediate-session path will need. Home for now, same
    // as every other entry point in the app today.
    router.replace('/(tabs)');
  };

  const handleGoToSignIn = () => {
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

  if (status === 'invalid') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.title}>Link no longer valid</Text>
          <Text style={styles.message}>
            {message} It may have already been used, or your email may already be confirmed.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={handleGoToSignIn}>
            <Text style={styles.primaryLabel}>Go to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.centered}>
        <Text style={styles.title}>Email confirmed</Text>
        <Text style={styles.message}>Your account is ready to go.</Text>
        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Text style={styles.primaryLabel}>Continue</Text>
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
  centered: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               RS.spacing.md,
    paddingHorizontal: RS.spacing.lg,
  },
  title: {
    fontSize:      RS.typography.display - 8,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    letterSpacing: RS.letterSpacing.tight,
  },
  message: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    textAlign:  'center',
    lineHeight: 21,
  },
  primaryBtn: {
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingVertical:   RS.button.paddingV,
    paddingHorizontal: RS.button.paddingH,
    alignItems:        'center',
    marginTop:         RS.spacing.sm,
  },
  primaryLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
