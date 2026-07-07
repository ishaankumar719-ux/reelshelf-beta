import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface ContinueWatchingCardProps {
  title?:     string;
  subtitle?:  string;
  /** 0–1 viewing/reading progress */
  progress?:  number;
  posterUrl?: string | null;
}

export function ContinueWatchingCard({
  title,
  subtitle,
  progress = 0.4,
  posterUrl,
}: ContinueWatchingCardProps = {}) {
  // DimensionValue in RN 0.81.5 requires `${number}%` template literal, not plain string
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {posterUrl ? (
          <>
            <Image
              source={{ uri: posterUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <View style={styles.playOverlay}>
              <MaterialIcons name="play-circle-outline" size={32} color="rgba(255,255,255,0.80)" />
            </View>
          </>
        ) : (
          <View style={styles.thumbFallback}>
            <MaterialIcons name="play-circle-outline" size={32} color="rgba(255,255,255,0.55)" />
          </View>
        )}
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
            <View style={[styles.skeletonLine, { width: '60%' as `${number}%`, marginBottom: RS.spacing.xs }]} />
            <View style={[styles.skeletonLine, { width: '35%' as `${number}%`, opacity: 0.5 }]} />
          </>
        )}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPct }]} />
        </View>

        {title && (
          <Pressable
            style={styles.resumeBtn}
            onPress={() => console.log('[Phase 3] Resume pressed — no-op')}
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
  thumbWrap: {
    width:    RS.card.cwThumbWidth,
    overflow: 'hidden',
  },
  thumbFallback: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: RS.colors.elevated,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
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
