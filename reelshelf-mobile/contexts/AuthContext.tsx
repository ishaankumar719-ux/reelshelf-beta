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

interface AuthContextValue {
  /** True until the initial getSession() resolves — avoids a false "logged out" flash on cold start. */
  initializing: boolean;
  session: Session | null;
  user:    User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  initializing: true,
  session: null,
  user: null,
  signOut: async () => {},
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

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setInitializing(false);
      if (data.session?.user) {
        hadSessionRef.current = true;
        currentUserIdRef.current = data.session.user.id;
        identifyUser(data.session.user.id);
        completePendingSignupIfAny(data.session.user.id).catch(() => {});
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
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

  return (
    <AuthContext.Provider value={{ initializing, session, user: session?.user ?? null, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
