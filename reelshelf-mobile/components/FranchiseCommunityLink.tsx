import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, RS } from '@/constants/theme';
import {
  getFranchiseCommunityForRouteId,
  hungerGamesCommunity,
  type FranchiseCommunity,
} from '@/data/franchiseCommunities';

const open = (community: FranchiseCommunity) => router.push(`/community/${community.slug}`);
// "The Hunger Games" → "Explore the Hunger Games community", not "the The …".
const exploreLabel = (name: string) => `Explore the ${name.replace(/^The /, '')} community`;

/** Pill on a book/film detail screen that leads back to its franchise hub.
 *  Renders nothing for titles outside a community — mirrors the website's
 *  FranchiseCommunityLink. */
export function FranchiseCommunityLink({ routeId }: { routeId: string }) {
  const community = getFranchiseCommunityForRouteId(routeId);
  if (!community) return null;

  return (
    <Pressable
      onPress={() => open(community)}
      accessibilityRole="link"
      accessibilityLabel={exploreLabel(community.name)}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.pillText}>{exploreLabel(community.name)}</Text>
      <MaterialIcons name="arrow-forward" size={16} color={RS.colors.textPrimary} />
    </Pressable>
  );
}

/** Discover-screen entry card for the featured franchise hub. */
export function FranchiseCommunityCard({ community = hungerGamesCommunity }: { community?: FranchiseCommunity }) {
  return (
    <Pressable
      onPress={() => open(community)}
      accessibilityRole="link"
      accessibilityLabel={`${community.name} community`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={['#2a1610', '#120c0d', '#09080a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(234,88,12,0)', 'rgba(234,88,12,0.35)']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.eyebrow}>FRANCHISE COMMUNITY</Text>
      <Text style={styles.title}>{community.name}</Text>
      <Text style={styles.body} numberOfLines={2}>
        {community.featured ? `Featuring ${community.featured.title}. ` : ''}
        {community.description}
      </Text>
      <View style={styles.cardCta}>
        <Text style={styles.cardCtaText}>Explore the hub</Text>
        <MaterialIcons name="arrow-forward" size={16} color={RS.colors.gold} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    marginHorizontal: RS.spacing.md,
    minHeight: 44,
    paddingHorizontal: RS.spacing.md,
    borderRadius: RS.button.radius,
    borderWidth: 1,
    borderColor: RS.colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: RS.spacing.sm,
  },
  pillText: {
    color: RS.colors.textPrimary,
    fontSize: RS.typography.body,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    marginHorizontal: RS.spacing.md,
    padding: RS.spacing.md,
    borderRadius: RS.card.radius,
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.15)',
    overflow: 'hidden',
  },
  eyebrow: {
    color: RS.colors.gold,
    fontSize: RS.typography.caption,
    fontWeight: '600',
    letterSpacing: RS.letterSpacing.widest,
  },
  title: {
    marginTop: RS.spacing.xs,
    color: RS.colors.textPrimary,
    fontFamily: Fonts?.serif,
    fontSize: 26,
  },
  body: {
    marginTop: RS.spacing.xs,
    color: 'rgba(255,255,255,0.75)',
    fontSize: RS.typography.body,
    lineHeight: 20,
  },
  cardCta: {
    marginTop: RS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: RS.spacing.xs,
    minHeight: 24,
  },
  cardCtaText: {
    color: RS.colors.gold,
    fontSize: RS.typography.body,
    fontWeight: '600',
  },
});
