# ReelShelf Mobile — Design System

> Sprint 3 reference. All token values live in `constants/theme.ts` and `constants/motion.ts`.
> Update this file whenever tokens change — do not let it drift from the code.

---

## Principles

**Editorial, not algorithmic.** Every section feels curated by a thoughtful editor. Headings are declarative ("Trending Today — what's resonating right now") rather than imperative ("You should watch…"). Eyebrow labels ("BECAUSE YOU LOVED", "DAILY REEL") provide editorial hierarchy without cluttering the primary heading.

**Breathing room as a design element.** Major sections are separated by `RS.spacing.xxxl` (72 px) — a "reading chapters" cadence that makes scrolling feel like turning pages.

**Quiet confidence.** Motion is present but never draws attention to itself. Poster lift is 4% compression. Header fade is subtle (opacity 1 → 0.82). Nothing is aggressive.

**One filled button per screen.** The Home screen has exactly one solid-filled primary button: "View Today's Pick" on the Daily Reel section. Every other action is outlined or text-only. This enforces clear visual hierarchy and prevents button competition.

**Serif for editorial moments only.** `ui-serif` (New York on iOS) is reserved for four moments:
1. Daily Reel in-card title
2. Editorial headline "What story are you looking for today?"
3. Book of the Week in-card title
4. "Because You Loved" section anchor titles (via `titleSerif` prop on `SectionHeader`)

Everything else — body copy, metadata, buttons, nav labels, poster titles — uses system sans-serif.

**Glass, not plastic.** Non-poster card surfaces use `expo-blur` (`BlurView`) for dark glass treatment. Solid fills are Android fallbacks, not the design intent.

**UI thread first.** All scroll-linked effects (header fade) and press animations (PosterCard) run on the UI thread via Reanimated shared values.

---

## 1 — Color Palette

All tokens in `RS.colors` (`constants/theme.ts`).

| Token           | Hex / RGBA                 | Usage                                                        |
|-----------------|----------------------------|--------------------------------------------------------------|
| `base`          | `#07070b`                  | Screen backgrounds                                           |
| `card`          | `#0d0d14`                  | Card surfaces, tab bar solid fallback                        |
| `elevated`      | `#131320`                  | Elevated surfaces, skeleton fills, FloatingSearchBar bg      |
| `accent`        | `#1d9e75`                  | Filled button bg, progress bar, tab dot, eyebrow accent text |
| `border`        | `rgba(255,255,255,0.08)`   | Default card borders                                         |
| `borderStrong`  | `rgba(255,255,255,0.18)`   | Active borders                                               |
| `textPrimary`   | `rgba(255,255,255,0.92)`   | All primary headings and body text                           |
| `textSecondary` | `rgba(255,255,255,0.55)`   | Subtitles, description copy, button labels (secondary)       |
| `textMuted`     | `rgba(255,255,255,0.32)`   | Eyebrow labels, reason taglines, search placeholder          |
| `gold`          | `#fbbf24`                  | Ranked badges                                                |

### Gradient Surfaces

- **Daily Reel / Book of Week card:** `['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.94)']`, 30%→100%
- **Poster overlay:** `['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']`, 25%→100%
- **Collection card:** `['transparent', 'rgba(0,0,0,0.85)']`, 35%→100%
- **Poster / book cover fallback bg:** `['#1a1a2a', '#0c0c14']`, diagonal
- **Trending reflection:** `['rgba(255,255,255,0.055)', 'transparent']`, 16 px floor sheen

---

## 2 — Typography

Font families in `Fonts` (`constants/theme.ts`, via `Platform.select`):

| Family  | iOS         | Android     | Web               |
|---------|-------------|-------------|-------------------|
| `sans`  | `system-ui` | `normal`    | SF Pro stack      |
| `serif` | `ui-serif`  | `serif`     | Georgia fallback  |

