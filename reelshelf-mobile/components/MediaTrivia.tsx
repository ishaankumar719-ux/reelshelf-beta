import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { getMediaKey } from '@/utils/listKeys';

const CARD_W = Dimensions.get('window').width - 2 * RS.spacing.md - RS.spacing.md;
const ITEM_SEP = RS.spacing.sm;

interface MediaTriviaProps {
  trivia?: string[];
}

// "Did You Know?" — a paginated (snapToInterval) horizontal FlatList is the
// "swipeable card" this brief asks for; deliberately NOT a new custom-gesture
// deck (that pattern is reserved for Collections' fanned deck and is out of
// scope here). Hides completely when no real, verified trivia has been
// curated for this title — every seeded entry's `trivia` is empty right now
// (see data/mediaDetails.ts) since fabricating facts about real films/shows
// is a real-world-accuracy issue, not a style choice.
export function MediaTrivia({ trivia }: MediaTriviaProps) {
  if (!trivia || trivia.length === 0) return null;

  return (
    <FlatList
      data={trivia}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(_, i) => getMediaKey('trivia', i)}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
      contentContainerStyle={styles.list}
      snapToInterval={CARD_W + ITEM_SEP}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <View style={[styles.card, { width: CARD_W }]}>
          <Text style={styles.cardText}>{item}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: RS.spacing.md,
  },
  card: {
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.md,
    justifyContent:  'center',
  },
  cardText: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    lineHeight: 21,
  },
});
