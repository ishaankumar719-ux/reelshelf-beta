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
import { supabase } from '@/lib/supabase/client';
import {
  claimInviteCode,
  deferSignupCompletion,
  setProfileUsername,
  validateInviteCode,
} from '@/lib/supabase/authFlow';

type Mode = 'signin' | 'signup';

function inviteErrorMessage(reason: string | undefined): string {
  if (reason === 'expired') return 'This invite code has expired.';
  if (reason === 'used') return 'This invite code has already been claimed.';
  return 'Invalid invite code. Check with whoever sent you the invite.';
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
  };

  const handleSignIn = async () => {
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Surface Supabase's actual error message — don't paper over what really went wrong.
      setMessage(error.message);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleSignUp = async () => {
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    const trimmedCode = inviteCode.trim().toUpperCase();
    const trimmedUsername = username.trim();

    if (!trimmedCode) {
      setMessage('An invite code is required to join ReelShelf Beta.');
      return;
    }
    if (!trimmedUsername) {
      setMessage('Choose a username.');
      return;
    }

    const validation = await validateInviteCode(trimmedCode);
    if (!validation.valid) {
      setMessage(inviteErrorMessage(validation.reason));
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      // Session available immediately — claim the invite and set the
      // username right now (username is a follow-up UPDATE to the
      // auto-created profiles row, never a duplicate insert).
      await claimInviteCode(trimmedCode, data.session.user.id);
      const { error: usernameError } = await setProfileUsername(data.session.user.id, trimmedUsername);
      if (usernameError) {
        setMessage(usernameError);
        return;
      }
      router.replace('/(tabs)');
      return;
    }

    // Email confirmation required — defer invite-claim + username to
    // whenever a session next appears (see AuthContext).
    await deferSignupCompletion({ inviteCode: trimmedCode, username: trimmedUsername });
    setMessage('Account created. Check your email to confirm your account before signing in.');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        await handleSignIn();
      } else {
        await handleSignUp();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.wordmark}>ReelShelf</Text>
            <Text style={styles.tagline}>Your next story is waiting.</Text>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}
              onPress={() => switchMode('signin')}
            >
              <Text style={[styles.modeLabel, mode === 'signin' && styles.modeLabelActive]}>Sign In</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => switchMode('signup')}
            >
              <Text style={[styles.modeLabel, mode === 'signup' && styles.modeLabelActive]}>Sign Up</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={RS.colors.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={RS.colors.textMuted}
              />
            </View>

            {mode === 'signup' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="yourusername"
                    placeholderTextColor={RS.colors.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Invite Code</Text>
                  <TextInput
                    style={styles.input}
                    value={inviteCode}
                    onChangeText={(t) => setInviteCode(t.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="e.g. REEL1234"
                    placeholderTextColor={RS.colors.textMuted}
                  />
                  <Text style={styles.hint}>ReelShelf Beta is invite-only. Ask for a code.</Text>
                </View>
              </>
            )}

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={RS.button.filledText} />
              ) : (
                <Text style={styles.submitLabel}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.legal}>By continuing you agree to our Terms &amp; Privacy Policy.</Text>
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
    paddingTop:        RS.spacing.xl,
    paddingBottom:     RS.spacing.lg,
    gap:               RS.spacing.lg,
  },
  header: {
    gap: RS.spacing.xs,
  },
  wordmark: {
    fontSize:      RS.typography.display,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: RS.typography.body,
    color:    RS.colors.textSecondary,
  },
  modeRow: {
    flexDirection: 'row',
    gap:           RS.spacing.xs,
  },
  modeBtn: {
    flex:              1,
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.colors.border,
    paddingVertical:   RS.spacing.sm + 2,
    alignItems:        'center',
  },
  modeBtnActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
  },
  modeLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  modeLabelActive: {
    color: RS.button.primaryText,
  },
  form: {
    gap: RS.spacing.md,
  },
  field: {
    gap: RS.spacing.xs,
  },
  label: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.textSecondary,
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
  hint: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
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
  legal: {
    fontSize:  RS.typography.caption,
    color:     RS.colors.textMuted,
    textAlign: 'center',
  },
});
