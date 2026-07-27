// New dedicated Activity screen — exactly two tabs (My Activity / Following),
// ported from the real website's app/activity/page.tsx +
// components/activity/ActivityFeed.tsx. See
// WEBSITE_UNIVERSAL_ACTIVITY_FEED_AUDIT.md for the full real-behavior audit
// and lib/supabase/activityFeed.ts's header comment for the exact port +
// its 3 confirmed, explained deviations.
//
// No third "All"/"Community"/"Friends" tab — confirmed absent on the real
// page (FeedTab = "mine" | "following" is the entire real type).
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/activity/ActivityCard';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import {
  fetchFollowingActivityFeed,
  fetchMyActivity,
  type ActivityEvent,
  type ActivityProfile,
} from '@/lib/supabase/activityFeed';
import {
  getCommentCountsForEntries,
  getLikeCountsForEntries,
  getLikedDiaryEntryIds,
} from '@/lib/supabase/activitySocial';

type FeedTab = 'mine' | 'following';
type Status = 'loading' | 'success' | 'error';

interface SocialState {
  likeCount:    number;
  commentCount: number;
  hasLiked:     boolean;
}

async function loadSocialData(userId: string, events: ActivityEvent[]): Promise<Record<string, SocialState>> {
  const entryIds = events.map((e) => e.diaryEntryId).filter((id): id is string => Boolean(id));
  if (entryIds.length === 0) return {};

  const [likedIds, likeCounts, commentCounts] = await Promise.all([
    getLikedDiaryEntryIds(entryIds, userId),
    getLikeCountsForEntries(entryIds),
    getCommentCountsForEntries(entryIds),
  ]);
  const likedSet = new Set(likedIds);
  const next: Record<string, SocialState> = {};
  for (const id of entryIds) {
    next[id] = {
      likeCount: likeCounts[id] ?? 0,
      commentCount: commentCounts[id] ?? 0,
      hasLiked: likedSet.has(id),
    };
  }
  return next;
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabPill, active && styles.tabPillActive]} onPress={onPress}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyWrap}>
      <MaterialIcons name="dynamic-feed" size={28} color={RS.colors.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function ActivityScreen() {
  const { user, initializing } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>('mine');

  const [myStatus, setMyStatus] = useState<Status>('loading');
  const [myEvents, setMyEvents] = useState<ActivityEvent[]>([]);
  const [mySocial, setMySocial] = useState<Record<string, SocialState>>({});

  const [followingStatus, setFollowingStatus] = useState<Status>('loading');
  const [followingEvents, setFollowingEvents] = useState<ActivityEvent[]>([]);
  const [followingSocial, setFollowingSocial] = useState<Record<string, SocialState>>({});
  const [noFollows, setNoFollows] = useState(false);
  const followingFetchedRef = useRef(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadMine = useCallback(async () => {
    if (!user || !supabase) return;
    setMyStatus('loading');
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      const profile: ActivityProfile = {
        userId: user.id,
        username: profileRow?.username ?? null,
        displayName: profileRow?.display_name ?? null,
        avatarUrl: profileRow?.avatar_url ?? null,
      };

      const events = await fetchMyActivity(user.id, profile);
      setMyEvents(events);
      setMyStatus('success');
      const social = await loadSocialData(user.id, events);
      setMySocial(social);
    } catch {
      setMyStatus('error');
    }
  }, [user]);

  const loadFollowing = useCallback(async () => {
    if (!user) return;
    setFollowingStatus('loading');
    try {
      const { count: followCount } = await supabase!
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      if ((followCount ?? 0) === 0) {
        setNoFollows(true);
        setFollowingEvents([]);
        setFollowingStatus('success');
        return;
      }
      setNoFollows(false);

      const events = await fetchFollowingActivityFeed(user.id);
      setFollowingEvents(events);
      setFollowingStatus('success');
      const social = await loadSocialData(user.id, events);
      setFollowingSocial(social);
    } catch {
      setFollowingStatus('error');
    }
  }, [user]);

  // "My Activity" loads on mount (the default tab) — mirrors the real
  // page's server-rendered initial events prop.
  useEffect(() => {
    if (user) void loadMine();
  }, [user, loadMine]);

  // "Following" loads once, on first switch to that tab — exact real
  // behavior (ActivityFeed.tsx's fetchedRef guard), not a re-fetch on every
  // tab switch back.
  useEffect(() => {
    if (activeTab !== 'following' || followingFetchedRef.current || !user) return;
    followingFetchedRef.current = true;
    void loadFollowing();
  }, [activeTab, user, loadFollowing]);

  // Pull-to-refresh — mobile-native convenience re-running the same single
  // bounded fetch for whichever tab is active (not a data-fidelity
  // divergence: the real page has no refresh affordance at all, since it's
  // a full page load; this simply re-triggers the identical query on demand).
  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'mine') {
      await loadMine();
    } else {
      followingFetchedRef.current = true;
      await loadFollowing();
    }
    setRefreshing(false);
  };

  if (initializing) {
    return <SafeAreaView style={styles.root} edges={['top']} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
          </Pressable>
          <Text style={styles.header}>Activity</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centered}>
          <SignInPrompt message="Sign in to see your activity." />
        </View>
      </SafeAreaView>
    );
  }

  const status = activeTab === 'mine' ? myStatus : followingStatus;
  const events = activeTab === 'mine' ? myEvents : followingEvents;
  const social = activeTab === 'mine' ? mySocial : followingSocial;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.header}>Activity</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.tabRow}>
        <TabPill
          label="My Activity"
          active={activeTab === 'mine'}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveTab('mine');
          }}
        />
        <TabPill
          label="Following"
          active={activeTab === 'following'}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setActiveTab('following');
          }}
        />
      </View>

      {status === 'loading' ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} height={92} radius={RS.card.radius} style={{ marginHorizontal: RS.spacing.md }} />
          ))}
        </View>
      ) : status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load activity — check your connection.</Text>
        </View>
      ) : activeTab === 'following' && noFollows ? (
        <EmptyState message="You're not following anyone yet." />
      ) : events.length === 0 ? (
        <EmptyState
          message={activeTab === 'mine' ? 'No activity yet — start logging films to see your history here.' : 'Nothing from your follows yet.'}
        />
      ) : (
        <FlatList<ActivityEvent>
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: RS.spacing.sm }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={RS.colors.accent} />}
          renderItem={({ item }) => {
            const entrySocial = item.diaryEntryId ? social[item.diaryEntryId] : undefined;
            return (
              <ActivityCard
                event={item}
                initialLikeCount={entrySocial?.likeCount ?? 0}
                initialCommentCount={entrySocial?.commentCount ?? 0}
                initialHasLiked={entrySocial?.hasLiked ?? false}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs,
  },
  header: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  tabRow: {
    flexDirection: 'row', gap: RS.spacing.xs,
    paddingHorizontal: RS.spacing.md, marginTop: RS.spacing.xs, marginBottom: RS.spacing.md,
  },
  tabPill: {
    borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated, paddingHorizontal: 16, paddingVertical: 8,
  },
  tabPillActive: { backgroundColor: RS.button.primaryFill, borderColor: RS.button.primaryBorder },
  tabLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  tabLabelActive: { color: RS.button.primaryText },
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: RS.spacing.lg, gap: RS.spacing.sm,
  },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  skeletonList: { gap: RS.spacing.sm, paddingTop: RS.spacing.xs },
  listContent: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.tabBar.contentBottomPad },
});
