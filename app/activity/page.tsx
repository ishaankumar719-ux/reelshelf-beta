import { redirect } from "next/navigation"
import ActivityFeed, {
  type ActivityEvent,
  type ActivityProfile,
} from "@/components/activity/ActivityFeed"
import { createClient } from "@/lib/supabase/server"

export default async function ActivityPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/auth")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  const userId = session.user.id

  const [{ data: diaryRows }, { data: savedRows }, { data: profile }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("id, title, media_type, poster, rating, watched_date, created_at")
      .eq("user_id", userId)
      .in("review_scope", ["show", "title"])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("saved_items")
      .select("id, title, media_type, poster, list_type, added_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", userId)
      .single(),
  ])

  const diaryEvents: ActivityEvent[] = (diaryRows ?? []).map((row) => ({
    id: `diary-${row.id}`,
    type: "logged",
    title: row.title,
    media_type: row.media_type,
    poster: row.poster ?? null,
    rating:
      row.rating !== null && row.rating !== "" ? parseFloat(String(row.rating)) : null,
    watched_date: row.watched_date ?? null,
    timestamp: row.created_at,
  }))

  const watchlistEvents: ActivityEvent[] = (savedRows ?? []).map((row) => ({
    id: `saved-${row.id}`,
    type: "watchlisted",
    title: row.title,
    media_type: row.media_type,
    poster: row.poster ?? null,
    rating: null,
    watched_date: null,
    timestamp: row.added_at ?? row.created_at,
  }))

  const allEvents = [...diaryEvents, ...watchlistEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50)

  return <ActivityFeed allEvents={allEvents} profile={(profile ?? null) as ActivityProfile | null} />
}
