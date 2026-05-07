-- Optional per-aspect ratings for film diary entries.
-- All columns are nullable — existing rows keep NULL, nothing breaks.
-- Only used for media_type = 'movie' in the UI, but no DB constraint enforces this
-- so future types can opt in without a schema change.

alter table public.diary_entries
  add column if not exists score_rating         numeric,
  add column if not exists cinematography_rating numeric,
  add column if not exists writing_rating        numeric,
  add column if not exists performances_rating   numeric,
  add column if not exists direction_rating      numeric,
  add column if not exists rewatchability_rating numeric,
  add column if not exists emotional_impact_rating numeric,
  add column if not exists entertainment_rating  numeric;
