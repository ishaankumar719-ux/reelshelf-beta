import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type Category = "film" | "tv" | "book"
type Difficulty = "easy" | "medium" | "hard"

const BASE_XP: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 30 }

export async function POST(req: Request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { questionId: string; rotationDate: string; category: Category; selectedIndex: number }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { questionId, rotationDate, category, selectedIndex } = body
  if (!questionId || !rotationDate || !category || typeof selectedIndex !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Fetch question server-side (never trust client for correct_index)
  const { data: question } = await supabase
    .from("trivia_questions")
    .select("id, difficulty, correct_index, explanation")
    .eq("id", questionId)
    .single()

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 })

  const isCorrect = selectedIndex === (question.correct_index as number)
  const difficulty = question.difficulty as Difficulty

  // Compute streak before insert
  const { data: progressRaw } = await supabase
    .from("trivia_user_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const progress = progressRaw as Record<string, unknown> | null
  const lastDate = (progress?.[`last_${category}_date`]) as string | null
  const currentStreak = (progress?.[`${category}_streak`] as number) ?? 0

  const yesterday = new Date(rotationDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  let newStreak: number
  if (isCorrect) {
    newStreak = lastDate === yesterdayStr ? currentStreak + 1 : 1
  } else {
    newStreak = 0
  }

  const streakBonus = isCorrect ? Math.min(newStreak * 3, 21) : 0
  const xpEarned = isCorrect ? BASE_XP[difficulty] + streakBonus : 0

  // Insert answer (unique constraint rejects duplicates)
  const { error: answerError } = await supabase.from("trivia_answers").insert({
    user_id: user.id,
    question_id: questionId,
    rotation_date: rotationDate,
    category,
    selected_index: selectedIndex,
    is_correct: isCorrect,
    xp_earned: xpEarned,
  })

  if (answerError) {
    if (answerError.code === "23505") return NextResponse.json({ error: "Already answered today" }, { status: 409 })
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 })
  }

  // Update progress
  const newCorrect = ((progress?.[`${category}_correct`] as number) ?? 0) + (isCorrect ? 1 : 0)
  const newTotalCorrect = ((progress?.total_correct as number) ?? 0) + (isCorrect ? 1 : 0)
  const newLongest = Math.max((progress?.longest_streak as number) ?? 0, newStreak)

  await supabase.from("trivia_user_progress").upsert({
    user_id: user.id,
    [`${category}_streak`]: newStreak,
    [`${category}_correct`]: newCorrect,
    [`last_${category}_date`]: rotationDate,
    total_correct: newTotalCorrect,
    longest_streak: newLongest,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" })

  // Community stats (admin client to read all answers)
  const admin = createAdminClient()
  let totalAnswers = 1
  let percentCorrect = isCorrect ? 100 : 0

  if (admin) {
    const { data: communityRows } = await admin
      .from("trivia_answers")
      .select("is_correct")
      .eq("question_id", questionId)
      .eq("rotation_date", rotationDate)

    if (communityRows && communityRows.length > 0) {
      const correct = (communityRows as { is_correct: boolean }[]).filter(r => r.is_correct).length
      totalAnswers = communityRows.length
      percentCorrect = Math.round((correct / totalAnswers) * 100)
    }
  }

  // Badge grants
  const newBadges: string[] = []
  if (admin) {
    const { data: badgeDefs } = await admin
      .from("badges")
      .select("id, slug")
      .eq("category", "trivia")

    const badgeMap = new Map(((badgeDefs ?? []) as { id: string; slug: string }[]).map(b => [b.slug, b.id]))

    const { data: existingUserBadges } = await admin
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.id)

    const existingIds = new Set(((existingUserBadges ?? []) as { badge_id: string }[]).map(b => b.badge_id))

    // Check perfect screening — need all 3 categories correct today
    const { data: todayAnswers } = await admin
      .from("trivia_answers")
      .select("category, is_correct")
      .eq("user_id", user.id)
      .eq("rotation_date", rotationDate)

    const todayCorrectCats = new Set(
      ((todayAnswers ?? []) as { category: string; is_correct: boolean }[])
        .filter(a => a.is_correct)
        .map(a => a.category)
    )

    const tvStreak   = (progress?.tv_streak   as number) ?? 0
    const filmStreak = (progress?.film_streak as number) ?? 0
    const bookStreak = (progress?.book_streak as number) ?? 0
    const maxStreak = Math.max(
      category === "film" ? newStreak : filmStreak,
      category === "tv" ? newStreak : tvStreak,
      category === "book" ? newStreak : bookStreak
    )

    const checks: { slug: string; condition: boolean }[] = [
      { slug: "trivia_film_scholar",        condition: category === "film" && newCorrect >= 10 },
      { slug: "trivia_tv_savant",           condition: category === "tv"   && newCorrect >= 10 },
      { slug: "trivia_page_turner",         condition: category === "book" && newCorrect >= 10 },
      { slug: "trivia_daily_projectionist", condition: maxStreak >= 7 },
      { slug: "trivia_historian",           condition: newTotalCorrect >= 50 },
      { slug: "trivia_perfect_screening",   condition: todayCorrectCats.size === 3 },
    ]

    for (const { slug, condition } of checks) {
      if (!condition) continue
      const badgeId = badgeMap.get(slug)
      if (!badgeId || existingIds.has(badgeId)) continue
      await admin.from("user_badges").insert({ user_id: user.id, badge_id: badgeId, unlocked_at: new Date().toISOString(), showcased: false })
      newBadges.push(slug)
    }
  }

  return NextResponse.json({
    isCorrect,
    correctIndex: question.correct_index as number,
    xpEarned,
    explanation: (question.explanation as string | null) ?? null,
    communityStats: { totalAnswers, percentCorrect },
    updatedProgress: {
      [`${category}Streak`]: newStreak,
      [`${category}Correct`]: newCorrect,
      totalCorrect: newTotalCorrect,
      longestStreak: newLongest,
    },
    newBadges,
  })
}