**Sprint 3 rule:** Serif is reserved exclusively for four editorial-weight moments (see Principles). All poster titles, metadata, body copy, and labels use sans-serif. This is a reduction from Sprint 2 which applied serif more broadly.

All tokens in `RS.typography`:

| Token        | Size | Weight   | Family        | Usage                                              |
|--------------|------|----------|---------------|----------------------------------------------------|
| `display`    | 36   | 800      | **serif**     | Editorial headline ("What story are you…")         |
| `heading`    | 20   | 700      | sans          | Card titles (Daily Reel, Book of Week — overridden to serif in-card), section headers |
| `subheading` | 15   | 400–500  | sans          | Welcome greeting, section subtitles, search hint   |
| `body`       | 14   | 400–700  | sans          | Description copy, button labels                    |
| `caption`    | 11   | 500–600  | sans          | Badge labels, year metadata, reason tagline        |
| `overline`   | 10   | 700      | sans          | Eyebrow labels (DAILY REEL, BECAUSE YOU LOVED)     |

Letter-spacing tokens in `RS.letterSpacing`:

| Token    | Value  | Usage                               |
|----------|--------|-------------------------------------|
| `tight`  | −0.4   | `display`, section headings         |
| `normal` | 0      | Body text                           |
| `wide`   | 0.8    | `caption`, button labels            |
| `widest` | 1.4    | `overline` eyebrow uppercase        |

---

## 3 — Spacing

All tokens in `RS.spacing`:

| Token  | Value | Usage                                                           |
|--------|-------|-----------------------------------------------------------------|
| `xs`   | 4     | Badge padding, tight internal gaps                              |
| `sm`   | 8     | Between carousel items, card internals                          |
| `md`   | 16    | Standard horizontal screen padding                              |
| `lg`   | 24    | Section internal gap                                            |
| `xl`   | 40    | (reserved)                                                      |
| `xxl`  | 56    | ScrollView `paddingBottom`                                      |
| `xxxl` | 72    | **Gap between all major Home screen sections** ("reading chapters") |

---

## 4 — Home Screen Composition (Sprint 3)

**Layout:** Calm, editorial, magazine-like. No full-bleed backdrop imagery. SafeAreaView top edge. FadingHeader is in-flow above the ScrollView (not absolute-positioned).

```
SafeAreaView (edges: ['top'])
  FadingHeader(scrollY)             ← opacity fade on scroll; in-flow, not absolute

  Animated.ScrollView (gap: RS.spacing.xxxl = 72)
    RevealOnMount → WelcomeBlock             ← "Good Morning, Ishaan. / Monday, July 7"
    RevealOnMount → EditorialHeadline        ← serif "What story are you looking for today?"
    RevealOnMount → FloatingSearchBar        ← glass pill, visual-only, no-op
    RevealOnMount → ContinueWatchingSection  ← SectionHeader + ContinueWatchingCard
    RevealOnMount → DailyReel                ← DAILY REEL eyebrow, artwork card, ONE filled btn
    RevealOnMount → TrendingSection          ← SectionHeader + TrendingCarousel
    RevealOnMount → BecauseYouLoved: Babylon ← serif anchor title, 7 poster carousel
    RevealOnMount → BecauseYouLoved: Dune    ← serif anchor title, 5 poster carousel
    RevealOnMount → BecauseYouLoved: The Bear← serif anchor title, 5 poster carousel
    RevealOnMount → BookOfTheWeek            ← serif title, large cover card, description
```

**RevealOnMount stagger delays:** 0 · 60 · 80 · 100 · 140 · 180 · 220 · 260 · 300 · 340 ms

---

## 5 — Daily Reel (Sprint 3 signature section)

**File:** `components/DailyReel.tsx`

Supersedes the Sprint 2 `FeaturedToday` section. Structurally identical (two-layer shadow card) but with a calmer editorial framing.

### Layout

