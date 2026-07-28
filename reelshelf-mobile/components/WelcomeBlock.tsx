import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfile, type ProfileData } from '@/lib/supabase/profile';

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function getDisplayDate(): string {
  const d = new Date();
  const day     = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${day}, ${monthDay}`;
}

// Was a hardcoded "Ishaan" shown unconditionally, regardless of auth state —
// the root cause of Home appearing signed-in even while genuinely signed
// out (confirmed via reproduction: Home showed "Good Evening, Ishaan." with
// zero session, while Daily Reel correctly gated on the same shared
// AuthContext). Now sourced from the real profile of whoever the shared
// AuthContext says is actually signed in; while that's unresolved
// (session still initializing, or profile still loading for a real user) a
// neutral skeleton shows instead — never a name, hardcoded or stale.
export function WelcomeBlock() {
  const { user, initializing } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let cancelled = false;
    setProfile(null);
    setProfileLoading(true);
    fetchProfile(user.id)
      .then((p) => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const name = profile?.displayName || profile?.username || null;
  const showSkeleton = initializing || (!!user && profileLoading && !profile);

  if (showSkeleton) {
    return (
      <View style={styles.container}>
        <SkeletonBlock width="55%" height={22} />
        <SkeletonBlock width="35%" height={13} style={{ marginTop: 6 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Good {getTimeOfDay()}{name ? `, ${name}` : ''}.
      </Text>
      <Text style={styles.date}>{getDisplayDate()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               4,
  },
  greeting: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '500',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.normal,
  },
  date: {
    fontSize:      RS.typography.caption,
    fontWeight:    '400',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.normal,
  },
});
