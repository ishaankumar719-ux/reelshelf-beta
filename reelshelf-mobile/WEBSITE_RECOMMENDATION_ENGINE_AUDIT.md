# Website Recommendation Engine Audit

Read-only audit. No files modified — see VERIFICATION at the bottom.

## Ground truth established this audit

**A real recommendation engine exists** — `lib/recommendation-engine.ts` (439 lines):
`buildUserContext()` (reads `diary_entries`, `saved_items`, `daily_picks`, `profiles.favourite_*` —
**never `mount_rushmore`**), `scoreCandidate()` (pure scoring function, additive signals), and
`generateReasons()` (turns fired signals into up to 4 human-readable strings). This is the exact
same engine that powers Daily Reel's pick (`pickBest()`), and it is *also* wired into the real
Home and Discover pages via a `getRecommendations()` wrapper in each page file.

This directly satisfies the brief's own confirmed fact: no dedicated DB table/view/RPC anywhere
(`mcp` schema check, prior audit) — everything here is computed live, in-process, from raw rows.
The "no dedicated infrastructure" fact and "a real engine exists" are not in tension; this file
*is* that live-computed, no-infra system.

## Current Home (`app/page.tsx`) — confirmed live, not dead code

Verified by reading the file directly: `export default async function Home()`, no other file
shadows the `/` route. Renders `<DiscoverClient>` (`components/discover/DiscoverClient.tsx`) with
these props, each mapped to a real section by grepping that component's actual `title=` props:

| Rendered section (verbatim h2 text) | Prop | Data source |
|---|---|---|
| 🔥 Trending Today | `trendingToday` | TMDB `/trending/movie,tv/day` + local 7-day book-log activity counts |
| ❤️ Because You Loved… | `recommendations` | `recommendation-engine.ts` (see above) — real, per-user, one unified row |
| 🎬 New in Cinemas | `newMovies` | TMDB `/movie/upcoming` |
| 📺 Trending TV | `trendingTvWeek` | TMDB `/trending/tv/week` |
| 📚 Trending Books | `trendingBooksDisplay` | local 30-day diary book-log activity counts |
| 💎 Hidden Gems | `hiddenGems` | TMDB `/discover` (vote_average≥7.5), **movie+TV combined**, not type-specific |
| 🏆 Award Winners | `awardWinners` | TMDB `/discover` (vote_average≥8.0, high popularity), movie+TV combined |
| 🎭 Browse by Genre | — | static genre link grid |
| 🎲 Pick something random | — | client-side random picker over local catalog |
| 🗂 Collections | `collections` | `COLLECTION_DEFS` (`lib/discoverCollections.ts`) — 14 real defs, TMDB-query or local-filter backed |

`recommendations` comes from `getRecommendations()` in `app/page.tsx`: calls
`buildUserContext()` + `scoreCandidate()` over the full local catalog, takes the top 8 by score,
attaches `generateReasons(candidate)[0]` as each item's shown reason. **Logged out → empty array**
(`user && supabase ? await getRecommendations(...) : []`), so this row silently doesn't render for
guests — real, but auth-gated.

## Current Discover (`app/discover/page.tsx`) — confirmed live

`diff app/page.tsx app/discover/page.tsx` — **near-byte-identical**. Same imports, same
`recommendation-engine` call, same `COLLECTION_DEFS`, same section set, same `DiscoverClient`.
The only real differences: page `<title>`/meta description, and Discover adds an
`isAdultContent()` filter to its Hidden Gems TMDB results that Home's copy doesn't have. **Home
and Discover are not two distinct experiences — they are the same page rendered twice**, one
minor content-safety filter apart.

## Confirmed dead code (same pattern as the earlier "Friends Activity" finding)

`components/home/HomeDashboardClient.tsx` (and everything it imports: `CircleDiscovery.tsx`,
`SocialRecommendations.tsx`, `components/home/BecauseYouLiked.tsx`) is **imported by zero files
under `app/`** — grepped directly, confirmed. It renders nothing on any live route. This is a
second, separate instance of the exact dead-component pattern flagged in an earlier audit.

`lib/recommendations.ts` (a *different* file from `recommendation-engine.ts` — easy to conflate)
backs both the dead components above **and** two real, live functions used by
`app/u/[username]/page.tsx` (a real route): `computeTasteMatchScore` and `getProfileSimilarUsers`.
`getProfileSimilarUsers` is the **one and only place `mount_rushmore` is read anywhere near
recommendation-adjacent code** — and it's for *user-to-user* similarity matching on public
profiles ("people with similar taste"), not for recommending media to you.

## Per-row classification (all 11 examples)

