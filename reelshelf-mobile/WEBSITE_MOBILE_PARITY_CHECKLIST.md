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
  - `Skeleton.tsx` loading placeholders, `MindBendingCarousel.tsx`'s 2 fixed shadow-decorator layers, `FilterChips.tsx`'s fixed constant option list — fixed-size, always-unique-by-construction, non-data arrays.
  - **Revised 2026-07-20**: `GlassTabStrip.tsx`'s tab list and `EditProfileModal.tsx`'s genre-chip list were previously listed here too, but the current Profile diagnose-and-complete pass's brief required literal 100% `getMediaKey`/`getActivityKey` coverage for every list on this screen, grep-confirmed. Both were converted (`getMediaKey('profile-tab', tab.key)`, `getMediaKey('edit-genre', genre)`) — harmless (still fixed-size, still collision-free either way) but now consistent with the stricter bar rather than carved out as an exception. Not a behavior change, purely which key-construction path is used.

## Verification performed

- Live-database test (disposable account, fully cleaned up afterward): wrote Movie/TV/Book Mount Rushmore rows with overlapping `position` values across types (proving the 3-independent-sets model is real), then simulated a single-tab save (`saveMountRushmoreForType` for `tv` only) and confirmed via direct SQL that Movie and Book rows were completely untouched.
- `npx tsc --noEmit`: zero errors (run twice — after the initial rebuild and again after the final key-fix sweep).
- `npx expo export --platform ios` / `--platform android`: both clean, both times.
- No iOS Simulator/Android emulator is available in this environment — the acceptance criteria requiring a literal running-app navigation pass while watching the console (duplicate-key warnings, visual confirmation of the 2×2 grid rendering, etc.) could **not** be performed. Everything above is code-level and live-database verification, not on-device observation — stated plainly here and in the final RETURN rather than claimed as done.

---

## Addendum (2026-07-20): Diagnose-and-complete pass — no rebuild, only genuine gaps fixed

Re-verified every item above against the actual running database and current code (not assumed
from this document's prior snapshot). Nothing in rows 1–28 above needed correction — this pass's
findings:

### Mount Rushmore tabs — re-confirmed, still correct, no schema change needed

The task brief that opened this pass warned the `mount_rushmore` table might only support "ONE
unified set of 4 mixed-media favourites" and asked for the tabs question to be resolved with
fresh evidence before touching anything. Re-checked from scratch, independent of row 12 above:

- **Live constraint, queried directly**: `mount_rushmore_user_position_type_key: UNIQUE (user_id,
  position, media_type)` — not `UNIQUE(user_id, position)`. The schema already supports up to 12
  rows/user (4 positions × 3 media types). No schema change needed, then or now.
- **Website source, re-read fresh**: `src/components/profile/MountRushmoreEditor.tsx`'s
  `normalizeTabSlots()` matches slots by `position AND media_type` together; `handleSelect`/
  `handleRemove` filter `allSlots` by `media_type !== activeTab` before merging — structurally
  three independent sets, confirmed by reading the actual logic, not inferred from naming.
- **Real production data**: the dedicated test account alone has 12 real `mount_rushmore` rows
  (4 movie + 4 tv + 4 book, `position` 1–4 repeating across each type) — e.g. Babylon/When Harry
  Met Sally/Parasite/Her (movies), INVINCIBLE/Ted Lasso/Avatar/Brooklyn Nine-Nine (tv), Project
  Hail Mary/Strange Pictures/Sunrise on the Reaping/And Then There Were None (books).
- **Mobile's code** (`lib/supabase/mountRushmore.ts`, `MountRushmoreGrid.tsx`,
  `MountRushmoreEditor.tsx`) already implements this exactly — confirmed by its own header
  comment ("CORRECTED MODEL (was wrong before this pass)"), consistent with row 12 above. Nothing
  to fix here; the interpretation was already resolved and already correctly built.

### Drag-and-drop reordering — premise corrected, not a gap

The brief also stated Mount Rushmore drag-and-drop "already has real backend support via the
position column" and asked to confirm/fix it. **The website has no drag-and-drop reordering for
Mount Rushmore at all** — re-confirmed directly in `MountRushmoreEditor.tsx`: position is fixed
by which slot (1–4) you tap to fill; there is no drag handle, no reorder gesture, anywhere in the
website's editor. This appears to conflate Mount Rushmore with the **separate, real** list-item
drag-and-drop feature on `/list/[id]` (User Lists, `user_list_items.rank_order` — a different
screen, already fixed in an earlier sprint per memory). Row 14 above already documented this
correctly ("no reorder mechanism on the website either — none invented here"); re-confirmed, no
mobile-only reorder gesture was added, since that would be a net-new mobile feature beyond parity,
not something this diagnose-and-complete pass should introduce unasked.

### listKeys — 100% coverage confirmed, two minor gaps fixed

Full grep sweep across every Profile-reachable component (`ProfileView.tsx`,
`EditProfileModal.tsx`, `MountRushmoreEditor.tsx`, `MountRushmoreGrid.tsx`, `AchievementsRow.tsx`,
`ActivityCard.tsx`, `CurrentlyEnjoyingShelf.tsx`, `GlassTabStrip.tsx`, `FollowListModal.tsx`,
`ListEditorModal.tsx`) for both `key={...}` and `keyExtractor`. Found two raw-string keys
(`GlassTabStrip.tsx`'s `key={tab.key}`, `EditProfileModal.tsx`'s `key={genre}`) — fixed to use
`getMediaKey`. See the revised "Deliberate exceptions" note above for why these were previously
carved out and why they were converted anyway this pass. Re-grepped after the fix: zero remaining
non-`getMediaKey`/`getActivityKey` keys anywhere in the Profile component tree.

### Live data verified for the dedicated test account (`da816c20-…`, real production data)

Confirmed every required section has substantial real data, not placeholders: 915 `diary_entries`
rows, 9 written reviews, 3 lists, 30 `saved_items`, 5 followers / 8 following, 14 earned badges,
12 `mount_rushmore` rows across all three media types. Profile fields fully populated (bio,
avatar, favourite film/series/book) except `website_url` and `favourite_genres` (both empty for
this account — correctly renders as a hidden section, not an empty/broken one, per
`ProfileView.tsx`'s own `.length > 0` / truthiness gates).

### Fixes applied this pass (the only two)

1. `components/profile/GlassTabStrip.tsx` — `key={tab.key}` → `key={getMediaKey('profile-tab',
   tab.key)}`.
2. `components/EditProfileModal.tsx` — `key={genre}` → `key={getMediaKey('edit-genre', genre)}`.

Everything else audited (header, Edit Profile all-fields save, Stats, Followers/Following,
Achievements, Mount Rushmore incl. reorder, Recent Activity, all 7 tabs, favourite genres, shelf
statistics, empty states) was confirmed already correct from prior sprints — no rebuild performed,
matching this task's explicit "diagnose, don't rebuild" constraint.
