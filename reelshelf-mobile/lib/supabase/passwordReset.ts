// Forgot Password / Reset Password — uses ONLY Supabase's own official
// recovery mechanism (resetPasswordForEmail + updateUser), no custom table.
//
// Flow type: this project's Supabase client (lib/supabase/client.ts) never
// sets `flowType`, so it uses @supabase/auth-js's DEFAULT — confirmed by
// reading node_modules/@supabase/auth-js/dist/main/GoTrueClient.js directly
// (`DEFAULT_OPTIONS.flowType = 'implicit'`), not assumed. That means the
// recovery link Supabase emails delivers `access_token`/`refresh_token`/
// `type=recovery` as a URL FRAGMENT (`#...`), not a `?code=` param — and
// because `detectSessionInUrl: false` (required on native, and left off on
// web too rather than diverging per-platform), nothing parses that fragment
// automatically on any platform. parseRecoveryTokensFromUrl below does it
// by hand, and the caller passes the tokens to AuthContext's
// beginRecoverySession (never supabase.auth.setSession directly — see that
// file for why a plain setSession() call must never reach the rest of the
// app as a normal login).
import { supabase } from './client';

const PASSWORD_RESET_PATH = 'reset-password';

/** Native: the app's own registered scheme (app.json's "scheme": "reelshelfmobile").
 *  Web: computed from wherever this build is actually being served — dev
 *  localhost today, or a real domain if this Expo web build is ever
 *  deployed — never a guessed/hardcoded production URL. */
export function getPasswordResetRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/${PASSWORD_RESET_PATH}`;
  }
  return `reelshelfmobile://${PASSWORD_RESET_PATH}`;
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && /network|fetch/i.test(e.message));
}

/** Never reveals whether `email` is actually registered — Supabase's own
 *  /recover endpoint already returns success regardless (confirmed by
 *  reading resetPasswordForEmail's implementation: it has no
 *  email-not-found error path at all), so this only needs to distinguish
 *  genuine request failures (rate limit, network, malformed email) from
 *  "the request went through" — never "was this email found." */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Something went wrong. Please try again.' };

  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: 'Enter a valid email address.' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) {
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        return { error: 'Too many requests. Please wait a minute before trying again.' };
      }
      if (isNetworkError(error)) {
        return { error: 'Network error. Check your connection and try again.' };
      }
      // Any other real failure (never "email not found" — that case
      // doesn't exist on this endpoint) still gets a clear, non-raw message.
      return { error: 'Something went wrong. Please try again.' };
    }
    return { error: null };
  } catch (e) {
    if (isNetworkError(e)) return { error: 'Network error. Check your connection and try again.' };
    return { error: 'Something went wrong. Please try again.' };
  }
}

export type RecoveryLinkResult =
  | { status: 'recovery'; accessToken: string; refreshToken: string }
  | { status: 'expired'; message: string }
  | { status: 'none' };

/** Parses the fragment (`#...`) of a password-recovery deep link — the
 *  implicit-flow shape confirmed above. Handles both the success case
 *  (`#access_token=...&refresh_token=...&type=recovery`) and Supabase's own
 *  real expired/used-link redirect shape
 *  (`#error=access_denied&error_code=otp_expired&error_description=...`).
 *  `status: 'none'` means this URL isn't a recovery link at all (e.g. a
 *  plain, non-deep-link visit to the Reset Password route). */
export function parseRecoveryTokensFromUrl(url: string): RecoveryLinkResult {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return { status: 'none' };
  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);

  const error = params.get('error');
  if (error) {
    const description = params.get('error_description');
    return { status: 'expired', message: describeLinkError(error, description) };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');
  if (accessToken && refreshToken && type === 'recovery') {
    return { status: 'recovery', accessToken, refreshToken };
  }
  return { status: 'none' };
}

function describeLinkError(_error: string, description: string | null): string {
  if (description && /expired/i.test(description)) {
    return 'This reset link has expired. Request a new one below.';
  }
  if (description && /already|used/i.test(description)) {
    return 'This reset link has already been used. Request a new one below.';
  }
  return 'This reset link is no longer valid. Request a new one below.';
}

/** Maps a real supabase.auth.updateUser({ password }) failure to a clear
 *  message — every case actually reachable from that call with this
 *  project's config (no client-side password policy exists to duplicate
 *  here: Sign Up (app/login.tsx) submits straight to supabase.auth.signUp
 *  with no length/complexity check of its own and lets Supabase's own
 *  server-side policy reject weak passwords via its error message — Reset
 *  Password reuses that exact same delegation, not a new invented policy). */
export function describeUpdatePasswordError(message: string): string {
  if (/at least|too short|weak|should be/i.test(message)) {
    return message; // Supabase's own message here already IS the clear, specific policy text (e.g. "Password should be at least 6 characters") — passing it through is more accurate than replacing it with a vaguer generic string.
  }
  if (/session|jwt|token/i.test(message)) {
    return 'Your reset link has expired. Request a new one.';
  }
  if (/network|fetch/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  return 'Could not update your password. Please try again.';
}

export async function updateRecoveryPassword(newPassword: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Something went wrong. Please try again.' };
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: describeUpdatePasswordError(error.message) };
    return { error: null };
  } catch (e) {
    if (isNetworkError(e)) return { error: 'Network error. Check your connection and try again.' };
    return { error: 'Could not update your password. Please try again.' };
  }
}
