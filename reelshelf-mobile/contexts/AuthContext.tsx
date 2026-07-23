import type { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { completePendingSignupIfAny } from '@/lib/supabase/authFlow';

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
        completePendingSignupIfAny(data.session.user.id).catch(() => {});
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        hadSessionRef.current = true;
        completePendingSignupIfAny(nextSession.user.id).catch(() => {});
      } else if (event === 'SIGNED_OUT' && hadSessionRef.current) {
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
