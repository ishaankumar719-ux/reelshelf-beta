import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

const CARD_TINTS = [
  '#0f1628', '#1a0f28', '#0f1f18', '#281a0f',
  '#1f0f1a', '#0f1f28', '#1a1008', '#1a0808',
] as const;

function tintFromSeed(seed: number) {
  return CARD_TINTS[seed % CARD_TINTS.length];
}

interface ContinueWatchingCardProps {
  title?:     string;
  subtitle?:  string;
  /** viewing progress, 0–1 */
  progress?:  number;
  colorSeed?: number;
}

// static placeholder layout — no data source yet
export function ContinueWatchingCard({
  title,
  subtitle,
  progress = 0.4,
  colorSeed = 1,
}: ContinueWatchingCardProps = {}) {
  const bg          = tintFromSeed(colorSeed);
  // Cast required: DimensionValue accepts `${number}%` but not plain string
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <View style={[styles.thumb, { backgroundColor: bg }]}>
        <MaterialIcons name="play-circle-outline" size={32} color="rgba(255,255,255,0.55)" />
      </View>

      {/* Info + controls */}
      <View style={styles.info}>
        {title ? (
          <>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </>
        ) : (
          <>
            <View style={[styles.skeletonLine, { width: '60%', marginBottom: RS.spacing.xs }]} />
            <View style={[styles.skeletonLine, { width: '35%', opacity: 0.5 }]} />
          </>
        )}

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPct }]} />
        </View>

        {/* Resume button — no-op in Phase 2 */}
        {title && (
          <Pressable
            style={styles.resumeBtn}
            onPress={() => console.log('[Phase 2] Resume pressed — no-op')}
          >
            <Text style={styles.resumeLabel}>Resume</Text>
          </Pressable>
        )}
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
    minHeight:        RS.card.cwHeight,
    borderWidth:      0.5,
    borderColor:      RS.colors.border,
  },
  thumb: {
    width:           RS.card.cwThumbWidth,
    alignItems:      'center',
    justifyContent:  'center',
  },
  info: {
    flex:              1,
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   RS.spacing.sm,
    justifyContent:    'center',
    gap:               RS.spacing.xs,
  },
  title: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  subtitle: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textSecondary,
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
    overflow:        'hidden',
  },
  progressFill: {
    height:          3,
    backgroundColor: RS.colors.accent,
    borderRadius:    2,
  },
  resumeBtn: {
    alignSelf:         'flex-start',
    backgroundColor:   RS.colors.accent,
    borderRadius:      RS.card.radius,
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   3,
    marginTop:         2,
  },
  resumeLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      '#ffffff',
  },
});
