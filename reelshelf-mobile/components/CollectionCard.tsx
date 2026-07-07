import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import type { SeedCollectionItem } from '@/data/seedHomeContent';

const CARD_W = 160;
const CARD_H = 200;

export function CollectionCard({ item }: { item: SeedCollectionItem }) {
  const scale = useSharedValue<number>(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(Motion.lift.scaleActive, {
          damping: 18, stiffness: 240, mass: 0.8,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 14, stiffness: 180, mass: 0.8,
        });
      }}
    >
      {/* Outer: shadow + scale transform — no overflow clip here */}
      <Animated.View style={[styles.outer, animStyle]}>
        {/* Inner: overflow hidden for image/blur clipping */}
        <View style={styles.inner}>
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.fallback]} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Glass footer */}
          <View style={styles.footer}>
            <BlurView
              tint="dark"
              intensity={RS.blur.cardLight}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.footerContent}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width:         CARD_W,
    height:        CARD_H,
    borderRadius:  RS.card.radius,
    // Shadow on the non-clipped outer view
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius:  10,
    elevation:     9,
  },
  inner: {
    flex:           1,
    borderRadius:   RS.card.radius,
    overflow:       'hidden',
    borderWidth:    0.5,
    borderColor:    RS.glass.border,
    justifyContent: 'flex-end',
    backgroundColor: RS.colors.elevated,
  },
  fallback: {
    backgroundColor: RS.colors.elevated,
  },
  footer: {
    overflow: 'hidden',
  },
  footerContent: {
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   RS.spacing.sm,
    gap:               2,
  },
  title: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textSecondary,
  },
});
