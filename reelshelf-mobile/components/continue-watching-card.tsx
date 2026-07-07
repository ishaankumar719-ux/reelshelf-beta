import { BlurView } from 'expo-blur';
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
  // DimensionValue in RN 0.81.5 requires `${number}%` literal, not plain string
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <View style={styles.card}>
      {/* Thumbnail — left side, no blur */}
      <View style={styles.thumbWrap}>
        {posterUrl ? (
          <>
            <Image
              source={{ uri: posterUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <View style={styles.playOverlay}>
              <MaterialIcons name="play-circle-outline" size={30} color="rgba(255,255,255,0.85)" />
            </View>
          </>
        ) : (
          <View style={styles.thumbFallback}>
            <MaterialIcons name="play-circle-outline" size={30} color="rgba(255,255,255,0.45)" />
          </View>
        )}
      </View>

      {/* Info panel — glass surface (right side) */}
      <View style={styles.infoWrap}>
        {/* BlurView glass background for the info panel */}
        <BlurView
          tint="dark"
          intensity={RS.blur.cardInfo}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.info}>
          {title ? (
            <>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
              ) : null}
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

          {/* Resume action — text-only, elegant/understated */}
          {title && (
            <Pressable
              style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumePressed]}
              onPress={() => console.log('[Phase 5] Resume pressed — no-op')}
            >
              <Text style={styles.resumeLabel}>Resume →</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal:  RS.spacing.md,
    borderRadius:      RS.card.radius,
    overflow:          'hidden',
    flexDirection:     'row',
    minHeight:         RS.card.cwHeight + 8,
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
    // Subtle elevation shadow
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.35,
    shadowRadius:      10,
    elevation:         8,
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
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  // Info panel uses BlurView for glass surface
  infoWrap: {
    flex:     1,
    overflow: 'hidden',
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
    fontSize:      RS.typography.caption,
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
  skeletonLine: {
    height:          10,
    borderRadius:    4,
    backgroundColor: RS.colors.elevated,
  },
  progressTrack: {
    height:          2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius:    1,
    overflow:        'hidden',
  },
  progressFill: {
    height:          2,
    backgroundColor: RS.colors.accent,
    borderRadius:    1,
  },
  // Resume: text-only action, accent-colored — no filled box
  resumeBtn: {
    alignSelf:  'flex-start',
    paddingTop: 2,
  },
  resumeLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
  },
  resumePressed: {
    opacity: 0.7,
  },
});
