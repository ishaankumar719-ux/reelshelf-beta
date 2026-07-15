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
import { useDailyPick } from '@/hooks/useDailyPick';
import { SkeletonBlock } from '@/components/Skeleton';

const SCREEN_W  = Dimensions.get('window').width;
const ARTWORK_W = SCREEN_W - 2 * RS.spacing.md;
const ARTWORK_H = RS.card.featuredArtHeight;

const MEDIA_BADGE_LABEL: Record<'film' | 'tv' | 'book', string> = {
  film: 'Film', tv: 'TV Series', book: 'Book',
};

// Real, personalized Daily Pick — backed by the SAME useDailyPick hook (and
// therefore the same daily_picks row) the Daily Reel tab uses, so the two
// surfaces can never disagree on today's item (WEBSITE_DAILY_REEL_AUDIT.md
// §0/§5). The website's own DailyPickCard renders nothing at all when
// logged out or once genuinely errored with no cache — matched here, rather
// than inventing a Home-specific fallback state.
export function DailyReel() {
  const { status, pick, isLoggedIn } = useDailyPick();

  const cardScale = useSharedValue<number>(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  if (!isLoggedIn) return null;
  if (status === 'loading' && !pick) {
    return (
      <View style={styles.container}>
        <SkeletonBlock width={ARTWORK_W} height={ARTWORK_H} radius={RS.card.radius} />
      </View>
    );
  }
  if (!pick) return null;

  const badge = MEDIA_BADGE_LABEL[pick.mediaType];

  const navigateToPick = () => {
    router.push(
      `/media/${pick.mediaId}?title=${encodeURIComponent(pick.title)}&posterUrl=${encodeURIComponent(pick.posterUrl ?? '')}&mediaType=${pick.mediaType}`,
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>✨ YOUR DAILY PICK</Text>

      {/* ── Artwork card — outer holds shadow + depress animation ──────────── */}
      <Animated.View
        style={[styles.artworkOuter, { width: ARTWORK_W, height: ARTWORK_H }, cardAnimStyle]}
      >
        <Pressable
          style={styles.artworkInner}
          onPressIn={() => {
            cardScale.value = withSpring(Motion.lift.depressScale, { damping: 18, stiffness: 260, mass: 0.8 });
          }}
          onPressOut={() => {
            cardScale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 });
          }}
          onPress={navigateToPick}
        >
          {pick.posterUrl ? (
            <Image
              source={{ uri: pick.posterUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.artworkFallback]} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.94)']}
            start={{ x: 0, y: 0.30 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge}</Text>
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={2}>{pick.title}</Text>
            {pick.year ? <Text style={styles.year}>{pick.year}</Text> : null}
          </View>
        </Pressable>
      </Animated.View>

      {/* ── Editorial description ─────────────────────────────────────────── */}
      {pick.overview ? <Text style={styles.description} numberOfLines={3}>{pick.overview}</Text> : null}

      {/* ── "Why this pick?" — real, personalized-or-fallback reason ──────── */}
      {pick.reasons.length > 0 && (
        <Text style={styles.reason}>{pick.reasons[0]}</Text>
      )}

      {/* ── THE one filled button on the Home screen ─────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.btnPick, pressed && styles.btnPickPressed]}
        onPress={navigateToPick}
        android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      >
        <Text style={styles.btnPickLabel}>View Today&apos;s Pick</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.widest,
  },
  artworkOuter: {
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
    alignSelf:     'flex-start',
  },
  artworkInner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,
  },
  artworkFallback: {
    backgroundColor: RS.colors.elevated,
  },
  badge: {
    position:          'absolute',
    top:               RS.spacing.sm,
    left:              RS.spacing.sm,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 7,
    paddingVertical:   2,
    backgroundColor:   'rgba(255,255,255,0.15)',
  },
  badgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.6,
    color:         '#fff',
    textTransform: 'uppercase',
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
  year: {
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
  reason: {
    fontSize:   RS.typography.caption,
    fontWeight: '500',
    fontStyle:  'italic',
    color:      RS.colors.textMuted,
    lineHeight: 18,
  },
  btnPick: {
    backgroundColor:   RS.button.filledBg,
    borderRadius:      RS.button.radius,
    paddingVertical:   RS.button.paddingV,
    paddingHorizontal: RS.button.paddingH,
    alignSelf:         'flex-start',
  },
  btnPickPressed: {
    backgroundColor: '#179866',
    transform: [{ scale: 0.97 }],
  },
  btnPickLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
