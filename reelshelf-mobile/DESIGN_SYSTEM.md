# ReelShelf Mobile — Design System

> Phase 5 reference. All token values live in `constants/theme.ts` and `constants/motion.ts`.
> Update this file whenever tokens change — do not let it drift from the code.

---

## Principles

**Editorial, not algorithmic.** Every section feels curated by a thoughtful editor. Headings are declarative ("Trending Today — what's resonating right now") rather than imperative ("You should watch…"). Eyebrow labels ("IN PROGRESS", "BECAUSE YOU LOVED") provide editorial hierarchy without cluttering the primary heading.

**Breathing room as a design element.** Major sections are separated by `RS.spacing.xxl` (56 px). This is intentional editorial whitespace, not default padding.

**Quiet confidence.** Motion is present but never draws attention to itself. Poster lift is 4% compression. Header fade reaches 82% opacity — still readable, just retreating gracefully. Buttons whisper instead of shout.

**Glass, not plastic.** Non-poster card surfaces use `expo-blur` (`BlurView`) to create dark glass surfaces that borrow depth from the content behind them. Solid opaque fills are the Android fallback, not the design intent.

**UI thread first.** All scroll-linked effects (`FadingHeader`) and press animations (`PosterCard`, `CollectionCard`) run on the UI thread via Reanimated shared values. Mount-only effects (`RevealOnMount`) may run on the JS thread since frame-drop risk at mount is zero.

---

## 1 — Color Palette

All tokens in `RS.colors` (`constants/theme.ts`).

| Token           | Hex / RGBA                 | Usage                                                        |
|-----------------|----------------------------|--------------------------------------------------------------|
| `base`          | `#07070b`                  | Screen backgrounds, `SafeAreaView` fill                      |
| `card`          | `#0d0d14`                  | Card surfaces, tab bar solid fallback                        |
| `elevated`      | `#131320`                  | Elevated surfaces, skeleton fills, collection card fallback  |
| `accent`        | `#1d9e75`                  | Primary CTA buttons, active chips, progress bar, tab dot     |
| `border`        | `rgba(255,255,255,0.08)`   | Default card borders, chip borders                           |
| `borderStrong`  | `rgba(255,255,255,0.18)`   | Hovered/active borders (mirrors `--rs-border-strong`)        |
| `textPrimary`   | `rgba(255,255,255,0.92)`   | All primary heading and body text                            |
| `textSecondary` | `rgba(255,255,255,0.55)`   | Subtitles, metadata, icon fills                              |
| `textMuted`     | `rgba(255,255,255,0.32)`   | Eyebrow labels, timestamps, placeholder text                 |
| `gold`          | `#fbbf24`                  | Ranked badges (Tailwind amber-400)                           |
| `goldMuted`     | `rgba(251,191,36,0.15)`    | Gold badge backgrounds                                       |
| `accentGlow`    | `rgba(29,158,117,0.10)`    | Subtle green tint overlay (reserved)                         |

### Gradient Surfaces

Poster cards use `expo-linear-gradient` overlays, not solid fills:

- **Poster overlay** (text legibility): `['transparent', 'rgba(0,0,0,0.82)']`, `y: 0.40 → 1`
- **Collection card overlay**: `['transparent', 'rgba(0,0,0,0.85)']`, `y: 0.35 → 1`
- **Poster fallback bg**: `['#1a1a2a', '#0c0c14']`, diagonal `(0,0) → (1,1)`

### Glass Surface Fallback

On Android (or if `BlurView` is unavailable), use `RS.glass.surface` (`rgba(13,13,20,0.88)`) as the card info background. `RS.glass.border` (`rgba(255,255,255,0.10)`) is the card border color for glass panels.

---

## 2 — Typography

Font families in `Fonts` (`constants/theme.ts`, via `Platform.select`):

| Family  | iOS value   | Android/default | Web                             |
|---------|-------------|-----------------|----------------------------------|
| `sans`  | `system-ui` | `normal`        | SF Pro / system-ui stack         |
| `serif` | `ui-serif`  | `serif`         | Georgia (web fallback)           |
| `mono`  | `ui-monospace` | `monospace`  | Menlo / Consolas stack           |

