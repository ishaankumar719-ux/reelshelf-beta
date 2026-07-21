import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { SpoilerBlur } from '@/components/SpoilerBlur';
import type { MediaReviewEntry } from '@/lib/supabase/mediaReviews';

// Shared review-card display for Friend/Community Reviews on Media Detail —
// both sections show many different USERS' reviews of the SAME title, so the
// header here is avatar+name (not poster+title). That's a different
// orientation from ProfileView.tsx's renderReviewCard (one user's many
// different titles, poster+title header) — the two can't share one component
// without an awkward variant prop, but this reuses the same visual language
// (spoiler blur, cinema badge, GIF badge, RS tokens) established there, and
// adds favourite/rewatch badges to reach the full rating/text/GIF/image/
// cinema/spoiler/favourite/rewatch field set. Used identically by both
// sections so there is exactly one card implementation, not two.
export function MediaReviewCard({ entry }: { entry: MediaReviewEntry }) {
  const name = entry.displayName || entry.username || 'ReelShelf Member';

  const openProfile = () => router.push(`/profile/${entry.userId}`);

  return (
    <View style={styles.card}>
      <Pressable style={styles.headerRow} onPress={openProfile} hitSlop={4}>
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <MaterialIcons name="person" size={16} color={RS.colors.textMuted} />
          </View>
        )}
        <View style={styles.headerMeta}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.metaRow}>
            {entry.rating != null ? <Text style={styles.rating}>{entry.rating.toFixed(1)} / 10</Text> : null}
            {entry.watchedInCinema && (
              <View style={styles.cinemaBadge}>
                <MaterialIcons name="theaters" size={10} color={RS.colors.accent} />
                <Text style={styles.cinemaBadgeLabel}>Cinema</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {entry.review ? (
        <SpoilerBlur active={entry.containsSpoilers}>
          <Text style={styles.reviewText} numberOfLines={5}>{entry.review}</Text>
        </SpoilerBlur>
      ) : null}

      {(entry.favourite || entry.rewatch) && (
        <View style={styles.badgeRow}>
          {entry.favourite && (
            <View style={styles.badge}>
              <MaterialIcons name="favorite" size={10} color="#fb7185" />
              <Text style={[styles.badgeLabel, { color: '#fb7185' }]}>Favourite</Text>
            </View>
          )}
          {entry.rewatch && (
            <View style={styles.badge}>
              <MaterialIcons name="replay" size={10} color={RS.colors.textSecondary} />
              <Text style={styles.badgeLabel}>Rewatch</Text>
            </View>
          )}
        </View>
      )}

      {entry.attachmentUrl && (
        <View>
          <Image source={{ uri: entry.attachmentUrl }} style={styles.attachment} contentFit="cover" />
          {entry.attachmentType === 'gif' && (
            <View style={styles.gifBadge}>
              <Text style={styles.gifBadgeLabel}>GIF</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.md,
    gap:             RS.spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1, gap: 2 },
  name: { fontSize: RS.typography.caption + 1, fontWeight: '700', color: RS.colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rating: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.accent },
  cinemaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4, backgroundColor: RS.colors.accentGlow, paddingHorizontal: 6, paddingVertical: 2 },
  cinemaBadgeLabel: { fontSize: 9, fontWeight: '700', color: RS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  reviewText: { fontSize: RS.typography.body, color: RS.colors.textSecondary, lineHeight: 20 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RS.button.radius, backgroundColor: RS.colors.elevated, paddingHorizontal: 8, paddingVertical: 3 },
  badgeLabel: { fontSize: 10, fontWeight: '600', color: RS.colors.textSecondary },
  attachment: { width: '100%', height: 140, borderRadius: RS.card.radius - 4 },
  gifBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2 },
  gifBadgeLabel: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
});
