// Mobile-only enhancement: no equivalent exists on the live website
// (confirmed via audit — see WEBSITE_HOME_FRIENDS_ACTIVITY_AUDIT.md). The
// website DID once have code for a Home "Friends activity" rail
// (components/home/HomeDashboardClient.tsx), but that file is explicitly
// marked "UNUSED - replaced by Sprint 20 homepage" by its own author and is
// never rendered by any live route — the real website Home page has no
// friends-activity section at all today. This mobile section is intentionally
// built as a genuine enhancement over the real website, not a parity port —
// its absence on web is not a gap to "fix" in some future audit.
import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SignInPrompt } from '@/components/SignInPrompt';
import { SpoilerBlur } from '@/components/SpoilerBlur';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { usePressLift } from '@/hooks/usePressLift';
import {
  fetchHomeFriendsActivity,
  type HomeActivityEntry,
} from '@/lib/supabase/homeFriendsActivity';
import { getActivityKey } from '@/utils/listKeys';

const REELSHELF_INVITE_URL = 'https://reelshelf.app';

interface HomeFriendsActivityProps {
  /** Bump this to force a re-fetch — Home's pull-to-refresh increments it. */
  refreshSignal?: number;
  /** Called once the triggered fetch settles (success or error) — lets Home's
   *  RefreshControl spinner track real fetch duration instead of a guessed timeout. */
  onRefreshComplete?: () => void;
}

type Status = 'loading' | 'success' | 'error';

function activityVerb(entry: HomeActivityEntry): string {
  switch (entry.activityType) {
    case 'reviewed': return 'reviewed';
    case 'rated':     return 'rated';
    case 'watched':   return 'logged';
    case 'list_created':    return 'created a list';
    case 'rushmore_updated': return 'updated their Top 4';
  }
}

function formatRecency(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActivityCard({ entry }: { entry: HomeActivityEntry }) {
  const { style: animStyle, onPressIn, onPressOut } = usePressLift('lift');
  const ownerLabel = entry.displayName || (entry.username ? `@${entry.username}` : 'ReelShelf Member');

  const openProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/profile/${entry.userId}`);
  };

  const openMain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (entry.activityType === 'list_created' && entry.listId) {
      router.push(`/list/${entry.listId}`);
    } else if (entry.activityType === 'rushmore_updated') {
      router.push(`/profile/${entry.userId}`);
    } else if (entry.routeId) {
      router.push(`/media/${entry.routeId}?title=${encodeURIComponent(entry.title ?? '')}&posterUrl=${encodeURIComponent(entry.posterUrl ?? '')}&mediaType=${entry.mediaType}`);
    }
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={openMain}>
      <Animated.View style={[styles.card, animStyle]}>
        <View style={styles.cardHeader}>
          <Pressable onPress={openProfile} hitSlop={6} style={styles.avatarRow}>
            {entry.avatarUrl ? (
              <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <MaterialIcons name="person" size={14} color={RS.colors.textMuted} />
              </View>
            )}
            <View style={styles.headerMeta}>
              <Text style={styles.name} numberOfLines={1}>{ownerLabel}</Text>
              <Text style={styles.verbLine} numberOfLines={1}>
                {activityVerb(entry)} · {formatRecency(entry.createdAt)}
              </Text>
            </View>
          </Pressable>
        </View>

        {entry.activityType === 'list_created' ? (
          <View style={styles.listBody}>
            <MaterialIcons name="playlist-add-check" size={22} color={RS.colors.accent} />
            <Text style={styles.listTitle} numberOfLines={2}>{entry.listTitle}</Text>
          </View>
        ) : entry.activityType === 'rushmore_updated' ? (
          <View style={styles.listBody}>
            <MaterialIcons name="star" size={22} color={RS.colors.accent} />
            <Text style={styles.listTitle} numberOfLines={2}>Added {entry.rushmoreTitle} to their Top 4</Text>
          </View>
        ) : (
          <View style={styles.mediaBody}>
            <View style={styles.posterOuter}>
              {entry.posterUrl ? (
                <Image source={{ uri: entry.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
                  <Text style={styles.posterFallbackLetter}>{entry.title?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
            </View>
            <View style={styles.mediaMeta}>
              <Text style={styles.mediaTitle} numberOfLines={2}>{entry.title}</Text>
              <View style={styles.badgeRow}>
                {entry.rating != null && <Text style={styles.rating}>{entry.rating.toFixed(1)} / 10</Text>}
                {entry.watchedInCinema && (
                  <View style={styles.cinemaBadge}>
                    <MaterialIcons name="theaters" size={9} color={RS.colors.accent} />
                    <Text style={styles.cinemaBadgeLabel}>Cinema</Text>
                  </View>
                )}
                {entry.rewatch && <Text style={styles.rewatchBadge}>↺ Rewatch</Text>}
              </View>
              {entry.review ? (
                <SpoilerBlur active={!!entry.containsSpoilers}>
                  <Text style={styles.reviewText} numberOfLines={2}>{entry.review}</Text>
                </SpoilerBlur>
              ) : null}
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '60%' }]} />
    </View>
  );
}

export function HomeFriendsActivity({ refreshSignal, onRefreshComplete }: HomeFriendsActivityProps) {
  const { user, initializing } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [entries, setEntries] = useState<HomeActivityEntry[]>([]);
  const [followedCount, setFollowedCount] = useState(0);

  const load = useCallback(() => {
    if (!user) {
      onRefreshComplete?.();
      return;
    }
    setStatus('loading');
    fetchHomeFriendsActivity(user.id)
      .then((result) => {
        setEntries(result.entries);
        setFollowedCount(result.followedCount);
        setStatus('success');
      })
      .catch(() => setStatus('error'))
      .finally(() => onRefreshComplete?.());
  }, [user, onRefreshComplete]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const openFindFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/search?category=users');
  };

  const openInviteFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Share.share({
      title: 'Join me on ReelShelf',
      message: `Come track and share what you're watching and reading with me on ReelShelf — ${REELSHELF_INVITE_URL}`,
      url: REELSHELF_INVITE_URL, // iOS-only field; harmless no-op on Android
    }).catch(() => {});
  };

  // Never returns null — exactly one of: sign-in prompt, loading skeleton,
  // error state, cards, empty-follows-nobody, or empty-follows-no-activity.
  if (initializing) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
      </ScrollView>
    );
  }

  if (!user) {
    return <SignInPrompt message="Sign in to see what your friends are watching." />;
  }

  if (status === 'loading') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
      </ScrollView>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Couldn&apos;t load friends activity.</Text>
        <Pressable style={styles.retryBtn} onPress={load} hitSlop={8}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (entries.length === 0 && followedCount === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>Follow people to see their activity here.</Text>
        <View style={styles.emptyBtnRow}>
          <Pressable style={styles.emptyBtn} onPress={openFindFriends}>
            <MaterialIcons name="person-search" size={16} color={RS.button.filledText} />
            <Text style={styles.emptyBtnLabel}>Find Friends</Text>
          </Pressable>
          <Pressable style={[styles.emptyBtn, styles.emptyBtnGhost]} onPress={openInviteFriends}>
            <MaterialIcons name="ios-share" size={16} color={RS.colors.textPrimary} />
            <Text style={[styles.emptyBtnLabel, styles.emptyBtnGhostLabel]}>Invite Friends</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No recent activity from your friends yet.</Text>
        <Pressable style={styles.emptyBtn} onPress={openFindFriends}>
          <MaterialIcons name="person-search" size={16} color={RS.button.filledText} />
          <Text style={styles.emptyBtnLabel}>Find Friends</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {entries.map((entry, i) => (
        <ActivityCard key={getActivityKey(entry.activityType, entry.mediaType, entry.routeId ?? entry.listId ?? entry.userId, entry.createdAt, i)} entry={entry} />
      ))}
    </ScrollView>
  );
}