**Web vs. Mobile typographic distinction:** The web app uses Helvetica Now Display (licensed sans-serif) exclusively. Mobile introduces `Fonts.serif` (`ui-serif` = New York on iOS) for the `display` heading only. This is an intentional mobile-original editorial premium treatment — not a mismatch.

All tokens in `RS.typography`.

| Token        | Size | Weight | Family      | Line-height | Usage                                           |
|--------------|------|--------|-------------|-------------|--------------------------------------------------|
| `display`    | 36   | 800    | **serif**   | 44          | Hero heading ("Discover your next story.")       |
| `heading`    | 20   | 700    | sans        | auto        | Section headers (Trending Today, Collections)    |
| `subheading` | 15   | 400    | sans        | 20–22       | Section subtitles, hero sub-copy                 |
| `body`       | 14   | 400–600 | sans       | 20          | Card titles (lg), button labels                  |
| `caption`    | 11   | 600    | sans        | 14          | Badge labels, chips, year metadata, resume link  |
| `overline`   | 10   | 700    | sans        | —           | Eyebrow uppercase labels (IN PROGRESS, etc.)     |

### Letter-spacing Tokens (`RS.letterSpacing`)

| Token    | Value (pt) | Usage                                       |
|----------|-----------|----------------------------------------------|
| `tight`  | −0.4      | `display` heading, section heading           |
| `normal` | 0         | Body text                                    |
| `wide`   | 0.8       | `caption`, button labels, subtitle tracking  |
| `widest` | 1.4       | `overline` eyebrow labels (uppercase)        |

---

## 3 — Spacing

All tokens in `RS.spacing`.

| Token | Value | Usage                                                    |
|-------|-------|----------------------------------------------------------|
| `xs`  | 4     | Badge padding, tight internal gaps, between footer lines |
| `sm`  | 8     | Between carousel chips, card padding, section gap inner  |
| `md`  | 16    | Standard horizontal screen padding                       |
| `lg`  | 24    | Section internal gap (header to carousel)                |
| `xl`  | 40    | Screen bottom `paddingBottom`                            |
| `xxl` | 56    | Gap between major Home screen sections (editorial air)   |

**Section rhythm on Home:** `contentContainerStyle` uses `gap: RS.spacing.xxl`. Every major section (Hero, FilterChips, Trending, BecauseYouLoved, Collections, ContinueYourStory) is separated by 56 px. Internal spacing within a section uses `gap: RS.spacing.xs` or `RS.spacing.sm`.

---

## 4 — Poster Card

**File:** `components/poster-card.tsx`  
**Re-export:** `components/AnimatedPosterCard.tsx` (backward-compat only — no logic)

### Design

- Rounded corners: `RS.card.radius` (10 px, mirrors `--rs-radius-card`)
- Background fill visible during image load: `RS.colors.card`
- Fallback (no `posterUrl`): `LinearGradient` + initial-letter monogram
- Overlay gradient for text legibility over real poster art
- Media-type badge: absolute top-left, pill-shaped

### Animation

Built-in press-lift animation runs on the UI thread via `useSharedValue` + `useAnimatedStyle`:

```
press-in:  withSpring(0.96, { damping: 18, stiffness: 240, mass: 0.8 })
press-out: withSpring(1.0,  { damping: 14, stiffness: 180, mass: 0.8 })
```

### Shadow Pattern (iOS/Android)

Shadow must be on the **outer** `Animated.View` (no `overflow: 'hidden'`). Clipping lives on the **inner** `View` (`overflow: 'hidden'`, `borderRadius`). This two-layer pattern is required — `overflow: 'hidden'` eliminates shadow on iOS.

```
outer: shadowColor '#000', offsetY 6, opacity 0.42, radius 12, elevation 10
```

### Props

| Prop        | Default               | Notes                                          |
|-------------|-----------------------|------------------------------------------------|
| `width`     | `RS.card.posterWidth` | 100 px standard, 220 px featured               |
| `height`    | `RS.card.posterHeight`| 150 px standard, 300 px featured               |
| `size`      | `'sm'`                | `'lg'` renders serif title for featured cards  |
| `posterUrl` | `null`                | Image URL; `null` renders gradient fallback    |

### Card Size Tokens (`RS.card`)

