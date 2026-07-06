import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { MediaType } from '@/data/mockHomeContent';

// Deterministic background tints — no network request, no fabricated artwork
const CARD_TINTS = [
  '#0f1628', '#1a0f28', '#0f1f18', '#281a0f',
  '#1f0f1a', '#0f1f28', '#1a1008', '#1a0808',
] as const;

function tintFromSeed(seed: number) {
  return CARD_TINTS[seed % CARD_TINTS.length];
}

interface PosterCardProps {
  title?:     string;
  year?:      number;
  mediaType?: MediaType;
  colorSeed?: number;
}

// static placeholder layout — no data source yet
export function PosterCard({ title, year, mediaType, colorSeed = 1 }: PosterCardProps = {}) {
  const badge = mediaType ? RS.badge[mediaType] : null;
  const bg    = tintFromSeed(colorSeed);

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      {/* Media-type badge — top left */}
      {badge && (
        <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeLabel, { color: badge.text }]}>{badge.label}</Text>
        </View>
      )}

      {/* Bottom: title + year, or generic label */}
      {title ? (
        <View style={styles.footer}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {year ? <Text style={styles.year}>{year}</Text> : null}
        </View>
      ) : (
        <Text style={styles.placeholder}>Poster</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width:        RS.card.posterWidth,
    height:       RS.card.posterHeight,
    borderRadius: RS.card.radius,
    overflow:     'hidden',
    justifyContent: 'flex-end',
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
  placeholder: {
    position:   'absolute',
    bottom:     RS.spacing.sm,
    alignSelf:  'center',
    fontSize:   RS.typography.caption,
    color:      RS.colors.textMuted,
    fontWeight: '500',
  },
});
