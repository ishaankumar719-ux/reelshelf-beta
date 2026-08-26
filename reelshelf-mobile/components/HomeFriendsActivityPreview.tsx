import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFollowingActivityFeed, type ActivityEvent } from '@/lib/supabase/activityFeed';

const PREVIEW_LIMIT = 3;

// Established app-wide canonical share link. HomeFriendsActivity.tsx (the
// section this previews/replaces) held its own REELSHELF_INVITE_URL, but
// that file — and the constant — is gone; no shared exported constant
// exists for it today. This is the same literal value every other real
// share/link surface already uses (components/MediaPrimaryActions.tsx's
// `https://reelshelf.app/media/${id}`, app/list/[id].tsx's
// `https://reelshelf.app/lists/${id}`, app/settings/index.tsx's own
// WEBSITE_URL) — reused verbatim rather than inventing a new one.
const INVITE_URL = 'https://reelshelf.app';

// fetchFollowingActivityFeed only ever produces these 4 types (see its
// favourite/isTV/hasReview branch in lib/supabase/activityFeed.ts) — no
// need for the other ActivityType members ActivityCard.tsx's TYPE_CONFIG
// handles for the full feed (rushmore, list_created, etc.).
const VERB: Partial<Record<ActivityEvent['type'], string>> = {
  reviewed:        'reviewed',
  added_favourite: 'favourited',
  watched_episode: 'watched',
  logged:          'logged',
};

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function RowAvatar({ url, name }: { url: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();
  return url && !broken ? (
    <Image source={{ uri: url }} style={styles.avatar} contentFit="cover" onError={() => setBroken(true)} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
}

// Minimal, non-interactive row for one ActivityEvent — deliberately NOT a
// reuse of components/activity/ActivityCard.tsx's row. That component is
// tightly coupled to app/activity.tsx's own state (its own useState for
// liked/likeCount/commentCount/commentsOpen, fed by a separate
// getLikeCountsForEntries/getCommentCountsForEntries/getLikedDiaryEntryIds
// fetch only that screen performs) and renders a like/comment footer plus an
// expandable comment composer — none of which belongs in a compact Home
// preview. Splitting ActivityCard apart to extract a "pure" row would touch
// the one screen this task says must keep rendering exactly as-is, so this
// duplicates just the handful of presentational fields a preview actually
// needs instead.
function PreviewRow({ event, onPress }: { event: ActivityEvent; onPress: () => void }) {
  const name = event.profile.displayName ?? event.profile.username ?? 'ReelShelf Member';
  const verb = VERB[event.type] ?? 'logged';
  // Mirrors ActivityCard.tsx's own isBatchLogging convention exactly (same
  // >= 4 threshold, same "N films" phrasing) so a batched event reads the
  // same way here as it does on the full Activity screen. In practice
  // fetchFollowingActivityFeed always sets isBatch: false — the batching
  // this mirrors only happens in fetchMyActivity's "My Activity" merge — so
  // this branch is defensive parity rather than something reachable today.
  const isBatchLogging = event.isBatch && (event.batchCount ?? 0) >= 4;
  const what = isBatchLogging ? `${event.batchCount} films` : event.title;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <RowAvatar url={event.profile.avatarUrl} name={name} />
      <Text style={styles.rowLine} numberOfLines={1}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowRest}> {verb} {what} · {timeAgo(event.timestamp)}</Text>
      </Text>
    </Pressable>
  );
}

// Compact Home teaser for the real "Following" feed — reuses
// fetchFollowingActivityFeed (the exact same function app/activity.tsx's
// Following tab calls) rather than any homeFriendsActivity.ts-style
// standalone query. Never renders more than PREVIEW_LIMIT rows and is
// visibly smaller than ContinueWatchingSection's ~198px section
// (SectionHeader + 148px card) or a HomeDiscoverSections carousel row.
export function HomeFriendsActivityPreview() {
  const { user, initializing } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[] | undefined>(undefined);

  const load = useCallback(() => {
    if (initializing || !user?.id) {
      setEvents(undefined);
      return () => {};
    }
    let cancelled = false;
    const userId = user.id;
    fetchFollowingActivityFeed(userId, PREVIEW_LIMIT)
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
      })
      .catch(() => {
        // Fail silently into the same empty/fallback branch as "no items" —
        // matches DailyReel's quiet-failure convention (its useDailyPick
        // hook renders nothing rather than a distinct error UI) rather than
        // ContinueWatchingSection's explicit Retry state, per this task's
        // instruction to fail silently rather than surface an error.
        if (cancelled) return;
        setEvents([]);
      });
    return () => { cancelled = true; };
  }, [initializing, user?.id]);

  useEffect(() => load(), [load]);

  const openFindFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/search?category=users');
  };

  const openInviteFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Share.share({
      title:   'Join me on ReelShelf',
      message: `Come track and share what you're watching and reading with me on ReelShelf — ${INVITE_URL}`,
      url:     INVITE_URL, // iOS-only field; harmless no-op on Android
    }).catch(() => {});
  };

  const openActivity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/activity');
  };

  if (!user) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Friends Activity</Text>
        {events && events.length > 0 && (
          <Pressable onPress={openActivity} hitSlop={8} style={styles.seeAllBtn}>
            <Text style={styles.seeAllLabel}>See all</Text>
            <MaterialIcons name="chevron-right" size={14} color={RS.button.primaryText} />
          </Pressable>
        )}
      </View>

      {events === undefined ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <SkeletonBlock width={28} height={28} radius={14} />
              <SkeletonBlock width="70%" height={12} />
            </View>
          ))}
        </View>
      ) : events.length > 0 ? (
        <View style={styles.list}>
          {events.map((event) => (
            <PreviewRow key={event.id} event={event} onPress={openActivity} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Follow people to see their activity here.</Text>
          <View style={styles.emptyBtnRow}>
            <Pressable style={styles.emptyBtnTinted} onPress={openFindFriends}>
              <MaterialIcons name="person-search" size={15} color={RS.button.primaryText} />
              <Text style={styles.emptyBtnTintedLabel}>Find Friends</Text>
            </Pressable>
            <Pressable style={styles.emptyBtnGhost} onPress={openInviteFriends}>
              <MaterialIcons name="ios-share" size={15} color={RS.button.secondaryText} />
              <Text style={styles.emptyBtnGhostLabel}>Invite Friends</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap:               RS.spacing.sm,
    paddingHorizontal: RS.spacing.md,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  seeAllLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.primaryText,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    paddingVertical: 6,
  },
  avatar: {
    width:        28,
    height:       28,
    borderRadius: 14,
  },
  avatarFallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    fontSize:   11,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  rowLine: {
    flex:     1,
    fontSize: RS.typography.caption,
  },
  rowName: {
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  rowRest: {
    color: RS.colors.textMuted,
  },
  skeletonList: {
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  emptyWrap: {
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.sm + 4,
    gap:             RS.spacing.sm,
  },
  emptyText: {
    fontSize: RS.typography.body,
    color:    RS.colors.textMuted,
  },
  emptyBtnRow: {
    flexDirection: 'row',
    gap:           8,
  },
  emptyBtnTinted: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.primaryFill,
    borderWidth:       1,
    borderColor:       RS.button.primaryBorder,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 2,
  },
  emptyBtnTintedLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.primaryText,
  },
  emptyBtnGhost: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.button.secondaryBorder,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 2,
  },
  emptyBtnGhostLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.secondaryText,
  },
});
