# ReelShelf Mobile — Design System

> Phase 6 reference. All token values live in `constants/theme.ts` and `constants/motion.ts`.
> Update this file whenever tokens change — do not let it drift from the code.

---

## Principles

**Editorial, not algorithmic.** Every section feels curated by a thoughtful editor. Headings are declarative ("Trending Today — what's resonating right now") rather than imperative ("You should watch…"). Eyebrow labels ("IN PROGRESS", "BECAUSE YOU LOVED", "FEATURED TODAY") provide editorial hierarchy without cluttering the primary heading.

**Breathing room as a design element.** Major sections are separated by `RS.spacing.xxxl` (72 px) — a "reading chapters" cadence that makes scrolling feel like turning pages. This was increased from `xxl` (56 px) in Phase 6 for a more editorial rhythm.

**Quiet confidence.** Motion is present but never draws attention to itself. Poster lift is 4% compression. Hero collapse is a gentle parallax — the backdrop slides at 30% of scroll speed. Nothing is aggressive.

**One filled button per screen.** The Home screen has exactly one solid-filled primary button visible at any scroll position: "Log" on the FeaturedToday section. Every other action (Save, More Info, Resume →, chips) is outlined or text-only. This enforces clear visual hierarchy and prevents button competition.

**Glass, not plastic.** Non-poster card surfaces use `expo-blur` (`BlurView`) for dark glass treatment. Solid fills are Android fallbacks, not the design intent.

**UI thread first.** All scroll-linked effects (header fade, hero collapse parallax) and press animations (PosterCard, CollectionCard) run on the UI thread via Reanimated shared values.

---

## 1 — Color Palette

All tokens in `RS.colors` (`constants/theme.ts`).

| Token           | Hex / RGBA                 | Usage                                                        |
|-----------------|----------------------------|--------------------------------------------------------------|
| `base`          | `#07070b`                  | Screen backgrounds                                           |
| `card`          | `#0d0d14`                  | Card surfaces, tab bar solid fallback                        |
| `elevated`      | `#131320`                  | Elevated surfaces, skeleton fills                            |
| `accent`        | `#1d9e75`                  | Filled button bg, progress bar, tab dot, eyebrow accent text |
| `border`        | `rgba(255,255,255,0.08)`   | Default card borders                                         |
| `borderStrong`  | `rgba(255,255,255,0.18)`   | Active borders                                               |
| `textPrimary`   | `rgba(255,255,255,0.92)`   | All primary headings and body text                           |
| `textSecondary` | `rgba(255,255,255,0.55)`   | Subtitles, reason copy, button labels (secondary)            |
| `textMuted`     | `rgba(255,255,255,0.32)`   | Eyebrow labels, timestamps                                   |
| `gold`          | `#fbbf24`                  | Ranked badges                                                |

### Gradient Surfaces

- **Hero backdrop overlay (top):** `['rgba(7,7,11,0.55)', 'transparent']`, top 25% — darkens status bar area
- **Hero backdrop overlay (bottom):** `['transparent', 'rgba(7,7,11,0.80)', 'rgba(7,7,11,0.97)']`, 30%→100% — deep editorial text area
- **FeaturedToday card:** `['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.94)']`, 30%→100%
- **Poster overlay:** `['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']`, 25%→100% — darker and heavier than Phase 5
- **Collection card:** `['transparent', 'rgba(0,0,0,0.85)']`, 35%→100%
- **Poster fallback bg:** `['#1a1a2a', '#0c0c14']`, diagonal
- **Trending reflection:** `['rgba(255,255,255,0.055)', 'transparent']`, 16 px — floor sheen

---

## 2 — Typography

Font families in `Fonts` (`constants/theme.ts`, via `Platform.select`):

| Family  | iOS         | Android     | Web               |
|---------|-------------|-------------|-------------------|
| `sans`  | `system-ui` | `normal`    | SF Pro stack      |
| `serif` | `ui-serif`  | `serif`     | Georgia fallback  |