```
"DAILY REEL" eyebrow
Large artwork card (SCREEN_W - 32px wide × 300px tall)
  Image (absoluteFill)
  LinearGradient (bottom-heavy for in-card title legibility)
  Media-type badge (top left)
  In-card serif title + year (bottom)
Editorial description sentence
Reason tagline (italic, muted)
"View Today's Pick" button — THE ONE filled button on the screen
```

### Action Button Hierarchy

| Button             | Style       | Weight rule                           |
|--------------------|-------------|---------------------------------------|
| View Today's Pick  | Solid green | **THE ONE** high-weight button on screen |

No secondary or tertiary buttons — Daily Reel is deliberately single-action.

---

## 6 — One Filled Button Per Screen

**Rule:** At any given scroll position, exactly one solid-filled/primary button is visible on the Home screen.

**Implementation:**
- `RS.button.filledBg: '#1d9e75'` — used only for "View Today's Pick" on DailyReel
- `RS.button.filledText: '#ffffff'` — white label on accent
- All other interactive elements: outlined or text-only

**Sprint 3 change:** The filled button moved from "Log" (FeaturedToday, Sprint 2) to "View Today's Pick" (DailyReel, Sprint 3). The rule is unchanged — one filled button, different label.

---

## 7 — WelcomeBlock

**File:** `components/WelcomeBlock.tsx`

Compact greeting with time-of-day and date. No background imagery, no serif.

```
"Good Morning, Ishaan."   ← subheading (15px), weight 500, textPrimary
"Monday, July 7"          ← caption (11px), weight 400, textMuted
```

**`CURRENT_USER_NAME`:** Hardcoded constant at the top of WelcomeBlock.tsx with a comment pointing to future auth integration. Replace with `user.profile.firstName` when accounts land.

**Time-of-day logic:** `new Date().getHours()` → Morning (< 12) / Afternoon (< 17) / Evening. No network call.

---

## 8 — EditorialHeadline

**File:** `components/EditorialHeadline.tsx`

The visual centrepiece of the top of the Home screen.

```
"What story are you       ← display (36px), serif, weight 800, tight letter-spacing
 looking for today?"
"Curated picks, honest    ← subheading (15px), sans, weight 400, textSecondary
 shelves."
```

---

## 9 — FloatingSearchBar

**File:** `components/FloatingSearchBar.tsx`

Full-width pill search bar using the `RS.colors.elevated` glass surface. Visual-only — `onPress` logs a no-op. No keyboard opens (Pressable, not TextInput).

```
[ 🔍  Search films, shows, books… ]   ← borderRadius: 28, shadow elevation: 6
```

---

## 10 — BookOfTheWeek

**File:** `components/BookOfTheWeek.tsx`

Single full-width book cover card. Serif title, sans-serif author, editorial description below.

```
SectionHeader (titleSerif) — "Book of the Week" / "One essential read."
Large cover card (SCREEN_W - 32px × 240px tall)
  Background: LinearGradient fallback (posterUrl is null until script populated)
  BOOK badge (top left)
  Serif title + author (bottom)
Editorial description (sans-serif body)
```

**To populate cover:** Extend `scripts/generate-seed-data.ts` with a Google Books fetch for the chosen title, or run it once the title is added to the book fetch list.

---

## 11 — BecauseYouLovedSection

**File:** `components/BecauseYouLovedCarousel.tsx`

Accepts `items: SeedCardItem[]` prop — three instances on Home (Babylon, Dune, The Bear) each with their own carousel data. The section title renders in serif via `titleSerif` on `SectionHeader`.

---

## 12 — Poster Card

**File:** `components/poster-card.tsx`

### Sprint 3 Change

- `titleLg` style: removed `fontFamily: Fonts?.serif`. Large-card poster titles are now sans-serif. The `size='lg'` variant is currently unused on Home; the `titleLg` style remains for potential future use but no longer overrides to serif.

### Two-Layer Shadow Pattern

