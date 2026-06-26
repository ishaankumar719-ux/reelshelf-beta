import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import TriviaHub from "@/components/trivia/TriviaHub"
import type { TriviaQuestion, TriviaProgress, TriviaAnswerRecord, CommunityStat } from "@/components/trivia/TriviaHub"
import DailyReelEditorial from "@/components/daily-reel/DailyReelEditorial"
import type { ArticleData, StaffPickData, UpcomingRelease, FanPickData } from "@/components/daily-reel/DailyReelEditorial"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Daily Reel – ReelShelf",
  description: "Three daily trivia questions covering Film, TV, and Books.",
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

// ─── Rotation — uses the authenticated server client (no admin needed) ─────────

async function getOrCreateRotation(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  today: string,
): Promise<RotationRow | null> {
  // 1. Read existing rotation for today
  const { data: existing } = await supabase
    .from("trivia_daily_rotation")
    .select("rotation_date, film_question_id, tv_question_id, book_question_id")
    .eq("rotation_date", today)
    .maybeSingle()

  if (existing) return existing as RotationRow

  // 2. Build exclusion sets from last 30 days so we don't repeat recently used questions
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
    pickQuestion("tv",   recentTv),
    pickQuestion("book", recentBook),
  ])

  const rotation: RotationRow = {
    rotation_date: today,
    film_question_id: filmId,
    tv_question_id: tvId,
    book_question_id: bookId,
  }

  // Upsert handles the race where two simultaneous requests both try to insert today's row
  const { data: upserted, error } = await supabase
    .from("trivia_daily_rotation")
    .upsert(rotation, { onConflict: "rotation_date", ignoreDuplicates: false })
    .select("rotation_date, film_question_id, tv_question_id, book_question_id")
    .maybeSingle()

  if (error) {
    // Fallback: re-read (another request may have won the race)
    const { data: fallback } = await supabase
      .from("trivia_daily_rotation")
      .select("rotation_date, film_question_id, tv_question_id, book_question_id")
      .eq("rotation_date", today)
      .maybeSingle()
    return (fallback as RotationRow | null) ?? rotation
  }

  return (upserted as RotationRow | null) ?? rotation
}

// ─── Community stats — requires admin (service role key). Degrades gracefully. ─

async function getCommunityStats(
  questionIds: string[],
): Promise<Record<string, CommunityStat>> {
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
    stats[qid] = {
      totalAnswers: matching.length,
      percentCorrect: Math.round((correct / matching.length) * 100),
    }
  }

  return stats
}

// ─── Editorial data fetching ───────────────────────────────────────────────────

async function fetchEditorialData(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
): Promise<{
  featuredArticle: ArticleData | null
  staffPicks: StaffPickData[]
  upcomingItems: UpcomingRelease[]
  fanPicks: FanPickData[]
}> {
  // 1. Featured article — most recent published
  const { data: articleRows } = await supabase
    .from("articles")
    .select("id, title, body, cover_image, author, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
  const featuredArticle = (articleRows?.[0] ?? null) as ArticleData | null

  // 2. Staff picks — active, ordered by display_order
  const { data: pickRows } = await supabase
    .from("staff_picks")
    .select("id, media_type, title, poster_url, year, reason")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(6)
  const staffPicks = (pickRows ?? []) as StaffPickData[]

  // 3. Upcoming releases from TMDB
  const upcomingItems: UpcomingRelease[] = []
  const tmdbKey = process.env.TMDB_API_KEY
  if (tmdbKey) {
    try {
      const [moviesRes, tvRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${tmdbKey}&language=en-US&page=1`, {
          next: { revalidate: 3600 },
        }),
        fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${tmdbKey}&language=en-US&page=1`, {
          next: { revalidate: 3600 },
        }),
      ])
      if (moviesRes.ok) {
        const d = (await moviesRes.json()) as { results?: { id: number; title: string; poster_path: string | null; release_date: string }[] }
        for (const m of (d.results ?? []).slice(0, 7)) {
          upcomingItems.push({ id: m.id, title: m.title, poster_path: m.poster_path, release_date: m.release_date, media_type: "movie" })
        }
      }
      if (tvRes.ok) {
        const d = (await tvRes.json()) as { results?: { id: number; name: string; poster_path: string | null; first_air_date?: string }[] }
        for (const s of (d.results ?? []).slice(0, 5)) {
          upcomingItems.push({ id: s.id, title: s.name, poster_path: s.poster_path, release_date: s.first_air_date ?? "", media_type: "tv" })
        }
      }
      upcomingItems.sort((a, b) => a.release_date.localeCompare(b.release_date))
      upcomingItems.splice(10)
    } catch {
      // TMDB unavailable — section suppresses cleanly
    }
  }

  // 4. Fan picks — most logged in last 7 days (admin bypasses per-user RLS)
  const fanPicks: FanPickData[] = []
  const admin = createAdminClient()
  if (admin) {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: logRows } = await admin
        .from("diary_entries")
        .select("media_id, media_type, title, poster")
        .gte("saved_at", cutoff)
      if (logRows) {
        const counts = new Map<string, FanPickData>()
        for (const row of logRows as { media_id: string; media_type: string; title: string; poster: string | null }[]) {
          const key = `${row.media_type}:${row.media_id}`
          const existing = counts.get(key)
          if (existing) {
            existing.log_count++
          } else {
            counts.set(key, { media_id: row.media_id, media_type: row.media_type, title: row.title, poster: row.poster, log_count: 1 })
          }
        }
        const sorted = Array.from(counts.values()).sort((a, b) => b.log_count - a.log_count)
        fanPicks.push(...sorted.slice(0, 8))
      }
    } catch {
      // Fan picks unavailable — section suppresses cleanly
    }
  }

  return { featuredArticle, staffPicks, upcomingItems, fanPicks }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DailyReelPage() {
  const supabase = await createClient()
  if (!supabase) redirect("/")

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  const today = new Date().toISOString().split("T")[0]!

  // Fetch editorial sections in parallel with trivia rotation
  const [rotation, editorial] = await Promise.all([
    getOrCreateRotation(supabase, today),
    fetchEditorialData(supabase),
  ])

  // Fetch the three questions
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

  // User progress
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

  // Community stats for answered questions (admin-only; empty if key absent)
  const answeredIds = (answerRows ?? []).map((r: AnswerRow) => r.question_id)
  const communityStatsMap = await getCommunityStats(answeredIds)

  const initialCommunityStats: Record<Category, CommunityStat> = { film: null, tv: null, book: null }
  for (const row of (answerRows ?? []) as AnswerRow[]) {
    initialCommunityStats[row.category as Category] = communityStatsMap[row.question_id] ?? null
  }

  return (
    <>
      <DailyReelEditorial
        featuredArticle={editorial.featuredArticle}
        staffPicks={editorial.staffPicks}
        upcomingItems={editorial.upcomingItems}
        fanPicks={editorial.fanPicks}
      />
      <TriviaHub
        today={today}
        questions={questions}
        initialAnswers={initialAnswers}
        initialProgress={initialProgress}
        initialCommunityStats={initialCommunityStats}
      />
    </>
  )
}
