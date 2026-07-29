import { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { fetchOnboardingCompleted } from '@/lib/supabase/onboarding';

// Global side-effect component (same pattern as AppOpenBadgeSync) — checks
// onboarding_completed the moment a real, authenticated user becomes known
// to the shared AuthContext, covering every path that leads there uniformly
// (fresh sign-in, fresh signup, email verification, AND session restore on
// cold start) rather than duplicating the check at each individual
// "just authenticated" call site. Renders nothing.
export function OnboardingGate() {
  const { user, initializing } = useAuth();
  const pathname = usePathname();
  // Checked once per signed-in user per app session — the onboarding screen
  // itself navigates away directly on completion/skip, so this doesn't need
  // to re-check on every navigation, only the first time a given user
  // becomes known.
  const checkedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      // Signed out — clear so a later sign-in (same or different account)
      // always re-checks fresh, rather than trusting a stale "already
      // checked" from a previous session that may have ended mid-onboarding.
      checkedForUserIdRef.current = null;
      return;
    }
    if (pathname === '/onboarding') return;
    if (checkedForUserIdRef.current === user.id) return;
    checkedForUserIdRef.current = user.id;

    fetchOnboardingCompleted(user.id).then((completed) => {
      if (!completed) router.replace('/onboarding');
    });
  }, [user, initializing, pathname]);

  return null;
}
