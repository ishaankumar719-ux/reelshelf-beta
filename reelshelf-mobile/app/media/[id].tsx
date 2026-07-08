/**
 * PLACEHOLDER — minimal media detail screen.
 * Receives: id, title, posterUrl, mediaType via route params.
 * Phase 5 will replace with full detail: cast, synopsis, reviews, ratings.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS, Fonts } from '@/constants/theme';

const POSTER_W = 180;
const POSTER_H = POSTER_W * 1.5;

export default function MediaDetailScreen() {
  const { title, posterUrl, mediaType } = useLocalSearchParams<{
    id:        string;
    title:     string;
    posterUrl: string;
    mediaType: string;
  }>();

  const badgeMap = { film: RS.badge.film, tv: RS.badge.tv, book: RS.badge.book } as const;
  const badge    = badgeMap[(mediaType as keyof typeof badgeMap)] ?? RS.badge.film;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Back navigation */}
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backChevron}>‹</Text>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Poster */}
        <View style={styles.posterOuter}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.poster}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <View style={[styles.poster, styles.posterFallback]} />
          )}
        </View>

        {/* Media type badge */}
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title ?? '—'}</Text>

        {/* Placeholder note */}
        <Text style={styles.placeholder}>
          Full detail page — cast, synopsis, and reviews coming in a future sprint.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  backRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm,
    gap:             4,
  },
  backChevron: {
    fontSize:  26,
    color:     RS.colors.textPrimary,
    lineHeight: 30,
    marginTop: -2,
  },
  backLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '500',
    color:      RS.colors.textPrimary,
  },
  content: {
    alignItems:     'center',
    paddingHorizontal: RS.spacing.lg,
    paddingTop:        RS.spacing.lg,
    paddingBottom:     RS.spacing.xxxl,
    gap:               RS.spacing.md,
  },
  posterOuter: {
    borderRadius:  12,
    overflow:      'hidden',
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity * 2,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  poster: {
    width:        POSTER_W,
    height:       POSTER_H,
    borderRadius: 12,
  },
  posterFallback: {
    backgroundColor: RS.colors.card,
  },
  badge: {
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:    RS.spacing.xs - 1,
    borderRadius:       RS.badge.pillRadius,
  },
  badgeText: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    letterSpacing: RS.letterSpacing.widest,
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    lineHeight:    28,
    letterSpacing: RS.letterSpacing.tight,
  },
  placeholder: {
    fontSize:   RS.typography.caption,
    fontWeight: '400',
    color:      RS.colors.textMuted,
    textAlign:  'center',
    lineHeight: 18,
    marginTop:  RS.spacing.sm,
  },
});
