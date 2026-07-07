import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { RS, Fonts } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import type { SeedCollectionItem } from '@/data/seedHomeContent';

// ── Card geometry (module-level — screen width doesn't change at runtime) ─────
const SCREEN_W = Dimensions.get('window').width;

// Card is 82% of viewport — next card peeks in ~18% minus spacing
export const COLLECTION_CARD_W = Math.floor(SCREEN_W * 0.82);
const CARD_H    = Math.floor(COLLECTION_CARD_W * 0.75);  // 4:3 matches web reference

// Fan poster dimensions — each poster is 44% of card width (web: 44%), 2:3 ratio
const POSTER_W = Math.floor(COLLECTION_CARD_W * 0.44);
const POSTER_H = Math.floor(POSTER_W * 1.5);

// Center position of each poster within the card
const POSTER_LEFT = Math.floor((COLLECTION_CARD_W - POSTER_W) / 2);
const POSTER_TOP  = Math.floor((CARD_H - POSTER_H) / 2);

// Fan layout values scaled from web reference (web card = min(210px, 56vw))
const SCALE = COLLECTION_CARD_W / 210;
const FAN_ROTATIONS: [number, number, number, number] = [-9, -3, 3,  9 ];
const FAN_X:         [number, number, number, number] = [
  Math.round(-26 * SCALE),
  Math.round( -9 * SCALE),
  Math.round(  9 * SCALE),
  Math.round( 26 * SCALE),
];
const FAN_Y: [number, number, number, number] = [
  Math.round(4 * SCALE),
  0,
  0,
  Math.round(4 * SCALE),
];
const FAN_Z: [number, number, number, number] = [1, 2, 3, 2];

// ── Component ─────────────────────────────────────────────────────────────────

export function CollectionCard({ item }: { item: SeedCollectionItem }) {
  const cardScale = useSharedValue<number>(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const posters = item.posterUrls.slice(0, 4);

  return (
    <Pressable
      onPressIn={() => {
        cardScale.value = withSpring(Motion.lift.depressScale, { damping: 18, stiffness: 260, mass: 0.8 });
      }}
      onPressOut={() => {
        cardScale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.8 });
      }}
      onPress={() => console.log(`[Collections] ${item.title} pressed — no-op`)}
    >
      {/* Outer: float shadow + scale — no overflow so shadow renders on iOS */}
      <Animated.View style={[styles.outer, animStyle]}>
        {/* Inner: overflow:hidden clips fan posters + gradient to rounded rect */}
        <View style={styles.inner}>

          {/* ── Fan poster collage ────────────────────────────────────── */}
          <View style={StyleSheet.absoluteFill}>
            {posters.map((url, i) => (
              <View
                key={i}
                style={[
                  styles.fanPoster,
                  {
                    zIndex:    FAN_Z[i],
                    transform: [
                      { rotate:     `${FAN_ROTATIONS[i]}deg` },
                      { translateX: FAN_X[i] },
                      { translateY: FAN_Y[i] },
                    ],
                  },
                ]}
              >
                {url ? (
                  <Image
                    source={{ uri: url }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.posterFallback} />
                )}
              </View>
            ))}
            {posters.length === 0 && (
              <View style={[styles.fanPoster, styles.posterFallback, { zIndex: 1 }]} />
            )}
          </View>

          {/* ── Gradient overlay — scrim behind the text ─────────────── */}
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.90)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* ── Text area at bottom ───────────────────────────────────── */}
          <View style={styles.textArea}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={styles.count}>
              {item.storyCount} {item.storyCount === 1 ? 'story' : 'stories'}
            </Text>
          </View>

        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width:         COLLECTION_CARD_W,
    height:        CARD_H,
    borderRadius:  RS.card.radius,
    // Float shadow (Sprint 4 token)
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  inner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    // Matches web: disc-coll-fan background
    backgroundColor: '#0b0b14',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
  },
  fanPoster: {
    position:      'absolute',
    left:           POSTER_LEFT,
    top:            POSTER_TOP,
    width:          POSTER_W,
    height:         POSTER_H,
    borderRadius:   7,
    overflow:       'hidden',
    borderWidth:    0.5,
    borderColor:    'rgba(255,255,255,0.1)',
    // Individual poster shadow (matches web: 0 4px 14px rgba(0,0,0,0.55))
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius:  7,
    elevation:     4,
  },
  posterFallback: {
    flex:            1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  textArea: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md - 2,
    paddingTop:        RS.spacing.sm,
    gap:               3,
  },
  title: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    lineHeight:    22,
    letterSpacing: RS.letterSpacing.tight,
  },
  description: {
    fontSize:   RS.typography.caption,
    fontWeight: '400',
    color:      'rgba(255,255,255,0.32)',
    lineHeight: 15,
  },
  count: {
    fontSize:      9,
    fontWeight:    '600',
    color:         'rgba(255,255,255,0.42)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
