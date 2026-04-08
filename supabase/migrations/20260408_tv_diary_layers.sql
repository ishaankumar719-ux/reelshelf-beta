alter table public.diary_entries
add column if not exists review_scope text not null default 'title'
check (review_scope in ('title', 'show', 'season', 'episode'));

alter table public.diary_entries
add column if not exists show_id text not null default '';

alter table public.diary_entries
add column if not exists season_number integer not null default 0;

alter table public.diary_entries
add column if not exists episode_number integer not null default 0;

update public.diary_entries
set
  review_scope = case
    when media_type = 'tv' then 'show'
    else 'title'
  end,
  show_id = case
    when media_type = 'tv' then media_id
    else ''
  end,
  season_number = coalesce(season_number, 0),
  episode_number = coalesce(episode_number, 0)
where review_scope = 'title'
   or show_id = ''
   or season_number is null
   or episode_number is null;

alter table public.diary_entries
drop constraint if exists diary_entries_user_id_media_type_media_id_key;

create unique index if not exists diary_entries_scope_unique_idx
on public.diary_entries (
  user_id,
  media_type,
  media_id,
  review_scope,
  season_number,
  episode_number
);
