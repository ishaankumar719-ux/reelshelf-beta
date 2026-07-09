import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { RS, Fonts } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { SectionHeader } from '@/components/section-header';
import { bookOfTheWeek } from '@/data/seedHomeContent';

function navigateToBookOfTheWeek() {
  router.push(
    `/media/${bookOfTheWeek.id}?title=${encodeURIComponent(bookOfTheWeek.title)}&posterUrl=${encodeURIComponent(bookOfTheWeek.posterUrl ?? '')}&mediaType=${bookOfTheWeek.mediaType}`
  );
}

const COVER_W = Dimensions.get('window').width - 2 * RS.spacing.md;
const COVER_H = 240;

export function BookOfTheWeek() {
  const cardScale = useSharedValue<number>(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <View style={styles.section}>
      {/* Sprint 4: updated subtitle copy */}
      <SectionHeader
        title="Book of the Week"
        subtitle="Our favourite read right now."
        titleSerif
      />

      <View style={styles.inner}>
        {/* ── Book cover card — outer holds shadow + depress animation ────── */}
        <Animated.View
          style={[styles.coverOuter, { width: COVER_W, height: COVER_H }, cardAnimStyle]}
        >
          <Pressable
            style={styles.coverInner}
            onPressIn={() => {
              cardScale.value = withSpring(Motion.lift.depressScale, { damping: 18, stiffness: 260, mass: 0.8 });
            }}
            onPressOut={() => {
              cardScale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 });
            }}
            onPress={navigateToBookOfTheWeek}
          >
            {bookOfTheWeek.posterUrl ? (
              <Image
                source={{ uri: bookOfTheWeek.posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <LinearGradient
                colors={['#1a1a2a', '#0c0c14']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.94)']}
              start={{ x: 0, y: 0.30 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.badge, { backgroundColor: RS.badge.book.bg }]}>
              <Text style={[styles.badgeLabel, { color: RS.badge.book.text }]}>
                {RS.badge.book.label}
              </Text>
            </View>

            <View style={styles.titleArea}>
              <Text style={styles.title} numberOfLines={3}>{bookOfTheWeek.title}</Text>
              <Text style={styles.author}>{bookOfTheWeek.author}</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── Editorial description ────────────────────────────────────────── */}
        <Text style={styles.description}>{bookOfTheWeek.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: RS.spacing.xs,
  },
  inner: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  coverOuter: {
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
    alignSelf:     'flex-start',
  },
  coverInner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,
  },
  badge: {
    position:          'absolute',
    top:               RS.spacing.sm,
    left:              RS.spacing.sm,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.6,
  },
  titleArea: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    gap:               4,
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    26,
  },
  author: {
    fontSize:      RS.typography.caption,
    fontWeight:    '500',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
  description: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
});
