-- ReelShelf Score: a calculated /10 score derived from overallRating + optional
-- review layers using per-media-type weighted averaging.
-- Nullable so all existing rows remain unaffected; populated on next save.

alter table public.diary_entries
  add column if not exists reelshelf_score numeric;
