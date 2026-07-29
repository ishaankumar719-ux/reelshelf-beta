import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { completePendingSignupIfAny } from '@/lib/supabase/authFlow';
import { identifyUser, resetAnalyticsUser } from '@/lib/observability/analytics';

// Every per-user AsyncStorage cache in the app (Daily Pick, Because You
// Loved, and mediaStorage.ts's shelf/watched/rating/review/history state)
// is namespaced as "reelshelf:<...>:<userId>" or "reelshelf:<...>:<userId>:<mediaId>".
// On sign-out, sweep and remove every key belonging to the user who just
// signed out — belt-and-suspenders on top of the per-user namespacing
// itself (which already prevents a DIFFERENT user from ever reading these
// keys): this also means the SAME user signing back out and in later, or
// the device simply accumulating storage, doesn't leave anything behind
// that outlives the session it was written for.
async function clearUserCache(userId: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(
      (k) => k.startsWith('reelshelf:') && (k.endsWith(`:${userId}`) || k.includes(`:${userId}:`)),
    );
    if (userKeys.length > 0) await AsyncStorage.multiRemove(userKeys);
  } catch {
    // Best-effort — a failed sweep never blocks sign-out itself.
  }
}

// recoveryModeRef alone is NOT enough: it's in-memory, scoped to one JS
// runtime instance. supabase.auth.setSession() persists the recovery
// session to storage the same as any other session (persistSession: true)
// — so a full reload/relaunch DURING an unfinished recovery flow (browser
// refresh on web, force-quit-and-reopen on native, or simply the OS
// reclaiming the app's memory) tears down the ref back to its false
// default while the persisted recovery session survives underneath. Without
// this flag, the FRESH instance's initial getSession() would see that
// still-live recovery session with no ref to suppress it, and promote it as
// a normal login — confirmed as a real bug via an actual reload-mid-recovery
// test before this flag was added, not theoretical. This persisted marker
// is what the fresh instance checks instead.
const RECOVERY_FLAG_KEY = 'reelshelf:recoveryModeActive';

