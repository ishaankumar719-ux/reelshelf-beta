import { redirect } from "next/navigation"
import StatsClient from "@/components/stats/StatsClient"
import { createClient } from "@/lib/supabase/server"

type StatsEntry = {
  id: string
  title: string
  year: number
  poster: string | null
  rating: number | string | null
  watched_date: string
  media_type: "movie" | "tv" | "book"
  runtime: number | null
  genres: string[] | null
  review_scope: string
  media_id: string
}

export default async function StatsPage() {
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

  const { data: entries } = await supabase
    .from("diary_entries")
    .select(
      "id, title, year, poster, rating, watched_date, media_type, runtime, genres, review_scope, media_id"
    )
    .eq("user_id", userId)
    .in("review_scope", ["show", "title"])
    .order("watched_date", { ascending: false })

  return <StatsClient entries={(entries ?? []) as StatsEntry[]} />
}
