# Website Lists Audit — Blueprint for Mobile Rebuild

> Read-only audit. Every claim below is traced to an actual web app file path (repo root,
> sibling to `reelshelf-mobile/`) or a live query against the real production database, read
> on 2026-07-13. No code was changed to produce this document.

---

## 0. Where "Lists" actually lives on the website — three separate surfaces

1. **`/lists`** (`app/lists/page.tsx` → `ListsDiscoveryClient.tsx`) — titled **"Discover Lists"**.
   This is a **public feed of everyone's public lists** — search box, sort modes (Trending /
   Most Liked / Recent), grid of `DiscoveryListCard`. **Not** "My Lists."
2. **`/lists/create`** (`app/lists/create/page.tsx`) — the list-creation form.
3. **`/lists/[id]`** (`app/lists/[id]/page.tsx`) — the list detail page (view + edit + reorder +
   add/remove items + like/save/share).
4. **"My Lists" itself has no dedicated page** — it's the `UserListsSection` component embedded
   directly on the profile page (`components/profile/UserListsSection.tsx`, already covered in
   `WEBSITE_PROFILE_AUDIT.md` §9). There is no `/lists/mine` or equivalent.

---

## 1. Terminology, data model, interactions

**Files read:** `lib/supabase/lists.ts` (347 lines, full), `lib/supabase/list-engagement.ts`,
`app/api/lists/[id]/like/route.ts`, `app/api/lists/[id]/save/route.ts`, `app/lists/page.tsx`,
`app/lists/[id]/page.tsx` (full, 1291 lines), `app/lists/create/page.tsx` (full),
`components/lists/ListCoverCollage.tsx`, `components/lists/MediaSearchModal.tsx` (partial),
`components/lists/ListsDiscoveryClient.tsx` (partial), live `information_schema` + constraint
queries against `user_lists`/`user_list_items`/`list_likes`/`list_saves`.

### Exact schema (confirmed live, not assumed)

`user_lists`: `id, user_id, title (≤100 chars, CHECK), description, is_public (bool, legacy —
see below), is_ranked (bool), visibility (text, CHECK IN ('public','private','unlisted')),
like_count (int), save_count (int), trending_score (numeric), created_at, updated_at`.

`user_list_items`: `id, list_id, media_type, media_id, title, poster_url, year, rank_order
(int), notes (text), author (text — book author), created_at`.

`list_likes` / `list_saves`: `id, list_id, user_id, created_at` — real per-user tables, both
confirmed to exist live, each with a unique constraint on `(list_id, user_id)` (evidenced by
Postgres `23505` handling in both API routes — attempting a second like/save from the same user
returns HTTP 409 "Already liked"/"Already saved").

**Caution for the rebuild**: `is_public` is a real column but is **never referenced anywhere**
in the web app's own code (every file uses `visibility` exclusively) — it appears to be a
legacy/superseded column. Do not read or write `is_public`; use `visibility`.

### Terminology (exact, user-facing)

