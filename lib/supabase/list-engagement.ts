import type { SupabaseClient } from "@supabase/supabase-js"

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

  // Call SECURITY DEFINER function — bypasses owner-only RLS on user_lists.
  // No SUPABASE_SERVICE_ROLE_KEY needed.
  await supabase.rpc("update_list_engagement_counts", {
    p_list_id: listId,
    p_like_count: lc,
    p_save_count: sc,
    p_trending_score: trendingScore,
  })

  return { like_count: lc, save_count: sc, trending_score: trendingScore }
}
