-- SECURITY DEFINER function owned by postgres (which has BYPASSRLS).
-- Any authenticated user may call this via RPC to update engagement counts
-- on user_lists without needing SUPABASE_SERVICE_ROLE_KEY or list ownership.
CREATE OR REPLACE FUNCTION update_list_engagement_counts(
  p_list_id       uuid,
  p_like_count    integer,
  p_save_count    integer,
  p_trending_score numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_lists
  SET
    like_count     = p_like_count,
    save_count     = p_save_count,
    trending_score = p_trending_score
  WHERE id = p_list_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_list_engagement_counts TO authenticated;
