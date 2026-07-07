# ReelShelf Mobile — Design System

> Sprint 4 reference. All token values live in `constants/theme.ts` and `constants/motion.ts`.
> Update this file whenever tokens change — do not let it drift from the code.

---

## Principles

**Editorial, not algorithmic.** Every section feels curated by a thoughtful editor.

**Breathing room as a design element.** Major sections are separated by `RS.spacing.xxxl` (72 px) — "reading chapters" cadence.

**Quiet confidence.** Motion is present but never draws attention to itself. All animations are subtle — "alive without being obvious."

**One filled button per screen.** Home screen has exactly one solid-filled primary button: "View Today's Pick" on DailyReel. Everything else is outlined or text-only.

**Serif for editorial moments only.** `ui-serif` (New York on iOS) reserved for: DailyReel title, EditorialHeadline, BookOfTheWeek title, BYL anchor titles. Everything else is sans-serif.

**Tonal separation over borders.** Sprint 4 replaced border-based section separation with tonal surface differences: `#070707` page → `#101014` card → `#14141B` elevated/search. Cards read as distinct from the page without explicit borders.

**Green accent is action-only.** `RS.colors.accent (#1d9e75)` appears exclusively on: filled primary button, outlined button borders/fills/text, progress bar fill, resume label, active tab tint. No decorative or structural green.

**Glass, not plastic.** Non-poster card surfaces use `expo-blur` BlurView for dark glass treatment. Solid fills are Android fallbacks.

**UI thread first.** All animations run on the UI thread via Reanimated shared values — no JS-thread jank.

---

## 1 — Color Palette

All tokens in `RS.colors` (`constants/theme.ts`).

| Token           | Hex / RGBA                    | Sprint 4 change |
|-----------------|-------------------------------|-----------------|
| `base`          | `#070707`                     | was `#07070b` |
| `card`          | `#101014`                     | was `#0d0d14` |
| `elevated`      | `#14141B`                     | was `#131320` — also used as search surface |
| `accent`        | `#1d9e75`                     | action-only (no change to value) |
| `border`        | `rgba(255,255,255,0.08)`      | — |
| `borderStrong`  | `rgba(255,255,255,0.18)`      | — |
| `textPrimary`   | `rgba(255,255,255,0.92)`      | — |
| `textSecondary` | `rgba(255,255,255,0.55)`      | — |
| `textMuted`     | `rgba(255,255,255,0.32)`      | — |
| `gold`          | `#fbbf24`                     | — |

### Surface Levels (Sprint 4)

Three distinct levels create visual hierarchy without borders:

```
Page background:   #070707   (RS.colors.base)
Card surface:      #101014   (RS.colors.card)
Elevated/search:   #14141B   (RS.colors.elevated)
```

### Green Accent Audit (Sprint 4)

All uses of `#1d9e75` / `RS.colors.accent` are **action-only**:

| Location | Usage | Classification |
|----------|-------|---------------|
| `_layout.tsx` `tabBarActiveTintColor` | Active tab icon + label | ✅ action |
| `_layout.tsx` `iconStyles.dot` | Active tab dot indicator | ✅ action |
| `theme.ts` `button.filledBg` | Primary filled button | ✅ action |
| `theme.ts` `button.primaryFill/Border/Text` | Outlined button style | ✅ action |
| `continue-watching-card.tsx` `progressFill` | Progress bar fill | ✅ action |
| `continue-watching-card.tsx` `resumeLabel` | Interactive resume link | ✅ action |
| `theme.ts` `badge.beta.bg` | BETA badge — **changed** to `rgba(255,255,255,0.12)` | ✅ neutral |

---

## 2 — Typography

Font families in `Fonts` (`constants/theme.ts`):

| Family  | iOS         | Android  |
|---------|-------------|----------|
| `sans`  | `system-ui` | `normal` |
| `serif` | `ui-serif`  | `serif`  |

**Serif rule:** Only 4 editorial moments use serif — DailyReel card title, EditorialHeadline, BookOfTheWeek card title, BYL anchor titles (via `titleSerif` prop on SectionHeader).

Typography scale (unchanged from Sprint 3):

