import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfile, fetchProfileAggregates, type ProfileAggregates, type ProfileData } from '@/lib/supabase/profile';

type Status = 'loading' | 'success' | 'error';

export default function ProfileScreen() {
  const { user, initializing, signOut } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [aggregates, setAggregates] = useState<ProfileAggregates>({ savedItemsCount: 0, diaryEntriesCount: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus('loading');
    Promise.all([fetchProfile(user.id), fetchProfileAggregates(user.id)])
      .then(([profileData, aggregateData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setAggregates(aggregateData);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    signOut();
  };

  if (initializing) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <SkeletonBlock width={88} height={88} radius={44} />
          <SkeletonBlock width={140} height={18} style={{ marginTop: RS.spacing.md }} />
          <SkeletonBlock width={100} height={14} style={{ marginTop: RS.spacing.xs }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.inner}>
          <SignInPrompt message="Sign in to see your profile, shelf, and diary." />
        </View>
      </SafeAreaView>
    );
  }

  const initial = (profile?.displayName || profile?.username || user.email || '?')[0]?.toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {status === 'loading' ? (
          <View style={styles.loadingWrap}>
            <SkeletonBlock width={88} height={88} radius={44} />
            <SkeletonBlock width={140} height={18} style={{ marginTop: RS.spacing.md }} />
            <SkeletonBlock width={100} height={14} style={{ marginTop: RS.spacing.xs }} />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.avatarOuter}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.displayName}>{profile?.displayName || profile?.username || 'ReelShelf Member'}</Text>
              {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{aggregates.savedItemsCount}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{aggregates.diaryEntriesCount}</Text>
                <Text style={styles.statLabel}>Diary Entries</Text>
              </View>
            </View>

            {(profile?.favouriteFilm || profile?.favouriteSeries || profile?.favouriteBook) ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Favourites</Text>
                {profile?.favouriteFilm ? <Text style={styles.favouriteLine}>Film: {profile.favouriteFilm}</Text> : null}
                {profile?.favouriteSeries ? <Text style={styles.favouriteLine}>Series: {profile.favouriteSeries}</Text> : null}
                {profile?.favouriteBook ? <Text style={styles.favouriteLine}>Book: {profile.favouriteBook}</Text> : null}
              </View>
            ) : null}

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutLabel}>Log Out</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Text style={styles.attribution}>
        This app uses the TMDB API but is not endorsed or certified by TMDB.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  inner: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow:          1,
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.xl,
    gap:               RS.spacing.xl,
  },
  loadingWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap:        4,
  },
  avatarOuter: {
    marginBottom: RS.spacing.sm,
  },
  avatar: {
    width:        88,
    height:       88,
    borderRadius: 44,
  },
  avatarFallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    fontSize:   36,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  displayName: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  username: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  bio: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    textAlign:  'center',
    marginTop:  RS.spacing.xs,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
  },
  statTile: {
    flex:              1,
    alignItems:        'center',
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    paddingVertical:   RS.spacing.md,
  },
  statValue: {
    fontSize:   RS.typography.display - 10,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  statLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '600',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
    marginTop:     2,
  },
  section: {
    gap: RS.spacing.xs,
  },
  sectionTitle: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom:  RS.spacing.xs,
  },
  favouriteLine: {
    fontSize: RS.typography.body,
    color:    RS.colors.textSecondary,
  },
  logoutBtn: {
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.button.secondaryBorder,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  logoutLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      '#f87171',
  },
  attribution: {
    textAlign:         'center',
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    fontSize:          RS.typography.caption,
    color:             RS.colors.textMuted,
    lineHeight:        16,
  },
});