**Mobile-web distinction:** Web uses Helvetica Now Display (sans only). Mobile introduces `ui-serif` (New York on iOS) for `display` headings only — intentional mobile-original editorial premium.

All tokens in `RS.typography`:

| Token        | Size | Weight   | Family | Line-height | Usage                                   |
|--------------|------|----------|--------|-------------|-----------------------------------------|
| `display`    | 36   | 800      | serif  | 44          | Hero heading                            |
| `heading`    | 20   | 700      | sans   | auto        | FeaturedToday card title, section headers |
| `subheading` | 15   | 400      | sans   | 20–22       | Section subtitles, hero sub-copy        |
| `body`       | 14   | 400–700  | sans   | 20          | Reason copy, button labels              |
| `caption`    | 11   | 500–600  | sans   | 14          | Badge labels, chips, year metadata      |
| `overline`   | 10   | 700      | sans   | —           | Eyebrow labels (TODAY, FEATURED TODAY, IN PROGRESS, BECAUSE YOU LOVED) |

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

**Phase 6 change:** Home screen `contentContainerStyle.gap` increased from `xxl` (56) to `xxxl` (72).

---

## 4 — Hero (Phase 6 rebuild)

**File:** `components/Hero.tsx`

### Structure

Full-bleed cinematic backdrop occupying ~40% of screen height (`Dimensions.get('window').height * 0.40`). No buttons — editorial copy only.

```
View (height: HERO_H, overflow: 'hidden')
  Animated.View (backdrop, height: HERO_H × 1.35, parallax translateY)
    Image (absoluteFill, contentFit: 'cover')
  LinearGradient (top darkening — status bar area)
  LinearGradient (bottom heavy — text legibility)
  Animated.View (content, fades + drifts up on scroll)
    "TODAY" eyebrow
    "Monday Morning" / "Tuesday Evening" etc.  ← device Date
    Serif display heading
    Subtitle
```

### Time-of-Day Logic

```ts
const h = new Date().getHours();
timeOfDay = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
dayName   = new Date().toLocaleDateString('en-US', { weekday: 'long' });
```

No network call, no stored state. Pure `Date` presentation logic.

### Hero Collapse (scroll-linked, UI thread)

| Effect          | Animated value  | Range                                      |
|-----------------|-----------------|---------------------------------------------|
| Backdrop parallax | `translateY`  | `0 → -(HERO_H × 0.30)` over scroll `0 → HERO_H` |
| Text fade        | `opacity`      | `1 → 0` over scroll `0 → HERO_H × 0.45`   |
| Text drift       | `translateY`   | `0 → -20 px` over same range               |

All via `interpolate` with `Extrapolation.CLAMP` — no animation beyond the clamped range.

### Full-Bleed Layout

`index.tsx` does **not** use `SafeAreaView edges={['top']}`. The Hero handles its own top offset using `useSafeAreaInsets().top + 52` (header clearance). The `FadingHeader` floats as an absolute overlay (`zIndex: 10`) above the ScrollView.

---

## 5 — Featured Today (Phase 6 new)

**File:** `components/FeaturedToday.tsx`

Replaces the old 3-card `FeaturedCarousel`. ONE confident film/TV/book recommendation per day.

### Layout

```
"FEATURED TODAY" eyebrow
Large artwork card (SCREEN_W - 32px wide × 300px tall)
  Image (absoluteFill)
  LinearGradient (bottom-heavy for in-card title)
  Media-type badge (top left)
  In-card serif title + year (bottom)
Editorial reason sentence
Action row: Log | Save | More Info
```

### Action Button Hierarchy

| Button    | Style               | Weight rule                           |
|-----------|---------------------|---------------------------------------|
| Log       | Solid filled green  | **THE ONE** high-weight button on screen |
| Save      | Outlined accent     | Secondary — outlined, no fill         |
| More Info | Text-only           | Tertiary — no border, barely visible  |

