import { useEffect, useState } from 'react';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Fonts, RS } from '@/constants/theme';
import { usePressLift } from '@/hooks/usePressLift';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
import { SkeletonBlock } from '@/components/Skeleton';
import { fetchFeaturedCollection, type CollectionCardData } from '@/lib/supabase/collections';

const ARTWORK_H = 220;

// Real Supabase-backed — same single "featured collection" concept the old
// COLLECTION_OF_THE_WEEK_ID constant pointed at (the first currently-live
// collection by sort_order), and the same one CollectionsSection shows on
// Home, so both surfaces stay in sync automatically now instead of each
// reading its own copy of a hardcoded id.
export function FeaturedCollectionSpotlight() {
  const [collection, setCollection] = useState<CollectionCardData | null | undefined>(undefined);
  const { style: liftStyle, onPressIn, onPressOut } = usePressLift('depress');

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedCollection()
      .then((data) => { if (!cancelled) setCollection(data); })
      .catch(() => { if (!cancelled) setCollection(null); });
    return () => { cancelled = true; };
  }, []);

  const navigate = () => { if (collection) router.push(`/collection/${collection.id}?expand=1`); };
  const { style: expandStyle, trigger } = useExpandOnPress(navigate);

  if (collection === null) return null;

  if (collection === undefined) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.eyebrow}>FEATURED</Text>
        <SkeletonBlock width="100%" height={ARTWORK_H + 90} radius={RS.card.radius} />
      </View>
    );
  }

  const artworkItem = collection.items[0];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    trigger();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>FEATURED</Text>

      {/* Outer: scale animation + shadow — no overflow:hidden so iOS shadow renders */}
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={handlePress}
      >
        {/* Expand wrapper: opacity + scale on tap, ahead of navigation */}
        <Animated.View style={expandStyle}>
          {/* Lift wrapper: press-in/out depress + shadow (no overflow:hidden so iOS shadow renders) */}
          <Animated.View style={[styles.outer, liftStyle]}>
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
