import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { MediaType } from '@/data/seedHomeContent';

export interface PosterCardProps {
  title?:     string;
  year?:      number;
  mediaType?: MediaType;
  posterUrl?: string | null;
  width?:     number;
  height?:    number;
}

export function PosterCard({
  title,
  year,
  mediaType,
  posterUrl,
  width  = RS.card.posterWidth,
  height = RS.card.posterHeight,
}: PosterCardProps = {}) {
  const badge   = mediaType ? RS.badge[mediaType] : null;
  const initial = title ? title[0].toUpperCase() : '';

  return (
    <View style={[styles.card, { width, height }]}>
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={['#1a1a2a', '#0c0c14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fallback]}
        >
          {initial ? <Text style={styles.initial}>{initial}</Text> : null}
        </LinearGradient>
      )}

      {/* Gradient overlay — only needed when real poster is shown */}
      {posterUrl && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.82)']}
          start={{ x: 0, y: 0.45 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {badge && (
        <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
        </View>
      )}

      <View style={styles.footer}>
        {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
        {year  ? <Text style={styles.year}>{year}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:   RS.card.radius,
    overflow:       'hidden',
    borderWidth:    0.5,
    borderColor:    RS.colors.border,
    justifyContent: 'flex-end',
  },
  fallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize:   36,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  badgePill: {
    position:          'absolute',
    top:               RS.spacing.xs,
    left:              RS.spacing.xs,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: RS.spacing.xs,
    paddingBottom:     RS.spacing.xs,
    gap:               2,
  },
  title: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
    lineHeight: 14,
  },
  year: {
    fontSize: 10,
    color:    RS.colors.textMuted,
  },
});
