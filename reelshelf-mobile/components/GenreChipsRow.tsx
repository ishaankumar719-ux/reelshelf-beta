import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { GENRE_CONFIG } from '@/lib/genreConfig';
import { getMediaKey } from '@/utils/listKeys';

const VISIBLE_COUNT = 8;

// Direct port of the website's Discover genre-chip row
// (components/discover/DiscoverClient.tsx's GENRE_CHIPS + "+N More" expand),
// which is the website's ONLY real entry point into genre browsing — Movie/TV
// Detail's genre metadata is plain text there, never a link, so it stays
// plain text on mobile too (see components/MediaHero.tsx — not touched here).
export function GenreChipsRow() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? GENRE_CONFIG : GENRE_CONFIG.slice(0, VISIBLE_COUNT);
  const hiddenCount = GENRE_CONFIG.length - VISIBLE_COUNT;

  const handlePress = (slug: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/genre/${slug}`);
  };

  return (
    <View style={styles.wrap}>
      {visible.map((g) => (
        <Pressable key={getMediaKey('genre-chip', g.slug)} style={styles.chip} onPress={() => handlePress(g.slug)}>
          <Text style={styles.emoji}>{g.emoji}</Text>
          <Text style={styles.label}>{g.label}</Text>
        </Pressable>
      ))}
      {!expanded && hiddenCount > 0 && (
        <Pressable style={styles.moreChip} onPress={() => setExpanded(true)}>
          <Text style={styles.moreLabel}>+{hiddenCount} More</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    flexWrap:           'wrap',
    gap:                RS.spacing.xs + 2,
    paddingHorizontal:  RS.spacing.md,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  emoji: { fontSize: 14 },
  label: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  moreChip: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: 14,
    paddingVertical:   8,
    justifyContent:    'center',
  },
  moreLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.accent },
});
