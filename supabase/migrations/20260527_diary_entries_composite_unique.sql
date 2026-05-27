-- ISSUE 1: Replace three partial unique indexes with one composite unique index
-- that exactly matches the onConflict target used throughout the codebase:
-- (user_id, media_type, media_id, review_scope, season_number, episode_number)
--
-- Partial indexes can't be matched by onConflict without an explicit WHERE clause,
-- causing "no unique or exclusion constraint matching the ON CONFLICT specification".

-- Backfill NULLs introduced by the 20260409_tv_review_scopes migration
UPDATE public.diary_entries SET season_number = 0 WHERE season_number IS NULL;
UPDATE public.diary_entries SET episode_number = 0 WHERE episode_number IS NULL;

-- Make columns NOT NULL so the composite index can enforce uniqueness
ALTER TABLE public.diary_entries
  ALTER COLUMN season_number SET NOT NULL,
  ALTER COLUMN season_number SET DEFAULT 0,
  ALTER COLUMN episode_number SET NOT NULL,
  ALTER COLUMN episode_number SET DEFAULT 0;

-- Remove duplicates created before this fix (keep latest saved_at per key)
DELETE FROM public.diary_entries
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, media_type, media_id, review_scope, season_number, episode_number
             ORDER BY saved_at DESC NULLS LAST
           ) AS rn
    FROM public.diary_entries
  ) ranked
  WHERE rn > 1
);

-- Drop the three partial indexes
DROP INDEX IF EXISTS public.diary_entries_unique_show;
DROP INDEX IF EXISTS public.diary_entries_unique_season;
DROP INDEX IF EXISTS public.diary_entries_unique_episode;

-- Create the single composite unique index the codebase targets
CREATE UNIQUE INDEX diary_entries_composite_unique
  ON public.diary_entries (user_id, media_type, media_id, review_scope, season_number, episode_number);