| Token          | Value   | Usage                                          |
|----------------|---------|------------------------------------------------|
| `posterWidth`  | 100 px  | Standard carousel card                         |
| `posterHeight` | 150 px  | Standard carousel card (2:3 ratio)             |
| `featWidth`    | 220 px  | Featured hero carousel card                    |
| `featHeight`   | 300 px  | Featured hero carousel card                    |
| `cwThumbWidth` | 128 px  | Continue-watching thumbnail width              |
| `cwHeight`     | 96 px   | Continue-watching card min-height              |
| `radius`       | 10 px   | All card border-radius                         |

---

## 5 — Buttons

**Philosophy:** Whisper instead of shout. Primary button provides just enough visual signal to identify it as actionable without screaming. Secondary (ghost) barely exists until pressed.

All tokens in `RS.button`.

| Token             | Value                      | Usage                                  |
|-------------------|----------------------------|----------------------------------------|
| `radius`          | 100                        | Pill shape (mirrors web `9999px`)      |
| `primaryFill`     | `rgba(29,158,117,0.10)`    | Subtle accent tint background          |
| `primaryBorder`   | `rgba(29,158,117,0.55)`    | Soft accent border                     |
| `primaryText`     | `#1d9e75`                  | Accent-colored label                   |
| `secondaryBorder` | `rgba(255,255,255,0.14)`   | Near-invisible border                  |
| `secondaryText`   | `rgba(255,255,255,0.55)`   | Muted label                            |
| `paddingV`        | 10 px                      | Vertical padding for full-width pills  |
| `paddingH`        | 20 px                      | Horizontal padding for inline pills    |

### Primary Button

```
borderWidth: 1, borderColor: RS.button.primaryBorder
backgroundColor: RS.button.primaryFill
borderRadius: RS.button.radius (100 — pill)
```

Pressed state: `backgroundColor: 'rgba(29,158,117,0.18)'`

### Secondary (Ghost) Button

```
borderWidth: 1, borderColor: RS.button.secondaryBorder
backgroundColor: 'transparent'
borderRadius: 100
```

Pressed state: `backgroundColor: 'rgba(255,255,255,0.05)'`

### Filter Chips

Same token set as buttons. Use `RS.button.radius` for pill shape, `RS.button.primaryFill` / `RS.button.primaryBorder` / `RS.button.primaryText` for active state.

---

## 6 — Glass Cards (Non-Poster)

### ContinueWatchingCard (`components/continue-watching-card.tsx`)

Horizontal split: **thumbnail left** (no blur) + **info panel right** (BlurView glass).

```
outer card: overflow 'hidden', flexDirection 'row', borderColor RS.glass.border
infoWrap:   overflow 'hidden' (required to clip BlurView)
  BlurView: tint="dark", intensity={RS.blur.cardInfo (25)}, absoluteFill
  content:  rendered above BlurView
```

Android fallback: wrap info content in a `View` with `backgroundColor: RS.glass.surface`.

Progress bar: 2 px height, `RS.colors.accent` fill on `rgba(255,255,255,0.08)` track.

Resume action: text-only `Pressable` ("Resume →"), `RS.colors.accent`, `RS.typography.caption` — no filled button box.

### CollectionCard (`components/CollectionCard.tsx`)

Full-art card with glass footer. Same two-layer shadow pattern as `PosterCard`:

```
outer Animated.View: shadow only, no overflow
inner View:          overflow 'hidden', borderRadius
  Image (absoluteFill)
  LinearGradient overlay
  footer View:       overflow 'hidden' (clips BlurView)
    BlurView:        tint="dark", intensity={RS.blur.cardLight (18)}, absoluteFill
    footerContent:   rendered above blur
```

Built-in press-lift animation (same spring config as PosterCard).

### Blur Intensity Tokens (`RS.blur`)

| Token       | Value | Usage                               |
|-------------|-------|--------------------------------------|
| `tabBar`    | 55    | Bottom tab bar glass background      |
| `cardInfo`  | 25    | ContinueWatchingCard info panel      |
| `cardLight` | 18    | CollectionCard footer glass          |

---

## 7 — Navigation (Tab Bar)

**File:** `app/(tabs)/_layout.tsx`

### Glass Background

```tsx
tabBarBackground: () => (
  <BlurView tint="dark" intensity={RS.blur.tabBar} style={absoluteFill} />
)
tabBarStyle: { backgroundColor: 'transparent', borderTopColor: RS.glass.border }
```

