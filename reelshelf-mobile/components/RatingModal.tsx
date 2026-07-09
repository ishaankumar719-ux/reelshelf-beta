import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { RatingSlider } from '@/components/RatingSlider';
import { RS } from '@/constants/theme';

interface RatingModalProps {
  visible:      boolean;
  title:        string;
  initialValue: number;
  onCancel:     () => void;
  onSave:       (value: number) => void;
}

// Quick Rate modal — centered modal (unchanged presentation from the prior
// version), rebuilt to use the shared RatingSlider (0-10, 0.1 increments)
// instead of the old 5-star input. This is the SAME component instance
// UniversalReviewComposer uses for its own rating section — not a second,
// similar-but-separate implementation.
export function RatingModal({ visible, title, initialValue, onCancel, onSave }: RatingModalProps) {
  const [draft, setDraft] = useState<number | null>(initialValue > 0 ? initialValue : null);

  useEffect(() => {
    if (visible) setDraft(initialValue > 0 ? initialValue : null);
  }, [visible, initialValue]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSave(draft ?? 0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>YOUR RATING</Text>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>

          <View style={styles.sliderWrap}>
            <RatingSlider value={draft} onChange={setDraft} />
          </View>

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
    gap:               RS.spacing.md,
    backgroundColor:   RS.colors.card,
  },
  eyebrow: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.widest,
    textAlign:     'center',
  },
  title: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    letterSpacing: RS.letterSpacing.tight,
  },
  sliderWrap: {
    paddingVertical: RS.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
    marginTop:     RS.spacing.xs,
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
