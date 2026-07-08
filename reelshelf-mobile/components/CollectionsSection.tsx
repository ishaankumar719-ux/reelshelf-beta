import { StyleSheet, View } from 'react-native';

import { CollectionCard } from '@/components/CollectionCard';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { collections, COLLECTION_OF_THE_WEEK_ID } from '@/data/seedHomeContent';

// One featured collection — no outer carousel, no card-to-card swipe.
// The inner poster strip inside CollectionCard remains swipeable for browsing
// that collection's items. Change COLLECTION_OF_THE_WEEK_ID to feature a different one.
const featuredCollection = collections.find(c => c.id === COLLECTION_OF_THE_WEEK_ID) ?? collections[0];

export function CollectionsSection() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Collection of the Week" subtitle="Hand-picked by ReelShelf." />
      <View style={styles.cardWrapper}>
        <CollectionCard item={featuredCollection} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:     { gap: RS.spacing.xs },
  cardWrapper: { paddingHorizontal: RS.spacing.md },
});
