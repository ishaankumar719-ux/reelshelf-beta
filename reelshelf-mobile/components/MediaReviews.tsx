import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface MediaReviewsProps {
  review: string;
}

// "Your Review" is the one real review source — pulled from the locally-
// persisted review saved via the Review button (see hooks/useMediaPersistence.ts).
// Friend Reviews and Community Reviews show honest empty states, since no
// real other-user/social data exists — never fabricated names, avatars,
// ratings, or review text.
//
// Like is intentionally omitted: there's no one else to like your own review
// yet, so a Like control here would be decorative rather than functional.
// Reply is kept as a future-ready, non-functional affordance (same no-op
// convention already used elsewhere, e.g. "Add to List") so the card reads
// as complete once real accounts/social features exist.
export function MediaReviews({ review }: MediaReviewsProps) {
  const handleReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    console.log('[Movie Detail] Reply pressed — no-op (no accounts yet)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.subSection}>
        <Text style={styles.heading}>Your Review</Text>
        {review ? (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewText}>{review}</Text>
            <Pressable style={styles.replyBtn} onPress={handleReply} hitSlop={6}>
              <MaterialIcons name="reply" size={14} color={RS.colors.textMuted} />
              <Text style={styles.replyLabel}>Reply</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.emptyText}>Add your review using the Review button above.</Text>
        )}
      </View>

      <View style={styles.subSection}>
        <Text style={styles.heading}>Friend Reviews</Text>
        <Text style={styles.emptyText}>No friends have reviewed this yet.</Text>
      </View>

      <View style={styles.subSection}>
        <Text style={styles.heading}>Community Reviews</Text>
        <Text style={styles.emptyText}>No community reviews yet.</Text>
      </View>
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
  replyBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    alignSelf:     'flex-start',
  },
  replyLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textMuted,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    fontStyle: 'italic',
  },
});
