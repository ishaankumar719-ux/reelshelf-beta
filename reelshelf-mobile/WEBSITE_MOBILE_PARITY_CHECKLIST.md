# Website ↔ Mobile Profile Parity Checklist

> Built from `WEBSITE_PROFILE_AUDIT.md` after the Mount Rushmore restoration + Profile
> restructuring pass. Status is honest, not aspirational: **Match** = same data/behavior,
> restyled for mobile. **Adapted** = same underlying concept, deliberately different mechanic
> for mobile (documented why). **Gap** = not built this pass, tracked as a known gap.

| # | Website feature | Mobile equivalent | Status | Notes |
|---|---|---|---|---|
| 1 | Header: avatar, name, username, member-since | `ProfileView.tsx` hero | **Match** | Copy fixed from "Joined" → "Member since" to match exactly |
| 2 | Header: bio | `ProfileView.tsx` hero bio | **Match** | |
| 3 | Header: website_url clickable link | `ProfileView.tsx` hero, `EditProfileModal.tsx` | **Match** | Was entirely absent; added display (tappable, opens via `Linking.openURL`) + edit field, reusing the existing `profiles.website_url` column (confirmed present in shared schema, no migration) |
| 4 | Header: colored per-user ambient avatar ring | Plain bordered avatar | **Gap** | Would require porting `getAvatarColor(username)` — small, low-risk, not done this pass (not required by this task's explicit scope) |
| 5 | Header: Edit Profile (full-page nav) | `EditProfileModal` bottom sheet | **Adapted** | Modal-not-page is the correct desktop→mobile adaptation per the brief's own rule |
| 6 | Header: Follow/Following button | Same, `handleToggleFollow` | **Match** | |
| 7 | Header: taste-match % badge (non-owner) | — | **Gap** | Requires a full taste-match scoring algorithm (audit's System 1) — not built, flagged as a real feature, not a styling gap |
| 8 | Stats: Logged/Films/TV/Books/Lists/Watchlist/Reviews/Followers/Following(/Cinema) | `ProfileView.tsx` stats strip | **Adapted** | Repositioned to sit right after the header (matches website order) instead of at the page bottom. Underlying counting logic **intentionally left unchanged** (mobile's rewatch-safe distinct-count and review-text-count vs. website's row-count and rated-count) — this is audit open question #1, a genuine product decision, not silently resolved here |
| 9 | Stats: tap-through to dedicated pages (Films/Series/Watchlist/Reviews/Followers/Following) | Followers/Following tap → `FollowListModal`; others not tappable | **Adapted** | Mobile has no per-metric deep-dive pages; tapping switches to the relevant in-page tab instead where one exists |
| 10 | Cinema stat + CinemaStatsModule | — | **Gap** | `watched_in_cinema` data is already captured by mobile's Review Composer but never surfaced — flagged as a real, ready-to-build gap, not attempted this pass (new aggregation logic, out of this task's restructuring scope) |
| 11 | Badges (rarity/tier/XP/legacy/locked/modal) | `AchievementsRow` (earned-only chips) | **Gap** (partial) | Real badges/user_badges data already shown; tiers, XP total, locked-badge display, and detail modal not built — same simplified v1 noted in the audit |
| 12 | **Mount Rushmore** — 3 independent 4-slot sets (Films/Series/Books), tab strip, per-slot search/select, per-tab independent save | `MountRushmoreEditor.tsx` + `MountRushmoreGrid.tsx` + `MountRushmoreTabs`, `lib/supabase/mountRushmore.ts` | **Match** | Full rebuild this pass. Verified against real DB writes: per-media-type save proven to leave the other two types' rows completely untouched (live test: swapped the TV slot, Movie/Book rows unchanged). Terminology restored ("Mount Rushmore" everywhere; "My Top Stories"/"Top 4" fully removed, grep-confirmed) |
| 13 | Mount Rushmore: poster aspect 2/3, bare-TMDB-path + OpenLibrary-URL resolution | Same `resolveImageUrl` helper (from a prior task), reused in `MountRushmoreGrid`/`MountRushmoreEditor` | **Match** | Verified against real production row shapes (bare `/xxx.jpg` for movie/tv, full OpenLibrary URL for books) |
| 14 | Mount Rushmore: no drag-reorder, slot-targeted select only | Same — tap a slot, search, select fills that slot; no drag | **Match** | Audit found no reorder mechanism on the website either — none invented here |
| 15 | Mount Rushmore book search: OpenLibrary | Google Books (mobile's existing Universal Search integration) | **Adapted** | Audit open question #5 — reused mobile's already-built search infra rather than adding a second book-search dependency; stored `poster_path` format is compatible either way since both are full URLs once resolved |
| 16 | "Recently watched" horizontal poster row (distinct from Recent Activity) | `ProfileView.tsx` "Recently Watched" section | **Match** | New this pass — reuses the already-fetched `diary` data (no new query), filtered to entries with a poster, same as the website's `poster IS NOT NULL` filter |
| 17 | "Recently watched" 5-star rating display | Numeric decimal badge (e.g. `8.7`) | **Adapted (deliberate)** | Audit flagged the website as self-inconsistent (stars here, numeric decimals in Cinema/You-May-Like on the same page) — mobile standardizes on its existing numeric convention rather than picking a side of the website's own inconsistency; flagged as audit open question #2 |
| 18 | Recent Activity: derived feed, event types, copy templates, color-coded dot timeline, 60s batching | `ActivityCard` list (existing) | **Adapted (partial)** | Same derived-from-tables approach (no dedicated activity table on either side). Card-per-event instead of a connected dot-timeline (reasonable mobile simplification). Batching and per-type color-coding **not** ported — real gap vs. the website's exact behavior, not attempted this pass |
| 19 | "Highest rated" (perfect-10s only, pure poster wall) | — | **Gap** | Not built — small, low-risk addition for a future pass |
| 20 | Reviews section (rating, text, layer ratings, attachment, spoiler blur) | Reviews section (existing, unchanged this pass) | **Match** (partial) | Rating/text/layers/attachment/spoiler-blur all already present; likes, comments, and `review_cover_url`/`review_cover_source` are **not** — real social-layer gap (audit open question #4), out of scope for a restructuring pass |
| 21 | Taste block (favourite film/series/book text + cinema-visits chip) | "Favourite Genres" chip row | **Different concept, not a gap** | `favourite_genres` is confirmed mobile-only (never referenced anywhere in the web app) — kept as-is, not removed, per the audit's explicit instruction not to tear out mobile-only concepts |
| 22 | "You may also like" / "Similar shelves" recommendation systems | — | **Gap** | Full recommendation-engine features (audit Systems 1/6) — not attempted, correctly out of scope for this restructuring task |
| 23 | ProfileHighlights: TasteSnapshot / TopRatedThisYear / SocialProof / MostReactedReview | — | **Gap** | Entire 4-widget row absent; `MostReactedReview`/`SocialProof`'s "Reactions" count specifically depends on a `diary_entry_reactions` table not confirmed to be wired into mobile's data layer — see `NEW_SCHEMA_NEEDS` |
| 24 | Lists section: header, "+ New List", cover collage, "Ranked" badge, empty states | `ProfileView.tsx` Lists tab + preview | **Adapted (partial)** | Cover collage already matched from a prior task. "Ranked" badge not shown (column existence not verified against live schema this pass — see audit open question #6). Create-list flow is a documented no-op on mobile, same as before |
| 25 | Diary — no such section exists on the website's profile page | Diary tab + preview | **Mobile-only, not a gap** | Confirmed via the audit: nothing to compare against; left as an intentional mobile convenience |
| 26 | Shelves: `list_type` values (`watchlist`/`reading_shelf`) | Same values, same tables | **Match** | Both apps already agree on this schema convention exactly — confirmed via both codebases' own route/query code |
| 27 | Followers/Following (dedicated pages on web) | `FollowListModal` bottom sheet | **Adapted** | Modal-not-page adaptation, functionally equivalent (follow/unfollow writes match exactly) |
| 28 | Architecture: 1 showcase page + 6 dedicated sub-pages (Films/Series/Reviews/Watchlist/Followers/Following) | 1 screen + 7 in-page tabs | **Adapted (unresolved)** | Audit open question #3 — deliberately not resolved this pass; the in-page-tab model was kept as-is since STEP 6 only required section *order* and *terminology* parity within the existing architecture, not a full page-per-section rebuild |

---

## Duplicate-key fix — app-wide

- **Utility**: `reelshelf-mobile/utils/listKeys.ts` — `getMediaKey(mediaType, id)` and `getActivityKey(activityType, mediaType, mediaId, createdAt, index)`.
- **Adoption**: every `FlatList`/`.map()` producing a React key from *real, variable data* across the app now goes through one of these two functions — grep-confirmed zero remaining ad-hoc inline key template strings for data-bearing lists (Home carousels, Discover, Search, Profile, Movie Detail, Collections, Lists, Diary, Person Detail).
- **Deliberate exceptions** (not converted, and shouldn't be): purely decorative or structurally-fixed-position arrays where the array size/identity never changes at runtime and keying by anything other than position would be *incorrect*, not just stylistically different:
  - `AmbientAtmosphere.tsx` grain dots (22 fixed decorative dots, computed once at module load)
  - `CollectionCard.tsx` / `CollectionPreviewCard.tsx` fanned-deck slot positions (keying by slot index is required for the shuffle/drag animation's identity tracking — keying by item content here would break the animation)
  - `Skeleton.tsx` loading placeholders, `MindBendingCarousel.tsx`'s 2 fixed shadow-decorator layers, `GlassTabStrip.tsx`/`FilterChips.tsx`/`EditProfileModal.tsx`'s fixed constant option lists (tabs, genres, category chips) — all fixed-size, always-unique-by-construction, non-data arrays.

## Verification performed

- Live-database test (disposable account, fully cleaned up afterward): wrote Movie/TV/Book Mount Rushmore rows with overlapping `position` values across types (proving the 3-independent-sets model is real), then simulated a single-tab save (`saveMountRushmoreForType` for `tv` only) and confirmed via direct SQL that Movie and Book rows were completely untouched.
- `npx tsc --noEmit`: zero errors (run twice — after the initial rebuild and again after the final key-fix sweep).
- `npx expo export --platform ios` / `--platform android`: both clean, both times.
- No iOS Simulator/Android emulator is available in this environment — the acceptance criteria requiring a literal running-app navigation pass while watching the console (duplicate-key warnings, visual confirmation of the 2×2 grid rendering, etc.) could **not** be performed. Everything above is code-level and live-database verification, not on-device observation — stated plainly here and in the final RETURN rather than claimed as done.
