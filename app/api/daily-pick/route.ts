import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { localMovies } from "@/lib/localMovies"
import { localSeries } from "@/lib/localSeries"
import { localBooks } from "@/lib/localBooks"

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
}

type LocalFilm = (typeof localMovies)[number]
type LocalSeries = (typeof localSeries)[number]
type LocalBook = (typeof localBooks)[number]

function enrichPick(mediaType: "film" | "tv" | "book", mediaId: string): Omit<DailyPickData, "id" | "pick_date" | "reroll_count"> | null {
  if (mediaType === "film") {
    const item = localMovies.find((m) => m.id === mediaId) as LocalFilm | undefined
    if (!item) return null
    return {
      media_type: "film",
      media_id: mediaId,
      title: item.title,
      year: item.year,
      poster: item.poster ?? null,
      overview: item.overview,
      genre: null,
      creator: item.director,
    }
  }
  if (mediaType === "tv") {
    const item = localSeries.find((s) => s.id === mediaId) as LocalSeries | undefined
    if (!item) return null
    return {
      media_type: "tv",
      media_id: mediaId,
      title: item.title,
      year: item.year,
      poster: item.poster ?? null,
      overview: item.overview,
      genre: null,
      creator: item.creator,
    }
  }
  // book
  const item = localBooks.find((b) => b.id === mediaId) as LocalBook | undefined
  if (!item) return null
  return {
    media_type: "book",
    media_id: mediaId,
    title: item.title,
    year: item.year,
    poster: item.cover ?? null,
    overview: item.overview,
    genre: item.genre ?? null,
    creator: item.author,
  }
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

function generatePick(
  mediaType: "film" | "tv" | "book",
  excludedIds: Set<string>,
  extraExcludeId?: string
): { media_type: "film" | "tv" | "book"; media_id: string } | null {
  let pool: string[]

  if (mediaType === "film") {
    pool = localMovies.map((m) => m.id)
  } else if (mediaType === "tv") {
    pool = localSeries.map((s) => s.id)
  } else {
    pool = localBooks.map((b) => b.id)
  }

  const candidates = pool.filter(
    (id) => !excludedIds.has(id) && id !== extraExcludeId
  )

  const picked = pickRandom(candidates)
  if (!picked) return null
  return { media_type: mediaType, media_id: picked }
}

async function buildExclusionSets(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  if (!supabase) return { filmIds: new Set<string>(), tvIds: new Set<string>(), bookIds: new Set<string>() }

  const [diaryRes, watchlistRes] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("media_id, media_type")
      .eq("user_id", userId)
      .in("review_scope", ["show", "title"]),
    supabase
      .from("saved_items")
      .select("media_id, media_type")
      .eq("user_id", userId)
      .eq("list_type", "watchlist"),
  ])

  const filmIds = new Set<string>()
  const tvIds = new Set<string>()
  const bookIds = new Set<string>()

  for (const row of [...(diaryRes.data ?? []), ...(watchlistRes.data ?? [])]) {
    const id = row.media_id as string
    const type = row.media_type as string
    if (type === "movie") filmIds.add(id)
    else if (type === "tv") tvIds.add(id)
    else if (type === "book") bookIds.add(id)
  }

  return { filmIds, tvIds, bookIds }
}

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  // Return existing pick for today
  const { data: existing } = await supabase
    .from("daily_picks")
    .select("*")
    .eq("user_id", user.id)
    .eq("pick_date", today)
    .maybeSingle()

  if (existing) {
    const enriched = enrichPick(
      existing.media_type as "film" | "tv" | "book",
      existing.media_id as string
    )
    if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })
    const pick: DailyPickData = {
      id: existing.id as string,
      pick_date: existing.pick_date as string,
      reroll_count: existing.reroll_count as number,
      ...enriched,
    }
    return NextResponse.json(pick)
  }

  // Generate a new pick
  const { filmIds, tvIds, bookIds } = await buildExclusionSets(supabase, user.id)

  const types: Array<"film" | "tv" | "book"> = ["film", "tv", "book"]
  // Randomise the order so the starting type varies
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]]
  }

  let newPick: { media_type: "film" | "tv" | "book"; media_id: string } | null = null

  for (const type of types) {
    const excluded = type === "film" ? filmIds : type === "tv" ? tvIds : bookIds
    newPick = generatePick(type, excluded)
    if (newPick) break
  }

  if (!newPick) {
    return NextResponse.json({ error: "No candidates available" }, { status: 404 })
  }

  const { data: inserted, error } = await supabase
    .from("daily_picks")
    .insert({
      user_id: user.id,
      pick_date: today,
      media_type: newPick.media_type,
      media_id: newPick.media_id,
      reroll_count: 0,
    })
    .select()
    .single()

  if (error || !inserted) {
    return NextResponse.json({ error: "Failed to save pick" }, { status: 500 })
  }

  const enriched = enrichPick(newPick.media_type, newPick.media_id)
  if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

  const pick: DailyPickData = {
    id: inserted.id as string,
    pick_date: inserted.pick_date as string,
    reroll_count: 0,
    ...enriched,
  }

  return NextResponse.json(pick)
}

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

  if (!existing) {
    return NextResponse.json({ error: "No pick exists for today" }, { status: 404 })
  }

  if ((existing.reroll_count as number) >= 1) {
    return NextResponse.json({ error: "No more rerolls today" }, { status: 409 })
  }

  const previousMediaId = existing.media_id as string
  const { filmIds, tvIds, bookIds } = await buildExclusionSets(supabase, user.id)

  const types: Array<"film" | "tv" | "book"> = ["film", "tv", "book"]
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]]
  }

  let newPick: { media_type: "film" | "tv" | "book"; media_id: string } | null = null

  for (const type of types) {
    const excluded = type === "film" ? filmIds : type === "tv" ? tvIds : bookIds
    newPick = generatePick(type, excluded, previousMediaId)
    if (newPick) break
  }

  if (!newPick) {
    return NextResponse.json({ error: "No candidates available" }, { status: 404 })
  }

  const { data: updated, error } = await supabase
    .from("daily_picks")
    .update({
      media_type: newPick.media_type,
      media_id: newPick.media_id,
      reroll_count: 1,
    })
    .eq("id", existing.id)
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: "Failed to update pick" }, { status: 500 })
  }

  const enriched = enrichPick(newPick.media_type, newPick.media_id)
  if (!enriched) return NextResponse.json({ error: "Pick media not found" }, { status: 404 })

  const pick: DailyPickData = {
    id: updated.id as string,
    pick_date: updated.pick_date as string,
    reroll_count: 1,
    ...enriched,
  }

  return NextResponse.json(pick)
}
