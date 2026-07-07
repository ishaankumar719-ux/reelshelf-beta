import { FlatList, type ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';

import { AnimatedPosterCard } from '@/components/AnimatedPosterCard';
import { RS } from '@/constants/theme';
import { type SeedCardItem, becauseYouLoved } from '@/data/seedHomeContent';

const ITEM_SEP = RS.spacing.sm;

interface BecauseYouLovedSectionProps {
  title:    string;
  subtitle: string;
}

export function BecauseYouLovedSection({ title, subtitle }: BecauseYouLovedSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>Because You Loved {title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <FlatList<SeedCardItem>
        data={becauseYouLoved}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }: ListRenderItemInfo<SeedCardItem>) => (
          <AnimatedPosterCard
            title={item.title}
            year={item.year}
            mediaType={item.mediaType}
            posterUrl={item.posterUrl}
          />
        )}
        getItemLayout={(_, index) => ({
          length: RS.card.posterWidth,
          offset: (RS.card.posterWidth + ITEM_SEP) * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: RS.spacing.sm,
  },
  header: {
    paddingHorizontal: RS.spacing.md,
    gap:               2,
  },
  heading: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: RS.spacing.md,
  },
});
