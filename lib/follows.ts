import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowCounts = {
  followers: number;
  following: number;
};

export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    followers: followers || 0,
    following: following || 0,
  };
}

export async function getIsFollowing(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string
) {
  const { data, error } = await supabase
    .from("followers")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) {
    console.error("[ReelShelf follows] load follow state failed", error);
    return false;
  }

  return Boolean(data);
}
