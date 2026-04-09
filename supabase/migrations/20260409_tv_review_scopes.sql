alter table public.diary_entries
add column if not exists contains_spoilers boolean not null default false;

update public.diary_entries
set review_scope = 'show'
where media_type = 'tv'
  and review_scope = 'title';

alter table public.diary_entries
drop constraint if exists diary_entries_tv_show_scope_numbers_check;

alter table public.diary_entries
add constraint diary_entries_tv_show_scope_numbers_check
check (
  media_type <> 'tv'
  or (
    (review_scope = 'show' and season_number = 0 and episode_number = 0)
    or (review_scope = 'season' and season_number >= 1 and episode_number = 0)
    or (review_scope = 'episode' and season_number >= 1 and episode_number >= 1)
  )
);
