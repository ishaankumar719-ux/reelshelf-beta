// Closed-beta invite gating + deferred username assignment for mobile signup.
// Mirrors the web app's actual signup flow (app/auth/page.tsx): validate the
// invite code via the existing validate_beta_invite RPC, sign up, then claim
// the code via claim_beta_invite. No new tables/RPCs — reuses exactly what
// the web app already has.
//
// Username collection is mobile-specific (web doesn't collect one at signup)
// so it's applied as a follow-up UPDATE to the auto-created profiles row —
// never a duplicate INSERT, per CONSTRAINTS.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './client';

const PENDING_KEY_PREFIX = 'reelshelf:pendingSignup:';

interface PendingSignup {
  inviteCode: string;
  username:   string;
}

// If Supabase's project has email confirmation enabled, signUp() won't
// return a session immediately — invite-claim + username can't happen until
// a session exists. Stash the intent so it can be completed the moment a
// session appears (confirmed via email, then any future login), regardless
// of how/where the user confirmed.
//
// Keyed by the signing-up user's own id (available on data.user even when
// data.session is null — Supabase returns the created user immediately,
// confirmation only gates the session). Was a single global, unkeyed
// key: on a shared device, if User A signed up pending confirmation and
// never confirmed, and a DIFFERENT user then signed in normally,
// completePendingSignupIfAny would have applied User A's invite code and
// chosen username to User B's profile — a real cross-account data
// corruption path, not hypothetical, found during the account-isolation
// audit. Namespacing by user id and checking the id matches before applying
// closes it.
async function stashPendingSignup(userId: string, data: PendingSignup): Promise<void> {
  await AsyncStorage.setItem(`${PENDING_KEY_PREFIX}${userId}`, JSON.stringify(data));
}

async function getPendingSignup(userId: string): Promise<PendingSignup | null> {
  const raw = await AsyncStorage.getItem(`${PENDING_KEY_PREFIX}${userId}`);
  return raw ? (JSON.parse(raw) as PendingSignup) : null;
}

async function clearPendingSignup(userId: string): Promise<void> {
  await AsyncStorage.removeItem(`${PENDING_KEY_PREFIX}${userId}`);
}

export type InviteValidationReason = 'invalid' | 'expired' | 'used' | 'not_configured' | 'network_error';

// A failed RPC call (network drop, timeout, transient Supabase error) and a
// genuinely invalid code both used to collapse into the same `reason:
// 'invalid'` — meaning a real connectivity problem could show the user
// "This invite code isn't valid." even though the code they typed was
// correct. `error` (the RPC/transport itself failing, `data` null) is now
// kept distinct from `data.valid === false` (the RPC ran fine and the
// server genuinely said no, with its own real reason).
export async function validateInviteCode(code: string): Promise<{ valid: boolean; reason?: InviteValidationReason }> {
  if (!supabase) return { valid: false, reason: 'not_configured' };
  const { data, error } = await supabase.rpc('validate_beta_invite', { p_code: code });

  if (__DEV__) {
    console.log('[invite] validate_beta_invite', {
      normalizedCode: code,
      hasData: !!data,
      valid: data?.valid ?? null,
      reason: data?.reason ?? null,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
    });
  }

  if (error) {
    // The RPC itself failed to run (network/timeout/config) — never
    // reported as "invalid", which would blame the code the user typed for
    // a problem that had nothing to do with it.
    return { valid: false, reason: 'network_error' };
  }
  if (!data?.valid) {
    return { valid: false, reason: (data?.reason as InviteValidationReason) ?? 'invalid' };
  }
  return { valid: true };
}

export async function claimInviteCode(code: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('claim_beta_invite', { p_code: code, p_user_id: userId });
  return !error && !!data?.success;
}

export async function setProfileUsername(userId: string, username: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('profiles')
    .update({ username, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    // profiles_username_unique_idx violation
    if (error.code === '23505') return { error: 'That username is already taken.' };
    return { error: error.message };
  }
  return { error: null };
}

/** Call with the just-created user's id when signUp() returns no session (confirmation pending). */
export async function deferSignupCompletion(userId: string, data: PendingSignup): Promise<void> {
  await stashPendingSignup(userId, data);
}

/** Call whenever a session becomes available (cold start, login, or post-confirmation) — no-ops if nothing is pending FOR THIS SPECIFIC USER. */
export async function completePendingSignupIfAny(userId: string): Promise<void> {
  const pending = await getPendingSignup(userId);
  if (!pending) return;
  await claimInviteCode(pending.inviteCode, userId);
  await setProfileUsername(userId, pending.username);
  await clearPendingSignup(userId);
}
