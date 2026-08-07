create extension if not exists pg_net;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  device_platform text not null check (device_platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users can view own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own push tokens"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
  on public.push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);
