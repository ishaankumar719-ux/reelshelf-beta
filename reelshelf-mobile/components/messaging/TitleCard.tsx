import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { canonicalBookRouteId } from '@/lib/bookIdentity';
import { canonicalBookId, mediaTypeLabel, type SharedTitle } from '@/lib/messaging/api';

/** The in-app route id a shared title opens: film-<tmdb>, tv-<tmdb>, or
 *  book-<id> resolved through the same franchise mapping Search and the hub
 *  use, so a shared Hunger Games book opens its one Diary entry. */
export function sharedTitleRouteId(title: Pick<SharedTitle, 'media_type' | 'media_id'>): string {
  if (title.media_type === 'film') return `film-${title.media_id}`;
  if (title.media_type === 'tv') return `tv-${title.media_id}`;
  return canonicalBookRouteId(`book-${canonicalBookId(title.media_id)}`);
}

export function openSharedTitle(title: SharedTitle) {
  const id = sharedTitleRouteId(title);
  router.push(
    `/media/${id}?title=${encodeURIComponent(title.title)}&posterUrl=${encodeURIComponent(title.poster_url ?? '')}&mediaType=${title.media_type}`,
  );
}

/** A shared film, TV show or book: artwork, title, year and type. Tap opens
 *  the detail screen. */
export function TitleCard({ title, onLongPress, compact = false }: {
  title: SharedTitle; onLongPress?: () => void; compact?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const showArt = !!title.poster_url && !broken;
  const width = compact ? 40 : 56;
  return (
    <Pressable
      onPress={() => openSharedTitle(title)}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
      accessibilityRole="link"
      accessibilityLabel={`${title.title}${title.year ? `, ${title.year}` : ''}, ${mediaTypeLabel(title.media_type)}. Opens details`}
      testID="title-card"
    >
      <View style={[styles.art, { width, height: Math.round(width * 1.5) }]}>
        {showArt ? (
          <Image source={{ uri: title.poster_url! }} style={StyleSheet.absoluteFill} contentFit="cover"
            transition={150} onError={() => setBroken(true)} />
        ) : (
          // Same placeholder as PosterCard: gradient plus the title's initial.
          <LinearGradient colors={['#1a1a2a', '#0c0c14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.fallback]}>
            <Text style={[styles.initial, { fontSize: width * 0.45 }]}>{title.title.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.type}>{mediaTypeLabel(title.media_type)}</Text>
        <Text style={styles.title} numberOfLines={3}>{title.title}</Text>
        {title.year ? <Text style={styles.year}>{title.year}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  art: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#111' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700', color: RS.colors.textMuted },
  text: { flex: 1, gap: 3 },
  type: { fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: RS.colors.textMuted, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', color: RS.colors.textPrimary, lineHeight: 19 },
  year: { fontSize: 12, color: RS.colors.textMuted },
});
