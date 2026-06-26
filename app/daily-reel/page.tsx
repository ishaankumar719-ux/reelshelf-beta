import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { localMovies } from "@/lib/localMovies"
import DailyReelPage from "@/components/daily-reel/DailyReelPage"
import type { HiddenGem } from "@/components/daily-reel/DailyReelPage"
import type { TriviaQuestion, TriviaProgress, TriviaAnswerRecord, CommunityStat } from "@/components/trivia/TriviaHub"
import type { ArticleData, StaffPickData, UpcomingRelease, FanPickData } from "@/components/daily-reel/DailyReelEditorial"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Daily Reel – ReelShelf",
  description: "Your daily edition — pick, question, story, and more.",
}

type Category = "film" | "tv" | "book"

type RotationRow = {
  rotation_date: string
  film_question_id: string | null
  tv_question_id: string | null
  book_question_id: string | null
}

type AnswerRow = {
  category: string
  selected_index: number
  is_correct: boolean
  xp_earned: number
  question_id: string
}

// ─── Trivia rotation ──────────────────────────────────────────────────────────

async function getOrCreateRotation(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  today: string,
): Promise<RotationRow | null> {
  const { data: existing } = await supabase
    .from("trivia_daily_rotation")
    .select("rotation_date, film_question_id, tv_question_id, book_question_id")
    .eq("rotation_date", today)
    .maybeSingle()

  if (existing) return existing as RotationRow

  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().split("T")[0]

  const { data: recentRot } = await supabase
    .from("trivia_daily_rotation")
    .select("film_question_id, tv_question_id, book_question_id")
    .gte("rotation_date", cutoffStr)

  const recentFilm = new Set(((recentRot ?? []) as RotationRow[]).map(r => r.film_question_id).filter(Boolean))
  const recentTv   = new Set(((recentRot ?? []) as RotationRow[]).map(r => r.tv_question_id).filter(Boolean))
  const recentBook = new Set(((recentRot ?? []) as RotationRow[]).map(r => r.book_question_id).filter(Boolean))

  async function pickQuestion(cat: Category, recent: Set<string | null>): Promise<string | null> {
    const { data: all } = await supabase
      .from("trivia_questions")
      .select("id")
      .eq("category", cat)
      .eq("active", true)
    if (!all || all.length === 0) return null
    const eligible = (all as { id: string }[]).filter(q => !recent.has(q.id))
    const pool = eligible.length > 0 ? eligible : (all as { id: string }[])
    return pool[Math.floor(Math.random() * pool.length)]?.id ?? null
  }

  const [filmId, tvId, bookId] = await Promise.all([
    pickQuestion("film", recentFilm),
    pickQuestion("tv", recentTv),
    pickQuestion("book", recentBook),
  ])

  const rotation: RotationRow = {
    rotation_date: today,
    film_question_id: filmId,
    tv_question_id: tvId,
    book_question_id: bookId,
  }

  const { data: upserted, error } = await supabase
    .from("trivia_daily_rotation")
    .upsert(rotation, { onConflict: "rotation_date", ignoreDuplicates: false })
    .select("rotation_date, film_question_id, tv_question_id, book_question_id")
    .maybeSingle()

  if (error) {
    const { data: fallback } = await supabase
      .from("trivia_daily_rotation")
      .select("rotation_date, film_question_id, tv_question_id, book_question_id")
      .eq("rotation_date", today)
      .maybeSingle()
    return (fallback as RotationRow | null) ?? rotation
  }

  return (upserted as RotationRow | null) ?? rotation
}

// ─── Community stats ──────────────────────────────────────────────────────────

async function getCommunityStats(questionIds: string[]): Promise<Record<string, CommunityStat>> {
  if (questionIds.length === 0) return {}
  const admin = createAdminClient()
  if (!admin) return {}

  const { data } = await admin
    .from("trivia_answers")
    .select("question_id, is_correct")
    .in("question_id", questionIds)

  const stats: Record<string, CommunityStat> = {}
  const rows = (data ?? []) as { question_id: string; is_correct: boolean }[]

  for (const qid of questionIds) {
    const matching = rows.filter(r => r.question_id === qid)
    if (matching.length === 0) { stats[qid] = null; continue }
    const correct = matching.filter(r => r.is_correct).length
    stats[qid] = { totalAnswers: matching.length, percentCorrect: Math.round((correct / matching.length) * 100) }
  }

  return stats
}

// ─── Editorial data ───────────────────────────────────────────────────────────

async function fetchEditorialData(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
): Promise<{ featuredArticle: ArticleData | null; staffPicks: StaffPickData[] }> {
  const [articleRes, pickRes] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, body, cover_image, author, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(1),
    supabase
      .from("staff_picks")
      .select("id, media_type, title, poster_url, year, reason")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(6),
  ])

  return {
    featuredArticle: (articleRes.data?.[0] ?? null) as ArticleData | null,
    staffPicks: (pickRes.data ?? []) as StaffPickData[],
  }
}

// ─── Hidden gem ───────────────────────────────────────────────────────────────