Shadow must live on the **outer** `Animated.View` (no `overflow: hidden`). Clipping lives on the **inner** `View`. `overflow: 'hidden'` on iOS eliminates shadow — hence the two-layer separation.

---

## 13 — Trending Carousel

**File:** `components/TrendingCarousel.tsx`

| Property        | Value     |
|-----------------|-----------|
| Poster width    | 120 px    |
| Poster height   | 178 px    |
| Item separator  | 12 px     |
| Snap interval   | 132 px    |
| Floor reflection| 16 px LinearGradient |

---

## 14 — Navigation (Tab Bar)

Unchanged from Phase 5. `BlurView` glass background, custom dot indicator, icon size 22, label fontSize 9.

---

## 15 — Motion Tokens

All tokens in `constants/motion.ts`:

### Durations

| Token    | ms  | Usage                                  |
|----------|-----|----------------------------------------|
| `fast`   | 150 | Chip press feedback                    |
| `medium` | 220 | Image cross-fade (expo-image)          |
| `slow`   | 380 | Section entrance, RevealOnMount        |

### Header Fade (`Motion.header`)

| Token              | Value  | Usage                                     |
|--------------------|--------|-------------------------------------------|
| `fadeScrollStart`  | 0 px   | Full opacity at rest                      |
| `fadeScrollEnd`    | 70 px  | Minimum opacity reached                   |
| `minOpacity`       | 0.82   | Header stays glanceable                   |
| `translateYOffset` | −4 px  | Subtle upward drift (visual only, no layout shift) |

**Sprint 3 note:** FadingHeader is now in-flow (not absolute-positioned). The −4 px translateY is a visual-only transform — it does not affect layout bounds, so no gap appears between the header and scroll content.

### Press Lift

```
scaleActive: 0.96
spring in:  { damping: 18, stiffness: 240, mass: 0.8 }
spring out: { damping: 14, stiffness: 180, mass: 0.8 }
```

Applied to: `PosterCard`.

### Section Entrance (RevealOnMount)

```
opacity:    0 → 1  (withTiming 380ms, Easing.out(Easing.ease))
translateY: 14 → 0
```

Home screen stagger delays (ms): 0 · 60 · 80 · 100 · 140 · 180 · 220 · 260 · 300 · 340

### Hero Tokens (Retired Sprint 2)

`Motion.hero` tokens remain in `constants/motion.ts` but are unused — `Hero.tsx` was removed in Sprint 3. They can be deleted in a future cleanup pass if no new full-bleed hero is added.

---

## 16 — SectionHeader `titleSerif` Prop

`SectionHeader` accepts an optional `titleSerif?: boolean` prop. When true, the title text renders with `fontFamily: Fonts?.serif`. Used for:
- `BecauseYouLovedSection` — all three instances
- `BookOfTheWeek` — "Book of the Week" heading

---

## 17 — Adding New Sections (Future Phases)

1. Add seed data to `data/seedHomeContent.ts` (or extend `generate-seed-data.ts` for live API)
2. Create section component in `components/`
3. Add `SectionHeader` with optional eyebrow + editorial subtitle
4. Wrap list in `FlatList` with `snapToInterval` + `decelerationRate="fast"`
5. Wrap in `RevealOnMount` with incremental delay in `index.tsx`
6. Audit button hierarchy — no new filled buttons without demoting another

---

## Open Questions for Next Phase

- **`Daily Reel` personalization:** `dailyReelPick` is currently static. When personalization lands (user profile + Supabase), it becomes a runtime value sourced from a recommendations API.
- **Search:** `FloatingSearchBar` is visual-only. When wired up, it should navigate to a search results screen.
- **Book of Week cover:** `bookOfTheWeek.posterUrl` is null. Extend `generate-seed-data.ts` with a Google Books fetch for the chosen title to populate a real cover image.
- **BYL personalization:** `bylBabylon / bylDune / bylTheBear` are static. Phase 4 will source these from user watch history + a recommendation engine.
