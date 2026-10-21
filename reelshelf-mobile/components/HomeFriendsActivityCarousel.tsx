import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Dimensions, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { ActivityCard } from '@/components/activity/ActivityCard';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFollowingActivityFeed, type ActivityEvent } from '@/lib/supabase/activityFeed';
import { webUrl } from '@/lib/webUrl';

const PREVIEW_LIMIT = 10;
const ITEM_SEP = RS.spacing.sm;

// Wide "peek the next card" sizing, matching components/MediaTrivia.tsx's
// convention for non-poster-shaped horizontal cards — Home's own horizontal
// carousel (BecauseYouLovedCarousel.tsx) sizes items to a fixed
// RS.card.posterWidth, which doesn't apply here: ActivityCard is a
// full-width review card, not a poster. Screen width minus the section's
// own left/right padding, minus one more spacing.md so the next card visibly
// peeks in from the edge.
const CARD_W = Dimensions.get('window').width - 2 * RS.spacing.md - RS.spacing.md;


// Horizontal, swipeable carousel of the real "Following" feed — each item is
// the exact, unmodified ActivityCard component already used on the full
// Activity screen (poster, reaction tray, inline expand-to-comment, replies,
// attachments — all real, none rebuilt here). Reuses fetchFollowingActivityFeed,
// the same function app/activity.tsx's Following tab calls, capped to
// PREVIEW_LIMIT with no pagination.
export function HomeFriendsActivityCarousel() {
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
        // ported unchanged from HomeFriendsActivityPreview.tsx.
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
    const inviteUrl = webUrl();
    Share.share({
      title:   'Join me on ReelShelf',
      message: inviteUrl
        ? `Come track and share what you're watching and reading with me on ReelShelf: ${inviteUrl}`
        : `Come track and share what you're watching and reading with me on ReelShelf. It's in private beta on iPhone, so ask me for an invite code.`,
      ...(inviteUrl ? { url: inviteUrl } : {}), // iOS-only field; harmless no-op on Android
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
        <View style={styles.skeletonWrap}>
          <SkeletonBlock width={CARD_W} height={150} radius={RS.card.radius} />
        </View>
      ) : events.length > 0 ? (
        <FlatList<ActivityEvent>
          data={events}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(event) => event.id}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
          contentContainerStyle={styles.list}
          snapToInterval={CARD_W + ITEM_SEP}
          decelerationRate="fast"
          // No getItemLayout: unlike BecauseYouLovedCarousel's uniform-height
          // poster items, ActivityCard's height genuinely varies (comment
          // panel expansion) — getItemLayout assumes a fixed length per item,
          // which would be wrong here.
          renderItem={({ item }) => (
            <View style={{ width: CARD_W }}>
              <ActivityCard event={item} />
            </View>
          )}
        />
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
    gap: RS.spacing.sm,
  },
  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: RS.spacing.md,
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
  skeletonWrap: {
    paddingHorizontal: RS.spacing.md,
  },
  list: {
    paddingHorizontal: RS.spacing.md,
    // Cards keep their own natural (possibly expanding) height — without
    // this, the horizontal FlatList's default cross-axis 'stretch' would
    // force every visible card to match the tallest one (e.g. one with its
    // comment panel open), distorting the rest. Neither of the two existing
    // Home carousel precedents (BecauseYouLovedCarousel.tsx, MediaTrivia.tsx)
    // sets this explicitly — they don't need to, since their items are all
    // uniform fixed-height poster/text cards with nothing that expands.
    alignItems: 'flex-start',
  },
  emptyWrap: {
    marginHorizontal: RS.spacing.md,
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
