-- ── Part 1: Extend badges table ───────────────────────────────────────────────

-- Support future retired / limited-time badges
alter table public.badges
  add column if not exists is_limited  boolean     not null default false,
  add column if not exists retired_at  timestamptz          default null;

-- Expand category constraint to include 'legacy'
alter table public.badges drop constraint if exists badges_category_check;
alter table public.badges add constraint badges_category_check
  check (category in ('film','tv','book','cinema','reviews','streaks','social','prestige','legacy'));

-- ── Part 2: Seed legacy badges ────────────────────────────────────────────────
-- hidden = true: only appear on profiles that have earned them (never shown as locked)
-- is_limited = true: can never be obtained after the beta era ends
-- requirement_type = 'manual': granted only by admin assignment

insert into public.badges
  (slug, name, description, category, rarity, icon, hidden, requirement_type, requirement_value, xp, is_limited)
values
  (
    'original_eight',
    'Original Eight',
    'One of the first eight members to join ReelShelf.',
    'legacy', 'legendary', '🏛️', true, 'manual', 1, 750, true
  ),
  (
    'founding_critic',
    'Founding Critic',
    'Joined ReelShelf during the closed beta era.',
    'legacy', 'legendary', '📜', true, 'manual', 1, 750, true
  ),
  (
    'beta_pioneer',
    'Beta Pioneer',
    'Helped shape ReelShelf during early development.',
    'legacy', 'legendary', '🧭', true, 'manual', 1, 750, true
  ),
  (
    'day_one_member',
    'Day One Member',
    'Present before ReelShelf version 1.0.',
    'legacy', 'legendary', '🕯️', true, 'manual', 1, 750, true
  ),
  (
    'reelshelf_insider',
    'ReelShelf Insider',
    'Part of the original inner-circle testing group.',
    'legacy', 'legendary', '🔐', true, 'manual', 1, 750, true
  )
on conflict (slug) do nothing;
