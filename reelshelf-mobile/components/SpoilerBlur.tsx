import { useState } from 'react';
import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface SpoilerBlurProps {
  children: React.ReactNode;
  /** contains_spoilers from the diary_entries row. */
  active:   boolean;
}

// Wraps review text wherever it's displayed (Diary, Movie/TV/Book Detail,
// any feed-like surface) — when `active`, blurs the content behind a
// warning label until tapped. Children stay mounted (opacity 0, not
// unmounted) so the wrapped content's height is preserved and nothing jumps
// on reveal.
export function SpoilerBlur({ children, active }: SpoilerBlurProps) {
  const [revealed, setRevealed] = useState(false);

  if (!active || revealed) {
    return <>{children}</>;
  }

  const reveal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRevealed(true);
  };

  return (
    <View>
      <View style={styles.hidden} pointerEvents="none">{children}</View>
      <Pressable style={styles.overlay} onPress={reveal}>
        <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
        <View style={styles.warnRow}>
          <MaterialIcons name="visibility-off" size={14} color={RS.colors.textPrimary} />
          <Text style={styles.warnText}>Contains spoilers — tap to reveal</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:   8,
    overflow:       'hidden',
    alignItems:     'center',
    justifyContent: 'center',
  },
  warnRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  warnText: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
});
