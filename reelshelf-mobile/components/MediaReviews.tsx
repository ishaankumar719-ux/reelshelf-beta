import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaReviewCard } from '@/components/MediaReviewCard';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SpoilerBlur } from '@/components/SpoilerBlur';
import { UniversalReviewComposer } from '@/components/UniversalReviewComposer';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaType } from '@/data/seedHomeContent';
import type { DiaryEntryFull } from '@/lib/supabase/diaryComposer';
import {
  fetchCommunityReviewsForMedia,
  fetchFriendReviewsForMedia,
  type MediaReviewEntry,
} from '@/lib/supabase/mediaReviews';
import { getMediaKey } from '@/utils/listKeys';

interface MediaReviewsProps {
  id:               string;
  mediaType:        MediaType;
  title:            string;
  posterUrl:        string | null;
  year:             number;
  genres?:          string[];
  runtime?:         number | null;
  voteAverage?:     number | null;
  director?:        string | null;
  review:           string;
  containsSpoilers: boolean;
  onReviewSaved:    (entry: DiaryEntryFull) => void;
}

type ListStatus = 'loading' | 'success' | 'error';

// "Your Review" is real — the local user's diary_entries row, tap-to-edit via
// the same Universal Review Composer used by the Review action pill. Friend
// Reviews is a real query (followed users' public reviews for this exact
// title, via the `followers` table — same shape as FriendActivity.tsx but
// filtered to entries with actual review text). Community Reviews is real
// too: RLS ("Public can view shared diary entries" — profiles.username is
// not null) permits reading any public user's diary_entries, not just
// followed ones, so the same query without the followers filter, excluding
// the current user and whoever's already shown in Friend Reviews, is exactly
// as practical to build — no data-volume concern at this app's real scale.
export function MediaReviews({
  id, mediaType, title, posterUrl, year, genres, runtime, voteAverage, director,
  review, containsSpoilers, onReviewSaved,
}: MediaReviewsProps) {
  const { user } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);

  const [friendStatus, setFriendStatus] = useState<ListStatus>('loading');
  const [friendReviews, setFriendReviews] = useState<MediaReviewEntry[]>([]);

  const [communityStatus, setCommunityStatus] = useState<ListStatus>('loading');
  const [communityReviews, setCommunityReviews] = useState<MediaReviewEntry[]>([]);

  useEffect(() => {
    if (!user) {
      setFriendStatus('success');
      setFriendReviews([]);
      return;
    }
    let cancelled = false;
    setFriendStatus('loading');
    fetchFriendReviewsForMedia(user.id, { id, mediaType })
      .then((data) => {
        if (cancelled) return;
        setFriendReviews(data);
        setFriendStatus('success');
      })
      .catch(() => { if (!cancelled) setFriendStatus('error'); });
    return () => { cancelled = true; };
  }, [user, id, mediaType]);

  useEffect(() => {
    let cancelled = false;
    setCommunityStatus('loading');
    const exclude = [
      ...(user ? [user.id] : []),
      ...friendReviews.map((r) => r.userId),
    ];
    fetchCommunityReviewsForMedia({ id, mediaType }, exclude)
      .then((data) => {
        if (cancelled) return;
        setCommunityReviews(data);
        setCommunityStatus('success');
      })
      .catch(() => { if (!cancelled) setCommunityStatus('error'); });
    return () => { cancelled = true; };
    // Re-runs once friendStatus settles so the exclusion set is final —
    // avoids a request with a still-empty friend list racing the real one.
  }, [id, mediaType, user, friendStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const openComposer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setComposerOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.subSection}>
        <Text style={styles.heading}>Your Review</Text>
        {review ? (
          <Pressable style={styles.reviewCard} onPress={openComposer}>
            <SpoilerBlur active={containsSpoilers}>
              <Text style={styles.reviewText}>{review}</Text>
            </SpoilerBlur>
            <View style={styles.editRow}>
              <MaterialIcons name="edit" size={14} color={RS.colors.textMuted} />
              <Text style={styles.editLabel}>Edit</Text>
            </View>
          </Pressable>
        ) : (
          <Text style={styles.emptyText}>Add your review using the Review button above.</Text>
        )}
      </View>

      <View style={styles.subSection}>
        <Text style={styles.heading}>Friend Reviews</Text>
        {!user ? (
          <SignInPrompt message="Sign in to see what friends you follow think of this." />
        ) : friendStatus === 'loading' ? (
          <ActivityIndicator color={RS.colors.accent} style={styles.loader} />
        ) : friendStatus === 'error' ? (
          <Text style={styles.emptyText}>Couldn&apos;t load friend reviews.</Text>
        ) : friendReviews.length === 0 ? (
          <Text style={styles.emptyText}>No friends have reviewed this yet.</Text>
        ) : (
          <View style={styles.cardList}>
            {friendReviews.map((entry) => (
              <MediaReviewCard key={getMediaKey('friend-review', entry.userId)} entry={entry} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.subSection}>
        <Text style={styles.heading}>Community Reviews</Text>
        {communityStatus === 'loading' ? (
          <ActivityIndicator color={RS.colors.accent} style={styles.loader} />
        ) : communityStatus === 'error' ? (
          <Text style={styles.emptyText}>Couldn&apos;t load community reviews.</Text>
        ) : communityReviews.length === 0 ? (
          <Text style={styles.emptyText}>No community reviews yet.</Text>
        ) : (
          <View style={styles.cardList}>
            {communityReviews.map((entry) => (
              <MediaReviewCard key={getMediaKey('community-review', entry.userId)} entry={entry} />
            ))}
          </View>
        )}
      </View>

      <UniversalReviewComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSaved={onReviewSaved}
        mediaId={id}
        mediaType={mediaType}
        title={title}
        posterUrl={posterUrl}
        year={year}
        genres={genres}
        runtime={runtime}
        voteAverage={voteAverage}
        director={director}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.lg,
  },
  subSection: {
    gap: RS.spacing.xs,
  },
  heading: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  reviewCard: {
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    padding:           RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  reviewText: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    lineHeight: 21,
  },
  editRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    alignSelf:     'flex-start',
  },
  editLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textMuted,
  },
  cardList: {
    gap: RS.spacing.sm,
  },
  loader: {
    marginVertical: RS.spacing.md,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    fontStyle: 'italic',
  },
});
