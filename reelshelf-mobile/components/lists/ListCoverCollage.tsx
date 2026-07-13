import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export interface ListCoverItem {
  url: string | null; // already resolved
  alt: string;
}

interface ListCoverCollageProps {
  items: ListCoverItem[];
}

// Matches the website's ListCoverCollage.tsx exactly (WEBSITE_LISTS_AUDIT.md
// §1): 0 items → "Empty List" placeholder; 1 → full-bleed single cell; 2 →
// 2-column split; 3-4 → 2x2 grid with a dark placeholder cell if the 4th is
// missing. Cover art is always computed from item posters — never a stored
// field — so this component takes raw poster items, not a cover URL.
export function ListCoverCollage({ items }: ListCoverCollageProps) {
  const slots = items.slice(0, 4);
  const count = slots.length;

  if (count === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <View style={styles.emptyDivider} />
        <Text style={styles.emptyLabel}>Empty List</Text>
      </View>
    );
  }

  if (count === 1) {
    return (
      <View style={styles.frame}>
        <Cell item={slots[0]} />
      </View>
    );
  }

  if (count === 2) {
    return (
      <View style={[styles.frame, styles.rowGrid]}>
        <Cell item={slots[0]} style={styles.halfCell} />
        <Cell item={slots[1]} style={styles.halfCell} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, styles.quadGrid]}>
      <Cell item={slots[0]} style={styles.quarterCell} />
      <Cell item={slots[1]} style={styles.quarterCell} />
      <Cell item={slots[2]} style={styles.quarterCell} />
      {count === 4 ? <Cell item={slots[3]} style={styles.quarterCell} /> : <EmptyCell style={styles.quarterCell} />}
    </View>
  );
}

function Cell({ item, style }: { item: ListCoverItem; style?: object }) {
  if (!item.url) return <EmptyCell style={style} />;
  return (
    <View style={[styles.cell, style]}>
      <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="cover" alt={item.alt} />
    </View>
  );
}

function EmptyCell({ style }: { style?: object }) {
  return (
    <View style={[styles.cell, styles.emptyCell, style]}>
      <MaterialIcons name="movie" size={16} color="rgba(255,255,255,0.15)" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width:            '100%',
    height:           '100%',
    backgroundColor:  RS.colors.elevated,
    borderRadius:     RS.card.radius,
    overflow:         'hidden',
    borderWidth:      0.5,
    borderColor:      RS.colors.border,
  },
  rowGrid: {
    flexDirection: 'row',
    gap:           1,
  },
  quadGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           1,
  },
  halfCell: {
    width: '49.7%',
    height: '100%',
  },
  quarterCell: {
    width:  '49.7%',
    height: '49.7%',
  },
  cell: {
    position:        'relative',
    backgroundColor: '#06060e',
    overflow:        'hidden',
  },
  emptyCell: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  empty: {
    width:            '100%',
    height:           '100%',
    borderRadius:     RS.card.radius,
    backgroundColor:  '#050509',
    borderWidth:      0.5,
    borderColor:      RS.colors.border,
    alignItems:       'center',
    justifyContent:   'center',
    gap:              8,
    padding:          RS.spacing.md,
  },
  emptyIcon: {
    fontSize: 28,
    opacity:  0.3,
  },
  emptyDivider: {
    width:            32,
    height:           0.5,
    backgroundColor:  RS.colors.border,
  },
  emptyLabel: {
    fontSize:      9,
    fontWeight:    '700',
    color:         'rgba(255,255,255,0.32)',
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
});
