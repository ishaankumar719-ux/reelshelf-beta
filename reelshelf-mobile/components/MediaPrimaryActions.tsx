import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RS } from '@/constants/theme';

interface MediaPrimaryActionsProps {
  title: string;
  synopsis?: string;
}

// Discover Phase 3 established the pattern this reuses: glass-surface pill,
// `RS.button.primaryFill/primaryBorder/primaryText` for the "on" state
// (same tokens as Discover's FilterChips active chip) — no new visual system.
//
// Every toggle here is LOCAL, EPHEMERAL React state — nothing is written to
// Supabase, nothing persists across an app reload. No real user accounts
// exist yet, so this is honest interactive polish, not a real feature.
export function MediaPrimaryActions({ title, synopsis }: MediaPrimaryActionsProps) {
  const [inShelf, setInShelf]   = useState(false);
  const [watched, setWatched]   = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating]     = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const toggleShelf = () => { haptic(); setInShelf(v => !v); };
  const toggleWatched = () => { haptic(); setWatched(v => !v); };

  const toggleRate = () => {
    haptic();
    setReviewOpen(false);
    setRateOpen(v => !v);
  };

  const toggleReview = () => {
    haptic();
    setRateOpen(false);
    setReviewOpen(v => !v);
  };

  const addToList = () => {
    haptic();
    // Lists tab is still a placeholder — nothing real to add to yet.
    console.log('[Movie Detail] Add to List pressed — no-op (Lists is a placeholder)');
  };

  const share = () => {
    haptic();
    Share.share({
      title,
      message: synopsis ? `${title}\n\n${synopsis}` : title,
    }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <ActionPill
          icon={inShelf ? 'bookmark' : 'bookmark-border'}
          label={inShelf ? 'In Your Shelf' : 'Add to Shelf'}
          active={inShelf}
          onPress={toggleShelf}
        />
        <ActionPill
          icon={watched ? 'check-circle' : 'check-circle-outline'}
          label="Watched"
          active={watched}
          onPress={toggleWatched}
        />
        <ActionPill
          icon={rateOpen ? 'star' : 'star-border'}
          label="Rate"
          active={rateOpen || rating > 0}
          onPress={toggleRate}
        />
        <ActionPill
          icon="rate-review"
          label="Review"
          active={reviewOpen}
          onPress={toggleReview}
        />
        <ActionPill icon="playlist-add" label="Add to List" onPress={addToList} />
        <ActionPill icon="ios-share" label="Share" onPress={share} />
      </ScrollView>

      {rateOpen && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Your rating (not saved)</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable
                key={n}
                onPress={() => {
                  haptic();
                  setRating(n);
                }}
                hitSlop={6}
              >
                <MaterialIcons
                  name={n <= rating ? 'star' : 'star-border'}
                  size={28}
                  color={n <= rating ? RS.colors.accent : RS.colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {reviewOpen && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Your thoughts (not saved)</Text>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Write a few words…"
            placeholderTextColor={RS.colors.textMuted}
            style={styles.reviewInput}
            multiline
          />
        </View>
      )}
    </View>
  );
}

interface ActionPillProps {
  icon:     React.ComponentProps<typeof MaterialIcons>['name'];
  label:    string;
  active?:  boolean;
  onPress:  () => void;
}

function ActionPill({ icon, label, active, onPress }: ActionPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
    >
      {!active && (
        <BlurView tint="dark" intensity={RS.blur.cardLight} style={[StyleSheet.absoluteFill, styles.pillBlur]} />
      )}
      <MaterialIcons
        name={icon}
        size={16}
        color={active ? RS.button.primaryText : RS.colors.textSecondary}
      />
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.sm,
  },
  row: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.xs + 2,
    flexDirection:     'row',
    alignItems:        'center',
  },
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
    paddingHorizontal: 14,
    paddingVertical:   9,
    backgroundColor:   RS.colors.elevated,
    overflow:          'hidden',
  },
  pillBlur: {
    borderRadius: RS.button.radius,
  },
  pillActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
  },
  pillLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  pillLabelActive: {
    color: RS.button.primaryText,
  },
  panel: {
    marginHorizontal: RS.spacing.md,
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    padding:           RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  panelLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '600',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  starsRow: {
    flexDirection: 'row',
    gap:           10,
  },
  reviewInput: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textPrimary,
    minHeight:  60,
    textAlignVertical: 'top',
  },
});
