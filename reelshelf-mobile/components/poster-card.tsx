import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

// static placeholder layout — no data source yet
export function PosterCard() {
  return (
    <View style={styles.card}>
      <View style={styles.tint} />
      <Text style={styles.label}>Poster</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width:           RS.card.posterWidth,
    height:          RS.card.posterHeight,
    backgroundColor: RS.colors.elevated,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    alignItems:      'center',
    justifyContent:  'flex-end',
    paddingBottom:   RS.spacing.sm,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RS.colors.accent,
    opacity:         0.06,
  },
  label: {
    fontSize:   RS.typography.caption,
    color:      RS.colors.textMuted,
    fontWeight: '500',
  },
});