| # | Brief's example | Classification | Evidence |
|---|---|---|---|
| 1 | "Because you loved Babylon" | **Real-distinct** | Exact text pattern, live: `recommendation-engine.ts` genre-high-rated signal → `reason: \`Because you loved ${title}\`` (word "loved" verbatim). A *second*, independent real implementation also exists: `components/BecauseYouLikedRow.tsx` (live on `app/series/[id]` and `app/books/[id]`, not Home/Discover) renders `Because you liked ${seedTitle}` — one word off, own per-detail-page row, and notably reads diary data from **localStorage** (`lib/diary.ts`), not the Supabase `diary_entries` table the rest of the site uses. |
| 2 | "Because you rated Interstellar 10" | **Not real (invented framing)** | The real signal never states a numeric rating in its reason text — it's "Because you loved {title}" (implies ≥8, doesn't say the number). No code path produces "...rated X 10". |
| 3 | "Continue Christopher Nolan" | **Rebranded/not real as named** | The real, adjacent signal is `creator-match`: `reason: \`By ${creator}, who made ${title}\`` — genuine creator affinity, but framed as attribution, not a "Continue [Director]" episodic/series-continuation row. No such row exists. |
| 4 | "More like Dune" | **Real-distinct, but generic, not personalized** | `app/films/[id]/FilmDetailClient.tsx` "More Like This" section, backed by TMDB's `/movie/{id}/recommendations` passthrough (`app/films/[id]/page.tsx:157`). Confirmed real and live. Titled generically ("More Like This"), not per-title ("More like Dune"); uses TMDB's own similarity, zero ReelShelf taste data. |
| 5 | "Underrated Crime Films" | **Not real as named** | Closest real things: Collections "True Crime Essentials" and "Crime Drama Essentials" (`lib/discoverCollections.ts`) — real, TMDB-query-backed, but no "underrated" scoring/framing (they're popularity/vote_average sorted, not an obscurity signal). |
| 6 | "Popular among your friends" | **Not real — dead code only** | `SocialRecommendations.tsx`/`CircleDiscovery.tsx` (titles found inside: "Hidden gems from your circle", "Most rewatched by friends", "Critically loved by friends") implement something very close to this concept — but confirmed unreachable from any live route. The real, live "friends" feature is the Following Feed (`components/activity/ActivityFeed.tsx` + `lib/supabase/followingFeed.ts`), which is a chronological **activity** feed (so-and-so rated X), not an aggregated content-recommendation row. |
| 7 | "Based on your Mount Rushmore" | **Not real** | `mount_rushmore` is never read by `recommendation-engine.ts` or `getRecommendations()`. Its one real, live use anywhere near "recommendations" is `getProfileSimilarUsers` (user-similarity, not media recommendations — see above). |
| 8 | "Critically Acclaimed Books" | **Not real as a dedicated row** | `critically-acclaimed` (voteAverage ≥ 8.0) is real, but it's one signal among several feeding the single unified "Because You Loved…" row, applied identically across film/TV/book — no book-specific "Critically Acclaimed Books" row exists anywhere. |
| 9 | "Hidden TV Gems" | **Rebranded/partially real** | "💎 Hidden Gems" is real and live on Home/Discover, but is **movie+TV combined** (6 of each, interleaved), not a TV-only row. |
| 10 | "A24 Essentials" | **Real (near-exact)** | Collection `slug: "best-of-a24"`, `name: "Best of A24"` — real, live, TMDB `with_companies=41077` (A24's real TMDB company id), vote_average≥7.0. Name differs slightly ("Best of" vs "Essentials"), concept identical. |
| 11 | "Studio Ghibli Collection" | **Not real** | Zero matches for "ghibli" anywhere in `discoverCollections.ts` or the codebase. All 14 real collection names checked directly — this one doesn't exist in any form. |

## Explanation-text reality (per-item "why this pick")

**Real, live, dynamically generated** in exactly two places:
1. `recommendation-engine.ts`'s `generateReasons()` — feeds Daily Reel's pick *and* Home/Discover's
   "Because You Loved…" row items. Reason strings are template-literal, built from which scoring
   signal actually fired for that specific candidate (not canned/random copy).
2. `BecauseYouLikedRow.tsx`'s single computed title line ("Because you liked X") — real but
   simpler: one seed title, not a per-item multi-signal reason list.

Everywhere else on Home/Discover (Trending, New in Cinemas, Hidden Gems, Award Winners,
Collections), items carry no personalized explanation — they're the same for every user, no
per-item "why" text of any kind.

## Mobile's current state, for comparison

- **Home** (`app/(tabs)/index.tsx`): Continue Watching, Friends Activity (real, built earlier this
  sprint as a documented mobile-only enhancement), Trending Today, then **three static
  `BecauseYouLovedSection` rows hardcoded to "Babylon" / "Dune" / "The Bear"** — same UI pattern
  the brief describes, but backed by `data/seedHomeContent.ts` seed constants (`bylBabylon`,
  `bylDune`, `bylTheBear`), not per-user computation. Same titles/framing regardless of who's
  logged in.
- **Discover** (`app/(tabs)/discover.tsx`): Under the Radar, Award Winners, Browse by Genre,
  a "Mind-Bending" collection spotlight, Trending Today, TV Picks, More to Explore (collections
  list). No personalized row at all currently.
- Mobile has **no equivalent** of the website's real, live, per-user "❤️ Because You Loved…" row
  today — the visual pattern exists (`BecauseYouLovedSection`), the real signal computation behind
  it does not.

## Overall verdict

**Not a unified "recommendation engine" in the sense the brief describes.** What's real:
- One genuine, live, per-user scoring engine (`recommendation-engine.ts`) driving a single
  "Because You Loved…" row on Home/Discover (and Daily Reel's pick) — narrower than the 11
  examples suggest, but real and reused across three surfaces.
- A second, independent, simpler per-title "Because you liked X" row on Series/Book detail pages,
  running on stale localStorage diary data.
- TMDB's own `/recommendations` passthrough on Film Detail ("More Like This") — zero ReelShelf
  taste data.
- 14 real static Collections (genre/vibe-curated, not personalized).
- A dead, unreachable "friends taste" component tree (`CircleDiscovery`/`SocialRecommendations`)
  that would have covered "popular among your friends"-style rows had it been wired up.
- A real but narrowly-scoped user-similarity feature (`getProfileSimilarUsers`, uses
  `mount_rushmore`) on public profiles — not a media recommendation.

Several of the brief's 11 examples (Continue [Director], Underrated [Genre], Based on your Mount
Rushmore, Critically Acclaimed [Type], Studio Ghibli Collection, the exact "rated X 10" framing)
have no real backing anywhere and would need to be built from scratch if wanted.

## VERIFICATION_RESULTS

Read-only — no files modified except this new document.
