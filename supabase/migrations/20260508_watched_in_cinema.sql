ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS watched_in_cinema boolean NOT NULL DEFAULT false;