- List type: **"Ranked List"** vs **"Collection"** — this is the exact copy shown in the list
  detail hero's badge (`app/lists/[id]/page.tsx` line 587: `{list.is_ranked ? "Ranked List" :
  "Collection"}`). **This is a genuine terminology collision worth flagging explicitly** — see
  §2 below.
- Visibility: **Public / Private / Unlisted** (exact labels, `VISIBILITY_OPTIONS` arrays in both
  `app/lists/create/page.tsx` and `app/lists/[id]/page.tsx`), with exact help copy:
  - Public: *"Public lists appear on your profile and can be viewed by others."*
  - Private: *"Private lists are only visible to you."*
  - Unlisted: *"Unlisted lists won't appear on your profile or in Discover, but anyone with the
    direct link can view them."*
- List Type toggle (creation only): **Ranked / Unranked**, exact help copy:
  - Ranked: *"Ranked lists display numbered positions."*
  - Unranked: *"Unranked lists are simple collections without ordering."*
- Engagement buttons: **♡/♥ Like** (count shown after `·` if >0), **🔖 Save** (same pattern),
  **↗ Share** (native `navigator.share` where available, else copy-link with a 2s "✓ Copied"
  confirmation).
- Item type badges inside a list: **Film / TV / Book** singular; media-count breakdown line
  under the hero title uses plural forms: **Films / Series / Books** (`TYPE_LABEL` vs.
  `TYPE_LABEL_PLURAL` — two different label sets for singular-badge vs. plural-summary contexts).

### Cover art — confirmed computed, not stored

No `cover_url`/`cover_image` column exists anywhere in `user_lists`. Every cover (in the
Discovery grid, the profile's `ListPreviewCard`, and the detail page's cinematic hero) is
generated client-side by `ListCoverCollage.tsx` from the first 1–4 items' `poster_url`, laid out
as: 1 item → full-bleed single cell; 2 items → 2-column split; 3–4 items → 2×2 grid (a missing
4th cell renders as a dark placeholder with a dimmed 🎬 glyph). Zero items → a distinct "Empty
List" placeholder state (🎬 icon + divider + "Empty List" label).

### Add/remove item flow

- "+ Add media" (owner only) opens `MediaSearchModal.tsx` — debounced (280ms) search hitting the
  site's own `/api/search?q=...&types=film,series,book&limit=8` endpoint (same backing search
  used elsewhere on the site, not TMDB/OpenLibrary called directly from this modal), with a
  type filter (All/Film/TV/Book). Selecting a result inserts a `user_list_items` row at
  `rank_order = items.length + 1` (append-to-end — no position picker at add time).
- Remove: desktop hover-reveal "✕" button per row (`removeItem`), or the mobile overflow menu
  (see below). Removing always re-numbers all subsequent `rank_order` values via
  `update_list_items_order` (renumbering after deletion is real, not just visual).

### Reordering — real, and non-trivially adaptive across input methods

Three parallel mechanisms coexist in `app/lists/[id]/page.tsx`, only for `isOwner` and only
meaningfully shown when `is_ranked` is true (unranked lists show no rank numbers/drag affordances
at all — items are just a plain list):
1. **Desktop HTML5 drag-and-drop** (`draggable`, `onDragStart/onDragOver/onDragEnd`) — live
   reorder-as-you-drag, persisted via RPC on drop.
2. **Touch drag** — a 44×44px grip handle (⠿) with document-level `touchmove`/`touchend`
   listeners, including auto-scroll near the top/bottom edge of the viewport while dragging.
3. **Mobile overflow menu fallback** (⋮ button) — "Move Up / Move Down / Move to Top / Move to
   Bottom" — a non-drag alternative for when touch-drag isn't practical, each disabled correctly
   at the list boundaries.

All three call the **same persistence path**: `supabase.rpc("update_list_items_order", {
payload: [{id, rank_order}, ...] })` — a single RPC taking the full reordered array, not the
`lib/supabase/lists.ts`-exported `updateItemRankOrders()` helper (which does N individual
per-item `update()` calls and swaps exactly two positions — that helper exists in the shared lib
file but **is not actually called from the live list detail page**; it may be dead/legacy code
or used by a surface not covered in this pass). **The RPC is the real, live reorder mechanism.**

### Visibility/privacy enforcement

`fetchAll()` in the list detail page explicitly checks `listData.visibility === "private" &&
!owned` and treats it as not-found — client-side enforcement layered on top of RLS, not RLS
alone.

### Share behavior

`navigator.share()` (native OS share sheet) when available, falling back to clipboard-copy with
a transient "✓ Copied" label — this is the exact mobile-native pattern the brief's
desktop→mobile rules already call for, so mobile's adaptation here is simple: use React
Native's `Share` API directly (no fallback needed, always available on-device).

---

## 2. Collection vs. List — the exact distinction (and the collision)

Two genuinely separate concepts exist, and the website's own UI **partially blurs them**:

1. **ReelShelf's own editorial Collections** — curated, hand-picked, static-or-editorially-
   sourced groupings (e.g. "Award Winners", the mobile app's own `data/seedHomeContent.ts`
   collections) — these are **not** `user_lists` rows at all; they're a completely separate
   content system with no user ownership, no likes/saves, no items table relationship to
   `user_list_items`.
2. **A user's own List** (`user_lists` row) — always has a `user_id` owner, can be Ranked or
   Unranked, has real Supabase-backed items.

**The collision**: the list detail page's own hero badge literally displays the word
**"Collection"** as the type label for an *unranked user list* (`is_ranked === false` → shows
"Collection", not "Unranked List" or "List"). This means the website itself uses "Collection" to
mean two different things depending on context: (a) editorial curated content, and (b) a
user's own unranked list. This is a real, verified terminology overlap in the live product —
not a mobile-side mistake to blame retroactively. **Recommendation for the rebuild**: keep
ReelShelf's editorial Collections named "Collections" (unchanged, matches existing mobile
Discover/Home usage), and for user lists, prefer explicit "List" / "Ranked List" / "Unranked
List" wording on mobile rather than reusing "Collection" for the unranked case — this avoids
importing the website's own ambiguity into a second surface, while still being faithful to what
each underlying data source actually is.

---

## 3. Backend Reality Check — Lists

| Brief-requested feature | Real or aspirational? | Evidence |
|---|---|---|
| "Saved Lists" (a user saving/bookmarking another user's list) | **Real** | `list_saves` table exists live (confirmed via `information_schema`), `POST/DELETE /api/lists/[id]/save` fully implemented, `ListsDiscoveryClient`/`ListEngagementButtons` read+write real per-user save state. No dedicated "My Saved Lists" viewing page was found in this pass, though — a user can save a list, but there's no page listing *what a user has saved*. That specific view would be new UI over existing data, not a new table. |
| List likes | **Real** | `list_likes` table exists live, same API-route pattern as saves, unique-per-user constraint confirmed via `23505` handling. |
| List comments | **Not real** | Zero references to any `list_comments` table or comment UI anywhere in the web app's source; confirmed absent from `information_schema` query against the live database. Would require a new table + migration. |
| Item ordering (`rank_order`) | **Real** | Column confirmed live on `user_list_items`; actively read/written via the `update_list_items_order` RPC on every reorder action described in §1. |
| Collaborative lists (shared ownership / invites) | **Not real** | Zero hits for "collaborat" anywhere in the web app's source. `user_lists.user_id` is a single-owner column with no join table for co-owners/collaborators anywhere in the live schema. Purely aspirational if mentioned in any brief — would need a new `list_collaborators` table (or similar) plus new RLS policies to build for real. |
| List visibility (`public`/`private`/`unlisted`) | **Real**, exact 3 values | Live CHECK constraint: `visibility = ANY (ARRAY['public','private','unlisted'])`. |

---

## 4. Mobile's current Lists state (for direct comparison)

**Files read:** `reelshelf-mobile/lib/supabase/lists.ts`, `app/(tabs)/lists.tsx`,
`app/list/[id].tsx`, `components/ProfileView.tsx`'s Lists tab/preview (already read this
session).

- `fetchUserLists()` selects `id, title, description` only — **no `visibility`, `is_ranked`,
  `like_count`, `save_count`, or `trending_score` fetched at all.** Every list for the given
  user is fetched unconditionally (relies entirely on RLS to hide private ones from a
  non-owner viewer — there is no client-side visibility branching the way the website has).
- `fetchListDetail()` fetches items with `rank_order` (read-only — used only to `.order()` the
  query, never written to).
- **No like/save/share/create/edit/delete/reorder anywhere on mobile.** The Lists tab and list
  detail screen are entirely read-only browsing surfaces. `ProfileView.tsx`'s "Create List"
  button is a documented no-op (`console.log`, per a prior task).
- Cover art: mobile already computes a collage client-side from `previewPosters`/`coverItems` in
  a couple of places (`ListPreviewCard`-equivalent styling in `ProfileView.tsx`, and the
  `(tabs)/lists.tsx` `ListCard`) — this part is already correctly aligned with the website's
  "computed, not stored" model, just simpler (no empty/1/2/3-4-cell variants, always the
  same fixed 2×2 layout regardless of item count).
- No engagement state (liked/saved), no Ranked/Unranked-aware rendering (rank numbers are never
  shown on mobile at all currently), no "Ranked List"/"Collection"/"Unlisted"/"Private" badges.

---

## OPEN_QUESTIONS_FOR_NEXT_PHASE (Lists)

1. Should mobile build a genuine **create/edit/delete/reorder** flow at all in the next phase,
   or is read-only browsing an acceptable v1 scope? (The website's flow is substantial: 3-way
   drag/touch/menu reorder, live like/save, visibility-aware rendering.)
2. Given `list_saves` is real but there's no "My Saved Lists" page anywhere yet (web or mobile),
   should the mobile rebuild be the first to build that view, or wait for the website to build
   it first for parity?
3. The "Collection" vs. "Ranked List"/"Unranked List" terminology recommendation above is a
   judgment call, not a verified requirement — confirm before locking it in, since it deviates
   slightly from the website's own (admittedly ambiguous) wording for unranked lists.
4. Mobile's `ProfileView.tsx` and `app/(tabs)/lists.tsx` currently duplicate very similar list-
   card rendering logic independently — worth consolidating into one shared component during
   the rebuild, though that's a code-quality note, not a website-parity one.
