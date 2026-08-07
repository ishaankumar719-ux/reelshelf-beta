drop index if exists public.profiles_username_unique_idx;

create unique index profiles_username_unique_idx
  on public.profiles (lower(username))
  where (username is not null);