interface AuthContextValue {
  /** True until the initial getSession() resolves — avoids a false "logged out" flash on cold start. */
  initializing: boolean;
  session: Session | null;
  user:    User | null;
  signOut: () => Promise<void>;
  /** Establishes a Supabase session from a password-recovery deep link's
   *  access/refresh tokens, WITHOUT ever exposing it via `session`/`user`
   *  above — every other screen must keep seeing signed-out throughout the
   *  recovery flow (see the onAuthStateChange guard below for why this is
   *  necessary: setSession() always fires a plain 'SIGNED_IN' event,
   *  indistinguishable from a real login, confirmed by reading
   *  @supabase/auth-js's GoTrueClient source directly). Only the Reset
   *  Password screen — the sole caller — knows this session is live; it
   *  talks to the shared `supabase` client directly for updateUser(). */
  beginRecoverySession: (accessToken: string, refreshToken: string) => Promise<{ error: string | null }>;
  /** Signs the recovery session out completely and clears recovery mode.
   *  Call after a successful password update, or when the user abandons
   *  the Reset Password screen without completing it. */
  endRecoverySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  initializing: true,
  session: null,
  user: null,
  signOut: async () => {},
  beginRecoverySession: async () => ({ error: 'Not ready.' }),
  endRecoverySession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  // Tracks whether we've ever HAD a session, so a SIGNED_OUT transition can
  // be told apart from "never logged in yet" (cold start) — only the former
  // is a genuine session-expiry event worth redirecting for.
  const hadSessionRef = useRef(false);
  // The most recently known signed-in user id — SIGNED_OUT's nextSession is
  // already null by the time the event fires, so this is the only way to
  // know whose cache to clear.
  const currentUserIdRef = useRef<string | null>(null);
  // Synchronous (not state) — must be readable inside the onAuthStateChange
  // closure the instant setSession()/signOut() fire, before any React
  // re-render could update a useState value. True for the entire window
  // between beginRecoverySession() and endRecoverySession().
  const recoveryModeRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    (async () => {
      // Check the persisted flag FIRST, before ever calling getSession() —
      // a '1' here means a previous instance began a recovery flow and was
      // torn down (reload/relaunch) before completing it. Terminate that
      // session unconditionally rather than trying to resume it (the
      // original deep link isn't available anymore anyway) — the only safe
      // outcome is a clean, fully signed-out state; the user requests a new
      // reset email if they still need one.
      let hadStaleRecovery = false;
      try {
        const flag = await AsyncStorage.getItem(RECOVERY_FLAG_KEY);
        if (flag === '1') {
          hadStaleRecovery = true;
          recoveryModeRef.current = true;
          await supabase.auth.signOut().catch(() => {});
          await AsyncStorage.removeItem(RECOVERY_FLAG_KEY).catch(() => {});
          recoveryModeRef.current = false;
        }
      } catch {
        // Best-effort — fall through to the normal getSession() check below.
      }
      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setInitializing(false);
      // A recovery session already got set (beginRecoverySession ran before
      // this initial check resolved) — do not let the cold-start check
      // promote it either. hadStaleRecovery is also covered here since the
      // signOut() above already cleared whatever getSession() would find.
      if (recoveryModeRef.current || hadStaleRecovery) return;
      setSession(data.session);
      if (data.session?.user) {
        hadSessionRef.current = true;
        currentUserIdRef.current = data.session.user.id;
        identifyUser(data.session.user.id);
        completePendingSignupIfAny(data.session.user.id).catch(() => {});
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (recoveryModeRef.current) {
        // Either the recovery session's own 'SIGNED_IN' (setSession() has
        // no concept of "this is a recovery token" — it always fires plain
        // SIGNED_IN, confirmed by reading the library source) or its later
        // cleanup 'SIGNED_OUT' from endRecoverySession(). Neither should
        // ever reach the rest of the app as a real auth-state change.
        return;
      }
      setSession(nextSession);
      if (nextSession?.user) {
        hadSessionRef.current = true;
        currentUserIdRef.current = nextSession.user.id;
        identifyUser(nextSession.user.id);
        completePendingSignupIfAny(nextSession.user.id).catch(() => {});
      } else if (event === 'SIGNED_OUT' && hadSessionRef.current) {
        resetAnalyticsUser();
        // No stale cache, ever: clear every AsyncStorage key belonging to
        // the user who just signed out (Daily Pick, Because You Loved,
        // per-media shelf/watched/rating/review state) before anything else
        // — a previous session's personalized data must never survive to
        // be visible again, even briefly, to a guest or a different account
        // signing in afterward on this device.
        const signedOutUserId = currentUserIdRef.current;
        if (signedOutUserId) clearUserCache(signedOutUserId).catch(() => {});
        currentUserIdRef.current = null;
        // A previously-valid session just became invalid — either a manual
        // sign-out (harmless double-navigate to the same place) or a
        // genuinely expired/revoked refresh token (e.g. password changed
        // elsewhere, session revoked). Either way, route to sign-in rather
        // than leaving screens that assumed a logged-in state hanging.
        hadSessionRef.current = false;
        router.replace('/login');
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const beginRecoverySession = async (accessToken: string, refreshToken: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    // Both set BEFORE setSession(): the ref for the immediate, synchronous
    // onAuthStateChange guard, the persisted flag so a reload/relaunch
    // before this flow completes is still recognized and terminated by a
    // fresh instance (see RECOVERY_FLAG_KEY's comment above).
    recoveryModeRef.current = true;
    await AsyncStorage.setItem(RECOVERY_FLAG_KEY, '1').catch(() => {});
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) {
      recoveryModeRef.current = false;
      await AsyncStorage.removeItem(RECOVERY_FLAG_KEY).catch(() => {});
      return { error: error.message };
    }
    return { error: null };
  };

  const endRecoverySession = async (): Promise<void> => {
    if (supabase) await supabase.auth.signOut().catch(() => {});
    recoveryModeRef.current = false;
    await AsyncStorage.removeItem(RECOVERY_FLAG_KEY).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{
      initializing, session, user: session?.user ?? null, signOut, beginRecoverySession, endRecoverySession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
