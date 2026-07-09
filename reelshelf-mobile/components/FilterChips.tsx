import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { RS } from '@/constants/theme';

const DISCOVER_CHIPS = [
  'Movies', 'TV', 'Books', 'Trending', 'New',
  'Award Winners', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Animation',
] as const;

interface FilterChipsProps {
  /** Chip labels to render. Defaults to the Discover set. */
  chips?: readonly string[];
}

export function FilterChips({ chips = DISCOVER_CHIPS }: FilterChipsProps = {}) {
  const [selected, setSelected] = useState<string>(chips[0] ?? '');

  const handlePress = (chip: string) => {
    setSelected(chip);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const active = chip === selected;
        return (
          <Pressable
            key={chip}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : pressed && styles.chipPressed,
            ]}
            onPress={() => handlePress(chip)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{chip}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.xs + 2,
    flexDirection:     'row',
    alignItems:        'center',
  },
  // Pill chips — refined, restrained
  chip: {
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.colors.border,
    paddingHorizontal: 14,
    paddingVertical:   6,
    backgroundColor:   'transparent',
  },
  chipActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
  },
  chipPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  label: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
  labelActive: {
    color: RS.button.primaryText,
  },
});
