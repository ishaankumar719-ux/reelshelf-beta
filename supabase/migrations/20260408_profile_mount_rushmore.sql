alter table public.profiles
add column if not exists movie_mount_rushmore jsonb not null default '[]'::jsonb;
