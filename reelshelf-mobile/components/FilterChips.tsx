import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { RS } from '@/constants/theme';

const CHIPS = ['All', 'Movies', 'TV', 'Books', 'Trending', 'New', 'Popular', 'Hidden Gems'] as const;
type Chip = (typeof CHIPS)[number];

export function FilterChips() {
  const [selected, setSelected] = useState<Chip>('All');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((chip) => {
        const active = chip === selected;
        return (
          <Pressable
            key={chip}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : pressed && styles.chipPressed,
            ]}
            onPress={() => setSelected(chip)}
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