// Curated set of films that are critically acclaimed but often overlooked.
// Picked from localMovies by ID.
const HIDDEN_GEM_IDS = [
  "blade-runner-2049",
  "arrival",
  "midsommar",
  "heat",
  "nightcrawler",
  "drive",
  "sicario",
  "no-country-for-old-men",
  "se7en",
]

function dateSeed(dateStr: string): number {
  return dateStr.replace(/-/g, "").split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0)
}

async function getHiddenGem(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  today: string,
): Promise<HiddenGem | null> {
  // Fetch the user's logged film IDs so we can exclude them
  const { data: diaryRows } = await supabase
    .from("diary_entries")
    .select("media_id")
    .eq("user_id", userId)
    .eq("media_type", "movie")

  const loggedIds = new Set(((diaryRows ?? []) as { media_id: string }[]).map(r => r.media_id))

  const eligible = HIDDEN_GEM_IDS.filter(id => !loggedIds.has(id))
  const pool = eligible.length > 0 ? eligible : HIDDEN_GEM_IDS

  const seed = dateSeed(today)
  const pickedId = pool[seed % pool.length]

  const movie = localMovies.find(m => m.id === pickedId)
  if (!movie) return null

  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster ?? null,
    overview: movie.overview,
    creator: movie.director,
    media_type: "film",
  }
}

// ─── Daily progress ───────────────────────────────────────────────────────────

type DailyProgressRow = {
  picked: boolean
  question_answered: boolean
  story_read: boolean
  staff_picks_explored: boolean
} | null

async function getDailyProgress(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  today: string,
): Promise<DailyProgressRow> {
  const { data } = await supabase
    .from("daily_progress")
    .select("picked, question_answered, story_read, staff_picks_explored")
    .eq("user_id", userId)
    .eq("progress_date", today)
    .maybeSingle()
  return data as DailyProgressRow
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DailyReelPageRoute() {
  const supabase = await createClient()
  if (!supabase) redirect("/")

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const today = new Date().toISOString().split("T")[0]!

  const [rotation, editorial, hiddenGem, initialDailyProgress] = await Promise.all([
    getOrCreateRotation(supabase, today),
    fetchEditorialData(supabase),
    getHiddenGem(supabase, user.id, today),
    getDailyProgress(supabase, user.id, today),
  ])

  // Fetch trivia questions from today's rotation
  const questionIds = [
    rotation?.film_question_id,
    rotation?.tv_question_id,
    rotation?.book_question_id,
  ].filter(Boolean) as string[]

  const questions: Record<Category, TriviaQuestion | null> = { film: null, tv: null, book: null }

  if (questionIds.length > 0) {
    const { data: qRows } = await supabase
      .from("trivia_questions")
      .select("id, category, difficulty, question, answers, correct_index, explanation, media_ref")
      .in("id", questionIds)

    for (const row of (qRows ?? []) as (TriviaQuestion & { category: Category })[]) {
      questions[row.category] = {
        ...row,
        answers: Array.isArray(row.answers) ? row.answers : (row.answers as unknown as string[]),
      }
    }
  }

  // User's answers for today
  const { data: answerRows } = await supabase
    .from("trivia_answers")
    .select("category, selected_index, is_correct, xp_earned, question_id")
    .eq("user_id", user.id)
    .eq("rotation_date", today)

  const initialAnswers: Record<Category, TriviaAnswerRecord | null> = { film: null, tv: null, book: null }
  for (const row of (answerRows ?? []) as AnswerRow[]) {
    initialAnswers[row.category as Category] = {
      selectedIndex: row.selected_index,
      isCorrect: row.is_correct,
      xpEarned: row.xp_earned,
    }
  }

  // User trivia progress (streaks)
  const { data: progressRow } = await supabase
    .from("trivia_user_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const initialProgress: TriviaProgress | null = progressRow
    ? {
        filmStreak:    (progressRow as Record<string, number>).film_streak,
        tvStreak:      (progressRow as Record<string, number>).tv_streak,
        bookStreak:    (progressRow as Record<string, number>).book_streak,
        filmCorrect:   (progressRow as Record<string, number>).film_correct,
        tvCorrect:     (progressRow as Record<string, number>).tv_correct,
        bookCorrect:   (progressRow as Record<string, number>).book_correct,
        totalCorrect:  (progressRow as Record<string, number>).total_correct,
        longestStreak: (progressRow as Record<string, number>).longest_streak,
      }
    : null

  // Community stats for already-answered questions
  const answeredIds = (answerRows ?? []).map((r: AnswerRow) => r.question_id)
  const communityStatsMap = await getCommunityStats(answeredIds)

  const initialCommunityStats: Record<Category, CommunityStat> = { film: null, tv: null, book: null }
  for (const row of (answerRows ?? []) as AnswerRow[]) {
    initialCommunityStats[row.category as Category] = communityStatsMap[row.question_id] ?? null
  }

  return (
    <DailyReelPage
      today={today}
      userId={user.id}
      rotation={rotation}
      questions={questions}
      initialAnswers={initialAnswers}
      initialProgress={initialProgress}
      initialCommunityStats={initialCommunityStats}
      featuredArticle={editorial.featuredArticle}
      staffPicks={editorial.staffPicks}
      hiddenGem={hiddenGem}
      initialDailyProgress={initialDailyProgress}
    />
  )
}
