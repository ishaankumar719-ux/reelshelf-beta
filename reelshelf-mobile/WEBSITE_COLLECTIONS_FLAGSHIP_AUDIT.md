# Website Collections Flagship Audit — 2026-07-28

Read-only audit. No files modified — see `git diff --stat` in Verification
below. Follow-up to the completed data reconciliation
(`COLLECTIONS_RECONCILIATION.md`), resolving 4 remaining questions about
whether any further Collection-related features are genuinely real on the
live website, using the actual component source code as evidence (not the
earlier logged-out fetch alone).

## 1. Follow/Like/Share/completion-tracking — confirmed absent from the code itself

Source: `app/discover/collection/[slug]/page.tsx` (full file, 199 lines),
read directly.

**Definitively absent — not hidden behind an auth check, not present in any
form.** Evidence:

- The component has no `'use client'` directive and mounts no client
  component — it is a pure Next.js async server component
  (`export default async function CollectionPage(...)`).
- No `createClient()` / `supabase.auth.getUser()` / session lookup of any
  kind appears anywhere in the file. `export const dynamic = "force-dynamic"`
  (line 1) only disables Next.js's response cache — it has nothing to do
  with authentication.
- The only interactive elements in the entire render tree are `<Link>`
  navigation elements (the back link and each `ItemCard`) — there is no
  button, form, or state (`useState`/`useEffect`) of any kind, so there is
  nowhere for a Follow/Like/Share/completion action to even attach to.
- This matches the already-independently-confirmed database fact: zero
  collection-specific tables exist (`collection_likes`, `collection_follows`,
  `collection_saves`, `collection_comments`, `collection_progress`,
  `collection_completion`) — the code and the schema agree with each other.

## 2. Sort control — confirmed absent

Same file. `CollectionPage`'s only route param is `{ params }: { params:
Promise<{ slug: string }> }` — `searchParams` is never destructured or
referenced anywhere in the file (confirmed via direct grep: zero matches for
`sort` or `searchParams` in the file). `items` is built once via
`raw.map(...)` (TMDB path) or `localBooks.filter(...).map(...)` (local
paths) and rendered in that same order with no client-side re-ordering
control. The route directory (`app/discover/collection/[slug]/`) contains
exactly one file — no sibling client component that could inject a sort UI.

Whatever order a given collection shows in is simply whatever TMDB's
`/discover` endpoint returns for that collection's baked-in `sort_by`
query param (e.g. `sort_by=vote_average.desc`, `sort_by=popularity.desc` —
see `lib/discoverCollections.ts`), or `localBooks`' array order for the two
book collections. There is no Release Date / Alphabetical / Highest Rated
control, real or otherwise, anywhere in the real Collection Detail page.

## 3. "Suggested collections" — confirmed absent

Repo-wide grep across `app/`, `components/`, `lib/` for
`suggested.collection`, `recommended.collection`, `collections.for.you`, and
`personalized.collection` (case-insensitive): **zero matches.** No file,
comment, or dead code references this concept anywhere. Consistent with the
already-known absence of any taste/similarity backend (no
recommendation/embedding tables, no per-user affinity scoring anywhere in
the schema) — there is no data this feature could even be computed from.

## 4. Home/Discover Collections section — confirmed a single flat list

Both `app/page.tsx` (Home) and `app/discover/page.tsx` (Discover) build
collections the same way:

```ts
const tmdbCollDefs = COLLECTION_DEFS.filter((c) => !!c.tmdbPath)
const localCollDefs = COLLECTION_DEFS.filter((c) => !!c.localFilter)
...
const tmdbCollections: CollectionCard[] = tmdbCollDefs.map(...)
const localCollections: CollectionCard[] = localCollDefs.map(...)
const allCollections: CollectionCard[] = [...tmdbCollections, ...localCollections]
```

— one merged array, passed as a single `collections` prop into
`DiscoverClient` (and Home's equivalent client component). Reading
`components/discover/DiscoverClient.tsx` directly (lines 1505–1520) confirms
the render side matches: one `disc-section`, one `RowHead` titled `"🗂
Collections"`, one `collections.map((col) => <CollectionCardV2 .../>)`.
There is no filtering or grouping by trending/new/friend/editorial anywhere
in this block or the props passed into it — genuinely one flat, undivided
list, exactly as already observed from the logged-out fetch, now confirmed
at the component-source level.

## 5. Mobile's current Collection Detail screen (for comparison)

`reelshelf-mobile/app/collection/[id].tsx` — already matches the real,
confirmed-minimal feature set with no changes needed:

- Header: back button, title, description, `"Collection · N titles"` count
  — same 4 elements as the real page, no more.
- A single `FlatList` of items (film/tv/book badge + title + year +
  poster thumbnail), sourced from `lib/supabase/collections.ts`'s
  `fetchCollectionBySlug()`, which reads the shared `collections`/
  `collection_items` tables (`verification_status = 'verified'` only).
- No Follow/Like/Share/completion UI, no sort control, no "suggested
  collections" section — nothing to remove; the screen was already correctly
  minimal going into this audit.
- One structural difference from the real page, out of scope to change here
  (not requested, not a parity violation of anything the audit found to be
  real): the real page renders a CSS grid (`repeat(auto-fill, minmax(130px,
  1fr))`); mobile renders a vertical row list. Both are equally valid
  layouts for the same flat, unordered item set — neither has sort/social/
  completion features, so this is a presentation choice, not a feature gap.

## Overall verdict

Everything this brief asked to confirm-or-refute turned out to be **absent**
in the real code, matching (and now double-confirming at the source level)
what the earlier logged-out fetch already showed. There is no second layer
of real functionality hiding behind auth. Concretely:

- **Real and already correctly built on mobile**: the minimal Detail page
  (title/description/count/grid), the flat single-section Collections list,
  and the 11 real collections with correct names and verified data (from the
  prior reconciliation pass).
- **Confirmed not real anywhere in the live website's code**: Follow, Like,
  Share, completion tracking, sort controls, and suggested/personalized
  collections. None of these should be built — there is no real feature
  being missed, and no auth-gated version waiting to be ported.
- **Nothing further to build** in this area. The Collections feature is,
  by design or by omission, exactly as simple as it looks on both platforms
  today. Any future investment here (sort, social actions, personalization)
  would be net-new product work, not parity work — worth flagging explicitly
  since this is the second consecutive audit (after the achievements
  celebration/XP pass) where a brief's assumed feature set turned out to be
  broader than what the real website actually ships.
