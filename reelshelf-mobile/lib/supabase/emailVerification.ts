// Post-signup email verification — uses ONLY Supabase's own official
// mechanism (supabase.auth.resend + the session tokens its /verify redirect
// already carries), no custom table, no separate auth system.
//
// Same implicit-flow link shape confirmed for password reset (see
// passwordReset.ts's header comment and AUTH_FLOW_TYPE_CONFIRMED — this
// project's client never sets flowType, so @supabase/auth-js's real default
// applies uniformly to every verification type, not just recovery):
// Supabase's /auth/v1/verify?token=...&type=signup&redirect_to=... redirects
// to `<redirect_to>#access_token=...&refresh_token=...&type=signup` on
// success, or `<redirect_to>#error=access_denied&error_code=otp_expired&...`
// on an expired/already-used link — identical shape to recovery, just
// type=signup instead of type=recovery.
//
// Unlike recovery, a signup-verification session is a completely normal
// login the instant it's established — there's no isolation requirement
// here (the whole point is the user becomes properly signed in) — so this
// calls supabase.auth.setSession() directly and lets the shared
// AuthContext's existing onAuthStateChange listener pick it up exactly like
// any other sign-in, rather than routing through AuthContext's recovery-only
// beginRecoverySession/endRecoverySession pair.
import { supabase } from './client';

const VERIFY_EMAIL_PATH = 'verify-email';

/** Native: this app's own registered scheme. Web: computed from wherever
 *  this build is actually being served — never a guessed production URL. */
export function getEmailVerificationRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/${VERIFY_EMAIL_PATH}`;
  }
  return `reelshelfmobile://${VERIFY_EMAIL_PATH}`;
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && /network|fetch/i.test(e.message));
}

export async function resendVerificationEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Something went wrong. Please try again.' };
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: getEmailVerificationRedirectUrl() },
    });
    if (error) {
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        return { error: 'Too many requests. Please wait a minute before trying again.' };
      }
      if (isNetworkError(error)) return { error: 'Network error. Check your connection and try again.' };
      return { error: 'Something went wrong. Please try again.' };
    }
    return { error: null };
  } catch (e) {
    if (isNetworkError(e)) return { error: 'Network error. Check your connection and try again.' };
    return { error: 'Something went wrong. Please try again.' };
  }
}

export type VerificationLinkResult =
  | { status: 'verified'; accessToken: string; refreshToken: string }
  | { status: 'invalid'; message: string }
  | { status: 'none' };

/** Parses the fragment of a signup-verification deep link — see header
 *  comment for the confirmed real shape (identical mechanism to password
 *  recovery, type=signup instead of type=recovery). */
export function parseVerificationTokensFromUrl(url: string): VerificationLinkResult {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return { status: 'none' };
  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);

  const error = params.get('error');
  if (error) {
    const description = params.get('error_description');
    return { status: 'invalid', message: describeLinkError(description) };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');
  if (accessToken && refreshToken && type === 'signup') {
    return { status: 'verified', accessToken, refreshToken };
  }
  return { status: 'none' };
}

function describeLinkError(description: string | null): string {
  if (description && /expired/i.test(description)) {
    return 'This link has expired.';
  }
  return 'This link is no longer valid.';
}

/** Establishes the real session from the verified tokens — a normal
 *  sign-in, not a recovery-scoped one, so this goes straight to the shared
 *  client (AuthContext's own onAuthStateChange listener does the rest). */
export async function completeEmailVerification(accessToken: string, refreshToken: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Something went wrong. Please try again.' };
  try {
    // setSession() decodes the JWT internally and can throw synchronously
    // (not just return a Supabase {error} result) on a malformed token —
    // confirmed via a real crash during testing with a garbage token, not
    // theoretical. Must be caught here, not just handled via the returned
    // error field.
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) return { error: 'This link is no longer valid.' };
    return { error: null };
  } catch {
    return { error: 'This link is no longer valid.' };
  }
}
