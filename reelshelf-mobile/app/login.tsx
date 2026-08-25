import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { getEmailVerificationRedirectUrl } from '@/lib/supabase/emailVerification';
import { trackLoginCompleted, trackSignupCompleted } from '@/lib/observability/analytics';

type Mode = 'signin' | 'signup';

function inviteErrorMessage(reason: string | undefined): string {
  if (reason === 'expired') return 'This invite code has expired.';
  if (reason === 'used') return 'This invite code has reached its maximum number of uses.';
  if (reason === 'network_error') return 'Couldn’t check your invite code — check your connection and try again.';
  return 'This invite code isn’t valid.';
}

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// No format CHECK constraint exists on profiles.username at the DB level
// (confirmed directly — only profiles_username_unique_idx, a uniqueness
// index, no format rule) — this range/character-set is a client-side UX
// convenience, not a ported real policy, documented as such rather than
// implied to be a reused server rule.
const USERNAME_FORMAT_RE = /^[a-zA-Z0-9_]{3,20}$/;

/** Everything checkable before ever calling Supabase — email format,
 *  password/confirm presence+match, username format. Deliberately does NOT
 *  duplicate the real password-strength policy (Sign Up has never had one;
 *  Supabase's own signUp() rejection is still the source of truth, exactly
 *  as before) or the real username-uniqueness check (profiles_username_
 *  unique_idx's constraint violation, surfaced via setProfileUsername,
 *  still the sole source of truth for "taken"). */
function validateSignUpInput(fields: {
  email: string; password: string; confirmPassword: string; username: string;
}): string | null {
  const email = fields.email.trim();
  if (!email) return 'Enter your email.';
  if (!EMAIL_FORMAT_RE.test(email)) return 'Enter a valid email address.';

  if (!fields.password) return 'Choose a password.';
  if (!fields.confirmPassword) return 'Confirm your password.';
  if (fields.password !== fields.confirmPassword) return 'Passwords don’t match.';

  const username = fields.username.trim();
  if (!username) return 'Choose a username.';
  if (!USERNAME_FORMAT_RE.test(username)) {
    return 'Usernames must be 3-20 characters: letters, numbers, and underscores only.';
  }

  return null;
}

