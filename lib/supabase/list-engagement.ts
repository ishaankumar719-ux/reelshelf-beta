import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "./admin"

export interface EngagementCounts {
  like_count: number
  save_count: number
  trending_score: number
}

export async function recalculateListScores(
  supabase: SupabaseClient,
  listId: string
): Promise<EngagementCounts> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: likeCount },
    { count: saveCount },
    { data: recentLikes },
    { data: recentSaves },
  ] = await Promise.all([
    supabase.from("list_likes").select("*", { count: "exact", head: true }).eq("list_id", listId),
    supabase.from("list_saves").select("*", { count: "exact", head: true }).eq("list_id", listId),
    supabase.from("list_likes").select("id").eq("list_id", listId).gte("created_at", sevenDaysAgo).limit(1),
    supabase.from("list_saves").select("id").eq("list_id", listId).gte("created_at", sevenDaysAgo).limit(1),
  ])

  const lc = likeCount ?? 0
  const sc = saveCount ?? 0
  const hasRecentActivity = (recentLikes?.length ?? 0) > 0 || (recentSaves?.length ?? 0) > 0
  const recencyBonus = hasRecentActivity ? 10 : 0
  const trendingScore = lc * 2 + sc * 3 + recencyBonus

  // Use service-role client to bypass the owner-only UPDATE RLS policy on user_lists.
  const admin = createAdminClient() ?? supabase
  await admin
    .from("user_lists")
    .update({ like_count: lc, save_count: sc, trending_score: trendingScore })
    .eq("id", listId)

  return { like_count: lc, save_count: sc, trending_score: trendingScore }
}
