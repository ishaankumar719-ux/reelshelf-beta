import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface RatingModalProps {
  visible:      boolean;
  title:        string;
  initialValue: number;
  onCancel:     () => void;
  onSave:       (value: number) => void;
}

const STAR_SIZE = 40;

function Star({ index, value, onChange }: { index: number; value: number; onChange: (v: number) => void }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const filled = value >= index + 1;
  const half   = !filled && value >= index + 0.5;
  const iconName = filled ? 'star' : half ? 'star-half-full' : 'star-outline';

  const bump = () => {
    if (reduceMotion) return;
    scale.value = withSpring(1.15, Motion.spring.liftIn, () => {
      scale.value = withSpring(1, Motion.spring.liftOut);
    });
  };

  const select = (v: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    bump();
    onChange(v);
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.starWrap}>
      <Animated.View style={animStyle}>
        <MaterialCommunityIcons name={iconName} size={STAR_SIZE} color={RS.colors.accent} />
      </Animated.View>
      {/* Invisible half-width tap zones — left half = X.5, right half = X.0 (next whole star) */}
      <Pressable style={styles.starHalfLeft} onPress={() => select(index + 0.5)} hitSlop={4} />
      <Pressable style={styles.starHalfRight} onPress={() => select(index + 1)} hitSlop={4} />
    </View>
  );
}

// Premium rating input — 0.5-increment stars via left/right tap zones per
// star. Centered modal (not a bottom sheet — no sheet library is installed
// and this keeps the interaction system unchanged, per CONSTRAINTS). Calm,
// near-zero-overshoot springs throughout (Motion.spring.lift*), consistent
// with "Motion should feel calm" / "Nothing should bounce aggressively" in
// PRODUCT_BIBLE.md.
export function RatingModal({ visible, title, initialValue, onCancel, onSave }: RatingModalProps) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    if (visible) setDraft(initialValue);
  }, [visible, initialValue]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSave(draft);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>YOUR RATING</Text>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>

          <View style={styles.starsRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <Star key={i} index={i} value={draft} onChange={setDraft} />
            ))}
          </View>

          <Text style={styles.valueLabel}>{draft > 0 ? draft.toFixed(1) : '—'} / 5</Text>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onCancel}>
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryLabel}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         RS.spacing.lg,
  },
  panel: {
    width:             '100%',
    maxWidth:          360,
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
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    letterSpacing: RS.letterSpacing.tight,
    marginBottom:  RS.spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap:           4,
  },
  starWrap: {
    width:          STAR_SIZE + 8,
    height:         STAR_SIZE + 8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  starHalfLeft: {
    position: 'absolute',
    left:     0,
    top:      0,
    bottom:   0,
    width:    '50%',
  },
  starHalfRight: {
    position: 'absolute',
    right:    0,
    top:      0,
    bottom:   0,
    width:    '50%',
  },
  valueLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '600',
    color:         RS.colors.textSecondary,
    marginTop:     2,
  },
  actions: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
    marginTop:     RS.spacing.md,
    width:         '100%',
  },
  secondaryBtn: {
    flex:              1,
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.button.secondaryBorder,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  secondaryLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.button.secondaryText,
  },
  primaryBtn: {
    flex:              1,
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  primaryLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
