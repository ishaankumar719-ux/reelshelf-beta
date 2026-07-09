import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
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

import { RatingModal } from '@/components/RatingModal';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface MediaPrimaryActionsProps {
  id:              string;
  title:           string;
  synopsis?:       string;
  inShelf:         boolean;
  watched:         boolean;
  rating:          number;
  review:          string;
  error?:          string | null;
  onToggleShelf:   () => void;
  onToggleWatched: () => void;
  onSaveRating:    (value: number) => void;
  onSaveReview:    (text: string) => void;
}

// Placeholder deep-link format for future universal-link work — this URL does
// not resolve to anything real yet, it only documents the intended shape.
function reelShelfShareUrl(id: string): string {
  return `https://reelshelf.app/media/${id}`;
}

// Discover Phase 3 established the pattern this reuses: glass-surface pill,
// `RS.button.primaryFill/primaryBorder/primaryText` for the "on" state
// (same tokens as Discover's FilterChips active chip) — no new visual system.
//
// Add to Shelf / Watched / Rate / Review now persist via AsyncStorage (see
// hooks/useMediaPersistence.ts) — device-local, not tied to any account.
export function MediaPrimaryActions({
  id,
  title,
  synopsis,
  inShelf,
  watched,
  rating,
  review,
  error,
  onToggleShelf,
  onToggleWatched,
  onSaveRating,
  onSaveReview,
}: MediaPrimaryActionsProps) {
  const { user } = useAuth();
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [reviewOpen, setReviewOpen]       = useState(false);
  const [draftReview, setDraftReview]     = useState(review);

  // Keep the draft in sync if the persisted review changes out from under us
  // (e.g. storage finishes loading after this component already mounted).
  useEffect(() => {
    setDraftReview(review);
  }, [review, id]);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  // Personal actions require a real account now that they're Supabase-backed
  // — logged-out taps route to Sign In rather than silently going nowhere.
  const requireAuth = (): boolean => {
    if (user) return true;
    haptic();
    router.push('/login');
    return false;
  };

  const toggleShelf = () => { if (!requireAuth()) return; haptic(); onToggleShelf(); };
  const toggleWatched = () => { if (!requireAuth()) return; haptic(); onToggleWatched(); };

  const openRateModal = () => { if (!requireAuth()) return; haptic(); setRateModalOpen(true); };
  const closeRateModal = () => setRateModalOpen(false);
  const handleSaveRating = (value: number) => {
    onSaveRating(value);
    setRateModalOpen(false);
  };

  const toggleReview = () => {
    if (!requireAuth()) return;
    haptic();
    setReviewOpen(v => !v);
  };

  const saveReview = () => {
    haptic();
    onSaveReview(draftReview);
    setReviewOpen(false);
  };

  const addToList = () => {
    haptic();
    // Lists tab is still a placeholder — nothing real to add to yet.
    console.log('[Movie Detail] Add to List pressed — no-op (Lists is a placeholder)');
  };

  const share = () => {
    haptic();
    const url = reelShelfShareUrl(id);
    Share.share({
      title,
      message: `${title}${synopsis ? `\n\n${synopsis}` : ''}\n\n${url}`,
      url, // iOS-only field; harmless no-op on Android
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
          icon={rating > 0 ? 'star' : 'star-border'}
          label={rating > 0 ? `Rated ${rating.toFixed(1)}` : 'Rate'}
          active={rating > 0}
          onPress={openRateModal}
        />
        <ActionPill
          icon="rate-review"
          label="Review"
          active={reviewOpen || review.length > 0}
          onPress={toggleReview}
        />
        <ActionPill icon="playlist-add" label="Add to List" onPress={addToList} />
        <ActionPill icon="ios-share" label="Share" onPress={share} />
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {reviewOpen && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Your thoughts</Text>
          <TextInput
            value={draftReview}
            onChangeText={setDraftReview}
            placeholder="Write a few words…"
            placeholderTextColor={RS.colors.textMuted}
            style={styles.reviewInput}
            multiline
          />
          <Pressable style={styles.saveReviewBtn} onPress={saveReview}>
            <Text style={styles.saveReviewLabel}>Save Review</Text>
          </Pressable>
        </View>
      )}

      <RatingModal
        visible={rateModalOpen}
        title={title}
        initialValue={rating}
        onCancel={closeRateModal}
        onSave={handleSaveRating}
      />
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
  errorText: {
    marginHorizontal: RS.spacing.md,
    fontSize:         RS.typography.caption + 1,
    color:            '#f87171',
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
  reviewInput: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textPrimary,
    minHeight:  60,
    textAlignVertical: 'top',
  },
  saveReviewBtn: {
    alignSelf:         'flex-start',
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: RS.button.paddingH,
    paddingVertical:   RS.spacing.xs + 2,
  },
  saveReviewLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
