// Shared list preview card — extracted from app/(tabs)/lists.tsx so it can
// be reused by the new Lists Discovery screen without duplicating it.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ListCoverCollage } from '@/components/lists/ListCoverCollage';
import { RS } from '@/constants/theme';
import type { UserListSummary } from '@/lib/supabase/lists';

export function ListCard({ list, onPress }: { list: UserListSummary; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.coverWrap}>
        <ListCoverCollage items={list.previewPosters.map((url, i) => ({ url, alt: `${list.title} cover ${i + 1}` }))} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{list.title}</Text>
          {list.isRanked && (
            <View style={styles.rankedBadge}>
              <Text style={styles.rankedBadgeLabel}>Ranked</Text>
            </View>
          )}
        </View>
        {list.ownerName ? <Text style={styles.cardOwner} numberOfLines={1}>by {list.ownerName}</Text> : null}
        {list.description ? <Text style={styles.cardDescription} numberOfLines={2}>{list.description}</Text> : null}
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaLeft}>
            <Text style={styles.cardCount}>{list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}</Text>
            {list.likeCount > 0 && <Text style={styles.cardLikeCount}>♡ {list.likeCount}</Text>}
          </View>
          {list.visibility !== 'public' && (
            <Text style={styles.cardVisibility}>
              {list.visibility === 'private' ? '🔒 Private' : '🔗 Unlisted'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    overflow:          'hidden',
  },
  coverWrap: {
    width:  '100%',
    height: 140,
  },
  cardBody: {
    padding: RS.spacing.md,
    gap:     RS.spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.xs,
  },
  cardTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    flexShrink:    1,
  },
  rankedBadge: {
    borderRadius:      4,
    borderWidth:       0.5,
    borderColor:       'rgba(251,191,36,0.3)',
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  rankedBadgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color:         'rgba(251,191,36,0.85)',
  },
  cardOwner: {
    fontSize:   RS.typography.overline,
    fontWeight: '600',
    color:      RS.colors.textMuted,
  },
  cardDescription: {
    fontSize: RS.typography.caption + 1,
    color:    RS.colors.textSecondary,
  },
  cardMetaRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:      2,
  },
  cardMetaLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  cardCount: {
    fontSize:      RS.typography.overline,
    fontWeight:    '600',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
  cardLikeCount: {
    fontSize:   RS.typography.overline,
    fontWeight: '600',
    color:      'rgba(248,113,113,0.75)',
  },
  cardVisibility: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
});
