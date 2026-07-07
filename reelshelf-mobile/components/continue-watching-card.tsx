import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { Motion } from '@/constants/motion';

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
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`;

  const cardScale = useSharedValue<number>(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        cardScale.value = withSpring(Motion.lift.depressScale, { damping: 18, stiffness: 260, mass: 0.8 });
      }}
      onPressOut={() => {
        cardScale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 });
      }}
      onPress={() => console.log('[Sprint 4] Continue watching — no-op')}
    >
      <Animated.View style={[styles.card, cardAnimStyle]}>
        {/* Thumbnail — larger artwork area */}
        <View style={styles.thumbWrap}>
          {posterUrl ? (
            <>
              <Image
                source={{ uri: posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <View style={styles.playOverlay}>
                <MaterialIcons name="play-circle-outline" size={34} color="rgba(255,255,255,0.90)" />
              </View>
            </>
          ) : (
            <View style={styles.thumbFallback}>
              <MaterialIcons name="play-circle-outline" size={34} color="rgba(255,255,255,0.45)" />
            </View>
          )}
        </View>

        {/* Info panel — glass surface */}
        <View style={styles.infoWrap}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />

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

            {/* Progress bar with accent glow */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressPct }]} />
            </View>

            {title && (
              <Pressable
                style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumePressed]}
                onPress={() => console.log('[Sprint 4] Resume pressed — no-op')}
              >
                <Text style={styles.resumeLabel}>Resume →</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: RS.spacing.md,
    borderRadius:     18,    // Sprint 4: increased from RS.card.radius (14) for softer feel
    overflow:         'hidden',
    flexDirection:    'row',
    minHeight:        148,   // Sprint 4: enlarged from 104 for larger artwork presence
    borderWidth:      0.5,
    borderColor:      RS.glass.border,
    // Float shadow
    shadowColor:      RS.shadow.color,
    shadowOffset:     { width: 0, height: RS.shadow.offsetY },
    shadowOpacity:    RS.shadow.opacity,
    shadowRadius:     RS.shadow.radius,
    elevation:        RS.shadow.android,
  },
  thumbWrap: {
    width:    RS.card.cwThumbWidth,   // Sprint 4: 160px (was 128)
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
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  infoWrap: {
    flex:     1,
    overflow: 'hidden',
  },
  info: {
    flex:              1,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm + 2,
    justifyContent:    'center',
    gap:               RS.spacing.xs,
  },
  title: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
    lineHeight: 20,
  },
  subtitle: {
    fontSize:      RS.typography.caption,
    fontWeight:    '400',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
  skeletonLine: {
    height:          10,
    borderRadius:    4,
    backgroundColor: RS.colors.elevated,
  },
  // Sprint 4: progress bar with glow. No overflow:hidden — lets fill shadow bleed as glow.
  progressTrack: {
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius:    2,
  },
  progressFill: {
    height:          3,
    backgroundColor: RS.colors.accent,
    borderRadius:    2,
    // Glow: accent-colored shadow diffuses outward — visible because track has no overflow:hidden
    shadowColor:     RS.colors.accent,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.90,
    shadowRadius:    5,
    elevation:       2,
  },
  resumeBtn: {
    alignSelf:  'flex-start',
    paddingTop: 2,
  },
  resumeLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.accent,    // action — interactive affordance
    letterSpacing: RS.letterSpacing.wide,
  },
  resumePressed: {
    opacity: 0.7,
  },
});
