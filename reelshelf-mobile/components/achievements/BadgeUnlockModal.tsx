// Deliberate mobile-only enhancement — see BadgeCelebrationContext.tsx's
// header comment and WEBSITE_ACHIEVEMENTS_AUDIT.md §5. The real website has
// no modal/animation/share for badge unlocks anywhere; this is genuinely new
// mobile scope, built to this project's established calm/non-bouncy motion
// language (Motion.spring tokens, Reduce-Motion-aware) rather than a loud
// confetti-style celebration.
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { RARITY_XP, type BadgeRarity, type EarnedBadge } from '@/lib/supabase/badges';

const RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const RARITY_COLOR: Record<string, string> = {
  common:    'rgba(148,163,184,0.9)',
  rare:      'rgba(96,165,250,0.95)',
  epic:      'rgba(167,139,250,0.95)',
  legendary: 'rgba(251,191,36,0.95)',
};

interface BadgeUnlockModalProps {
  badge:      EarnedBadge;
  onDismiss:  () => void;
}

export function BadgeUnlockModal({ badge, onDismiss }: BadgeUnlockModalProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.92);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduceMotion) return;
    const config = { duration: Motion.duration.medium, easing: Easing.out(Easing.ease) };
    opacity.value = withTiming(1, config);
    scale.value = withTiming(1, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const rarity = (badge.rarity ?? 'common') as BadgeRarity;
  const rarityColor = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
  const xp = RARITY_XP[rarity] ?? RARITY_XP.common;

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Share.share({
      title: badge.name,
      message: `I just earned the "${badge.name}" badge on ReelShelf! ${badge.icon ?? '🏅'}`,
    }).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={style}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />

            <Text style={styles.eyebrow}>Badge Unlocked</Text>

            <View style={[styles.iconWrap, { borderColor: rarityColor }]}>
              <Text style={styles.icon}>{badge.icon ?? '🏅'}</Text>
            </View>

            <Text style={styles.name}>{badge.name}</Text>
            {badge.description ? <Text style={styles.description}>{badge.description}</Text> : null}

            <View style={styles.metaRow}>
              <View style={[styles.rarityPill, { borderColor: rarityColor }]}>
                <Text style={[styles.rarityLabel, { color: rarityColor }]}>{RARITY_LABEL[rarity] ?? rarity}</Text>
              </View>
              <Text style={styles.xpLabel}>+{xp} XP</Text>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.shareLabel}>Share</Text>
              </Pressable>
              <Pressable style={styles.dismissBtn} onPress={onDismiss}>
                <Text style={styles.dismissLabel}>Nice!</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         RS.spacing.lg,
  },
  panel: {
    width:             '100%',
    maxWidth:          340,
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
    overflow:          'hidden',
    paddingHorizontal: RS.spacing.lg,
    paddingVertical:   RS.spacing.lg,
    alignItems:        'center',
    gap:               RS.spacing.sm,
    backgroundColor:   RS.colors.card,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  iconWrap: {
    width:            72,
    height:           72,
    borderRadius:     36,
    borderWidth:      1.5,
    alignItems:       'center',
    justifyContent:   'center',
    backgroundColor:  RS.colors.elevated,
    marginTop:        RS.spacing.xs,
  },
  icon: {
    fontSize: 34,
  },
  name: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    letterSpacing: RS.letterSpacing.tight,
  },
  description: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    textAlign:  'center',
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.sm,
    marginTop:     RS.spacing.xs,
  },
  rarityPill: {
    borderRadius:      RS.badge.pillRadius,
    borderWidth:       1,
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   3,
  },
  rarityLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  xpLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
    marginTop:     RS.spacing.md,
    width:         '100%',
  },
  shareBtn: {
    flex:              1,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.button.secondaryBorder,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  shareLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.button.secondaryText,
  },
  dismissBtn: {
    flex:              1,
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  dismissLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.button.filledText,
  },
});
