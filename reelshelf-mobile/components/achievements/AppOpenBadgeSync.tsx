// Deliberate mobile-only enhancement — one of the 3 "sensible mobile-native
// moments" this app evaluates badges at (the other two: after a diary save
// in UniversalReviewComposer, after a follow/unfollow action in ProfileView).
// Runs once per app session, right after auth resolves — this is what
// catches up badges whose underlying stat can change from someone ELSE's
// action (e.g. another user following you moves your own followersCount),
// which no other trigger site would ever see.
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useBadgeCelebration } from '@/contexts/BadgeCelebrationContext';
import { evaluateAndSyncBadges } from '@/lib/supabase/badges';

export function AppOpenBadgeSync() {
  const { user } = useAuth();
  const { celebrateNewBadges } = useBadgeCelebration();
  const ranForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || ranForUserRef.current === user.id) return;
    ranForUserRef.current = user.id;
    evaluateAndSyncBadges(user.id)
      .then((result) => celebrateNewBadges(result.newlyUnlocked))
      .catch(() => {});
  }, [user, celebrateNewBadges]);

  return null;
}
