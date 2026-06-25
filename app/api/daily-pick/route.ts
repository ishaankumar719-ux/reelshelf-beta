import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { localMovies } from "@/lib/localMovies"
import { localSeries } from "@/lib/localSeries"
import { localBooks } from "@/lib/localBooks"
import {
  buildUserContext,
  pickBest,
  generateReasons,
  scoreCandidate,
} from "@/lib/recommendation-engine"

export const dynamic = "force-dynamic"

export type DailyPickData = {
  id: string
  pick_date: string
  media_type: "film" | "tv" | "book"
  media_id: string
  reroll_count: number
  title: string
  year: string
  poster: string | null
  overview: string
  genre: string | null
  creator: string | null
  reasons: string[]
}

type LocalFilm = (typeof localMovies)[number]
type LocalSeries = (typeof localSeries)[number]
type LocalBook = (typeof localBooks)[number]

// ─── Enrich ───────────────────────────────────────────────────────────────────

function enrichPick(
  mediaType: "film" | "tv" | "book",
  mediaId: string
): Omit<DailyPickData, "id" | "pick_date" | "reroll_count" | "reasons"> | null {
  if (mediaType === "film") {
    const item = localMovies.find((m) => m.id === mediaId) as LocalFilm | undefined
    if (!item) return null
    return { media_type: "film", media_id: mediaId, title: item.title, year: item.year, poster: item.poster ?? null, overview: item.overview, genre: null, creator: item.director }
  }
  if (mediaType === "tv") {
    const item = localSeries.find((s) => s.id === mediaId) as LocalSeries | undefined
    if (!item) return null
    return { media_type: "tv", media_id: mediaId, title: item.title, year: item.year, poster: item.poster ?? null, overview: item.overview, genre: null, creator: item.creator }
  }
  const item = localBooks.find((b) => b.id === mediaId) as LocalBook | undefined
  if (!item) return null
  return { media_type: "book", media_id: mediaId, title: item.title, year: item.year, poster: item.cover ?? null, overview: item.overview, genre: item.genre ?? null, creator: item.author }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from("daily_picks")
    .select("*")
    .eq("user_id", user.id)
    .eq("pick_date", today)
    .maybeSingle()

  if (existing) {
    const enriched = enrichPick(existing.media_type as "film" | "tv" | "book", existing.media_id as string)
    if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

    // Use stored reasons if available; otherwise score this candidate fresh
    const storedReasons =
      Array.isArray(existing.reasons) && (existing.reasons as string[]).length > 0
        ? (existing.reasons as string[])
        : null

    let reasons: string[]
    if (storedReasons) {
      reasons = storedReasons
    } else {
      const ctx = await buildUserContext(supabase, user.id, { today })
      const scored = scoreCandidate(
        existing.media_type as "film" | "tv" | "book",
        existing.media_id as string,
        enriched.creator,
        ctx
      )
      reasons = generateReasons(scored)
    }

    return NextResponse.json({
      id: existing.id as string,
      pick_date: existing.pick_date as string,
      reroll_count: existing.reroll_count as number,
      reasons,
      ...enriched,
    } satisfies DailyPickData)
  }

  // No existing pick for today — select one using the scoring engine
  const ctx = await buildUserContext(supabase, user.id, { today })
  const best = pickBest(ctx)
  if (!best) return NextResponse.json({ error: "No candidates available" }, { status: 404 })

  const enriched = enrichPick(best.mediaType, best.mediaId)
  if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

  const reasons = generateReasons(best)

  const { data: inserted, error } = await supabase
    .from("daily_picks")
    .insert({ user_id: user.id, pick_date: today, media_type: best.mediaType, media_id: best.mediaId, reroll_count: 0 })
    .select()
    .single()

  if (error || !inserted) return NextResponse.json({ error: "Failed to save pick" }, { status: 500 })

  // Persist reasons (best-effort — requires daily_picks_reasons migration)
  void supabase.from("daily_picks").update({ reasons }).eq("id", inserted.id as string).then(() => {}, () => {})

  return NextResponse.json({
    id: inserted.id as string,
    pick_date: inserted.pick_date as string,
    reroll_count: 0,
    reasons,
    ...enriched,
  } satisfies DailyPickData)
}

// ─── POST (reroll) ────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from("daily_picks")
    .select("*")
    .eq("user_id", user.id)
    .eq("pick_date", today)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: "No pick exists for today" }, { status: 404 })
  if ((existing.reroll_count as number) >= 1) return NextResponse.json({ error: "No more rerolls today" }, { status: 409 })

  const ctx = await buildUserContext(supabase, user.id, {
    today,
    excludeMediaId: existing.media_id as string,
  })

  const best = pickBest(ctx)
  if (!best) return NextResponse.json({ error: "No candidates available" }, { status: 404 })

  const enriched = enrichPick(best.mediaType, best.mediaId)
  if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

  const reasons = generateReasons(best)

  const { data: updated, error } = await supabase
    .from("daily_picks")
    .update({ media_type: best.mediaType, media_id: best.mediaId, reroll_count: 1 })
    .eq("id", existing.id as string)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: "Failed to update pick" }, { status: 500 })

  // Persist reasons (best-effort — requires daily_picks_reasons migration)
  void supabase.from("daily_picks").update({ reasons }).eq("id", updated.id as string).then(() => {}, () => {})

  return NextResponse.json({
    id: updated.id as string,
    pick_date: updated.pick_date as string,
    reroll_count: 1,
    reasons,
    ...enriched,
  } satisfies DailyPickData)
}
