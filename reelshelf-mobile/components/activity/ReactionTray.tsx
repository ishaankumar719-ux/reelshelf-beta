import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import {
  REVIEW_REACTION_TYPES,
  useReviewReactions,
  type ReviewReactionType,
} from '@/hooks/useReviewReactions';

const REACTIONS: { type: ReviewReactionType; emoji: string; label: string }[] = [
  { type: 'love',       emoji: '❤️', label: 'Love' },
  { type: 'fire',       emoji: '🔥', label: 'Fire' },
  { type: 'cinema',     emoji: '🎬', label: 'Cinema' },
  { type: 'funny',      emoji: '😂', label: 'Funny' },
  { type: 'mind_blown', emoji: '🤯', label: 'Mind blown' },
];

// Mobile port of the real website's components/ReactionTray/ReactionTray.tsx
// — same 5 reaction types, same "invisible at rest with nothing to show"
// behavior, same owner-can't-react gating. Nested as its own row inside
// ActivityCard's card View (not inside any outer Pressable that also has an
// onPress), so taps here never bubble into card navigation — matches this
// file's own established "no whole-row Pressable" convention.
export function ReactionTray({
  diaryEntryId,
  currentUserId,
  isOwn,
}: {
  diaryEntryId: string;
  currentUserId: string | null;
  isOwn: boolean;
}) {
  const canReact = currentUserId !== null && !isOwn;
  const { reactions, userReactions, toggleReaction } = useReviewReactions({
    diaryEntryId,
    currentUserId,
    isOwn,
  });

  const hasAnyReaction = REVIEW_REACTION_TYPES.some((t) => reactions[t] > 0 || userReactions.has(t));
  if (!canReact && !hasAnyReaction) return null;

  return (
    <View style={styles.row}>
      {REACTIONS.map(({ type, emoji, label }) => {
        const count = reactions[type];
        const active = userReactions.has(type);
        if (!canReact && count === 0) return null;
        return (
          <Pressable
            key={type}
            onPress={() => void toggleReaction(type)}
            disabled={!canReact}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${label}${count > 0 ? ` · ${count}` : ''}`}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {count > 0 ? <Text style={[styles.count, active && styles.countActive]}>{count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginTop:     8,
  },
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               4,
    minWidth:          38,
    minHeight:         38,
    borderRadius:      19,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: 10,
  },
  btnActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
  },
  // Fixed glyph box, not just fontSize — different emoji have different
  // natural advance widths in the system color-emoji font (🤯 renders wider
  // than the other four at the same fontSize), which was pushing that one
  // bubble past the 32px minWidth floor while the rest sat exactly on it.
  // Constraining the glyph itself, rather than the button, keeps all 5
  // bubbles at an identical resting width (16 padding + 16 glyph = 32,
  // exactly matching btn's minWidth) regardless of which emoji it is.
  emoji: {
    fontSize:  16,
    width:     18,
    textAlign: 'center',
  },
  count: {
    fontSize:          RS.typography.micro,
    color:             RS.colors.textMuted,
    fontVariant:       ['tabular-nums'],
  },
  countActive: {
    color: RS.colors.textSecondary,
  },
});