The "Log" button uses `RS.button.filledBg` (`#1d9e75`) and `RS.button.filledText` (`#ffffff`). This is the only button using these tokens on the Home screen.

### `reason` Field

`SeedFeaturedItem` extends `SeedCardItem` with `reason: string`. One editorial sentence explaining why this is today's pick. The field is static for Phase 6. If/when backend personalization lands, it can be sourced from a Supabase row or AI-generated copy — the component is ready.

---

## 6 — One Filled Button Per Screen

**Rule:** At any given scroll position, exactly one solid-filled/primary button is visible on the Home screen.

**Rationale:** Multiple high-weight buttons compete for attention. A single filled button creates an unambiguous primary action — the screen "knows what it wants" editorially.

**Implementation:**
- `RS.button.filledBg: '#1d9e75'` — solid accent, used only for the Log button on FeaturedToday
- `RS.button.filledText: '#ffffff'` — white label on accent
- All other buttons: outlined (`primaryBorder + primaryFill` tint) or text-only
- Filter chips: outlined pills — do not violate the rule (they're interactive labels, not CTAs)

**Decision record:** "Log" was chosen over "Surprise Me" as the filled button because:
1. Log is a primary user action (recording a watch) — higher intent signal
2. "Surprise Me" was removed from the Hero redesign (Hero has no buttons in Phase 6)
3. The FeaturedToday section's editorial recommendation naturally leads to a Log action

---

## 7 — Poster Card

**File:** `components/poster-card.tsx`

### Phase 6 Changes

- **Corner radius:** `RS.card.radius` increased from 10 → 14 for premium rounded feel. Applies to all cards.
- **Gradient overlay:** Heavier, multi-stop: `['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']` starting at y=0.25 (was single-stop 0.82 from y=0.40). Title area is now distinctly dark.
- **Shadow:** Bumped from `offsetY:6/opacity:0.42/radius:12/elevation:10` to `offsetY:8/opacity:0.52/radius:16/elevation:14`.

### Two-Layer Shadow Pattern

Shadow must live on the **outer** `Animated.View` (no `overflow: hidden`). Clipping lives on the **inner** `View`. `overflow: 'hidden'` on iOS eliminates shadow — hence the two-layer separation.

---

## 8 — Trending Carousel Upgrades

**File:** `components/TrendingCarousel.tsx`

| Property        | Phase 5   | Phase 6   |
|-----------------|-----------|-----------|
| Poster width    | 100 px    | **120 px** |
| Poster height   | 150 px    | **178 px** |
| Item separator  | 8 px      | **12 px** |
| Snap interval   | 108 px    | **132 px** |
| Floor reflection| none      | **16 px LinearGradient** |

### Floor Reflection

A `LinearGradient` rendered immediately below each poster (inside the item wrapper `View`):

```
colors: ['rgba(255,255,255,0.055)', 'transparent']
height: 16 px, width: POSTER_W
borderBottomRadius: RS.card.radius
```

Tasteful and subtle — suggests depth, not a literal mirror. `paddingBottom: 18` added to the FlatList content style to prevent clipping.

---

## 9 — Navigation (Tab Bar)

Unchanged from Phase 5. `BlurView` glass background, custom dot indicator, icon size 22, label fontSize 9.

---

## 10 — Motion Tokens

All tokens in `constants/motion.ts`:

### Durations

| Token    | ms  | Usage                                  |
|----------|-----|----------------------------------------|
| `fast`   | 150 | Chip press feedback                    |
| `medium` | 220 | Image cross-fade (expo-image)          |
| `slow`   | 380 | Section entrance, RevealOnMount        |

### Hero Collapse (`Motion.hero`)

| Token            | Value  | Meaning                                          |
|------------------|--------|--------------------------------------------------|
| `parallaxFactor` | 0.30   | Backdrop moves at 30% of scroll speed            |
| `contentFadeAt`  | 0.45   | Text fully faded by scroll = HERO_H × 0.45       |
| `contentDriftY`  | −20 px | Text drifts upward as it fades                   |

### Header Fade (`Motion.header`)

| Token              | Value  | Usage                                     |
|--------------------|--------|-------------------------------------------|
| `fadeScrollStart`  | 0 px   | Full opacity at rest                      |
| `fadeScrollEnd`    | 70 px  | Minimum opacity reached                   |
| `minOpacity`       | 0.82   | Header stays glanceable                   |
| `translateYOffset` | −4 px  | Subtle upward drift                       |

### Press Lift

```
scaleActive: 0.96
spring in:  { damping: 18, stiffness: 240, mass: 0.8 }
spring out: { damping: 14, stiffness: 180, mass: 0.8 }
```

Applied to: `PosterCard`, `CollectionCard`.

### Section Entrance (RevealOnMount)

```
opacity:   0 → 1  (withTiming 380ms, Easing.out(Easing.ease))
translateY: 14 → 0
```

Home screen stagger delays (ms): 0 · 60 · 120 · 180 · 240 · 300

---

## 11 — Section Header Copy

All sections follow the `SectionHeader` anatomy (eyebrow? / title / subtitle?):

| Section               | Eyebrow          | Title                   | Subtitle                                          |
|-----------------------|------------------|-------------------------|---------------------------------------------------|
| Featured Today        | FEATURED TODAY   | _(in-card title)_       | _(reason sentence below card)_                    |
| Trending Today        | —                | Trending Today          | "What's resonating right now."                    |
| Because You Loved     | BECAUSE YOU LOVED | Babylon                | "Stories about obsession, ambition and sacrifice." |
| Collection of the Week| —                | Collection of the Week  | "Hand-picked by ReelShelf."                       |
| Continue Your Story   | IN PROGRESS      | Continue Your Story     | "Pick up where you left off."                     |

---

## 12 — Home Screen Composition

```
View (root, no SafeAreaView top — full-bleed hero)
  View (headerOverlay, position:absolute, top:0, zIndex:10)
    FadingHeader(scrollY)           ← fades on scroll independently
  
  Animated.ScrollView (gap: RS.spacing.xxxl = 72)
    Hero(scrollY)                   ← full-bleed, ~40% screen height, no buttons
    RevealOnMount → FeaturedToday   ← ONE dominant rec, ONE filled Log button
    RevealOnMount → FilterChips
    RevealOnMount → TrendingSection (SectionHeader + TrendingCarousel)
    RevealOnMount → BecauseYouLovedSection
    RevealOnMount → CollectionsSection
    RevealOnMount → ContinueYourStorySection
```

**No `edges={['top']}` on SafeAreaView** — Hero handles safe area internally via `useSafeAreaInsets().top + 52`.

---

## 13 — Adding New Sections (Future Phases)

1. Add seed data to `data/seedHomeContent.ts` (no API calls at runtime)
2. Create section component in `components/`
3. Add `SectionHeader` with optional eyebrow + editorial subtitle
4. Wrap list in `FlatList` with `snapToInterval` + `decelerationRate="fast"`
5. Wrap in `RevealOnMount` with incremental delay in `index.tsx`
6. Audit button hierarchy — no new filled buttons without demoting another

---

## Open Questions for Next Phase

- **"Collection of the Week" vs. "Collections":** Heading renamed to "Collection of the Week" in Phase 6. Underlying variable name (`collections`) and component (`CollectionsSection`) kept as-is to avoid a refactor that touches data shape. If the variable/component are renamed in a future phase, update all import sites.
- **Log/Save actions:** Currently no-op. When wired to real user state (Supabase `user_media_logs` table), "Log" should open a modal asking for rating/review, "Save" should add to a watchlist. The button hierarchy will remain the same — no visual change needed.
- **Featured item personalization:** `featuredItem` is currently static. When personalization lands (user profile + Supabase query), `featuredItem` becomes a runtime value. `FeaturedToday` is already ready — it just needs the prop source to change.
