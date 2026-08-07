# Website Search Remaining Questions Audit

Read-only audit. No code was modified on either platform. Search's already-
built core (mobile's own Movies/TV/Books/People/Collections/Lists/Users
categories, debounce, stale-request cancellation, skeleton loading, Best
Match, compact filter chips, recent/trending searches) was taken as
already-settled ground truth about **mobile's own confirmed-working
implementation** and not re-tested; everything below is newly resolved
evidence about the **real website's** actual search behavior specifically,
which — a real, load-bearing finding of this audit — turns out to be
considerably narrower than mobile's.

Two real, distinct search surfaces exist on the website, both read in
full: `app/api/search/route.ts` + `app/search/page.tsx` /
`SearchPageClient.tsx` (the `/search` page, simpler — TMDB movies/TV plus a
separate real-profiles "People" list, no books shown there at all) and
`src/hooks/useSearch.ts` + `src/hooks/useSearchHistory.ts` (the header's
`GlobalSearch` dropdown widget — the more complete of the two: films,
series, books, short films, and users). The complete real category set
across **both** surfaces, combined, is exactly: **film, series (TV), book,
short_film, user**. Every finding below was checked against both.

## 1. "Reviews" as a searchable category

**Finding: confirmed absent.** Neither search surface has a "review"
media_type, result branch, or UI section anywhere — confirmed via full
reads of `app/api/search/route.ts`, `SearchPageClient.tsx`, and
`useSearch.ts`. Combined with the already-confirmed absence of any
standalone Review Detail page: there is nothing to navigate a "review
result" to even if the category existed. Reviews are inline-only content
(Movie/TV/Book Detail's Reviews section, Profile's own tabs) — never a
first-class search result.

## 2. Completion-percentage on a Collection search result

**Finding: confirmed absent — the question is moot.** Collections are not
a searchable category on the real website at all (see the combined
category list above), so there is no card, no context, no code path where
a completion percentage (or anything else) could appear for a collection
in search results.

## 3. Recent-search cross-device sync / "pin favourite search"

**Finding: confirmed device-local-only, no database table, no pin
concept.** `src/hooks/useSearchHistory.ts` is the complete real
implementation: `window.localStorage`, key `"reelshelf_search_history"`,
capped at 5 recent queries + 5 recent results, plain
prepend-and-dedup-and-slice logic. No Supabase table, no server call, no
cross-device sync mechanism, and no "pin"/"favourite" field or action
anywhere in the hook or its consumer.

## 4. "Trending Users"

**Finding: confirmed absent.** The only "trending" concept on either real
search surface is `SearchPageClient.tsx`'s `fetchTrending()` — TMDB's own
`/trending/movie/week` endpoint, movies only, explicitly filtered to
exclude `media_type === "person"`. No user-ranking, no "trending
users"/"popular profiles" concept exists anywhere in real search code.

## 5. Fuzzy-matching (pg_trgm) real scope

**Finding: pg_trgm is applied to exactly two columns, and even there it
accelerates plain substring matching rather than providing genuine
typo-tolerant fuzzy search.** Direct database inspection
(`pg_indexes` for any `gin_trgm_ops`/`gist_trgm_ops` index) found exactly
two real trigram indexes in the entire schema: `short_films.title` and
`short_films.channel`. Nothing on `profiles.username`/`display_name`
(users), nothing on any movie/TV/book table (there isn't one — TMDB/Open
Library are external), nothing anywhere else.

Crucially, even on `short_films`, the actual query
(`app/api/search/route.ts`'s `searchShortFilms`) uses plain
`.ilike(\`%${q}%\`)` — a substring match, not `similarity()`/the `%`
trigram operator. A repo-wide search for `similarity(`, `word_similarity`,
or the `%` fuzzy operator in application code returns zero matches
anywhere. So pg_trgm's real role here is purely a **performance**
optimization (GIN-indexed `ILIKE` is fast at scale) — it does not provide
actual typo-tolerance/fuzzy matching anywhere on the real website. TMDB
(films/series) and Open Library (books) rely entirely on those external
APIs' own native search/matching — confirmed no ReelShelf-side fuzzy layer
wraps either. Users search (`profiles.username`/`display_name`) is also
plain `.ilike()`, no trigram index and no fuzzy layer at all.

## 6. Alternate titles / original titles / author or actor aliases

**Finding: confirmed absent from title/name matching.** The only real
"alias" concept touching search is `short_films.search_aliases` — an exact
array-containment match (`.contains("search_aliases", [q])`), scoped to
short films only, and it's an exact match on a curated list, not
fuzzy/alternate-title logic. Every other "alias" hit found in the codebase
is unrelated to search: `reviews.ts`'s `aliases` parameter is about
matching a review row across multiple legacy `media_id` *formats* for the
*same already-identified* title (e.g. `[seriesId, 'tmdb-123']`), not
searching by an alternate display title; `letterboxdImport.ts`'s aliases
are CSV column-name aliases for the import wizard. No original-title,
non-English-title, or actor/author-alias matching exists anywhere in real
search code — TMDB/Open Library's own results are used as-is, whatever
title string those APIs return for a query in their own matching.

## Mobile's current state (comparison)

Mobile's search is a genuine superset of the real website's, by design and
already confirmed working in prior sprints — this is worth stating plainly
rather than treating as a gap: mobile searches Movies, TV, Books, People,
**and also Collections and Lists** (`lib/search.ts`'s `searchCollections`/
`searchLists`), neither of which the real website supports as a category
at all. This is a deliberate, already-built mobile-only enhancement, not
something requiring "parity" correction — the real website simply never
built collection/list search. Mobile has no "Reviews" search category
either, matching the website. Mobile's own recent-searches are also
local-only (AsyncStorage, namespaced per-user — fixed earlier this session
for a cross-user leak), matching the website's local-only approach, though
mobile's storage mechanism differs (AsyncStorage vs. localStorage) as
expected for the platform.

## Overall verdict

Five of six questions resolve to fully absent on the real website: no
Reviews category, no collection completion-percentage in search (moot,
collections aren't searchable at all), no recent-search sync or pinning,
no Trending Users. The sixth (fuzzy matching) is real but far narrower
than a generic "typo-tolerant search" claim would suggest — two columns,
performance-only, no actual fuzzy semantics anywhere. Nothing here
represents missing mobile scope worth building; if anything, this audit
surfaces that mobile's search is already meaningfully ahead of the real
website (Collections/Lists search), which is worth being aware of rather
than treating as an inconsistency to resolve.