| Token        | Size | Usage |
|--------------|------|-------|
| `display`    | 36   | EditorialHeadline serif heading |
| `heading`    | 20   | Card titles, section headers |
| `subheading` | 15   | Welcome greeting, subtitles |
| `body`       | 14   | Description copy, button labels |
| `caption`    | 11   | Metadata, badges, reason tagline |
| `overline`   | 10   | Eyebrow labels |

---

## 3 — Spacing

| Token  | Value | Usage |
|--------|-------|-------|
| `xs`   | 4     | Badge padding, tight gaps |
| `sm`   | 8     | Carousel item gaps, card internals |
| `md`   | 16    | Standard horizontal padding |
| `lg`   | 24    | Section internal gap |
| `xxl`  | 56    | (reserved) |
| `xxxl` | 72    | Gap between major Home sections |

---

## 4 — Shadow System (Sprint 4)

### Float Shadow Token

All cards now use a single "float" shadow — soft, near-invisible, high blur. Defined in `RS.shadow`:

```typescript
shadow: {
  color:   '#000000',
  offsetY: 3,     // minimal Y-offset
  opacity: 0.20,  // near-invisible
  radius:  24,    // high blur — floating feel
  android: 5,     // Android elevation
}
```

Applied to: PosterCard, ContinueWatchingCard, DailyReel artwork, BookOfTheWeek cover, FloatingSearchBar.

### Two-Layer Shadow Pattern

iOS shadows require no `overflow: 'hidden'` on the same view. All card components use:
- **Outer** `Animated.View` / `View` — holds shadow + scale animation, no `overflow`
- **Inner** `View` / `Pressable` — `overflow: 'hidden'`, `borderRadius` for image clipping

---

## 5 — Micro-Interactions (Sprint 4)

All micro-interactions run on the UI thread via Reanimated. The guiding principle: **alive without being obvious** — each interaction should be felt before it's noticed.

### Search Bar Expand (FloatingSearchBar)

On press-in, the bar scales up slightly (`1.0 → 1.015`) with a snappy spring. Communicates that the input is receptive. Scale is minimal — more of a shimmer than a physical lift.

```typescript
spring: { damping: 20, stiffness: 300, mass: 0.6 }
```

### Card Depress (ContinueWatchingCard, DailyReel, BookOfTheWeek)

Large interactive cards depress on press-in (`1.0 → 0.97`). Feels tactile — like pressing a physical button.

```typescript
Motion.lift.depressScale = 0.97
spring in:  { damping: 18, stiffness: 260, mass: 0.8 }
spring out: { damping: 14, stiffness: 200, mass: 0.8 }
```

### Poster Lift (PosterCard)

Sprint 4 reversed the poster animation direction: was a depress (`0.96`), now a **collectible lift** (`1.03`). Feels like picking up a physical card.

```typescript
Motion.lift.scaleActive = 1.03
spring in:  { damping: 16, stiffness: 260, mass: 0.7 }
spring out: { damping: 12, stiffness: 200, mass: 0.7 }
```

### Button Scale (DailyReel "View Today's Pick")

The filled button applies a `transform: [{ scale: 0.97 }]` via Pressable `style` callback on press. Matches the card depress scale for visual consistency.

### Navigation Tab Fade

React Navigation handles tab switch transitions. `BlurView` intensity and floating pill shadow create ambient depth. The active dot + tint change is the primary feedback.

---

## 6 — FloatingSearchBar (Sprint 4)

**File:** `components/FloatingSearchBar.tsx`

### Structure

```
View (wrapper, horizontal padding)
  Animated.View (barAnimStyle — scale expand, float shadow)
    Pressable (borderRadius: 28, overflow: hidden — clips BlurView)
      BlurView (absoluteFill, intensity: 22, borderRadius: 28)
      View (innerHighlight — 0.5px white line at top edge)
      MaterialIcons (search icon)
      Animated.Text (placeholder — opacity cross-fade animation)
```

### Animated Rotating Placeholder

5 phrases cycle every 2.8s with a cross-fade (250ms out / 280ms in):

