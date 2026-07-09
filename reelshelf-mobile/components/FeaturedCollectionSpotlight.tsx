import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Fonts, RS } from '@/constants/theme';
import { collections, COLLECTION_OF_THE_WEEK_ID } from '@/data/seedHomeContent';

const ARTWORK_H = 220;

const collection = collections.find(c => c.id === COLLECTION_OF_THE_WEEK_ID)!;
const artworkItem = collection?.items[0];

export function FeaturedCollectionSpotlight() {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!collection) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>FEATURED</Text>

      {/* Outer: scale animation + shadow — no overflow:hidden so iOS shadow renders */}
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 300, mass: 0.7 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.7 });
        }}
        onPress={() => router.push(`/collection/${collection.id}`)}
      >
        <Animated.View style={[styles.outer, scaleStyle]}>
          {/* Inner: overflow:hidden clips artwork + gradient to card shape */}
          <View style={styles.inner}>

            {/* Artwork panel */}
            <View style={styles.artwork}>
              {artworkItem?.posterUrl ? (
                <Image
                  source={{ uri: artworkItem.posterUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
              ) : null}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)', 'rgba(0,0,0,0.96)']}
                start={{ x: 0, y: 0.28 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </View>

            {/* Text area */}
            <View style={styles.textArea}>
              <Text style={styles.title} numberOfLines={2}>{collection.title}</Text>
              {collection.description ? (
                <Text style={styles.description} numberOfLines={2}>{collection.description}</Text>
              ) : null}
              <Text style={styles.cta}>Explore →</Text>
            </View>

          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.widest,
  },
  outer: {
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  inner: {
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
  },
  artwork: {
    height:          ARTWORK_H,
    backgroundColor: '#0b0b14',
  },
  textArea: {
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    gap:               RS.spacing.xs,
  },
  title: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    22,
  },
  description: {
    fontSize:   RS.typography.caption + 1,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 18,
  },
  cta: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
    marginTop:     2,
  },
});