The `BlurView` needs `backgroundColor: 'transparent'` on the surrounding tab bar so it renders through rather than behind.

### Dot Indicator

Custom `TabIcon` component renders a 3×3 px `View` with `backgroundColor: RS.colors.accent` and `borderRadius: 1.5` below the icon when `focused`. The gap between icon and dot is 3 px.

```
icon size: 22 (was 26 in Phase 4)
label fontSize: 9 (was 10)
```

### Screen Order

Home → Daily Reel → Discover → Diary → Lists → Profile

---

## 8 — Motion

All tokens in `constants/motion.ts`.

### Durations

| Token    | ms  | Usage                                  |
|----------|-----|----------------------------------------|
| `fast`   | 150 | Chip press feedback                    |
| `medium` | 220 | Image cross-fade (expo-image)          |
| `slow`   | 380 | Section entrance, RevealOnMount        |

### Easing

| Name    | Bezier                      | Usage                                   |
|---------|-----------------------------|-----------------------------------------|
| `enter` | `cubic-bezier(0.16,1,0.3,1)` | All entrance animations (soft ease-out) |

`RevealOnMount` uses `Easing.out(Easing.ease)` from Reanimated (cross-platform equivalent).

### Press Lift

```
scaleActive: 0.96   (4% compression — mirrors web scale(0.99), amplified for touch)
spring in:  { damping: 18, stiffness: 240, mass: 0.8 }
spring out: { damping: 14, stiffness: 180, mass: 0.8 }
```

Applied to: `PosterCard`, `CollectionCard`.

### Header Fade

| Token              | Value  | Usage                                     |
|--------------------|--------|-------------------------------------------|
| `fadeScrollStart`  | 0 px   | Full opacity at rest                      |
| `fadeScrollEnd`    | 70 px  | Minimum opacity reached                   |
| `minOpacity`       | 0.82   | Header stays glanceable, never invisible  |
| `translateYOffset` | −4 px  | Subtle upward drift as header recedes     |

### Section Entrance (RevealOnMount)

```
opacity:   0 → 1  (withTiming 380ms, Easing.out(Easing.ease))
translateY: 14 → 0
```

Home screen stagger delays (ms): 0 · 80 · 160 · 240 · 320 · 400

### Carousel Snap

All horizontal `FlatList` carousels use:

```
snapToInterval={itemWidth + separatorWidth}
decelerationRate="fast"
```

| Carousel              | itemWidth            | separatorWidth  |
|-----------------------|----------------------|-----------------|
| FeaturedCarousel      | `RS.card.featWidth` (220) | `RS.spacing.md` (16) |
| TrendingCarousel      | `RS.card.posterWidth` (100) | `RS.spacing.sm` (8) |
| BecauseYouLoved       | `RS.card.posterWidth` (100) | `RS.spacing.sm` (8) |
| CollectionsSection    | 160                  | `RS.spacing.sm` (8) |

---

## 9 — Section Anatomy

Every Home section follows the same layered structure:

```
RevealOnMount (entrance animation, stagger delay)
  View (gap: RS.spacing.xs or sm)
    SectionHeader (eyebrow? / title / subtitle?)
    FlatList or single card
```

`SectionHeader` accepts an optional `eyebrow` prop (overline style: 10 px, weight 700, `textMuted`, `letterSpacing.widest`). Current usage:

| Section              | Eyebrow         | Title                  |
|----------------------|-----------------|------------------------|
| Trending Today       | —               | Trending Today         |
| Because You Loved    | BECAUSE YOU LOVED | Babylon               |
| Collections          | —               | Collections            |
| Continue Your Story  | IN PROGRESS     | Continue Your Story    |

---

## 10 — Adding New Sections (Future Phases)

1. Add seed data to `data/seedHomeContent.ts` (no API calls at runtime).
2. Create a section component in `components/`.
3. Add `SectionHeader` with optional eyebrow.
4. Wrap list in `FlatList` with `snapToInterval` + `decelerationRate="fast"`.
5. Wrap section in `RevealOnMount` with incremental delay in `index.tsx`.
6. Update this document.

When Supabase personalization lands, `BecauseYouLovedSection`'s `title` prop changes from `"Babylon"` to the user's most-recently-loved title — the component architecture is already ready.
