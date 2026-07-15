// Question of the Day — ports the website's exact algorithms (see
// WEBSITE_QUESTION_OF_THE_DAY_AUDIT.md and the source files it names:
// app/daily-reel/page.tsx's getOrCreateRotation(), app/api/trivia/answer/route.ts).
// `trivia_daily_rotation` is a single GLOBAL row per rotation_date, shared by
// every user on every platform (world-readable, any-authenticated-user-writable
// per RLS) — unlike daily_picks, it is NOT safe to key by device-local date, so
// every date computed in this file is UTC, always.
import { supabase } from './client';

export type TriviaCategory = 'film' | 'tv' | 'book';
export type TriviaDifficulty = 'easy' | 'medium' | 'hard';

const BASE_XP: Record<TriviaDifficulty, number> = { easy: 10, medium: 20, hard: 30 };

export interface RotationRow {
  rotationDate: string;
  filmQuestionId: string | null;
  tvQuestionId: string | null;
  bookQuestionId: string | null;
}

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  difficulty: TriviaDifficulty;
  question: string;
  answers: string[];
  correctIndex: number;
  explanation: string | null;
}

export interface TriviaAnswerRecord {
  selectedIndex: number;
  isCorrect: boolean | null; // null = "already answered" conflict case (23505), no fresh result to show
  xpEarned: number;
}