export default function LoginScreen() {
  // Lets callers (e.g. Guest Home's sign-up CTA) land directly in the
  // sign-up half of this screen instead of the default sign-in half —
  // both modes already existed here, this just adds an entry-point param.
  // "email" lets Verify-Pending's "Change email" affordance return here
  // with the previously-entered address pre-filled and editable, rather
  // than making the user retype it from scratch.
  const { mode: initialMode, email: initialEmail } = useLocalSearchParams<{ mode?: string; email?: string }>();
  const [mode, setMode] = useState<Mode>(initialMode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
    setConfirmPassword('');
  };

  const handleSignIn = async () => {
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Surface Supabase's actual error message — don't paper over what really went wrong.
      setMessage(error.message);
      return;
    }
    if (data.user) trackLoginCompleted(data.user.id);
    router.replace('/(tabs)');
  };

  const handleSignUp = async () => {
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedCode = inviteCode.trim().toUpperCase();
    const trimmedUsername = username.trim();

    const fieldError = validateSignUpInput({ email, password, confirmPassword, username });
    if (fieldError) {
      setMessage(fieldError);
      return;
    }
    if (!trimmedCode) {
      setMessage('An invite code is required to join ReelShelf Beta.');
      return;
    }

    const validation = await validateInviteCode(trimmedCode);
    if (!validation.valid) {
      setMessage(inviteErrorMessage(validation.reason));
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: getEmailVerificationRedirectUrl() },
    });
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      // Session available immediately (email confirmation not required by
      // this project's current Auth settings) — claim the invite and set
      // the username right now (username is a follow-up UPDATE to the
      // auto-created profiles row, never a duplicate insert).
      await claimInviteCode(trimmedCode, data.session.user.id);
      const { error: usernameError } = await setProfileUsername(data.session.user.id, trimmedUsername);
      if (usernameError) {
        setMessage(usernameError);
        return;
      }
      trackSignupCompleted(data.session.user.id);
      // TODO(onboarding sprint): route to /onboarding instead when that
      // flow exists, for users who haven't completed it yet — same gate
      // verify-email.tsx's success path will need.
      router.replace('/(tabs)');
      return;
    }

    // Email confirmation required — defer invite-claim + username to
    // whenever a session next appears. AuthContext's own onAuthStateChange
    // listener already calls completePendingSignupIfAny() on every SIGNED_IN
    // event, so the moment verify-email.tsx's completeEmailVerification()
    // establishes the session, this finishes itself — nothing new to wire.
    // Keyed by data.user.id (populated even without a session) so this can
    // never be misapplied to a different account signing in on the same
    // device before this one confirms — see authFlow.ts's header comment.
    if (data.user) {
      await deferSignupCompletion(data.user.id, { inviteCode: trimmedCode, username: trimmedUsername });
    }
    router.push(`/verify-pending?email=${encodeURIComponent(trimmedEmail)}`);
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

          <View style={styles.modeRow} accessibilityRole="tablist">
            <Pressable
              style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}
              onPress={() => switchMode('signin')}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'signin' }}
            >
              <Text style={[styles.modeLabel, mode === 'signin' && styles.modeLabelActive]}>Sign In</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => switchMode('signup')}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'signup' }}
            >
              <Text style={[styles.modeLabel, mode === 'signup' && styles.modeLabelActive]}>Sign Up</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label} nativeID="label-email">Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={RS.colors.textMuted}
                accessibilityLabel="Email"
                accessibilityLabelledBy="label-email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label} nativeID="label-password">Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={RS.colors.textMuted}
                accessibilityLabel="Password"
                accessibilityLabelledBy="label-password"
              />
              {mode === 'signin' && (
                <Pressable
                  onPress={() => router.push('/forgot-password')}
                  hitSlop={8}
                  style={styles.forgotPasswordBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password?"
                >
                  <Text style={styles.forgotPasswordLabel}>Forgot password?</Text>
                </Pressable>
              )}
            </View>

            {mode === 'signup' && (
              <View style={styles.field}>
                <Text style={styles.label} nativeID="label-confirm-password">Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={RS.colors.textMuted}
                  accessibilityLabel="Confirm Password"
                  accessibilityLabelledBy="label-confirm-password"
                />
              </View>
            )}

            {mode === 'signup' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label} nativeID="label-username">Username</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="yourusername"
                    placeholderTextColor={RS.colors.textMuted}
                    accessibilityLabel="Username"
                    accessibilityLabelledBy="label-username"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label} nativeID="label-invite-code">Invite Code</Text>
                  <TextInput
                    style={styles.input}
                    value={inviteCode}
                    onChangeText={(t) => setInviteCode(t.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="e.g. REEL1234"
                    placeholderTextColor={RS.colors.textMuted}
                    accessibilityLabel="Invite Code"
                    accessibilityLabelledBy="label-invite-code"
                  />
                  <Text style={styles.hint}>ReelShelf Beta is invite-only. Ask for a code.</Text>
                </View>
              </>
            )}

            {message ? <Text style={styles.error} accessibilityLiveRegion="polite">{message}</Text> : null}

            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={mode === 'signin' ? 'Sign In' : 'Create Account'}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
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
  // textMuted (rgba(255,255,255,0.32)) measures ~2.75:1 against RS.colors.base
  // — below WCAG AA even for large text. textMuted is a shared design token
  // used app-wide; rather than change it globally (a much larger, riskier
  // visual change than this audit's scope), these specific auth-screen uses
  // are switched to textSecondary (~6.3:1, passes AA) instead.
  hint: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textSecondary,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  forgotPasswordLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
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
    color:     RS.colors.textSecondary,
    textAlign: 'center',
  },
});
