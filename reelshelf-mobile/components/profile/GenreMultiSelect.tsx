import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { getMediaKey } from '@/utils/listKeys';

// Extracted from EditProfileModal.tsx (was inline JSX there) so onboarding's
// favourite-genres step can reuse the exact same options/toggle/visual
// treatment rather than a second copy — EditProfileModal now renders this
// too, unchanged in behavior.
export const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Animation', 'Thriller',
  'Romance', 'Action', 'Documentary', 'Fantasy', 'Mystery', 'Adventure', 'Crime',
] as const;

interface GenreMultiSelectProps {
  selected: string[];
  onToggle: (genre: string) => void;
}

export function GenreMultiSelect({ selected, onToggle }: GenreMultiSelectProps) {
  const handleToggle = (genre: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(genre);
  };

  return (
    <View style={styles.grid}>
      {GENRE_OPTIONS.map((genre) => {
        const active = selected.includes(genre);
        return (
          <Pressable
            key={getMediaKey('genre', genre)}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => handleToggle(genre)}
            accessibilityRole="button"
            accessibilityLabel={genre}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{genre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           RS.spacing.xs + 2,
  },
  chip: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: 12,
    paddingVertical:   7,
    backgroundColor:   RS.colors.elevated,
  },
  chipActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
  },
  label: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  labelActive: {
    color: RS.button.primaryText,
  },
});