const CARD_W = 200;

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    gap:               12,
    paddingHorizontal: RS.spacing.md,
  },
  card: {
    width:           CARD_W,
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.sm + 2,
    gap:             RS.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    flex:          1,
  },
  avatar: { width: 22, height: 22, borderRadius: 11 },
  avatarFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1, gap: 0 },
  name: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textPrimary },
  verbLine: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  mediaBody: { flexDirection: 'row', gap: 8 },
  posterOuter: {
    width: 48, height: 68, borderRadius: 6, overflow: 'hidden',
    backgroundColor: RS.colors.elevated,
  },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  posterFallbackLetter: { fontSize: 18, fontWeight: '700', color: RS.colors.textMuted },
  mediaMeta: { flex: 1, gap: 3 },
  mediaTitle: { fontSize: RS.typography.caption + 1, fontWeight: '600', color: RS.colors.textPrimary, lineHeight: 15 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rating: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.accent },
  cinemaBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 4, backgroundColor: RS.colors.accentGlow, paddingHorizontal: 5, paddingVertical: 1 },
  cinemaBadgeLabel: { fontSize: 8, fontWeight: '700', color: RS.colors.accent, textTransform: 'uppercase' },
  rewatchBadge: { fontSize: 9, fontWeight: '600', color: RS.colors.textMuted },
  reviewText: { fontSize: RS.typography.overline + 1, color: RS.colors.textSecondary, lineHeight: 13 },
  listBody: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: RS.spacing.xs },
  listTitle: { flex: 1, fontSize: RS.typography.caption + 1, fontWeight: '600', color: RS.colors.textPrimary, lineHeight: 16 },
  skeletonCard: { height: 96, backgroundColor: RS.colors.elevated, opacity: 0.6 },
  skeletonAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: RS.colors.card },
  skeletonLine: { height: 10, borderRadius: 4, backgroundColor: RS.colors.card, width: '90%' },
  emptyWrap: {
    marginHorizontal: RS.spacing.md,
    borderRadius:     RS.card.radius,
    borderWidth:      0.5,
    borderColor:      RS.colors.border,
    backgroundColor:  RS.colors.card,
    padding:          RS.spacing.lg,
    alignItems:       'center',
    gap:              RS.spacing.sm,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyBtnRow: { flexDirection: 'row', gap: 10 },
  emptyBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: RS.button.paddingH,
    paddingVertical:   RS.button.paddingV,
  },
  emptyBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth:      0.5,
    borderColor:      RS.colors.border,
  },
  emptyBtnLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
  emptyBtnGhostLabel: {
    color: RS.colors.textPrimary,
  },
  retryBtn: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: RS.button.paddingH,
    paddingVertical:   RS.button.paddingV,
  },
  retryLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
});
