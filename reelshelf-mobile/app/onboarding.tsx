import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { GenreMultiSelect } from '@/components/profile/GenreMultiSelect';
import { MountRushmoreEditor } from '@/components/profile/MountRushmoreEditor';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/lib/supabase/onboarding';
import {
  fetchOwnProfile, followUser, unfollowUser, updateProfile,
  type ProfileData,
} from '@/lib/supabase/profile';
import { searchUsers, type UserSearchResult } from '@/lib/search';
import { getMediaKey } from '@/utils/listKeys';

const BIO_MAX = 240;
const MEDIA_TYPE_OPTIONS = ['Movies', 'TV', 'Books'] as const;

type StepKey = 'media-types' | 'genres' | 'profile' | 'rushmore' | 'follow';
const STEPS: StepKey[] = ['media-types', 'genres', 'profile', 'rushmore', 'follow'];

// Brief multi-step welcome flow, shown once per account (gated by
// components/OnboardingGate.tsx via profiles.onboarding_completed). Every
// step beyond account basics (already collected at signup) is individually
// skippable, and the whole flow can be skipped from any step — both paths
// mark onboarding_completed so it never reappears. Reuses real existing
// pieces throughout rather than rebuilding: GenreMultiSelect/AvatarPicker
// (extracted from EditProfileModal this same pass), MountRushmoreEditor
// (already a standalone reusable modal, used unchanged), and lib/search.ts's
// real searchUsers — never a taste-based suggestion algorithm, which
// doesn't exist anywhere in this project (confirmed absent in an earlier
// Social Discovery audit).
export default function OnboardingScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [finishing, setFinishing] = useState(false);

  // Step 1 — informational only, not persisted anywhere: no
  // favourite_media_types column exists, and genres aren't categorized by
  // media type in this schema (GENRE_OPTIONS is one flat list), so there's
  // no real field for this to feed. Documented choice, not an oversight —
  // exists purely to make the flow feel tailored before the real, persisted
  // genre step.
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);

  // Baseline fetched once so the final save merges onboarding's own choices
  // with whatever was already true (e.g. username/display name set at
  // signup) instead of blanking them out — updateProfile() expects the
  // full field set, same as Edit Profile submits it.
  const [baseline, setBaseline] = useState<ProfileData | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [rushmoreOpen, setRushmoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchOwnProfile(user.id).then((p) => {
      if (cancelled || !p) return;
      setBaseline(p);
      setGenres(p.favouriteGenres);
      setAvatarUrl(p.avatarUrl);
      setBio(p.bio ?? '');
      setLoadingProfile(false);
    }).catch(() => setLoadingProfile(false));
    return () => { cancelled = true; };
  }, [user]);

  const toggleMediaType = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMediaTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const toggleGenre = (genre: string) => {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const persistProfileChoices = async () => {
    if (!user || !baseline) return;
    await updateProfile(user.id, {
      displayName:     baseline.displayName ?? '',
      username:        baseline.username ?? '',
      bio:             bio.trim(),
      websiteUrl:      baseline.websiteUrl ?? '',
      favouriteGenres: genres,
      favouriteFilm:   baseline.favouriteFilm ?? '',
      favouriteSeries: baseline.favouriteSeries ?? '',
      favouriteBook:   baseline.favouriteBook ?? '',
    });
  };

  const goNext = () => {
    setError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void handleFinish();
  };

  const handleFinish = async () => {
    if (!user || finishing) return;
    setFinishing(true);
    await persistProfileChoices().catch(() => {});
    await completeOnboarding(user.id);
    setFinishing(false);
    router.replace('/(tabs)');
  };

  const handleSkipStep = () => goNext();

  const handleSkipEntirely = async () => {
    if (!user || finishing) return;
    setFinishing(true);
    await completeOnboarding(user.id);
    setFinishing(false);
    router.replace('/(tabs)');
  };

  if (!user || loadingProfile) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={RS.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const stepKey = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}
          accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}
        >
          {STEPS.map((key, i) => (
            <View key={key} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>
        <Pressable onPress={handleSkipStep} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip this step">
          <Text style={styles.skipStepLabel}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {stepKey === 'media-types' && (
          <>
            <Text style={styles.title}>What do you love?</Text>
            <Text style={styles.subtitle}>Pick what you&apos;re most into — you can always change this later.</Text>
            <View style={styles.chipRow}>
              {MEDIA_TYPE_OPTIONS.map((type) => {
                const active = mediaTypes.includes(type);
                return (
                  <Pressable
                    key={getMediaKey('onboarding-media-type', type)}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => toggleMediaType(type)}
                    accessibilityRole="button"
                    accessibilityLabel={type}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.typeChipLabel, active && styles.typeChipLabelActive]}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {stepKey === 'genres' && (
          <>
            <Text style={styles.title}>Favourite genres</Text>
            <Text style={styles.subtitle}>Helps your Home feel like yours from day one.</Text>
            <GenreMultiSelect selected={genres} onToggle={toggleGenre} />
          </>
        )}

        {stepKey === 'profile' && (
          <>
            <Text style={styles.title}>Make it yours</Text>
            <Text style={styles.subtitle}>Add a photo and a few words about you.</Text>
            <AvatarPicker userId={user.id} avatarUrl={avatarUrl} onChange={setAvatarUrl} onError={setError} />
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label} nativeID="label-onboarding-bio">Bio</Text>
                <Text style={styles.counter}>{bio.length} / {BIO_MAX}</Text>
              </View>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                placeholder="A few words about you…"
                placeholderTextColor={RS.colors.textMuted}
                multiline
                maxLength={BIO_MAX}
                accessibilityLabel="Bio"
                accessibilityLabelledBy="label-onboarding-bio"
              />
            </View>
          </>
        )}

        {stepKey === 'rushmore' && (
          <>
            <Text style={styles.title}>Your Mount Rushmore</Text>
            <Text style={styles.subtitle}>Pick your top 4 films, series, and books — the ones that made you.</Text>
            <Pressable
              style={styles.rushmoreBtn}
              onPress={() => setRushmoreOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose your Top 4s"
            >
              <MaterialIcons name="grid-view" size={18} color={RS.button.primaryText} />
              <Text style={styles.rushmoreBtnLabel}>Choose your Top 4s</Text>
            </Pressable>
          </>
        )}

        {stepKey === 'follow' && <FollowStep userId={user.id} />}

        {error ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueBtn, finishing && styles.continueBtnDisabled]}
          onPress={goNext}
          disabled={finishing}
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? "Let's go" : 'Continue'}
          accessibilityState={{ disabled: finishing, busy: finishing }}
        >
          {finishing ? (
            <ActivityIndicator color={RS.button.filledText} />
          ) : (
            <Text style={styles.continueLabel}>{isLastStep ? "Let's go" : 'Continue'}</Text>
          )}
        </Pressable>
        <Pressable onPress={handleSkipEntirely} hitSlop={8} disabled={finishing} accessibilityRole="button" accessibilityLabel="Skip onboarding for now">
          <Text style={styles.skipAllLabel}>Skip for now</Text>
        </Pressable>
      </View>

      <MountRushmoreEditor
        visible={rushmoreOpen}
        onClose={() => setRushmoreOpen(false)}
        initialSlots={[]}
        userId={user.id}
        onSaved={() => setRushmoreOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── Follow step — reuses lib/search.ts's real searchUsers exactly (the
// same "Users" category the Search screen already has), plus the existing
// followUser/unfollowUser calls. No suggestion/similarity algorithm — none
// exists anywhere in this project, confirmed absent in an earlier audit —
// this is a plain, honest search box, fully optional. ───────────────────────
function FollowStep({ userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const timeoutId = setTimeout(() => {
      searchUsers(query)
        .then((data) => { if (!cancelled) setResults(data.filter((u) => u.id !== userId)); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [query, userId]);

  const handleToggleFollow = async (targetId: string) => {
    if (followBusy.has(targetId)) return; // functional guard — prevents follow/unfollow firing out of order
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const isFollowing = following.has(targetId);
    setFollowing((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetId); else next.add(targetId);
      return next;
    });
    setFollowBusy((prev) => new Set(prev).add(targetId));
    try {
      if (isFollowing) await unfollowUser(userId, targetId);
      else await followUser(userId, targetId);
    } catch {
      // Roll back on failure.
      setFollowing((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(targetId); else next.delete(targetId);
        return next;
      });
    } finally {
      setFollowBusy((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  return (
    <>
      <Text style={styles.title}>Find people to follow</Text>
      <Text style={styles.subtitle}>Search for friends already on ReelShelf. Totally optional.</Text>
      <View style={styles.searchInputWrap}>
        <MaterialIcons name="search" size={16} color={RS.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username or name…"
          placeholderTextColor={RS.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search by username or name"
        />
      </View>
      {searching ? (
        <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.md }} />
      ) : (
        results.map((u) => {
          const isFollowing = following.has(u.id);
          return (
            <View key={getMediaKey('onboarding-follow', u.id)} style={styles.userRow}>
              {u.avatarUrl ? (
                <Image source={{ uri: u.avatarUrl }} style={styles.userAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                  <MaterialIcons name="person" size={18} color={RS.colors.textMuted} />
                </View>
              )}
              <View style={styles.userMeta}>
                <Text style={styles.userName}>{u.displayName || u.username}</Text>
                <Text style={styles.userHandle}>@{u.username}</Text>
              </View>
              <Pressable
                style={[styles.followBtn, isFollowing && styles.followBtnActive, followBusy.has(u.id) && { opacity: 0.6 }]}
                onPress={() => handleToggleFollow(u.id)}
                disabled={followBusy.has(u.id)}
                accessibilityRole="button"
                accessibilityLabel={isFollowing ? `Following ${u.displayName || u.username}` : `Follow ${u.displayName || u.username}`}
                accessibilityState={{ selected: isFollowing, disabled: followBusy.has(u.id), busy: followBusy.has(u.id) }}
              >
                <Text style={[styles.followBtnLabel, isFollowing && styles.followBtnLabelActive]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    gap:           6,
  },
  dot: {
    width:           20,
    height:          4,
    borderRadius:    2,
    backgroundColor: RS.colors.elevated,
  },
  dotActive: {
    backgroundColor: RS.colors.accent,
  },
  // textMuted measures ~2.75:1 against RS.colors.base — below WCAG AA.
  // These auth-adjacent uses switch to textSecondary (~6.3:1); textMuted
  // itself is a shared token used app-wide and left unchanged elsewhere.
  skipStepLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  content: {
    flex:              1,
    paddingHorizontal: RS.spacing.lg,
    gap:               RS.spacing.md,
  },
  title: {
    fontSize:      RS.typography.display - 8,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  subtitle: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    lineHeight: 21,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           RS.spacing.xs + 2,
  },
  typeChip: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: 16,
    paddingVertical:   10,
    backgroundColor:   RS.colors.elevated,
  },
  typeChipActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
  },
  typeChipLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  typeChipLabelActive: {
    color: RS.button.primaryText,
  },
  field: {
    gap: RS.spacing.xs,
  },
  labelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  counter: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
  bioInput: {
    minHeight:         90,
    textAlignVertical: 'top',
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.sm,
    fontSize:          RS.typography.body,
    color:             RS.colors.textPrimary,
  },
  rushmoreBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               RS.spacing.xs,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.button.primaryBorder,
    backgroundColor:   RS.button.primaryFill,
    paddingVertical:   RS.button.paddingV,
    alignSelf:         'flex-start',
    paddingHorizontal: RS.button.paddingH,
  },
  rushmoreBtnLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.button.primaryText,
  },
  searchInputWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               RS.spacing.xs,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.sm,
  },
  searchInput: {
    flex:     1,
    fontSize: RS.typography.body,
    color:    RS.colors.textPrimary,
  },
  userRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.sm,
    paddingVertical: RS.spacing.xs,
  },
  userAvatar: {
    width:        40,
    height:       40,
    borderRadius: 20,
  },
  userAvatarFallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  userHandle: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textSecondary,
  },
  followBtn: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.button.primaryBorder,
    backgroundColor:   RS.button.primaryFill,
    paddingHorizontal: 14,
    paddingVertical:   6,
  },
  followBtnActive: {
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.elevated,
  },
  followBtnLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.primaryText,
  },
  followBtnLabelActive: {
    color: RS.colors.textSecondary,
  },
  errorText: {
    fontSize: RS.typography.caption + 1,
    color:    '#f87171',
  },
  footer: {
    paddingHorizontal: RS.spacing.lg,
    paddingBottom:     RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  continueBtn: {
    borderRadius:    RS.button.radius,
    backgroundColor: RS.button.filledBg,
    paddingVertical: RS.button.paddingV,
    alignItems:      'center',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
  skipAllLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
    textAlign:  'center',
  },
});
