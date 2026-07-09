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

const PENDING_KEY = 'reelshelf:pendingSignup';

interface PendingSignup {
  inviteCode: string;
  username:   string;
}

// If Supabase's project has email confirmation enabled, signUp() won't
// return a session immediately — invite-claim + username can't happen until
// a session exists. Stash the intent so it can be completed the moment a
// session appears (confirmed via email, then any future login), regardless
// of how/where the user confirmed.
async function stashPendingSignup(data: PendingSignup): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(data));
}

async function getPendingSignup(): Promise<PendingSignup | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  return raw ? (JSON.parse(raw) as PendingSignup) : null;
}

async function clearPendingSignup(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export type InviteValidationReason = 'invalid' | 'expired' | 'used' | 'not_configured';

export async function validateInviteCode(code: string): Promise<{ valid: boolean; reason?: InviteValidationReason }> {
  if (!supabase) return { valid: false, reason: 'not_configured' };
  const { data, error } = await supabase.rpc('validate_beta_invite', { p_code: code });
  if (error || !data?.valid) {
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

/** Call with { inviteCode, username } when signUp() returns no session (confirmation pending). */
export async function deferSignupCompletion(data: PendingSignup): Promise<void> {
  await stashPendingSignup(data);
}

/** Call whenever a session becomes available (cold start, login, or post-confirmation) — no-ops if nothing is pending. */
export async function completePendingSignupIfAny(userId: string): Promise<void> {
  const pending = await getPendingSignup();
  if (!pending) return;
  await claimInviteCode(pending.inviteCode, userId);
  await setProfileUsername(userId, pending.username);
  await clearPendingSignup();
}