```
'Search films…'
'Search TV shows…'
'Search books…'
'Search people…'
'Search collections…'
```

Implementation: `useSharedValue<number>(1)` for text opacity. Interval calls `withTiming(0, 230ms)` → `runOnJS(advancePhrase)()` in the completion callback → `withTiming(1, 280ms)`. The `runOnJS` bridge safely updates React state from the UI thread.

### Inner Highlight

A `0.5px` white line (`rgba(255,255,255,0.14)`) at the top inner edge of the pill — simulates glass edge refraction/reflection. Adds premium depth without adding visual weight.

### Height

`paddingVertical: 16` (Sprint 4 — was 14). Taller pill reads as more centrepiece.

---

## 7 — ContinueWatchingCard (Sprint 4)

**File:** `components/continue-watching-card.tsx`

### Changes

- **Artwork size:** `cwThumbWidth: 160px` (was 128px). Larger thumbnail gives more visual presence.
- **Card height:** `minHeight: 148px` (was 104px). Proportional increase.
- **Corner radius:** `18px` (was `RS.card.radius = 14px`). Softer, more generous rounding.
- **Progress bar glow:** Progress fill has `shadowColor: RS.colors.accent, shadowRadius: 5, shadowOpacity: 0.90` — accent glow bleeds outside the fill since `progressTrack` no longer has `overflow: 'hidden'`. Creates a subtle halo at the progress edge.
- **Depress animation:** Outer `Pressable` + inner `Animated.View` with `depressScale: 0.97` spring.
- **Typography:** Title `lineHeight: 20`, subtitle `fontWeight: '400'` for cleaner hierarchy.

---

## 8 — Daily Reel

**File:** `components/DailyReel.tsx`

Sprint 3 established the section copy — unchanged in Sprint 4. Sprint 4 adds:
- **Depress animation** on the artwork card (Pressable wrapping artworkInner)
- **Float shadow** (via `RS.shadow.*` tokens replacing hardcoded values)
- **Button scale** via Pressable style callback on press

---

## 9 — BookOfTheWeek

**File:** `components/BookOfTheWeek.tsx`

- **Subtitle copy:** "Our favourite read right now." (Sprint 4 — was "One essential read.")
- **Depress animation** on cover card
- **Float shadow** via `RS.shadow.*` tokens

---

## 10 — PosterCard (Sprint 4)

**File:** `components/poster-card.tsx`

- **Lift direction reversed:** `Motion.lift.scaleActive` changed from `0.96` (depress) to `1.03` (lift). Feels collectible — like picking up a physical card.
- **Float shadow** via `RS.shadow.*` tokens (was hardcoded heavier values).

---

## 11 — Section Header Copy (Sprint 4)

All section headers follow the `SectionHeader` anatomy. Sprint 4 updated two subtitles:

| Section               | Title              | Subtitle (Sprint 4)                           |
|-----------------------|--------------------|-----------------------------------------------|
| Welcome               | —                  | "Good Morning/Afternoon/Evening, Ishaan."     |
| Editorial Headline    | —                  | "Curated picks, honest shelves."               |
| Continue Watching     | Continue Watching  | "Pick up where you left off." _(unchanged)_   |
| Daily Reel            | DAILY REEL eyebrow | _(established subtext in seed data)_          |
| Trending Today        | Trending Today     | **"Stories everyone is talking about."** _(was "What's resonating right now.")_ |
| Because You Loved: Babylon | Babylon       | "Stories about obsession, ambition and sacrifice." _(unchanged)_ |
| Because You Loved: Dune | Dune            | "Epic worlds built with painstaking detail." _(unchanged)_ |
| Because You Loved: The Bear | The Bear    | "Pressure, precision, and people who care too much." _(unchanged)_ |
| Book of the Week      | Book of the Week   | **"Our favourite read right now."** _(was "One essential read.")_ |

---

## 12 — Bottom Tab Bar (Sprint 4)

**File:** `app/(tabs)/_layout.tsx`

### Floating Pill

Sprint 4 redesigned the tab bar as a floating element detached from screen edges:

