import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { SeedCollectionItem } from '@/data/seedHomeContent';

const CARD_W = 160;
const CARD_H = 200;

export function CollectionCard({ item }: { item: SeedCollectionItem }) {
  return (
    <View style={styles.card}>
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
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.footer}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width:          CARD_W,
    height:         CARD_H,
    borderRadius:   RS.card.radius,
    overflow:       'hidden',
    borderWidth:    0.5,
    borderColor:    RS.colors.border,
    justifyContent: 'flex-end',
  },
  fallback: {
    backgroundColor: RS.colors.elevated,
  },
  footer: {
    padding: RS.spacing.sm,
    gap:     2,
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
