import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  computeEarnedBadgeSlugs,
  syncEarnedBadges,
  type BadgeDefinition,
  type BadgeSyncStats,
} from "@/lib/supabase/badges"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ ok: false }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const uid = user.id

  const [
    filmRes, tvRes, bookRes, reviewRes, cinemaRes, followRes,
    progressRes, allDefsRes, existingRes,
  ] = await Promise.all([
    supabase.from("diary_entries").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("media_type", "movie"),
    supabase.from("diary_entries").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("media_type", "tv"),
    supabase.from("diary_entries").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("media_type", "book"),
    supabase.from("diary_entries").select("*", { count: "exact", head: true }).eq("user_id", uid).not("review", "is", null).not("review", "eq", ""),
    supabase.from("diary_entries").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("watched_in_cinema", true),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", uid),
    supabase.from("trivia_user_progress").select("longest_streak").eq("user_id", uid).maybeSingle(),
    supabase.from("badges").select("id,slug,name,description,rarity,category,icon,sort_order"),
    supabase.from("user_badges").select("badge_id,unlocked_at,showcased").eq("user_id", uid),
  ])

  const stats: BadgeSyncStats = {
    filmCount:        filmRes.count   ?? 0,
    tvCount:          tvRes.count     ?? 0,
    bookCount:        bookRes.count   ?? 0,
    reviewCount:      reviewRes.count ?? 0,
    cinemaCount:      cinemaRes.count ?? 0,
    followersCount:   followRes.count ?? 0,
    longestStreak:    (progressRes.data as { longest_streak?: number } | null)?.longest_streak ?? 0,
    commentsReceived: 0,
    likesReceived:    0,
  }

  const allDefs = (allDefsRes.data ?? []) as unknown as BadgeDefinition[]
  const existingMap = new Map(
    ((existingRes.data ?? []) as { badge_id: string; unlocked_at: string; showcased: boolean }[])
      .map((b) => [b.badge_id, { unlocked_at: b.unlocked_at, showcased: b.showcased }])
  )

  const earned = computeEarnedBadgeSlugs(stats, existingMap.size)
  await syncEarnedBadges(supabase, uid, earned, existingMap, allDefs)

  const newBadges = earned.filter((slug) => {
    const def = allDefs.find((d) => d.slug === slug)
    return def && !existingMap.has(def.id)
  })

  return NextResponse.json({ ok: true, newBadges: newBadges.length })
}