```typescript
tabBarStyle: {
  position:        'absolute',
  bottom:           16,     // RS.tabBar.floatingMarginB
  left:             16,     // RS.tabBar.floatingMarginH
  right:            16,
  height:           64,     // RS.tabBar.floatingHeight
  borderRadius:     32,     // RS.tabBar.floatingRadius
  backgroundColor: 'transparent',
  borderTopWidth:   0,      // no border — glass surface speaks for itself
  shadowColor:      '#000',
  shadowOffset:     { width: 0, height: 8 },
  shadowOpacity:    0.28,
  shadowRadius:     20,
  elevation:        16,
},
```

### Glass Background

`BlurView` with `intensity: 65` and matching `borderRadius: 32` on the BlurView element itself (so the blur clips to the pill shape on iOS without needing `overflow: 'hidden'` on the container — which would break the iOS shadow).

### Icon Changes

- Size reduced from `22 → 20` for a lighter, more refined feel.
- Gap between icon and dot increased from `3 → 4`.

### Tab List (Unchanged)

Six tabs: Home, Daily Reel, Discover, Diary, Lists, Profile. Routes and icons unchanged.

### Content Padding

With `position: 'absolute'`, React Navigation does NOT auto-inject bottom content inset. `index.tsx` uses `RS.tabBar.contentBottomPad = 96` as `paddingBottom` on the scroll view content. Other tab screens may need similar adjustment when their content is tall enough to be obscured.

---

## 13 — Home Screen Composition (Sprint 3/4)

```
SafeAreaView (edges: ['top'])
  FadingHeader(scrollY)

  Animated.ScrollView (gap: 72, paddingBottom: 96)
    RevealOnMount → WelcomeBlock
    RevealOnMount → EditorialHeadline (serif)
    RevealOnMount → FloatingSearchBar (glass, animated placeholder)
    RevealOnMount → Continue Watching (depress card, glow progress)
    RevealOnMount → DailyReel (depress artwork, ONE filled btn)
    RevealOnMount → Trending Today
    RevealOnMount → BYL: Babylon (serif anchor)
    RevealOnMount → BYL: Dune (serif anchor)
    RevealOnMount → BYL: The Bear (serif anchor)
    RevealOnMount → BookOfTheWeek (depress cover, serif title)
```

---

## 14 — Motion Tokens

All in `constants/motion.ts`:

| Token                     | Value   | Usage |
|---------------------------|---------|-------|
| `lift.scaleActive`        | `1.03`  | Poster lift on touch (Sprint 4: was 0.96 depress) |
| `lift.depressScale`       | `0.97`  | Large card depress on press-in (Sprint 4: new) |
| `header.minOpacity`       | `0.82`  | Header fade on scroll |
| `header.fadeScrollEnd`    | `70px`  | Header reaches minOpacity at 70px scroll |
| `section.translateY`      | `14`    | RevealOnMount entrance offset |
| `section.duration`        | `380ms` | RevealOnMount fade duration |

---

## 15 — Adding New Sections

1. Add seed data to `data/seedHomeContent.ts`
2. Create section component in `components/`
3. Add `SectionHeader` with editorial subtitle
4. Wrap list in `FlatList` with `snapToInterval` + `decelerationRate="fast"`
5. Wrap in `RevealOnMount` with incremental delay
6. Apply float shadow (`RS.shadow.*`) to any card surfaces
7. Apply depress (`Motion.lift.depressScale`) to any large interactive cards
8. Audit button hierarchy — no new filled buttons

---

## Open Questions for Next Phase

- **Tab bar content padding:** Other tab screens (Discover, Diary, etc.) may need `paddingBottom: 96` if their content can be hidden by the floating bar. Not addressed in Sprint 4 (Home-only scope).
- **Book of Week cover:** `posterUrl: null`. Extend `generate-seed-data.ts` with Google Books fetch.
- **BYL/DailyReel personalization:** Static seed data — Phase 4 wires to Supabase.
- **Search functionality:** FloatingSearchBar is visual-only. Phase 4 connects to search results screen.
- **Tab bar on small screens:** On 4-inch displays (iPhone SE 1st gen) the 6-tab floating pill may be crowded. Consider icon-only mode below a width threshold.
