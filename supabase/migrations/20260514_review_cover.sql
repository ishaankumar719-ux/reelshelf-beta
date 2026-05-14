-- Review cover: lets users pick a poster/backdrop/upload as the visual for their review.
-- Source tracks where the image came from for display logic.

alter table public.diary_entries
  add column if not exists review_cover_url    text,
  add column if not exists review_cover_source text
    check (review_cover_source in ('default', 'tmdb_poster', 'tmdb_backdrop', 'upload'));
