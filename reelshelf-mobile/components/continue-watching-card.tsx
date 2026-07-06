import { StyleSheet, View } from 'react-native';

import { RS } from '@/constants/theme';

// static placeholder layout — no data source yet
export function ContinueWatchingCard() {
  return (
    <View style={styles.card}>
      {/* Thumbnail area */}
      <View style={styles.thumb} />

      {/* Info + progress bar */}
      <View style={styles.info}>
        {/* Skeleton title line */}
        <View style={[styles.skeletonLine, { width: '60%', marginBottom: RS.spacing.xs }]} />
        {/* Skeleton meta line */}
        <View style={[styles.skeletonLine, { width: '35%', opacity: 0.5 }]} />

        {/* Progress bar — static 40% fill, no data source */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '40%' }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: RS.spacing.md,
    backgroundColor:  RS.colors.card,
    borderRadius:     RS.card.radius,
    overflow:         'hidden',
    flexDirection:    'row',
    height:           RS.card.cwHeight,
  },
  thumb: {
    width:           RS.card.cwThumbWidth,
    backgroundColor: RS.colors.elevated,
  },
  info: {
    flex:            1,
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   RS.spacing.sm,
    justifyContent:  'center',
  },
  skeletonLine: {
    height:          10,
    borderRadius:    4,
    backgroundColor: RS.colors.elevated,
  },
  progressTrack: {
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius:    2,
    marginTop:       RS.spacing.sm,
    overflow:        'hidden',
  },
  progressFill: {
    height:          3,
    backgroundColor: RS.colors.accent,
    borderRadius:    2,
  },
});
