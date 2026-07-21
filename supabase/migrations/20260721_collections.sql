-- Shared curated-collections infrastructure ("Best A24 Films", "Oscar
-- Winners", etc.) — genuinely new, no prior "collections" table existed
-- anywhere in this project (confirmed via live query before writing this).
-- Both mobile and the website previously sourced this kind of content from
-- their own hardcoded/seed data; this is the real, shared source of truth
-- going forward.
--
-- No CMS/admin UI exists yet — until one does, rows are populated by a
-- dev-only script (mirroring generate-seed-data.ts's convention) or direct
-- migration, running with the service role. RLS below is intentionally
-- public-SELECT-only, no public/authenticated write path at all.
create table if not exists public.collections (
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        not null unique,
  title               text        not null,
  subtitle            text,
  description         text,
  hero_image_url      text,
  background_image_url text,
  accent_color        text,
  editorial_notes     text,
  -- Free text, not a CHECK-constrained enum: new curation rule types will
  -- emerge over time (per CONSTRAINTS) and shouldn't force a migration each
  -- time. Recommended values as of this migration — keep this list updated
  -- as a reference, but do NOT turn it into a CHECK constraint:
  --   studio | genre | decade | director | runtime | awards | seasonal | curated
  collection_type     text        not null,
  -- Free text describing how membership was verified (e.g. "TMDB
  -- production_companies id 41077" or "no verified data source available —
  -- requires manual curation" for collection types like awards that have no
  -- reliable API-backed check).
  verification_source text,
  verified_at         timestamptz,
  is_featured         boolean     not null default false,
  sort_order          integer     not null default 0,
  -- Null active_start_date/active_end_date = always eligible (no scheduling
  -- window); see the "what's live right now" query pattern documented below.
  active_start_date   timestamptz,
  active_end_date     timestamptz,
  is_archived         boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One row per title that's a member of a collection, each independently
-- verified — a collection's overall trustworthiness is only as good as its
-- individual items, so verification lives at this granularity, not the
-- collection's.
create table if not exists public.collection_items (
  id                  uuid        primary key default gen_random_uuid(),
  collection_id       uuid        not null references public.collections(id) on delete cascade,
  media_id            text        not null,
  media_type          text        not null check (media_type in ('movie', 'tv', 'book')),
  title               text        not null,
  year                integer,
  poster_path         text,
  sort_order          integer     not null default 0,
  -- Only 'verified' items should ever be treated as "live" by either app's
  -- queries — 'flagged'/'unverified' rows stay in the table for editorial
  -- review but are filtered out at query time (see the live-query pattern
  -- documented below, which is title-level: it governs which COLLECTIONS are
  -- currently live, and is always paired with a verification_status='verified'
  -- filter on collection_items by the querying application).
  verification_status text        not null default 'unverified'
                                   check (verification_status in ('verified', 'flagged', 'unverified')),
  -- Required whenever verification_status is not 'verified' — the reason a
  -- flagged/unverified item hasn't been confirmed (e.g. "no verified awards
  -- data source available — requires manual curation", or "TMDB
  -- production_companies did not include the verified A24 company id").
  verification_note   text,
  created_at          timestamptz not null default now()
);

create unique index if not exists collections_slug_key
  on public.collections (slug);

-- Powers the "what's currently live" query (see pattern below) — featured
-- status and the active-date-range bounds are always queried together.
create index if not exists collections_live_idx
  on public.collections (is_featured, active_start_date, active_end_date, is_archived);

create index if not exists collection_items_collection_id_idx
  on public.collection_items (collection_id, sort_order);

create index if not exists collection_items_verification_status_idx
  on public.collection_items (collection_id, verification_status);

alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "Public can read collections" on public.collections;
create policy "Public can read collections"
  on public.collections for select using (true);

drop policy if exists "Public can read collection_items" on public.collection_items;
create policy "Public can read collection_items"
  on public.collection_items for select using (true);

-- Deliberately no insert/update/delete policies for any role (including
-- `authenticated`) on either table — with RLS enabled and no write policy,
-- every write is denied by default regardless of caller. The only way to
-- write is the service-role key (migrations, or the dev-only population
-- script), bypassing RLS entirely, which is the intended "manual editorial
-- process for now" per CONSTRAINTS.

-- ─── "What's currently live" query pattern (canonical — reuse verbatim) ─────
-- This is the exact, fixed logic every future prompt/app must use identically
-- so a collection appears/disappears from mobile and the website at the same
-- moment — do not vary it per surface:
--
--   is_featured = true
--   AND active_start_date <= now()
--   AND (active_end_date IS NULL OR active_end_date >= now())
--   AND is_archived = false
--   ORDER BY sort_order ASC
--
-- As SQL:
--   select * from public.collections
--   where is_featured = true
--     and active_start_date <= now()
--     and (active_end_date is null or active_end_date >= now())
--     and is_archived = false
--   order by sort_order asc;
--
-- Note active_start_date has NO null-guard here (unlike active_end_date) —
-- a collection with a null active_start_date never satisfies this filter,
-- so the population script must set active_start_date on every collection
-- intended to actually go live.
--
-- Paired at the item level, only ever surface verified members of a live
-- collection:
--
--   select * from public.collection_items
--   where collection_id = <id>
--     and verification_status = 'verified'
--   order by sort_order asc;
