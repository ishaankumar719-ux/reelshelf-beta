import { useEffect, useState } from 'react';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { randomDiscoveryPool, type SeedCardItem } from '@/data/seedHomeContent';

const PICKED_W = 120;
const PICKED_H = 178;

export function RandomDiscoveryCard() {
  const [picked, setPicked] = useState<SeedCardItem | null>(null);

  // Entrance animation shared values for the picked poster
  const pickedOpacity = useSharedValue(0);
  const pickedScale   = useSharedValue(0.88);

  const pickedStyle = useAnimatedStyle(() => ({
    opacity:   pickedOpacity.value,
    transform: [{ scale: pickedScale.value }],
  }));

  // Animate in whenever a new pick arrives
  useEffect(() => {
    if (!picked) return;
    pickedOpacity.value = withTiming(1, { duration: 300 });
    pickedScale.value   = withSpring(1, { damping: 14, stiffness: 180 });
  }, [picked?.id]);

  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const next = randomDiscoveryPool[Math.floor(Math.random() * randomDiscoveryPool.length)];

    if (picked) {
      // Fade out current pick → then set new one (useEffect handles fade-in)
      pickedOpacity.value = withTiming(0, { duration: 180 }, () => {
        pickedScale.value = 0.88;
        runOnJS(setPicked)(next);
      });
    } else {
      setPicked(next);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headline}>I can't decide.</Text>
          <Text style={styles.subtitle}>Let us pick for you.</Text>
        </View>

        {/* Shuffle button */}
        <Pressable
          style={({ pressed }) => [styles.shuffleBtn, pressed && styles.shuffleBtnPressed]}
          onPress={handleShuffle}
        >
          <MaterialIcons name="shuffle" size={18} color={RS.colors.accent} />
          <Text style={styles.shuffleLabel}>Shuffle</Text>
        </Pressable>
      </View>

      {/* Picked result */}
      {picked ? (
        <Animated.View style={[styles.pickedRow, pickedStyle]}>
          <PosterCard
            title={picked.title}
            year={picked.year}
            mediaType={picked.mediaType}
            posterUrl={picked.posterUrl}
            width={PICKED_W}
            height={PICKED_H}
            size="sm"
            onPress={() =>
              router.push(
                `/media/${picked.id}?title=${encodeURIComponent(picked.title)}&posterUrl=${encodeURIComponent(picked.posterUrl ?? '')}&mediaType=${picked.mediaType}`
              )
            }
          />
          <View style={styles.pickedMeta}>
            <Text style={styles.pickedLabel}>YOUR PICK</Text>
            <Text style={styles.pickedTitle} numberOfLines={3}>{picked.title}</Text>
            <Text style={styles.pickedYear}>{picked.year}</Text>
            <Text style={styles.pickedHint}>Tap the poster to open</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.lg,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: 3,
    flex: 1,
  },
  headline: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  subtitle: {
    fontSize:   RS.typography.subheading,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
  },
  shuffleBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               RS.spacing.xs,
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.button.primaryBorder,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.sm,
    backgroundColor:   RS.button.primaryFill,
  },
  shuffleBtnPressed: {
    backgroundColor: 'rgba(29,158,117,0.18)',
  },
  shuffleLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
  },
  pickedRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           RS.spacing.md,
  },
  pickedMeta: {
    flex: 1,
    gap:  RS.spacing.xs,
    paddingTop: RS.spacing.xs,
  },
  pickedLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.widest,
  },
  pickedTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    22,
  },
  pickedYear: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  pickedHint: {
    fontSize:   RS.typography.caption,
    color:      RS.colors.textMuted,
    marginTop:  RS.spacing.xs,
    fontStyle:  'italic',
  },
});
