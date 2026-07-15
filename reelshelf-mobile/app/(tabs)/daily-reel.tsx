import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { MediaPrimaryActions } from '@/components/MediaPrimaryActions';
import { PosterCard } from '@/components/poster-card';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS, Fonts } from '@/constants/theme';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyPick } from '@/hooks/useDailyPick';
import { useMediaPersistence } from '@/hooks/useMediaPersistence';
import { type CatAnswerState, useQuestionOfTheDay } from '@/hooks/useQuestionOfTheDay';
import { fetchTodaysStory, type TodaysStory } from '@/lib/supabase/articles';
import type { MediaMeta } from '@/lib/supabase/mediaActions';
import { fetchStaffPicks, type StaffPick } from '@/lib/supabase/staffPicks';
import type { DailyPick } from '@/lib/supabase/dailyPick';
import type { RotationRow, TriviaCategory, TriviaQuestion } from '@/lib/supabase/trivia';
import { getMediaKey } from '@/utils/listKeys';

const MEDIA_BADGE_LABEL: Record<'film' | 'tv' | 'book', string> = {
  film: 'Film', tv: 'TV Series', book: 'Book',
};

// Exact values from the website's DailyReelPage.tsx CAT_COLORS/OPTION_LETTERS —
// content-identity colors, not part of the app's own theme palette, kept
// identical for cross-platform parity (WEBSITE_QUESTION_OF_THE_DAY_AUDIT.md §5).
const CAT_COLORS: Record<TriviaCategory, string> = {
  film: 'rgba(212,175,55,0.95)',
  tv:   'rgba(99,179,237,0.95)',
  book: 'rgba(252,129,129,0.95)',
};
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DailyReelScreen() {
  const { user, initializing } = useAuth();
  const { status, pick, rerolling, error, reroll, refetch } = useDailyPick();
  const qotd = useQuestionOfTheDay();

  const [staffPicks, setStaffPicks] = useState<StaffPick[] | null>(null);
  const [story, setStory] = useState<TodaysStory | null>(null);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scrollRef);

  const routeId = pick ? pick.mediaId : '';
  const meta: MediaMeta | null = pick ? {
    id: routeId, title: pick.title, posterUrl: pick.posterUrl, mediaType: pick.mediaType,
    year: pick.year ?? 0, genres: pick.genres, runtime: null, voteAverage: pick.voteAverage,
    director: pick.creator,
  } : null;
  const persistence = useMediaPersistence(routeId, meta, user?.id ?? null);

  const loadSections = async () => {
    const [picks, todaysStory] = await Promise.all([
      fetchStaffPicks().catch(() => []),
      fetchTodaysStory().catch(() => null),
    ]);
    setStaffPicks(picks);
    setStory(todaysStory);
    setSectionsLoaded(true);
  };

  useEffect(() => {
    if (user) void loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setSectionsLoaded(false);
    await Promise.all([refetch(), loadSections(), qotd.refetch()]);
    setRefreshing(false);
  };

  const openDetails = () => {
    if (!pick) return;
    router.push(`/media/${routeId}?title=${encodeURIComponent(pick.title)}&posterUrl=${encodeURIComponent(pick.posterUrl ?? '')}&mediaType=${pick.mediaType}`);
  };

  const openStaffPick = (item: StaffPick) => {
    router.push(`/media/${item.routeId}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`);
  };

  if (initializing) {
    return <SafeAreaView style={styles.root} edges={['top']} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <SignInPrompt message="Sign in to see your Daily Reel — one story, chosen for you every day." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AtmosphereProvider>
      <View style={styles.screen}>
        <AmbientAtmosphere scrollY={scrollY} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Animated.ScrollView
            ref={scrollRef}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RS.colors.accent} />}
          >
            {/* ── Header ────────────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Daily Reel</Text>
              <Text style={styles.headerDate}>{todayLabel()}</Text>
              <Text style={styles.headerSubtitle}>One story, chosen for you today.</Text>
              {qotd.progress && (
                <View style={styles.streakRow}>
                  {qotd.progress.filmStreak > 0 && (
                    <StreakPill label="Film" streak={qotd.progress.filmStreak} color={CAT_COLORS.film} />
                  )}
                  {qotd.progress.tvStreak > 0 && (
                    <StreakPill label="TV" streak={qotd.progress.tvStreak} color={CAT_COLORS.tv} />
                  )}
                  {qotd.progress.bookStreak > 0 && (
                    <StreakPill label="Book" streak={qotd.progress.bookStreak} color={CAT_COLORS.book} />
                  )}
                </View>
              )}
            </View>

            {/* ── Daily Pick ────────────────────────────────────────────────── */}
            {status === 'loading' && !pick ? (
              <View style={styles.section}>
                <SkeletonBlock width="100%" height={380} radius={RS.card.radius} />
              </View>
            ) : status === 'error' && !pick ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>{error ?? "Couldn't load today's pick."}</Text>
              </View>
            ) : pick ? (
              <View style={styles.section}>
                <DailyPickHero pick={pick} onPress={openDetails} />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <MediaPrimaryActions
                  id={routeId}
                  title={pick.title}
                  synopsis={pick.overview}
                  mediaType={pick.mediaType}
                  posterUrl={pick.posterUrl}
                  year={pick.year ?? 0}
                  genres={pick.genres}
                  runtime={null}
                  voteAverage={pick.voteAverage}
                  director={pick.creator}
                  inShelf={persistence.inShelf}
                  watched={persistence.watched}
                  rating={persistence.rating}
                  review={persistence.review}
                  error={persistence.error}
                  onToggleShelf={persistence.toggleShelf}
                  onToggleWatched={persistence.toggleWatched}
                  onSaveRating={persistence.saveRating}
                  onReviewSaved={(entry) => persistence.applyComposerSave({
                    rating: entry.rating, review: entry.review, containsSpoilers: entry.containsSpoilers,
                  })}
                />
                <RerollButton pick={pick} rerolling={rerolling} onReroll={reroll} />
              </View>
            ) : null}

            {/* ── Question of the Day ──────────────────────────────────────────
                Community-response aggregate ("X% got this right") is deliberately
                OMITTED: it requires the website's admin/service-role client to
                read across all users' trivia_answers rows, which mobile's RLS
                (own-rows-only SELECT) cannot do without a server-side piece that
                doesn't exist yet (WEBSITE_QUESTION_OF_THE_DAY_AUDIT.md §4). */}
            {qotd.status !== 'idle' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Question of the Day</Text>
                {qotd.status === 'loading' ? (
                  <SkeletonBlock width="100%" height={140} radius={RS.card.radius} />
                ) : qotd.status === 'error' ? (
                  <Text style={styles.emptyText}>{qotd.error ?? "Couldn't load today's question."}</Text>
                ) : (
                  <QuestionOfTheDaySection
                    rotation={qotd.rotation}
                    questions={qotd.questions}
                    catStates={qotd.catStates}
                    activeCategory={qotd.activeCategory}
                    onSelectCategory={qotd.selectCategory}
                    onSubmitAnswer={qotd.submitAnswer}
                    today={qotd.today}
                  />
                )}
              </View>
            )}

            {/* ── Today's Staff Picks ───────────────────────────────────────── */}
            {staffPicks === null ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today&apos;s Staff Picks</Text>
                <ActivityIndicator color={RS.colors.accent} />
              </View>
            ) : staffPicks.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today&apos;s Staff Picks</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {staffPicks.map((item, i) => (
                    <View key={getMediaKey(item.mediaType, `${item.id}-${i}`)} style={styles.staffPickCard}>
                      <PosterCard
                        title={item.title}
                        year={item.year ?? undefined}
                        mediaType={item.mediaType}
                        posterUrl={item.posterUrl}
                        onPress={() => openStaffPick(item)}
                      />
                      <Text style={styles.staffPickReason} numberOfLines={2}>{item.reason}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* ── Today's Story ─────────────────────────────────────────────── */}
            {story && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today&apos;s Story</Text>
                <View style={styles.storyCard}>
                  {story.coverImage && (
                    <Image source={{ uri: story.coverImage }} style={styles.storyCover} contentFit="cover" />
                  )}
                  <Text style={styles.storyTitle}>{story.title}</Text>
                  <Text style={styles.storyAuthor}>By {story.author}</Text>
                  <Text style={styles.storyBody} numberOfLines={storyExpanded ? undefined : 5}>{story.body}</Text>
                  <Pressable onPress={() => setStoryExpanded((v) => !v)}>
                    <Text style={styles.readMore}>{storyExpanded ? 'Show less' : 'Read more'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    </AtmosphereProvider>
  );
}

// ── Hero card ─────────────────────────────────────────────────────────────
function DailyPickHero({ pick, onPress }: { pick: DailyPick; onPress: () => void }) {
  return (
    <Pressable style={styles.hero} onPress={onPress}>
      {pick.posterUrl ? (
        <Image source={{ uri: pick.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.heroFallback]} />
      )}
      <View style={styles.heroScrim} />
      <View style={styles.heroContent}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>✨ Your Daily Pick</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{MEDIA_BADGE_LABEL[pick.mediaType]}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{pick.title}</Text>
        <Text style={styles.heroMeta}>{[pick.year, pick.genres[0], pick.creator].filter(Boolean).join(' · ')}</Text>
        {pick.overview ? <Text style={styles.heroOverview} numberOfLines={3}>{pick.overview}</Text> : null}
        {pick.reasons.length > 0 && (
          <View style={styles.reasonRow}>
            {pick.reasons.map((reason, i) => (
              <View key={getMediaKey('reason', `${reason}-${i}`)} style={styles.reasonChip}>
                <Text style={styles.reasonChipLabel}>{reason}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Question of the Day ──────────────────────────────────────────────────
function StreakPill({ label, streak, color }: { label: string; streak: number; color: string }) {
  return (
    <View style={[styles.streakPill, { borderColor: `${color}55`, backgroundColor: `${color}1A` }]}>
      <Text style={[styles.streakPillLabel, { color }]}>{label} · {streak}-day streak</Text>
    </View>
  );
}

/** Matches the website's "New question in {h}h {m}m" countdown to the next UTC
 *  midnight after `rotationDate` — WEBSITE_QUESTION_OF_THE_DAY_AUDIT.md §5. */
function timeUntilNextRotation(rotationDate: string): string {
  const [y, m, d] = rotationDate.split('-').map(Number);
  const nextUtcMidnight = Date.UTC(y, m - 1, d + 1);
  const diff = nextUtcMidnight - Date.now();
  if (diff <= 0) return 'soon';
  const h = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
}

function QuestionOfTheDaySection({
  rotation, questions, catStates, activeCategory, onSelectCategory, onSubmitAnswer, today,
}: {
  rotation: RotationRow | null;
  questions: Record<TriviaCategory, TriviaQuestion | null>;
  catStates: Record<TriviaCategory, CatAnswerState>;
  activeCategory: TriviaCategory | null;
  onSelectCategory: (cat: TriviaCategory) => void;
  onSubmitAnswer: (cat: TriviaCategory, idx: number) => Promise<void>;
  today: string;
}) {
  const cats: TriviaCategory[] = ['film', 'tv', 'book'];
  const q = activeCategory ? questions[activeCategory] : null;
  const cs = activeCategory ? catStates[activeCategory] : null;

  const handleSelectCategory = (cat: TriviaCategory) => {
    if (!questions[cat]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectCategory(cat);
  };

  const handleAnswer = async (cat: TriviaCategory, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await onSubmitAnswer(cat, idx);
  };

  if (!rotation) {
    return <Text style={styles.emptyText}>No question available today.</Text>;
  }

  return (
    <View style={styles.qotdCard}>
      <View style={styles.catPillRow}>
        {cats.map((cat) => {
          const hasQ = !!questions[cat];
          const isActive = activeCategory === cat;
          const answered = catStates[cat].revealed;
          const glyph = answered
            ? catStates[cat].isCorrect === true ? '✓' : catStates[cat].isCorrect === false ? '✗' : '·'
            : null;
          const glyphColor = catStates[cat].isCorrect === true
            ? '#1d9e75' : catStates[cat].isCorrect === false ? '#ef4444' : RS.colors.textMuted;
          return (
            <Pressable
              key={getMediaKey('trivia-cat', cat)}
              disabled={!hasQ}
              onPress={() => handleSelectCategory(cat)}
              style={[
                styles.catPill,
                isActive && styles.catPillActive,
                { opacity: hasQ ? 1 : 0.3 },
              ]}
            >
              {glyph && <Text style={[styles.catPillGlyph, { color: glyphColor }]}>{glyph}</Text>}
              <Text style={styles.catPillLabel}>{MEDIA_BADGE_LABEL[cat]}</Text>
            </Pressable>
          );
        })}
      </View>

      {!activeCategory && (
        <Text style={styles.qotdPrompt}>Select a category to answer today&apos;s question</Text>
      )}

      {activeCategory && q && cs && (
        <View style={styles.qotdBody}>
          <Text style={styles.qotdQuestion}>{q.question}</Text>

          <View style={styles.answerList}>
            {q.answers.map((answer, idx) => {
              // Exact port of the website's isRevealedCorrect/isRevealedWrong:
              // the true correct option is always highlighted once revealed
              // (green), the user's pick is highlighted red only if it was wrong.
              const isRevealedCorrect = cs.revealed && cs.correctIndex === idx;
              const isRevealedWrong = cs.revealed && cs.selectedIndex === idx && !isRevealedCorrect;
              return (
                <Pressable
                  key={`${activeCategory}-${idx}`}
                  disabled={cs.revealed || cs.submitting}
                  onPress={() => void handleAnswer(activeCategory, idx)}
                  style={[
                    styles.answerBtn,
                    isRevealedCorrect && styles.answerBtnCorrect,
                    isRevealedWrong && styles.answerBtnWrong,
                  ]}
                >
                  <View style={styles.answerLetter}>
                    <Text style={styles.answerLetterLabel}>{OPTION_LETTERS[idx]}</Text>
                  </View>
                  <Text style={styles.answerText}>{answer}</Text>
                </Pressable>
              );
            })}
          </View>

          {cs.submitting && <Text style={styles.qotdSubmitting}>Submitting…</Text>}

          {cs.revealed && (
            <View style={[
              styles.revealPanel,
              cs.isCorrect === true && styles.revealPanelCorrect,
              cs.isCorrect === false && styles.revealPanelWrong,
            ]}>
              <Text style={[
                styles.revealTitle,
                cs.isCorrect === true && styles.revealTitleCorrect,
                cs.isCorrect === false && styles.revealTitleWrong,
              ]}>
                {cs.isCorrect === true ? 'Correct' : cs.isCorrect === false ? 'Incorrect' : 'Already answered'}
                {cs.xpEarned > 0 ? <Text style={styles.revealXp}> +{cs.xpEarned} XP</Text> : null}
              </Text>
              {cs.explanation ? <Text style={styles.revealExplanation}>{cs.explanation}</Text> : null}
              <Text style={styles.revealCountdown}>New question in {timeUntilNextRotation(today)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function RerollButton({ pick, rerolling, onReroll }: { pick: DailyPick; rerolling: boolean; onReroll: () => void }) {
  const rerollsLeft = pick.rerollCount < 1;
  const label = rerolling ? 'Choosing…' : rerollsLeft ? '✨ Surprise Me' : 'No more rerolls today';
  return (
    <Pressable
      style={[styles.rerollBtn, (!rerollsLeft || rerolling) && styles.rerollBtnDisabled]}
      disabled={!rerollsLeft || rerolling}
      onPress={onReroll}
    >
      <Text style={[styles.rerollBtnLabel, (!rerollsLeft || rerolling) && styles.rerollBtnLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  screen: { flex: 1, backgroundColor: RS.colors.base },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: RS.tabBar.contentBottomPad, gap: RS.spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg, paddingVertical: RS.spacing.xl },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  errorText: { fontSize: RS.typography.caption, color: '#f87171', paddingHorizontal: RS.spacing.md },
  header: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, gap: 4 },
  headerTitle: { fontSize: RS.typography.display - 6, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: RS.letterSpacing.tight },
  headerDate: { fontSize: RS.typography.body, color: RS.colors.textSecondary, fontStyle: 'italic' },
  headerSubtitle: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  streakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  streakPill: { borderRadius: RS.badge.pillRadius, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  streakPillLabel: { fontSize: 11, fontWeight: '600', letterSpacing: RS.letterSpacing.normal },
  section: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  hero: { height: 380, borderRadius: RS.card.radius, overflow: 'hidden', borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, justifyContent: 'flex-end' },
  heroFallback: { backgroundColor: RS.colors.elevated },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  heroContent: { padding: RS.spacing.md, gap: 6, backgroundColor: 'rgba(0,0,0,0.55)' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: RS.typography.overline, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  badge: { borderRadius: RS.badge.pillRadius, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 2 },
  badgeLabel: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: RS.typography.heading + 4, fontWeight: '700', color: '#fff', letterSpacing: RS.letterSpacing.tight },
  heroMeta: { fontSize: RS.typography.caption, color: 'rgba(255,255,255,0.6)' },
  heroOverview: { fontSize: RS.typography.body, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reasonChip: { borderRadius: RS.button.radius, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4 },
  reasonChipLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  rerollBtn: {
    alignSelf: 'flex-start', borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  rerollBtnDisabled: { opacity: 0.6 },
  rerollBtnLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.accent },
  rerollBtnLabelDisabled: { color: RS.colors.textMuted },
  posterRow: { gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  staffPickCard: { width: RS.card.posterWidth, gap: 6 },
  staffPickReason: { fontSize: 11, color: RS.colors.textMuted, lineHeight: 14 },
  storyCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.md, gap: 6 },
  storyCover: { width: '100%', height: 160, borderRadius: RS.card.radius - 4, marginBottom: 4 },
  storyTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  storyAuthor: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  storyBody: { fontSize: RS.typography.body, color: RS.colors.textSecondary, lineHeight: 21 },
  readMore: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.accent, marginTop: 2 },
  // ── Question of the Day ──────────────────────────────────────────────────
  qotdCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.md, gap: RS.spacing.sm },
  catPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', borderRadius: RS.button.radius,
    borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  catPillActive: { borderColor: RS.colors.borderStrong, backgroundColor: 'rgba(255,255,255,0.08)' },
  catPillGlyph: { fontSize: 12, fontWeight: '700', marginRight: 5 },
  catPillLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textPrimary },
  qotdPrompt: { fontSize: RS.typography.caption, color: RS.colors.textMuted, textAlign: 'center', paddingVertical: RS.spacing.sm },
  qotdBody: { gap: RS.spacing.sm },
  qotdQuestion: { fontFamily: Fonts?.serif, fontStyle: 'italic', fontSize: RS.typography.body + 1, color: RS.colors.textPrimary, lineHeight: 22 },
  answerList: { gap: 8 },
  answerBtn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 10,
    borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  answerBtnCorrect: { borderColor: 'rgba(29,158,117,0.5)', backgroundColor: 'rgba(29,158,117,0.10)' },
  answerBtnWrong: { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.10)' },
  answerLetter: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 0.5, borderColor: RS.colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  answerLetterLabel: { fontSize: 10, fontWeight: '700', color: RS.colors.textMuted },
  answerText: { flex: 1, fontSize: RS.typography.body, color: RS.colors.textSecondary, lineHeight: 19 },
  qotdSubmitting: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  revealPanel: { borderRadius: 10, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, padding: RS.spacing.sm, gap: 4 },
  revealPanelCorrect: { borderColor: 'rgba(29,158,117,0.35)', backgroundColor: 'rgba(29,158,117,0.08)' },
  revealPanelWrong: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)' },
  revealTitle: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  revealTitleCorrect: { color: '#1d9e75' },
  revealTitleWrong: { color: '#ef4444' },
  revealXp: { fontSize: RS.typography.caption, fontWeight: '400', color: RS.colors.textMuted },
  revealExplanation: { fontSize: RS.typography.caption, color: RS.colors.textSecondary, lineHeight: 17 },
  revealCountdown: { fontSize: 10, color: RS.colors.textMuted, letterSpacing: RS.letterSpacing.normal },
});
