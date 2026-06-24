alter table public.daily_picks
  add column if not exists reasons jsonb default '[]'::jsonb;
