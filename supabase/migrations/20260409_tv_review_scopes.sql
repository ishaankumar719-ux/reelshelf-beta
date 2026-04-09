alter table public.diary_entries
  alter column review_scope set default 'show';

update public.diary_entries
  set review_scope = 'show'
  where review_scope = 'title';

alter table public.diary_entries
  alter column season_number drop not null,
  alter column season_number drop default,
  alter column episode_number drop not null,
  alter column episode_number drop default;

update public.diary_entries
  set season_number = null, episode_number = null
  where review_scope = 'show';

update public.diary_entries
  set episode_number = null
  where review_scope = 'season' and episode_number = 0;

drop index if exists public.diary_entries_scope_unique_idx;

create unique index if not exists diary_entries_unique_show
  on public.diary_entries (user_id, media_id)
  where review_scope = 'show';

create unique index if not exists diary_entries_unique_season
  on public.diary_entries (user_id, media_id, season_number)
  where review_scope = 'season';

create unique index if not exists diary_entries_unique_episode
  on public.diary_entries (user_id, media_id, season_number, episode_number)
  where review_scope = 'episode';
