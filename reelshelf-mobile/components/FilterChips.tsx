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
            style={[styles.chip, active && styles.chipActive]}
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
    gap:               RS.spacing.xs,
    flexDirection:     'row',
    alignItems:        'center',
  },
  chip: {
    borderRadius:      RS.badge.pillRadius,
    borderWidth:       1,
    borderColor:       RS.colors.border,
    paddingHorizontal: 14,
    paddingVertical:   6,
    backgroundColor:   RS.colors.card,
  },
  chipActive: {
    backgroundColor: RS.colors.accent,
    borderColor:     RS.colors.accent,
  },
  label: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  labelActive: {
    color: '#ffffff',
  },
});