export interface TriviaProgress {
  filmStreak: number;
  tvStreak: number;
  bookStreak: number;
  filmCorrect: number;
  tvCorrect: number;
  bookCorrect: number;
  totalCorrect: number;
  longestStreak: number;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Always UTC — `toISOString()` is UTC regardless of device locale/timezone.
 *  This table is a single shared-globally row per date, so (unlike daily_picks'
 *  accepted local-date divergence) using the device's local date here would risk
 *  mobile creating/reading a different day's rotation than the website. */
export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Adds `delta` days to a YYYY-MM-DD string using pure UTC arithmetic (Date.UTC +
 *  toISOString), never the device's local calendar. The website's own version of
 *  this (`new Date(dateStr); d.setDate(d.getDate() - 1)`) uses LOCAL Date methods,
 *  which only happens to equal UTC because it runs in a UTC-clocked server
 *  environment — that assumption does not hold on a mobile device in an arbitrary
 *  timezone, so this port deliberately uses timezone-safe arithmetic to reach the
 *  same logical result instead of copying the literal (server-environment-
 *  dependent) implementation. */
function addUtcDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

interface RotationDbRow {
  rotation_date: string;
  film_question_id: string | null;
  tv_question_id: string | null;
  book_question_id: string | null;
}

function fromDbRotation(row: RotationDbRow): RotationRow {
  return {
    rotationDate: row.rotation_date,
    filmQuestionId: row.film_question_id,
    tvQuestionId: row.tv_question_id,
    bookQuestionId: row.book_question_id,
  };
}

/** Selects one question id for `category`, uniform-random from questions not used
 *  in the last 30 days, falling back to the full active pool if every question in
 *  the category was used within that window — the EXACT algorithm from the
 *  website's `pickQuestion()` (uniform random, not least-recently-used, not
 *  sequential). Do not change this selection strategy without re-reading the
 *  website source; this is what determines the shared question for every user,
 *  web included, if mobile happens to be the first client to load a given day. */
async function pickQuestion(category: TriviaCategory, recent: Set<string>): Promise<string | null> {
  const client = requireClient();
  const { data: all, error } = await client
    .from('trivia_questions')
    .select('id')
    .eq('category', category)
    .eq('active', true);
  if (error) throw error;
  if (!all || all.length === 0) return null;

  const ids = all as { id: string }[];
  const eligible = ids.filter((q) => !recent.has(q.id));
  const pool = eligible.length > 0 ? eligible : ids;
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
}

/** Get-or-create for today's shared trivia_daily_rotation row — exact port of the
 *  website's getOrCreateRotation(). Any authenticated client may create this row
 *  (confirmed via live RLS: INSERT/UPDATE with_check auth.uid() IS NOT NULL,
 *  world-readable SELECT). */
export async function getOrCreateRotation(today: string): Promise<RotationRow | null> {
  const client = requireClient();

  const { data: existing, error: existingErr } = await client
    .from('trivia_daily_rotation')
    .select('rotation_date, film_question_id, tv_question_id, book_question_id')
    .eq('rotation_date', today)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return fromDbRotation(existing as RotationDbRow);

  const cutoffStr = addUtcDays(today, -30);
  const { data: recentRot, error: recentErr } = await client
    .from('trivia_daily_rotation')
    .select('film_question_id, tv_question_id, book_question_id')
    .gte('rotation_date', cutoffStr);
  if (recentErr) throw recentErr;

  const recentRows = (recentRot ?? []) as RotationDbRow[];
  const recentFilm = new Set(recentRows.map((r) => r.film_question_id).filter((v): v is string => !!v));
  const recentTv = new Set(recentRows.map((r) => r.tv_question_id).filter((v): v is string => !!v));
  const recentBook = new Set(recentRows.map((r) => r.book_question_id).filter((v): v is string => !!v));

  const [filmId, tvId, bookId] = await Promise.all([
    pickQuestion('film', recentFilm),
    pickQuestion('tv', recentTv),
    pickQuestion('book', recentBook),
  ]);

  const rotation: RotationRow = { rotationDate: today, filmQuestionId: filmId, tvQuestionId: tvId, bookQuestionId: bookId };

  const { data: upserted, error: upsertErr } = await client
    .from('trivia_daily_rotation')
    .upsert(
      { rotation_date: today, film_question_id: filmId, tv_question_id: tvId, book_question_id: bookId },
      { onConflict: 'rotation_date', ignoreDuplicates: false },
    )
    .select('rotation_date, film_question_id, tv_question_id, book_question_id')
    .maybeSingle();

  if (upsertErr) {
    // Matches website's fallback: a concurrent request may have created the row
    // first — re-read rather than treating this as a hard failure.
    const { data: fallback } = await client
      .from('trivia_daily_rotation')
      .select('rotation_date, film_question_id, tv_question_id, book_question_id')
      .eq('rotation_date', today)
      .maybeSingle();
    return fallback ? fromDbRotation(fallback as RotationDbRow) : rotation;
  }

  return upserted ? fromDbRotation(upserted as RotationDbRow) : rotation;
}

export async function fetchQuestionsForRotation(
  rotation: RotationRow | null,
): Promise<Record<TriviaCategory, TriviaQuestion | null>> {
  const empty: Record<TriviaCategory, TriviaQuestion | null> = { film: null, tv: null, book: null };
  if (!rotation) return empty;

  const ids = [rotation.filmQuestionId, rotation.tvQuestionId, rotation.bookQuestionId].filter(
    (v): v is string => !!v,
  );
  if (ids.length === 0) return empty;

  const client = requireClient();
  const { data, error } = await client
    .from('trivia_questions')
    .select('id, category, difficulty, question, answers, correct_index, explanation')
    .in('id', ids);
  if (error) throw error;

  const out = { ...empty };
  for (const row of (data ?? []) as any[]) {
    out[row.category as TriviaCategory] = {
      id: row.id,
      category: row.category,
      difficulty: row.difficulty,
      question: row.question,
      answers: Array.isArray(row.answers) ? row.answers : [],
      correctIndex: row.correct_index,
      explanation: row.explanation ?? null,
    };
  }
  return out;
}

export async function fetchTodaysAnswers(
  userId: string,
  today: string,
): Promise<Record<TriviaCategory, TriviaAnswerRecord | null>> {
  const client = requireClient();
  const empty: Record<TriviaCategory, TriviaAnswerRecord | null> = { film: null, tv: null, book: null };
  const { data, error } = await client
    .from('trivia_answers')
    .select('category, selected_index, is_correct, xp_earned')
    .eq('user_id', userId)
    .eq('rotation_date', today);
  if (error) throw error;

  const out = { ...empty };
  for (const row of (data ?? []) as any[]) {
    out[row.category as TriviaCategory] = {
      selectedIndex: row.selected_index,
      isCorrect: row.is_correct,
      xpEarned: row.xp_earned,
    };
  }
  return out;
}

export async function fetchTriviaProgress(userId: string): Promise<TriviaProgress | null> {
  const client = requireClient();
  const { data, error } = await client.from('trivia_user_progress').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, number>;
  return {
    filmStreak: row.film_streak ?? 0,
    tvStreak: row.tv_streak ?? 0,
    bookStreak: row.book_streak ?? 0,
    filmCorrect: row.film_correct ?? 0,
    tvCorrect: row.tv_correct ?? 0,
    bookCorrect: row.book_correct ?? 0,
    totalCorrect: row.total_correct ?? 0,
    longestStreak: row.longest_streak ?? 0,
  };
}

export type SubmitAnswerResult =
  | { alreadyAnswered: true }
  | {
      alreadyAnswered: false;
      isCorrect: boolean;
      correctIndex: number;
      xpEarned: number;
      explanation: string | null;
      progress: TriviaProgress;
    };

/** Exact port of /api/trivia/answer's scoring + streak logic. correct_index is
 *  read from trivia_questions client-side (RLS confirmed world-readable:
 *  `trivia_q_read` — qual: true), NOT trusted from any client-submitted value —
 *  is_correct is computed here, the same trust boundary the website's route
 *  applies server-side, just moved to the only place mobile has: this client
 *  (there is no mobile equivalent of a Next.js API route to hold it instead). */
export async function submitTriviaAnswer(params: {
  userId: string;
  category: TriviaCategory;
  question: TriviaQuestion;
  rotationDate: string;
  selectedIndex: number;
}): Promise<SubmitAnswerResult> {
  const { userId, category, question, rotationDate, selectedIndex } = params;
  const client = requireClient();

  const isCorrect = selectedIndex === question.correctIndex;

  // Fresh read, not hook-cached state — mirrors the API route recomputing streak
  // from the DB on every request rather than trusting client-held progress.
  const { data: progressRaw, error: progressErr } = await client
    .from('trivia_user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (progressErr) throw progressErr;
  const progress = (progressRaw ?? null) as Record<string, number | string> | null;

  const lastDate = progress ? (progress[`last_${category}_date`] as string | null) : null;
  const currentStreak = progress ? ((progress[`${category}_streak`] as number) ?? 0) : 0;
  const yesterdayStr = addUtcDays(rotationDate, -1);

  const newStreak = isCorrect ? (lastDate === yesterdayStr ? currentStreak + 1 : 1) : 0;
  const streakBonus = isCorrect ? Math.min(newStreak * 3, 21) : 0;
  const xpEarned = isCorrect ? BASE_XP[question.difficulty] + streakBonus : 0;

  const { error: insertErr } = await client.from('trivia_answers').insert({
    user_id: userId,
    question_id: question.id,
    rotation_date: rotationDate,
    category,
    selected_index: selectedIndex,
    is_correct: isCorrect,
    xp_earned: xpEarned,
  });

  if (insertErr) {
    if (insertErr.code === '23505') return { alreadyAnswered: true };
    throw insertErr;
  }

  const newCorrect = (progress ? ((progress[`${category}_correct`] as number) ?? 0) : 0) + (isCorrect ? 1 : 0);
  const newTotalCorrect = (progress ? ((progress.total_correct as number) ?? 0) : 0) + (isCorrect ? 1 : 0);
  const newLongest = Math.max(progress ? ((progress.longest_streak as number) ?? 0) : 0, newStreak);

  const { error: progressUpdateErr } = await client.from('trivia_user_progress').upsert(
    {
      user_id: userId,
      [`${category}_streak`]: newStreak,
      [`${category}_correct`]: newCorrect,
      [`last_${category}_date`]: rotationDate,
      total_correct: newTotalCorrect,
      longest_streak: newLongest,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (progressUpdateErr) throw progressUpdateErr;

  const filmStreak = progress ? ((progress.film_streak as number) ?? 0) : 0;
  const tvStreak = progress ? ((progress.tv_streak as number) ?? 0) : 0;
  const bookStreak = progress ? ((progress.book_streak as number) ?? 0) : 0;
  const filmCorrect = progress ? ((progress.film_correct as number) ?? 0) : 0;
  const tvCorrect = progress ? ((progress.tv_correct as number) ?? 0) : 0;
  const bookCorrect = progress ? ((progress.book_correct as number) ?? 0) : 0;

  return {
    alreadyAnswered: false,
    isCorrect,
    correctIndex: question.correctIndex,
    xpEarned,
    explanation: question.explanation,
    progress: {
      filmStreak: category === 'film' ? newStreak : filmStreak,
      tvStreak: category === 'tv' ? newStreak : tvStreak,
      bookStreak: category === 'book' ? newStreak : bookStreak,
      filmCorrect: category === 'film' ? newCorrect : filmCorrect,
      tvCorrect: category === 'tv' ? newCorrect : tvCorrect,
      bookCorrect: category === 'book' ? newCorrect : bookCorrect,
      totalCorrect: newTotalCorrect,
      longestStreak: newLongest,
    },
  };
}
